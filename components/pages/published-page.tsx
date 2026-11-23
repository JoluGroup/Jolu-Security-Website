import { notFound } from "next/navigation"
import { ContactCta } from "@/components/pages/contact-cta"
import { EvidenceSections } from "@/components/pages/evidence-sections"
import { LocationOverview } from "@/components/pages/location-overview"
import { ServiceOverview } from "@/components/pages/service-overview"
import { SiteShell } from "@/components/site-shell"
import type { PageKind } from "@/lib/seo/page-models"
import { getPublishedPage } from "@/lib/seo/publication-gate"

/**
 * The only way a future route should render a service or location page. It looks the slug up through the
 * publication gate: unknown, unplanned and unpublished slugs all end in notFound(). NOT imported by any route today.
 */
export function PublishedPage({ kind, slug }: { kind: PageKind; slug: string }) {
  const page = getPublishedPage(kind, slug)
  if (!page) notFound()
  return (
    <SiteShell>
      {page.kind === "service" ? <ServiceOverview page={page} /> : <LocationOverview page={page} />}
      <EvidenceSections page={page} />
      <ContactCta page={page} />
    </SiteShell>
  )
}
