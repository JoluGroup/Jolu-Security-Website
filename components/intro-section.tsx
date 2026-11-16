import { FadeUp } from "@/components/motion-frames"
import { Emphasis, Eyebrow, SectionTitle } from "@/components/section-heading"
import { VALUES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

export function IntroSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-(--header-h) border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:grid-cols-12 md:gap-8 md:py-36 lg:px-8">
        <FadeUp className="flex flex-col gap-8 md:col-span-7">
          <Eyebrow>About {siteConfig.name}</Eyebrow>
          <SectionTitle id="about-title" className="md:text-7xl">
            Safety is the foundation of <Emphasis>progress.</Emphasis>
          </SectionTitle>
        </FadeUp>
        <FadeUp delay={0.1} className="flex flex-col gap-10 md:col-span-4 md:col-start-9 md:self-end">
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
            {siteConfig.name} provides security services in Kenya.
          </p>
          <ul className="flex flex-col" aria-label="Our values">
            {VALUES.map((value) => (
              <li
                key={value.name}
                className="border-t border-border py-4 font-mono text-sm uppercase tracking-[0.2em] text-foreground last:border-b"
              >
                {value.name}
              </li>
            ))}
          </ul>
        </FadeUp>
      </div>
    </section>
  )
}
