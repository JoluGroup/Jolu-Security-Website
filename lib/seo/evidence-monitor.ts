// Read-only evidence-freshness checks for the publication gate. PURE: the current date is a parameter, so nothing
// here reads a clock (the script scripts/check-evidence-freshness.mjs supplies it). It changes nothing, publishes
// nothing and unpublishes nothing: it only reports. See docs/seo/evidence-expiry-runbook.md.
//
// What it reports:
//   ERROR    a published page no longer passes the gate as of TODAY (expired, revoked, superseded, inconsistent ...),
//            or PUBLICATION_AS_OF is in the future or older than MAX_AS_OF_AGE_DAYS while pages are published,
//            or published evidence is expired, revoked, or superseded without the approval citing the replacement.
//   WARNING  evidence a published page relies on expires soon, licence-related evidence nears expiry, verification
//            is old, PUBLICATION_AS_OF is close to stale, or an "approved" record is not publishable.
//   NOTE     informational (nothing published).
import { getPublishedEvidenceIds, calendarDay, evaluatePublication, publishRecord } from "@/lib/seo/publication-gate"
import { LICENCE_EVIDENCE } from "@/lib/seo/publication-requirements"
import { MAX_AS_OF_AGE_DAYS, type GateDeps } from "@/lib/seo/publication-deps"
import type { EvidenceRecord, PageRecord } from "@/lib/seo/page-models"

export const DEFAULT_WARN_DAYS = 60
export const DEFAULT_LICENCE_WARN_DAYS = 120
export const DEFAULT_VERIFICATION_MAX_AGE_DAYS = 365
const AS_OF_WARN_MARGIN_DAYS = 7

export type Finding = { level: "error" | "warning" | "note"; message: string }
export type FreshnessReport = { findings: Finding[]; errors: number; warnings: number; publishedPaths: string[] }
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
  const add = (level: Finding["level"], message: string) => findings.push({ level, message })
  const warnDays = o.warnDays ?? DEFAULT_WARN_DAYS
  const licenceWarnDays = o.licenceWarnDays ?? DEFAULT_LICENCE_WARN_DAYS
  const maxVerifyAge = o.verificationMaxAgeDays ?? DEFAULT_VERIFICATION_MAX_AGE_DAYS
  const today = calendarDay(o.today)
  const asOf = calendarDay(o.deps?.asOf)
  const ledger = new Map<string, EvidenceRecord>()
  for (const e of Array.isArray(o.deps?.ledger) ? o.deps.ledger : []) if (e && typeof e.id === "string") ledger.set(e.id, e)
  const done = (publishedPaths: string[]): FreshnessReport => ({ findings, errors: findings.filter((f) => f.level === "error").length, warnings: findings.filter((f) => f.level === "warning").length, publishedPaths })
  if (today === null) {
    add("error", `today's date "${o.today}" is not a real calendar date`)
    return done([])
  }
  if (asOf === null) {
    add("error", `PUBLICATION_AS_OF "${o.deps?.asOf}" is not a real calendar date`)
    return done([])
  }

  const records = Array.isArray(o.records) ? o.records : []
  const published: { path: string; record: PageRecord; evidence: readonly string[] }[] = []
  records.forEach((rec, i) => {
    const siblings = records.filter((_, j) => j !== i)
    const page = publishRecord(rec, o.deps, siblings)
    if (page) published.push({ path: page.publicPath, record: rec, evidence: getPublishedEvidenceIds(page) })
    else if ((rec as { status?: string })?.status === "approved") {
      const why = evaluatePublication(rec, o.deps, siblings).reasons.slice(0, 3).join("; ")
      add("warning", `${(rec as { publicPath?: string }).publicPath ?? "a record"} is marked approved but is not publishable: ${why}`)
    }
  })

  if (published.length === 0) {
    add("note", "No page is published. Nothing relies on evidence, so there is nothing to expire.")
  } else {
    const age = today - asOf
    if (asOf > today) add("error", `PUBLICATION_AS_OF ${o.deps.asOf} is in the future (today is ${o.today}). Published: ${published.map((p) => p.path).join(", ")}`)
    else if (age > MAX_AS_OF_AGE_DAYS) add("error", `PUBLICATION_AS_OF ${o.deps.asOf} is ${age} days old (limit ${MAX_AS_OF_AGE_DAYS}). Renew it in a reviewed change. Published: ${published.map((p) => p.path).join(", ")}`)
    else if (age > MAX_AS_OF_AGE_DAYS - AS_OF_WARN_MARGIN_DAYS) add("warning", `PUBLICATION_AS_OF ${o.deps.asOf} is ${age} days old and will exceed the ${MAX_AS_OF_AGE_DAYS}-day limit soon`)

    for (const p of published) {
      // Re-decide each published page as of TODAY, not as of the committed date.
      const siblings = records.filter((r) => r !== p.record)
      const now = evaluatePublication(p.record, { ...o.deps, asOf: o.today }, siblings)
      if (!now.published) add("error", `${p.path} would NOT pass the publication gate today (${o.today}): ${now.reasons.slice(0, 4).join("; ")}`)

      const approvalIds: readonly string[] = (p.record as { approval?: { evidenceIds?: readonly string[] } }).approval?.evidenceIds ?? []
      for (const id of p.evidence) {
        const e = ledger.get(id)
        if (!e) continue
        const where = `${p.path} relies on ${id}`
        if (e.supersededBy) {
          // A replaced entry is no longer current: the approval must cite the entry that replaced it.
          const tail = currentEntry(ledger, id)
          if (!tail || !approvalIds.includes(tail.id)) add("error", `${where}, which is superseded by ${e.supersededBy}; the approval does not cite the current entry`)
          continue
        }
        if (e.revokedOn) add("error", `${where}, which was revoked on ${e.revokedOn}`)
        const licence = LICENCE_EVIDENCE.includes(rootOf(ledger, id))
        if (e.expiresOn) {
          const exp = calendarDay(e.expiresOn)
          if (exp === null) add("error", `${where}, which has an invalid expiry date "${e.expiresOn}"`)
          else {
            const left = exp - today
            if (left <= 0) add("error", `${where}, which expired on ${e.expiresOn}`)
            else if (left <= warnDays) add("warning", `${where}, which expires on ${e.expiresOn} (${left} days)`)
            else if (licence && left <= licenceWarnDays) add("warning", `${where}: licence-related evidence expires on ${e.expiresOn} (${left} days); management attention needed`)
          }
        } else if (licence) add("error", `${where}: licence-related evidence has no expiry date`)
        const verified = calendarDay(e.verifiedOn)
        if (verified !== null && today - verified > maxVerifyAge) add("warning", `${where}, last verified on ${e.verifiedOn} (${today - verified} days ago)`)
      }
    }
  }

  // Ledger-wide view: entries nobody relies on yet, for planning.
  const relied = new Set(published.flatMap((p) => p.evidence))
  for (const e of ledger.values()) {
    if (relied.has(e.id) || !e.expiresOn) continue
    const exp = calendarDay(e.expiresOn)
    if (exp !== null && exp - today <= warnDays) add("warning", `unused evidence ${e.id} ${exp <= today ? "expired" : "expires"} on ${e.expiresOn}`)
  }
  return done(published.map((p) => p.path))
}

function currentEntry(ledger: Map<string, EvidenceRecord>, id: string): EvidenceRecord | null {
  let cur = ledger.get(id)
  const seen = new Set<string>()
  while (cur?.supersededBy) {
    if (seen.has(cur.id)) return null
    seen.add(cur.id)
    cur = ledger.get(cur.supersededBy)
  }
  return cur ?? null
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
