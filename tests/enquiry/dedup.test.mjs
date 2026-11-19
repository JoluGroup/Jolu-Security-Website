import assert from "node:assert/strict"
import { afterEach, after, before, beforeEach, describe, it, mock } from "node:test"
import { startFakeUpstash } from "../helpers/fake-upstash.mjs"
import { isolateEnv, pointAtFakeUpstash } from "../helpers/env.mjs"

const route = await import("@/app/api/enquiry/route")
const dedup = await import("@/lib/enquiry/dedup")
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
  dedup.resetMemoryDedup()
  resendCalls = []
  resendResponse = () => new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url
    if (url.includes("api.resend.com")) {
      resendCalls.push({ url, init })
      try {
        return Promise.resolve(resendResponse())
      } catch (e) {
        return Promise.reject(e)
      }
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
      body: JSON.stringify(body),
    }),
  )
const liveEnv = () => {
  pointAtFakeUpstash(fake)
  process.env.ENQUIRY_DELIVERY = "live"
  process.env.RESEND_API_KEY = "re_test"
  process.env.ENQUIRY_FROM = "enquiries@example.test"
  process.env.ENQUIRY_TO = "inbox@example.test"
}
const ok = (id = "email_1") => new Response(JSON.stringify({ id }), { status: 200 })
const status = (code, body = "{}") => new Response(body, { status: code })
const keys = () => [...fake.store.keys()]
const ddKeys = (kind) => keys().filter((k) => k.startsWith(`enquiry:dd:${kind}:`))
const idemKey = (i) => resendCalls[i].init.headers["Idempotency-Key"]
const isDedupTx = (cmds) => cmds.some((c) => String(c[1]).startsWith("enquiry:dd:"))
const waitFor = async (fn) => {
  for (let i = 0; i < 200; i++) {
    if (fn()) return
    await new Promise((r) => setTimeout(r, 5))
  }
  throw new Error("timed out waiting for condition")
}

describe("identical repeated enquiries", () => {
  it("the second identical enquiry sends nothing and returns the same reference", async () => {
    liveEnv()
    const a = await post()
    const first = await a.json()
    assert.equal(a.status, 200)
    assert.equal(first.state, "accepted")
    assert.equal(first.duplicate, undefined)

    const b = await post()
    const second = await b.json()
    assert.equal(b.status, 200)
    assert.deepEqual(second, { ok: true, ref: first.ref, state: "accepted", duplicate: true })
    assert.equal(resendCalls.length, 1)
  })

  it("trivial differences (case, spacing, phone format, email case) are the same enquiry", async () => {
    liveEnv()
    await post()
    const variant = {
      ...VALID,
      name: "  JANE   wanjiru ",
      phone: "+254712345678",
      email: "Jane@Example.COM",
      town: "thome",
      details: "we need guards   for a warehouse\tsite.",
    }
    const res = await post(variant)
    assert.equal((await res.json()).duplicate, true)
    assert.equal(resendCalls.length, 1)
  })

  it("the fingerprint is stable and canonical", () => {
    const base = { name: "A B", phone: "+254712345678", email: "a@b.co", service: "manned-guarding", county: "Nairobi", town: "X", details: "same text here" }
    assert.equal(dedup.canonicalEnquiry(base), dedup.canonicalEnquiry({ ...base, name: " a  b ", details: "SAME   text here" }))
    assert.notEqual(dedup.canonicalEnquiry(base), dedup.canonicalEnquiry({ ...base, details: "other text here" }))
  })
})

describe("different enquiries are never blocked", () => {
  for (const [label, change] of [
    ["details", { details: "A completely different request for an event." }],
    ["service", { service: "cctv-installation" }],
    ["phone", { phone: "0722 000 111" }],
    ["email", { email: "other@example.com" }],
    ["town", { town: "Westlands" }],
    ["county", { county: "Mombasa" }],
    ["name", { name: "John Otieno" }],
  ]) {
    it(`a different ${label} is sent as a new enquiry with its own reference`, async () => {
      liveEnv()
      const first = await (await post()).json()
      const res = await post({ ...VALID, ...change })
      const second = await res.json()
      assert.equal(res.status, 200)
      assert.equal(second.duplicate, undefined)
      assert.notEqual(second.ref, first.ref)
      assert.equal(resendCalls.length, 2)
    })
  }
})

