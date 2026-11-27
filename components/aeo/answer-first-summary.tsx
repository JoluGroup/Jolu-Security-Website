/**
 * The direct answer, placed immediately after the H1 so that readers, search engines and AI answer systems meet it first.
 * Server-rendered plain text (no client code). Write it as one natural passage of roughly 45-60 words; the text
 * comes from the page's reviewed content, never from this component.
 */
import { AEO_HEADINGS } from "@/lib/seo/aeo-text"

export function AnswerFirstSummary({ answer, label = AEO_HEADINGS.answer }: { answer: string; label?: string }) {
  return (
    <section aria-label={label} data-aeo="answer-first" className="mt-8 max-w-2xl border-l-2 border-primary pl-5">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-pretty text-lg leading-relaxed text-foreground">{answer}</p>
    </section>
  )
}
