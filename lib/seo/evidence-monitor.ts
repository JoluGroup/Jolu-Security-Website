// Read-only evidence-freshness checks for the publication gate. PURE: the current date is a parameter, so nothing
// here reads a clock (the script scripts/check-evidence-freshness.mjs supplies it). It changes nothing, publishes
// nothing and unpublishes nothing: it only reports. See docs/seo/evidence-expiry-runbook.md.
//
// Data flow (5D.8): the gate already refuses revoked, superseded-without-citation, licence-without-expiry and
// already-expired evidence as of the committed PUBLICATION_AS_OF. So those conditions can never appear on a page that
// is still "published"; they appear as a record marked "approved" that is NOT publishable. The monitor therefore
// reports them from there, classified by cause, instead of from branches that could not be reached.
//
// Every finding has a stable machine-readable `code`. Severities:
//   ERROR    an actionable fault: an approved record that is not publishable (one finding per cause: REVOKED_EVIDENCE,
//            EXPIRED_EVIDENCE, SUPERSEDED_EVIDENCE, LICENCE_NO_EXPIRY, GATE_REJECTED), a published page that would not
//            pass the gate TODAY, evidence that expired in real time, or PUBLICATION_AS_OF in the future or too old.
//   WARNING  an upcoming risk (evidence or licence expiring, old verification, PUBLICATION_AS_OF close to stale,
//            unused evidence nearing expiry). Fails the run only in strict mode.
//   NOTE     informational (nothing published).
import { getPublishedEvidenceIds, calendarDay, evaluatePublication, publishRecord } from "@/lib/seo/publication-gate"
import { LICENCE_EVIDENCE } from "@/lib/seo/publication-requirements"
import { MAX_AS_OF_AGE_DAYS, type GateDeps } from "@/lib/seo/publication-deps"
import type { EvidenceRecord, PageRecord } from "@/lib/seo/page-models"

export const DEFAULT_WARN_DAYS = 60
export const DEFAULT_LICENCE_WARN_DAYS = 120
export const DEFAULT_VERIFICATION_MAX_AGE_DAYS = 365
const AS_OF_WARN_MARGIN_DAYS = 7

export type FindingCode =
  | "INVALID_DATE" | "NOTHING_PUBLISHED" | "REVOKED_EVIDENCE" | "EXPIRED_EVIDENCE" | "SUPERSEDED_EVIDENCE"
  | "LICENCE_NO_EXPIRY" | "GATE_REJECTED" | "PAGE_FAILS_TODAY" | "AS_OF_FUTURE" | "AS_OF_STALE" | "AS_OF_NEAR_STALE" | "EVIDENCE_EXPIRED_TODAY"
  | "EVIDENCE_EXPIRING" | "LICENCE_EXPIRING" | "EVIDENCE_OLD_VERIFICATION" | "UNUSED_EVIDENCE_EXPIRING" | "INVALID_EXPIRY"
export type Finding = { level: "error" | "warning" | "note"; code: FindingCode; message: string; path?: string; evidenceId?: string }
export type FreshnessReport = { findings: Finding[]; errors: number; warnings: number; publishedPaths: string[] }
/** Process exit status for a report: errors always fail; warnings fail only in strict mode. */
export const exitCodeFor = (r: Pick<FreshnessReport, "errors" | "warnings">, strict: boolean): number => (r.errors > 0 || (strict && r.warnings > 0) ? 1 : 0)
export type FreshnessOptions = {
  records: readonly PageRecord[]
  deps: GateDeps
  /** ISO calendar date of the check (supplied by the caller). */
  today: string
  warnDays?: number
  licenceWarnDays?: number
  verificationMaxAgeDays?: number
}

