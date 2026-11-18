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
 *   lock   enquiry:dd:l:<hash>   present while one request is delivering     TTL 30 seconds
 *
 * ATOMICITY: claiming is ONE Upstash /multi-exec transaction: SET lock NX EX 30, then GET state.
 * Exactly one concurrent request wins the lock; the others see "in progress" (or the finished state).
 * A request that wins the lock but finds the enquiry already sent releases it again at once.
 * Recording the result is a second transaction: SET state EX 600, then DEL lock.
 *
 * The lock is deliberately short (30 s, longer than the 10 s Resend timeout). If a server instance dies
 * mid-delivery the lock expires by itself, so a legitimate retry is never blocked for the full window.
 * Cost of that choice: if the first attempt had in fact sent the email, the retry after 30 s may send
 * a second one. A duplicate email is preferred over a lost lead.
 *
 * STATES AFTER DELIVERY
 *   sent    Resend accepted it. Identical enquiries in the window get the same ref back, send nothing.
 *   unsure  outcome unknown (timeout, 5xx, no id). A retry in the window is allowed to try again and
 *           REUSES the stored ref as the Idempotency-Key, so Resend can drop a second copy if it honours
 *           the key (unverified). Never reported to the visitor as "not sent".
 *   (none)  definite refusal by the provider: nothing recorded, the retry starts fresh.
 *
 * Redis failures BEFORE sending fail closed (nothing is sent, the visitor is told so). A failure to
 * RECORD the result after sending is reported as the true outcome and logged; the lock then simply
 * expires.
 */

export const DEDUP_WINDOW_SECONDS = 10 * 60
export const DEDUP_LOCK_SECONDS = 30

export type DedupBegin =
  | { kind: "proceed"; ref: string; handle: DedupHandle }
  | { kind: "duplicate"; ref: string }
  | { kind: "in_progress" }
  | { kind: "unavailable" }

export type DedupHandle = { stateKey: string; lockKey: string }
export type DedupResult = "sent" | "unsure" | "failed"

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
  return { stateKey: `enquiry:dd:s:${hash}`, lockKey: `enquiry:dd:l:${hash}` }
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
    if (locked) memorySet(handle.lockKey, "1", DEDUP_LOCK_SECONDS)
  } else {
    let results: Array<{ result?: unknown }> | null
    try {
      results = await upstashPost(upstash, [
        ["SET", handle.lockKey, "1", "EX", DEDUP_LOCK_SECONDS, "NX"],
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
    // effort), otherwise it would block a genuinely new identical enquiry for up to 30 s after the
    // window ends.
    if (locked) {
      if (!upstash) memory.delete(handle.lockKey)
      else await upstashPost(upstash, [["DEL", handle.lockKey]]).catch(() => null)
    }
    return { kind: "duplicate", ref: state.ref }
  }
  if (!locked) return { kind: "in_progress" }
  return { kind: "proceed", ref: state?.state === "unsure" ? state.ref : newRef, handle }
}

/**
 * Records the delivery result and releases the lock. Returns false if Redis could not be updated
 * (the caller logs it; the lock expires on its own).
 */
export async function finishDedup(handle: DedupHandle, result: DedupResult, ref: string): Promise<boolean> {
  const upstash = upstashConfig()
  if (!upstash) {
    if (result !== "failed") memorySet(handle.stateKey, `${result}:${ref}`, DEDUP_WINDOW_SECONDS)
    memory.delete(handle.lockKey)
    return true
  }
  try {
    const commands: Array<Array<string | number>> = []
    if (result !== "failed") commands.push(["SET", handle.stateKey, `${result}:${ref}`, "EX", DEDUP_WINDOW_SECONDS])
    commands.push(["DEL", handle.lockKey])
    return (await upstashPost(upstash, commands)) !== null
  } catch {
    return false
  }
}
