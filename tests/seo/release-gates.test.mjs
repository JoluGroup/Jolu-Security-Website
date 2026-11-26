// Release 04B lane C: the per-page requirements are split into a content evidence gate, a production release gate and a
// post-launch optimisation queue (lib/seo/release-gates.ts). These tests pin the split so marketing integrations can never
// again become a condition for publishing a page, while service-offering confirmation can never stop being one.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../..")
const RG = await import("@/lib/seo/release-gates")
const { REQUIRED_EVIDENCE, primaryEvidence } = await import("@/lib/seo/publication-requirements")
const { SERVICE_PAGE_RECORDS, LOCATION_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const gate = await import("@/lib/seo/publication-gate")
const W = await import("../helpers/gate-world.mjs")

// The per-page table as it stood at 9907837 (Release 04A), kept here as the historical record being reclassified.
const OLD_COMMON = ["COM-05", "CMP-07", "CNT-10", "CLM-10", "DIG-02", "DIG-03", "DIG-05", "DIG-08"]
const CODES = { "manned-guarding": "MG", "cctv-installation": "CC", "electric-fencing": "EF", "events-security": "EV", "k9-unit-services": "K9", "alarm-response": "AR", "vip-close-protection": "VP" }
const oldService = (code) => [...OLD_COMMON, `SVC-${code}-01`, `SVC-${code}-02`, `SVC-${code}-07`, "CMP-05", "CNT-01"]
const MOVED = ["CMP-07", "CLM-10", "DIG-02", "DIG-03", "DIG-05", "DIG-08"]
const allRequired = () => Object.values(REQUIRED_EVIDENCE).flat()

test("every requirement of the old per-service table has exactly one disposition", () => {
  for (const r of SERVICE_PAGE_RECORDS) {
    for (const id of oldService(CODES[r.slug])) {
      const kept = REQUIRED_EVIDENCE[r.publicPath].includes(id)
      const moved = Object.hasOwn(RG.RECLASSIFIED_EVIDENCE, id)
      assert.ok(kept !== moved, `${r.slug} ${id}: kept=${kept} moved=${moved}`)
    }
  }
  assert.deepEqual(Object.keys(RG.RECLASSIFIED_EVIDENCE).sort(), [...MOVED].sort())
})

test("marketing integrations are post-launch only and never a page requirement", () => {
  const post = RG.POST_LAUNCH_QUEUE.flatMap((p) => p.absorbs)
  assert.deepEqual(post.sort(), ["DIG-02", "DIG-03"])
  for (const id of post) assert.ok(!allRequired().includes(id), id)
  for (const title of ["Search Console", "Bing", "GA4", "AI visibility", "Directory", "Editorial", "backlink", "ranking"]) assert.ok(RG.POST_LAUNCH_QUEUE.some((p) => p.title.includes(title)), title)
})

test("deployment readiness is a production gate item, never a page requirement", () => {
  const prod = RG.PRODUCTION_RELEASE_GATE.flatMap((p) => p.absorbs)
  assert.deepEqual(prod.sort(), ["CLM-10", "CMP-07", "DIG-05", "DIG-08"])
  for (const id of prod) assert.ok(!allRequired().includes(id), id)
  const titles = RG.PRODUCTION_RELEASE_GATE.map((p) => p.title).join(" | ")
  for (const t of ["privacy notice", "Security verification", "Functional acceptance", "Commercial hosting", "enquiry delivery", "DNS rollback", "Repository governance", "Staff-asset privacy"]) assert.ok(titles.includes(t), t)
})

test("service-offering confirmation stays mandatory: SVC-xx-01, -02 and -07, legal confirmation and the approved description", () => {
  for (const r of SERVICE_PAGE_RECORDS) {
    const req = REQUIRED_EVIDENCE[r.publicPath]
    for (const id of [`SVC-${CODES[r.slug]}-01`, `SVC-${CODES[r.slug]}-02`, `SVC-${CODES[r.slug]}-07`, "CMP-05", "CNT-01", "COM-05", "CNT-10"]) assert.ok(req.includes(id), `${r.slug} ${id}`)
    assert.equal(primaryEvidence(r.publicPath), `SVC-${CODES[r.slug]}-01`)
  }
  for (const r of LOCATION_PAGE_RECORDS) assert.match(primaryEvidence(r.publicPath), /^OFF-(NBO|NAK|RON)-01$/)
  assert.equal(primaryEvidence("/services/unknown"), null)
})

test("proportionality: a page with real content evidence publishes WITHOUT any marketing or deployment item", () => {
  const w = W.world(W.SERVICE)
  for (const id of MOVED) assert.ok(!w.deps.ledger.some((e) => e.id === id), id)
  assert.deepEqual(gate.evaluatePublication(w.record, w.deps).reasons, [])
})

test("fail closed: without confirmation that the service is offered (SVC-MG-01), the page is refused", () => {
  const w = W.world(W.SERVICE)
  w.deps.ledger = w.deps.ledger.filter((e) => e.id !== "SVC-MG-01")
  const d = gate.evaluatePublication(w.record, w.deps)
  assert.equal(d.published, false)
  assert.ok(d.reasons.includes("evidence SVC-MG-01 is not in the ledger"), d.reasons.join("; "))
  const p = W.world(W.SERVICE)
  Object.assign(p.deps.ledger.find((e) => e.id === "SVC-MG-01"), { status: "PROVISIONAL" })
  assert.equal(gate.evaluatePublication(p.record, p.deps).published, false)
})

test("the production release gate blocks until every item is verified with a verifier, date and reference", () => {
  assert.equal(RG.PRODUCTION_RELEASE_GATE.length, 8)
  assert.ok(RG.PRODUCTION_RELEASE_GATE.every((p) => p.status === "PENDING" && p.verifiedBy === null && p.reference === null), "nothing is verified in the repository")
  assert.equal(RG.productionReleaseBlockers().length, 8)
  const done = RG.PRODUCTION_RELEASE_GATE.map((p) => ({ ...p, status: "VERIFIED", verifiedBy: "Test Verifier", verifiedOn: "2026-11-26", reference: "TEST-1" }))
  assert.deepEqual(RG.productionReleaseBlockers(done), [])
  for (const [k, v] of [["verifiedBy", " "], ["verifiedOn", "26/11/2026"], ["reference", null], ["status", "PENDING"]]) {
    const one = done.map((p, i) => (i === 3 ? { ...p, [k]: v } : p))
    assert.deepEqual(RG.productionReleaseBlockers(one), ["PRG-04 Commercial hosting"], k)
  }
  assert.deepEqual(RG.productionReleaseBlockers([]), ["production release gate is missing"])
  assert.deepEqual(RG.productionReleaseBlockers(null), ["production release gate is missing"])
})

test("the registers are frozen and the publication gate does not read the production or post-launch lists", () => {
  assert.throws(() => { RG.PRODUCTION_RELEASE_GATE[0].status = "VERIFIED" }, TypeError)
  assert.throws(() => RG.POST_LAUNCH_QUEUE.push({}), TypeError)
  const src = readFileSync(path.join(ROOT, "lib/seo/publication-gate.ts"), "utf8")
  assert.ok(!/PRODUCTION_RELEASE_GATE|POST_LAUNCH_QUEUE|release-gates/.test(src))
})

test("the disposition document records every reclassified id and the full service-page requirement list", () => {
  const doc = readFileSync(path.join(ROOT, "docs/seo/release04b-gate-dispositions.md"), "utf8")
  for (const id of [...MOVED, "SVC-MG-01", "CMP-05", "CNT-01", "COM-05", "CNT-10"]) assert.ok(doc.includes(id), id)
  for (const p of RG.PRODUCTION_RELEASE_GATE) assert.ok(doc.includes(p.id), p.id)
  for (const p of RG.POST_LAUNCH_QUEUE) assert.ok(doc.includes(p.id), p.id)
})

// R04B-02 (independent review, finding 2): the production gate is enforced in CI where the repository can enforce it.
// Every published page carries the enquiry call to action, so no page may enter the publication manifest while the
// privacy notice (PRG-01) is unverified. Production activation itself (all of PRG-01..08) is an owner-controlled action
// outside the repository, recorded with productionReleaseBlockers().
test("CI guard: the publication manifest stays empty until PRG-01 (approved privacy notice) is VERIFIED", async () => {
  const { PUBLICATION_MANIFEST } = await import("@/lib/seo/publication-manifest")
  const prg01 = RG.PRODUCTION_RELEASE_GATE.find((p) => p.id === "PRG-01")
  const privacyReady = RG.productionReleaseBlockers([prg01]).length === 0
  if (PUBLICATION_MANIFEST.length > 0) assert.ok(privacyReady, "a page is in the publication manifest but the privacy notice (PRG-01) is not verified")
  assert.equal(privacyReady, false, "today PRG-01 is pending, so this guard is live")
  assert.equal(PUBLICATION_MANIFEST.length, 0)
})
