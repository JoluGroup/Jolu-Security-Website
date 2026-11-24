import { randomBytes } from "node:crypto"
import { readBodyWithLimit } from "@/lib/enquiry/body"
import { getTrustedProxyMode, resolveClientId } from "@/lib/enquiry/client-ip"
import { checkClientRateLimit, checkGlobalRateLimit, isRateLimitAvailable, type RateLimitResult } from "@/lib/enquiry/rate-limit"
import { beginDedup, finishDedup, type DedupHandle } from "@/lib/enquiry/dedup"
import { deliverEnquiry, getDeliveryConfig, getDeliveryMode, isProductionTestAllowed, type DeliveryOutcome } from "@/lib/enquiry/deliver"
import { HONEYPOT_FIELD, LIMITS, validateEnquiry, type EnquiryResponse } from "@/lib/enquiry/schema"

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function createRef() {
  const bytes = randomBytes(6)
  const suffix = Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("")
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return `JS-${date}-${suffix}`
}

function respond(body: EnquiryResponse, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } })
}

// Logs carry only the reference, an outcome code and (for delivery diagnostics) numeric or allowlisted
// fields — never visitor data, response bodies, keys or addresses. `extra` values must be numbers or
// members of a fixed allowlist; callers never pass free text.
function log(outcome: string, ref?: string, extra: Record<string, string | number> = {}) {
  console.info(JSON.stringify({ scope: "enquiry", outcome, ...(ref ? { ref } : {}), ...extra }))
}

/** Numeric HTTP status and allowlisted provider error name, for the delivery outcome logs. */
function providerDiagnostics(outcome: DeliveryOutcome): Record<string, string | number> {
  if (outcome.kind === "accepted") return {}
  return {
    ...(outcome.status !== undefined ? { providerStatus: outcome.status } : {}),
    ...(outcome.providerError ? { providerError: outcome.providerError } : {}),
  }
}

/** Where a request got to, so an unexpected throw can be reported honestly. */
type Progress = {
  phase: "before_delivery" | "delivery_started" | "delivery_known"
  ref?: string
  handle?: DedupHandle
  outcome?: DeliveryOutcome
}

/** Constructor name only (never the message or stack, which can hold visitor data). Shape-checked. */
function errorName(error: unknown): string {
  const name = (error as { constructor?: { name?: unknown } } | null | undefined)?.constructor?.name
  return typeof name === "string" && /^[A-Za-z][A-Za-z0-9_$]{0,63}$/.test(name) ? name : "unknown"
}

// Defence in depth only; the rate limiter and validation are the real controls.
function isSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false
  const origin = request.headers.get("origin")
  if (!origin) return true
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function refuse(limit: Exclude<RateLimitResult, { ok: true }>) {
  if (limit.reason === "limited") {
    log(`rate_limited_${limit.scope}`)
    return respond({ ok: false, code: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfterSeconds) })
  }
  log(`rate_limit_${limit.reason}`)
  return respond({ ok: false, code: limit.reason }, 503)
}

export async function POST(request: Request) {
  const progress: Progress = { phase: "before_delivery" }
  try {
    return await handle(request, progress)
  } catch (error) {
    return await recoverFromUnexpectedError(error, progress)
  }
}

/**
 * Last line of defence for an unexpected throw. Logs the scope, the phase and the error constructor
 * name only, and answers with what is actually known:
 *   before any delivery attempt   nothing was sent: 500 server_error (the form may say so). No dedup
 *                                 lock is held by the route at that point (the handle is stored only
 *                                 when delivery starts); a lock taken inside beginDedup expires in 30 s.
 *   delivery began, outcome unknown   it MAY have been sent: 202 delivery_uncertain with the ref, never
 *                                 "nothing sent". The state is recorded as "unsure" (best effort).
 *   outcome already known         the known outcome is reported (accepted / refused / uncertain).
 * This function must not throw: every step that can fail is contained.
 */
