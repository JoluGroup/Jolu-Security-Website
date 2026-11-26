import { AnswerFirstSummary } from "@/components/aeo/answer-first-summary"
import { Breadcrumbs } from "@/components/aeo/breadcrumbs"
import { CostDriversMatrix } from "@/components/aeo/cost-drivers-matrix"
import { FaqSection } from "@/components/aeo/faq-section"
import { ServiceScopeAndCompliance } from "@/components/aeo/service-scope-and-compliance"
import { ContactCta } from "@/components/pages/contact-cta"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { SiteShell } from "@/components/site-shell"
import type { ServiceContent } from "@/lib/seo/aeo-types"
import { serializeJsonLd } from "@/lib/seo/json-ld"
import type { Published, ServicePageRecord } from "@/lib/seo/page-models"
import { assertPublished } from "@/lib/seo/publication-gate"
import { buildBreadcrumbItems, buildServicePageJsonLd } from "@/lib/seo/service-json-ld"
import { sectionsMatchContent, serviceDisplayName } from "@/lib/seo/service-sections"

/**
 * The page content, with no gate and no chrome: H1, the direct answer, the budget-factor matrix, scope and regulatory
 * considerations, and the FAQ. Pure server components, all text in the initial HTML. It is exported for tests; a
 * route must use ServiceLanding, which refuses anything that did not pass the publication gate.
 */
export function ServiceLandingBody({ content, requestHref }: { content: ServiceContent; requestHref: string }) {
  const crumbs = buildBreadcrumbItems(content).map((c) => ({ name: c.name, href: new URL(c.url).pathname }))
  return (
    <>
      <section aria-labelledby="page-title" className="mx-auto w-full max-w-6xl px-6 pb-12 pt-28 md:pt-36">
        <Breadcrumbs items={crumbs} />
        <Eyebrow>Our services</Eyebrow>
        <SectionTitle id="page-title" as="h1" className="mt-6">
          {content.h1}
        </SectionTitle>
        <AnswerFirstSummary answer={content.answer} />
      </section>
      <CostDriversMatrix matrix={content.budget} />
      <ServiceScopeAndCompliance scope={content.scope} serviceName={serviceDisplayName(content)} requestHref={requestHref} />
      <FaqSection items={content.faqs} />
    </>
  )
}

/**
 * Gated rendering of a service page from its draft content. Throws unless the page came from the publication gate AND the
 * gate-reviewed sections are exactly this content's sections, so reviewed copy and rendered copy cannot differ.
 * Includes the Organization, Service, BreadcrumbList and FAQPage structured data built from the same content.
 */
export function ServiceLanding({ page, content }: { page: Published<ServicePageRecord>; content: ServiceContent }) {
  assertPublished(page)
  if (!sectionsMatchContent(page.sections, content)) throw new Error("Refusing to render service content that differs from the reviewed sections")
  const jsonLd = buildServicePageJsonLd(page, content)
  if (!jsonLd) throw new Error("Refusing to render a service page without its structured data")
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteShell>
        <ServiceLandingBody content={content} requestHref={`/?service=${page.serviceId}#contact`} />
        <ContactCta page={page} />
      </SiteShell>
    </>
  )
}
