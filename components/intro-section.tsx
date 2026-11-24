import { BrandPlate } from "@/components/brand-art"
import { FadeUp } from "@/components/motion-frames"
import { Emphasis, Eyebrow, SectionTitle } from "@/components/section-heading"
import { SERVICES, VALUES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

export function IntroSection() {
  const serviceList = SERVICES.map((s) => s.name)
  const summary = `${serviceList.slice(0, -1).join(", ")} and ${serviceList.at(-1)}`

  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-(--header-h) border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 md:grid-cols-12 md:gap-x-8 md:gap-y-16 md:py-28 lg:px-8">
        <FadeUp className="flex flex-col gap-8 md:col-span-8">
          <Eyebrow>About {siteConfig.name}</Eyebrow>
          <SectionTitle id="about-title" className="md:text-7xl">
            Safety is the foundation of <Emphasis>progress.</Emphasis>
          </SectionTitle>
        </FadeUp>

        <FadeUp delay={0.05} className="md:col-span-7">
          <BrandPlate />
        </FadeUp>

        <FadeUp delay={0.1} className="flex flex-col gap-10 md:col-span-5 md:col-start-8">
          <div className="flex flex-col gap-5">
            <p className="text-pretty text-xl leading-relaxed text-foreground">
              {siteConfig.name} provides {summary}.
            </p>
            <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
              Tell us about the site, event or person you need to protect, and talk through the options with our team.
            </p>
          </div>
          <ol className="flex flex-col" aria-label="Our values">
            {VALUES.map((value, i) => (
              <li
                key={value.name}
                className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-3 border-t border-border py-5 last:border-b"
              >
                <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-sm uppercase tracking-[0.2em] text-foreground">{value.name}</span>
              </li>
            ))}
          </ol>
        </FadeUp>
      </div>
    </section>
  )
}
