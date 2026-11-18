import assert from "node:assert/strict"
import { afterEach, after, before, beforeEach, describe, it, mock } from "node:test"
import { startFakeUpstash } from "../helpers/fake-upstash.mjs"
import { isolateEnv, pointAtFakeUpstash } from "../helpers/env.mjs"

const route = await import("@/app/api/enquiry/route")
const { getDeliveryMode } = await import("@/lib/enquiry/deliver")
const { resetMemoryRateLimit } = await import("@/lib/enquiry/rate-limit")

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

let fake
let restoreEnv
let resendCalls
let resendResponse
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
  resendResponse = () => new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
  // Intercept Resend only; everything else (the local fake Upstash) is real HTTP.
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url
    if (url.includes("api.resend.com")) {
      resendCalls.push({ url, init })
      return Promise.resolve(resendResponse())
    }
    return realFetch(input, init)
  }
  mock.method(console, "info", () => {})
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
  process.env.RESEND_API_KEY = "re_test"
  process.env.ENQUIRY_FROM = "enquiries@example.test"
  process.env.ENQUIRY_TO = "inbox@example.test"
}
const testEnv = () => {
  pointAtFakeUpstash(fake)
  process.env.ENQUIRY_DELIVERY = "test"
  process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true" // production builds need this opt-in for test mode
}

describe("delivery modes", () => {
  it("only exact live/test enable anything; unset or invalid is disabled", () => {
    const cases = [[undefined, "disabled"], ["", "disabled"], ["prod", "disabled"], ["true", "disabled"], ["live", "live"], ["test", "test"], [" TEST ", "test"], ["Live", "live"]]
    for (const [value, expected] of cases) {
      if (value === undefined) delete process.env.ENQUIRY_DELIVERY
      else process.env.ENQUIRY_DELIVERY = value
      assert.equal(getDeliveryMode(), expected, String(value))
    }
  })

  it("unset mode fails closed with 503 even when every credential is present", async () => {
    liveEnv()
    delete process.env.ENQUIRY_DELIVERY
    const res = await post()
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { ok: false, code: "not_configured" })
    assert.equal(resendCalls.length, 0)
  })

  it("invalid mode fails closed", async () => {
    liveEnv()
    process.env.ENQUIRY_DELIVERY = "production"
    assert.equal((await post()).status, 503)
    assert.equal(resendCalls.length, 0)
  })

  it("test mode never contacts Resend, even with credentials and in a production build", async () => {
    liveEnv()
    process.env.ENQUIRY_DELIVERY = "test" // NODE_ENV is "production" here, as on a preview
    process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true"
    const res = await post()
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true, delivered: false, mode: "test" })
    assert.equal(resendCalls.length, 0)
  })

  it("test mode does not claim success: no ref and no accepted state", async () => {
    testEnv()
    const body = await (await post()).json()
    assert.equal("ref" in body, false)
    assert.equal("state" in body, false)
    assert.equal(body.delivered, false)
  })

  it("test mode works on a production build without Upstash (in-memory limiter, nothing is sent)", async () => {
    process.env.NODE_ENV = "production"
    process.env.ENQUIRY_DELIVERY = "test"
    process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true"
    assert.equal((await post()).status, 200)
  })

  it("live mode without complete credentials fails closed and sends nothing", async () => {
    for (const missing of ["RESEND_API_KEY", "ENQUIRY_FROM", "ENQUIRY_TO"]) {
      liveEnv()
      delete process.env[missing]
      const res = await post()
      assert.equal(res.status, 503, missing)
      assert.equal((await res.json()).code, "not_configured")
    }
    assert.equal(resendCalls.length, 0)
  })

  it("live mode in production without Upstash fails closed", async () => {
    liveEnv()
    delete process.env.UPSTASH_REDIS_REST_URL
    assert.equal((await post()).status, 503)
    assert.equal(resendCalls.length, 0)
  })

  it("live mode sends once and reports accepted (not inbox delivery)", async () => {
    liveEnv()
    const res = await post()
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.ok, true)
    assert.equal(body.state, "accepted")
    assert.match(body.ref, /^JS-\d{8}-[A-Z2-9]{6}$/)
    assert.equal(resendCalls.length, 1)
    const sent = JSON.parse(resendCalls[0].init.body)
    assert.deepEqual(sent.to, ["inbox@example.test"])
    assert.equal(sent.from, "enquiries@example.test")
    assert.equal(sent.reply_to, "jane@example.com")
  })

  it("a Resend failure returns 502 delivery_failed, never success", async () => {
    liveEnv()
    resendResponse = () => new Response("{}", { status: 422 })
    const res = await post()
    assert.equal(res.status, 502)
    assert.equal((await res.json()).code, "delivery_failed")
  })
})

