// Typed models for FUTURE service and location pages. INFRASTRUCTURE ONLY: every record is unpublished.
//
// Keywords are NOT stored here: the keyword registry (lib/seo/workbook-keywords.ts, keyword-map.ts, planned-pages.ts)
// stays the single source and lib/seo/page-resolve.ts reads it. The evidence a page needs is NOT stored here either:
// the canonical table is lib/seo/publication-requirements.ts, so a record cannot weaken its own requirements.
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
export type PublicationStatus = "unpublished" | "approved"

/** A claim-sensitive statement inside one section. The statement must appear verbatim in the section body. */
export type SectionClaim = { claimId: string; statement: string }

/** One block of page text. Renders only if its evidence is verified and each claim in it has an explicit approval. */
export type ContentSection = {
  id: string
  heading: string
  body: readonly string[]
  /** Ids from the Business Verification register (docs/seo/business-verification, PR #7), for example "SVC-MG-01". */
  evidenceIds: readonly string[]
  claims: readonly SectionClaim[]
}

export type ReviewRecord = { reviewedBy: string; reviewedOn: string; reference: string }

/** Approval of one claim for one statement in one section. Binds the claim to the exact text it authorises. */
export type ClaimApproval = {
  claimId: string
  sectionId: string
  statement: string
  editorialApprovedBy: string
  /** Every claim needs both an editorial and a compliance approver. */
  complianceApprovedBy: string
}

/** The owner's written authorisation to publish exactly one page. */
export type ApprovalRecord = {
  authorization: "owner"
  approvedBy: string
  /** ISO calendar date, YYYY-MM-DD. */
  approvedOn: string
  /** Public path being approved, for example "/services/manned-guarding". */
  path: string
  reference: string
  layoutApproved: boolean
  /** Every evidence id the owner reviewed. Must cover everything the page requires and uses. */
  evidenceIds: readonly string[]
  /** Editorial review of ALL rendered text. */
  editorialReview: ReviewRecord
  /** Compliance review. Required whenever the page makes any claim. */
  complianceReview: ReviewRecord | null
  claimApprovals: readonly ClaimApproval[]
}

/** NAP shown on a location page. Every field must equal what the ledger entries for that office attest. */
export type LocationNap = {
  displayName: string
  branchDesignation: string
  streetAddress: string
  locality: string
  /** E.164, for example "+254700000000". */
  telephone: string
}

type PageRecordBase = {
  /** Public path without a trailing slash, as served (trailingSlash is off). */
  publicPath: string
  /** Path in lib/seo/planned-pages.ts (with the workbook's trailing slash). */
  plannedPath: string
  status: PublicationStatus
  /** Evidence the page's own content uses, in addition to the canonical requirements. */
  evidenceRefs: readonly string[]
  sections: readonly ContentSection[]
  approval: ApprovalRecord | null
}

export type ServicePageRecord = PageRecordBase & { kind: "service"; serviceId: ServiceId; slug: ServiceSlug }

export type LocationPageRecord = PageRecordBase & {
  kind: "location"
  locationId: LocationSlug
  slug: LocationSlug
  /** The office identity this page describes (see publication-requirements.ts). Shown values come from `nap`, never from siteConfig. */
  officeName: "Nairobi" | "Nakuru" | "Migori"
  /** null until the offices' details are verified. */
  nap: LocationNap | null
  verifiedCoverage: { serviceIds: readonly ServiceId[]; areas: readonly string[]; evidenceIds: readonly string[] }
}

export type PageRecord = ServicePageRecord | LocationPageRecord

/** Compile-time marker. Runtime proof is `assertPublished` in publication-gate.ts: a cast cannot forge it. */
declare const PUBLISHED: unique symbol
export type Published<T extends PageRecord> = Readonly<T> & { readonly [PUBLISHED]: true }

export type EvidenceStatus = "VERIFIED" | "PROVISIONAL" | "CONFLICTED" | "MISSING" | "NOT APPLICABLE"

/**
 * An entry in the evidence ledger. Every key is required: a missing key is invalid metadata. EMPTY today.
 * An entry is usable only if VERIFIED, not revoked, not superseded, verified on or before the approval date, and
 * not expired.
 */
export type EvidenceRecord = {
  id: string
  status: EvidenceStatus
  verifiedBy: string
  /** ISO calendar date. */
  verifiedOn: string
  /** The independent document or record. Website configuration, the claims registry and legacy PDFs do not count. */
  document: string
  /** ISO date after which the evidence no longer counts, or null if it does not expire. Licences and permits must have one. */
  expiresOn: string | null
  /** ISO date the evidence was withdrawn, or null. */
  revokedOn: string | null
  /** Id of the entry that replaces this one, or null. */
  supersededBy: string | null
  /** Id of the entry this one replaces, or null. */
  replaces: string | null
  /** Values the evidence attests, for example { streetAddress, locality }. Pages must display exactly these values. */
  attested: Readonly<Record<string, string>> | null
}
