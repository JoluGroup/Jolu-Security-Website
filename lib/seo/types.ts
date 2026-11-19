export type Priority = "P1" | "P2" | "P3"
export type SearchIntent = "Transactional" | "Commercial" | "Informational"

/** Why a workbook keyword cannot simply be written into public copy. */
export type ClaimCategory =
  | "licensing"
  | "superlative or quality"
  | "availability or response time"
  | "pricing"
  | "local presence or proximity"

/** How a keyword's claim classification was reached (see lib/seo/claim-classifier.ts). */
export type ClassificationBasis = "rule" | "judgment-included" | "judgment-excluded" | "none"

/** One row of the workbook's KEYWORD MASTER sheet, with where it is planned to be used. No metrics: see PlannedPage. */
export type WorkbookKeyword = {
  id: string
  keyword: string
  cluster: string
  geography: string
  intent: SearchIntent
  priority: Priority
  /** "Suggested target URL" exactly as the workbook gives it. */
  workbookUrl: string
  /** Where the keyword is planned after consolidation (differs from workbookUrl only for /locations/migori/). "/" is the live homepage. */
  plannedPath: string
  disposition: "homepage" | "planned-page" | "editorial"
  claimSensitive: readonly ClaimCategory[]
  classification: ClassificationBasis
}

export type PlannedKeyword = {
  /** Row ID in the workbook's KEYWORD MASTER sheet, for traceability. */
  id: string
  keyword: string
  priority: Priority
  claimSensitive: readonly ClaimCategory[]
}

/**
 * A page the workbook proposes but that is NOT published. There is intentionally no volume, difficulty,
 * CPC or ranking field: the workbook marks them "Not validated" and they must not be invented.
 */
export type PlannedPage = {
  path: string
  kind: "service" | "location" | "industry"
  name: string
  primaryKeyword: string
  intent: SearchIntent
  geography: readonly string[]
  priority: Priority
  titleDraft: string
  descriptionDraft: string
  supportingKeywords: readonly PlannedKeyword[]
  totalWorkbookKeywords: number
  claimSensitiveKeywordCount: number
  workbookCaution: string
}

/** A route that exists today. Its path, canonical and indexability are the single source for metadata, sitemap and robots. */
export type LivePage = {
  path: "/" | "/blog"
  /** false = `noindex`, kept out of the sitemap. */
  indexable: boolean
  /** "absolute" is used as-is; "segment" gets the site title template (" | JOLU SECURITY"). */
  title: { kind: "absolute" | "segment"; text: string }
  description: string
}
