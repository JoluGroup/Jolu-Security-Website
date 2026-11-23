import { BRAND } from "@/lib/seo/brand"
import { SERVICES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

const ORG_ID = `${siteConfig.url}/#organization`
const WEBSITE_ID = `${siteConfig.url}/#website`

/**
 * Organization and WebSite structured data for the homepage. Every value is already visible on the page
 * or comes from lib/site-config.ts / lib/services.ts. Deliberately absent, because nothing verified
 * supports them yet: ratings, reviews, opening hours, price range, geo coordinates, social profiles,
 * licence or registration numbers, offices/addresses (PostalAddress, location), areaServed (unverified;
 * see lib/offices.ts), and FAQ markup (there are no on-page FAQs).
 */
export function buildHomeJsonLd() {
  const { contact } = siteConfig
  const organization = {
    "@type": "Organization",
    "@id": ORG_ID,
    name: BRAND,
    alternateName: siteConfig.name,
    url: `${siteConfig.url}/`,
    logo: {
      "@type": "ImageObject",
      url: new URL(siteConfig.logo.src, siteConfig.url).toString(),
      width: 501,
      height: 501,
    },
    email: contact.email,
    telephone: contact.primaryPhone.e164,
    contactPoint: contact.phones.map((phone) => ({
      "@type": "ContactPoint",
      telephone: phone.e164,
      email: contact.email,
      contactType: "customer service",
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${BRAND} services`,
      itemListElement: SERVICES.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.name,
          description: service.description,
          provider: { "@id": ORG_ID },
        },
      })),
    },
  }
  const website = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${siteConfig.url}/`,
    name: BRAND,
    inLanguage: "en-KE",
    publisher: { "@id": ORG_ID },
  }
  return { "@context": "https://schema.org", "@graph": [organization, website] }
}

/** JSON for an inline <script type="application/ld+json">. "<" and the JS line separators are escaped so the data cannot close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(new RegExp("\\u2028", "g"), "\\u2028")
    .replace(new RegExp("\\u2029", "g"), "\\u2029")
}
