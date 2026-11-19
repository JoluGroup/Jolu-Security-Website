// Records for the ten planned pages. ALL UNPUBLISHED: status "unpublished", no approval, no content sections, no NAP.
// Writing content or approving a page is a deliberate, reviewable change made only with the owner's authorisation
// (see lib/seo/publication-gate.ts). Keywords come from lib/seo/planned-pages.ts; requirements from publication-requirements.ts.
// The registry is deep-frozen at load.
import { deepFreeze } from "@/lib/seo/freeze"
import type { LocationPageRecord, ServicePageRecord } from "@/lib/seo/page-models"
import { LOCATION_IDENTITY, SERVICE_IDENTITY } from "@/lib/seo/publication-requirements"

const svc = (slug: ServicePageRecord["slug"]): ServicePageRecord => {
  const publicPath = `/services/${slug}` as const
  return { kind: "service", serviceId: SERVICE_IDENTITY[slug].serviceId, slug, publicPath, plannedPath: `${publicPath}/`, status: "unpublished", evidenceRefs: [], sections: [], approval: null }
}

const loc = (slug: LocationPageRecord["slug"]): LocationPageRecord => {
  const publicPath = `/locations/${slug}` as const
  return {
    kind: "location",
    locationId: slug,
    slug,
    publicPath,
    plannedPath: `${publicPath}/`,
    status: "unpublished",
    evidenceRefs: [],
    sections: [],
    approval: null,
    officeName: LOCATION_IDENTITY[slug].officeName,
    nap: null,
    verifiedCoverage: { serviceIds: [], areas: [], evidenceIds: [] },
  }
}

export const SERVICE_PAGE_RECORDS: readonly ServicePageRecord[] = deepFreeze([
  svc("manned-guarding"),
  svc("cctv-installation"),
  svc("electric-fencing"),
  svc("events-security"),
  svc("k9-unit-services"),
  svc("alarm-response"),
  svc("vip-close-protection"),
])

export const LOCATION_PAGE_RECORDS: readonly LocationPageRecord[] = deepFreeze([loc("nairobi"), loc("nakuru"), loc("rongo")])

export const ALL_PAGE_RECORDS = deepFreeze([...SERVICE_PAGE_RECORDS, ...LOCATION_PAGE_RECORDS] as const)
