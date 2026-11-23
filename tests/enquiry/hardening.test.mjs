// Regression tests for the backend hardening lane: delivery diagnostics, the catch-all error handler,
// and the global quota moving behind validation.
import assert from "node:assert/strict"
import { afterEach, after, before, beforeEach, describe, it, mock } from "node:test"
import { startFakeUpstash } from "../helpers/fake-upstash.mjs"
import { isolateEnv, pointAtFakeUpstash } from "../helpers/env.mjs"

const route = await import("@/app/api/enquiry/route")
const { resetMemoryRateLimit, checkGlobalRateLimit, checkClientRateLimit, checkRateLimit } = await import("@/lib/enquiry/rate-limit")
const { allowlistedProviderError, PROVIDER_ERROR_NAMES } = await import("@/lib/enquiry/deliver")

const URL_ = "http://localhost:3000/api/enquiry"
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
const distinct = (i) => ({ ...VALID, details: `Distinct enquiry number ${i} for a site.` })

let fake
let restoreEnv
let resendCalls
let resendResponse
let logs
const realFetch = globalThis.fetch

before(async () => {
  fake = await startFakeUpstash()
})
after(() => fake.close())
beforeEach(() => {
  restoreEnv = isolateEnv()
  fake.reset()
  resetMemoryRateLimit()
  resendCalls = []
  logs = []
  resendResponse = () => new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url
    if (url.includes("api.resend.com")) {
      resendCalls.push({ url, init })
      return Promise.resolve(resendResponse())
    }
    return realFetch(input, init)
  }
  mock.method(console, "info", (line) => {
    logs.push(String(line))
  })
})
afterEach(() => {
  globalThis.fetch = realFetch
  mock.restoreAll()
  restoreEnv()
})

const post = (body = VALID, headers = {}) =>
  route.POST(
    new Request(URL_, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  )
const liveEnv = () => {
  pointAtFakeUpstash(fake)
  process.env.ENQUIRY_DELIVERY = "live"
  process.env.RESEND_API_KEY = "re_SECRET_KEY_VALUE"
  process.env.ENQUIRY_FROM = "enquiries@example.test"
  process.env.ENQUIRY_TO = "inbox@example.test"
}
const testEnv = () => {
  pointAtFakeUpstash(fake)
  process.env.ENQUIRY_DELIVERY = "test"
  process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true"
}
const jsonLogs = () => logs.map((l) => JSON.parse(l))
const resendReply = (status, body) => () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })

