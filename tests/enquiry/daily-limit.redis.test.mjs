// The site-wide HOURLY + DAILY admission script, and the route around it, on a REAL redis-server.
// A private throwaway server is started per suite; an HTTP shim (tests/helpers/real-redis.mjs) turns the app's
// Upstash REST calls into MULTI/EXEC on it, so the real Lua runs and real concurrent connections interleave.
// Needs `redis-server` on PATH; REQUIRE_REAL_REDIS=1 (or CI=true) makes a missing server FAIL instead of skip.
// This proves the script and the app's use of it on open-source Redis. It does NOT prove Upstash's hosted service.
import assert from "node:assert/strict"
import { afterEach, after, before, beforeEach, describe, it, mock } from "node:test"
import { hasRedis, pointAtRealRedis, startRealRedis } from "../helpers/real-redis.mjs"
import { isolateEnv } from "../helpers/env.mjs"

const skip = hasRedis ? false : "redis-server is not installed"
const route = await import("@/app/api/enquiry/route")
const dedup = await import("@/lib/enquiry/dedup")
const { checkGlobalRateLimit, checkClientRateLimit, resetMemoryRateLimit } = await import("@/lib/enquiry/rate-limit")

const URL_ = "http://localhost:3000/api/enquiry"
const HOURLY = "enquiry:rl:global"
const DAILY = "enquiry:rl:global:day"
const enquiry = (n) => ({
  name: "Jane Wanjiru",
  phone: "0712 345 678",
  email: "jane@example.com",
  service: "manned-guarding",
  county: "Nairobi",
  town: "Thome",
  details: `Enquiry number ${n}: we need guards for a warehouse site.`,
  consent: true,
  company_website: "",
})
const post = (body) =>
  route.POST(new Request(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))
const counters = async (redis) => ({ hourly: Number((await redis.cmd("GET", HOURLY)) ?? 0), daily: Number((await redis.cmd("GET", DAILY)) ?? 0) })

let restoreEnv
let resendCalls
const realFetch = globalThis.fetch
const liveEnv = (redis) => {
  pointAtRealRedis(redis)
  process.env.ENQUIRY_DELIVERY = "live"
  process.env.RESEND_API_KEY = "re_test"
  process.env.ENQUIRY_FROM = "enquiries@example.test"
  process.env.ENQUIRY_TO = "inbox@example.test"
}
function setup() {
  beforeEach(() => {
    restoreEnv = isolateEnv()
    resetMemoryRateLimit()
    dedup.resetMemoryDedup()
    resendCalls = 0
    globalThis.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input.url
      if (!url.includes("api.resend.com")) return realFetch(input, init)
      resendCalls += 1
      return Promise.resolve(new Response(JSON.stringify({ id: `email_${resendCalls}` }), { status: 200 }))
    }
    mock.method(console, "info", () => {})
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    mock.restoreAll()
    restoreEnv()
  })
}