describe("production test-mode safeguard", () => {
  it("test mode in a production build without the opt-in fails closed (503 not_configured), touching nothing", async () => {
    liveEnv()
    process.env.ENQUIRY_DELIVERY = "test" // NODE_ENV=production, credentials present, no ENQUIRY_ALLOW_PRODUCTION_TEST
    const res = await post()
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { ok: false, code: "not_configured" })
    assert.equal(resendCalls.length, 0)
    assert.equal(fake.transactions.length, 0, "no rate-limit quota is consumed either")
  })

  it("only an explicit true opts in; anything else stays blocked", async () => {
    for (const value of ["false", "yes", "1", "on", "", "truee"]) {
      liveEnv()
      process.env.ENQUIRY_DELIVERY = "test"
      process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = value
      assert.equal((await post()).status, 503, JSON.stringify(value))
    }
    for (const value of ["true", "TRUE", " true "]) {
      liveEnv()
      process.env.ENQUIRY_DELIVERY = "test"
      process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = value
      assert.equal((await post()).status, 200, JSON.stringify(value))
    }
    assert.equal(resendCalls.length, 0)
  })

  it("the opt-in never permits real delivery: test mode with the flag and full credentials sends nothing", async () => {
    liveEnv()
    process.env.ENQUIRY_DELIVERY = "test"
    process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true"
    for (let i = 0; i < 3; i++) {
      const body = await (await post()).json()
      assert.deepEqual(body, { ok: true, delivered: false, mode: "test" })
    }
    assert.equal(resendCalls.length, 0)
  })

  it("the flag does not turn an unset or invalid mode into anything but 503", async () => {
    for (const mode of [undefined, "", "prod", "tset"]) {
      liveEnv()
      if (mode === undefined) delete process.env.ENQUIRY_DELIVERY
      else process.env.ENQUIRY_DELIVERY = mode
      process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true"
      assert.equal((await post()).status, 503, String(mode))
    }
    assert.equal(resendCalls.length, 0)
  })

  it("the flag has no effect on live mode (live still needs its own configuration)", async () => {
    liveEnv()
    process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true"
    delete process.env.RESEND_API_KEY
    assert.equal((await post()).status, 503)
    assert.equal(resendCalls.length, 0)
    process.env.RESEND_API_KEY = "re_test"
    const res = await post()
    assert.equal(res.status, 200)
    assert.equal((await res.json()).state, "accepted") // genuine live path, not a simulation
    assert.equal(resendCalls.length, 1)
  })

  it("outside production, test mode needs no opt-in", async () => {
    process.env.NODE_ENV = "development"
    process.env.ENQUIRY_DELIVERY = "test"
    assert.equal((await post()).status, 200)
    assert.equal(resendCalls.length, 0)
  })
})

