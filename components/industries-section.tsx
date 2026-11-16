import { FadeUp } from "@/components/motion-frames"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { INDUSTRIES } from "@/lib/services"

export function IndustriesSection() {
  return (
    <section id="industries" aria-labelledby="industries-title" className="scroll-mt-20 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 md:grid-cols-12 md:gap-8 md:py-32 lg:px-8">
        <FadeUp className="flex flex-col gap-6 md:col-span-4">
          <Eyebrow>Industries</Eyebrow>
          <SectionTitle id="industries-title">Where we work</SectionTitle>
        </FadeUp>
        <ul className="grid sm:grid-cols-2 md:col-span-8">
          {INDUSTRIES.map((industry) => (
            <li key={industry.id} className="flex flex-col gap-3 border-t border-border py-8 sm:pr-8">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{industry.name}</h3>
              <p className="text-pretty leading-relaxed text-muted-foreground">{industry.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
