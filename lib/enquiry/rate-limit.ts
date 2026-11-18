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
 * TWO LIMITS, CHECKED IN THIS ORDER:
 *  0. Read-only peek at the global counter (trusted-client mode only). If the global cap is
 *     already reached the request is refused here, WITHOUT touching either counter, so a
 *     visitor retrying during a global lockout does not use up their own client quota.
 *  1. Per-client (default 5 / 10 min), only when a trusted client identity exists.
 *  2. Global (default 200 / hour), always.
 * A request refused by the per-client limit does not count toward the global cap,
 * so one noisy client cannot use up the site-wide allowance. The peek is not atomic with
 * step 2, so a few concurrent requests can pass it together; step 2 still enforces the cap
 * exactly, and those requests are then refused having used one client slot (benign).
 *
 * QUOTA CONSUMPTION: every request that gets past the early checks counts, whether or not
 * it later turns out to be valid (malformed JSON, validation errors, honeypot hits, aborted
 * or oversized bodies). Only requests refused before the limiter (wrong content type, bad or
 * oversized Content-Length, cross-origin, not configured) cost nothing.
 *
 * Each counter is updated by one atomic Upstash /multi-exec transaction:
 *   SET key 0 EX <window> NX  ->  INCR key  ->  PTTL key
 * Redis failures fail CLOSED (reason "unavailable"); nothing is allowed through.
 */

export type RateLimitConfig = {
  clientLimit: number
  clientWindowSeconds: number
  globalLimit: number
  globalWindowSeconds: number
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: "limited"; scope: "client" | "global"; retryAfterSeconds: number }
  | { ok: false; reason: "not_configured" | "unavailable" }

const DEFAULTS: RateLimitConfig = {
  clientLimit: 5,
  clientWindowSeconds: 10 * 60,
  globalLimit: 200,
  globalWindowSeconds: 60 * 60,
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

/** Read-only: current count and remaining TTL of a counter, without creating or changing it. */
async function upstashPeek(config: UpstashConfig, key: string): Promise<Hit | null> {
  const results = await upstashPost(config, [["GET", key], ["PTTL", key]])
  if (!results) return null
  const raw = results[0]?.result
  const count = raw === null || raw === undefined ? 0 : Number(raw)
  const ttlMs = Number(results[1]?.result)
  if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) return null
  return { count, ttlMs }
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

/** Salted hash of the client identity. The raw IP is never stored or sent anywhere. */
function clientKey(clientId: string, secret: string) {
  return `enquiry:rl:c:${createHmac("sha256", secret).update(clientId).digest("hex").slice(0, 32)}`
}

const GLOBAL_KEY = "enquiry:rl:global"

/**
 * @param clientId trusted client identity, or null for the shared/untrusted case
 *                 (only the global limit applies).
 * @param options.allowMemory permit the in-memory fallback even in production
 *                 (used only when nothing is ever sent, i.e. test delivery mode).
 */
export async function checkRateLimit(
  clientId: string | null,
  options: { allowMemory?: boolean } = {},
): Promise<RateLimitResult> {
  const config = getRateLimitConfig()
  const upstash = upstashConfig()

  if (!upstash && isProduction() && !options.allowMemory) return { ok: false, reason: "not_configured" }

  const hit = async (key: string, windowSeconds: number): Promise<Hit | null> => {
    if (!upstash) return memoryHit(key, windowSeconds)
    try {
      return await upstashHit(upstash, key, windowSeconds)
    } catch {
      return null
    }
  }
  const retryAfter = (ttlMs: number) => Math.max(1, Math.ceil(ttlMs / 1000))

  if (clientId !== null) {
    // Step 0: refuse during a global lockout without consuming client or global quota.
    const peeked = upstash
      ? await upstashPeek(upstash, GLOBAL_KEY).catch(() => null)
      : memoryPeek(GLOBAL_KEY)
    if (!peeked) return { ok: false, reason: "unavailable" }
    if (peeked.count >= config.globalLimit && peeked.ttlMs > 0) {
      return { ok: false, reason: "limited", scope: "global", retryAfterSeconds: retryAfter(peeked.ttlMs) }
    }

    const key = upstash
      ? clientKey(clientId, upstash.token)
      : `dev:c:${createHash("sha256").update(clientId).digest("hex")}`
    const result = await hit(key, config.clientWindowSeconds)
    if (!result) return { ok: false, reason: "unavailable" }
    if (result.count > config.clientLimit) {
      return { ok: false, reason: "limited", scope: "client", retryAfterSeconds: retryAfter(result.ttlMs) }
    }
  }

  const global = await hit(GLOBAL_KEY, config.globalWindowSeconds)
  if (!global) return { ok: false, reason: "unavailable" }
  if (global.count > config.globalLimit) {
    return { ok: false, reason: "limited", scope: "global", retryAfterSeconds: retryAfter(global.ttlMs) }
  }
  return { ok: true }
}
