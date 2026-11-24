import assert from "node:assert/strict"
import { afterEach, after, before, beforeEach, describe, it, mock } from "node:test"
import { createHash } from "node:crypto"
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
// The same enquiry as VALID after normalisation, for calling the dedup module directly.
const ENQ = { name: "Jane Wanjiru", phone: "+254712345678", email: "jane@example.com", service: "manned-guarding", county: "Nairobi", town: "Thome", details: "We need guards for a warehouse site." }

let fake
let restoreEnv
let resendCalls
let gates
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
  gates = []
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url
    if (!url.includes("api.resend.com")) return realFetch(input, init)
    resendCalls.push({ url, init })
    // Every Resend call waits until the test settles it, so the test controls the order of events.
    return new Promise((resolve, reject) => gates.push({ resolve, reject }))
  }
  mock.method(console, "info", () => {})
})
afterEach(() => {
  globalThis.fetch = realFetch
  mock.restoreAll()
  mock.timers.reset()
  restoreEnv()
})

const post = (body = VALID, headers = {}) =>
  route.POST(
    new Request(URL_, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }),
  )
const liveEnv = () => {
  pointAtFakeUpstash(fake)
  process.env.ENQUIRY_DELIVERY = "live"
  process.env.RESEND_API_KEY = "re_test"
  process.env.ENQUIRY_FROM = "enquiries@example.test"
  process.env.ENQUIRY_TO = "inbox@example.test"
}
const accept = (i, id = `email_${i}`) => gates[i].resolve(new Response(JSON.stringify({ id }), { status: 200 }))
const refuse = (i) => gates[i].resolve(new Response("{}", { status: 422 }))
const unsure = (i) => gates[i].resolve(new Response("{}", { status: 500 }))
// Only the dedup finalize script; the site-wide ADMIT_SCRIPT is also an EVAL and must keep working.
const isFinalizeEval = (c) => c[0] === "EVAL" && c[1] === dedup.FINALIZE_SCRIPT
const keys = (kind) => [...fake.store.keys()].filter((k) => k.startsWith(`enquiry:dd:${kind}:`))
const lockValue = () => fake.store.get(keys("l")[0])?.value
const stateValue = () => fake.store.get(keys("s")[0])?.value
const waitFor = async (fn) => {
  for (let i = 0; i < 400; i++) {
    if (fn()) return
    await new Promise((r) => setTimeout(r, 5))
  }
  throw new Error("timed out waiting for condition")
}

describe("owner tokens", () => {
  it("every claim gets its own unguessable token, stored as the lock value", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    assert.equal(a.kind, "proceed")
    assert.match(a.handle.token, /^o[0-9a-f]{32}$/)
    assert.equal(lockValue(), a.handle.token)
    fake.advance(31)
    const b = await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB")
    assert.notEqual(b.handle.token, a.handle.token)
    assert.equal(lockValue(), b.handle.token)
  })

  it("the original owner records its result and releases its own lock normally", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    assert.equal(await dedup.finishDedup(a.handle, "sent", a.ref), "owner")
    assert.equal(keys("l").length, 0)
    assert.equal(stateValue(), "sent:JS-20260101-AAAAAA")
    // And the window is respected afterwards.
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-ZZZZZZ"), { kind: "duplicate", ref: "JS-20260101-AAAAAA" })
  })

  it("a refusal by the owner releases the lock and records nothing", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    assert.equal(await dedup.finishDedup(a.handle, "failed", a.ref), "owner")
    assert.equal(keys("l").length + keys("s").length, 0)
  })
})

