// Release 04B lane G: a replayed duplicate enquiry must not produce a second generate_lead.
// Unit truth table for isNewConfirmedLead, the same decision driven by REAL responses from the enquiry route (fake Upstash,
// intercepted Resend: no network, no secret), and a source check that the form uses it for its only generate_lead call.
import assert from "node:assert/strict"
import { after, afterEach, before, beforeEach, describe, it, mock } from "node:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { startFakeUpstash } from "../helpers/fake-upstash.mjs"
import { isolateEnv, pointAtFakeUpstash } from "../helpers/env.mjs"

const ROOT = path.resolve(import.meta.dirname, "../..")
const { isNewConfirmedLead } = await import("@/lib/analytics/lead")
const route = await import("@/app/api/enquiry/route")
const { resetMemoryRateLimit } = await import("@/lib/enquiry/rate-limit")

describe("isNewConfirmedLead", () => {
  const NEW = { ok: true, ref: "JS-ABC123", state: "accepted" }
  it("counts only a 2xx, ok, accepted reply with a reference and no duplicate marker", () => {
    assert.equal(isNewConfirmedLead(true, NEW), true)
  })
  it("never counts a replayed duplicate, whatever the marker's value", () => {
    for (const duplicate of [true, "true", 1, false, null, undefined, 0, ""]) assert.equal(isNewConfirmedLead(true, { ...NEW, duplicate }), false, String(duplicate))
  })
  it("never counts a non-2xx reply, a rejection, an uncertain outcome, test mode or malformed data", () => {
    const cases = [
      [false, NEW],
      ["true", NEW],
      [true, { ...NEW, ok: "true" }],
      [true, { ...NEW, state: "received" }],
      [true, { ok: true, state: "accepted" }],
      [true, { ...NEW, ref: "" }],
      [true, { ok: true, delivered: false, mode: "test" }],
      [true, { ok: false, code: "delivery_uncertain", ref: "JS-ABC123" }],
      [false, { ok: false, code: "in_progress" }],
      [false, { ok: false, code: "rate_limited" }],
      [false, { ok: false, code: "invalid", errors: {} }],
      [true, null],
      [true, "accepted"],
      [true, Object.create(NEW)],
    ]
    for (const [httpOk, body] of cases) assert.equal(isNewConfirmedLead(httpOk, body), false, JSON.stringify([httpOk, body]))
  })
})

describe("driven by the real enquiry route", () => {
  const VALID = { name: "Jane Wanjiru", phone: "0712 345 678", email: "jane@example.com", service: "manned-guarding", county: "Nairobi", town: "Thome", details: "We need guards for a warehouse site.", consent: true, company_website: "", referral_source: "Google Search" }
  let fake, restoreEnv, sends
  const realFetch = globalThis.fetch
  before(async () => { fake = await startFakeUpstash() })
  after(() => fake.close())
  beforeEach(() => {
    restoreEnv = isolateEnv()
    fake.reset()
    resetMemoryRateLimit()
    sends = 0
    globalThis.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input.url
      if (url.includes("api.resend.com")) { sends++; return Promise.resolve(new Response(JSON.stringify({ id: "email_123" }), { status: 200 })) }
      return realFetch(input, init)
    }
    mock.method(console, "info", () => {})
    pointAtFakeUpstash(fake)
    Object.assign(process.env, { ENQUIRY_DELIVERY: "live", RESEND_API_KEY: "re_test", ENQUIRY_FROM: "enquiries@example.test", ENQUIRY_TO: "inbox@example.test" })
  })
  afterEach(() => { globalThis.fetch = realFetch; mock.restoreAll(); restoreEnv() })
  const post = (body) => route.POST(new Request("http://localhost:3000/api/enquiry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))
  const decide = async (res) => isNewConfirmedLead(res.ok, await res.json())

  it("first submission is one new lead; the identical replay (and a referral-only change) are not", async () => {
    assert.equal(await decide(await post(VALID)), true)
    assert.equal(await decide(await post(VALID)), false)
    assert.equal(await decide(await post({ ...VALID, referral_source: "Perplexity AI" })), false)
    assert.equal(sends, 1, "exactly one email, so exactly one lead")
  })
  it("a different enquiry is a new lead again", async () => {
    assert.equal(await decide(await post(VALID)), true)
    assert.equal(await decide(await post({ ...VALID, details: "A different site needs night cover for its gates." })), true)
    assert.equal(sends, 2)
  })
  it("a rejected submission is never a lead", async () => {
    assert.equal(await decide(await post({ ...VALID, email: "not-an-email" })), false)
    assert.equal(sends, 0)
  })
})

describe("the enquiry form", () => {
  const src = readFileSync(path.join(ROOT, "components/enquiry-form.tsx"), "utf8")
  it("emits generate_lead exactly once in source, and only behind isNewConfirmedLead", () => {
    const calls = [...src.matchAll(/track\("generate_lead"/g)]
    assert.equal(calls.length, 1)
    assert.match(src, /if \(isNewConfirmedLead\(httpOk, result\)\) track\("generate_lead", ctx\)/)
  })
  it("analytics stays inactive: no measurement id, no tag script and no consent banner were added", () => {
    const layout = readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8")
    assert.ok(!/googletagmanager|G-[A-Z0-9]{6,}/.test(src + layout))
    const lead = readFileSync(path.join(ROOT, "lib/analytics/lead.ts"), "utf8")
    assert.ok(!/fetch|document|window|gtag/.test(lead.replace(/\/\/.*$/gm, "")), "the decision is pure")
  })
})
