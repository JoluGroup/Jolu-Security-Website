// Fail-closed publication gate for service and location pages (Milestone 5D.2).
//
// A page is published only if EVERY check below passes. Any failure, missing value, malformed value or thrown
// error means "not published". There is no environment variable, runtime flag or request input that can publish a
// page. To publish, a reviewer must see a code change that does all of:
//   1. fills the page record (status "approved", approval, content sections) in lib/seo/page-records.ts,
//   2. adds VERIFIED evidence to lib/seo/evidence-ledger.ts,
//   3. approves the claims it uses in lib/claims.ts,
//   4. adds the page's public path to PUBLICATION_ALLOWLIST below, together with its route file.
// and the owner's written authorisation must be referenced in the approval record.
import { CLAIM_RULES } from "@/lib/seo/claim-classifier"
import { EVIDENCE_LEDGER } from "@/lib/seo/evidence-ledger"
import { ALL_PAGE_RECORDS } from "@/lib/seo/page-records"
import type { EvidenceRecord, LocationPageRecord, PageKind, PageRecord, Published, ServicePageRecord } from "@/lib/seo/page-models"
import { PLANNED_PAGES } from "@/lib/seo/planned-pages"
import { CLAIMS, type Claim } from "@/lib/claims"

/**
 * Public paths the owner has authorised for publication. EMPTY: no service or location page is published.
 * Being listed here is necessary but not sufficient: the record, approval, evidence and claims must also pass.
 */
export const PUBLICATION_ALLOWLIST: readonly string[] = []

export type GateDeps = {
  ledger: readonly EvidenceRecord[]
  claims: readonly Claim[]
  allowlist: readonly string[]
}
export const DEFAULT_DEPS: GateDeps = { ledger: EVIDENCE_LEDGER, claims: CLAIMS, allowlist: PUBLICATION_ALLOWLIST }

export type GateDecision = { published: boolean; reasons: readonly string[] }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
const isStringArray = (v: unknown): v is readonly string[] => Array.isArray(v) && v.every((x) => typeof x === "string")
const validDate = (v: unknown) => nonEmpty(v) && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v))
const PATH = /^\/(services|locations)\/[a-z0-9]+(-[a-z0-9]+)*$/

/** Slugs allowed per kind come from the planned-page registry, so "migori" and unknown slugs are never valid. */
export function knownSlugs(kind: PageKind): readonly string[] {
  const prefix = kind === "service" ? "/services/" : "/locations/"
  return PLANNED_PAGES.filter((p) => p.path.startsWith(prefix)).map((p) => p.path.slice(prefix.length).replace(/\/$/, ""))
}

function verified(id: string, deps: GateDeps): boolean {
  const e = deps.ledger.find((x) => x.id === id)
  return Boolean(e) && e!.status === "VERIFIED" && nonEmpty(e!.verifiedBy) && validDate(e!.verifiedOn) && nonEmpty(e!.document)
}

function approvedClaim(id: string, deps: GateDeps): boolean {
  const c = deps.claims.find((x) => x.id === id)
  return Boolean(c) && c!.status === "approved" && nonEmpty(c!.evidence)
}

const CLAIM_SENSITIVE = CLAIM_RULES.filter((r) => r.category !== "pricing").map((r) => r.pattern)

