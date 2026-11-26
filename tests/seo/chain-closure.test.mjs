// F9-01 (Milestone 5D.10): requirements come from EVERY canonical identity in a supersession chain.
// Synthetic fixtures only; nothing here approves a real page. Every rejection asserts its intended reason, and each group
// has accepting cases so an implementation that rejects everything cannot pass.
import test from "node:test"
import assert from "node:assert/strict"

const { world, redigest, SERVICE, NAIROBI, entry } = await import("../helpers/gate-world.mjs")
const { evaluatePublication } = await import("@/lib/seo/publication-gate")
const { REQUIRED_EVIDENCE, LICENCE_EVIDENCE, rootRequirements, chainRequirements } = await import("@/lib/seo/publication-requirements")

const need = REQUIRED_EVIDENCE[SERVICE.publicPath]
const MIXES = /mixes canonical evidence identities/
const NO_EXPIRY = /licence evidence without an expiry date/
/** A page citing licence evidence `id` (valid expiry unless overridden). */
const lic = (id = "CMP-01", expiresOn = "2027-06-30") => world(SERVICE, { extraEvidence: [id], sectionEvidence: [need[2], id], entryOver: { [id]: { expiresOn } } })
/** Replace `id` by a chain of entries: hops are [id, overrides]. */
function chain(w, id, hops) {
  let prev = id
  for (const [rid, over = {}] of hops) {
    const old = w.deps.ledger.find((e) => e.id === prev)
    old.supersededBy = rid
    w.deps.ledger.push(entry(rid, { replaces: prev, scope: old.scope, expiresOn: old.expiresOn, ...over }))
    w.record.approval.evidenceIds.push(rid)
    prev = rid
  }
  return redigest(w)
}
const decide = (w) => evaluatePublication(w.record, w.deps)
const rejects = (w, rx, label = "") => {
  const d = decide(w)
  assert.equal(d.published, false, `${label} must be rejected`)
  assert.ok(d.reasons.some((r) => rx.test(r)), `${label} expected ${rx} in ${JSON.stringify(d.reasons)}`)
}
const accepts = (w, label = "") => assert.deepEqual(decide(w).reasons, [], label)