describe("concurrent duplicate requests", () => {
  it("exactly one email is sent; the others are told it is in progress, then see the duplicate", async () => {
    liveEnv()
    let release
    resendResponse = () => new Promise((resolve) => (release = () => resolve(ok("email_c"))))

    const winner = post()
    await waitFor(() => resendCalls.length === 1)
    // If locking were broken these would wait on the held Resend call forever, so fail fast instead.
    const guard = new Promise((_, reject) => setTimeout(() => reject(new Error("duplicate requests were not refused")), 3000))
    const others = await Promise.race([Promise.all([post(), post(), post(), post()]), guard])
    for (const res of others) {
      assert.equal(res.status, 409)
      assert.deepEqual(await res.json(), { ok: false, code: "in_progress" })
    }
    assert.equal(resendCalls.length, 1)

    release()
    const done = await winner
    const body = await done.json()
    assert.equal(done.status, 200)
    assert.equal(body.state, "accepted")

    const later = await (await post()).json()
    assert.deepEqual(later, { ok: true, ref: body.ref, state: "accepted", duplicate: true })
    assert.equal(resendCalls.length, 1)
  })

  it("a burst fired at the same instant still sends exactly one email", async () => {
    liveEnv()
    const results = await Promise.all(Array.from({ length: 8 }, () => post()))
    const statuses = results.map((r) => r.status).sort()
    assert.equal(resendCalls.length, 1)
    assert.equal(statuses.filter((s) => s === 200).length >= 1, true)
    assert.equal(statuses.every((s) => s === 200 || s === 409), true)
  })

  it("concurrent DIFFERENT enquiries do not block each other", async () => {
    liveEnv()
    const results = await Promise.all(
      ["one", "two", "three"].map((x) => post({ ...VALID, details: `Different request number ${x} for us.` })),
    )
    assert.deepEqual(results.map((r) => r.status), [200, 200, 200])
    assert.equal(resendCalls.length, 3)
  })
})

describe("duplicate window", () => {
  it("still a duplicate just inside 10 minutes; a new enquiry once the window has expired", async () => {
    liveEnv()
    const first = await (await post()).json()
    fake.advance(599)
    assert.equal((await (await post()).json()).duplicate, true)
    assert.equal(resendCalls.length, 1)

    fake.advance(2) // 601 s after the first one finished
    const again = await (await post()).json()
    assert.equal(again.duplicate, undefined)
    assert.notEqual(again.ref, first.ref)
    assert.equal(resendCalls.length, 2)
  })

  it("the state key carries a 10 minute expiry and the lock is released after delivery", async () => {
    liveEnv()
    await post()
    const [stateKey] = ddKeys("s")
    const entry = fake.store.get(stateKey)
    assert.equal(entry.expiresAt - fake.nowMs, 600_000)
    assert.match(entry.value, /^sent:JS-\d{8}-[A-Z2-9]{6}$/)
    assert.equal(ddKeys("l").length, 0)
  })

  it("a lock left by a crashed instance expires after 30 s instead of blocking for 10 minutes", async () => {
    liveEnv()
    const enq = { name: "Jane Wanjiru", phone: "+254712345678", email: "jane@example.com", service: "manned-guarding", county: "Nairobi", town: "Thome", details: "We need guards for a warehouse site." }
    assert.equal((await dedup.beginDedup(enq, "JS-20260101-AAAAAA")).kind, "proceed") // never finished
    fake.advance(29)
    assert.equal((await dedup.beginDedup(enq, "JS-20260101-BBBBBB")).kind, "in_progress")
    fake.advance(2)
    const retry = await dedup.beginDedup(enq, "JS-20260101-CCCCCC")
    assert.equal(retry.kind, "proceed")
    assert.equal(retry.ref, "JS-20260101-CCCCCC")
  })
})

