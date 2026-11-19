import { createHmac, randomBytes } from "node:crypto"
import type { Enquiry } from "@/lib/enquiry/schema"
import { upstashConfig, upstashPost, type UpstashConfig } from "@/lib/enquiry/rate-limit"

/**
 * Duplicate-enquiry protection.
 *
 * GOAL: a retry or double-click of the SAME enquiry must not send a second email, while a genuinely
 * different enquiry (any normalised field differs) is never blocked. Duplicates are recognised for
 * DEDUP_WINDOW_SECONDS (10 minutes) after the first one finished.
 *
 * FINGERPRINT: HMAC-SHA256 of the normalised enquiry content (case-folded, whitespace-collapsed
 * fields; phone already E.164, email lower-cased). The key is derived from the Upstash token, so
 * Redis never holds customer data, and a Redis key cannot be reversed or guessed without the secret.
 *
 * TWO KEYS PER FINGERPRINT
 *   state  enquiry:dd:s:<hash>   absent | "sent:<ref>" | "unsure:<ref>"      TTL 10 minutes
 *   lock   enquiry:dd:l:<hash>   unique owner token while a request is delivering   TTL 30 seconds
 *
 * CLAIMING is ONE Upstash /multi-exec transaction: SET lock <owner token> NX EX 30, then GET state.
 * Exactly one concurrent request wins the lock; the others see "in progress" (or the finished state).
 * A request that wins the lock but finds the enquiry already sent releases it again at once.
 *
 * LOCK OWNERSHIP. Every request gets a random owner token and stores it as the lock value. A lock can
 * expire while its owner is still running (a slow Resend call, a paused instance), after which a newer
 * request legitimately owns it. The old owner must then NOT delete the newer owner's lock, or a third
 * request could start sending while the second is still in flight. So the lock is never released with a
 * plain DEL. Recording the result and releasing the lock are ONE atomic Lua script (FINALIZE_SCRIPT,
 * run with EVAL inside /multi-exec) that deletes the lock only if its value still equals the caller's
 * token. Redis cannot do a compare-and-delete with plain commands, and the REST interface has no WATCH,
 * so a script is the only race-free way.
 *
 * RECORDING THE RESULT is monotonic and does not depend on owning the lock, because the email has
 * been sent (or may have been) whoever holds the lock now:
 *   "sent"    is written unless a "sent" is already recorded (never overwrites a settled result)
 *   "unsure"  is written only when nothing is recorded (never downgrades "sent", never replaces "unsure")
 *   "failed"  records nothing (the provider refused, so nothing was sent)
 * The caller learns whether it still owned the lock; losing it is logged as "lock_lost".
 *
 * THE LOCK IS SHORT (30 s, longer than the 10 s Resend timeout). If a server instance dies mid-delivery
 * the lock expires by itself, so a legitimate retry is not blocked for the whole window. Cost of that
 * choice: if the first attempt had in fact sent the email, the retry after 30 s may send a second one.
 * A duplicate email is preferred over a lost lead.
 *
 * THIS IS NOT EXACTLY-ONCE DELIVERY. Residual ways the team can still receive two emails for one enquiry:
 *   1. Redis fails while recording the result after the provider accepted the message (the lock then
 *      expires after 30 s and an identical retry is treated as new).
 *   2. A request outlives its 30 s lock and another request sends in the meantime (both send; the
 *      late finalizer records "sent" without touching the newer lock).
 *   3. An uncertain attempt that was in fact delivered, retried while Resend does not honour the
 *      Idempotency-Key (honouring it is an external assumption, not verified).
 *   4. Redis loses data (eviction or failover) inside the 10 minute window.
 * Conversely a lead is never dropped silently: every path that does not send says so to the visitor.
 *
 * STATES AFTER DELIVERY
 *   sent    Resend accepted it. Identical enquiries in the window get the same ref back, send nothing.
 *   unsure  outcome unknown (timeout, 5xx, no id). A retry in the window is allowed to try again and
 *           REUSES the stored ref as the Idempotency-Key, so Resend can drop a second copy if it honours
 *           the key (unverified). Never reported to the visitor as "not sent".
 *   (none)  definite refusal by the provider: nothing recorded, the retry starts fresh.
 *
 * Redis failures BEFORE sending fail closed (nothing is sent, the visitor is told so). A failure to
 * RECORD the result after sending is reported as the true outcome and logged (see residual risk 1).
 */

export const DEDUP_WINDOW_SECONDS = 10 * 60
export const DEDUP_LOCK_SECONDS = 30

export type DedupBegin =
  | { kind: "proceed"; ref: string; handle: DedupHandle }
  | { kind: "duplicate"; ref: string }
  | { kind: "in_progress" }
  | { kind: "unavailable" }

export type DedupHandle = { stateKey: string; lockKey: string; token: string }
export type DedupResult = "sent" | "unsure" | "failed"
/** owner: recorded and released our own lock. lock_lost: recorded per the rules, but the lock was no longer ours. error: Redis failed. */
export type DedupFinish = "owner" | "lock_lost" | "error"

const text = (v: string) => v.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()

/** Canonical, order-fixed representation of the enquiry content. Exported for tests. */
export function canonicalEnquiry(e: Enquiry): string {
  return JSON.stringify([
    "v1",
    text(e.name),
    e.phone,
    text(e.email),
    e.service,
    e.county,
    text(e.town),
    text(e.details),
  ])
}

// Used only when there is no Upstash (development). Not shared across instances and not durable.
const memorySecret = randomBytes(32)
const memory = new Map<string, { value: string; expiresAt: number }>()

