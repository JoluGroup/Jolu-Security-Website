import assert from "node:assert/strict"
import { afterEach, before, after, beforeEach, describe, it, mock } from "node:test"
import { startFakeUpstash } from "../helpers/fake-upstash.mjs"
import { isolateEnv, pointAtFakeUpstash } from "../helpers/env.mjs"

const { checkRateLimit, getRateLimitConfig, isRateLimitAvailable, resetMemoryRateLimit } = await import(
  "@/lib/enquiry/rate-limit"
)

let fake
let restoreEnv
before(async () => {
  fake = await startFakeUpstash()
})
after(() => fake.close())
beforeEach(() => {
  restoreEnv = isolateEnv()
  fake.reset()
  resetMemoryRateLimit()
  pointAtFakeUpstash(fake)
})
afterEach(() => {
  restoreEnv()
  mock.timers.reset()
})

const hits = async (id, times) => {
  const out = []
  for (let i = 0; i < times; i++) out.push(await checkRateLimit(id))
  return out
}

describe("fixed-duration window (Upstash path)", () => {
  it("allows 5 per client, then limits with an accurate Retry-After", async () => {
    const results = await hits("v4:1.1.1.1", 6)
    assert.deepEqual(results.slice(0, 5).map((r) => r.ok), [true, true, true, true, true])
    assert.equal(results[5].ok, false)
    assert.equal(results[5].reason, "limited")
    assert.equal(results[5].scope, "client")
    assert.equal(results[5].retryAfterSeconds, 600)
  })

  it("does not extend the expiry on later requests", async () => {
    await hits("v4:2.2.2.2", 6) // blocked at t=0
    fake.advance(300)
    const mid = await checkRateLimit("v4:2.2.2.2")
    assert.equal(mid.ok, false)
    assert.equal(mid.retryAfterSeconds, 300) // counted from the FIRST request, not this retry
    fake.advance(301) // t=601s: past the original window
    assert.equal((await checkRateLimit("v4:2.2.2.2")).ok, true)
  })

  it("resets exactly one window after the first request, however often the client retries", async () => {
    for (let minute = 0; minute <= 9; minute++) {
      fake.nowMs = minute * 60_000
      await checkRateLimit("v4:3.3.3.3")
    }
    fake.nowMs = 10 * 60_000 + 1000
    assert.equal((await checkRateLimit("v4:3.3.3.3")).ok, true)
  })

  it("sets the expiry only when the window is created (SET ... EX ... NX, INCR, PTTL in one transaction)", async () => {
    await hits("v4:4.4.4.4", 2)
    assert.equal(fake.transactions.length, 6) // peek + client + global, per request
    assert.deepEqual(fake.transactions[0].map((c) => c[0]), ["GET", "PTTL", "GET", "PTTL"]) // the peek is read-only (hourly + daily)
    const client = fake.transactions[1]
    assert.deepEqual(client.map((c) => c[0]), ["SET", "INCR", "PTTL"])
    assert.deepEqual(client[0].slice(2), [0, "EX", 600, "NX"])
    assert.ok(!fake.transactions.flat().some((c) => c[0] === "EXPIRE"))
    assert.match(client[0][1], /^enquiry:rl:c:[0-9a-f]{32}$/)
    assert.ok(!JSON.stringify(fake.transactions).includes("4.4.4.4"), "raw IP must never be sent to Redis")
  })

  it("counts concurrent requests exactly", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => checkRateLimit("v4:5.5.5.5")))
    assert.equal(results.filter((r) => r.ok).length, 5)
    assert.equal(results.filter((r) => !r.ok && r.reason === "limited").length, 15)
  })

  it("repairs a counter that somehow has no expiry", async () => {
    fake.store.set("enquiry:rl:global", { value: 0, expiresAt: null })
    const result = await checkRateLimit(null)
    assert.equal(result.ok, true)
    assert.notEqual(fake.store.get("enquiry:rl:global").expiresAt, null)
    assert.equal(fake.store.get("enquiry:rl:global").value, 1)
  })
})