/** Evaluates one record. Pure and deterministic: the same inputs always give the same decision. Never throws. */
export function evaluatePublication(record: unknown, deps: GateDeps = DEFAULT_DEPS): GateDecision {
  const reasons: string[] = []
  try {
    const r = record as PageRecord | null | undefined
    if (!r || typeof r !== "object") return { published: false, reasons: ["record is missing or not an object"] }

    if (!deps || !Array.isArray(deps.ledger) || !Array.isArray(deps.claims) || !Array.isArray(deps.allowlist)) reasons.push("gate dependencies are malformed")

    // Identity
    if (r.kind !== "service" && r.kind !== "location") reasons.push("kind is not service or location")
    if (!nonEmpty(r.publicPath) || !PATH.test(r.publicPath)) reasons.push("publicPath is missing or malformed")
    else {
      const [, , slug] = r.publicPath.split("/")
      if (r.kind === "service" || r.kind === "location") {
        if (!knownSlugs(r.kind).includes(slug)) reasons.push("slug is not a planned page")
        if (!r.publicPath.startsWith(r.kind === "service" ? "/services/" : "/locations/")) reasons.push("path does not match kind")
        if (r.slug !== slug) reasons.push("slug does not match publicPath")
      }
      if (r.plannedPath !== `${r.publicPath}/`) reasons.push("plannedPath does not match publicPath")
      if (!PLANNED_PAGES.some((p) => p.path === r.plannedPath)) reasons.push("no planned page in the keyword registry")
      if (!Array.isArray(deps.allowlist) || !deps.allowlist.includes(r.publicPath)) reasons.push("path is not in PUBLICATION_ALLOWLIST")
    }

    // Status and approval
    if (r.status !== "approved") reasons.push('status is not "approved"')
    const a = r.approval
    if (!a || typeof a !== "object") reasons.push("no approval record")
    else {
      if (a.authorization !== "owner") reasons.push("approval is not an owner authorisation")
      if (!nonEmpty(a.approvedBy)) reasons.push("approval has no approver")
      if (!validDate(a.approvedOn)) reasons.push("approval date is missing or invalid")
      if (!nonEmpty(a.reference)) reasons.push("approval has no written reference")
      if (a.path !== r.publicPath) reasons.push("approval is for a different path")
      if (a.layoutApproved !== true) reasons.push("page layout is not approved")
      if (!isStringArray(a.evidenceIds) || a.evidenceIds.length === 0) reasons.push("approval references no evidence")
      if (!isStringArray(a.claimIds)) reasons.push("approval claim list is malformed")
    }

    // Evidence: everything required and everything the page uses must be VERIFIED and covered by the approval
    if (!isStringArray(r.requiredEvidence) || r.requiredEvidence.length === 0) reasons.push("page has no required evidence list")
    if (!isStringArray(r.evidenceRefs)) reasons.push("evidenceRefs is malformed")
    if (!isStringArray(r.claimRefs)) reasons.push("claimRefs is malformed")
    if (!Array.isArray(r.sections)) reasons.push("sections is malformed")
    {
      const sectionEvidence = (Array.isArray(r.sections) ? r.sections : []).flatMap((s) => (isStringArray(s?.evidenceIds) ? s.evidenceIds : []))
      const locationEvidence =
        r.kind === "location" ? [...(isStringArray(r.napEvidenceIds) ? r.napEvidenceIds : []), ...(isStringArray(r.verifiedCoverage?.evidenceIds) ? r.verifiedCoverage.evidenceIds : [])] : []
      const needed = [...new Set([...(isStringArray(r.requiredEvidence) ? r.requiredEvidence : []), ...(isStringArray(r.evidenceRefs) ? r.evidenceRefs : []), ...sectionEvidence, ...locationEvidence])]
      for (const id of needed) {
        if (!verified(id, deps)) reasons.push(`evidence ${id} is not VERIFIED in the ledger`)
        if (a && isStringArray(a.evidenceIds) && !a.evidenceIds.includes(id)) reasons.push(`approval does not reference evidence ${id}`)
      }
      for (const id of a && isStringArray(a.evidenceIds) ? a.evidenceIds : []) if (!verified(id, deps)) reasons.push(`approval cites unverified evidence ${id}`)
    }

    // Claims
    const sectionClaims = (Array.isArray(r.sections) ? r.sections : []).flatMap((s) => (isStringArray(s?.claimIds) ? s.claimIds : []))
    for (const id of new Set([...(isStringArray(r.claimRefs) ? r.claimRefs : []), ...sectionClaims])) {
      if (!approvedClaim(id, deps)) reasons.push(`claim ${id} is not approved with evidence`)
      if (a && isStringArray(a.claimIds) && !a.claimIds.includes(id)) reasons.push(`approval does not reference claim ${id}`)
    }

    // Content: a section needs its own evidence, and claim-sensitive wording needs an approved claim on that section
    for (const s of Array.isArray(r.sections) ? r.sections : []) {
      if (!s || !nonEmpty(s.id) || !nonEmpty(s.heading) || !isStringArray(s.body) || s.body.length === 0) {
        reasons.push("a content section is malformed")
        continue
      }
      if (!isStringArray(s.evidenceIds) || s.evidenceIds.length === 0) reasons.push(`section ${s.id} cites no evidence`)
      const text = `${s.heading} ${s.body.join(" ")}`
      if (CLAIM_SENSITIVE.some((p) => p.test(text)) && !(isStringArray(s.claimIds) && s.claimIds.length > 0)) reasons.push(`section ${s.id} uses claim-sensitive wording without an approved claim`)
    }

    // Locations: NAP and coverage must be evidenced
    if (r.kind === "location") {
      if (!isStringArray(r.napEvidenceIds) || r.napEvidenceIds.length === 0) reasons.push("location has no NAP evidence")
      if (!r.nap || !nonEmpty(r.nap.officeName)) reasons.push("location has no office reference")
    }
  } catch {
    return { published: false, reasons: ["gate error: failing closed"] }
  }
  return reasons.length === 0 ? { published: true, reasons: [] } : { published: false, reasons: [...new Set(reasons)] }
}

