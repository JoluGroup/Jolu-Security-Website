import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"

const events = await import("@/lib/analytics/events")
const config = await import("@/lib/analytics/config")
const consent = await import("@/lib/analytics/consent")
const client = await import("@/lib/analytics/client")
const clicks = await import("@/lib/analytics/click-tracking")

const ENV = "NEXT_PUBLIC_GA_MEASUREMENT_ID"
const TEST_ID = "G-TEST123456" // fake value for tests only
let calls, fetchCalls, realFetch, savedEnv

beforeEach(() => {
  savedEnv = process.env[ENV]
  delete process.env[ENV]
  consent.setAnalyticsConsent(false)
  calls = []
  fetchCalls = 0
  realFetch = globalThis.fetch
  globalThis.fetch = () => { fetchCalls++; return Promise.reject(new Error("network must not be used")) }
  globalThis.window = { location: { pathname: "/contact", search: "?email=a@b.co", hash: "#x" }, gtag: (...a) => calls.push(a) }
})
afterEach(() => {
  globalThis.fetch = realFetch
  delete globalThis.window
  if (savedEnv === undefined) delete process.env[ENV]
  else process.env[ENV] = savedEnv
  consent.setAnalyticsConsent(false)
})

describe("sanitizer privacy", () => {
  it("drops every non-allowlisted key, including PII", () => {
    const out = events.sanitizeParams({
      name: "Jane", phone: "+254712345678", email: "j@x.co", details: "secret message", message: "m", token: "t",
      url: "https://x.co/a?b=1", href: "tel:+254790298003", ref: "JS-1", page_path: "/contact", service: "manned-guarding",
      referral_source: "Other", source_component: "footer",
    })
    assert.deepEqual(out, { page_path: "/contact", service: "manned-guarding", referral_source: "Other", source_component: "footer" })
  })

  it("strips query and hash and origin from paths", () => {
    assert.equal(events.safePagePath("/contact?email=a@b.co#frag"), "/contact")
    assert.equal(events.safePagePath("https://example.com/services/x?token=abc#y"), "/services/x")
    assert.equal(events.safePagePath("/"), "/")
  })

  it("drops paths that could carry identifiers, and non-strings", () => {
    for (const v of ["/user@example.com", "/a%40b.co", "/x y", "/" + "a".repeat(300), 5, null, undefined, {}, ""]) {
      assert.equal(events.safePagePath(v), undefined, String(v).slice(0, 20))
    }
  })

  it("only allowlisted service, referral and component values pass", () => {
    assert.deepEqual(events.sanitizeParams({ service: "jane@x.co", referral_source: "free text", source_component: "<b>" }), {})
    assert.deepEqual(events.sanitizeParams(null), {})
    assert.deepEqual(events.sanitizeParams("str"), {})
  })

  it("unknown event names are refused", () => {
    assert.equal(events.sanitizeEvent("purchase", {}), null)
    assert.equal(events.sanitizeEvent({}, {}), null)
    assert.equal(events.sanitizeEvent("generate_lead", { name: "x" }).name, "generate_lead")
  })
})

describe("disabled by default", () => {
  it("no env var: disabled, no gtag call, no network, even with consent", () => {
    assert.equal(config.isAnalyticsEnabled(), false)
    consent.setAnalyticsConsent(true)
    client.track("generate_lead", { service: "manned-guarding" })
    client.loadAnalytics()
    client.initAnalytics()()
    assert.equal(calls.length, 0)
    assert.equal(fetchCalls, 0)
  })

  it("malformed IDs are treated as disabled", () => {
    for (const v of ["", "UA-1234", "G-", "g-abcd1234", "G-ab cd", "<script>", undefined, 5]) assert.equal(config.parseMeasurementId(v), null, String(v))
    assert.equal(config.parseMeasurementId(TEST_ID), TEST_ID)
  })

  it("consent defaults to denied and is required: ID set but no consent emits nothing", () => {
    process.env[ENV] = TEST_ID
    assert.equal(consent.hasAnalyticsConsent(), false)
    client.track("generate_lead")
    assert.equal(calls.length, 0)
  })

  it("consent revoked stops events again", () => {
    process.env[ENV] = TEST_ID
    consent.setAnalyticsConsent(true)
    client.track("phone_click", { source_component: "header" })
    consent.setAnalyticsConsent(false)
    client.track("phone_click", { source_component: "header" })
    assert.equal(calls.length, 1)
  })
})

describe("enabled path emits sanitized payloads only", () => {
  it("adds path without query/hash and drops PII supplied by a caller", () => {
    process.env[ENV] = TEST_ID
    consent.setAnalyticsConsent(true)
    client.track("generate_lead", { service: "manned-guarding", referral_source: "Google Gemini", source_component: "enquiry_form", name: "Jane", email: "j@x.co", phone: "0712" })
    assert.deepEqual(calls, [["event", "generate_lead", { page_path: "/contact", service: "manned-guarding", referral_source: "Google Gemini", source_component: "enquiry_form" }]])
    assert.equal(JSON.stringify(calls).includes("Jane"), false)
    assert.equal(JSON.stringify(calls).includes("email=a"), false)
  })

  it("a throwing transport never propagates", () => {
    process.env[ENV] = TEST_ID
    consent.setAnalyticsConsent(true)
    globalThis.window.gtag = () => { throw new Error("boom") }
    assert.doesNotThrow(() => client.track("phone_click"))
  })
})

describe("click classification", () => {
  it("recognises tel: and WhatsApp links only, without reading the number", () => {
    assert.equal(clicks.classifyLink("tel:+254790298003"), "phone_click")
    assert.equal(clicks.classifyLink("TEL:0790298003"), "phone_click")
    assert.equal(clicks.classifyLink("https://wa.me/254790298003?text=hi"), "whatsapp_click")
    assert.equal(clicks.classifyLink("https://api.whatsapp.com/send?phone=1"), "whatsapp_click")
    for (const v of ["https://evil.example/wa.me", "https://wa.me.evil.example/x", "mailto:a@b.co", "/contact", "", null, undefined]) assert.equal(clicks.classifyLink(v), null, String(v))
  })
  it("maps landmark tags to allowlisted components", () => {
    assert.equal(clicks.sourceFromTag(["DIV", "FOOTER", "BODY"]), "footer")
    assert.equal(clicks.sourceFromTag(["P", "FORM", "MAIN"]), "enquiry_form")
    assert.equal(clicks.sourceFromTag(["DIV"]), "other")
  })
})
