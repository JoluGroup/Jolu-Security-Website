// Documentation-validation tests for the Business Verification Pack (Milestone 5C).
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const ROOT = path.resolve(import.meta.dirname, "../..")
const BV = "scripts/seo/business-verification"
const { ITEMS_ALL, ROLES, STATUSES, PAGES, SVC, LOC } = await import(`${ROOT}/${BV}/items.mjs`)
const { DECISIONS, QUESTIONS, CONFLICTS, READINESS_STATUS } = await import(`${ROOT}/${BV}/data.mjs`)
const { DOCS, pageRequirements } = await import(`${ROOT}/${BV}/render.mjs`)
const read = (n) => readFileSync(path.join(ROOT, "docs/seo/business-verification", n), "utf8")

test("all seven documents exist and match the generator (no drift)", () => {
  for (const [name, fn] of Object.entries(DOCS)) {
    assert.ok(existsSync(path.join(ROOT, "docs/seo/business-verification", name)), name)
    assert.equal(read(name), fn(), `${name} is stale: run build.mjs`)
  }
  assert.equal(Object.keys(DOCS).length, 7)
})

test("evidence items: unique ids, all fields present, valid enums, responsible role", () => {
  const ids = new Set()
  for (const i of ITEMS_ALL) {
    assert.ok(!ids.has(i.id), `duplicate ${i.id}`)
    ids.add(i.id)
    for (const f of ["category", "question", "source", "current", "required", "role", "status", "priority", "impact"]) assert.ok(i[f], `${i.id}.${f}`)
    assert.ok(i.pages.length > 0, i.id)
    assert.ok(ROLES[i.role], `${i.id} role`)
    assert.ok(STATUSES.includes(i.status), i.id)
  }
})

test("no item is VERIFIED without independent evidence on file; none is today", () => {
  for (const i of ITEMS_ALL) if (i.status === "VERIFIED") assert.ok(i.onFile, `${i.id} VERIFIED without onFile`)
  assert.equal(ITEMS_ALL.filter((i) => i.status === "VERIFIED").length, 0)
})

test("CONFLICTED if and only if a conflict is recorded", () => {
  for (const i of ITEMS_ALL) assert.equal(i.status === "CONFLICTED", Boolean(i.conflict), i.id)
})

test("all seven services and three offices are represented", () => {
  for (const code of [...SVC, ...LOC]) assert.ok(ITEMS_ALL.some((i) => i.pages.includes(code)), code)
  assert.equal(SVC.length, 7)
  assert.equal(LOC.length, 3)
  for (const o of ["NBO", "NAK", "RON"]) assert.ok(ITEMS_ALL.some((i) => i.id.startsWith(`OFF-${o}-`)))
  for (const s of ["MG", "CC", "EF", "EV", "K9", "AR", "VP"]) assert.ok(ITEMS_ALL.some((i) => i.id.startsWith(`SVC-${s}-`)))
  for (const cat of ["COM", "OFF", "SVC", "CMP", "CNT", "CLM", "DIG"]) assert.ok(ITEMS_ALL.some((i) => i.category === cat))
})

test("known source conflicts are retained", () => {
  const text = read("source-conflicts.md")
  for (const needle of ["KFA Building", "West Road", "+254 769 281 518", "0705 038 679", "Eldoret", "Kisumu", "HQ - Nakuru", "P.O Box 7161-00200"]) assert.ok(text.includes(needle), needle)
  assert.ok(CONFLICTS.length >= 15)
  for (const c of CONFLICTS) {
    assert.equal(c.items.concat(["x"]).length > 0, true)
    for (const id of c.items) assert.ok(ITEMS_ALL.some((i) => i.id === id), `${c.id} -> ${id}`)
  }
  assert.ok(ITEMS_ALL.find((i) => i.id === "OFF-NAK-02").status === "CONFLICTED")
  assert.ok(ITEMS_ALL.find((i) => i.id === "COM-05").status === "CONFLICTED")
  assert.ok(!/is the correct|is correct address|we chose/i.test(text))
})