export function isPublished(record: unknown, deps: GateDeps = DEFAULT_DEPS): record is Published<PageRecord> {
  return evaluatePublication(record, deps).published
}

const RECORDS = ALL_PAGE_RECORDS as readonly PageRecord[]

export function getPublishedServicePages(records: readonly PageRecord[] = RECORDS, deps: GateDeps = DEFAULT_DEPS): readonly Published<ServicePageRecord>[] {
  return records.filter((r): r is Published<ServicePageRecord> => r?.kind === "service" && isPublished(r, deps))
}
export function getPublishedLocationPages(records: readonly PageRecord[] = RECORDS, deps: GateDeps = DEFAULT_DEPS): readonly Published<LocationPageRecord>[] {
  return records.filter((r): r is Published<LocationPageRecord> => r?.kind === "location" && isPublished(r, deps))
}
export function getPublishedPages(records: readonly PageRecord[] = RECORDS, deps: GateDeps = DEFAULT_DEPS): readonly Published<PageRecord>[] {
  return [...getPublishedServicePages(records, deps), ...getPublishedLocationPages(records, deps)]
}

/** The only lookup a route may use: unknown, unplanned or unpublished slugs all return null (the route then calls notFound()). */
export function getPublishedPage(kind: PageKind, slug: unknown, records: readonly PageRecord[] = RECORDS, deps: GateDeps = DEFAULT_DEPS): Published<PageRecord> | null {
  if (typeof slug !== "string") return null
  return getPublishedPages(records, deps).find((p) => p.kind === kind && p.slug === slug) ?? null
}

/** For generateStaticParams of a future route: published slugs only (empty today, so a route must not be added until a page is published). */
export function publishedSlugs(kind: PageKind, records: readonly PageRecord[] = RECORDS, deps: GateDeps = DEFAULT_DEPS): readonly string[] {
  return getPublishedPages(records, deps).filter((p) => p.kind === kind).map((p) => p.slug)
}

/** Public paths for the sitemap. */
export function publishedPagePaths(records: readonly PageRecord[] = RECORDS, deps: GateDeps = DEFAULT_DEPS): readonly string[] {
  return getPublishedPages(records, deps).map((p) => p.publicPath)
}

/** Links for navigation. Nothing in the frozen navbar or footer calls this; a future owner-approved change may. */
export function getPublishedNavLinks(records: readonly PageRecord[] = RECORDS, deps: GateDeps = DEFAULT_DEPS): readonly { href: string; label: string }[] {
  return getPublishedPages(records, deps).map((p) => ({ href: p.publicPath, label: p.kind === "service" ? p.serviceId : p.nap.officeName }))
}
