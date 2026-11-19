// Structured data for a future service or location page. Returns null unless the page passed the publication gate,
// so unpublished pages can never leak markup. Only values already in lib/site-config.ts and lib/services.ts are used.
// Deliberately absent: hours, geo, prices, ratings, reviews, licences, social profiles, FAQ markup.
import { BRAND } from "@/lib/seo/brand"
import { canonicalUrl } from "@/lib/seo/metadata"
import { DEFAULT_DEPS, evaluatePublication, type GateDeps } from "@/lib/seo/publication-gate"
import type { LocationPageRecord, PageRecord, ServicePageRecord } from "@/lib/seo/page-models"
import { SERVICES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

const ORG_ID = `${siteConfig.url}/#organization`

export function buildPageJsonLd(record: PageRecord, deps: GateDeps = DEFAULT_DEPS) {
  if (!evaluatePublication(record, deps).published) return null
  const url = canonicalUrl(record.publicPath)
  if (record.kind === "service") return buildService(record, url)
  return buildLocation(record, url)
}

function buildService(record: ServicePageRecord, url: string) {
  const service = SERVICES.find((s) => s.id === record.serviceId)
  if (!service) return null
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: service.name,
    description: service.description,
    url,
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "Country", name: "Kenya" },
  }
}

function buildLocation(record: LocationPageRecord, url: string) {
  const office = siteConfig.offices.find((o) => o.name === record.nap.officeName)
  if (!office) return null
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#office`,
    name: `${BRAND} ${office.name} ${office.label}`,
    url,
    telephone: siteConfig.contact.primaryPhone.e164,
    address: { "@type": "PostalAddress", streetAddress: office.address.replace(/, Kenya$/, "").replace(new RegExp(`, ${office.name}$`), ""), addressLocality: office.name, addressCountry: "KE" },
    parentOrganization: { "@id": ORG_ID },
  }
}
