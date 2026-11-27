import type { ReactNode } from "react"
import { Eyebrow, SectionTitle } from "@/components/section-heading"

/** Opening block of a published page: eyebrow, the single H1, and an introduction. Text comes from approved copy only. */
export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-6xl px-6 pb-12 pt-32 md:pt-40">
      <Eyebrow>{eyebrow}</Eyebrow>
      <SectionTitle id="page-title" as="h1" className="mt-6">
        {title}
      </SectionTitle>
      {children ? <div className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{children}</div> : null}
    </section>
  )
}