describe("which requests consume quota (documented behaviour)", () => {
  const counters = () => {
    const out = { client: 0, global: 0 }
    for (const [key, entry] of fake.store) out[key.startsWith("enquiry:rl:c:") ? "client" : "global"] = entry.value
    return out
  }
  const trusted = (extra = {}) => ({ "x-real-ip": "1.1.1.1", ...extra })

  it("requests that fail after the limiter still count once against client and global", async () => {
    const cases = {
      "validation error": () => post({ ...VALID, email: "nope" }, trusted()),
      "malformed JSON": () => post("{nope", trusted()),
      "honeypot": () => post({ ...VALID, company_website: "x" }, trusted()),
    }
    for (const [name, send] of Object.entries(cases)) {
      testEnv()
      process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
      fake.reset()
      const res = await send()
      assert.equal(res.status, 400, name)
      assert.deepEqual(counters(), { client: 1, global: 1 }, name)
    }
  })

  it("requests refused before the limiter cost nothing", async () => {
    testEnv()
    process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
    const wrongType = await route.POST(new Request(URL_, { method: "POST", headers: { "content-type": "text/plain", ...trusted() }, body: "x" }))
    assert.equal(wrongType.status, 415)
    assert.equal((await post(VALID, trusted({ "content-length": "99999" }))).status, 413)
    assert.equal((await post(VALID, trusted({ origin: "https://evil.example", host: "localhost:3000" }))).status, 403)
    assert.equal((await post(VALID, trusted({ "content-length": "abc" }))).status, 400)
    assert.deepEqual(counters(), { client: 0, global: 0 })
    assert.equal(fake.transactions.length, 0)
  })

  it("a visitor retrying during a global lockout keeps their own client quota (over HTTP)", async () => {
    testEnv()
    process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
    process.env.ENQUIRY_GLOBAL_LIMIT = "1"
    assert.equal((await post(VALID, { "x-real-ip": "9.9.9.9" })).status, 200)
    for (let i = 0; i < 4; i++) {
      const res = await post(VALID, trusted())
      assert.equal(res.status, 429)
      assert.equal(res.headers.get("retry-after"), "3600")
    }
    const clientKeys = [...fake.store.keys()].filter((k) => k.startsWith("enquiry:rl:c:"))
    assert.equal(clientKeys.length, 1, "only the first visitor has a client counter")
  })
})

describe("HTTP semantics", () => {
  it("415 for a non-JSON content type", async () => {
    testEnv()
    const res = await route.POST(new Request(URL_, { method: "POST", headers: { "content-type": "text/plain" }, body: "x" }))
    assert.equal(res.status, 415)
  })

  it("400 for malformed JSON, and 400 for a bad content-length header", async () => {
    testEnv()
    assert.equal((await post("{nope")).status, 400)
    assert.equal((await post(VALID, { "content-length": "abc" })).status, 400)
  })

  it("403 for a cross-origin request", async () => {
    testEnv()
    const res = await post(VALID, { origin: "https://evil.example", host: "localhost:3000" })
    assert.equal(res.status, 403)
  })

  it("400 for the honeypot and 400 with field errors for invalid input", async () => {
    testEnv()
    const bot = await post({ ...VALID, company_website: "x" })
    assert.equal(bot.status, 400)
    assert.equal((await bot.json()).code, "rejected")
    const bad = await post({ ...VALID, email: "nope", consent: false })
    assert.equal(bad.status, 400)
    const body = await bad.json()
    assert.equal(body.code, "invalid")
    assert.ok(body.errors.email && body.errors.consent)
  })

  it("only POST is exported (other methods get 405 from Next.js)", () => {
    assert.equal(route.GET, undefined)
    assert.equal(route.PUT, undefined)
  })
})

