import { randomBytes } from "node:crypto"
import { readBodyWithLimit } from "@/lib/enquiry/body"
import { getTrustedProxyMode, resolveClientId } from "@/lib/enquiry/client-ip"
import { checkRateLimit, isRateLimitAvailable } from "@/lib/enquiry/rate-limit"
import { beginDedup, finishDedup } from "@/lib/enquiry/dedup"
import { deliverEnquiry, getDeliveryConfig, getDeliveryMode, isProductionTestAllowed } from "@/lib/enquiry/deliver"
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

// Logs carry only the reference and an outcome code — never visitor data.
function log(outcome: string, ref?: string) {
  console.info(JSON.stringify({ scope: "enquiry", outcome, ...(ref ? { ref } : {}) }))
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

export async function POST(request: Request) {
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

  // Rate limiting runs before the body is read, so refused requests cost no parsing.
  // Consequence (intentional): any request that reaches this point counts against the quota,
  // including ones that later fail (malformed JSON, validation errors, honeypot hits, oversized
  // or aborted bodies). Only requests rejected above (415, 403, bad or oversized Content-Length,
  // not configured) are free. The client identity is null unless a trusted proxy mode was
  // explicitly enabled.
  const clientId = resolveClientId(request.headers, getTrustedProxyMode())
  const limit = await checkRateLimit(clientId, { allowMemory })
  if (!limit.ok) {
    if (limit.reason === "limited") {
      log(`rate_limited_${limit.scope}`)
      return respond({ ok: false, code: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfterSeconds) })
    }
    log(`rate_limit_${limit.reason}`)
    return respond({ ok: false, code: limit.reason }, 503)
  }

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

  if (mode === "test") {
    log("test_mode")
    return respond({ ok: true, delivered: false, mode: "test" }, 200)
  }

  // Duplicate protection (live mode only; test mode returned above and never reaches this point).
  // Identical enquiries within 10 minutes send at most one email; see lib/enquiry/dedup.ts.
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
    // An identical enquiry was already accepted. Same reference, nothing new is sent.
    log("duplicate", claim.ref)
    return respond({ ok: true, ref: claim.ref, state: "accepted", duplicate: true }, 200)
  }

  const { ref, handle } = claim
  const outcome = await deliverEnquiry(result.data, ref, delivery!)

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
    log("delivery_failed", ref)
    return respond({ ok: false, code: "delivery_failed" }, 502)
  }

  // Unknown outcome (timeout, network error, 5xx, missing id). The email may have been sent, so this is
  // neither success nor "not sent". The ref is kept so a retry reuses it as the idempotency key.
  const finish = await finishDedup(handle, "unsure", ref)
  if (finish === "error") log("dedup_record_failed", ref)
  else if (finish === "lock_lost") log("dedup_lock_lost", ref)
  log(`delivery_uncertain_${outcome.reason}`, ref)
  return respond({ ok: false, code: "delivery_uncertain", ref }, 202)
}
