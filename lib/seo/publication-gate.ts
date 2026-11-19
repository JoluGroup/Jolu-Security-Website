// Fail-closed publication gate for service and location pages (hardened in Milestone 5D.4).
//
// A page is published only if EVERY check passes. Any failure, missing value, malformed value or thrown error means
// "not published". Nothing in the environment, a request or a runtime flag can publish a page. To publish, a
// reviewer must see ONE code change that:
//   1. fills the page record (status "approved", approval, content sections, NAP) in lib/seo/page-records.ts,
//   2. adds VERIFIED, unexpired evidence to lib/seo/evidence-ledger.ts,
//   3. approves the claims it uses in lib/claims.ts (and binds them per statement in the approval),
//   4. adds the page to lib/seo/publication-manifest.ts together with its static route file and metadata,
// and the owner's written authorisation must be referenced in the approval record.
//
// The gate works on a frozen snapshot of the record, so a record that changes between reads cannot pass. Pages it
// approves are frozen snapshots registered in a private WeakSet: components accept only those (`assertPublished`).
import { CLAIM_RULES } from "@/lib/seo/claim-classifier"
import { CATEGORY, CLAIM_SCOPE } from "@/lib/seo/claim-scope"
import { sha256Hex } from "@/lib/seo/digest"
import { deepFreeze, snapshot } from "@/lib/seo/freeze"
import { ALL_PAGE_RECORDS } from "@/lib/seo/page-records"
import type { EvidenceRecord, PageKind, PageRecord, Published } from "@/lib/seo/page-models"
import { PLANNED_PAGES } from "@/lib/seo/planned-pages"
import { defaultDeps, type GateDeps } from "@/lib/seo/publication-deps"
import type { ManifestEntry } from "@/lib/seo/publication-manifest"
import { DESIGNATION_WORDS, DESIGNATIONS, LOCATION_IDENTITY, PHONE_ATTESTATION_KEY, REQUIRED_EVIDENCE, rootRequirements, SERVICE_IDENTITY, type EvidenceRequirements } from "@/lib/seo/publication-requirements"
import { textProblem } from "@/lib/seo/text-policy"
import { SERVICES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

export type { GateDeps }
export type GateDecision = { published: boolean; reasons: readonly string[] }

// ---------------------------------------------------------------------------------------------------- primitives
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
const isStringArray = (v: unknown): v is readonly string[] => Array.isArray(v) && v.every((x) => typeof x === "string")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isObj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v)
const PATH = /^\/(services|locations)\/[a-z0-9]+(-[a-z0-9]+)*$/
const ROUTE_FILE = /^app\/(services|locations)\/[a-z0-9]+(-[a-z0-9]+)*\/page\.tsx$/
const ID = /^[A-Z0-9]+(-[A-Z0-9]+)+$/
const STATUSES = ["VERIFIED", "PROVISIONAL", "CONFLICTED", "MISSING", "NOT APPLICABLE"]
const MIN_WORDS = 12 // content-integrity floor (a sentence, not a stub). It is not a search-engine ranking requirement.