describe("daily + hourly admission on a real redis-server", { skip }, () => {
  let redis
  before(async () => {
    redis = await startRealRedis()
  })
  after(() => redis.close())
  setup()
  beforeEach(async () => {
    await redis.cmd("FLUSHALL")
    redis.calls.length = 0
    pointAtRealRedis(redis)
  })

  it("daily limit reached at N+1: the first N are admitted, the N+1th is refused with scope daily and a ~24 h Retry-After", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "5"
    const results = []
    for (let i = 0; i < 6; i++) results.push(await checkGlobalRateLimit())
    assert.deepEqual(results.slice(0, 5).map((r) => r.ok), [true, true, true, true, true])
    const sixth = results[5]
    assert.deepEqual([sixth.ok, sixth.reason, sixth.scope], [false, "limited", "daily"])
    assert.ok(sixth.retryAfterSeconds > 86_390 && sixth.retryAfterSeconds <= 86_400, `retryAfter=${sixth.retryAfterSeconds}`)
    assert.deepEqual(await counters(redis), { hourly: 5, daily: 5 }, "the refused request incremented neither counter")
  })

  it("hourly limit reached at N+1 (default window 1 h) and the daily counter is NOT consumed by the refusal", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "3"
    const results = []
    for (let i = 0; i < 5; i++) results.push(await checkGlobalRateLimit())
    assert.deepEqual(results.map((r) => r.ok), [true, true, true, false, false])
    assert.equal(results[3].scope, "global")
    assert.ok(results[3].retryAfterSeconds > 3590 && results[3].retryAfterSeconds <= 3600)
    assert.deepEqual(await counters(redis), { hourly: 3, daily: 3 })
  })

  it("a daily refusal does not consume hourly quota either (all or nothing)", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "2"
    process.env.ENQUIRY_GLOBAL_LIMIT = "10"
    for (let i = 0; i < 6; i++) await checkGlobalRateLimit()
    assert.deepEqual(await counters(redis), { hourly: 2, daily: 2 })
  })

  it("when both caps are reached, Retry-After is the LONGER wait, so the client is not refused again by the other cap", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "2"
    process.env.ENQUIRY_DAILY_LIMIT = "2"
    await checkGlobalRateLimit()
    await checkGlobalRateLimit()
    const both = await checkGlobalRateLimit()
    assert.equal(both.scope, "daily")
    assert.ok(both.retryAfterSeconds > 86_390)
    // Hourly only: clear the daily counter so only the hourly cap is reached.
    await redis.cmd("DEL", DAILY)
    const hourlyOnly = await checkGlobalRateLimit()
    assert.deepEqual([hourlyOnly.ok, hourlyOnly.scope], [false, "global"])
    assert.ok(hourlyOnly.retryAfterSeconds <= 3600)
  })

  it("concurrent burst of N+10 requests admits exactly N (daily), and both counters equal N", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "12"
    const results = await Promise.all(Array.from({ length: 22 }, () => checkGlobalRateLimit()))
    assert.equal(results.filter((r) => r.ok).length, 12)
    assert.equal(results.filter((r) => !r.ok && r.reason === "limited" && r.scope === "daily").length, 10)
    assert.deepEqual(await counters(redis), { hourly: 12, daily: 12 })
  })

  it("concurrent burst of N+10 admits exactly N when the HOURLY cap is the binding one", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "8"
    const results = await Promise.all(Array.from({ length: 18 }, () => checkGlobalRateLimit()))
    assert.equal(results.filter((r) => r.ok).length, 8)
    assert.deepEqual(await counters(redis), { hourly: 8, daily: 8 })
  })

  it("expiry: windows are fixed from the first admission and never extended; an expired counter starts a fresh window", async () => {
    await checkGlobalRateLimit()
    const first = { h: await redis.cmd("PTTL", HOURLY), d: await redis.cmd("PTTL", DAILY) }
    assert.ok(first.h > 3_590_000 && first.h <= 3_600_000)
    assert.ok(first.d > 86_390_000 && first.d <= 86_400_000)
    await new Promise((r) => setTimeout(r, 120))
    await checkGlobalRateLimit()
    assert.ok((await redis.cmd("PTTL", DAILY)) < first.d, "a later admission must not extend the daily expiry")
    assert.ok((await redis.cmd("PTTL", HOURLY)) < first.h, "a later admission must not extend the hourly expiry")

    // Shorten the daily key to 300 ms to observe real expiry, then confirm a clean new window begins.
    process.env.ENQUIRY_DAILY_LIMIT = "2"
    assert.equal((await checkGlobalRateLimit()).ok, false, "daily cap (2) reached")
    await redis.cmd("PEXPIRE", DAILY, 300)
    await new Promise((r) => setTimeout(r, 450))
    assert.equal(await redis.cmd("EXISTS", DAILY), 0)
    assert.equal((await checkGlobalRateLimit()).ok, true)
    assert.equal(await redis.cmd("GET", DAILY), "1")
    assert.ok((await redis.cmd("PTTL", DAILY)) > 86_390_000, "fresh full window")
  })

  it("TTL repair: a counter with no expiry is given one (inside the same script) instead of blocking forever", async () => {
    await redis.cmd("SET", DAILY, "79")
    await redis.cmd("SET", HOURLY, "1")
    assert.equal(await redis.cmd("PTTL", DAILY), -1)
    assert.equal((await checkGlobalRateLimit()).ok, true) // 79 -> 80 admitted (default cap 80)
    assert.ok((await redis.cmd("PTTL", DAILY)) > 86_390_000)
    assert.ok((await redis.cmd("PTTL", HOURLY)) > 3_590_000)
    const refused = await checkGlobalRateLimit()
    assert.deepEqual([refused.ok, refused.scope], [false, "daily"])
  })

  it("repair also applies when the counter is already over the cap and has no expiry (it cannot lock the site out for ever)", async () => {
    await redis.cmd("SET", DAILY, "500")
    const r = await checkGlobalRateLimit()
    assert.deepEqual([r.ok, r.scope], [false, "daily"])
    assert.ok(r.retryAfterSeconds <= 86_400 && r.retryAfterSeconds > 86_300)
    assert.ok((await redis.cmd("PTTL", DAILY)) > 0)
  })

  it("a corrupt (non-numeric) counter fails closed as unavailable and nothing is incremented", async () => {
    await redis.cmd("SET", DAILY, "abc", "EX", 1000)
    assert.deepEqual(await checkGlobalRateLimit(), { ok: false, reason: "unavailable" })
    assert.equal(await redis.cmd("EXISTS", HOURLY), 0)
  })

  it("the read-only lockout peek for trusted clients sees the daily cap and consumes nothing", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "1"
    await checkGlobalRateLimit()
    const r = await checkClientRateLimit("v4:203.0.113.5")
    assert.deepEqual([r.ok, r.scope], [false, "daily"])
    assert.equal((await redis.cmd("KEYS", "enquiry:rl:c:*")).length, 0, "no client key created for the refused visitor")
    assert.deepEqual(await counters(redis), { hourly: 1, daily: 1 })
  })

  it("unrelated pre-existing hourly counter written by the previous (INCR-only) version is honoured", async () => {
    await redis.cmd("SET", HOURLY, "29", "EX", 1800)
    assert.equal((await checkGlobalRateLimit()).ok, true) // 30th, default cap 30
    const r = await checkGlobalRateLimit()
    assert.deepEqual([r.ok, r.scope], [false, "global"])
    assert.ok(r.retryAfterSeconds <= 1800)
  })

  describe("through the route (live mode, real dedup + finalize scripts)", () => {
    it("the (N+1)th distinct valid enquiry is refused 429 with Retry-After and nothing is sent for it", async () => {
      liveEnv(redis)
      process.env.ENQUIRY_DAILY_LIMIT = "3"
      for (let i = 1; i <= 3; i++) assert.equal((await post(enquiry(i))).status, 200)
      const res = await post(enquiry(4))
      assert.equal(res.status, 429)
      assert.ok(Number(res.headers.get("retry-after")) > 86_390)
      assert.equal(resendCalls, 3)
    })

    it("duplicate protection is unaffected and duplicates consume NO quota", async () => {
      liveEnv(redis)
      process.env.ENQUIRY_DAILY_LIMIT = "2"
      const first = await (await post(enquiry(1))).json()
      for (let i = 0; i < 6; i++) {
        const dup = await (await post(enquiry(1))).json()
        assert.deepEqual([dup.duplicate, dup.ref], [true, first.ref])
      }
      assert.deepEqual(await counters(redis), { hourly: 1, daily: 1 })
      assert.equal(resendCalls, 1)
      // The duplicate is still answered 200 even when the cap is reached (it sends nothing).
      assert.equal((await post(enquiry(2))).status, 200)
      assert.equal((await post(enquiry(3))).status, 429)
      assert.equal((await (await post(enquiry(1))).json()).duplicate, true)
    })

    it("a refused request releases its dedup lock and records no state, so it is retried as new once quota returns", async () => {
      liveEnv(redis)
      process.env.ENQUIRY_DAILY_LIMIT = "1"
      assert.equal((await post(enquiry(1))).status, 200)
      assert.equal((await post(enquiry(2))).status, 429)
      assert.equal((await redis.cmd("KEYS", "enquiry:dd:l:*")).length, 0, "lock released")
      assert.equal((await redis.cmd("KEYS", "enquiry:dd:s:*")).length, 1, "only the sent enquiry has state")
      assert.equal((await post(enquiry(2))).status, 429, "429 again, not 409 in_progress")
      await redis.cmd("DEL", DAILY)
      assert.equal((await post(enquiry(2))).status, 200)
    })

    it("concurrent burst of N+10 DISTINCT enquiries sends exactly N emails", async () => {
      liveEnv(redis)
      process.env.ENQUIRY_DAILY_LIMIT = "6"
      const res = await Promise.all(Array.from({ length: 16 }, (_, i) => post(enquiry(i))))
      const statuses = res.map((r) => r.status)
      assert.equal(statuses.filter((s) => s === 200).length, 6)
      assert.equal(statuses.filter((s) => s === 429).length, 10)
      assert.equal(resendCalls, 6)
      assert.deepEqual(await counters(redis), { hourly: 6, daily: 6 })
    })

    it("a concurrent burst of the SAME enquiry sends one email and uses one slot", async () => {
      liveEnv(redis)
      const res = await Promise.all(Array.from({ length: 12 }, () => post(enquiry(7))))
      assert.equal(resendCalls, 1)
      assert.ok(res.every((r) => [200, 409].includes(r.status)))
      assert.deepEqual(await counters(redis), { hourly: 1, daily: 1 })
    })

    it("junk (invalid / honeypot) requests consume no site-wide quota", async () => {
      liveEnv(redis)
      await post({ ...enquiry(1), email: "nope" })
      await post({ ...enquiry(1), company_website: "x" })
      assert.deepEqual(await counters(redis), { hourly: 0, daily: 0 })
    })
  })
})

