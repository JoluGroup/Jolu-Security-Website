// Typed support for FUTURE location pages. Nothing here publishes a location, shows an address or implies coverage.
// Nairobi, Nakuru and Rongo / Migori are KEYWORD OPPORTUNITIES from the SEO workbook. They are not verified branches
// (lib/offices.ts: every office "needs-evidence"), and no branch information may be copied from the JOLU Machineries site.
// A location can only become eligible for LocalBusiness structured data after the publication gate has published its page
// with attested name, address and phone evidence; until then `eligibleLocalBusinessLocations()` is empty.
import { LOCATION_PAGE_RECORDS } from "@/lib/seo/page-records"
import type { LocationSlug } from "@/lib/seo/page-models"
import { getPublishedPages } from "@/lib/seo/publication-gate"
import { REQUIRED_EVIDENCE } from "@/lib/seo/publication-requirements"
import { KEYWORD_OVERRIDES, reconciledPath, stripSlash } from "@/lib/seo/route-architecture"
import { WORKBOOK_KEYWORDS } from "@/lib/seo/keyword-map"

export type LocationOpportunity = {
  locationId: LocationSlug
  /** Public path without trailing slash. */
  path: string
  /** Keyword text the workbook associates with the location (research data, not measured demand). */
  keywordCount: number
  /** Always false until the evidence ledger attests the office. */
  officeVerified: boolean
  coverageVerified: boolean
  pageStatus: "unpublished" | "published"
  /** Evidence ids the gate requires before the page can be published (the canonical table). */
  requiredEvidence: readonly string[]
}

export function getLocationOpportunities(): readonly LocationOpportunity[] {
  const published = new Set(getPublishedPages(LOCATION_PAGE_RECORDS).map((p) => p.publicPath))
  return LOCATION_PAGE_RECORDS.map((r) => {
    const path = stripSlash(r.publicPath)
    const keywordCount = WORKBOOK_KEYWORDS.filter((k) => reconciledPath(k) === path).length
    const isPublished = published.has(r.publicPath)
    return {
      locationId: r.locationId,
      path,
      keywordCount,
      officeVerified: isPublished,
      coverageVerified: isPublished && r.verifiedCoverage.areas.length > 0,
      pageStatus: isPublished ? ("published" as const) : ("unpublished" as const),
      requiredEvidence: REQUIRED_EVIDENCE[path as keyof typeof REQUIRED_EVIDENCE],
    }
  })
}

/** Locations that may carry LocalBusiness markup: published through the gate with attested NAP. Empty today. */
export function eligibleLocalBusinessLocations(): readonly LocationSlug[] {
  return getPublishedPages(LOCATION_PAGE_RECORDS)
    .filter((p) => p.kind === "location" && p.nap !== null)
    .map((p) => (p.kind === "location" ? p.locationId : null))
    .filter((x): x is LocationSlug => x !== null)
}

export { KEYWORD_OVERRIDES }