describe("an expired lock cannot be released by its former owner", () => {
  it("the late finish reports lock_lost and leaves the new owner's lock in place", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    fake.advance(31) // A's lock expired while A is still running
    const b = await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB")
    assert.equal(b.kind, "proceed")

    assert.equal(await dedup.finishDedup(a.handle, "failed", a.ref), "lock_lost")
    assert.equal(lockValue(), b.handle.token, "B's lock must survive A's late release")
  })

  it("the new owner stays protected: a third request is told 'in progress', not allowed to send", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    fake.advance(31)
    const b = await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB")
    await dedup.finishDedup(a.handle, "failed", a.ref)
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-CCCCCC"), { kind: "in_progress" })

    assert.equal(await dedup.finishDedup(b.handle, "sent", b.ref), "owner")
    assert.equal(keys("l").length, 0)
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-DDDDDD"), { kind: "duplicate", ref: b.ref })
  })

  it("a late 'sent' from the former owner is still recorded (the email went out) without touching B's lock", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    fake.advance(31)
    const b = await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB")
    assert.equal(await dedup.finishDedup(a.handle, "sent", a.ref), "lock_lost")
    assert.equal(stateValue(), `sent:${a.ref}`)
    assert.equal(lockValue(), b.handle.token)
    // B is still in flight, but a fresh identical request now sees the settled result.
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-CCCCCC"), { kind: "duplicate", ref: a.ref })
    // The duplicate path must not have released B's lock either.
    assert.equal(lockValue(), b.handle.token)
  })

  it("the duplicate path releases only a lock it took itself", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    await dedup.finishDedup(a.handle, "sent", a.ref)
    fake.advance(1)
    // A holds nothing now. Plant a foreign lock to prove the duplicate path cannot delete it.
    fake.store.set(keys("s")[0].replace(":s:", ":l:"), { value: "oSOMEONEELSE", expiresAt: fake.nowMs + 30_000 })
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB"), { kind: "duplicate", ref: a.ref })
    assert.equal(lockValue(), "oSOMEONEELSE")
  })

  it("the duplicate path's own release cannot delete a newer owner's lock, even if its lock expired in between", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    await dedup.finishDedup(a.handle, "sent", a.ref)
    // A later identical request takes a lock, finds "sent", and goes to release it. Stage the race: just
    // before that release runs, its lock expires and another request takes the lock.
    fake.beforeTx = (cmds) => {
      if (!cmds.some((c) => c[0] === "EVAL")) return
      fake.beforeTx = null
      fake.advance(31)
      fake.store.set(keys("s")[0].replace(":s:", ":l:"), { value: "oNEWOWNER", expiresAt: fake.nowMs + 30_000 })
    }
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB"), { kind: "duplicate", ref: a.ref })
    assert.equal(lockValue(), "oNEWOWNER", "the newer owner's lock must survive the duplicate path's release")
  })

  it("a settled result is never downgraded or replaced by a late finisher", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    fake.advance(31)
    const b = await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB")
    await dedup.finishDedup(b.handle, "sent", b.ref)
    await dedup.finishDedup(a.handle, "unsure", a.ref) // late, uncertain
    assert.equal(stateValue(), `sent:${b.ref}`)
    await dedup.finishDedup(a.handle, "sent", a.ref) // late, also sent: first settled ref stays
    assert.equal(stateValue(), `sent:${b.ref}`)
  })

  it("'unsure' neither replaces an existing 'unsure' nor a 'sent'; 'sent' upgrades 'unsure'", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    await dedup.finishDedup(a.handle, "unsure", a.ref)
    assert.equal(stateValue(), `unsure:${a.ref}`)
    const b = await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB")
    assert.equal(b.ref, a.ref, "a retry reuses the uncertain attempt's ref")
    await dedup.finishDedup(b.handle, "unsure", "JS-20260101-OTHER1")
    assert.equal(stateValue(), `unsure:${a.ref}`)
    const c = await dedup.beginDedup(ENQ, "JS-20260101-CCCCCC")
    await dedup.finishDedup(c.handle, "sent", c.ref)
    assert.equal(stateValue(), `sent:${a.ref}`)
  })
})

describe("concurrent submissions", () => {
  it("six simultaneous claims: exactly one proceeds, the rest are in progress", async () => {
    liveEnv()
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => dedup.beginDedup(ENQ, `JS-20260101-AAAA0${i}`)))
    assert.equal(results.filter((r) => r.kind === "proceed").length, 1)
    assert.equal(results.filter((r) => r.kind === "in_progress").length, 5)
    const winner = results.find((r) => r.kind === "proceed")
    assert.equal(lockValue(), winner.handle.token)
  })

  it("simultaneous claims for DIFFERENT enquiries do not interfere", async () => {
    liveEnv()
    const results = await Promise.all(
      ["one", "two", "three"].map((x) => dedup.beginDedup({ ...ENQ, details: `Different request ${x} for us.` }, `JS-20260101-${x.toUpperCase().padEnd(6, "X").slice(0, 6)}`)),
    )
    assert.deepEqual(results.map((r) => r.kind), ["proceed", "proceed", "proceed"])
    assert.equal(new Set(results.map((r) => r.handle.token)).size, 3)
  })
})

