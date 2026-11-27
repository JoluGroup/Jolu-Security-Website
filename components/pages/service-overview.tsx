import { PageIntro } from "@/components/pages/page-intro"
import { assertPublished } from "@/lib/seo/publication-gate"
import { resolvePlanned } from "@/lib/seo/page-resolve"
import type { Published, ServicePageRecord } from "@/lib/seo/page-models"
import { SERVICES } from "@/lib/services"

/** Service overview. Throws unless the page came from the publication gate. Uses the existing approved service description verbatim. */
export function ServiceOverview({ page }: { page: Published<ServicePageRecord> }) {
  assertPublished(page)
  const service = SERVICES.find((s) => s.id === page.serviceId)
  if (!service) return null
  return (
    <PageIntro eyebrow="Our services" title={resolvePlanned(page).name}>
      <p>{service.description}</p>
    </PageIntro>
  )
}
