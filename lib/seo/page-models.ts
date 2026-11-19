// Typed models for FUTURE service and location pages (Milestone 5D.2). INFRASTRUCTURE ONLY: every record is unpublished.
//
// Keywords are NOT stored here. The keyword registry (lib/seo/workbook-keywords.ts, keyword-map.ts, planned-pages.ts)
// stays the single source; a record only names its `plannedPath` and the primary keyword, supporting keywords and
// draft metadata are resolved from the registry on demand (lib/seo/page-resolve.ts).
import type { ServiceId } from "@/lib/services"

export type ServiceSlug =
  | "manned-guarding"
  | "cctv-installation"
  | "electric-fencing"
  | "events-security"
  | "k9-unit-services"
  | "alarm-response"
  | "vip-close-protection"
export type LocationSlug = "nairobi" | "nakuru" | "rongo"
export type PageKind = "service" | "location"

/** "unpublished" is the only state a record may be committed in unless the owner authorised publication. */
export type PublicationStatus = "unpublished" | "approved"

/** One block of page text. It renders only if every evidence id is VERIFIED and every claim id is approved. */
export type ContentSection = {
  id: string
  heading: string
  body: readonly string[]
  /** Ids from the Business Verification register (docs/seo/business-verification, PR #7), for example "SVC-MG-01". */
  evidenceIds: readonly string[]
  /** Ids from lib/claims.ts. Each must be approved with evidence. */
  claimIds: readonly string[]
}

/** The owner's written authorisation to publish exactly one page. */
export type ApprovalRecord = {
  /** Always "owner": no other authority can publish. */
  authorization: "owner"
  /** Name and role of the person who approved. */
  approvedBy: string
  /** ISO date, YYYY-MM-DD. */
  approvedOn: string
  /** The public path being approved, for example "/services/manned-guarding". Must equal the record's publicPath. */
  path: string
  /** Where the written approval is kept (message, document or PR reference). */
  reference: string
  /** The owner approved the page layout (evidence item C11 / L15 in the preparation documents). */
  layoutApproved: boolean
  /** Evidence ids the owner reviewed. Must cover every id the page requires and uses. */
  evidenceIds: readonly string[]
  /** Claim ids the owner approved for this page. */
  claimIds: readonly string[]
}

type PageRecordBase = {
  /** Public path without a trailing slash, as served (trailingSlash is off): "/services/manned-guarding". */
  publicPath: string
  /** Path in lib/seo/planned-pages.ts (with the workbook's trailing slash). Keywords and draft metadata come from there. */
  plannedPath: string
  status: PublicationStatus
  /** Evidence required before this page may be published (the publication-blocking items of the register). */
  requiredEvidence: readonly string[]
  /** Evidence the page's own content references, in addition to requiredEvidence. */
  evidenceRefs: readonly string[]
  claimRefs: readonly string[]
  sections: readonly ContentSection[]
  /** null until the owner authorises publication. */
  approval: ApprovalRecord | null
}

export type ServicePageRecord = PageRecordBase & {
  kind: "service"
  /** Existing service id (also the enquiry preselect). */
  serviceId: ServiceId
  slug: ServiceSlug
}

export type LocationPageRecord = PageRecordBase & {
  kind: "location"
  locationId: LocationSlug
  slug: LocationSlug
  /** The office in lib/site-config.ts this page describes. NAP is read from there, never copied into a record. */
  nap: { officeName: "Nairobi" | "Nakuru" | "Migori" }
  /** Evidence ids that verify the NAP (address, phone, name) for this office. */
  napEvidenceIds: readonly string[]
  /** Service coverage verified for this office. Empty until Security operations confirms it. */
  verifiedCoverage: { serviceIds: readonly ServiceId[]; areas: readonly string[]; evidenceIds: readonly string[] }
}

export type PageRecord = ServicePageRecord | LocationPageRecord

/** A page that passed the publication gate. Only lib/seo/publication-gate.ts produces this type; components accept nothing else. */
declare const PUBLISHED: unique symbol
export type Published<T extends PageRecord> = T & { readonly [PUBLISHED]: true }

export type EvidenceStatus = "VERIFIED" | "PROVISIONAL" | "CONFLICTED" | "MISSING" | "NOT APPLICABLE"
/** An entry in the evidence ledger. The ledger is empty: nothing is independently verified yet. */
export type EvidenceRecord = {
  id: string
  status: EvidenceStatus
  /** Who verified it (name and role) and when (ISO date). Both are required for VERIFIED. */
  verifiedBy: string
  verifiedOn: string
  /** The independent document or record. Website configuration and the claims registry do not count. */
  document: string
}