/** Test hook: clears the in-memory fallback. */
export function resetMemoryDedup() {
  memory.clear()
}

function keysFor(enquiry: Enquiry, upstash: UpstashConfig | null): DedupHandle {
  const secret = upstash
    ? createHmac("sha256", upstash.token).update("enquiry:dedup:v1").digest()
    : memorySecret
  const hash = createHmac("sha256", secret).update(canonicalEnquiry(enquiry)).digest("hex").slice(0, 32)
  // The "o" prefix keeps the token from ever looking numeric to Redis clients.
  return { stateKey: `enquiry:dd:s:${hash}`, lockKey: `enquiry:dd:l:${hash}`, token: `o${randomBytes(16).toString("hex")}` }
}

function parseState(value: unknown): { state: "sent" | "unsure"; ref: string } | null {
  if (typeof value !== "string") return null
  const m = value.match(/^(sent|unsure):(JS-[A-Z0-9-]{1,40})$/)
  return m ? { state: m[1] as "sent" | "unsure", ref: m[2] } : null
}

function memoryGet(key: string) {
  const e = memory.get(key)
  if (e && e.expiresAt <= Date.now()) memory.delete(key)
  return memory.get(key)?.value ?? null
}

function memorySet(key: string, value: string, seconds: number) {
  memory.set(key, { value, expiresAt: Date.now() + seconds * 1000 })
}

/**
 * Atomic "record the result, then release the lock only if we still own it".
 *   KEYS[1] lock key, KEYS[2] state key
 *   ARGV[1] owner token, ARGV[2] state value to record ("" = record nothing), ARGV[3] state TTL seconds
 * Returns 1 when the lock was ours (and is now deleted), 0 when it was not (left untouched).
 * Exported so the test double can recognise exactly this script.
 */
export const FINALIZE_SCRIPT = `
local owner = (redis.call("GET", KEYS[1]) == ARGV[1])
if ARGV[2] ~= "" then
  local cur = redis.call("GET", KEYS[2])
  local sent = cur and string.sub(cur, 1, 5) == "sent:"
  if string.sub(ARGV[2], 1, 5) == "sent:" then
    if not sent then redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[3]) end
  elseif not cur then
    redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[3])
  end
end
if owner then
  redis.call("DEL", KEYS[1])
  return 1
end
return 0
`

/** Same rules as FINALIZE_SCRIPT for the in-memory fallback. */
function finalizeMemory(handle: DedupHandle, value: string): boolean {
  const owner = memoryGet(handle.lockKey) === handle.token
  if (value) {
    const cur = memoryGet(handle.stateKey)
    if (value.startsWith("sent:")) {
      if (!(cur ?? "").startsWith("sent:")) memorySet(handle.stateKey, value, DEDUP_WINDOW_SECONDS)
    } else if (cur === null) {
      memorySet(handle.stateKey, value, DEDUP_WINDOW_SECONDS)
    }
  }
  if (owner) memory.delete(handle.lockKey)
  return owner
}

async function finalize(handle: DedupHandle, value: string): Promise<DedupFinish> {
  const upstash = upstashConfig()
  if (!upstash) return finalizeMemory(handle, value) ? "owner" : "lock_lost"
  try {
    const results = await upstashPost(upstash, [
      ["EVAL", FINALIZE_SCRIPT, 2, handle.lockKey, handle.stateKey, handle.token, value, DEDUP_WINDOW_SECONDS],
    ])
    if (!results) return "error"
    const r = results[0]?.result
    return r === 1 || r === "1" ? "owner" : r === 0 || r === "0" ? "lock_lost" : "error"
  } catch {
    return "error"
  }
}

/**
 * Claims the right to deliver this enquiry, or says why not. `newRef` is used unless an earlier,
 * uncertain attempt for the same enquiry left its ref behind.
 */
export async function beginDedup(enquiry: Enquiry, newRef: string): Promise<DedupBegin> {
  const upstash = upstashConfig()
  const handle = keysFor(enquiry, upstash)

  let locked: boolean
  let existing: unknown
  if (!upstash) {
    existing = memoryGet(handle.stateKey)
    locked = memoryGet(handle.lockKey) === null
    if (locked) memorySet(handle.lockKey, handle.token, DEDUP_LOCK_SECONDS)
  } else {
    let results: Array<{ result?: unknown }> | null
    try {
      results = await upstashPost(upstash, [
        ["SET", handle.lockKey, handle.token, "EX", DEDUP_LOCK_SECONDS, "NX"],
        ["GET", handle.stateKey],
      ])
    } catch {
      return { kind: "unavailable" }
    }
    if (!results) return { kind: "unavailable" }
    locked = results[0]?.result === "OK"
    existing = results[1]?.result
  }

  const state = parseState(existing)
  if (state?.state === "sent") {
    // We may have just taken the lock only to find the enquiry already sent. Release it now (best
    // effort, and only if it is still ours), otherwise it would block a genuinely new identical
    // enquiry for up to 30 s after the window ends.
    if (locked) await finalize(handle, "")
    return { kind: "duplicate", ref: state.ref }
  }
  if (!locked) return { kind: "in_progress" }
  return { kind: "proceed", ref: state?.state === "unsure" ? state.ref : newRef, handle }
}

/**
 * Records the delivery result and releases the lock if it is still ours (atomically, see above).
 * "error" means Redis could not be updated (the caller logs it; the lock expires on its own).
 */
export async function finishDedup(handle: DedupHandle, result: DedupResult, ref: string): Promise<DedupFinish> {
  return finalize(handle, result === "failed" ? "" : `${result}:${ref}`)
}
