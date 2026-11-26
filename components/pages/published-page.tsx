import { notFound } from "next/navigation"
import { ServiceLanding } from "@/components/aeo/service-landing"
import { ContactCta } from "@/components/pages/contact-cta"
import { EvidenceSections } from "@/components/pages/evidence-sections"
import { LocationOverview } from "@/components/pages/location-overview"
import { ServiceOverview } from "@/components/pages/service-overview"
import { SiteShell } from "@/components/site-shell"
import type { PageKind } from "@/lib/seo/page-models"
import { getPublishedPage } from "@/lib/seo/publication-gate"
import { getServiceContent } from "@/lib/seo/service-content"
import { sectionsMatchContent } from "@/lib/seo/service-sections"

/**
 * The only way a future route should render a service or location page. It looks the slug up through the
 * publication gate: unknown, unplanned and unpublished slugs all end in notFound(). NOT imported by any route today.
 */
export function PublishedPage({ kind, slug }: { kind: PageKind; slug: string }) {
  const page = getPublishedPage(kind, slug)
  if (!page) notFound()
  // Answer-first service content is used only when the gate-reviewed sections are exactly that content (service-sections.ts).
  if (page.kind === "service") {
    const content = getServiceContent(slug)
    if (content && sectionsMatchContent(page.sections, content)) return <ServiceLanding page={page} content={content} />
  }
  return (
    <SiteShell>
      {page.kind === "service" ? <ServiceOverview page={page} /> : <LocationOverview page={page} />}
      <EvidenceSections page={page} />
      <ContactCta page={page} />
    </SiteShell>
  )
}