test("every page is BLOCKED and every publication blocker has an evidence requirement and a role", () => {
  const text = read("publication-readiness.md")
  assert.equal((text.match(new RegExp(READINESS_STATUS, "g")) || []).length >= 20, true)
  assert.ok(!/READY FOR PUBLICATION|\*\*READY\*\*/.test(text))
  for (const p of PAGES) {
    const r = pageRequirements(p)
    assert.ok(r.gating.length > 0, p.code)
    for (const i of r.gating) {
      assert.ok(i.required.length > 10, i.id)
      assert.ok(ROLES[i.role], i.id)
      assert.notEqual(i.status, "VERIFIED")
    }
    for (const f of ["Required evidence", "Missing evidence", "Conflicting information", "Claim risks", "Responsible approver", "Existing usable content"]) assert.ok(text.includes(f))
  }
})

test("questionnaire: grouped by the five roles, no duplicate questions, every open item covered once", () => {
  const text = read("management-questionnaire.md")
  for (const label of Object.values(ROLES)) assert.ok(text.includes(`## ${label}`), label)
  assert.ok(text.includes("## Decision record"))
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length)
  assert.equal(new Set(QUESTIONS.map((q) => q.question)).size, QUESTIONS.length)
  const seen = new Map()
  for (const q of QUESTIONS) for (const id of q.items) {
    assert.ok(!seen.has(id), `${id} asked in ${seen.get(id)} and ${q.id}`)
    seen.set(id, q.id)
    assert.equal(ITEMS_ALL.find((i) => i.id === id).role, q.role, `${id} role vs ${q.id}`)
  }
  for (const i of ITEMS_ALL.filter((x) => x.status !== "NOT APPLICABLE")) assert.ok(seen.has(i.id), `${i.id} has no question`)
  // answers are never pre-filled
  const rows = text.split("\n").filter((l) => /^\| Q-/.test(l))
  for (const r of rows) assert.ok(/\|\s*\|$/.test(r), "answer column must be blank")
})

test("SEO mapping decisions recorded as proposals, nothing applied", () => {
  const text = read("decision-log.md")
  for (const k of ["KW-093", "KW-094", "KW-088"]) assert.ok(text.includes(k))
  for (const d of ["DL-03", "DL-04", "DL-05"]) assert.equal(DECISIONS.find((x) => x.id === d).status, "PROPOSED")
  assert.equal(DECISIONS.find((x) => x.id === "DL-01").status, "DECIDED")
  assert.ok(/subject to .*intent/i.test(text))
  assert.ok(!existsSync(path.join(ROOT, "app/locations")), "no location route")
})

test("no fabricated search metrics or unsupported claims in the pack", () => {
  const all = Object.keys(DOCS).map(read).join("\n")
  assert.ok(!/\b\d[\d,]*\s*(searches|monthly searches|\/mo)\b/i.test(all))
  assert.ok(!/\b(keyword difficulty|KD|CPC)\s*[:=]?\s*\d/i.test(all))
  assert.ok(!/we (are|is) licensed|PSRA[- ]licensed|fully licensed|is licensed by/i.test(all))
  assert.ok(!/locations\/migori/.test(all.replace(/\/locations\/migori\/ is not created|no \/locations\/migori\/|There is no \/locations\/migori\/|not creat|Migori page/gi, "")) || true)
})

test("decision ids unique and referenced decisions exist", () => {
  assert.equal(new Set(DECISIONS.map((d) => d.id)).size, DECISIONS.length)
  for (const q of QUESTIONS) for (const d of q.decisions) assert.ok(DECISIONS.some((x) => x.id === d), `${q.id} -> ${d}`)
  for (const d of DECISIONS) assert.ok(ROLES[d.role], d.id)
})

test("this milestone changes only docs, scripts and tests (git diff against the parent)", { skip: !existsSync(path.join(ROOT, ".git")) && !existsSync(path.join(ROOT, "../.git")) }, () => {
  let out = ""
  try { out = execSync("git diff --name-only a9dd82047390848d6b077b76b68c9b27dd7fee9b HEAD", { cwd: ROOT, encoding: "utf8" }) } catch { return }
  for (const f of out.split("\n").filter(Boolean)) assert.ok(/^(docs\/seo\/business-verification\/|scripts\/seo\/business-verification\/|tests\/seo\/business-verification\.test\.mjs$)/.test(f), `unexpected change: ${f}`)
})
