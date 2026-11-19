import { PageIntro } from "@/components/pages/page-intro"
import type { LocationPageRecord, Published } from "@/lib/seo/page-models"
import { siteConfig } from "@/lib/site-config"

/** Location overview. NAP is read from siteConfig (never copied into content). Hours and areas render only if verified coverage supplies them. */
export function LocationOverview({ page }: { page: Published<LocationPageRecord> }) {
  const office = siteConfig.offices.find((o) => o.name === page.nap.officeName)
  if (!office) return null
  const { areas } = page.verifiedCoverage
  return (
    <>
      <PageIntro eyebrow={office.label} title={`${office.name} office`}>
        <p>{office.address}</p>
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
