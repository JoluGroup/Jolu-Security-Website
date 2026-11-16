import { ArrowRight, Phone } from "lucide-react"
import { FadeUp } from "@/components/motion-frames"
import { Emphasis, Eyebrow, SectionTitle } from "@/components/section-heading"
import { Button } from "@/components/ui/button"
import { getApprovedClaims } from "@/lib/claims"
import { VALUES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

export function WhySection() {
  const claims = getApprovedClaims()

  return (
    <section id="why-jolu" aria-labelledby="why-title" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-5 py-24 md:py-32 lg:px-8">
        <FadeUp className="flex flex-col gap-6">
          <Eyebrow>Why {siteConfig.name}</Eyebrow>
          <SectionTitle id="why-title" className="max-w-3xl">
            What we <Emphasis>stand</Emphasis> for
          </SectionTitle>
        </FadeUp>

        <ul className="grid gap-px overflow-hidden border-y border-border md:grid-cols-3">
          {VALUES.map((value, i) => (
            <FadeUp
              key={value.name}
              delay={i * 0.08}
              className="flex flex-col gap-4 border-border py-8 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0"
            >
              <li className="flex flex-col gap-4">
                <h3 className="font-serif text-4xl italic text-foreground md:text-5xl">{value.name}</h3>
                <p className="max-w-xs text-pretty leading-relaxed text-muted-foreground">{value.description}</p>
              </li>
            </FadeUp>
          ))}
        </ul>

        {claims.length > 0 && (
          <ul className="flex flex-wrap gap-x-10 gap-y-3" aria-label="Credentials">
            {claims.map((claim) => (
              <li key={claim.id} className="font-mono text-sm uppercase tracking-[0.2em] text-foreground">
                {claim.text}
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="flex flex-col gap-4 md:col-span-7">
            <h3 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Talk to us about your property.
            </h3>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Tell us about the site, event or person you need to protect, and talk through the options with our team.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:col-span-5 md:justify-end">
            <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<a href={siteConfig.quoteHref} />}>
              Request a Quote
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-input px-6 font-mono text-base"
              nativeButton={false}
              render={<a href={siteConfig.contact.phoneHref} />}
            >
              <Phone aria-hidden="true" />
              {siteConfig.contact.phoneDisplay}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
