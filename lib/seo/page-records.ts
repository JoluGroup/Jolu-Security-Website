// Records for the ten planned pages. ALL UNPUBLISHED: status "unpublished", no approval, no content sections.
// Writing content or approving a page is a deliberate, reviewable change made only with the owner's authorisation
// (see lib/seo/publication-gate.ts). Keywords and draft metadata are resolved from lib/seo/planned-pages.ts.
import type { LocationPageRecord, ServicePageRecord } from "@/lib/seo/page-models"
import { REQUIRED_EVIDENCE } from "@/lib/seo/publication-requirements"

const svc = (serviceId: ServicePageRecord["serviceId"], slug: ServicePageRecord["slug"]): ServicePageRecord => {
  const publicPath = `/services/${slug}` as const
  return {
    kind: "service",
    serviceId,
    slug,
    publicPath,
    plannedPath: `${publicPath}/`,
    status: "unpublished",
    requiredEvidence: REQUIRED_EVIDENCE[publicPath],
    evidenceRefs: [],
    claimRefs: [],
    sections: [],
    approval: null,
  }
}

const loc = (slug: LocationPageRecord["slug"], officeName: LocationPageRecord["nap"]["officeName"], napEvidenceIds: readonly string[]): LocationPageRecord => {
  const publicPath = `/locations/${slug}` as const
  return {
    kind: "location",
    locationId: slug,
    slug,
    publicPath,
    plannedPath: `${publicPath}/`,
    status: "unpublished",
    requiredEvidence: REQUIRED_EVIDENCE[publicPath],
    evidenceRefs: [],
    claimRefs: [],
    sections: [],
    approval: null,
    nap: { officeName },
    napEvidenceIds,
    verifiedCoverage: { serviceIds: [], areas: [], evidenceIds: [] },
  }
}

export const SERVICE_PAGE_RECORDS: readonly ServicePageRecord[] = [
  svc("manned-guarding", "manned-guarding"),
  svc("cctv-installation", "cctv-installation"),
  svc("electric-fencing", "electric-fencing"),
  svc("events-security", "events-security"),
  svc("k9-unit", "k9-unit-services"),
  svc("alarm-response", "alarm-response"),
  svc("vip-close-protection", "vip-close-protection"),
]

export const LOCATION_PAGE_RECORDS: readonly LocationPageRecord[] = [
  loc("nairobi", "Nairobi", ["OFF-NBO-02", "OFF-NBO-05"]),
  loc("nakuru", "Nakuru", ["OFF-NAK-02", "OFF-NAK-05"]),
  // The website calls the office "Migori"; the single public page is Rongo (owner decision, Milestone 5A.1).
  loc("rongo", "Migori", ["OFF-RON-02", "OFF-RON-05"]),
]

export const ALL_PAGE_RECORDS = [...SERVICE_PAGE_RECORDS, ...LOCATION_PAGE_RECORDS] as const
