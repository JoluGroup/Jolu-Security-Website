// F7-01 / F9-01: requirements are derived from every canonical identity in a supersession chain (see chain-closure.test.mjs for the
// inverse case and the conflict rule). Replacement ids used here are unregistered (ZZZ-..) or share the root's profile.
// Synthetic fixtures only. Every rejection asserts the intended reason, so a case cannot pass because of an unrelated failure.
import test from "node:test"
import assert from "node:assert/strict"

const { world, redigest, SERVICE, NAIROBI, entry } = await import("../helpers/gate-world.mjs")
const { evaluatePublication } = await import("@/lib/seo/publication-gate")
const { REQUIRED_EVIDENCE, rootRequirements, LICENCE_EVIDENCE, expectedScope } = await import("@/lib/seo/publication-requirements")

const need = REQUIRED_EVIDENCE[SERVICE.publicPath]
const licenceWorld = (expiresOn = "2027-06-30") => world(SERVICE, { extraEvidence: ["CMP-01"], sectionEvidence: [need[8], "CMP-01"], entryOver: { "CMP-01": { expiresOn } } })
/** Replace `id` by a chain of entries with the given ids; hops[i] holds that hop's overrides. */
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
const reasons = (w) => evaluatePublication(w.record, w.deps).reasons
const rejects = (w, rx) => {
  const d = evaluatePublication(w.record, w.deps)
  assert.equal(d.published, false, "must be rejected")
  assert.ok(d.reasons.some((r) => rx.test(r)), `expected ${rx} in ${JSON.stringify(d.reasons)}`)
}
const accepts = (w) => assert.deepEqual(reasons(w), [])
const NO_EXPIRY = /licence evidence without an expiry date/

test("baseline: licence evidence with a valid expiry is accepted", () => accepts(licenceWorld()))

test("1. direct licence evidence without expiry is rejected", () => rejects(licenceWorld(null), NO_EXPIRY))

test("2-3. a licence replaced under any id, with no expiry, is rejected for that reason", () => {
  for (const rid of ["CMP-01-R1", "ZZZ-91", "CMP-02", "CLM-01", "CMP-01-R1-R2"]) {
    const w = licenceWorld()
    if (w.deps.ledger.some((e) => e.id === rid)) continue
    rejects(chain(w, "CMP-01", [[rid, { expiresOn: null }]]), NO_EXPIRY)
  }
})

test("replacement ids that are not valid evidence ids are rejected as such (never accepted)", () => {
  for (const rid of ["cmp-01-r1", "X", "", "CMP 91"]) rejects(chain(licenceWorld(), "CMP-01", [[rid, { expiresOn: "2027-09-30" }]]), /without a valid id|does not replace/)
})

test("4. a licence replaced with a valid expiry is accepted (any replacement id)", () => {
  for (const rid of ["CMP-01-R1", "ZZZ-91", "CMP-02", "CLM-01"]) accepts(chain(licenceWorld(), "CMP-01", [[rid, { expiresOn: "2027-09-30" }]]))
})