describe("global and per-client limits", () => {
  it("shared mode (no client id) applies only the global limit", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "3"
    const results = await hits(null, 4)
    assert.deepEqual(results.map((r) => r.ok), [true, true, true, false])
    assert.equal(results[3].scope, "global")
    assert.equal(results[3].retryAfterSeconds, 3600)
    assert.deepEqual([...fake.store.keys()].sort(), ["enquiry:rl:global", "enquiry:rl:global:day"])
  })

  it("global limit stays effective across different trusted clients", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "3"
    const results = []
    for (const ip of ["a", "b", "c", "d"]) results.push(await checkRateLimit(`v4:${ip}`))
    assert.deepEqual(results.map((r) => r.ok), [true, true, true, false])
    assert.equal(results[3].scope, "global")
  })

  it("requests refused by the per-client limit do not consume the global allowance", async () => {
    process.env.ENQUIRY_CLIENT_LIMIT = "2"
    process.env.ENQUIRY_GLOBAL_LIMIT = "3"
    const noisy = await hits("v4:noisy", 8)
    assert.equal(noisy.filter((r) => r.ok).length, 2)
    assert.equal((await checkRateLimit("v4:other")).ok, true) // global count is now 3
    assert.equal((await checkRateLimit("v4:another")).ok, false) // global cap reached
  })

  it("during a global lockout a trusted client is refused without consuming client or global quota", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "2"
    await checkRateLimit("v4:a")
    await checkRateLimit("v4:b") // global is now at its cap
    fake.transactions.length = 0
    for (let i = 0; i < 4; i++) {
      const r = await checkRateLimit("v4:c")
      assert.deepEqual([r.ok, r.reason, r.scope], [false, "limited", "global"])
    }
    assert.ok(fake.transactions.every((t) => t.every((c) => c[0] === "GET" || c[0] === "PTTL")), "only read-only commands")
    assert.equal(fake.store.get("enquiry:rl:global").value, 2, "global counter must not grow while locked out")
    assert.equal([...fake.store.keys()].filter((k) => k.startsWith("enquiry:rl:c:")).length, 2, "no client key for the refused visitor")
  })

  it("the lockout Retry-After counts down from the global window, and a visitor has a full client quota afterwards", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "1"
    await checkRateLimit("v4:a")
    fake.advance(100)
    const locked = await checkRateLimit("v4:c")
    assert.equal(locked.retryAfterSeconds, 3500)
    await checkRateLimit("v4:c")
    await checkRateLimit("v4:c")
    fake.advance(3501) // global window over
    process.env.ENQUIRY_GLOBAL_LIMIT = "200" // so only the client limit (5) is under test below
    const after = await hits("v4:c", 5)
    assert.equal(after.filter((r) => r.ok).length, 5, "client quota untouched by the lockout retries")
  })

  it("the peek does not weaken the cap under concurrency (INCR still decides)", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "3"
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => checkRateLimit(`v4:parallel-${i}`)))
    assert.equal(results.filter((r) => r.ok).length, 3)
    assert.ok(results.filter((r) => !r.ok).every((r) => r.reason === "limited" && r.scope === "global"))
  })

  it("an expired global counter does not lock anyone out", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "1"
    await checkRateLimit("v4:a")
    assert.equal((await checkRateLimit("v4:b")).ok, false)
    fake.advance(3601)
    assert.equal((await checkRateLimit("v4:b")).ok, true)
  })

  it("global window expires and resets", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "2"
    await hits(null, 3)
    fake.advance(3599)
    assert.equal((await checkRateLimit(null)).ok, false)
    fake.advance(2)
    assert.equal((await checkRateLimit(null)).ok, true)
  })

  it("reads limits from the environment and ignores invalid values", () => {
    process.env.ENQUIRY_CLIENT_LIMIT = "7"
    process.env.ENQUIRY_GLOBAL_LIMIT = "abc"
    process.env.ENQUIRY_CLIENT_WINDOW_SECONDS = "5" // below the 60 s floor
    process.env.ENQUIRY_GLOBAL_WINDOW_SECONDS = "-1"
    assert.deepEqual(getRateLimitConfig(), {
      clientLimit: 7,
      clientWindowSeconds: 600,
      globalLimit: 30,
      globalWindowSeconds: 3600,
      dailyLimit: 80,
      dailyWindowSeconds: 86400,
    })
  })
})

describe("Redis outages fail closed", () => {
  for (const mode of ["http500", "garbage", "cmderr"]) {
    it(`returns unavailable on ${mode}`, async () => {
      fake.mode = mode
      assert.deepEqual(await checkRateLimit("v4:6.6.6.6"), { ok: false, reason: "unavailable" })
      assert.deepEqual(await checkRateLimit(null), { ok: false, reason: "unavailable" })
    })
  }

  it("returns unavailable when the connection is refused", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1"
    assert.deepEqual(await checkRateLimit(null), { ok: false, reason: "unavailable" })
  })

  it("returns unavailable on a wrong token", async () => {
    process.env.UPSTASH_REDIS_REST_TOKEN = "wrong"
    assert.deepEqual(await checkRateLimit(null), { ok: false, reason: "unavailable" })
  })

  it("returns unavailable when Redis hangs (5 s timeout)", async () => {
    fake.mode = "hang"
    const started = Date.now()
    assert.deepEqual(await checkRateLimit(null), { ok: false, reason: "unavailable" })
    const elapsed = Date.now() - started
    assert.ok(elapsed >= 4500 && elapsed < 7000, `timed out after ${elapsed} ms`)
  })
})

describe("configuration and the in-memory fallback", () => {
  it("production without Upstash is not_configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    assert.equal(isRateLimitAvailable(), false)
    assert.deepEqual(await checkRateLimit("v4:7.7.7.7"), { ok: false, reason: "not_configured" })
  })

  it("production without Upstash is usable only when memory is explicitly allowed (test delivery)", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    assert.equal(isRateLimitAvailable(true), true)
    assert.equal((await checkRateLimit("v4:7.7.7.7", { allowMemory: true })).ok, true)
  })

  it("memory fallback also refuses a lockout without consuming client quota", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    process.env.NODE_ENV = "development"
    process.env.ENQUIRY_GLOBAL_LIMIT = "2"
    mock.timers.enable({ apis: ["Date"], now: 0 })
    await checkRateLimit("v4:a")
    await checkRateLimit("v4:b")
    for (let i = 0; i < 4; i++) assert.equal((await checkRateLimit("v4:c")).scope, "global")
    mock.timers.tick(3601_000)
    process.env.ENQUIRY_GLOBAL_LIMIT = "200" // so only the client limit (5) is under test below
    assert.equal((await hits("v4:c", 5)).filter((r) => r.ok).length, 5)
  })

  it("memory fallback uses the same fixed-duration window", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    process.env.NODE_ENV = "development"
    mock.timers.enable({ apis: ["Date"], now: 0 })
    const results = await hits("v4:8.8.8.8", 6)
    assert.equal(results[5].ok, false)
    assert.equal(results[5].retryAfterSeconds, 600)
    mock.timers.tick(300_000)
    const mid = await checkRateLimit("v4:8.8.8.8")
    assert.equal(mid.ok, false)
    assert.equal(mid.retryAfterSeconds, 300)
    mock.timers.tick(301_000)
    assert.equal((await checkRateLimit("v4:8.8.8.8")).ok, true)
  })
})
