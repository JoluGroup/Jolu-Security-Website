// Automated mutation testing of the publication gate. Each mutant weakens one safety check in a copy of the real
// gate source; the shared behaviour table (tests/helpers/gate-world.mjs) must then fail. A surviving mutant means a
// safety check has no test that depends on it.
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = path.resolve(import.meta.dirname, "../..")
const SRC = readFileSync(path.join(ROOT, "lib/seo/publication-gate.ts"), "utf8")
const W = await import("../helpers/gate-world.mjs")

const M = (name, from, to) => ({ name, edits: [[from, to]] })
// Equivalent mutants (deliberately not listed): removing the kind-prefix, known-slug, invalid-status, invalid-expiry,
// future-verification, empty-approval-evidence, missing-approval, manifest-presence, dependency-shape and
// missing-canonical checks individually changes no outcome, because another independent check rejects the same
// inputs or the code then throws and fails closed. They are defence in depth, found by running them once.
export const MUTANTS = [
  M("F-02 ignore canonical table", "const needed = new Set<string>(canonical ?? [])", "const needed = new Set<string>()"),
  M("F-02 do not require approval to cover evidence", "if (!approvedIds.includes(id)) reasons.push(`approval does not reference evidence ${id}`)", ""),
  M("F-03 skip serviceId check", "r.serviceId !== id.serviceId ||", "false ||"),
  M("F-03 skip locationId check", "r.locationId !== slug", "false"),
  M("F-03 skip office identity check", "r.officeName !== id.officeName ||", "false ||"),
  M("F-03 skip slug/path match", 'if (r.slug !== slug) reasons.push("slug does not match publicPath")', ""),
  M("F-03 skip plannedPath check", "r.plannedPath !== `${r.publicPath}/` ||", "false ||"),
  { name: "F-06 approvals not bound to sections or statements (both layers)", edits: [
    ["x.claimId === b.claimId && x.sectionId === b.sectionId && x.statement === b.statement)", "x.claimId === b.claimId)"],
    ["b.claimId === x.claimId && b.sectionId === x.sectionId && b.statement === x.statement)", "b.claimId === x.claimId)"],
  ] },
  M("F-04 skip NAP presence", '!["displayName", "branchDesignation", "streetAddress", "locality", "telephone"].every((k) => nonEmpty(nap[k]))', "false"),
  M("F-04 skip name attestation", "same(ident.nameEvidence,", "(() => {})("),
  M("F-04 skip address attestation", "same(ident.addressEvidence,", "(() => {})("),
  M("F-04 skip phone attestation", "same(ident.phoneEvidence,", "(() => {})("),
  M("F-04 skip designation evidence", "needed.add(d.evidenceId)", "void d"),
  M("F-04 skip E.164", "!/^\\+\\d{8,15}$/.test(nap.telephone)", "false"),
  M("F-04 skip COM-05 primary phone", "com05[PHONE_ATTESTATION_KEY] !== siteConfig.contact.primaryPhone.e164", "false"),
  M("F-04 skip coverage services tie", "!cov.evidenceIds.includes(ident.servicesEvidence)", "false"),
  M("F-04 skip coverage areas tie", "!cov.evidenceIds.includes(ident.areasEvidence)", "false"),
  M("F-04 skip unknown coverage service", "if (!SERVICES.some((s) => s.id === id)) reasons.push(`coverage lists unknown service ${id}`)", ""),
  M("F-05 allow non-VERIFIED", 'if (e.status !== "VERIFIED") return `is ${e.status}, not VERIFIED`', ""),
  M("F-05 allow revoked", 'if (e.revokedOn !== null) return "is revoked"', ""),
  M("F-05 allow superseded", 'if (e.supersededBy !== null) return "is superseded"', ""),
  M("F-05 allow expired at as-of", "exp <= asOfDay ||", "false ||"),
  M("F-05 licence needs no expiry", 'else if (LICENCE_EVIDENCE.includes(e.id)) return "is licence evidence without an expiry date"', ""),
  M("F-05 allow missing metadata", 'if (!isObj(e) || keys.some((k) => !(k in e))) return "has missing verification metadata"', ""),
  M("F-05 allow no verifier", 'if (!nonEmpty(e.verifiedBy)) return "has no verifier"', ""),
  M("F-05 allow no document", 'if (!nonEmpty(e.document)) return "has no independent document"', ""),
  M("F-05 allow malformed attested", 'return "has malformed attested values"', "return null"),
  M("F-05 allow duplicate ids", "problems.push(`duplicate evidence id ${raw.id}`)", "void 0"),
  M("F-05 skip invalid entries", 'problems.push("ledger contains an entry without a valid id")', "void 0"),
  M("F-05 skip replacement consistency", "problems.push(`evidence ${e.id} names a replacement that does not replace it`)", "void 0"),
  M("F-05 skip replaces consistency", "problems.push(`evidence ${e.id} replaces an entry that does not name it`)", "void 0"),
  M("F-05 replacement not validated", "rep && rep.replaces === id && !unusable(rep, asOfDay, approvedDay) ? null : why", "rep ? null : why"),
  M("F-06 no claim-sensitive scan", "reasons.push(`section ${s.id} has claim-sensitive wording without a bound, approved claim`)", "void 0"),
  M("F-06 claim spans anywhere", "from >= cf && to <= ct", "true"),
  M("F-06 skip statement-in-text check", "reasons.push(`claim ${c.claimId} statement does not appear in section ${s.id}`)", "void 0"),
  M("F-06 skip registry approval", 'reg.status !== "approved" ||', "false ||"),
  M("F-06 skip registry evidence", "!nonEmpty(reg.evidence)", "false"),
  M("F-06 skip per-statement approval", "reasons.push(`claim ${b.claimId} in section ${b.sectionId} has no approval for that exact statement`)", "void 0"),
  M("F-06 skip editorial/compliance approvers", "reasons.push(`claim ${b.claimId} lacks editorial or compliance approval`)", "void 0"),
  M("F-06 allow stray approvals", 'reasons.push("an approval refers to a claim that is not in the content")', "void 0"),
  M("F-06 no compliance review required", 'reasons.push("claims are present but there is no compliance review")', "void 0"),
  M("F-06 skip heading scan", "if (hasSensitive(s.heading))", "if (false)"),
  M("F-06 skip NAP/area scan", "if (typeof t === \"string\" && hasSensitive(t))", "if (false)"),
  M("F-06 skip manifest metadata scan", "else if (hasSensitive(m.title) || hasSensitive(m.description))", "else if (false)"),
  M("F-06 skip malformed claims check", "reasons.push(`section ${s.id} has malformed claims`)", "void 0"),
  M("F-06 drop extra claim patterns", "const SCAN = [...CLAIM_RULES.map((r) => r.pattern), ...EXTRA_CLAIM_PATTERNS]", "const SCAN = [...CLAIM_RULES.map((r) => r.pattern)]"),
  M("F-07 allow no sections", 'reasons.push("page has no content sections")', "void 0"),
  M("F-07 allow thin paragraphs", "if (words(para) < MIN_WORDS)", "if (false)"),
  M("F-07 allow repeated paragraphs", "if (seenParas.has(key))", "if (false)"),
  M("F-07 allow sibling copies", "if (siblingParas.has(key))", "if (false)"),
  M("F-07 allow sections without evidence", "reasons.push(`section ${s.id} cites no evidence`)", "void 0"),
  M("F-07 allow duplicate section ids", "if (seenIds.has(s.id))", "if (false)"),
  M("F-07 allow malformed sections", 'reasons.push("a content section is malformed")', "void 0"),
  M("F-08 allow future approval", 'else if (approvedDay > asOfDay) reasons.push("approval is dated in the future")', ""),
  M("F-08 allow bad approval date", 'if (approvedDay === null) reasons.push("approval date is missing or not a real date")', "if (false) void 0"),
  M("F-08 allow review after approval", "else if (approvedDay !== null && d > approvedDay)", "else if (false)"),
  M("F-08 allow verification after approval", 'if (approvedDay !== null && verified > approvedDay) return "was verified after the approval date"', ""),
  M("F-08 allow invalid verification date", 'if (verified === null) return "has an invalid verification date"', ""),
  M("approval: allow non-owner", 'if (a.authorization !== "owner")', "if (false)"),
  M("approval: allow other path", "if (a.path !== r.publicPath)", "if (false)"),
  M("approval: allow layout not approved", "if (a.layoutApproved !== true)", "if (false)"),
  M("approval: allow missing reference", "if (!nonEmpty(a.reference))", "if (false)"),
  M("approval: allow missing approver", "if (!nonEmpty(a.approvedBy))", "if (false)"),
  M("approval: allow unapproved status", "if (r.status !== \"approved\")", "if (false)"),
  M("approval: skip cited-evidence validity", "reasons.push(`approval cites evidence ${id} that ${why}`)", "void 0"),
  M("F-09 skip route file check", "m.routeFile !== `app/${r.publicPath.slice(1)}/page.tsx`", "false"),
  M("F-09 skip metadata completeness", "!nonEmpty(m.title) || !nonEmpty(m.description)", "false"),
  M("fail open on gate error", 'return { reasons: ["gate error: failing closed"], page: null, entry: null }', 'return { reasons: [], page: record as never, entry }'),
  M("F-11 no snapshot", "const r = snapshot(record) as any", "const r = record as any"),
]

