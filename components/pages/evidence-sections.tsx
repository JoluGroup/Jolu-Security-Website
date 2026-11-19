import type { ContentSection, PageRecord, Published } from "@/lib/seo/page-models"

/**
 * Renders the content sections of a gated page. A section appears only because the gate already verified its
 * evidence and claims; the section's evidence ids are not shown to visitors. No section means nothing renders.
 */
export function EvidenceSections({ page }: { page: Published<PageRecord> }) {
  const sections: readonly ContentSection[] = page.sections
  if (sections.length === 0) return null
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 pb-16">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`section-${section.id}`}>
          <h2 id={`section-${section.id}`} className="text-2xl font-semibold tracking-tight text-foreground">
            {section.heading}
          </h2>
          <div className="mt-4 flex flex-col gap-4 text-pretty leading-relaxed text-muted-foreground">
            {section.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