describe("delivery rejection diagnostics", () => {
  it("logs the numeric status and an allowlisted error name; the visitor response is unchanged", async () => {
    liveEnv()
    resendResponse = resendReply(403, { statusCode: 403, name: "validation_error", message: "The re_SECRET_KEY_VALUE jane@example.com domain is not verified" })
    const res = await post()
    assert.equal(res.status, 502)
    assert.deepEqual(await res.json(), { ok: false, code: "delivery_failed" })
    const entry = jsonLogs().find((l) => l.outcome === "delivery_failed")
    assert.equal(entry.providerStatus, 403)
    assert.equal(entry.providerError, "validation_error")
    assert.equal(entry.scope, "enquiry")
  })

  it("never logs the raw body, visitor data, keys or addresses", async () => {
    liveEnv()
    resendResponse = resendReply(422, { name: "invalid_parameter", message: "to: inbox@example.test from: enquiries@example.test Jane Wanjiru 0712 345 678 re_SECRET_KEY_VALUE" })
    await post()
    const all = logs.join("\n")
    for (const secret of ["re_SECRET_KEY_VALUE", "inbox@example.test", "enquiries@example.test", "jane@example.com", "Jane", "0712", "warehouse", "domain is not"]) {
      assert.equal(all.includes(secret), false, secret)
    }
  })

  it("drops names outside the allowlist, non-JSON bodies and oversized bodies; status is still logged", async () => {
    const cases = [
      ["unlisted name", { name: "totally_made_up<script>" }, undefined],
      ["non-string name", { name: { x: 1 } }, undefined],
      ["not JSON", "<html>gateway</html>", undefined],
      ["oversized", JSON.stringify({ name: "validation_error", pad: "x".repeat(10_000) }), undefined],
      ["empty", "", undefined],
    ]
    for (const [label, body, expected] of cases) {
      liveEnv()
      fake.reset()
      logs.length = 0
      resendResponse = resendReply(400, body)
      const res = await post()
      assert.equal(res.status, 502, label)
      const entry = jsonLogs().find((l) => l.outcome === "delivery_failed")
      assert.equal(entry.providerStatus, 400, label)
      assert.equal(entry.providerError, expected, label)
      assert.equal("providerError" in entry, false, label)
    }
  })

  it("an uncertain provider answer (5xx) logs status class data too, and still answers 202 uncertain", async () => {
    liveEnv()
    resendResponse = resendReply(503, { name: "service_unavailable", message: "jane@example.com" })
    const res = await post()
    assert.equal(res.status, 202)
    const body = await res.json()
    assert.equal(body.code, "delivery_uncertain")
    const entry = jsonLogs().find((l) => l.outcome === "delivery_uncertain_server_error")
    assert.equal(entry.providerStatus, 503)
    assert.equal(entry.providerError, "service_unavailable")
    assert.equal(logs.join("\n").includes("jane@example.com"), false)
  })

  it("a network failure logs no provider fields", async () => {
    liveEnv()
    resendResponse = () => {
      throw new TypeError("fetch failed")
    }
    // deliverEnquiry's fetch call throws synchronously inside the interceptor, caught as a network error.
    const res = await post()
    assert.equal(res.status, 202)
    const entry = jsonLogs().find((l) => l.outcome === "delivery_uncertain_network")
    assert.equal("providerStatus" in entry, false)
  })

  it("allowlistedProviderError only returns members of the fixed list", () => {
    assert.equal(allowlistedProviderError("invalid_api_key"), "invalid_api_key")
    for (const bad of ["Validation_Error", "validation_error ", "x", "", null, undefined, 7, {}, ["validation_error"]]) {
      assert.equal(allowlistedProviderError(bad), undefined)
    }
    for (const n of PROVIDER_ERROR_NAMES) assert.match(n, /^[a-z_]+$/)
  })
})