async function recoverFromUnexpectedError(error: unknown, progress: Progress): Promise<Response> {
  try {
    log("unexpected_error", progress.ref, { phase: progress.phase, errorName: errorName(error) })
  } catch {
    // Logging must never turn a safe reply into an unhandled failure.
  }
  const { phase, ref, handle, outcome } = progress
  try {
    if (handle && ref) {
      if (outcome?.kind === "rejected") await finishDedup(handle, "failed", ref)
      else if (outcome?.kind === "accepted") await finishDedup(handle, "sent", ref)
      else await finishDedup(handle, "unsure", ref)
    }
  } catch {
    // Best effort: the lock expires by itself after 30 seconds.
  }
  if (phase === "before_delivery") return respond({ ok: false, code: "server_error" }, 500)
  if (outcome?.kind === "accepted" && ref) return respond({ ok: true, ref, state: "accepted" }, 200)
  if (outcome?.kind === "rejected") return respond({ ok: false, code: "delivery_failed" }, 502)
  if (ref) return respond({ ok: false, code: "delivery_uncertain", ref }, 202)
  return respond({ ok: false, code: "server_error" }, 500)
}

async function handle(request: Request, progress: Progress): Promise<Response> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    log("bad_content_type")
    return respond({ ok: false, code: "bad_request" }, 415)
  }
  const declared = request.headers.get("content-length")
  if (declared !== null) {
    if (!/^\d+$/.test(declared.trim())) {
      log("bad_content_length")
      return respond({ ok: false, code: "bad_request" }, 400)
    }
    if (Number(declared) > LIMITS.rawBodyBytes) {
      log("body_too_large")
      return respond({ ok: false, code: "bad_request" }, 413)
    }
  }
  if (!isSameOrigin(request)) {
    log("cross_origin")
    return respond({ ok: false, code: "rejected" }, 403)
  }

  // Explicit delivery mode: only "live" (with complete credentials) sends anything,
  // "test" never contacts Resend, and anything else fails closed.
  const mode = getDeliveryMode()
  const delivery = mode === "live" ? getDeliveryConfig() : null
  // Test mode sends nothing, so the in-memory limiter is acceptable there (previews).
  const allowMemory = mode === "test"
  // In a production build (including previews) test mode would discard real enquiries, so it
  // needs an explicit opt-in. Without it the endpoint fails closed. This never enables sending.
  const testBlocked = mode === "test" && process.env.NODE_ENV === "production" && !isProductionTestAllowed()
  if (testBlocked) {
    log("test_mode_blocked")
    return respond({ ok: false, code: "not_configured" }, 503)
  }
  if (mode === "disabled" || (mode === "live" && !delivery) || !isRateLimitAvailable(allowMemory)) {
    log("not_configured")
    return respond({ ok: false, code: "not_configured" }, 503)
  }

  // Per-client limiting runs before the body is read, so a trusted client that sends junk still uses up
  // its own allowance. The SITE-WIDE counter is charged later, only after the request passed validation
  // (see below), so junk cannot exhaust the allowance that real visitors need. Requests refused above
  // (415, 403, bad or oversized Content-Length, not configured) cost nothing. The client identity is
  // null unless a trusted proxy mode was explicitly enabled, in which case there is no per-client limit.
  const clientId = resolveClientId(request.headers, getTrustedProxyMode())
  const clientLimit = await checkClientRateLimit(clientId, { allowMemory })
  if (!clientLimit.ok) return refuse(clientLimit)

  const read = await readBodyWithLimit(request, LIMITS.rawBodyBytes)
  if (!read.ok) {
    log(read.reason === "too_large" ? "body_too_large" : "body_unreadable")
    return read.reason === "too_large"
      ? respond({ ok: false, code: "bad_request" }, 413)
      : respond({ ok: false, code: "bad_request" }, 400)
  }
  let body: unknown
  try {
    body = JSON.parse(read.text)
  } catch {
    log("bad_json")
    return respond({ ok: false, code: "bad_request" }, 400)
  }

  const honeypot = (body as Record<string, unknown> | null)?.[HONEYPOT_FIELD]
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    log("honeypot")
    return respond({ ok: false, code: "rejected" }, 400)
  }

  const result = validateEnquiry(body)
  if (!result.ok) {
    log("invalid")
    return respond({ ok: false, code: "invalid", errors: result.errors }, 400)
  }

  // Site-wide caps (hourly AND daily, one atomic script, see lib/enquiry/rate-limit.ts). A request is charged
  // only when it is ADMITTED: it has passed the per-client limit, validation and (live mode) the duplicate
  // check, and both caps have room. A refusal increments neither counter. Every email send is preceded by
  // exactly one successful charge, and the charge fails closed (store unavailable => 503, nothing sent).
  if (mode === "test") {
    // Test mode has no duplicate protection and sends nothing; it is still counted so previews exercise the caps.
    const testLimit = await checkGlobalRateLimit({ allowMemory })
    if (!testLimit.ok) return refuse(testLimit)
    log("test_mode")
    return respond({ ok: true, delivered: false, mode: "test" }, 200)
  }

  // Duplicate protection (live mode only). Identical enquiries within 10 minutes send at most one email; see
  // lib/enquiry/dedup.ts. This runs BEFORE the site-wide charge, so a duplicate (or an in-progress retry)
  // never consumes hourly or daily quota.
  const claim = await beginDedup(result.data, createRef())
  if (claim.kind === "unavailable") {
    // Nothing has been sent yet, so telling the visitor "nothing was sent" is accurate.
    log("dedup_unavailable")
    return respond({ ok: false, code: "unavailable" }, 503)
  }
  if (claim.kind === "in_progress") {
    log("dedup_in_progress")
    return respond({ ok: false, code: "in_progress" }, 409)
  }
  if (claim.kind === "duplicate") {
    // An identical enquiry was already accepted. Same reference, nothing new is sent, no quota is used.
    log("duplicate", claim.ref)
    return respond({ ok: true, ref: claim.ref, state: "accepted", duplicate: true }, 200)
  }

  const globalLimit = await checkGlobalRateLimit({ allowMemory })
  if (!globalLimit.ok) {
    // We hold the dedup lock but will not send: release it (records nothing) so an immediate retry is not
    // blocked for the 30 s lock lifetime. Best effort; the lock expires by itself otherwise.
    await finishDedup(claim.handle, "failed", claim.ref).catch(() => undefined)
    return refuse(globalLimit)
  }

  const { ref, handle } = claim
  progress.ref = ref
  progress.handle = handle
  // From here on an email may be on its way: a throw must never be reported as "nothing was sent".
  progress.phase = "delivery_started"
  const outcome = await deliverEnquiry(result.data, ref, delivery!)
  progress.outcome = outcome
  progress.phase = "delivery_known"

  if (outcome.kind === "accepted") {
    const finish = await finishDedup(handle, "sent", ref)
    if (finish === "error") log("dedup_record_failed", ref)
    else if (finish === "lock_lost") log("dedup_lock_lost", ref)
    log("accepted", ref)
    return respond({ ok: true, ref, state: "accepted" }, 200)
  }

  if (outcome.kind === "rejected") {
    // The provider refused the request: nothing was sent, so the visitor may retry straight away.
    await finishDedup(handle, "failed", ref)
    log("delivery_failed", ref, providerDiagnostics(outcome))
    return respond({ ok: false, code: "delivery_failed" }, 502)
  }

  // Unknown outcome (timeout, network error, 5xx, missing id). The email may have been sent, so this is
  // neither success nor "not sent". The ref is kept so a retry reuses it as the idempotency key.
  const finish = await finishDedup(handle, "unsure", ref)
  if (finish === "error") log("dedup_record_failed", ref)
  else if (finish === "lock_lost") log("dedup_lock_lost", ref)
  log(`delivery_uncertain_${outcome.reason}`, ref, providerDiagnostics(outcome))
  return respond({ ok: false, code: "delivery_uncertain", ref }, 202)
}
