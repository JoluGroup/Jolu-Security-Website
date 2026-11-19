import { Button } from "@/components/ui/button"
import type { PageRecord, Published } from "@/lib/seo/page-models"
import { assertPublished } from "@/lib/seo/publication-gate"
import { siteConfig } from "@/lib/site-config"

/** Call to action using only the approved contact details and the existing enquiry form (no new form, no new endpoint). */
export function ContactCta({ page }: { page: Published<PageRecord> }) {
  assertPublished(page)
  const quoteHref = page.kind === "service" ? `/?service=${page.serviceId}#contact` : siteConfig.quoteHref
  return (
    <section aria-labelledby="cta-heading" className="mx-auto w-full max-w-6xl px-6 pb-24">
      <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight text-foreground">
        Talk to us
      </h2>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<a href={quoteHref} />}>
          Request a quote
        </Button>
        <Button size="lg" variant="outline" className="h-12 px-6 text-base" nativeButton={false} render={<a href={siteConfig.contact.primaryPhone.href} />}>
          Call {siteConfig.contact.primaryPhone.displayIntl}
        </Button>
      </div>
    </section>
  )
}
