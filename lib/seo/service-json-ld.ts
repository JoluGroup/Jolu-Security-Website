// Structured data for a gate-published service page that renders the answer-first content. Everything is built from
// the SAME content object the page renders, so visible text and markup cannot drift (tests compare them).
// Accepts only a page the publication gate produced AND whose sections equal the content's sections; anything else
// returns null, so an unpublished or edited page can never emit markup.
// Graph: Organization (name, apex URL, approved logo, verified contacts), Service (provider reference, no areaServed),
// BreadcrumbList (real hierarchy: homepage > service; there is no /services index route), FAQPage (only the visible FAQ).
// Deliberately absent: LocalBusiness (needs a verified, published location), areaServed, address, social profiles,
// parent organisation, reviews, ratings, prices, hours.
import type { ServiceContent } from "@/lib/seo/aeo-types"
import { buildOrganizationCore, ORG_ID } from "@/lib/seo/json-ld"
import { canonicalUrl } from "@/lib/seo/metadata"
import { buildPageJsonLd } from "@/lib/seo/page-json-ld"
import { isPublishedSnapshot } from "@/lib/seo/publication-gate"
import { sectionsMatchContent } from "@/lib/seo/service-sections"

export function buildBreadcrumbItems(content: ServiceContent) {
  return [
    { name: "Home", url: canonicalUrl("/") },
    { name: content.h1, url: canonicalUrl(`/services/${content.slug}`) },
  ] as const
}

export function buildFaqNode(content: ServiceContent, pageUrl: string) {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    mainEntity: content.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
}

export function buildServicePageJsonLd(page: unknown, content: ServiceContent) {
  if (!isPublishedSnapshot(page) || page.kind !== "service" || page.slug !== content.slug) return null
  if (!sectionsMatchContent(page.sections, content)) return null
  const base = buildPageJsonLd(page)
  if (!base || base["@type"] !== "Service") return null
  const url = canonicalUrl(page.publicPath)
  const { "@context": _context, ...serviceNode } = base as typeof base & { "@context": string }
  void _context
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationCore(),
      { ...serviceNode, description: content.answer },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: buildBreadcrumbItems(content).map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
      },
      buildFaqNode(content, url),
    ],
  }
}

export { ORG_ID }
