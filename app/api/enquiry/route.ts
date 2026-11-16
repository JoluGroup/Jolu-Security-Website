import { randomBytes } from "node:crypto"
import { checkRateLimit, isRateLimitConfigured } from "@/lib/enquiry/rate-limit"
import { deliverEnquiry, getDeliveryConfig, isTestMode } from "@/lib/enquiry/deliver"
import { HONEYPOT_FIELD, LIMITS, validateEnquiry, type EnquiryResponse } from "@/lib/enquiry/schema"

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function createRef() {
  const bytes = randomBytes(6)
  const suffix = Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("")
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return `JS-${date}-${suffix}`
}

function respond(body: EnquiryResponse, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

// Logs carry only the reference and an outcome code — never visitor data.
function log(outcome: string, ref?: string) {
  console.info(JSON.stringify({ scope: "enquiry", outcome, ...(ref ? { ref } : {}) }))
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"
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
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (declaredLength > LIMITS.rawBodyBytes) {
    log("body_too_large")
    return respond({ ok: false, code: "bad_request" }, 413)
  }
  if (!isSameOrigin(request)) {
    log("cross_origin")
    return respond({ ok: false, code: "rejected" }, 403)
  }

  const testMode = isTestMode()
  const delivery = getDeliveryConfig()
  if (!isRateLimitConfigured() || (!testMode && !delivery)) {
    log("not_configured")
    return respond({ ok: false, code: "not_configured" }, 503)
  }

  const raw = await request.text()
  if (raw.length > LIMITS.rawBodyBytes) {
    log("body_too_large")
    return respond({ ok: false, code: "bad_request" }, 413)
  }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    log("bad_json")
    return respond({ ok: false, code: "bad_request" }, 400)
  }

  const limit = await checkRateLimit(clientIp(request))
  if (!limit.ok) {
    log(`rate_limit_${limit.reason}`)
    if (limit.reason === "limited") return respond({ ok: false, code: "rate_limited" }, 429)
    return respond({ ok: false, code: limit.reason === "not_configured" ? "not_configured" : "delivery_failed" }, 503)
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

  if (testMode) {
    log("test_mode")
    return respond({ ok: true, delivered: false, mode: "test" }, 200)
  }

  const ref = createRef()
  const sent = await deliverEnquiry(result.data, ref, delivery!)
  if (!sent.ok) {
    log("delivery_failed", ref)
    return respond({ ok: false, code: "delivery_failed" }, 502)
  }

  log("accepted", ref)
  return respond({ ok: true, ref, state: "accepted" }, 200)
}