describe("Redis failures", () => {
  it("if the duplicate check fails, nothing is sent and the visitor is told so (503 unavailable)", async () => {
    liveEnv()
    fake.failIf = (cmds) => cmds.some((c) => c[0] === "SET" && String(c[1]).startsWith("enquiry:dd:l:"))
    const res = await post()
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { ok: false, code: "unavailable" })
    assert.equal(resendCalls.length, 0)
  })

  it("garbage or error replies to the duplicate check also fail closed", async () => {
    liveEnv()
    fake.failIf = (cmds) => cmds.some((c) => c[0] === "GET" && String(c[1]).startsWith("enquiry:dd:s:"))
    assert.equal((await post()).status, 503)
    assert.equal(resendCalls.length, 0)
  })

  it("if recording the result fails after sending, the visitor still gets the true outcome (sent)", async () => {
    liveEnv()
    fake.failIf = (cmds) => cmds.some((c) => c[0] === "EVAL")
    const res = await post()
    assert.equal(res.status, 200)
    assert.equal((await res.json()).state, "accepted")
    assert.equal(resendCalls.length, 1)
    // The lock is left to expire on its own, and then the enquiry could be sent again (documented trade-off).
    fake.failIf = null
    fake.advance(31)
    const retry = await post()
    assert.equal(retry.status, 200)
  })

  it("Redis keys and commands contain no visitor data", async () => {
    liveEnv()
    await post()
    const haystack = JSON.stringify([...fake.transactions, keys(), [...fake.store.values()]]).toLowerCase()
    for (const secret of ["jane", "wanjiru", "example.com", "712345678", "warehouse", "thome", "nairobi", "manned"]) {
      assert.equal(haystack.includes(secret), false, `leaked ${secret}`)
    }
    for (const k of ddKeys("s").concat(ddKeys("l"))) assert.match(k, /^enquiry:dd:[sl]:[0-9a-f]{32}$/)
  })

  it("the fingerprint depends on the server secret (same enquiry, different token, different key)", async () => {
    liveEnv()
    await post()
    const before = ddKeys("s")[0]
    fake.reset()
    fake.token = "another-token"
    process.env.UPSTASH_REDIS_REST_TOKEN = "another-token"
    await post()
    assert.notEqual(ddKeys("s")[0], before)
  })

  it("logs carry no visitor data and never the fingerprint", async () => {
    liveEnv()
    const logged = []
    mock.restoreAll()
    mock.method(console, "info", (line) => logged.push(String(line)))
    await post()
    await post()
    const text = logged.join("\n").toLowerCase()
    for (const secret of ["jane", "example.com", "712345678", "warehouse", "enquiry:dd"]) {
      assert.equal(text.includes(secret), false, `logged ${secret}`)
    }
    assert.match(text, /"outcome":"duplicate"/)
  })
})

describe("delivery outcomes", () => {
  it("success: 200 accepted, one email, state recorded as sent", async () => {
    liveEnv()
    const res = await post()
    const body = await res.json()
    assert.equal(res.status, 200)
    assert.equal(body.state, "accepted")
    assert.equal(idemKey(0), body.ref)
    assert.equal(fake.store.get(ddKeys("s")[0]).value, `sent:${body.ref}`)
  })

  it("a definite provider refusal (4xx) is 502 delivery_failed, releases the lock and allows an immediate retry", async () => {
    liveEnv()
    resendResponse = () => status(422, JSON.stringify({ message: "bad" }))
    const res = await post()
    assert.equal(res.status, 502)
    assert.deepEqual(await res.json(), { ok: false, code: "delivery_failed" })
    assert.equal(ddKeys("s").length, 0)
    assert.equal(ddKeys("l").length, 0)

    resendResponse = () => ok("email_2")
    const retry = await post()
    assert.equal(retry.status, 200)
    assert.equal((await retry.json()).duplicate, undefined)
    assert.equal(resendCalls.length, 2)
  })

  it("provider rate limiting (429) counts as a definite refusal", async () => {
    liveEnv()
    resendResponse = () => status(429)
    assert.equal((await post()).status, 502)
  })
})

describe("ambiguous Resend outcomes are never reported as success or as 'not sent'", () => {
  const cases = [
    ["timeout", () => Promise.reject(Object.assign(new Error("timed out"), { name: "TimeoutError" }))],
    ["network error", () => Promise.reject(new TypeError("fetch failed"))],
    ["server error (500)", () => status(500)],
    ["bad gateway (502)", () => status(502)],
    ["conflict (409)", () => status(409)],
    ["request timeout (408)", () => status(408)],
    ["2xx without an id", () => status(200, "{}")],
    ["2xx with an unreadable body", () => status(200, "not json")],
  ]
  for (const [label, response] of cases) {
    it(`${label}: 202 delivery_uncertain with a reference, state recorded as unsure`, async () => {
      liveEnv()
      resendResponse = response
      const res = await post()
      const body = await res.json()
      assert.equal(res.status, 202)
      assert.equal(body.ok, false)
      assert.equal(body.code, "delivery_uncertain")
      assert.match(body.ref, /^JS-\d{8}-[A-Z2-9]{6}$/)
      assert.equal(fake.store.get(ddKeys("s")[0]).value, `unsure:${body.ref}`)
      assert.equal(ddKeys("l").length, 0)
    })
  }

  it("a retry after an uncertain attempt tries again with the SAME reference and idempotency key", async () => {
    liveEnv()
    resendResponse = () => status(500)
    const first = await (await post()).json()

    resendResponse = () => ok("email_ok")
    const retry = await post()
    const body = await retry.json()
    assert.equal(retry.status, 200)
    assert.equal(body.ref, first.ref)
    assert.equal(resendCalls.length, 2)
    assert.equal(idemKey(1), idemKey(0))
    assert.equal(idemKey(1), first.ref)

    // Now it is settled: further identical submissions send nothing.
    const third = await (await post()).json()
    assert.deepEqual(third, { ok: true, ref: first.ref, state: "accepted", duplicate: true })
    assert.equal(resendCalls.length, 2)
  })

  it("a retry after an uncertain attempt that is refused keeps the unsure state (the first attempt may have gone out)", async () => {
    liveEnv()
    resendResponse = () => status(500)
    const first = await (await post()).json()
    resendResponse = () => status(422)
    assert.equal((await post()).status, 502)
    assert.equal(fake.store.get(ddKeys("s")[0]).value, `unsure:${first.ref}`)
  })

  it("concurrent retries after an uncertain attempt still send at most one more email", async () => {
    liveEnv()
    resendResponse = () => status(500)
    await post()
    let release
    resendResponse = () => new Promise((resolve) => (release = () => resolve(ok("late"))))
    const a = post()
    await waitFor(() => resendCalls.length === 2)
    const b = await post()
    assert.equal(b.status, 409)
    release()
    assert.equal((await a).status, 200)
    assert.equal(resendCalls.length, 2)
  })
})

