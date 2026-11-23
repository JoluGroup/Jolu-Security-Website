// Structured data for a published service or location page. Accepts only a page that the gate produced
// (a frozen, registered snapshot); anything else returns null, so unpublished pages can never leak markup.
// Only gate-verified values and lib/services.ts are used. Deliberately absent: hours, geo, prices, ratings,
// reviews, licences, social profiles and FAQ markup.
import { canonicalUrl } from "@/lib/seo/metadata"
import { isPublishedSnapshot } from "@/lib/seo/publication-gate"
import { SERVICES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

const ORG_ID = `${siteConfig.url}/#organization`

export function buildPageJsonLd(page: unknown) {
  if (!isPublishedSnapshot(page)) return null
  const url = canonicalUrl(page.publicPath)
  if (page.kind === "service") {
    const service = SERVICES.find((s) => s.id === page.serviceId)
    if (!service) return null
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${url}#service`,
      name: service.name,
      description: service.description,
      url,
      provider: { "@id": ORG_ID },
    }
  }
  const nap = page.nap
  if (!nap) return null
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#office`,
    name: nap.displayName,
    url,
    telephone: nap.telephone,
    address: { "@type": "PostalAddress", streetAddress: nap.streetAddress, addressLocality: nap.locality, addressCountry: "KE" },
    parentOrganization: { "@id": ORG_ID },
  }
}
