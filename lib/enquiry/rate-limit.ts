import { createHash, createHmac } from "node:crypto"

/**
 * Rate limiting for the enquiry endpoint.
 *
 * WINDOW SEMANTICS: FIXED-DURATION, NOT SLIDING.
 * The first request for a key creates a counter that expires `window` seconds
 * later, and the expiry is set ONLY at creation (SET ... EX ... NX). Later requests
 * increment the counter but never extend the expiry, so a blocked client is freed
 * exactly one window after its first request, however often it retries. The cost of
 * a fixed window is that a burst can straddle a boundary (up to 2x the limit across
 * two adjacent windows); the global cap bounds that.
 *
 * THREE LIMITS, CHECKED IN THIS ORDER:
 *  0. Read-only peek at the hourly and daily counters (trusted-client mode only). If either cap is
 *     already reached the request is refused here, WITHOUT touching any counter, so a
 *     visitor retrying during a global lockout does not use up their own client quota.
 *  1. Per-client (default 5 / 10 min), only when a trusted client identity exists.
 *  2. Global hourly (default 30 / hour) and global daily (default 80 / 24 h), always, atomically together.
 * A request refused by the per-client limit does not count toward the global cap,
 * so one noisy client cannot use up the site-wide allowance. The peek is not atomic with
 * step 2, so a few concurrent requests can pass it together; step 2 still enforces the cap
 * exactly, and those requests are then refused having used one client slot (benign).
 *
 * QUOTA CONSUMPTION (changed in remediation B): the PER-CLIENT counter is still charged before the
 * body is read, so a trusted client sending junk still exhausts its own allowance. The GLOBAL counter
 * is charged only after the request passed validation (checkGlobalRateLimit), so malformed JSON,
 * validation failures, honeypot hits and aborted or oversized bodies no longer use up the site-wide
 * allowance. See docs/enquiry/quota-exhaustion.md.
 *
 * The PER-CLIENT counter is updated by one atomic Upstash /multi-exec transaction:
 *   SET key 0 EX <window> NX  ->  INCR key  ->  PTTL key
 * Redis failures fail CLOSED (reason "unavailable"); nothing is allowed through.
 *
 * SITE-WIDE ADMISSION: HOURLY AND DAILY CAPS TOGETHER (new: the daily cap did not exist before).
 * Both site-wide counters (hourly `enquiry:rl:global`, daily `enquiry:rl:global:day`) are checked and
 * charged by ONE Lua script (ADMIT_SCRIPT, EVAL inside /multi-exec), so they are always consistent:
 *   - if EITHER cap is already reached, NEITHER counter is incremented and the request is refused;
 *   - otherwise BOTH are incremented. A request therefore consumes quota only when it is admitted,
 *     i.e. it has already passed the per-client limit, validation and the duplicate check (the route
 *     calls this last). A refused request never eats the other window's allowance.
 *   - a counter that exists without an expiry gets one (TTL repair), inside the same script.
 *   - Retry-After is the time until the LAST reached cap clears (the maximum of the reached caps), so
 *     a client that waits that long is not immediately refused again by the other cap.
 * Both windows are fixed from the first ADMITTED request (not calendar days, not sliding).
 * Defaults: 30 per hour (was 200) and 80 per 86400 s (new).
 * Note this changes the old hourly behaviour slightly: a refused request used to INCR the hourly
 * counter past its limit; now the counter stops at the limit (the refusal outcome is the same).
 */

export type RateLimitConfig = {
  clientLimit: number
  clientWindowSeconds: number
  globalLimit: number
  globalWindowSeconds: number
  dailyLimit: number
  dailyWindowSeconds: number
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: "limited"; scope: "client" | "global" | "daily"; retryAfterSeconds: number }
  | { ok: false; reason: "not_configured" | "unavailable" }

const DEFAULTS: RateLimitConfig = {
  clientLimit: 5,
  clientWindowSeconds: 10 * 60,
  globalLimit: 30,
  globalWindowSeconds: 60 * 60,
  dailyLimit: 80,
  dailyWindowSeconds: 24 * 60 * 60,
}

function intFromEnv(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name]?.trim()
  if (!raw || !/^\d+$/.test(raw)) return fallback
  const n = Number(raw)
  return n >= min && n <= max ? n : fallback
}

