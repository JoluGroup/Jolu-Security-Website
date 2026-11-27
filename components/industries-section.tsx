import type { LucideIcon } from "lucide-react"
import { Building2, HardHat, House, Hotel, School, Store } from "lucide-react"
import { RingOrbit } from "@/components/brand-art"
import { FadeUp } from "@/components/motion-frames"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { INDUSTRIES } from "@/lib/services"

type IndustryId = (typeof INDUSTRIES)[number]["id"]

const ICONS: Record<IndustryId, LucideIcon> = {
  residential: House,
  commercial: Building2,
  educational: School,
  retail: Store,
  hospitality: Hotel,
  construction: HardHat,
}

export function IndustriesSection() {
  const nodes = INDUSTRIES.map((industry) => {
    const Icon = ICONS[industry.id]
    return { id: industry.id, label: industry.name, icon: <Icon className="size-5" strokeWidth={1.25} /> }
  })

  return (
    <section
      id="industries"
      aria-labelledby="industries-title"
      className="scroll-mt-(--header-h) border-t border-border bg-card"
    >
      <div className="mx-auto grid max-w-7xl gap-16 px-5 py-16 md:py-24 lg:grid-cols-12 lg:gap-8 lg:px-8">
        <div className="flex flex-col gap-14 lg:col-span-7">
          <FadeUp className="flex flex-col gap-6">
            <Eyebrow>Industries</Eyebrow>
            <SectionTitle id="industries-title">Security Solutions for Different Environments</SectionTitle>
          </FadeUp>
          <ol className="flex flex-col border-t border-border">
            {INDUSTRIES.map((industry, i) => {
              const Icon = ICONS[industry.id]
              return (
                <li
                  key={industry.id}
                  className="group grid grid-cols-[2.75rem_1fr] items-start gap-x-4 border-b border-border py-7 transition-colors hover:bg-accent/40 md:grid-cols-[2.75rem_3rem_1fr] md:gap-x-6 md:py-9"
                >
                  <span className="pt-2 font-mono text-xs text-muted-foreground" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="hidden size-12 items-center justify-center border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:text-foreground md:flex"
                    aria-hidden="true"
                  >
                    <Icon className="size-5" strokeWidth={1.25} />
                  </span>
                  <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between md:gap-8">
                    <h3 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl xl:text-5xl">
                      <Icon
                        className="size-6 shrink-0 text-muted-foreground md:hidden"
                        strokeWidth={1.25}
                        aria-hidden="true"
                      />
                      {industry.name}
                    </h3>
                    <p className="max-w-xs text-pretty leading-relaxed text-muted-foreground md:text-right">
                      {industry.description}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
        <div className="hidden lg:col-span-4 lg:col-start-9 lg:block">
          <div className="sticky top-[calc(var(--header-h)+2rem)]">
            <RingOrbit nodes={nodes} caption="Environments" />
          </div>
        </div>
      </div>
    </section>
  )
}