test("A. original bypass: a licence root keeps its requirements under any replacement id", () => {
  for (const rid of ["CMP-01-R1", "ZZZ-91", "CMP-02", "CLM-01"]) rejects(chain(lic(), "CMP-01", [[rid, { expiresOn: null }]]), NO_EXPIRY, rid)
  for (const rid of ["CMP-01-R1", "ZZZ-91", "CMP-02", "CLM-01"]) accepts(chain(lic(), "CMP-01", [[rid, { expiresOn: "2027-09-30" }]]), `valid ${rid}`)
  // a different company evidence id carries a different registered meaning: the chain is refused whatever its expiry
  for (const exp of [null, "2027-09-30"]) rejects(chain(lic(), "CMP-01", [["CMP-06", { expiresOn: exp }]]), MIXES, `CMP-05 ${exp}`)
  // multi-hop
  rejects(chain(lic(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30" }], ["ZZZ-92", { expiresOn: null }]]), NO_EXPIRY)
  rejects(chain(lic(), "CMP-01", [["CMP-02", { expiresOn: "2027-09-30" }], ["ZZZ-92", { expiresOn: null }]]), NO_EXPIRY)
  accepts(chain(lic(), "CMP-01", [["CMP-02", { expiresOn: null }], ["ZZZ-92", { expiresOn: "2027-09-30" }]]))
})

test("B. inverse bypass (F9-01): CMP-05 -> CMP-01 is refused in every variant, for the conflict", () => {
  // The exact reproduction: a non-licence root replaced by the canonical licence id with no expiry.
  rejects(chain(world(SERVICE), "CMP-05", [["CMP-01", { expiresOn: null }]]), MIXES, "no expiry")
  // Stricter than an expiry check: the conflict makes the chain invalid even when the replacement is fully valid.
  const variants = [
    ["valid expiry", { expiresOn: "2027-09-30" }],
    ["expired", { expiresOn: "2026-11-01" }],
    ["revoked", { expiresOn: "2027-09-30", revokedOn: "2026-11-10" }],
    ["malformed expiry", { expiresOn: "31/12/2027" }],
    ["future verification", { expiresOn: "2027-09-30", verifiedOn: "2026-12-30" }],
  ]
  for (const [label, over] of variants) rejects(chain(world(SERVICE), "CMP-05", [["CMP-01", over]]), MIXES, label)
  const missing = chain(world(SERVICE), "CMP-05", [["CMP-01", { expiresOn: "2027-09-30" }]])
  delete missing.deps.ledger.find((e) => e.id === "CMP-01").verifiedBy
  rejects(redigest(missing), MIXES, "missing metadata")
  // citing the licence id from the section does not help
  const cited = chain(world(SERVICE), "CMP-05", [["CMP-01", { expiresOn: null }]])
  cited.record.sections[0].evidenceIds.push("CMP-01")
  rejects(redigest(cited), MIXES, "cited")
  // control: the same non-licence root with an unregistered replacement and no expiry is still fine
  accepts(chain(world(SERVICE), "CMP-05", [["ZZZ-91", { expiresOn: null }]]), "unregistered replacement of a non-licence root")
  accepts(chain(world(SERVICE), "CMP-05", [["CMP-06", { expiresOn: null }]]), "same-profile registered replacement")
})

test("C. canonical identities in the middle or at the end of a chain are all considered", () => {
  rejects(chain(world(SERVICE), "CMP-05", [["ZZZ-91", {}], ["CMP-01", { expiresOn: null }]]), MIXES, "licence id as the tail")
  rejects(chain(world(SERVICE), "CMP-05", [["CMP-01", { expiresOn: "2027-09-30" }], ["ZZZ-92", { expiresOn: "2027-09-30" }]]), MIXES, "licence id in the middle")
  rejects(chain(lic(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30" }], ["CMP-06", { expiresOn: "2027-09-30" }]]), MIXES, "non-licence id at the tail of a licence chain")
  accepts(chain(lic(), "CMP-01", [["CMP-02", { expiresOn: "2027-09-30" }], ["CMP-03", { expiresOn: "2027-10-31" }]]), "licence family chain")
  // a cited intermediate entry resolves the same chain
  const w = chain(world(SERVICE), "CMP-05", [["ZZZ-91", {}], ["CMP-01", { expiresOn: null }]])
  w.record.sections[0].evidenceIds.push("ZZZ-91")
  rejects(redigest(w), MIXES, "cited intermediate")
})

test("C. every registered licence id, CLM-01 included, needs an expiry; the registry cannot silently shrink", () => {
  assert.deepEqual([...LICENCE_EVIDENCE].sort(), ["CLM-01", "CMP-01", "CMP-02", "CMP-03", "CMP-04"])
  for (const id of LICENCE_EVIDENCE) {
    rejects(lic(id, null), NO_EXPIRY, `${id} direct`)
    accepts(lic(id, "2027-06-30"), `${id} valid`)
    rejects(chain(lic(id), id, [["ZZZ-91", { expiresOn: null }]]), NO_EXPIRY, `${id} replaced`)
    accepts(chain(lic(id), id, [["ZZZ-91", { expiresOn: "2027-09-30" }]]), `${id} replaced valid`)
    assert.deepEqual(rootRequirements(id), { scope: "company", expiryRequired: true })
  }
})

test("D. lifecycle boundaries (the implemented policy is stated here, not changed)", () => {
  // Expiry policy: an entry is expired on its expiry day itself. With a decision date of 2026-11-19 an entry that expires
  // on 2026-11-19 is refused; one that expires on 2026-11-20 is accepted.
  const exp = (d) => world(SERVICE, { entryOver: { "CMP-05": { expiresOn: d } } })
  rejects(exp("2026-11-18"), /is expired/, "one day before")
  rejects(exp("2026-11-19"), /is expired/, "on the decision date")
  accepts(exp("2026-11-20"), "one day after")
  // the same on licence evidence
  rejects(lic("CMP-01", "2026-11-19"), /is expired/)
  accepts(lic("CMP-01", "2026-11-20"))
  // verification on the approval date is accepted; after the approval date (but not in the future) is refused
  accepts(world(SERVICE, { entryOver: { "CMP-05": { verifiedOn: "2026-11-19" } } }), "verified on the approval date")
  const late = world(SERVICE, { entryOver: { "CMP-05": { verifiedOn: "2026-11-22" } } })
  late.deps.asOf = "2026-11-25"
  rejects(redigest(late), /verified after the approval date/, "after the approval date")
  rejects(world(SERVICE, { entryOver: { "CMP-05": { verifiedOn: "2026-11-20" } } }), /dated in the future/, "after the decision date")
  // invalid calendar dates and a missing expiry on licence evidence
  for (const bad of ["2026-02-30", "2026-13-01", "", "20261231", 20261231, "tomorrow"]) rejects(exp(bad), /invalid expiry date/, String(bad))
  rejects(lic("CMP-01", null), NO_EXPIRY)
  // circular, self-referencing, inconsistent and duplicate
  const cyc = chain(world(SERVICE), "CMP-05", [["ZZZ-91", {}]])
  cyc.deps.ledger.find((e) => e.id === "CMP-05").replaces = "ZZZ-91"
  rejects(redigest(cyc), /circular|does not (replace|name)/, "circular")
  const self = chain(world(SERVICE), "CMP-05", [["ZZZ-91", {}]])
  self.deps.ledger.find((e) => e.id === "ZZZ-91").supersededBy = "ZZZ-91"
  rejects(redigest(self), /circular|does not replace/, "self-reference")
  const inc = chain(world(SERVICE), "CMP-05", [["ZZZ-91", {}]])
  inc.deps.ledger.find((e) => e.id === "ZZZ-91").replaces = "CNT-10"
  rejects(redigest(inc), /does not (replace|name)/, "inconsistent link")
  const dup = world(SERVICE)
  dup.deps.ledger.push(entry("CMP-05", { scope: "company" }))
  rejects(redigest(dup), /duplicate evidence id/, "duplicate")
})

test("D. chain length: up to 17 replacements are accepted, 18 are refused (and the last id is still checked)", () => {
  const long = (n, tailId, tailExp) => {
    const w = world(SERVICE)
    let prev = "CMP-05"
    for (let i = 0; i < n; i++) {
      const rid = i === n - 1 && tailId ? tailId : `ZZZ-${String(i).padStart(2, "0")}`
      const o = w.deps.ledger.find((e) => e.id === prev)
      o.supersededBy = rid
      w.deps.ledger.push(entry(rid, { replaces: prev, scope: "company", ...(i === n - 1 && tailId ? { expiresOn: tailExp } : {}) }))
      w.record.approval.evidenceIds.push(rid)
      prev = rid
    }
    return redigest(w)
  }
  accepts(long(17), "17 replacements")
  rejects(long(18), /over-long supersession chain/, "18 replacements")
  rejects(long(25), /over-long supersession chain/, "25 replacements")
  // a licence id at the very end of the longest accepted chain must still be seen by the requirements check
  rejects(long(17, "CMP-01", null), MIXES, "licence id at the end of a 17-replacement chain")
  // and a cited tail resolves back to the true root at the same length
  const t = long(17, "CMP-01", null)
  t.record.sections[0].evidenceIds.push("CMP-01")
  rejects(redigest(t), MIXES, "cited tail")
})

test("E. scope and unknown identities", () => {
  // non-licence evidence is not licence evidence because of an arbitrary id
  accepts(chain(world(SERVICE), "CNT-01", [["ZZZ-91", { expiresOn: null }]]))
  assert.equal(rootRequirements("CMP-05").expiryRequired, false)
  // company-wide evidence cannot become office-specific, nor an office's evidence company-wide
  rejects(chain(world(SERVICE), "CMP-05", [["ZZZ-91", { scope: "office:nairobi" }]]), /different scopes/, "company -> office")
  rejects(chain(world(NAIROBI), "OFF-NBO-02", [["ZZZ-91", { scope: "company" }]]), /different scopes/, "office -> company")
  rejects(chain(world(NAIROBI), "OFF-NBO-02", [["COM-88", {}]]), MIXES, "office root replaced by a registered company id")
  // service-specific evidence is not reusable for an unrelated service
  const other = world(SERVICE, { extraEvidence: ["SVC-CC-01"] })
  other.record.sections[0].evidenceIds.push("SVC-CC-01")
  rejects(redigest(other), /scoped to service:cctv-installation, not to this page/)
  rejects(chain(world(SERVICE), "SVC-MG-01", [["SVC-CC-01", {}]]), MIXES, "service root replaced by another service's id")
  // unknown roots fail closed, also when the replacement is a registered id
  rejects(redigest(world(SERVICE, { extraEvidence: ["QQQ-01"] })), /no valid evidence scope/, "unknown root")
  const u = world(SERVICE, { extraEvidence: ["QQQ-01"] })
  u.record.sections[0].evidenceIds.push("QQQ-01")
  rejects(chain(u, "QQQ-01", [["CMP-01", { expiresOn: "2027-09-30" }]]), /no valid evidence scope/, "unknown root with a registered replacement")
  // an unknown replacement cannot escape the root's requirements
  rejects(chain(lic(), "CMP-01", [["QQQ-77", { expiresOn: null }]]), NO_EXPIRY)
})

test("chainRequirements: pure behaviour of the registry combination", () => {
  assert.deepEqual(chainRequirements(["CMP-01", "ZZZ-1"]), { ok: true, req: { scope: "company", expiryRequired: true } })
  assert.deepEqual(chainRequirements(["CMP-07", "ZZZ-1", "ZZZ-2"]), { ok: true, req: { scope: "company", expiryRequired: false } })
  assert.deepEqual(chainRequirements(["CMP-01", "CMP-02"]), { ok: true, req: { scope: "company", expiryRequired: true } })
  assert.equal(chainRequirements(["CMP-07", "CMP-01"]).ok, false)
  assert.equal(chainRequirements(["CMP-01", "CMP-07"]).ok, false)
  assert.equal(chainRequirements(["CMP-07", "OFF-NBO-01"]).ok, false)
  assert.equal(chainRequirements(["ZZZ-1", "CMP-01"]).ok, false)
  assert.equal(chainRequirements([]).ok, false)
})
