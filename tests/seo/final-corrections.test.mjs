// 5D.8 targeted tests: ranking-claim patterns (F7-02) and sibling-record snapshots (F7-04), against the real gate.
import test from "node:test"
import assert from "node:assert/strict"

const { world, redigest, SERVICE, NAIROBI } = await import("../helpers/gate-world.mjs")
const { evaluatePublication, publishRecord, isPublishedSnapshot } = await import("@/lib/seo/publication-gate")

const withText = (t) => {
  const w = world(SERVICE)
  w.record.sections[0].body[0] = `Our patrol teams ${t} and every post reports to a named supervisor at the start of each shift.`
  return redigest(w)
}
const reasonsOf = (t) => evaluatePublication(...(() => { const w = withText(t); return [w.record, w.deps] })()).reasons

test("F7-02: ranking claims are detected, including the '#1' forms", () => {
  for (const t of ["are #1", "are #1 in the region", "were ranked #1 last year", "are Kenya's #1 security company", "are No. 1 for cover", "are No.1 for cover", "are number one for cover", "are number 1 for cover", "are the (#1) choice", 'are the "#1" choice', "are # 1", "are No 1 in Kenya", "are the #1."]) {
    assert.ok(reasonsOf(t).some((r) => /claim-sensitive wording \(superlative or quality\)/.test(r)), `not detected: ${t}`)
  }
})

test("F7-02: ordinary business copy is not flagged", () => {
  for (const t of ["open gate number 1 at the start of the shift", "check post number one before handover", "record ticket #10 in the log", "file item #12 with the register", "park in room number 1 by the stores", "call 0700 000 001 for the control room", "serve no 1 way of working", "use number 10 on the radio channel", "inspect camera number 1 each morning"]) {
    assert.deepEqual(reasonsOf(t), [], `false positive: ${t}`)
  }
})

test("F7-02: a ranking claim still needs an approved, exactly bound statement (scope unchanged)", () => {
  const w = world(SERVICE, { approvedClaims: ["trusted-by-clients"], compliance: true })
  w.record.sections[0].body[0] = "Our patrol teams are #1 and every post reports to a named supervisor at the start of each shift."
  w.record.sections[0].claims = [{ claimId: "trusted-by-clients", statement: "are #1" }]
  w.record.approval.claimApprovals = [{ claimId: "trusted-by-clients", sectionId: w.record.sections[0].id, statement: "are #1", editorialApprovedBy: "E", complianceApprovedBy: "C" }]
  redigest(w)
  const d = evaluatePublication(w.record, w.deps)
  assert.equal(d.published, false)
  assert.ok(d.reasons.some((r) => /claim trusted-by-clients statement contains no wording that claim covers|no bound, approved claim covers/.test(r)), JSON.stringify(d.reasons))
})

test("F7-04: sibling records are snapshotted and fail closed", () => {
  const a = world(SERVICE)
  const bad = [
    ["throwing getter", { get sections() { throw new Error("boom") } }],
    ["hostile proxy", new Proxy({}, { get() { throw new Error("boom") } })],
    ["circular", (() => { const c = {}; c.self = c; return c })()],
    ["bigint", { sections: [{ body: [10n] }] }],
  ]
  for (const [n, sib] of bad) {
    const d = evaluatePublication(a.record, a.deps, [sib])
    assert.equal(d.published, false, n)
    assert.deepEqual(d.reasons, ["sibling records are malformed"], n)
    assert.equal(publishRecord(a.record, a.deps, [sib]), null, n)
  }
  assert.deepEqual(evaluatePublication(a.record, a.deps, "x").reasons, ["sibling records are malformed"])
  assert.deepEqual(evaluatePublication(a.record, a.deps, { length: 0 }).reasons, ["sibling records are malformed"])
})

test("F7-04: a getter that changes between reads cannot hide a copied paragraph; later mutation cannot matter", () => {
  const a = world(SERVICE)
  const p0 = a.record.sections[0].body[0]
  let n = 0
  const flipping = { get sections() { n++; return n > 1 ? [] : [{ body: [p0] }] } }
  const d = evaluatePublication(a.record, a.deps, [flipping])
  assert.equal(d.published, false)
  assert.ok(d.reasons.some((r) => /copies text from another page/.test(r)), JSON.stringify(d.reasons))
  assert.equal(n, 1, "read exactly once")
  const sib = { sections: [{ body: [p0] }] }
  const d2 = evaluatePublication(a.record, a.deps, [sib])
  sib.sections[0].body[0] = "changed afterwards"
  assert.equal(d2.published, false)
})

test("F7-04: valid static sibling records keep working, and the published-object boundary is intact", () => {
  const a = world(SERVICE), b = world(NAIROBI)
  const other = { sections: [{ body: ["An entirely different sibling paragraph about another subject, long enough to count as a paragraph."] }] }
  assert.equal(evaluatePublication(a.record, a.deps, [other]).published, true)
  assert.equal(evaluatePublication(a.record, a.deps, []).published, true)
  assert.equal(evaluatePublication(a.record, a.deps, [b.record]).published, false, "a sibling that really repeats the paragraph is still caught")
  const page = publishRecord(a.record, a.deps, [other])
  assert.ok(page && isPublishedSnapshot(page))
  assert.equal(isPublishedSnapshot({ ...page }), false)
  assert.equal(isPublishedSnapshot(a.record), false)
})