describe("delayed, overlapping requests over HTTP", () => {
  it("slow request A is refused AFTER B took over: B keeps its lock, C is told 'in progress'", async () => {
    liveEnv()
    const a = post()
    await waitFor(() => resendCalls.length === 1)
    fake.advance(31)
    const b = post()
    await waitFor(() => resendCalls.length === 2) // B proceeded because A's lock expired

    refuse(0) // A comes back late with a refusal and tries to release
    assert.equal((await a).status, 502)
    const c = await post()
    assert.equal(c.status, 409, "C must not be allowed to send while B is still in flight")
    assert.equal(resendCalls.length, 2)

    accept(1)
    const bRes = await b
    assert.equal(bRes.status, 200)
    assert.equal(keys("l").length, 0)
  })

  it("slow request A succeeds AFTER B took over: the result is recorded once and later repeats send nothing", async () => {
    liveEnv()
    const a = post()
    await waitFor(() => resendCalls.length === 1)
    fake.advance(31)
    const b = post()
    await waitFor(() => resendCalls.length === 2)

    accept(0)
    const aBody = await (await a).json()
    assert.equal(aBody.state, "accepted")
    accept(1)
    const bBody = await (await b).json()
    assert.equal(bBody.state, "accepted")

    // Documented residual risk: both attempts really sent. The record keeps the first settled ref.
    assert.equal(resendCalls.length, 2)
    const later = await (await post()).json()
    assert.deepEqual(later, { ok: true, ref: aBody.ref, state: "accepted", duplicate: true })
    assert.equal(resendCalls.length, 2)
  })

  it("a late uncertain result from A cannot downgrade B's confirmed success", async () => {
    liveEnv()
    const a = post()
    await waitFor(() => resendCalls.length === 1)
    fake.advance(31)
    const b = post()
    await waitFor(() => resendCalls.length === 2)
    accept(1)
    const bBody = await (await b).json()
    unsure(0)
    const aRes = await a
    assert.equal(aRes.status, 202) // A truthfully does not know
    assert.equal(stateValue(), `sent:${bBody.ref}`)
    assert.equal((await (await post()).json()).duplicate, true)
  })
})