describe("test mode", () => {
  it("never contacts Resend and never touches duplicate state", async () => {
    pointAtFakeUpstash(fake)
    process.env.ENQUIRY_DELIVERY = "test"
    process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true"
    process.env.RESEND_API_KEY = "re_test"
    process.env.ENQUIRY_FROM = "enquiries@example.test"
    process.env.ENQUIRY_TO = "inbox@example.test"
    for (let i = 0; i < 3; i++) {
      const res = await post()
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { ok: true, delivered: false, mode: "test" })
    }
    assert.equal(resendCalls.length, 0)
    assert.equal(fake.transactions.some(isDedupTx), false)
    assert.equal(ddKeys("s").length + ddKeys("l").length, 0)
  })
})

describe("interaction with the existing rate limits", () => {
  it("duplicates still count toward the global cap, which refuses with 429 before the duplicate check", async () => {
    liveEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "3"
    assert.equal((await post()).status, 200) // sends
    assert.equal((await (await post()).json()).duplicate, true)
    assert.equal((await (await post()).json()).duplicate, true)
    const txBefore = fake.transactions.length
    const limited = await post()
    assert.equal(limited.status, 429)
    assert.ok(limited.headers.get("retry-after"))
    assert.equal(fake.transactions.slice(txBefore).some(isDedupTx), false)
    assert.equal(resendCalls.length, 1)
  })

  it("per-client limits apply to repeated identical submissions in trusted-proxy mode", async () => {
    liveEnv()
    process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
    process.env.ENQUIRY_CLIENT_LIMIT = "2"
    const h = { "x-vercel-forwarded-for": "203.0.113.9" }
    assert.equal((await post(VALID, h)).status, 200)
    assert.equal((await post(VALID, h)).status, 200) // duplicate
    assert.equal((await post(VALID, h)).status, 429)
    assert.equal(resendCalls.length, 1)
  })

  it("a different client submitting the identical enquiry is also a duplicate (the enquiry is the identity, not the IP)", async () => {
    liveEnv()
    process.env.ENQUIRY_TRUSTED_PROXY = "vercel"
    await post(VALID, { "x-vercel-forwarded-for": "203.0.113.9" })
    const other = await (await post(VALID, { "x-vercel-forwarded-for": "198.51.100.7" })).json()
    assert.equal(other.duplicate, true)
    assert.equal(resendCalls.length, 1)
  })

  it("rejected inputs never reach the duplicate check (invalid, honeypot)", async () => {
    liveEnv()
    await post({ ...VALID, email: "nope" })
    await post({ ...VALID, company_website: "x" })
    assert.equal(fake.transactions.some(isDedupTx), false)
    assert.equal(resendCalls.length, 0)
  })

  it("Redis down at the limiter still fails closed first (unchanged from 4B.1)", async () => {
    liveEnv()
    fake.mode = "http500"
    const res = await post()
    assert.equal(res.status, 503)
    assert.equal(resendCalls.length, 0)
  })
})

describe("in-memory fallback (development only)", () => {
  it("de-duplicates without Upstash outside production", async () => {
    process.env.ENQUIRY_DELIVERY = "live"
    process.env.RESEND_API_KEY = "re_test"
    process.env.ENQUIRY_FROM = "enquiries@example.test"
    process.env.ENQUIRY_TO = "inbox@example.test"
    const first = await (await post()).json()
    const second = await (await post()).json()
    assert.equal(second.duplicate, true)
    assert.equal(second.ref, first.ref)
    assert.equal(resendCalls.length, 1)
  })
})