describe("request body limit", () => {
  it("413 when Content-Length declares more than 16 KiB, before any limiter or body work", async () => {
    testEnv()
    const res = await post(VALID, { "content-length": String(16 * 1024 + 1) })
    assert.equal(res.status, 413)
    assert.equal(fake.transactions.length, 0)
  })

  it("413 for an oversized body with no Content-Length, and the stream is cancelled early", async () => {
    testEnv()
    let pulled = 0
    let cancelled = false
    const chunk = new TextEncoder().encode("x".repeat(4096))
    const stream = new ReadableStream({
      pull(controller) {
        pulled += 1
        if (pulled > 1000) return controller.close()
        controller.enqueue(chunk)
      },
      cancel() {
        cancelled = true
      },
    })
    const res = await route.POST(
      new Request(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" }),
    )
    assert.equal(res.status, 413)
    assert.equal(cancelled, true)
    assert.ok(pulled < 20, `read ${pulled} chunks of 4 KiB before stopping`)
  })

  it("the limit counts bytes, not characters", async () => {
    testEnv()
    const multibyte = JSON.stringify({ ...VALID, details: "é".repeat(9000) }) // ~18 KB, only ~9 k characters
    assert.equal((await post(multibyte)).status, 413)
  })

  it("accepts a normal body just under the limit", async () => {
    testEnv()
    const padded = JSON.stringify({ ...VALID, junk: "y".repeat(16 * 1024 - 600) })
    assert.ok(new TextEncoder().encode(padded).length <= 16 * 1024)
    assert.equal((await post(padded)).status, 200)
  })
})

describe("rate limiting over HTTP", () => {
  it("shared mode (default): rotating spoofed forwarding headers cannot bypass the global limit", async () => {
    testEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "6"
    const statuses = []
    for (let i = 0; i < 9; i++) {
      statuses.push((await post(VALID, { "x-forwarded-for": `10.0.0.${i}`, "x-real-ip": `10.0.1.${i}` })).status)
    }
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 200, 429, 429, 429])
  })

  it("429 carries an accurate integer Retry-After header", async () => {
    testEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "1"
    await post()
    fake.advance(100)
    const res = await post()
    assert.equal(res.status, 429)
    assert.deepEqual(await res.json(), { ok: false, code: "rate_limited" })
    assert.equal(res.headers.get("retry-after"), "3500")
    assert.equal(res.headers.get("cache-control"), "no-store")
  })

  it("trusted proxy mode gives each client its own limit while the global cap still applies", async () => {
    testEnv()
    process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
    process.env.ENQUIRY_CLIENT_LIMIT = "2"
    process.env.ENQUIRY_GLOBAL_LIMIT = "5"
    const as = (ip) => post(VALID, { "x-real-ip": ip })
    assert.deepEqual([(await as("1.1.1.1")).status, (await as("1.1.1.1")).status, (await as("1.1.1.1")).status], [200, 200, 429])
    assert.equal((await as("2.2.2.2")).status, 200) // another client is unaffected
    assert.equal((await as("3.3.3.3")).status, 200)
    assert.equal((await as("4.4.4.4")).status, 200) // global count 5
    assert.equal((await as("5.5.5.5")).status, 429) // global cap holds
  })

  it("trusted proxy mode ignores x-forwarded-for entirely (vercel mode)", async () => {
    testEnv()
    process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
    process.env.ENQUIRY_CLIENT_LIMIT = "2"
    const statuses = []
    for (let i = 0; i < 4; i++) statuses.push((await post(VALID, { "x-real-ip": "7.7.7.7", "x-forwarded-for": `10.0.0.${i}` })).status)
    assert.deepEqual(statuses, [200, 200, 429, 429])
  })

  it("503 'unavailable' (not delivery_failed) when Redis is down, and nothing is sent", async () => {
    liveEnv()
    for (const mode of ["http500", "garbage", "cmderr"]) {
      fake.mode = mode
      const res = await post()
      assert.equal(res.status, 503, mode)
      assert.deepEqual(await res.json(), { ok: false, code: "unavailable" })
    }
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1"
    assert.equal((await post()).status, 503)
    assert.equal(resendCalls.length, 0)
  })

  it("503 'unavailable' when Redis hangs", async () => {
    liveEnv()
    fake.mode = "hang"
    const res = await post()
    assert.equal(res.status, 503)
    assert.equal((await res.json()).code, "unavailable")
    assert.equal(resendCalls.length, 0)
  })

  it("logs carry no visitor data", async () => {
    liveEnv()
    await post()
    const logged = console.info.mock.calls.map((c) => c.arguments[0]).join("\n")
    assert.ok(!/Jane|0712|jane@example|warehouse|Thome/.test(logged))
  })
})
