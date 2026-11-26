import assert from "node:assert/strict"
import { afterEach, after, before, beforeEach, describe, it, mock } from "node:test"
import { startFakeUpstash } from "../helpers/fake-upstash.mjs"
import { isolateEnv, pointAtFakeUpstash } from "../helpers/env.mjs"

const route = await import("@/app/api/enquiry/route")
const dedup = await import("@/lib/enquiry/dedup")
const { REFERRAL_SOURCES } = await import("@/lib/enquiry/referral")
const { validateEnquiry } = await import("@/lib/enquiry/schema")
const { resetMemoryRateLimit } = await import("@/lib/enquiry/rate-limit")

const VALID = {
  name: "Jane Wanjiru",
  phone: "0712 345 678",
  email: "jane@example.com",
  service: "manned-guarding",
  county: "Nairobi",
  town: "Thome",
  details: "We need guards for a warehouse site.",
  consent: true,
  company_website: "",
}

let fake, restoreEnv, resendCalls, logs
const realFetch = globalThis.fetch
before(async () => { fake = await startFakeUpstash() })
after(() => fake.close())
beforeEach(() => {
  restoreEnv = isolateEnv()
  fake.reset()
  resetMemoryRateLimit()
  dedup.resetMemoryDedup()
  resendCalls = []
  logs = []
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url
    if (url.includes("api.resend.com")) {
      resendCalls.push({ url, init })
      return Promise.resolve(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }))
    }
    return realFetch(input, init)
  }
  mock.method(console, "info", (line) => logs.push(String(line)))
  pointAtFakeUpstash(fake)
  process.env.ENQUIRY_DELIVERY = "live"
  process.env.RESEND_API_KEY = "re_test"
  process.env.ENQUIRY_FROM = "enquiries@example.test"
  process.env.ENQUIRY_TO = "inbox@example.test"
})
afterEach(() => {
  globalThis.fetch = realFetch
  mock.restoreAll()
  restoreEnv()
})