export function checkEvidenceFreshness(o: FreshnessOptions): FreshnessReport {
  const findings: Finding[] = []
  const add = (level: Finding["level"], code: FindingCode, message: string, extra: { path?: string; evidenceId?: string } = {}) => findings.push({ level, code, message, ...extra })
  const warnDays = o.warnDays ?? DEFAULT_WARN_DAYS
  const licenceWarnDays = o.licenceWarnDays ?? DEFAULT_LICENCE_WARN_DAYS
  const maxVerifyAge = o.verificationMaxAgeDays ?? DEFAULT_VERIFICATION_MAX_AGE_DAYS
  const today = calendarDay(o.today)
  const asOf = calendarDay(o.deps?.asOf)
  const ledger = new Map<string, EvidenceRecord>()
  for (const e of Array.isArray(o.deps?.ledger) ? o.deps.ledger : []) if (e && typeof e.id === "string") ledger.set(e.id, e)
  const done = (publishedPaths: string[]): FreshnessReport => ({ findings, errors: findings.filter((f) => f.level === "error").length, warnings: findings.filter((f) => f.level === "warning").length, publishedPaths })
  if (today === null) {
    add("error", "INVALID_DATE", `today's date "${o.today}" is not a real calendar date`)
    return done([])
  }
  if (asOf === null) {
    add("error", "INVALID_DATE", `PUBLICATION_AS_OF "${o.deps?.asOf}" is not a real calendar date`)
    return done([])
  }

  const records = Array.isArray(o.records) ? o.records : []
  const published: { path: string; record: PageRecord; evidence: readonly string[] }[] = []
  records.forEach((rec, i) => {
    const siblings = records.filter((_, j) => j !== i)
    const page = publishRecord(rec, o.deps, siblings)
    if (page) published.push({ path: page.publicPath, record: rec, evidence: getPublishedEvidenceIds(page) })
    else if ((rec as { status?: string })?.status === "approved") {
      // Approved but refused by the gate. The deployed site (if it was built before the change) may still show it, and
      // the next build will not. Report each cause separately so the right person acts.
      const path = (rec as { publicPath?: string }).publicPath ?? "a record"
      const reasons = evaluatePublication(rec, o.deps, siblings).reasons
      const causes: [FindingCode, RegExp][] = [
        ["REVOKED_EVIDENCE", /\bis revoked\b/],
        ["EXPIRED_EVIDENCE", /\bis expired\b/],
        ["SUPERSEDED_EVIDENCE", /superseded|replacement|current evidence|supersession/],
        ["LICENCE_NO_EXPIRY", /licence evidence without an expiry/],
      ]
      const covered = new Set<string>()
      for (const [code, rx] of causes) {
        const hit = reasons.filter((r) => rx.test(r))
        if (hit.length === 0) continue
        hit.forEach((r) => covered.add(r))
        add("error", code, `${path} is marked approved but is not publishable (${code}): ${hit.slice(0, 3).join("; ")}`, { path })
      }
      const rest = reasons.filter((r) => !covered.has(r))
      if (rest.length > 0 || covered.size === 0) add("error", "GATE_REJECTED", `${path} is marked approved but is not publishable: ${rest.slice(0, 3).join("; ")}`, { path })
    }
  })

  if (published.length === 0) {
    add("note", "NOTHING_PUBLISHED", "No page is published. Nothing relies on evidence, so there is nothing to expire.")
  } else {
    const age = today - asOf
    const paths = published.map((p) => p.path).join(", ")
    if (asOf > today) add("error", "AS_OF_FUTURE", `PUBLICATION_AS_OF ${o.deps.asOf} is in the future (today is ${o.today}). Published: ${paths}`)
    else if (age > MAX_AS_OF_AGE_DAYS) add("error", "AS_OF_STALE", `PUBLICATION_AS_OF ${o.deps.asOf} is ${age} days old (limit ${MAX_AS_OF_AGE_DAYS}). Renew it in a reviewed change. Published: ${paths}`)
    else if (age > MAX_AS_OF_AGE_DAYS - AS_OF_WARN_MARGIN_DAYS) add("warning", "AS_OF_NEAR_STALE", `PUBLICATION_AS_OF ${o.deps.asOf} is ${age} days old and will exceed the ${MAX_AS_OF_AGE_DAYS}-day limit soon`)

    for (const p of published) {
      // Re-decide each published page as of TODAY, not as of the committed date.
      const siblings = records.filter((r) => r !== p.record)
      const now = evaluatePublication(p.record, { ...o.deps, asOf: o.today }, siblings)
      if (!now.published) add("error", "PAGE_FAILS_TODAY", `${p.path} would NOT pass the publication gate today (${o.today}): ${now.reasons.slice(0, 4).join("; ")}`, { path: p.path })

      // Only conditions that can still occur for a page the gate accepted as of the committed date are checked here:
      // revoked, superseded-without-citation and licence-without-expiry are refused by the gate itself (see above).
      for (const id of p.evidence) {
        const e = ledger.get(id)
        if (!e || e.supersededBy) continue // a superseded entry is not current; its replacement is in `evidence` too
        const where = `${p.path} relies on ${id}`
        const licence = LICENCE_EVIDENCE.includes(rootOf(ledger, id))
        if (e.expiresOn) {
          const exp = calendarDay(e.expiresOn)
          if (exp === null) add("error", "INVALID_EXPIRY", `${where}, which has an invalid expiry date "${e.expiresOn}"`, { path: p.path, evidenceId: id })
          else {
            const left = exp - today
            if (left <= 0) add("error", "EVIDENCE_EXPIRED_TODAY", `${where}, which expired on ${e.expiresOn}`, { path: p.path, evidenceId: id })
            else if (left <= warnDays) add("warning", "EVIDENCE_EXPIRING", `${where}, which expires on ${e.expiresOn} (${left} days)`, { path: p.path, evidenceId: id })
            else if (licence && left <= licenceWarnDays) add("warning", "LICENCE_EXPIRING", `${where}: licence-related evidence expires on ${e.expiresOn} (${left} days); management attention needed`, { path: p.path, evidenceId: id })
          }
        }
        const verified = calendarDay(e.verifiedOn)
        if (verified !== null && today - verified > maxVerifyAge) add("warning", "EVIDENCE_OLD_VERIFICATION", `${where}, last verified on ${e.verifiedOn} (${today - verified} days ago)`, { path: p.path, evidenceId: id })
      }
    }
  }

  // Ledger-wide view: entries nobody relies on yet, for planning.
  const relied = new Set(published.flatMap((p) => p.evidence))
  for (const e of ledger.values()) {
    if (relied.has(e.id) || !e.expiresOn) continue
    const exp = calendarDay(e.expiresOn)
    if (exp !== null && exp - today <= warnDays) add("warning", "UNUSED_EVIDENCE_EXPIRING", `unused evidence ${e.id} ${exp <= today ? "expired" : "expires"} on ${e.expiresOn}`, { evidenceId: e.id })
  }
  return done(published.map((p) => p.path))
}

function rootOf(ledger: Map<string, EvidenceRecord>, id: string): string {
  let cur = ledger.get(id)
  const seen = new Set<string>()
  while (cur?.replaces && !seen.has(cur.id)) {
    seen.add(cur.id)
    const prev = ledger.get(cur.replaces)
    if (!prev) break
    cur = prev
  }
  return cur?.id ?? id
}
