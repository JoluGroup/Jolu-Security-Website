import { PageIntro } from "@/components/pages/page-intro"
import type { LocationPageRecord, Published } from "@/lib/seo/page-models"
import { assertPublished } from "@/lib/seo/publication-gate"

/**
 * Location overview. Throws unless the page came from the publication gate. Name, branch designation and address come
 * from the page's evidence-bound NAP (the gate proved they equal the verified values), never from siteConfig.
 */
export function LocationOverview({ page }: { page: Published<LocationPageRecord> }) {
  assertPublished(page)
  const { nap } = page
  if (!nap) return null
  const { areas } = page.verifiedCoverage
  return (
    <>
      <PageIntro eyebrow={nap.branchDesignation} title={nap.displayName}>
        <p>
          {nap.streetAddress}, {nap.locality}
        </p>
      </PageIntro>
      {areas.length > 0 ? (
        <section aria-labelledby="areas-heading" className="mx-auto w-full max-w-6xl px-6 pb-12">
          <h2 id="areas-heading" className="text-2xl font-semibold tracking-tight text-foreground">
            Areas served
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {areas.map((area) => (
              <li key={area} className="rounded-full border border-border px-3 py-1">
                {area}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
