// The Upstash smoke script is manual-only. These tests prove it refuses by default and touches no
// network then, that it uses the production Lua script and only throwaway key names, and that its
// checks pass against the local fake (which models the same script). No real Upstash is contacted.
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import http from "node:http"
import { readFileSync } from "node:fs"
import { after, before, beforeEach, describe, it } from "node:test"
import { startFakeUpstash } from "../helpers/fake-upstash.mjs"

const SCRIPT = new URL("../../scripts/enquiry/upstash-smoke.mjs", import.meta.url).pathname
const { FINALIZE_SCRIPT } = await import("@/lib/enquiry/dedup")

let hits
let sink
before(async () => {
  hits = []
  sink = http.createServer((req, res) => {
    hits.push(req.url)
    res.end("{}")
  })
  await new Promise((r) => sink.listen(0, "127.0.0.1", r))
})
after(() => sink.close())
beforeEach(() => {
  hits.length = 0
})

// Asynchronous on purpose: the local fake server lives in this process and must keep answering.
const runScript = (env) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT], { env: { PATH: process.env.PATH, ...env }, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    child.stdout.on("data", (c) => (stdout += c))
    const timer = setTimeout(() => child.kill(), 30_000)
    child.on("close", (status) => {
      clearTimeout(timer)
      resolve({ status, stdout })
    })
  })
const sinkUrl = () => `http://127.0.0.1:${sink.address().port}`

describe("upstash smoke script refuses by default", () => {
  it("without the confirmation variable: exit 2, refusal message, no network, even with credentials set", async () => {
    const r = await runScript({ UPSTASH_REDIS_REST_URL: sinkUrl(), UPSTASH_REDIS_REST_TOKEN: "tok_SECRET" })
    assert.equal(r.status, 2)
    assert.match(r.stdout, /REFUSED/)
    assert.equal(hits.length, 0)
    assert.equal(r.stdout.includes("tok_SECRET"), false)
    assert.equal(r.stdout.includes(sinkUrl()), false)
  })

  it("any value other than exactly 'confirm' refuses", async () => {
    for (const v of ["", "true", "1", "CONFIRM", "confirm "]) {
      const r = await runScript({ ENQUIRY_UPSTASH_SMOKE: v, UPSTASH_REDIS_REST_URL: sinkUrl(), UPSTASH_REDIS_REST_TOKEN: "t" })
      assert.equal(r.status, 2, JSON.stringify(v))
    }
    assert.equal(hits.length, 0)
  })

  it("confirmed but with missing credentials: refuses without contacting anything", async () => {
    for (const env of [{}, { UPSTASH_REDIS_REST_URL: sinkUrl() }, { UPSTASH_REDIS_REST_TOKEN: "t" }]) {
      const r = await runScript({ ENQUIRY_UPSTASH_SMOKE: "confirm", ...env })
      assert.equal(r.status, 2)
      assert.match(r.stdout, /REFUSED/)
    }
    assert.equal(hits.length, 0)
  })

  it("is not matched by the test glob (lives under scripts/, not named *.test.mjs)", () => {
    assert.equal(/\.test\.mjs$/.test(SCRIPT), false)
    assert.match(SCRIPT, /\/scripts\/enquiry\//)
  })
})

describe("upstash smoke script design", () => {
  it("reads the production finalize script rather than a copy", async () => {
    const { loadFinalizeScript } = await import("../../scripts/enquiry/upstash-smoke.mjs")
    assert.equal(loadFinalizeScript(), FINALIZE_SCRIPT)
  })

  it("never names production key spaces and prints neither URL nor token", () => {
    const src = readFileSync(SCRIPT, "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")
    // Outside comments, the only mentions of the production prefixes are the forbidden-prefix guard itself.
    const uses = src.match(/enquiry:(rl|dd):/g) ?? []
    assert.equal(uses.length, 2)
    assert.match(src, /FORBIDDEN_PREFIXES = \["enquiry:rl:", "enquiry:dd:"\]/)
    assert.equal(/out\([^)]*\b(url|token)\b/.test(src), false)
  })
})

describe("upstash smoke script against the local fake (a model, not the real service)", () => {
  let fake
  before(async () => {
    fake = await startFakeUpstash()
  })
  after(() => fake.close())

  it("passes every check, uses only throwaway keys, and leaves nothing behind", async () => {
    fake.reset()
    const r = await runScript({ ENQUIRY_UPSTASH_SMOKE: "confirm", UPSTASH_REDIS_REST_URL: fake.url, UPSTASH_REDIS_REST_TOKEN: fake.token })
    assert.equal(r.status, 0, r.stdout)
    assert.match(r.stdout, /RESULT: PASS/)
    assert.equal(/FAIL/.test(r.stdout), false)
    assert.equal(r.stdout.includes(fake.token), false)
    assert.equal(r.stdout.includes(fake.url), false)
    assert.equal(r.stdout.includes("enquiry-smoke"), false, "key names are not printed")
    const keys = new Set()
    for (const tx of fake.transactions) for (const c of tx) if (c[0] !== "EVAL") keys.add(String(c[1]))
    for (const tx of fake.transactions) for (const c of tx) if (c[0] === "EVAL") {
      keys.add(String(c[3]))
      keys.add(String(c[4]))
    }
    assert.ok(keys.size > 0)
    for (const k of keys) {
      assert.match(k, /^enquiry-smoke:[0-9a-f]{16}:/)
      assert.equal(k.startsWith("enquiry:rl:") || k.startsWith("enquiry:dd:"), false)
    }
    assert.equal(fake.store.size, 0, "all throwaway keys were removed")
    // Every write carries a short TTL.
    for (const tx of fake.transactions) for (const c of tx) if (c[0] === "SET") assert.equal(Number(c[3 + 1]), 20)
  })

  it("reports FAIL (exit 1) when the service misbehaves", async () => {
    fake.reset()
    fake.mode = "http500"
    const r = await runScript({ ENQUIRY_UPSTASH_SMOKE: "confirm", UPSTASH_REDIS_REST_URL: fake.url, UPSTASH_REDIS_REST_TOKEN: fake.token })
    assert.equal(r.status, 1)
    assert.match(r.stdout, /RESULT: FAIL/)
    fake.reset()
  })
})
