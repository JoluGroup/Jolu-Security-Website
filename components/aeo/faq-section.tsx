import { AEO_HEADINGS } from "@/lib/seo/aeo-text"
import type { FaqItem } from "@/lib/seo/aeo-types"

/**
 * Buyer FAQ using native <details>/<summary>: keyboard accessible with no JavaScript, and every answer is in the
 * initial HTML (collapsed answers are still present in the markup). The FAQPage structured data must be built from the
 * SAME items (lib/seo/service-json-ld.ts), so the visible text and the markup cannot drift. Renders nothing for an
 * empty list. Use it only where there are real, distinct buyer questions; do not pad.
 */
export function FaqSection({ items, heading = AEO_HEADINGS.faq }: { items: readonly FaqItem[]; heading?: string }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby="faq-heading" data-aeo="faq" className="mx-auto w-full max-w-3xl px-6 pb-16">
      <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight text-foreground">
        {heading}
      </h2>
      <div className="mt-6 flex flex-col gap-3">
        {items.map((item) => (
          <details key={item.question} className="group rounded-lg border border-border bg-card px-4 py-3">
            <summary className="cursor-pointer list-none font-medium text-foreground marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              {item.question}
            </summary>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
