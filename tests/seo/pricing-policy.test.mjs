// Release 04B claims policy (lane B). The restriction is on unauthorised PRICING CLAIMS, not on commercial vocabulary.
// Page text may say price, pricing, cost, quotation, budget and proposal; educational cost-driver guidance, requests for a
// quotation and clearly hypothetical scenarios are allowed. Money amounts, rate cards, binding or positioned prices,
// cheapest or lowest-price claims, discounts and free offers are refused, and no claim scope can unlock them.
// The cases live in tests/helpers/gate-world.mjs (PRICING_ALLOWED, PRICING_BLOCKED) so the mutation harness uses them too.
import test from "node:test"
import assert from "node:assert/strict"

const gate = await import("@/lib/seo/publication-gate")
const W = await import("../helpers/gate-world.mjs")
const { CLAIM_SCOPE } = await import("@/lib/seo/claim-scope")
const { classifyKeyword } = await import("@/lib/seo/claim-classifier")

const runR04B = () => W.runCases(gate).filter((r) => /R04B-01/.test(r.name))

test("allowed: ordinary commercial vocabulary publishes in a synthetic world", () => {
  const ok = runR04B().filter((r) => r.name.startsWith("accepts:"))
  assert.equal(ok.length, W.PRICING_ALLOWED.length)
  assert.deepEqual(ok.filter((r) => !r.ok).map((r) => r.name), [])
})

test("blocked: every pricing claim is refused, and refused FOR pricing wording", () => {
  const bad = runR04B().filter((r) => r.name.startsWith("rejects:"))
  assert.equal(bad.length, W.PRICING_BLOCKED.length)
  for (const r of bad) {
    assert.equal(r.ok, true, r.name)
    assert.ok(r.reasons.some((x) => /claim-sensitive wording \(pricing\)/.test(x)), `${r.name}: ${JSON.stringify(r.reasons)}`)
  }
})

test("no claim scope permits the pricing category, so binding ANY registered claim cannot unlock a price", () => {
  assert.ok(!Object.values(CLAIM_SCOPE).some((s) => s.categories.includes("pricing")))
  for (const claimId of Object.keys(CLAIM_SCOPE)) {
    const statement = "KES 25,000 per guard"
    const w = W.world(W.SERVICE, {
      sections: [{ id: "scope", heading: "Scope of the service", body: [`Guarding is offered at ${statement} each month for a standard residential post in the estate.`, "A written scope sheet lists the posts, the shift pattern and the exclusions agreed with the operations team before work starts."], evidenceIds: W.world().record.sections[0].evidenceIds, claims: [{ claimId, statement }] }],
      approvedClaims: [claimId],
      compliance: true,
      claimApprovals: [{ claimId, sectionId: "scope", statement, editorialApprovedBy: "E", complianceApprovedBy: "C" }],
    })
    const d = gate.evaluatePublication(w.record, w.deps)
    assert.equal(d.published, false, claimId)
    assert.ok(d.reasons.some((x) => /\(pricing\)/.test(x)), `${claimId}: ${d.reasons.join("; ")}`)
  }
})

test("headings and manifest metadata: pricing claims are refused there too, plain words are not", () => {
  const head = W.world(); head.record.sections[0].heading = "Fixed price guarding"; W.redigest(head)
  assert.equal(gate.evaluatePublication(head.record, head.deps).published, false)
  const meta = W.world(); meta.deps.manifest[0].description = "Guarding from KES 20,000 a month for residential estates."; W.redigest(meta)
  assert.ok(gate.evaluatePublication(meta.record, meta.deps).reasons.includes("manifest metadata contains claim-sensitive wording"))
  const plain = W.world(); plain.deps.manifest[0].description = "What shapes the cost of manned guarding and how to request a quotation."; W.redigest(plain)
  assert.deepEqual(gate.evaluatePublication(plain.record, plain.deps).reasons, [])
})

test("keyword research is unchanged: the workbook classifier still marks pricing keywords claim-sensitive", () => {
  for (const k of ["cctv installation cost in nairobi", "security company rates in kenya", "security company quotation kenya"]) assert.deepEqual(classifyKeyword(k).categories, ["pricing"], k)
})
