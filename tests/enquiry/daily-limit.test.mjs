// Daily site-wide cap, against the JavaScript model of Upstash (tests/helpers/fake-upstash.mjs) and the in-memory
// fallback. The Lua itself is proven on a real redis-server in daily-limit.redis.test.mjs.
import assert from "node:assert/strict"
import { afterEach, after, before, beforeEach, describe, it } from "node:test"
import { startFakeUpstash } from "../helpers/fake-upstash.mjs"
import { isolateEnv, pointAtFakeUpstash } from "../helpers/env.mjs"

const { ADMIT_SCRIPT, checkGlobalRateLimit, checkClientRateLimit, getRateLimitConfig, resetMemoryRateLimit } = await import("@/lib/enquiry/rate-limit")

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
})
afterEach(() => restoreEnv())

describe("settings", () => {
  it("defaults: 30 per hour, 80 per day, 86400 s daily window", () => {
    assert.deepEqual(
      (({ globalLimit, globalWindowSeconds, dailyLimit, dailyWindowSeconds }) => ({ globalLimit, globalWindowSeconds, dailyLimit, dailyWindowSeconds }))(getRateLimitConfig()),
      { globalLimit: 30, globalWindowSeconds: 3600, dailyLimit: 80, dailyWindowSeconds: 86_400 },
    )
  })

  it("valid values are read; invalid, empty, fractional, negative, zero and out-of-range values fall back to the defaults", () => {
    process.env.ENQUIRY_DAILY_LIMIT = "50"
    process.env.ENQUIRY_DAILY_WINDOW_SECONDS = "43200"
    assert.equal(getRateLimitConfig().dailyLimit, 50)
    assert.equal(getRateLimitConfig().dailyWindowSeconds, 43_200)
    for (const bad of ["", "abc", "1.5", "-3", "0", "100001", "1e3", " "]) {
      process.env.ENQUIRY_DAILY_LIMIT = bad
      assert.equal(getRateLimitConfig().dailyLimit, 80, `ENQUIRY_DAILY_LIMIT=${JSON.stringify(bad)}`)
    }
    for (const bad of ["", "abc", "59", "86401", "-1", "0"]) {
      process.env.ENQUIRY_DAILY_WINDOW_SECONDS = bad
      assert.equal(getRateLimitConfig().dailyWindowSeconds, 86_400, `ENQUIRY_DAILY_WINDOW_SECONDS=${JSON.stringify(bad)}`)
    }
  })
})

describe("one atomic script per admission (Upstash path)", () => {
  beforeEach(() => pointAtFakeUpstash(fake))

  it("the site-wide charge is ONE transaction holding ONE EVAL of ADMIT_SCRIPT over both keys (no separate INCRs)", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "7"
    assert.equal((await checkGlobalRateLimit()).ok, true)
    assert.equal(fake.transactions.length, 1)
    assert.equal(fake.transactions[0].length, 1)
    assert.deepEqual(fake.transactions[0][0], ["EVAL", ADMIT_SCRIPT, 2, "enquiry:rl:global", "enquiry:rl:global:day", 30, 3600, 7, 86_400])
  })

  it("daily limit N+1 refused with scope daily; neither counter moves on refusal; Retry-After counts down", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "3"
    for (let i = 0; i < 3; i++) assert.equal((await checkGlobalRateLimit()).ok, true)
    fake.advance(1000)
    const r = await checkGlobalRateLimit()
    assert.deepEqual([r.ok, r.reason, r.scope, r.retryAfterSeconds], [false, "limited", "daily", 85_400])
    assert.equal(fake.store.get("enquiry:rl:global").value, 3)
    assert.equal(fake.store.get("enquiry:rl:global:day").value, 3)
  })

  it("hourly refusal leaves the daily counter alone; after the hour the next request is admitted and the daily count carries on", async () => {
    process.env.ENQUIRY_GLOBAL_LIMIT = "2"
    await checkGlobalRateLimit()
    await checkGlobalRateLimit()
    assert.deepEqual(await checkGlobalRateLimit(), { ok: false, reason: "limited", scope: "global", retryAfterSeconds: 3600 })
    assert.equal(fake.store.get("enquiry:rl:global:day").value, 2)
    fake.advance(3601)
    assert.equal((await checkGlobalRateLimit()).ok, true)
    assert.equal(fake.store.get("enquiry:rl:global:day").value, 3)
  })

  it("daily window is fixed: it expires 86400 s after the first admitted request and is not extended by later ones", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "1"
    process.env.ENQUIRY_GLOBAL_LIMIT = "100"
    await checkGlobalRateLimit()
    fake.advance(80_000)
    assert.equal((await checkGlobalRateLimit()).retryAfterSeconds, 6400)
    fake.advance(6401)
    assert.equal((await checkGlobalRateLimit()).ok, true)
  })

  it("concurrent burst of N+10 admits exactly N", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "9"
    const results = await Promise.all(Array.from({ length: 19 }, () => checkGlobalRateLimit()))
    assert.equal(results.filter((r) => r.ok).length, 9)
    assert.equal(fake.store.get("enquiry:rl:global:day").value, 9)
  })

  it("fails closed on every kind of outage: nothing is admitted", async () => {
    for (const mode of ["http500", "garbage", "cmderr"]) {
      fake.mode = mode
      assert.deepEqual(await checkGlobalRateLimit(), { ok: false, reason: "unavailable" }, mode)
    }
    fake.mode = "ok"
    fake.failIf = (cmds) => cmds.some((c) => c[1] === ADMIT_SCRIPT)
    assert.deepEqual(await checkGlobalRateLimit(), { ok: false, reason: "unavailable" })
  })

  it("trusted-client lockout peek covers the daily cap in one read-only transaction", async () => {
    process.env.ENQUIRY_DAILY_LIMIT = "1"
    await checkGlobalRateLimit()
    fake.transactions.length = 0
    const r = await checkClientRateLimit("v4:198.51.100.2")
    assert.deepEqual([r.ok, r.scope], [false, "daily"])
    assert.equal(fake.transactions.length, 1)
    assert.ok(fake.transactions[0].every((c) => c[0] === "GET" || c[0] === "PTTL"))
  })
})

describe("in-memory fallback (development and test mode) follows the same rules", () => {
  it("daily cap, all-or-nothing counting, and a longer-wait Retry-After", async () => {
    process.env.NODE_ENV = "development"
    process.env.ENQUIRY_DAILY_LIMIT = "2"
    process.env.ENQUIRY_GLOBAL_LIMIT = "5"
    assert.equal((await checkGlobalRateLimit()).ok, true)
    assert.equal((await checkGlobalRateLimit()).ok, true)
    const r = await checkGlobalRateLimit()
    assert.deepEqual([r.ok, r.scope], [false, "daily"])
    assert.ok(r.retryAfterSeconds > 86_390)
  })
})