describe("restart safety (append-only persistence)", { skip }, () => {
  let redis
  before(async () => {
    redis = await startRealRedis({ persist: true })
  })
  after(() => redis.close())
  setup()

  it("counters and their remaining TTL survive a crash (SIGKILL) and restart of the Redis server: the cap still holds", async () => {
    pointAtRealRedis(redis)
    process.env.ENQUIRY_DAILY_LIMIT = "3"
    for (let i = 0; i < 3; i++) assert.equal((await checkGlobalRateLimit()).ok, true)
    const ttlBefore = await redis.cmd("PTTL", DAILY)
    await redis.stop("SIGKILL")
    await redis.start()
    const r = await checkGlobalRateLimit()
    assert.deepEqual([r.ok, r.scope], [false, "daily"])
    const ttlAfter = await redis.cmd("PTTL", DAILY)
    assert.ok(ttlAfter > 0 && ttlAfter <= ttlBefore, "expiry kept (not reset, not extended)")
    assert.equal(await redis.cmd("GET", DAILY), "3")
  })

  it("the limiter keeps no state in the application process: a brand-new process view of the same Redis sees the same counts", async () => {
    // The module holds only a memory fallback (unused with Upstash configured). Wiping it simulates an app restart.
    pointAtRealRedis(redis)
    process.env.ENQUIRY_DAILY_LIMIT = "3"
    resetMemoryRateLimit()
    const r = await checkGlobalRateLimit()
    assert.deepEqual([r.ok, r.scope], [false, "daily"])
  })
})