/** A real calendar date (rejects 2026-02-30, month 13, year 0000) in 2000-2100. Returns epoch days or null. */
export function calendarDay(v: unknown): number | null {
  if (typeof v !== "string") return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (y < 2000 || y > 2100) return null
  const t = Date.UTC(y, mo - 1, d)
  const back = new Date(t)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  return t / 86_400_000
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()

/** Slugs allowed per kind come from the planned-page registry, so "migori" and unknown slugs are never valid. */
export function knownSlugs(kind: PageKind): readonly string[] {
  const prefix = kind === "service" ? "/services/" : "/locations/"
  return PLANNED_PAGES.filter((p) => p.path.startsWith(prefix)).map((p) => p.path.slice(prefix.length).replace(/\/$/, ""))
}

// ---------------------------------------------------------------------------------------------------- claim scan
// Heuristic detection of claim-sensitive wording. It is a safety net, NOT proof that text is free of claims or true:
// wording the rules do not recognise is controlled only by editorial and compliance review. The control that matters is
// that every span the rules DO find must be authorised by a bound, approved claim whose scope (lib/seo/claim-scope.ts)
// permits that span. Text is first required to pass lib/seo/text-policy.ts, so the scan sees exactly what is rendered.
const EXTRA_CLAIM_PATTERNS: readonly { category: string; pattern: RegExp }[] = [
  { category: CATEGORY.availability, pattern: /\b24\s?x\s?7\b/i },
  { category: CATEGORY.availability, pattern: /\btwenty[- ]four\b/i },
  { category: CATEGORY.recognition, pattern: /\b(award|awarded|awards|award-winning)\b/i },
  { category: CATEGORY.coverage, pattern: /\b(nationwide|countrywide)\b/i },
  { category: CATEGORY.quality, pattern: /\b(market leader|leader|foremost|unrivalled|unmatched)\b/i },
  // Ranking claims. "#1" cannot sit behind \b (no word boundary between a space and "#"), so it has its own pattern with
  // lookarounds; "#10" and "x#1" do not match. "Gate number 1" style site references are not claims.
  { category: CATEGORY.quality, pattern: /(?<![\w#])#\s?1(?!\d)/i },
  { category: CATEGORY.quality, pattern: /\bno\.\s?1(?!\d)/i },
  { category: CATEGORY.quality, pattern: /\bno\s1\b(?=\s+(?:in|choice|provider|company|firm|security|ranked|guard))/i },
  { category: CATEGORY.quality, pattern: /(?<!\b(?:gate|post|bay|unit|room|floor|door|camera|zone|entrance|channel)\s)\bnumber\s+(?:one|1)(?!\d)/i },
  { category: CATEGORY.licensing, pattern: /\b(approved|authori[sz]ed|bonded|insured|iso ?\d+)\b/i },
  { category: CATEGORY.statistics, pattern: /\b(over|more than)\s+[\d,]+\+?\s+(clients|customers|guards|sites|years)\b/i },
  { category: CATEGORY.statistics, pattern: /\b\d[\d,]*\+\s*(clients|customers|guards|sites|years)\b/i },
  { category: CATEGORY.statistics, pattern: /\bsince\s+(19|20)\d{2}\b/i },
  { category: CATEGORY.guarantee, pattern: /\b(guarantee|guarantees|guaranteed|warranty)\b/i },
  { category: CATEGORY.designation, pattern: /\b(head ?office|head ?quarters?|hq|main office|corporate office|flagship|showroom)\b/i },
]
const SCAN = [...CLAIM_RULES.map((r) => ({ category: String(r.category), pattern: r.pattern })), ...EXTRA_CLAIM_PATTERNS].map((r) => ({ category: r.category, re: new RegExp(r.pattern.source, r.pattern.flags.includes("g") ? r.pattern.flags : `${r.pattern.flags}g`) }))

type Span = { from: number; to: number; category: string; text: string }
/** Claim-sensitive spans in `text`. */
function spansOf(text: string): Span[] {
  const out: Span[] = []
  for (const { category, re } of SCAN) {
    re.lastIndex = 0
    for (let m = re.exec(text); m; m = re.exec(text)) {
      out.push({ from: m.index, to: m.index + Math.max(m[0].length, 1), category, text: m[0] })
      if (m[0].length === 0) re.lastIndex++
    }
  }
  return out
}
const hasSensitive = (text: string) => spansOf(text).length > 0
/** Does the claim's explicit scope permit this span? Unknown claim ids permit nothing. */
function permits(claimId: string, span: Span): boolean {
  const scope = Object.hasOwn(CLAIM_SCOPE, claimId) ? CLAIM_SCOPE[claimId] : undefined
  if (!scope || !scope.categories.includes(span.category)) return false
  return !scope.terms || scope.terms.some((t) => t.test(span.text))
}

// ---------------------------------------------------------------------------------------------------- reviewed content
/**
 * Deterministic digest of everything a reviewer approves: text, claim bindings, NAP, coverage, evidence references and
 * the page metadata. Editorial and compliance reviews must carry this value; any later change voids them.
 */
export function contentDigest(record: unknown, entry: { title?: unknown; description?: unknown } | null): string {
  const r = (isObj(record) ? record : {}) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  const nap = isObj(r.nap) ? r.nap : null
  const cov = isObj(r.verifiedCoverage) ? r.verifiedCoverage : null
  const sections = Array.isArray(r.sections) ? r.sections : []
  const content = {
    path: r.publicPath ?? null,
    title: entry?.title ?? null,
    description: entry?.description ?? null,
    evidenceRefs: Array.isArray(r.evidenceRefs) ? r.evidenceRefs : [],
    sections: sections.map((s: any) => ({ id: s?.id ?? null, heading: s?.heading ?? null, body: s?.body ?? null, evidenceIds: s?.evidenceIds ?? null, claims: Array.isArray(s?.claims) ? s.claims.map((c: any) => ({ claimId: c?.claimId ?? null, statement: c?.statement ?? null })) : null })), // eslint-disable-line @typescript-eslint/no-explicit-any
    nap: nap ? { displayName: nap.displayName ?? null, branchDesignation: nap.branchDesignation ?? null, streetAddress: nap.streetAddress ?? null, locality: nap.locality ?? null, telephone: nap.telephone ?? null } : null,
    coverage: cov ? { serviceIds: cov.serviceIds ?? null, areas: cov.areas ?? null, evidenceIds: cov.evidenceIds ?? null } : null,
  }
  return sha256Hex(JSON.stringify(content))
}

// ---------------------------------------------------------------------------------------------------- ledger
type Ledger = { byId: Map<string, EvidenceRecord>; problems: string[] }
const MAX_CHAIN = 16

function indexLedger(ledger: readonly unknown[]): Ledger {
  const byId = new Map<string, EvidenceRecord>()
  const problems: string[] = []
  for (const raw of ledger) {
    if (!isObj(raw) || !nonEmpty(raw.id) || !ID.test(raw.id)) {
      problems.push("ledger contains an entry without a valid id")
      continue
    }
    if (byId.has(raw.id)) {
      problems.push(`duplicate evidence id ${raw.id}`)
      continue
    }
    byId.set(raw.id, raw as unknown as EvidenceRecord)
  }
  for (const e of byId.values()) {
    if (e.supersededBy != null) {
      const r = byId.get(e.supersededBy)
      if (!r || r.replaces !== e.id) problems.push(`evidence ${e.id} names a replacement that does not replace it`)
      else if (r.scope !== e.scope) problems.push(`evidence ${e.id} and its replacement have different scopes`)
    }
    if (e.replaces != null) {
      const t = byId.get(e.replaces)
      if (!t || t.supersededBy !== e.id) problems.push(`evidence ${e.id} replaces an entry that does not name it`)
    }
    // circular or runaway supersession chains
    const seen = new Set<string>()
    let cur: EvidenceRecord | undefined = e
    while (cur && cur.supersededBy != null) {
      if (seen.has(cur.id) || seen.size > MAX_CHAIN) {
        problems.push(`evidence ${e.id} has a circular or over-long supersession chain`)
        break
      }
      seen.add(cur.id)
      cur = byId.get(cur.supersededBy)
    }
  }
  return { byId, problems }
}

/** Follows supersession to the CURRENT entry. Every comparison of attested values and every usability check uses it. */
function currentOf(byId: Map<string, EvidenceRecord>, id: string): { tail: EvidenceRecord } | { problem: string } {
  let cur = byId.get(id)
  if (!cur) return { problem: "is not in the ledger" }
  const seen = new Set<string>()
  while (cur.supersededBy != null) {
    if (seen.has(cur.id) || seen.size > MAX_CHAIN) return { problem: "has a circular or over-long supersession chain" }
    seen.add(cur.id)
    const next = byId.get(cur.supersededBy)
    if (!next || next.replaces !== cur.id) return { problem: "names a replacement that does not replace it" }
    cur = next
  }
  return { tail: cur }
}
/** The code the evidence was registered under: follows `replaces` back to the original id. */
function rootIdOf(byId: Map<string, EvidenceRecord>, id: string): string {
  let cur = byId.get(id)
  const seen = new Set<string>()
  while (cur && cur.replaces != null && !seen.has(cur.id) && seen.size <= MAX_CHAIN) {
    seen.add(cur.id)
    const prev = byId.get(cur.replaces)
    if (!prev) break
    cur = prev
  }
  return cur?.id ?? id
}

/** Why an entry cannot be used on `approvedOn` (null if usable). */
function unusable(e: EvidenceRecord | undefined, asOfDay: number, approvedDay: number | null, req: EvidenceRequirements): string | null {
  if (!e) return "is not in the ledger"
  const keys = ["status", "verifiedBy", "verifiedOn", "document", "expiresOn", "revokedOn", "supersededBy", "replaces", "attested", "scope"]
  if (!isObj(e) || keys.some((k) => !Object.hasOwn(e, k))) return "has missing verification metadata"
  if (!STATUSES.includes(e.status)) return "has an invalid status"
  if (e.status !== "VERIFIED") return `is ${e.status}, not VERIFIED`
  if (!nonEmpty(e.verifiedBy)) return "has no verifier"
  if (!nonEmpty(e.document)) return "has no independent document"
  const verified = calendarDay(e.verifiedOn)
  if (verified === null) return "has an invalid verification date"
  if (verified > asOfDay) return "is dated in the future"
  if (approvedDay !== null && verified > approvedDay) return "was verified after the approval date"
  if (e.revokedOn !== null) return "is revoked"
  if (e.supersededBy !== null) return "is superseded"
  if (e.expiresOn !== null) {
    const exp = calendarDay(e.expiresOn)
    if (exp === null) return "has an invalid expiry date"
    if (exp <= asOfDay || (approvedDay !== null && exp <= approvedDay)) return "is expired"
  } else if (req.expiryRequired) return "is licence evidence without an expiry date"
  if (e.attested !== null && !(isObj(e.attested) && Object.values(e.attested).every((v) => typeof v === "string"))) return "has malformed attested values"
  return null
}

// ---------------------------------------------------------------------------------------------------- published registry
type PublishedMeta = { entry: ManifestEntry; evidence: readonly string[] }
const PUBLISHED_SNAPSHOTS = new WeakMap<object, PublishedMeta>()

/** True only for objects produced by this module's gate. A TypeScript cast cannot create one. */
export function isPublishedSnapshot(page: unknown): page is Published<PageRecord> {
  return typeof page === "object" && page !== null && PUBLISHED_SNAPSHOTS.has(page)
}
export function assertPublished<T extends PageRecord>(page: unknown): asserts page is Published<T> {
  if (!isPublishedSnapshot(page)) throw new Error("Refusing to render a page that did not pass the publication gate")
}
export function getManifestEntry(page: unknown): ManifestEntry | null {
  return isPublishedSnapshot(page) ? (PUBLISHED_SNAPSHOTS.get(page)?.entry ?? null) : null
}
/** Every evidence id (current entries and the ids the approval cites) a published page relies on. Used by the expiry monitor. */
export function getPublishedEvidenceIds(page: unknown): readonly string[] {
  return isPublishedSnapshot(page) ? (PUBLISHED_SNAPSHOTS.get(page)?.evidence ?? []) : []
}

// ---------------------------------------------------------------------------------------------------- evaluation
type Result = { reasons: string[]; page: Published<PageRecord> | null; entry: ManifestEntry | null; evidence: string[] }

function evaluate(record: unknown, rawDeps: GateDeps, siblings: readonly unknown[]): Result {
  const reasons: string[] = []
  const fail = (): Result => ({ reasons: [...new Set(reasons)], page: null, entry: null, evidence: [] })
  let entry: ManifestEntry | null = null
  const evidence = new Set<string>()
  try {
    const r = snapshot(record) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!isObj(r)) return { reasons: ["record is missing or not an object"], page: null, entry: null, evidence: [] }

    // Dependencies: judged on a frozen copy taken once, so getters, proxies, inherited fields and later mutation cannot
    // change what is authorised. A dependency that cannot be copied as plain data fails closed.
    let deps: GateDeps
    try {
      deps = snapshot(rawDeps)
    } catch {
      return { reasons: ["gate dependencies are malformed"], page: null, entry: null, evidence: [] }
    }
    // Sibling records are judged on a frozen copy too (getters, proxies and later mutation cannot skip or change the
    // duplicate-text check); a sibling list that cannot be copied as plain data fails closed.
    let sibs: readonly unknown[]
    try {
      sibs = snapshot(siblings)
      if (!Array.isArray(sibs)) throw new Error("siblings is not a list")
    } catch {
      return { reasons: ["sibling records are malformed"], page: null, entry: null, evidence: [] }
    }
    const depsOk = isObj(deps) && Array.isArray(deps.ledger) && Array.isArray(deps.claims) && Array.isArray(deps.manifest)
    const asOfDay = depsOk ? calendarDay(deps.asOf) : null
    if (!depsOk || asOfDay === null) {
      reasons.push("gate dependencies are malformed")
      return fail()
    }
    const ledger = indexLedger(deps.ledger)
    reasons.push(...ledger.problems)

    // Identity
    if (r.kind !== "service" && r.kind !== "location") reasons.push("kind is not service or location")
    let slug = ""
    if (!nonEmpty(r.publicPath) || !PATH.test(r.publicPath)) reasons.push("publicPath is missing or malformed")
    else {
      slug = r.publicPath.split("/")[2]
      const prefix = r.kind === "service" ? "/services/" : r.kind === "location" ? "/locations/" : ""
      if (!prefix || !r.publicPath.startsWith(prefix)) reasons.push("path does not match kind")
      else if (!knownSlugs(r.kind).includes(slug)) reasons.push("slug is not a planned page")
      if (r.slug !== slug) reasons.push("slug does not match publicPath")
      if (r.plannedPath !== `${r.publicPath}/` || !PLANNED_PAGES.some((p) => p.path === r.plannedPath)) reasons.push("plannedPath does not match publicPath or the keyword registry")
      if (r.kind === "service") {
        const id = (SERVICE_IDENTITY as Record<string, { serviceId: string }>)[slug]
        if (!id || r.serviceId !== id.serviceId || !SERVICES.some((s) => s.id === r.serviceId)) reasons.push("serviceId does not match the planned service")
      }
      if (r.kind === "location") {
        const id = (LOCATION_IDENTITY as Record<string, { officeName: string }>)[slug]
        if (!id || r.locationId !== slug) reasons.push("locationId does not match the planned location")
        if (!id || r.officeName !== id.officeName || !siteConfig.offices.some((o) => o.name === r.officeName)) reasons.push("office identity does not match the planned location")
      }
      // Manifest: route and metadata configuration must exist
      const m = deps.manifest.find((x) => isObj(x) && (x as ManifestEntry).publicPath === r.publicPath) as ManifestEntry | undefined
      if (!m) reasons.push("page is not in the publication manifest")
      else {
        if (typeof m.routeFile !== "string" || !ROUTE_FILE.test(m.routeFile) || m.routeFile !== `app/${r.publicPath.slice(1)}/page.tsx`) reasons.push("manifest route file is missing or wrong")
        if (!nonEmpty(m.title) || !nonEmpty(m.description)) reasons.push("manifest metadata is incomplete")
        else {
          for (const [label, t] of [["title", m.title], ["description", m.description]] as const) {
            const bad = textProblem(t)
            if (bad) reasons.push(`manifest ${label} ${bad}`)
          }
          if (hasSensitive(m.title) || hasSensitive(m.description)) reasons.push("manifest metadata contains claim-sensitive wording")
        }
        entry = { publicPath: m.publicPath, routeFile: m.routeFile, title: m.title, description: m.description }
      }
    }
    const pageScope = r.kind === "service" ? `service:${slug}` : `office:${slug}`
    const digest = entry ? contentDigest(r, entry) : null

    // Status and approval
    if (r.status !== "approved") reasons.push('status is not "approved"')
    const a = r.approval
    let approvedDay: number | null = null
    if (!isObj(a)) reasons.push("no approval record")
    else {
      if (a.authorization !== "owner") reasons.push("approval is not an owner authorisation")
      if (!nonEmpty(a.approvedBy)) reasons.push("approval has no approver")
      if (!nonEmpty(a.reference)) reasons.push("approval has no written reference")
      if (a.path !== r.publicPath) reasons.push("approval is for a different path")
      if (a.layoutApproved !== true) reasons.push("page layout is not approved")
      approvedDay = calendarDay(a.approvedOn)
      if (approvedDay === null) reasons.push("approval date is missing or not a real date")
      else if (approvedDay > asOfDay) reasons.push("approval is dated in the future")
      if (!isStringArray(a.evidenceIds) || a.evidenceIds.length === 0) reasons.push("approval references no evidence")
      const review = (x: unknown, label: string) => {
        if (!isObj(x) || !nonEmpty(x.reviewedBy) || !nonEmpty(x.reference)) return void reasons.push(`${label} is missing or incomplete`)
        const d = calendarDay(x.reviewedOn)
        if (d === null) reasons.push(`${label} date is not a real date`)
        else if (approvedDay !== null && d > approvedDay) reasons.push(`${label} is dated after the approval`)
        if (typeof x.contentDigest !== "string" || !/^[0-9a-f]{64}$/.test(x.contentDigest)) reasons.push(`${label} has no content digest`)
        else if (digest !== null && x.contentDigest !== digest) reasons.push(`${label} was of different content than the page now has`)
      }
      review(a.editorialReview, "editorial review")
      if (a.complianceReview !== null) review(a.complianceReview, "compliance review")
      if (!Array.isArray(a.claimApprovals)) reasons.push("claim approvals are malformed")
    }

    // Content shape
    const sections: any[] = Array.isArray(r.sections) ? r.sections : [] // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!Array.isArray(r.sections)) reasons.push("sections is malformed")
    if (sections.length === 0) reasons.push("page has no content sections")
    if (!isStringArray(r.evidenceRefs)) reasons.push("evidenceRefs is malformed")

    // Evidence needed: canonical table + page references + sections + coverage + designation
    const canonical = (REQUIRED_EVIDENCE as Record<string, readonly string[]>)[r.publicPath]
    if (!canonical) reasons.push("page has no canonical evidence requirements")
    const needed = new Set<string>(canonical ?? [])
    for (const id of isStringArray(r.evidenceRefs) ? r.evidenceRefs : []) needed.add(id)
    for (const s of sections) for (const id of isStringArray(s?.evidenceIds) ? s.evidenceIds : []) needed.add(id)
    const cov = r.kind === "location" ? r.verifiedCoverage : null
    if (r.kind === "location") {
      if (!isObj(cov) || !isStringArray(cov.evidenceIds) || !isStringArray(cov.areas) || !isStringArray(cov.serviceIds)) reasons.push("verified coverage is malformed")
      else {
        for (const id of cov.evidenceIds) needed.add(id)
        for (const id of cov.serviceIds) if (!SERVICES.some((s) => s.id === id)) reasons.push(`coverage lists unknown service ${id}`)
        const ident = (LOCATION_IDENTITY as Record<string, any>)[slug] // eslint-disable-line @typescript-eslint/no-explicit-any
        if (ident && cov.serviceIds.length > 0 && !cov.evidenceIds.includes(ident.servicesEvidence)) reasons.push("service coverage is not tied to the office's services evidence")
        if (ident && cov.areas.length > 0 && !cov.evidenceIds.includes(ident.areasEvidence)) reasons.push("areas served are not tied to the office's areas evidence")
      }
    }
    // Attested values always come from the CURRENT entry (the end of any supersession chain).
    const attestedOf = (id: string): Record<string, unknown> | null => {
      const c = currentOf(ledger.byId, id)
      return "tail" in c && isObj(c.tail.attested) ? c.tail.attested : null
    }
    const nap = r.kind === "location" ? r.nap : null
    if (r.kind === "location") {
      const ident = (LOCATION_IDENTITY as Record<string, any>)[slug] // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!isObj(nap) || !["displayName", "branchDesignation", "streetAddress", "locality", "telephone"].every((k) => nonEmpty(nap[k]))) reasons.push("location has no verified NAP")
      else if (ident) {
        if (!/^\+\d{8,15}$/.test(nap.telephone)) reasons.push("NAP telephone is not E.164")
        const same = (id: string, expected: Record<string, string>) => {
          const att = attestedOf(id)
          if (!isObj(att) || Object.entries(expected).some(([k, v]) => att[k] !== v)) reasons.push(`NAP does not match the values currently attested by ${id}`)
        }
        same(ident.nameEvidence, { displayName: nap.displayName, branchDesignation: nap.branchDesignation })
        same(ident.addressEvidence, { streetAddress: nap.streetAddress, locality: nap.locality })
        same(ident.phoneEvidence, { telephone: nap.telephone })
        // Designation: an explicit allowlist, each value with its own evidence. Designation wording is not allowed elsewhere in the NAP.
        const des = Object.hasOwn(DESIGNATIONS, nap.branchDesignation) ? DESIGNATIONS[nap.branchDesignation] : undefined
        if (!des) reasons.push("branch designation is not an allowed designation")
        else {
          for (const id of des.evidenceIds) needed.add(id)
          if (des.offices && !des.offices.includes(slug as never)) reasons.push("this designation is not allowed for this office")
          if (des.attestedBy) {
            const att = attestedOf(des.attestedBy.id)
            if (!isObj(att) || att[des.attestedBy.key] !== r.officeName) reasons.push(`designation is not attested for this office by ${des.attestedBy.id}`)
          }
        }
        if (DESIGNATION_WORDS.test(nap.displayName)) reasons.push("display name contains designation wording")
      }
    }
    // The contact call to action shows the primary phone: it must be the number COM-05 currently attests.
    const com05 = attestedOf("COM-05")
    if (!isObj(com05) || com05[PHONE_ATTESTATION_KEY] !== siteConfig.contact.primaryPhone.e164) reasons.push("the primary phone shown is not the number currently attested by COM-05")

    const approvedIds = isObj(a) && isStringArray(a.evidenceIds) ? a.evidenceIds : []
    // Usable = chain resolves to a current entry that is verified, unexpired, unrevoked, correctly scoped for this page.
    const resolve = (id: string): { why: string | null; current: string | null } => {
      const c = currentOf(ledger.byId, id)
      if ("problem" in c) return { why: c.problem, current: null }
      // Requirements come from the canonical ROOT of the chain, never from the replacement's own id.
      const req = rootRequirements(rootIdOf(ledger.byId, id))
      if (req === null) return { why: "has no valid evidence scope", current: c.tail.id }
      const why = unusable(c.tail, asOfDay, approvedDay, req)
      if (why) return { why, current: c.tail.id }
      if (c.tail.scope !== req.scope) return { why: "has no valid evidence scope", current: c.tail.id }
      if (req.scope !== "company" && req.scope !== pageScope) return { why: `is scoped to ${req.scope}, not to this page`, current: c.tail.id }
      return { why: null, current: c.tail.id }
    }
    for (const id of needed) {
      const { why, current } = resolve(id)
      if (why) reasons.push(`evidence ${id} ${why}`)
      evidence.add(id)
      if (current) evidence.add(current)
      if (!approvedIds.includes(id) && !(current && approvedIds.includes(current))) reasons.push(`approval does not reference evidence ${id}`)
      else if (current && !approvedIds.includes(current)) reasons.push(`approval does not reference the current evidence ${current} replacing ${id}`)
    }
    for (const id of approvedIds) {
      const { why, current } = resolve(id)
      if (why) reasons.push(`approval cites evidence ${id} that ${why}`)
      evidence.add(id)
      if (current) evidence.add(current)
    }

    // Sections, claim bindings and rendered text
    const seenIds = new Set<string>()
    const seenParas = new Set<string>()
    const siblingParas = new Set<string>(
      sibs.flatMap((s) => {
        try {
          return (isObj(s) && Array.isArray(s.sections) ? s.sections : []).flatMap((x: any) => (isStringArray(x?.body) ? x.body.map(norm) : [])) // eslint-disable-line @typescript-eslint/no-explicit-any
        } catch {
          return []
        }
      }),
    )
    for (const d of SERVICES) siblingParas.add(norm(d.description))
    const bound: { claimId: string; sectionId: string; statement: string }[] = []
    for (const s of sections) {
      if (!isObj(s) || !nonEmpty(s.id) || !nonEmpty(s.heading) || !isStringArray(s.body) || s.body.length === 0 || !s.body.every(nonEmpty)) {
        reasons.push("a content section is malformed")
        continue
      }
      if (seenIds.has(s.id)) reasons.push(`duplicate section id ${s.id}`)
      seenIds.add(s.id)
      if (!isStringArray(s.evidenceIds) || s.evidenceIds.length === 0) reasons.push(`section ${s.id} cites no evidence`)
      if (!Array.isArray(s.claims) || !s.claims.every((c: unknown) => isObj(c) && nonEmpty(c.claimId) && nonEmpty(c.statement))) {
        reasons.push(`section ${s.id} has malformed claims`)
        continue
      }
      for (const t of [s.heading, ...(s.body as string[]), ...(s.claims as { statement: string }[]).map((c) => c.statement)]) {
        const bad = textProblem(t)
        if (bad) reasons.push(`section ${s.id} text ${bad}`)
      }
      for (const para of s.body as string[]) {
        if (words(para) < MIN_WORDS) reasons.push(`section ${s.id} has a paragraph under ${MIN_WORDS} words`)
        const key = norm(para)
        if (seenParas.has(key)) reasons.push(`section ${s.id} repeats a paragraph on the same page`)
        seenParas.add(key)
        if (siblingParas.has(key)) reasons.push(`section ${s.id} copies text from another page or the approved service description`)
        // every claim-sensitive span must sit inside a statement bound to a claim whose scope permits that span
        const covers: { from: number; to: number; claimId: string }[] = []
        for (const c of s.claims as { claimId: string; statement: string }[]) for (let i = para.indexOf(c.statement); i !== -1; i = para.indexOf(c.statement, i + 1)) covers.push({ from: i, to: i + c.statement.length, claimId: c.claimId })
        for (const span of spansOf(para)) {
          if (!covers.some((cv) => span.from >= cv.from && span.to <= cv.to && permits(cv.claimId, span))) reasons.push(`section ${s.id} has claim-sensitive wording (${span.category}) that no bound, approved claim covers`)
        }
      }
      if (hasSensitive(s.heading)) reasons.push(`section ${s.id} heading has claim-sensitive wording`)
      for (const c of s.claims as { claimId: string; statement: string }[]) {
        if (!(s.body as string[]).some((p) => p.includes(c.statement))) reasons.push(`claim ${c.claimId} statement does not appear in section ${s.id}`)
        const scope = Object.hasOwn(CLAIM_SCOPE, c.claimId) ? CLAIM_SCOPE[c.claimId] : undefined
        if (!scope) reasons.push(`claim ${c.claimId} has no explicit scope`)
        else if (scope.categories.length > 0 && !spansOf(c.statement).some((sp) => permits(c.claimId, sp))) reasons.push(`claim ${c.claimId} statement contains no wording that claim covers`)
        const reg = deps.claims.find((x) => isObj(x) && x.id === c.claimId)
        if (!reg || reg.status !== "approved" || !nonEmpty(reg.evidence)) reasons.push(`claim ${c.claimId} is not approved with evidence`)
        bound.push({ claimId: c.claimId, sectionId: s.id, statement: c.statement })
      }
    }
    const approvals: any[] = isObj(a) && Array.isArray(a.claimApprovals) ? a.claimApprovals : [] // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const b of bound) {
      const hit = approvals.find((x) => isObj(x) && x.claimId === b.claimId && x.sectionId === b.sectionId && x.statement === b.statement)
      if (!hit) reasons.push(`claim ${b.claimId} in section ${b.sectionId} has no approval for that exact statement`)
      else if (!nonEmpty(hit.editorialApprovedBy) || !nonEmpty(hit.complianceApprovedBy)) reasons.push(`claim ${b.claimId} lacks editorial or compliance approval`)
    }
    for (const x of approvals) if (!isObj(x) || !bound.some((b) => b.claimId === x.claimId && b.sectionId === x.sectionId && b.statement === x.statement)) reasons.push("an approval refers to a claim that is not in the content")
    if (bound.length > 0 && isObj(a) && a.complianceReview === null) reasons.push("claims are present but there is no compliance review")

    // Every other rendered field is checked; claims cannot be bound there, so any sensitive wording is rejected.
    // (branchDesignation is validated against the allowlist above.)
    const plain: string[] = []
    if (r.kind === "location" && isObj(nap)) plain.push(nap.displayName, nap.streetAddress, nap.locality)
    if (r.kind === "location" && isObj(cov) && isStringArray(cov.areas)) plain.push(...cov.areas)
    for (const t of plain) {
      const bad = textProblem(t)
      if (bad) reasons.push(`a rendered location field ${bad}`)
      if (typeof t === "string" && hasSensitive(t)) reasons.push("a rendered field contains claim-sensitive wording that cannot be bound to an approval")
    }
    if (r.kind === "location" && isObj(nap)) {
      const bad = textProblem(nap.branchDesignation)
      if (bad) reasons.push(`branch designation ${bad}`)
    }

    if (reasons.length > 0) return fail()
    return { reasons: [], page: r as Published<PageRecord>, entry, evidence: [...evidence] }
  } catch {
    return { reasons: ["gate error: failing closed"], page: null, entry: null, evidence: [] }
  }
}

/** Evaluates one record. Deterministic for the same inputs and never throws. `siblings` are the other pages, used for duplicate-text checks. */
export function evaluatePublication(record: unknown, deps: GateDeps = defaultDeps(), siblings: readonly unknown[] = []): GateDecision {
  const { reasons, page } = evaluate(record, deps, siblings)
  return { published: page !== null && reasons.length === 0, reasons }
}

/** Returns the frozen, gate-registered snapshot of a record if (and only if) it is publishable. */
export function publishRecord(record: unknown, deps: GateDeps = defaultDeps(), siblings: readonly unknown[] = []): Published<PageRecord> | null {
  const { page, entry, reasons, evidence } = evaluate(record, deps, siblings)
  if (!page || reasons.length > 0 || !entry) return null
  deepFreeze(page)
  PUBLISHED_SNAPSHOTS.set(page, deepFreeze({ entry, evidence: deepFreeze([...evidence]) }))
  return page
}

export function isPublished(record: unknown, deps: GateDeps = defaultDeps(), siblings: readonly unknown[] = []): boolean {
  return evaluatePublication(record, deps, siblings).published
}

// ---------------------------------------------------------------------------------------------------- helpers
const RECORDS = ALL_PAGE_RECORDS as readonly PageRecord[]

export function getPublishedPages(records: readonly PageRecord[] = RECORDS, deps: GateDeps = defaultDeps()): readonly Published<PageRecord>[] {
  if (!Array.isArray(records)) return []
  const out: Published<PageRecord>[] = []
  records.forEach((rec, i) => {
    const p = publishRecord(rec, deps, records.filter((_, j) => j !== i))
    if (p) out.push(p)
  })
  return out
}

/** The only lookup a route may use. Unknown, unplanned and unpublished slugs return null (the route then calls notFound()). */
export function getPublishedPage(kind: PageKind, slug: unknown, records: readonly PageRecord[] = RECORDS, deps: GateDeps = defaultDeps()): Published<PageRecord> | null {
  if (typeof slug !== "string") return null
  return getPublishedPages(records, deps).find((p) => p.kind === kind && p.slug === slug) ?? null
}

export function publishedPagePaths(records: readonly PageRecord[] = RECORDS, deps: GateDeps = defaultDeps()): readonly string[] {
  return getPublishedPages(records, deps).map((p) => p.publicPath)
}

export function getPublishedNavLinks(records: readonly PageRecord[] = RECORDS, deps: GateDeps = defaultDeps()): readonly { href: string; label: string }[] {
  return getPublishedPages(records, deps).map((p) => ({ href: p.publicPath, label: p.kind === "service" ? p.serviceId : p.officeName }))
}