/** Reads the tunable limits. Invalid or out-of-range values fall back to the defaults. */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    clientLimit: intFromEnv("ENQUIRY_CLIENT_LIMIT", DEFAULTS.clientLimit, 1, 1000),
    clientWindowSeconds: intFromEnv("ENQUIRY_CLIENT_WINDOW_SECONDS", DEFAULTS.clientWindowSeconds, 60, 86_400),
    globalLimit: intFromEnv("ENQUIRY_GLOBAL_LIMIT", DEFAULTS.globalLimit, 1, 100_000),
    globalWindowSeconds: intFromEnv("ENQUIRY_GLOBAL_WINDOW_SECONDS", DEFAULTS.globalWindowSeconds, 60, 86_400),
    dailyLimit: intFromEnv("ENQUIRY_DAILY_LIMIT", DEFAULTS.dailyLimit, 1, 100_000),
    dailyWindowSeconds: intFromEnv("ENQUIRY_DAILY_WINDOW_SECONDS", DEFAULTS.dailyWindowSeconds, 60, 86_400),
  }
}

const isProduction = () => process.env.NODE_ENV === "production"

export function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null
}

/**
 * True when a limiter is available: Upstash is configured, or the in-memory
 * fallback is acceptable (outside production, or when the caller sends nothing).
 */
export function isRateLimitAvailable(allowMemory = false) {
  return Boolean(upstashConfig()) || allowMemory || !isProduction()
}

type Hit = { count: number; ttlMs: number }
export type UpstashConfig = NonNullable<ReturnType<typeof upstashConfig>>

export async function upstashPost(config: UpstashConfig, commands: Array<Array<string | number>>) {
  const res = await fetch(`${config.url}/multi-exec`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return null
  const results = (await res.json()) as Array<{ result?: unknown; error?: string }>
  if (!Array.isArray(results) || results.length !== commands.length || results.some((r) => r?.error)) return null
  return results
}

/** One atomic transaction: create-with-expiry if absent, count, read remaining time. */
async function upstashHit(config: UpstashConfig, key: string, windowSeconds: number): Promise<Hit | null> {
  const results = await upstashPost(config, [
    ["SET", key, 0, "EX", windowSeconds, "NX"],
    ["INCR", key],
    ["PTTL", key],
  ])
  if (!results) return null

  const count = Number(results[1]?.result)
  if (!Number.isFinite(count)) return null

  let ttlMs = Number(results[2]?.result)
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    // A key without an expiry should be impossible (SET ... EX creates it with one).
    // If one exists anyway, give it an expiry so it cannot block a client forever.
    ttlMs = windowSeconds * 1000
    await upstashPost(config, [["EXPIRE", key, windowSeconds]]).catch(() => null)
  }
  return { count, ttlMs }
}

/** Read-only: count and remaining TTL of the given counters in ONE transaction; nothing is created or changed. */
async function upstashPeek(config: UpstashConfig, keys: string[]): Promise<Hit[] | null> {
  const results = await upstashPost(config, keys.flatMap((k) => [["GET", k], ["PTTL", k]]))
  if (!results) return null
  const hits: Hit[] = []
  for (let i = 0; i < keys.length; i++) {
    const raw = results[2 * i]?.result
    const count = raw === null || raw === undefined ? 0 : Number(raw)
    const ttlMs = Number(results[2 * i + 1]?.result)
    if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) return null
    hits.push({ count, ttlMs })
  }
  return hits
}

/**
 * Atomic site-wide admission (hourly + daily). Exported so the real-Redis tests run exactly this text.
 *   KEYS[1] hourly counter, KEYS[2] daily counter
 *   ARGV[1] hourly limit, ARGV[2] hourly window s, ARGV[3] daily limit, ARGV[4] daily window s
 * Returns {1, 0, 0} when admitted (both counters incremented), or {0, mask, waitMs} when refused with
 * NOTHING incremented. which: 1 = hourly cap, 2 = daily cap; when both are reached it names the one that
 * clears LAST, and waitMs is that remaining TTL (the longest wait among the reached caps). A counter with no TTL (should be impossible) is given
 * one first. A non-numeric counter raises an error, which the caller treats as "unavailable" (fail closed).
 */
