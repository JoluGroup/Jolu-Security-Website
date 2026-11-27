#!/usr/bin/env node
// Upstash finalize-step smoke test. MANUAL ONLY. Refuses to run unless explicitly confirmed.
//
//   ENQUIRY_UPSTASH_SMOKE=confirm UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... \
//     node scripts/enquiry/upstash-smoke.mjs
//
// It exercises the SAME request shape and the SAME Lua script (read from lib/enquiry/dedup.ts, not copied)
// that production uses: one POST /multi-exec per step, with SET ... EX ... NX + GET to claim, and
// EVAL <FINALIZE_SCRIPT> to record the result and release the lock. It only touches throwaway keys under a
// unique "enquiry-smoke:" prefix (never enquiry:rl:* or enquiry:dd:*), each with a short TTL, and deletes
// them when done. Output: pass/fail per check and a final verdict. It never prints the URL, the token or
// any key name. See docs/enquiry/upstash-smoke-test.md. It is not part of `pnpm test`.
import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const SMOKE_TTL_SECONDS = 20
const FORBIDDEN_PREFIXES = ["enquiry:rl:", "enquiry:dd:"]

/** Reads the finalize script from the production source so the smoke test can never drift from it. */
export function loadFinalizeScript(path = fileURLToPath(new URL("../../lib/enquiry/dedup.ts", import.meta.url))) {
  const m = readFileSync(path, "utf8").match(/export const FINALIZE_SCRIPT = `([\s\S]*?)`/)
  if (!m) throw new Error("FINALIZE_SCRIPT not found")
  return m[1]
}

export async function run(env = process.env, out = (line) => console.log(line)) {
  if (env.ENQUIRY_UPSTASH_SMOKE !== "confirm") {
    out("REFUSED: set ENQUIRY_UPSTASH_SMOKE=confirm to run. Nothing was contacted.")
    return 2
  }
  const url = env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "")
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) {
    out("REFUSED: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set. Nothing was contacted.")
    return 2
  }
  const script = loadFinalizeScript()
  const prefix = `enquiry-smoke:${randomBytes(8).toString("hex")}`
  if (FORBIDDEN_PREFIXES.some((p) => prefix.startsWith(p))) throw new Error("unsafe prefix")

  // Same transport as lib/enquiry/rate-limit.ts upstashPost.
  const tx = async (commands) => {
    const res = await fetch(`${url}/multi-exec`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const results = await res.json()
    if (!Array.isArray(results) || results.length !== commands.length || results.some((r) => r?.error)) {
      throw new Error("unexpected transaction reply")
    }
    return results.map((r) => r.result)
  }

  const A = { lock: `${prefix}:a:l`, state: `${prefix}:a:s`, token: `o${randomBytes(16).toString("hex")}` }
  const B = { lock: `${prefix}:b:l`, state: `${prefix}:b:s`, token: `o${randomBytes(16).toString("hex")}` }
  const claim = (h) => tx([["SET", h.lock, h.token, "EX", SMOKE_TTL_SECONDS, "NX"], ["GET", h.state]])
  const finalize = async (h, value) =>
    (await tx([["EVAL", script, 2, h.lock, h.state, h.token, value, SMOKE_TTL_SECONDS]]))[0]
  const get = async (key) => (await tx([["GET", key]]))[0]
  const ttl = async (key) => Number((await tx([["PTTL", key]]))[0])

  let passed = 0
  let failed = 0
  const check = (name, ok) => {
    if (ok) passed++
    else failed++
    out(`${ok ? "PASS" : "FAIL"}  ${name}`)
  }
  const step = async (name, fn) => {
    try {
      check(name, Boolean(await fn()))
    } catch {
      check(`${name} (request failed)`, false)
    }
  }

  try {
    await step("claim: first claimant wins the lock, no prior state", async () => {
      const [set, state] = await claim(A)
      return set === "OK" && state === null
    })
    await step("claim: a second claimant is refused while the lock is held", async () => {
      const [set] = await claim({ ...A, token: "o-other" })
      return set === null
    })
    await step("lock and state keys carry a short TTL", async () => (await ttl(A.lock)) > 0 && (await ttl(A.lock)) <= SMOKE_TTL_SECONDS * 1000)
    await step("finalize sent as owner: returns 1, records state, releases the lock", async () => {
      const r = await finalize(A, "sent:JS-SMOKE-OK")
      const ttlMs = await ttl(A.state)
      return Number(r) === 1 && (await get(A.lock)) === null && (await get(A.state)) === "sent:JS-SMOKE-OK" && ttlMs > 0 && ttlMs <= SMOKE_TTL_SECONDS * 1000
    })
    await step("finalize as a non-owner (lock taken over): returns 0, the other owner's lock is untouched, state is not downgraded", async () => {
      await tx([["SET", A.lock, "o-newer-owner", "EX", SMOKE_TTL_SECONDS]])
      const r = await finalize(A, "unsure:JS-SMOKE-LATE")
      return Number(r) === 0 && (await get(A.lock)) === "o-newer-owner" && (await get(A.state)) === "sent:JS-SMOKE-OK"
    })
    await step("finalize 'unsure' records only when nothing is recorded, 'sent' then upgrades it, 'unsure' never downgrades", async () => {
      await claim(B)
      await finalize(B, "unsure:JS-SMOKE-U")
      const afterUnsure = await get(B.state)
      await tx([["SET", B.lock, B.token, "EX", SMOKE_TTL_SECONDS]])
      await finalize(B, "sent:JS-SMOKE-S")
      const afterSent = await get(B.state)
      await tx([["SET", B.lock, B.token, "EX", SMOKE_TTL_SECONDS]])
      await finalize(B, "unsure:JS-SMOKE-U2")
      return afterUnsure === "unsure:JS-SMOKE-U" && afterSent === "sent:JS-SMOKE-S" && (await get(B.state)) === "sent:JS-SMOKE-S"
    })
    await step("finalize with an empty value records nothing but still releases an owned lock", async () => {
      const C = { lock: `${prefix}:c:l`, state: `${prefix}:c:s`, token: `o${randomBytes(16).toString("hex")}` }
      await claim(C)
      const r = await finalize(C, "")
      const ok = Number(r) === 1 && (await get(C.lock)) === null && (await get(C.state)) === null
      await tx([["DEL", C.lock], ["DEL", C.state]])
      return ok
    })
  } finally {
    try {
      const keys = [A.lock, A.state, B.lock, B.state]
      await tx(keys.map((k) => ["DEL", k]))
      const left = await tx(keys.map((k) => ["GET", k]))
      check("cleanup: all throwaway keys removed", left.every((v) => v === null))
    } catch {
      check("cleanup: all throwaway keys removed (request failed; keys expire on their own within the TTL)", false)
    }
  }

  out(failed === 0 ? `RESULT: PASS (${passed} checks)` : `RESULT: FAIL (${failed} failed, ${passed} passed)`)
  return failed === 0 ? 0 : 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run().then(
    (code) => process.exit(code),
    () => {
      console.log("RESULT: ERROR (unexpected failure; details withheld)")
      process.exit(1)
    },
  )
}