describe("catch-all error handling", () => {
  class SecretBoom extends Error {}

  it("a throw before any delivery attempt: logs scope + constructor name only, answers 500 server_error, sends nothing", async () => {
    liveEnv()
    const req = new Request(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(VALID) })
    Object.defineProperty(req, "body", {
      get() {
        throw new SecretBoom("jane@example.com 0712 345 678 re_SECRET_KEY_VALUE")
      },
    })
    const res = await route.POST(req)
    assert.equal(res.status, 500)
    assert.deepEqual(await res.json(), { ok: false, code: "server_error" })
    assert.equal(res.headers.get("cache-control"), "no-store")
    assert.equal(resendCalls.length, 0)
    const entry = jsonLogs().find((l) => l.outcome === "unexpected_error")
    assert.deepEqual(entry, { scope: "enquiry", outcome: "unexpected_error", phase: "before_delivery", errorName: "SecretBoom" })
    const all = logs.join("\n")
    for (const leak of ["jane", "0712", "re_SECRET", "stack", " at "]) assert.equal(all.includes(leak), false, leak)
  })

  it("non-Error throws and odd constructor names are reported as a safe name", async () => {
    liveEnv()
    for (const thrown of [null, undefined, "a string with jane@example.com", { constructor: { name: "has spaces & junk" } }]) {
      logs.length = 0
      const req = new Request(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      Object.defineProperty(req, "body", {
        get() {
          throw thrown
        },
      })
      const res = await route.POST(req)
      assert.equal(res.status, 500)
      const entry = jsonLogs().find((l) => l.outcome === "unexpected_error")
      assert.match(entry.errorName, /^([A-Za-z][A-Za-z0-9_$]*|unknown)$/)
      assert.equal(logs.join("\n").includes("jane@example.com"), false)
    }
  })

  it("a throw after delivery began is reported as UNCERTAIN with the ref (never 'nothing sent'), and the lock is released", async () => {
    liveEnv()
    resendResponse = () => {
      const res = new Response(JSON.stringify({ id: "email_1" }), { status: 200 })
      Object.defineProperty(res, "ok", {
        get() {
          throw new SecretBoom("jane@example.com")
        },
      })
      return res
    }
    const res = await post()
    assert.equal(res.status, 202)
    const body = await res.json()
    assert.equal(body.code, "delivery_uncertain")
    assert.match(body.ref, /^JS-\d{8}-[A-Z2-9]{6}$/)
    assert.equal(resendCalls.length, 1)
    const entry = jsonLogs().find((l) => l.outcome === "unexpected_error")
    assert.equal(entry.phase, "delivery_started")
    assert.equal(entry.errorName, "SecretBoom")
    assert.equal(entry.ref, body.ref)
    assert.equal(logs.join("\n").includes("jane@example.com"), false)
    // State recorded as unsure, lock released (not leaked).
    const keys = [...fake.store.keys()]
    assert.equal(keys.some((k) => k.startsWith("enquiry:dd:l:")), false, "lock must be released")
    const state = [...fake.store.entries()].find(([k]) => k.startsWith("enquiry:dd:s:"))
    assert.equal(state[1].value, `unsure:${body.ref}`)
    // A retry reuses the same ref as the idempotency key.
    resendResponse = resendReply(200, { id: "email_2" })
    const retry = await post()
    assert.equal(retry.status, 200)
    assert.equal(resendCalls[1].init.headers["Idempotency-Key"], body.ref)
  })

  it("a throw after the provider ACCEPTED reports acceptance, not an error", async () => {
    liveEnv()
    let threw = false
    mock.restoreAll()
    mock.method(console, "info", (line) => {
      logs.push(String(line))
      if (!threw && String(line).includes('"outcome":"accepted"')) {
        threw = true
        throw new SecretBoom("jane@example.com")
      }
    })
    const res = await post()
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.ok, true)
    assert.equal(body.state, "accepted")
    assert.equal(resendCalls.length, 1)
    assert.equal([...fake.store.keys()].some((k) => k.startsWith("enquiry:dd:l:")), false, "lock released")
  })

  it("even if logging itself throws inside the handler, a safe JSON response is still returned", async () => {
    liveEnv()
    mock.restoreAll()
    mock.method(console, "info", () => {
      throw new SecretBoom("log sink down")
    })
    const res = await post()
    // The send succeeded; the first log call throws after that. The recovery's own log throws too, yet the
    // reply is still a safe JSON body carrying the true outcome (accepted), never an error page.
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.ok, true)
    assert.equal(resendCalls.length, 1)
  })
})