test("every mutant of the gate is killed by the shared behaviour table (F-10)", () => {
  assert.ok(MUTANTS.length >= 65)
  const dir = mkdtempSync(path.join(tmpdir(), "gate-mutants-"))
  const survivors = []
  const notApplied = []
  try {
    // control: the unmutated source passes everything (guards against a broken harness)
    return (async () => {
      const baseFile = path.join(dir, "base.ts")
      writeFileSync(baseFile, SRC)
      const base = await import(pathToFileURL(baseFile).href)
      assert.deepEqual(W.runCases(base).filter((r) => !r.ok), [])
      for (const [i, m] of MUTANTS.entries()) {
        let mutated = SRC
        let bad = false
        for (const [from, to] of m.edits) {
          const count = mutated.split(from).length - 1
          if (count !== 1) { notApplied.push(`${m.name} (matches ${count})`); bad = true; break }
          mutated = mutated.replace(from, () => to)
        }
        if (bad) continue
        const f = path.join(dir, `m${i}.ts`)
        writeFileSync(f, mutated)
        let killed = false
        try {
          const mod = await import(pathToFileURL(f).href)
          killed = W.runCases(mod).some((r) => !r.ok)
        } catch { killed = true } // a mutant that does not even load is trivially rejected, but report it below
        if (!killed) survivors.push(m.name)
      }
      assert.deepEqual(notApplied, [], "mutations that no longer match the gate source")
      assert.deepEqual(survivors, [], "surviving mutants: a safety check has no test")
    })().finally(() => rmSync(dir, { recursive: true, force: true }))
  } catch (e) { rmSync(dir, { recursive: true, force: true }); throw e }
})