test("5-8. a licence replaced by an expired, revoked, malformed or future-verified entry is rejected for the intended reason", () => {
  const cases = [
    [{ expiresOn: "2026-11-01" }, /is expired/],
    [{ expiresOn: "2026-11-19" }, /is expired/],
    [{ revokedOn: "2026-11-18" }, /is revoked/],
    [{ expiresOn: "2027-02-30" }, /invalid expiry date/],
    [{ expiresOn: "soon" }, /invalid expiry date/],
    [{ verifiedOn: "2026-12-30" }, /dated in the future/],
    [{ status: "PROVISIONAL" }, /not VERIFIED/],
  ]
  for (const [over, rx] of cases) rejects(chain(licenceWorld(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30", ...over }]]), rx)
})

test("9-10. multi-hop: the end of the chain decides", () => {
  rejects(chain(licenceWorld(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30" }], ["ZZZ-92", { expiresOn: null }]]), NO_EXPIRY)
  // an intermediate entry without expiry is superseded and irrelevant: the current (last) entry decides
  accepts(chain(licenceWorld(), "CMP-01", [["ZZZ-91", { expiresOn: null }], ["ZZZ-92", { expiresOn: "2027-09-30" }]]))
  accepts(chain(licenceWorld(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30" }], ["ZZZ-92", { expiresOn: "2027-10-31" }]]))
})

test("11. a replacement with a different evidence scope is rejected", () => {
  rejects(chain(licenceWorld(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30", scope: "office:nakuru" }]]), /different scopes/)
  rejects(chain(licenceWorld(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30", scope: "service:manned-guarding" }]]), /different scopes/)
})

test("12. circular and inconsistent chains are rejected", () => {
  const w = chain(licenceWorld(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30" }]])
  w.deps.ledger.find((e) => e.id === "ZZZ-91").supersededBy = "CMP-01"
  rejects(redigest(w), /circular|does not replace/)
  const v = chain(licenceWorld(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30" }]])
  v.deps.ledger.find((e) => e.id === "ZZZ-91").replaces = "CNT-10"
  rejects(redigest(v), /does not replace|does not name/)
  const u = licenceWorld(); u.deps.ledger.find((e) => e.id === "CMP-01").supersededBy = "NOPE-01"
  rejects(redigest(u), /does not replace|not in the ledger/)
})

test("13. a non-licence record neither acquires nor loses requirements because of its replacement id", () => {
  // CNT-01 is not licence evidence: replacing it under a licence-looking id does not make an expiry mandatory
  const w = world(SERVICE)
  accepts(chain(w, "CNT-01", [["CMP-93", { expiresOn: null }]]))
  accepts(chain(world(SERVICE), "CNT-01", [["CMP-01-R1", { expiresOn: null }]]))
  accepts(chain(world(SERVICE), "CNT-01", [["ZZZ-93", { expiresOn: null }]]))
  // and it can still carry an expiry, which is then enforced
  rejects(chain(world(SERVICE), "CNT-01", [["CMP-93", { expiresOn: "2026-11-01" }]]), /is expired/)
  // a licence-looking root that is not registered as licence evidence has no mandatory expiry (documented limit)
  assert.equal(rootRequirements("CMP-05").expiryRequired, false)
  assert.equal(rootRequirements("CMP-07").expiryRequired, false)
})

test("14. replacing evidence does not bypass other canonical requirements", () => {
  // replacement attests a different address than the page shows
  const w = world(NAIROBI)
  w.deps.ledger.find((e) => e.id === "OFF-NBO-02").supersededBy = "ZZZ-02"
  w.deps.ledger.push(entry("ZZZ-02", { replaces: "OFF-NBO-02", scope: "office:nairobi", attested: { streetAddress: "9 Other Road", locality: "Testville" } }))
  w.record.approval.evidenceIds.push("ZZZ-02")
  rejects(redigest(w), /currently attested/)
  // approval must cite the current entry
  const v = world(NAIROBI)
  v.deps.ledger.find((e) => e.id === "OFF-NBO-02").supersededBy = "ZZZ-02"
  v.deps.ledger.push(entry("ZZZ-02", { replaces: "OFF-NBO-02", scope: "office:nairobi", attested: v.deps.ledger.find((e) => e.id === "OFF-NBO-02").attested }))
  rejects(redigest(v), /current evidence ZZZ-02/)
  // a replacement for an evidence code with no known root is rejected outright
  const u = world(SERVICE, { extraEvidence: ["QQQ-01"] })
  rejects(redigest(u), /no valid evidence scope/)
  // an unregistered replacement of an office entry still carries the office scope and is refused on another office's page
  const t = world(NAIROBI, { extraEvidence: ["OFF-NAK-02"] })
  t.record.sections[0].evidenceIds.push("OFF-NAK-02")
  t.deps.ledger.find((e) => e.id === "OFF-NAK-02").supersededBy = "ZZZ-88"
  t.deps.ledger.push(entry("ZZZ-88", { replaces: "OFF-NAK-02", scope: "office:nakuru" }))
  t.record.approval.evidenceIds.push("ZZZ-88")
  rejects(redigest(t), /scoped to office:nakuru/)
})

test("requirements profile: closed for unknown ids", () => {
  for (const id of LICENCE_EVIDENCE) assert.deepEqual(rootRequirements(id), { scope: "company", expiryRequired: true })
  assert.equal(rootRequirements("OFF-NBO-02").expiryRequired, false)
  assert.equal(rootRequirements("OFF-NBO-02").scope, "office:nairobi")
  for (const bad of ["CMP-01-R1", "ZZZ-91", "", null, undefined, 5, {}, "CMP-1", "cmp-01"]) assert.equal(rootRequirements(bad), null, String(bad))
  // the profile agrees with the scope table, so the two cannot drift
  for (const id of Object.values(REQUIRED_EVIDENCE).flat()) assert.equal(rootRequirements(id).scope, expectedScope(id))
})