describe("global quota is charged only after validation", () => {
  const counters = () => {
    const out = { client: 0, global: 0 }
    for (const [key, entry] of fake.store) {
      if (key.startsWith("enquiry:rl:c:")) out.client = entry.value
      else if (key === "enquiry:rl:global") out.global = entry.value
    }
    return out
  }

  it("junk traffic in shared mode cannot exhaust the global cap: a real enquiry afterwards still succeeds", async () => {
    liveEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "5"
    for (let i = 0; i < 40; i++) {
      const kind = i % 3
      const res = kind === 0 ? await post("{nope") : kind === 1 ? await post({ ...VALID, email: "bad" }) : await post({ ...VALID, company_website: "bot" })
      assert.equal(res.status, 400)
    }
    assert.deepEqual(counters(), { client: 0, global: 0 })
    assert.equal(fake.transactions.length, 0, "junk costs no Redis round trip at all")
    const ok = await post()
    assert.equal(ok.status, 200)
    assert.equal(resendCalls.length, 1)
    assert.deepEqual(counters(), { client: 0, global: 1 })
  })

  it("the cap on EMAILS per window is unchanged: only globalLimit distinct valid enquiries are sent", async () => {
    liveEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "3"
    const statuses = []
    for (let i = 0; i < 8; i++) statuses.push((await post(distinct(i))).status)
    assert.deepEqual(statuses, [200, 200, 200, 429, 429, 429, 429, 429])
    assert.equal(resendCalls.length, 3)
  })

  it("concurrent valid requests cannot exceed the cap (atomic counter)", async () => {
    liveEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "4"
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => post(distinct(i))))
    assert.equal(results.filter((r) => r.status === 200).length, 4)
    assert.equal(results.filter((r) => r.status === 429).length, 8)
    assert.equal(resendCalls.length, 4)
  })

  it("fails closed: a valid request with the store down gets 503 unavailable and nothing is sent", async () => {
    liveEnv()
    fake.state = undefined
    fake.mode = "http500"
    const res = await post()
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { ok: false, code: "unavailable" })
    assert.equal(resendCalls.length, 0)
  })

  it("fails closed in production with no store at all (live mode): 503, nothing sent", async () => {
    process.env.NODE_ENV = "production"
    process.env.ENQUIRY_DELIVERY = "live"
    process.env.RESEND_API_KEY = "re_x"
    process.env.ENQUIRY_FROM = "a@example.test"
    process.env.ENQUIRY_TO = "b@example.test"
    const res = await post()
    assert.equal(res.status, 503)
    assert.equal(resendCalls.length, 0)
  })

  it("a global lockout still answers a valid visitor with 429 and Retry-After, before any delivery", async () => {
    liveEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "1"
    assert.equal((await post(distinct(1))).status, 200)
    const res = await post(distinct(2))
    assert.equal(res.status, 429)
    assert.equal(res.headers.get("retry-after"), "3600")
    assert.equal(resendCalls.length, 1)
  })

  it("trusted mode keeps the per-client limit on junk: a noisy client is cut off, other clients are not", async () => {
    liveEnv()
    process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
    process.env.ENQUIRY_CLIENT_LIMIT = "3"
    const junk = (ip) => post("{nope", { "x-real-ip": ip })
    const statuses = []
    for (let i = 0; i < 5; i++) statuses.push((await junk("6.6.6.6")).status)
    assert.deepEqual(statuses, [400, 400, 400, 429, 429])
    assert.equal(counters().global, 0, "junk never reached the global counter")
    assert.equal((await post(VALID, { "x-real-ip": "7.7.7.7" })).status, 200)
  })

  it("trusted mode: a global lockout is still refused up front without consuming client quota", async () => {
    liveEnv()
    process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
    process.env.ENQUIRY_GLOBAL_LIMIT = "1"
    assert.equal((await post(distinct(1), { "x-real-ip": "1.1.1.1" })).status, 200)
    for (let i = 0; i < 3; i++) assert.equal((await post("{nope", { "x-real-ip": "2.2.2.2" })).status, 429)
    assert.equal([...fake.store.keys()].filter((k) => k.startsWith("enquiry:rl:c:")).length, 1)
  })

  it("test mode behaves the same: junk is free of global quota, valid requests are counted", async () => {
    testEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "2"
    for (let i = 0; i < 10; i++) assert.equal((await post({ ...VALID, email: "x" })).status, 400)
    assert.deepEqual([(await post()).status, (await post()).status, (await post()).status], [200, 200, 429])
  })
})

describe("rate-limit halves compose to the original check", () => {
  it("checkRateLimit equals checkClientRateLimit then checkGlobalRateLimit", async () => {
    pointAtFakeUpstash(fake)
    process.env.ENQUIRY_CLIENT_LIMIT = "2"
    process.env.ENQUIRY_GLOBAL_LIMIT = "3"
    const seen = []
    for (let i = 0; i < 4; i++) seen.push(await checkRateLimit("v4:1.1.1.1"))
    assert.deepEqual(seen.map((r) => r.ok), [true, true, false, false])
    assert.equal(seen[2].scope, "client")
    fake.reset()
    assert.deepEqual(await checkClientRateLimit(null), { ok: true })
    assert.equal(fake.transactions.length, 0, "no identity: the client half does nothing")
  })

  it("the global half fails closed without a durable store in production, and when Redis errors", async () => {
    process.env.NODE_ENV = "production"
    assert.deepEqual(await checkGlobalRateLimit(), { ok: false, reason: "not_configured" })
    assert.deepEqual(await checkClientRateLimit("v4:1.1.1.1"), { ok: false, reason: "not_configured" })
    pointAtFakeUpstash(fake)
    fake.mode = "http500"
    assert.deepEqual(await checkGlobalRateLimit(), { ok: false, reason: "unavailable" })
  })
})