describe("Redis failures during finalization", () => {
  it("provider success followed by a Redis failure: the visitor is told the truth (sent), the failure is logged, and the lock holds for 30 s", async () => {
    liveEnv()
    const logged = []
    mock.restoreAll()
    mock.method(console, "info", (line) => logged.push(String(line)))
    fake.failIf = (cmds) => cmds.some(isFinalizeEval)

    const first = post()
    await waitFor(() => resendCalls.length === 1)
    accept(0)
    const res = await first
    assert.equal(res.status, 200)
    assert.equal((await res.json()).state, "accepted")
    assert.ok(logged.some((l) => l.includes("dedup_record_failed")))
    assert.equal(logged.join("\n").toLowerCase().includes("jane"), false)

    // Nothing was recorded, but the lock is still held, so an immediate retry cannot send a second email.
    assert.equal(keys("s").length, 0)
    fake.failIf = null
    assert.equal((await post()).status, 409)
    assert.equal(resendCalls.length, 1)

    // Documented residual risk: once the lock expires an identical retry is treated as new.
    fake.advance(31)
    const retry = post()
    await waitFor(() => resendCalls.length === 2)
    accept(1)
    assert.equal((await retry).status, 200)
  })

  it("an uncertain result followed by a Redis failure is still reported as uncertain, never as success", async () => {
    liveEnv()
    fake.failIf = (cmds) => cmds.some(isFinalizeEval)
    const p = post()
    await waitFor(() => resendCalls.length === 1)
    unsure(0)
    const res = await p
    assert.equal(res.status, 202)
    assert.equal((await res.json()).code, "delivery_uncertain")
  })

  it("a refusal followed by a Redis failure is still reported as a refusal and the lock expires on its own", async () => {
    liveEnv()
    fake.failIf = (cmds) => cmds.some(isFinalizeEval)
    const p = post()
    await waitFor(() => resendCalls.length === 1)
    refuse(0)
    assert.equal((await p).status, 502)
    fake.failIf = null
    // The un-released lock still blocks for its 30 s, then frees itself and a fresh claim succeeds.
    assert.equal((await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")).kind, "in_progress")
    fake.advance(31)
    assert.equal((await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB")).kind, "proceed")
  })

  it("finishDedup reports 'error' when Redis fails and never throws", async () => {
    liveEnv()
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    fake.failIf = (cmds) => cmds.some(isFinalizeEval)
    assert.equal(await dedup.finishDedup(a.handle, "sent", a.ref), "error")
    fake.failIf = null
    fake.mode = "garbage"
    assert.equal(await dedup.finishDedup(a.handle, "sent", a.ref), "error")
  })

  it("a failing claim still fails closed with nothing sent (unchanged)", async () => {
    liveEnv()
    fake.failIf = (cmds) => cmds.some((c) => c[0] === "SET" && String(c[1]).startsWith("enquiry:dd:l:"))
    assert.equal((await post()).status, 503)
    assert.equal(resendCalls.length, 0)
  })
})

describe("retry after uncertain delivery", () => {
  it("the retry reuses the ref and Idempotency-Key and settles the state as sent", async () => {
    liveEnv()
    const first = post()
    await waitFor(() => resendCalls.length === 1)
    unsure(0)
    const firstBody = await (await first).json()
    assert.equal(firstBody.code, "delivery_uncertain")
    assert.equal(keys("l").length, 0)

    const retry = post()
    await waitFor(() => resendCalls.length === 2)
    accept(1)
    const body = await (await retry).json()
    assert.equal(body.ref, firstBody.ref)
    assert.equal(resendCalls[1].init.headers["Idempotency-Key"], resendCalls[0].init.headers["Idempotency-Key"])
    assert.equal(stateValue(), `sent:${firstBody.ref}`)
  })
})

describe("interaction with rate limits and test mode", () => {
  it("finalizing (including a lost lock) never changes the rate-limit counters", async () => {
    liveEnv()
    const a = post()
    await waitFor(() => resendCalls.length === 1)
    fake.advance(31)
    const b = post()
    await waitFor(() => resendCalls.length === 2)
    unsure(0)
    accept(1)
    await Promise.all([a, b])
    assert.equal(fake.store.get("enquiry:rl:global").value, 2, "one count per request, none added by finalizing")
  })

  it("a request refused by the site-wide cap sends nothing, and releases its dedup lock without recording a state", async () => {
    liveEnv()
    process.env.ENQUIRY_GLOBAL_LIMIT = "1"
    const a = post()
    await waitFor(() => resendCalls.length === 1)
    accept(0)
    await a
    const other = { ...VALID, details: "A different enquiry, so it is not a duplicate of the first one." }
    const res = await post(other)
    assert.equal(res.status, 429)
    assert.equal(resendCalls.length, 1)
    // The refused request claimed and then released its lock (finalize with "record nothing").
    assert.equal(keys("l").length, 0, "no lock left behind by the refused request")
    assert.equal(keys("s").length, 1, "only the first enquiry has a recorded state")
    // So an immediate retry of the refused enquiry is not blocked as in-progress: it gets 429 again, not 409.
    assert.equal((await post(other)).status, 429)
  })

  it("test mode never claims, finalizes (EVAL), or contacts Resend", async () => {
    pointAtFakeUpstash(fake)
    process.env.ENQUIRY_DELIVERY = "test"
    process.env.ENQUIRY_ALLOW_PRODUCTION_TEST = "true"
    process.env.RESEND_API_KEY = "re_test"
    process.env.ENQUIRY_FROM = "enquiries@example.test"
    process.env.ENQUIRY_TO = "inbox@example.test"
    for (let i = 0; i < 3; i++) assert.equal((await post()).status, 200)
    assert.equal(resendCalls.length, 0)
    assert.equal(fake.transactions.some((t) => t.some((c) => isFinalizeEval(c) || String(c[1]).startsWith("enquiry:dd:"))), false)
  })
})

describe("in-memory fallback applies the same ownership rules (development only)", () => {
  it("an expired lock cannot be released by its former owner", async () => {
    mock.timers.enable({ apis: ["Date"] })
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    assert.equal(a.kind, "proceed")
    mock.timers.tick(31_000)
    const b = await dedup.beginDedup(ENQ, "JS-20260101-BBBBBB")
    assert.equal(b.kind, "proceed")
    assert.equal(await dedup.finishDedup(a.handle, "failed", a.ref), "lock_lost")
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-CCCCCC"), { kind: "in_progress" })
    assert.equal(await dedup.finishDedup(b.handle, "sent", b.ref), "owner")
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-DDDDDD"), { kind: "duplicate", ref: b.ref })
  })

  it("monotonic state rules match the Redis script", async () => {
    const a = await dedup.beginDedup(ENQ, "JS-20260101-AAAAAA")
    await dedup.finishDedup(a.handle, "sent", a.ref)
    const b = { ...a.handle, token: "oOTHER" }
    await dedup.finishDedup(b, "unsure", "JS-20260101-OTHER1")
    assert.deepEqual(await dedup.beginDedup(ENQ, "JS-20260101-ZZZZZZ"), { kind: "duplicate", ref: a.ref })
  })
})

describe("script pin", () => {
  it("the Lua script is the one that was verified on a real Redis; changing it requires re-running that check", () => {
    // If you change FINALIZE_SCRIPT, run tests/enquiry/finalize-script.redis.test.mjs against a real
    // redis-server (it runs automatically when one is installed), then update this hash.
    const hash = createHash("sha256").update(dedup.FINALIZE_SCRIPT).digest("hex").slice(0, 16)
    assert.equal(hash, "c911fcb97a84f447")
  })
})
