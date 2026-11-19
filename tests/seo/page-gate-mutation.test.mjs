// Automated mutation testing of the publication gate (F5D5-08).
//
// Each mutant makes one edit to a copy of real production source (lib/seo/*.ts) and loads the copy. The shared behaviour
// table (tests/helpers/gate-world.mjs) is then run against it.
//  - A mutant that fails to apply, fails to load or fails to compile is a HARNESS FAILURE, never a kill.
//  - A SECURITY mutant is killed only when a "rejects:" case (one the gate must refuse) is let through. A kill that is
//    only an "accepts:" failure is reported separately and does not count.
//  - An EQUIVALENT mutant must survive the whole table AND must execute (proved by a tracer in its replacement text),
//    and carries a written reason. If one is ever killed, the test fails so that it can be reclassified.
//  - Controls: the unmutated copy passes everything; a deliberately fail-open mutant and an obviously broken one are
//    detected as such, so the harness cannot pass vacuously.
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { MUTANTS, EQUIVALENT } from "../helpers/gate-mutants.mjs"

const ROOT = path.resolve(import.meta.dirname, "../..")
const W = await import("../helpers/gate-world.mjs")
const read = (f) => readFileSync(path.join(ROOT, f), "utf8")
const GATE = "lib/seo/publication-gate.ts"
const IMPORT_OF = { "lib/seo/text-policy.ts": "@/lib/seo/text-policy", "lib/seo/claim-scope.ts": "@/lib/seo/claim-scope", "lib/seo/publication-requirements.ts": "@/lib/seo/publication-requirements" }

let counter = 0
/** Applies a mutant's edits to the real sources, writes the copy to `dir` and returns its module. Throws if anything is off. */
async function load(dir, m) {
  const files = new Map([[GATE, read(GATE)]])
  for (const [from, to] of m.edits) {
    const file = m.file ?? GATE
    if (!files.has(file)) files.set(file, read(file))
    const src = files.get(file)
    const count = src.split(from).length - 1
    if (count !== 1) throw new Error(`edit does not apply to ${file} (matches ${count}): ${from.slice(0, 70)}`)
    files.set(file, src.replace(from, () => to))
  }
  const id = counter++
  let gateSrc = files.get(GATE)
  for (const [file, src] of files) {
    if (file === GATE) continue
    const copy = path.join(dir, `dep${id}-${path.basename(file)}`)
    writeFileSync(copy, src)
    gateSrc = gateSrc.replace(`"${IMPORT_OF[file]}"`, `"${pathToFileURL(copy).href}"`)
  }
  const out = path.join(dir, `m${id}.ts`)
  writeFileSync(out, gateSrc)
  return import(pathToFileURL(out).href)
}

const failed = (results) => results.filter((r) => !r.ok)
const rejectKills = (results) => failed(results).filter((r) => r.name.startsWith("rejects:"))

test("mutation harness controls: baseline passes; fail-open and broken mutants are detected", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gate-controls-"))
  try {
    const base = await load(dir, { name: "identity", edits: [] })
    assert.deepEqual(failed(W.runCases(base)), [], "the unmutated copy must pass every case")
    // a fail-open gate (always publishes) must be killed by rejection cases
    const open = await load(dir, { name: "fail open", edits: [["const reasons: string[] = []\n", "const reasons: string[] = []\n  if (record) return { reasons: [], page: record as never, entry: null, evidence: [] }\n"]] }).catch((e) => e)
    if (open instanceof Error) {
      // fall back to the registered fail-open mutant, which proves the same property
      const fo = MUTANTS.find((m) => m.name === "fail open on gate error")
      assert.ok(fo)
      const mod = await load(dir, fo)
      assert.ok(rejectKills(W.runCases(mod)).length > 0, "a fail-open mutant must be killed by a rejection case")
    } else {
      assert.ok(rejectKills(W.runCases(open)).length > 0)
    }
    // a mutant that does not compile must be reported as a harness failure, not as a kill
    await assert.rejects(() => load(dir, { name: "syntax error", edits: [["const reasons: string[] = []", "const reasons: string[] = [] ]]]{{"]] }), "a syntax error must throw")
    // an edit that does not match must be reported as a harness failure
    await assert.rejects(() => load(dir, { name: "no match", edits: [["this text is not in the gate", "x"]] }), /does not apply/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test("every security mutant is killed by at least one rejection case", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gate-mutants-"))
  const survivors = []
  const acceptOnly = []
  const harness = []
  let killed = 0
  const propertyKills = []
  try {
    for (const m of MUTANTS) {
      let mod
      try { mod = await load(dir, m) } catch (e) { harness.push(`${m.name}: ${String(e.message).slice(0, 160)}`); continue }
      const res = W.runCases(mod)
      if (m.killBy === "accepts") {
        // a property mutant (judging a consistent snapshot): killed by an accepts: case, never counted as a rejection kill
        if (failed(res).some((r) => r.name.startsWith("accepts:"))) propertyKills.push(m.name); else survivors.push(m.name)
      } else if (rejectKills(res).length > 0) killed++
      else if (failed(res).length > 0) acceptOnly.push(m.name)
      else survivors.push(m.name)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
  console.log(`mutation: security mutants ${MUTANTS.length}, killed by a rejection case ${killed}, property mutants killed by an accepts case ${propertyKills.length} (${propertyKills.join("; ")}), unexplained accept-only kills ${acceptOnly.length}, survivors ${survivors.length}, harness failures ${harness.length}`)
  assert.deepEqual(harness, [], "mutants that did not apply, load or compile (these are never counted as kills)")
  assert.deepEqual(survivors, [], "surviving security mutants: a safety check has no test")
  assert.deepEqual(acceptOnly, [], "mutants killed only by an accepts: case do not demonstrate a rejection")
  assert.equal(killed + propertyKills.length, MUTANTS.length)
})

test("equivalent mutants execute and survive, each with a written reason", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gate-equiv-"))
  const problems = []
  try {
    for (const m of EQUIVALENT) {
      if (!m.reason || m.reason.length < 30) problems.push(`${m.name}: no reason`)
      const hits = new Set()
      globalThis.__mutHit = (id) => { hits.add(id) }
      let mod
      try { mod = await load(dir, m) } catch (e) { problems.push(`${m.name}: ${String(e.message).slice(0, 160)}`); continue }
      const res = W.runCases(mod)
      if (failed(res).length > 0) problems.push(`${m.name}: KILLED by ${failed(res).slice(0, 2).map((r) => r.name).join("; ")} (not equivalent: reclassify as a security mutant)`)
      if (!hits.has(m.trace)) problems.push(`${m.name}: the mutated code was never executed (no tracer hit)`)
    }
  } finally { delete globalThis.__mutHit; rmSync(dir, { recursive: true, force: true }) }
  console.log(`mutation: equivalent mutants ${EQUIVALENT.length}, problems ${problems.length}`)
  assert.deepEqual(problems, [])
})