describe("fail closed when Redis is down (real outage)", { skip }, () => {
  let redis
  before(async () => {
    redis = await startRealRedis()
  })
  after(() => redis.close())
  setup()

  it("checkGlobalRateLimit and the trusted-client peek answer unavailable", async () => {
    pointAtRealRedis(redis)
    assert.equal((await checkGlobalRateLimit()).ok, true)
    await redis.stop("SIGKILL")
    assert.deepEqual(await checkGlobalRateLimit(), { ok: false, reason: "unavailable" })
    assert.deepEqual(await checkClientRateLimit("v4:203.0.113.5"), { ok: false, reason: "unavailable" })
  })

  it("the route answers 503 unavailable for a valid enquiry and sends NOTHING", async () => {
    liveEnv(redis) // server is still stopped from the previous test
    const res = await post(enquiry(1))
    assert.equal(res.status, 503)
    assert.equal((await res.json()).code, "unavailable")
    assert.equal(resendCalls, 0)
  })

  it("after Redis comes back the endpoint works again and the daily cap is enforced from the stored count", async () => {
    await redis.start()
    liveEnv(redis)
    process.env.ENQUIRY_DAILY_LIMIT = "1"
    assert.equal((await post(enquiry(1))).status, 200)
    assert.equal((await post(enquiry(2))).status, 429)
  })
})
