// Release 04 (Lane SEO): a false verification flag can never coexist with copy that asserts licensing.
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { clone, world, SERVICE } from "../helpers/gate-world.mjs"
import { renderComponent } from "../content/render-helper.mjs"

const { evaluatePublication } = await import("@/lib/seo/publication-gate")
const { CLAIMS, getApprovedClaims } = await import("@/lib/claims")
const { REQUIRED_EVIDENCE } = await import("@/lib/seo/publication-requirements")
const { getApprovedOffices } = await import("@/lib/offices")
const { SERVICE_CONTENT } = await import("@/lib/seo/service-content")
const { contentToSections } = await import("@/lib/seo/service-sections")

const FILL = "Guards are placed at the entrances and gates that the client chooses for the site, and each post reports to a named supervisor."
const LICENCE_PARA = "JOLU SECURITY is licensed and compliant according to the register that the regulator publishes for the whole sector."
const STATEMENT = "licensed and compliant"
const ev = (path) => REQUIRED_EVIDENCE[path][2]

/** A world whose single section asserts licensing, bound to claim `licensed-compliant`, with knobs for each way it can be wrong. */
function licensingWorld({ claimStatus = "approved", claimEvidence = "licence-register-extract", approval = true, bound = true } = {}) {
  const w = world(SERVICE, {
    sections: [{ id: "trust", heading: "Trust", body: [LICENCE_PARA, FILL], evidenceIds: [ev(SERVICE.publicPath)], claims: bound ? [{ claimId: "licensed-compliant", statement: STATEMENT }] : [] }],
    compliance: true,
    claimApprovals: approval ? [{ claimId: "licensed-compliant", sectionId: "trust", statement: STATEMENT, editorialApprovedBy: "Test Editor", complianceApprovedBy: "Test Compliance" }] : [],
  })
  w.deps.claims = [...CLAIMS.filter((c) => c.id !== "licensed-compliant"), { id: "licensed-compliant", text: "Licensed & Compliant", status: claimStatus, evidence: claimEvidence }]
  w.record.approval.claimApprovals = clone(w.record.approval.claimApprovals)
  return w
}
const decide = (w) => evaluatePublication(w.record, w.deps)

describe("licensing copy needs a claim that is truly verified", () => {
  it("a claim flagged needs-evidence cannot publish licensing copy", () => {
    const d = decide(licensingWorld({ claimStatus: "needs-evidence", claimEvidence: null }))
    assert.equal(d.published, false)
  })
  it("a claim flagged approved with no evidence (a false verification flag) cannot publish licensing copy", () => {
    for (const evidence of [null, "", "   "]) assert.equal(decide(licensingWorld({ claimEvidence: evidence })).published, false, JSON.stringify(evidence))
  })
  it("a claim flagged approved but marked needs-evidence in the registry text is not approved", () => {
    assert.equal(decide(licensingWorld({ claimStatus: "needs-evidence" })).published, false)
  })
  it("an approved, evidenced claim still fails when the page has no per-statement approval, or the copy is not bound to the claim", () => {
    assert.equal(decide(licensingWorld({ approval: false })).published, false)
    assert.equal(decide(licensingWorld({ bound: false, approval: false })).published, false)
  })
  it("licensing copy fails with no claim at all, even though the page cites evidence", () => {
    const w = world(SERVICE, { sections: [{ id: "trust", heading: "Trust", body: [LICENCE_PARA, FILL], evidenceIds: [ev(SERVICE.publicPath)], claims: [] }] })
    const d = decide(w)
    assert.equal(d.published, false)
    assert.ok(d.reasons.some((r) => /licensing/.test(r)), d.reasons.join("; "))
  })
  it("licence evidence that is not VERIFIED, or has no expiry, cannot support a page", () => {
    for (const over of [{ status: "PROVISIONAL" }, { expiresOn: null }, { revokedOn: "2026-11-01" }, { expiresOn: "2026-11-01" }]) {
      const w = world(SERVICE, { extraEvidence: ["CMP-01"], sectionEvidence: [ev(SERVICE.publicPath), "CMP-01"], entryOver: { "CMP-01": { expiresOn: "2027-06-30", ...over } } })
      assert.equal(decide(w).published, false, JSON.stringify(over))
    }
  })
  it("control: the same world with every element genuinely in place publishes (the checks above are not vacuous)", () => {
    assert.equal(decide(licensingWorld()).published, true)
  })
})

describe("the live candidate: no licensing assertion and no approved licensing claim", () => {
  it("every claim is still needs-evidence and no office is approved", () => {
    assert.deepEqual(getApprovedClaims(), [])
    for (const c of CLAIMS) assert.equal(c.status, "needs-evidence", c.id)
    assert.deepEqual(getApprovedOffices(), [])
  })
  it("invariant: any approved claim carries evidence (so a flag cannot be true while its evidence is empty)", () => {
    for (const c of CLAIMS) if (c.status === "approved") assert.ok(c.evidence?.trim(), c.id)
  })
  it("the homepage and Blog HTML, and the draft service copy, assert no licence, PSRA number or regulatory approval for JOLU SECURITY", async () => {
    const pages = [await renderComponent("app/page.tsx", "default"), await renderComponent("app/blog/page.tsx", "default")]
    const draft = SERVICE_CONTENT.flatMap((c) => contentToSections(c).flatMap((s) => s.body)).join("\n")
    for (const text of [...pages.map((p) => p.replace(/<[^>]+>/g, " ")), draft]) {
      assert.ok(!/\b(is|are|we are|jolu security is|jolu security holds|holds|hold|has|have)\s+(a\s+)?(current\s+)?(licen[cs]ed|licen[cs]e|accredited|certified|registered|approved by)/i.test(text))
      assert.ok(!/\bpsra\s*(licen[cs]e\s*)?(no\.?|number|#)\s*[:\w-]*\d/i.test(text))
      assert.ok(!/licen[cs]e (no|number)\b/i.test(text))
    }
  })
  it("the draft service copy mentions the regulator only as buyer guidance (ask any provider, check with the regulator)", () => {
    for (const c of SERVICE_CONTENT) {
      for (const p of c.scope.regulatory.filter((r) => /PSRA|Regulatory Authority|regulator|authorisation/.test(r))) {
        assert.match(p, /\b(ask|check|operate under|providers? of|Before you sign)\b/i, `${c.slug}: ${p}`)
        assert.ok(!/\bJOLU SECURITY\b.*\b(is|holds|has)\b.*(licen|authori|regist)/i.test(p), p)
      }
    }
  })
})