export const ADMIT_SCRIPT = `
local function read(key, window)
  local ttl = redis.call("PTTL", key)
  if ttl == -2 then return 0, window * 1000 end
  if ttl == -1 then
    redis.call("EXPIRE", key, window)
    ttl = window * 1000
  end
  local n = tonumber(redis.call("GET", key))
  if not n then return redis.error_reply("ERR counter is not a number") end
  return n, ttl
end
local hn, httl = read(KEYS[1], tonumber(ARGV[2]))
local dn, dttl = read(KEYS[2], tonumber(ARGV[4]))
local which, wait = 0, 0
if hn >= tonumber(ARGV[1]) then which = 1; wait = httl end
if dn >= tonumber(ARGV[3]) and (which == 0 or dttl > wait) then which = 2; wait = dttl end
if which > 0 then return {0, which, wait} end
redis.call("SET", KEYS[1], 0, "EX", ARGV[2], "NX")
redis.call("SET", KEYS[2], 0, "EX", ARGV[4], "NX")
redis.call("INCR", KEYS[1])
redis.call("INCR", KEYS[2])
return {1, 0, 0}
`

type Admission = { admitted: true } | { admitted: false; which: 1 | 2; waitMs: number }

async function upstashAdmit(config: UpstashConfig, rl: RateLimitConfig): Promise<Admission | null> {
  const results = await upstashPost(config, [
    ["EVAL", ADMIT_SCRIPT, 2, GLOBAL_KEY, DAILY_KEY, rl.globalLimit, rl.globalWindowSeconds, rl.dailyLimit, rl.dailyWindowSeconds],
  ])
  const r = results?.[0]?.result
  if (!Array.isArray(r) || r.length !== 3) return null
  const [ok, which, waitMs] = r.map(Number)
  if (![ok, which, waitMs].every(Number.isFinite)) return null
  if (ok === 1) return { admitted: true }
  if (ok === 0 && (which === 1 || which === 2) && waitMs > 0) return { admitted: false, which, waitMs }
  return null
}

// Development / test-mode fallback. Not durable and not shared across instances.
const memory = new Map<string, { count: number; resetAt: number }>()

/** Test hook: clears the in-memory fallback. */
export function resetMemoryRateLimit() {
  memory.clear()
}

function memoryPeek(key: string): Hit {
  const entry = memory.get(key)
  const now = Date.now()
  return entry && entry.resetAt > now ? { count: entry.count, ttlMs: entry.resetAt - now } : { count: 0, ttlMs: -2 }
}

function memoryHit(key: string, windowSeconds: number): Hit {
  const now = Date.now()
  let entry = memory.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowSeconds * 1000 }
    memory.set(key, entry)
  }
  entry.count += 1
  return { count: entry.count, ttlMs: entry.resetAt - now }
}

const GLOBAL_KEY = "enquiry:rl:global"
const DAILY_KEY = "enquiry:rl:global:day"

/** In-memory twin of ADMIT_SCRIPT (development and test mode only). */
function memoryAdmit(rl: RateLimitConfig): Admission {
  const h = memoryPeek(GLOBAL_KEY)
  const d = memoryPeek(DAILY_KEY)
  let which: 0 | 1 | 2 = 0
  let waitMs = 0
  if (h.count >= rl.globalLimit) {
    which = 1
    waitMs = h.ttlMs
  }
  if (d.count >= rl.dailyLimit && (which === 0 || d.ttlMs > waitMs)) {
    which = 2
    waitMs = d.ttlMs
  }
  if (which) return { admitted: false, which, waitMs }
  memoryHit(GLOBAL_KEY, rl.globalWindowSeconds)
  memoryHit(DAILY_KEY, rl.dailyWindowSeconds)
  return { admitted: true }
}

/** Salted hash of the client identity. The raw IP is never stored or sent anywhere. */
function clientKey(clientId: string, secret: string) {
  return `enquiry:rl:c:${createHmac("sha256", secret).update(clientId).digest("hex").slice(0, 32)}`
}


type Limiter = {
  config: RateLimitConfig
  upstash: UpstashConfig | null
  hit: (key: string, windowSeconds: number) => Promise<Hit | null>
}

const retryAfter = (ttlMs: number) => Math.max(1, Math.ceil(ttlMs / 1000))

/** Shared setup for the two checks. Returns a refusal when production has no durable store. */
function makeLimiter(options: { allowMemory?: boolean }): Limiter | { refusal: RateLimitResult } {
  const config = getRateLimitConfig()
  const upstash = upstashConfig()
  if (!upstash && isProduction() && !options.allowMemory) return { refusal: { ok: false, reason: "not_configured" } }
  const hit = async (key: string, windowSeconds: number): Promise<Hit | null> => {
    if (!upstash) return memoryHit(key, windowSeconds)
    try {
      return await upstashHit(upstash, key, windowSeconds)
    } catch {
      return null
    }
  }
  return { config, upstash, hit }
}