const post = (body) =>
  route.POST(new Request("http://localhost:3000/api/enquiry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))

describe("referral_source validation", () => {
  it("the allowlist is exactly the nine approved labels", () => {
    assert.deepEqual([...REFERRAL_SOURCES], [
      "Google Search", "ChatGPT / OpenAI", "Google Gemini", "Perplexity AI", "Microsoft Copilot",
      "LinkedIn / Social Media", "Client Referral / Word of Mouth", "Directory / Tender Portal", "Other",
    ])
  })

  it("accepts every allowlisted option", () => {
    for (const label of REFERRAL_SOURCES) {
      const r = validateEnquiry({ ...VALID, referral_source: label })
      assert.equal(r.ok, true, label)
      assert.equal(r.data.referralSource, label)
    }
  })

  it("omitted, null and empty string are fine and produce no referralSource", () => {
    for (const v of [undefined, null, ""]) {
      const r = validateEnquiry({ ...VALID, referral_source: v })
      assert.equal(r.ok, true)
      assert.equal("referralSource" in r.data, false)
    }
    assert.equal(validateEnquiry(VALID).ok, true)
  })

  it("rejects non-allowlisted, near-miss, oversized and non-string values", () => {
    const bad = ["google search", " Google Search", "Google Search ", "Facebook", "x".repeat(10000), 0, 1, true, false, [], ["Other"], {}, { a: 1 }, " "]
    for (const v of bad) {
      const r = validateEnquiry({ ...VALID, referral_source: v })
      assert.equal(r.ok, false, JSON.stringify(v)?.slice(0, 30))
      assert.deepEqual(Object.keys(r.errors), ["referral_source"])
    }
  })

  it("injection strings are rejected over HTTP with 400 and never reflected", async () => {
    {
      for (const payload of ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', "Other\r\nBcc: evil@example.com", "'; DROP TABLE x;--", "{{7*7}}"]) {
        const res = await post({ ...VALID, referral_source: payload })
        assert.equal(res.status, 400)
        const text = await res.text()
        assert.equal(JSON.parse(text).code, "invalid")
        assert.equal(text.includes(payload), false)
        assert.equal(text.includes("script"), false)
        assert.equal(logs.join("\n").includes(payload), false)
      }
      assert.equal(resendCalls.length, 0)
    }
  })

  it("invalid referral on its own does not consume the global quota", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "1"
    assert.equal((await post({ ...VALID, referral_source: "nope" })).status, 400)
    assert.equal((await post({ ...VALID, referral_source: "Other" })).status, 200)
  })
})

describe("referral_source delivery and logging", () => {
  it("includes the validated label in the plain-text email", async () => {
    const res = await post({ ...VALID, referral_source: "Perplexity AI" })
    assert.equal(res.status, 200)
    const sent = JSON.parse(resendCalls[0].init.body)
    assert.match(sent.text, /^How they heard about us: Perplexity AI$/m)
    assert.equal(sent.html, undefined) // the email is plain text only today; there is no HTML part to escape
  })

  it("labels containing & and / are carried verbatim as text (no markup path exists)", async () => {
    await post({ ...VALID, referral_source: "Client Referral / Word of Mouth" })
    assert.match(JSON.parse(resendCalls[0].init.body).text, /How they heard about us: Client Referral \/ Word of Mouth/)
  })

  it("omits the line when not provided (old client payload still works unchanged)", async () => {
    const res = await post(VALID)
    assert.equal(res.status, 200)
    assert.equal(JSON.parse(resendCalls[0].init.body).text.includes("How they heard"), false)
  })

  it("logs the allowlisted label (or none) and no PII", async () => {
    await post({ ...VALID, referral_source: "Google Gemini" })
    await post({ ...VALID, details: "A different enquiry body text here." })
    const accepted = logs.map((l) => JSON.parse(l)).filter((l) => l.outcome === "accepted")
    assert.deepEqual(accepted.map((l) => l.referral), ["Google Gemini", "none"])
    const all = logs.join("\n")
    for (const pii of ["Jane", "jane@example.com", "0712", "warehouse"]) assert.equal(all.includes(pii), false, pii)
  })
})

describe("referral_source and duplicate suppression", () => {
  it("canonical dedupe key is independent of referral_source", () => {
    const a = validateEnquiry(VALID).data
    const b = validateEnquiry({ ...VALID, referral_source: "Google Search" }).data
    const c = validateEnquiry({ ...VALID, referral_source: "Other" }).data
    assert.equal(dedup.canonicalEnquiry(a), dedup.canonicalEnquiry(b))
    assert.equal(dedup.canonicalEnquiry(b), dedup.canonicalEnquiry(c))
  })

  it("changing ONLY referral_source cannot bypass duplicate suppression: one email, same ref", async () => {
    const first = await (await post({ ...VALID, referral_source: "Google Search" })).json()
    const second = await post({ ...VALID, referral_source: "LinkedIn / Social Media" })
    const body = await second.json()
    assert.equal(second.status, 200)
    assert.equal(body.duplicate, true)
    assert.equal(body.ref, first.ref)
    const third = await (await post(VALID)).json()
    assert.equal(third.duplicate, true)
    assert.equal(resendCalls.length, 1)
  })

  it("a genuinely different enquiry is still sent; duplicates use no quota, real sends do", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "2"
    assert.equal((await post({ ...VALID, referral_source: "Other" })).status, 200)
    for (const r of ["Google Search", "Perplexity AI", "Other"]) assert.equal((await post({ ...VALID, referral_source: r })).status, 200) // duplicates, free
    assert.equal((await post({ ...VALID, town: "Karen", referral_source: "Other" })).status, 200) // 2nd real send
    const limited = await post({ ...VALID, town: "Runda", referral_source: "Other" })
    assert.equal(limited.status, 429) // rate limits still count with referral_source present
    assert.deepEqual(await limited.json(), { ok: false, code: "rate_limited" })
    assert.equal(resendCalls.length, 2)
  })
})
