// 5D.10: F9-03 (ranking scanner: high-confidence additions, documented limits) and F9-04 (malformed sibling records fail closed).
import test from "node:test"
import assert from "node:assert/strict"

const { world, redigest, SERVICE, NAIROBI, NAKURU } = await import("../helpers/gate-world.mjs")
const { evaluatePublication, publishRecord, isPublishedSnapshot } = await import("@/lib/seo/publication-gate")

const withText = (t) => {
  const w = world(SERVICE)
  w.record.sections[0].body[0] = `Our patrol teams ${t} and every post reports to a named supervisor at the start of each shift.`
  return redigest(w)
}
const reasonsOf = (t) => { const w = withText(t); return evaluatePublication(w.record, w.deps).reasons }
const RANK = /claim-sensitive wording \(superlative or quality\)/

test("F9-03: the previously missed ranking forms are detected", () => {
  for (const t of ["are Number-one in Kenya", "are number-one", "are #one in Kenya", "are 1st in Kenya", "are the 1st choice", "are first-ranked", "are ranked first", "are ranked 1st in Nairobi", "are the first choice for security", "are the first choice in Kenya", "are numero uno", "are Numero  Uno"]) {
    assert.ok(reasonsOf(t).some((r) => RANK.test(r)), `not detected: ${t}`)
  }
})

test("F9-03: the earlier forms are still detected", () => {
  for (const t of ["are #1", "were ranked #1", "are Kenya's #1 security company", "are No. 1", "are No.1", "are number one", "are number 1", "are No 1 in Kenya", "are # 1"]) {
    assert.ok(reasonsOf(t).some((r) => RANK.test(r)), `not detected: ${t}`)
  }
})

test("F9-03: ordinary numbered references are not flagged", () => {
  for (const t of ["meet at office number 1 each morning", "queue at counter #1 for badges", "file item #1 in the register", "call extension number one for the desk", "inspect camera number 1 each morning", "record ticket #10 in the log", "open gate number 1 at the start of the shift", "log it at post No. 1", "wait at bay No. 1 for the vehicle", "use the 1st floor entrance", "our first choice of site is agreed with the client", "complete the first aid check", "the first patrol starts at six"]) {
    assert.deepEqual(reasonsOf(t), [], `false positive: ${t}`)
  }
})

test("F9-03: documented limits (heuristic, not a fact checker): some ranking wording is not caught", () => {
  // Ambiguous or open-ended phrasing is deliberately left to the human reviewer; the scanner is a backstop only.
  for (const t of ["are the first name in guarding", "outclass every competitor", "are second to none"]) assert.deepEqual(reasonsOf(t), [], t)
})

test("F9-03: a ranking claim still needs an approved, exactly bound statement", () => {
  const w = world(SERVICE, { approvedClaims: ["trusted-by-clients"], compliance: true })
  w.record.sections[0].body[0] = "Our patrol teams are numero uno and every post reports to a named supervisor at the start of each shift."
  w.record.sections[0].claims = [{ claimId: "trusted-by-clients", statement: "are numero uno" }]
  w.record.approval.claimApprovals = [{ claimId: "trusted-by-clients", sectionId: w.record.sections[0].id, statement: "are numero uno", editorialApprovedBy: "E", complianceApprovedBy: "C" }]
  redigest(w)
  const d = evaluatePublication(w.record, w.deps)
  assert.equal(d.published, false)
  assert.ok(d.reasons.some((r) => /no wording that claim covers|no bound, approved claim covers/.test(r)), JSON.stringify(d.reasons))
})

const MALFORMED = ["sibling records are malformed"]
const decide = (sibs) => { const a = world(SERVICE); return { d: evaluatePublication(a.record, a.deps, sibs), a } }
const good = { sections: [{ body: ["An entirely different sibling paragraph about another subject, long enough to count as a paragraph."] }] }

test("F9-04: every malformed sibling shape fails closed (and is never silently ignored)", () => {
  const proto = { sections: [{ body: ["x"] }] }
  const circ = { sections: [] }; circ.self = circ
  const sparse = new Array(2); sparse[0] = good
  const cases = [
    ["null", [null]], ["undefined", [undefined]], ["function", [() => 1]], ["number", [5]], ["string", ["x"]], ["nested array", [[good]]],
    ["sparse array", sparse], ["missing sections", [{}]], ["sections not an array", [{ sections: "x" }]], ["sections object", [{ sections: {} }]],
    ["section not an object", [{ sections: [1] }]], ["section null", [{ sections: [null] }]], ["body missing", [{ sections: [{}] }]], ["body not an array", [{ sections: [{ body: "x" }] }]],
    ["body with a non-string", [{ sections: [{ body: ["ok", 5] }] }]], ["body with undefined", [{ sections: [{ body: [undefined] }] }]],
    ["inherited sections", [Object.create(proto)]], ["class instance", [new (class S { constructor() { this.sections = [] } })()]],
    ["throwing getter", [{ get sections() { throw new Error("boom") } }]], ["hostile proxy", [new Proxy({}, { get() { throw new Error("boom") }, ownKeys() { throw new Error("boom") }, getPrototypeOf() { throw new Error("boom") } })]],
    ["proxy list", new Proxy([good], { get() { throw new Error("boom") } })], ["circular", [circ]], ["bigint", [{ sections: [{ body: [10n] }] }]],
    ["hostile toJSON", [{ sections: [], toJSON() { throw new Error("boom") } }]], ["symbol value", [{ sections: [{ body: [Symbol("x")] }] }]],
    ["list is a string", "abc"], ["list is an object", { length: 1, 0: good }], ["list is null", null],
  ]
  for (const [n, sibs] of cases) {
    const { d, a } = decide(sibs)
    assert.equal(d.published, false, n)
    assert.deepEqual(d.reasons, MALFORMED, n)
    assert.equal(publishRecord(a.record, a.deps, sibs), null, n)
  }
})

test("F9-04: valid static siblings behave as before; boundaries and duplicate detection are intact", () => {
  assert.equal(decide([good]).d.published, true)
  assert.equal(decide([]).d.published, true)
  assert.equal(decide([{ sections: [] }]).d.published, true, "a sibling with no sections is valid")
  assert.equal(decide(undefined).d.published, true, "default argument")
  const b = world(NAIROBI), c = world(NAKURU)
  assert.equal(decide([b.record]).d.published, false, "a real sibling that repeats the paragraph is still caught")
  assert.ok(decide([b.record, c.record, good]).d.reasons.some((r) => /copies text from another page/.test(r)))
  const a = world(SERVICE)
  const page = publishRecord(a.record, a.deps, [good])
  assert.ok(page && isPublishedSnapshot(page))
  assert.equal(isPublishedSnapshot({ ...page }), false)
  const sib = { sections: [{ body: ["Another entirely separate sibling paragraph, long enough to count as a paragraph here."] }] }
  const p2 = publishRecord(a.record, a.deps, [sib]); sib.sections[0].body[0] = "mutated after publication"
  assert.ok(p2 && isPublishedSnapshot(p2))
})
