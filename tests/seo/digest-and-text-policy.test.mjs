import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"

const { sha256Hex } = await import("@/lib/seo/digest")
const { textProblem } = await import("@/lib/seo/text-policy")
const { contentDigest } = await import("@/lib/seo/publication-gate")
const W = await import("../helpers/gate-world.mjs")
const ref = (s) => createHash("sha256").update(s, "utf8").digest("hex")

test("sha256Hex equals node:crypto for block-boundary lengths, multi-byte text and long input", () => {
  const inputs = ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(63), "a".repeat(64), "a".repeat(65), "a".repeat(119), "a".repeat(120), "a".repeat(1000), "café ☕ 日本語 \u{1F600}", JSON.stringify({ a: [1, 2, { b: "c" }] }), "x".repeat(100_000)]
  for (const s of inputs) assert.equal(sha256Hex(s), ref(s), `length ${s.length}`)
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
})

test("contentDigest is deterministic, independent of unrelated fields, and changes with every reviewed field", () => {
  const w = W.world(W.NAIROBI, { coverage: { serviceIds: ["manned-guarding"], areas: ["Test Estate"], evidenceIds: ["OFF-NBO-06", "OFF-NBO-10"] } })
  const entry = w.deps.manifest[0]
  const base = contentDigest(w.record, entry)
  assert.match(base, /^[0-9a-f]{64}$/)
  assert.equal(contentDigest(structuredClone(w.record), { ...entry }), base)
  // fields that are not reviewed content do not change it
  const other = structuredClone(w.record); other.approval.reference = "OTHER"; other.status = "approved"
  assert.equal(contentDigest(other, entry), base)
  const edits = {
    heading: (r) => (r.sections[0].heading += "!"), body: (r) => (r.sections[0].body[0] += " more"), sectionId: (r) => (r.sections[0].id = "other"), sectionEvidence: (r) => r.sections[0].evidenceIds.push("CNT-10"),
    claims: (r) => r.sections[0].claims.push({ claimId: "x", statement: "y" }), evidenceRefs: (r) => r.evidenceRefs.push("CNT-10"), napName: (r) => (r.nap.displayName += "x"), napAddress: (r) => (r.nap.streetAddress += "x"),
    napPhone: (r) => (r.nap.telephone = "+254700000002"), napDesignation: (r) => (r.nap.branchDesignation = "Branch Office"), areas: (r) => r.verifiedCoverage.areas.push("Z"), serviceIds: (r) => r.verifiedCoverage.serviceIds.push("cctv-installation"),
    coverageEvidence: (r) => r.verifiedCoverage.evidenceIds.push("OFF-NBO-07"), path: (r) => (r.publicPath = "/locations/nakuru"), sectionOrder: (r) => r.sections.push(structuredClone(r.sections[0])),
  }
  for (const [name, edit] of Object.entries(edits)) { const r = structuredClone(w.record); edit(r); assert.notEqual(contentDigest(r, entry), base, name) }
  assert.notEqual(contentDigest(w.record, { ...entry, title: "Other" }), base, "title")
  assert.notEqual(contentDigest(w.record, { ...entry, description: "Other description of the page." }), base, "description")
  // never throws on junk
  for (const junk of [null, undefined, 5, "x", [], {}]) assert.match(contentDigest(junk, null), /^[0-9a-f]{64}$/)
})

test("textProblem accepts plain Latin text and rejects every ambiguous construct", () => {
  for (const ok of ["Guards stand at each entrance (the client's choice) - on shift.", "Nairobi, Westlands: 12 Test Road", "R&D & more", "Cafe 24/7", "Wanjiru's café"]) {
    if (ok.includes("é")) assert.equal(textProblem("Wanjiru's café"), null)
    else assert.equal(textProblem(ok), null, ok)
  }
  const bad = {
    "zero-width space": "24​/7", "zero-width joiner": "a‍b", "soft hyphen": "licen­sed", BOM: "﻿x", "bidi override": "‮x", "word joiner": "a⁠b",
    tab: "a\tb", newline: "a\nb", CR: "a\rb", "line separator": "a b", "paragraph separator": "a b", NBSP: "24 hours", "thin space": "a b", "ideographic space": "a　b", "NEL": "a\u0085b",
    "combining dot": "i̇", "fullwidth digits": "２４", "fullwidth slash": "24／7", ligature: "ﬁnest", ellipsis: "wait…", "superscript": "x²", "trademark": "x™", "circled digit": "①",
    Cyrillic: "bеst", Greek: "αb", Arabic: "ا", "Arabic-Indic digits": "٢٤", "private use": "", "unassigned": "͸", "lone surrogate": "\ud800",
    "non-string": 5,
  }
  for (const [n, v] of Object.entries(bad)) assert.notEqual(textProblem(v), null, n)
  assert.equal(textProblem(undefined) !== null, true)
})

test("normalisation cannot create an approval bypass: text is rejected, never rewritten, so scan and render see identical text", () => {
  // NFKC would turn each of these into text the scanner flags; the gate refuses them instead of normalising.
  for (const t of ["２４/７", "24 hours", "ﬁnest", "licen­sed"]) {
    assert.notEqual(textProblem(t), null)
    assert.notEqual(t.normalize("NFKC"), t === "licen­sed" ? "licensed-x" : "")
  }
  // and the gate rejects an approval whose statement was only valid after normalisation
  const w = W.world(W.SERVICE, { sections: [{ id: "s", heading: "Support", body: ["Control room cover is available ２４/７ for every client site and guards report to a named supervisor.", "A written scope sheet lists the posts, the shift pattern and the exclusions agreed with the operations team before any guard starts."], evidenceIds: ["CNT-01"], claims: [{ claimId: "availability-24-7", statement: "available 24/7" }] }], approvedClaims: ["availability-24-7"], compliance: true, claimApprovals: [{ claimId: "availability-24-7", sectionId: "s", statement: "available 24/7", editorialApprovedBy: "E", complianceApprovedBy: "C" }] })
  W.redigest(w)
  return import("@/lib/seo/publication-gate").then((gate) => assert.equal(gate.evaluatePublication(w.record, w.deps).published, false))
})