/** Read-only: is either site-wide cap reached? "open" when not; null when the store is unavailable. */
async function globalLockout(upstash: UpstashConfig | null, config: RateLimitConfig): Promise<RateLimitResult | "open" | null> {
  const peeked = upstash
    ? await upstashPeek(upstash, [GLOBAL_KEY, DAILY_KEY]).catch(() => null)
    : [memoryPeek(GLOBAL_KEY), memoryPeek(DAILY_KEY)]
  if (!peeked) return null
  const [h, d] = peeked
  const hourly = h.count >= config.globalLimit && h.ttlMs > 0
  const daily = d.count >= config.dailyLimit && d.ttlMs > 0
  if (!hourly && !daily) return "open"
  // Longest wait among the reached caps, so the client is not refused again by the other one.
  const useDaily = daily && (!hourly || d.ttlMs > h.ttlMs)
  return { ok: false, reason: "limited", scope: useDaily ? "daily" : "global", retryAfterSeconds: retryAfter(useDaily ? d.ttlMs : h.ttlMs) }
}

/**
 * Per-client check (the pre-body step). Does nothing for the shared identity (clientId null).
 * With a trusted client identity it first refuses during a global lockout WITHOUT consuming any
 * quota (read-only peek), then counts the client. Fails closed when the store is unavailable.
 */
export async function checkClientRateLimit(
  clientId: string | null,
  options: { allowMemory?: boolean } = {},
): Promise<RateLimitResult> {
  const limiter = makeLimiter(options)
  if ("refusal" in limiter) return limiter.refusal
  const { config, upstash, hit } = limiter
  if (clientId === null) return { ok: true }

  // Step 0: refuse during a site-wide lockout (hourly or daily cap) without consuming any quota.
  const lockout = await globalLockout(upstash, config)
  if (!lockout) return { ok: false, reason: "unavailable" }
  if (lockout !== "open") return lockout

  const key = upstash ? clientKey(clientId, upstash.token) : `dev:c:${createHash("sha256").update(clientId).digest("hex")}`
  const result = await hit(key, config.clientWindowSeconds)
  if (!result) return { ok: false, reason: "unavailable" }
  if (result.count > config.clientLimit) {
    return { ok: false, reason: "limited", scope: "client", retryAfterSeconds: retryAfter(result.ttlMs) }
  }
  return { ok: true }
}

/**
 * Site-wide check. The route calls this only AFTER the request has passed validation, so junk
 * traffic cannot use up the allowance that real visitors and real email sends depend on. Every
 * email send is still preceded by exactly one successful call to this function (the counter is
 * one atomic transaction), so the cap on emails per window is unchanged. Fails closed.
 */
export async function checkGlobalRateLimit(options: { allowMemory?: boolean } = {}): Promise<RateLimitResult> {
  const limiter = makeLimiter(options)
  if ("refusal" in limiter) return limiter.refusal
  const { config, upstash } = limiter
  let admission: Admission | null
  try {
    admission = upstash ? await upstashAdmit(upstash, config) : memoryAdmit(config)
  } catch {
    admission = null
  }
  if (!admission) return { ok: false, reason: "unavailable" }
  if (admission.admitted) return { ok: true }
  return { ok: false, reason: "limited", scope: admission.which === 2 ? "daily" : "global", retryAfterSeconds: retryAfter(admission.waitMs) }
}

/**
 * Both checks in order (client, then global), exactly as the route did before the global count
 * moved behind validation. Kept as the reference behaviour for tests; the route uses the two
 * halves separately.
 *
 * @param clientId trusted client identity, or null for the shared/untrusted case
 *                 (only the global limit applies).
 * @param options.allowMemory permit the in-memory fallback even in production
 *                 (used only when nothing is ever sent, i.e. test delivery mode).
 */
export async function checkRateLimit(
  clientId: string | null,
  options: { allowMemory?: boolean } = {},
): Promise<RateLimitResult> {
  const client = await checkClientRateLimit(clientId, options)
  if (!client.ok) return client
  return checkGlobalRateLimit(options)
}
