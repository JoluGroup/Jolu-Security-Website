import type { LucideIcon } from "lucide-react"
import { ArrowRight, ClipboardList, ShieldCheck, Users } from "lucide-react"
import { FadeUp } from "@/components/motion-frames"
import { Emphasis, Eyebrow, SectionTitle } from "@/components/section-heading"
import { siteConfig } from "@/lib/site-config"

// A plain description of how to get in touch. It makes no statement about response times, staffing or procedures.
const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ClipboardList,
    title: "Tell us what you need",
    body: "Describe the site, event or person you need to protect. Use the enquiry form, call us or send a WhatsApp message.",
  },
  {
    icon: Users,
    title: "Talk it through",
    body: "Go through the options with our team and ask about any of our services.",
  },
  {
    icon: ShieldCheck,
    title: "Choose your services",
    body: "Pick the services that fit, from guarding and CCTV to K9 units, electric fencing, alarm response and VIP protection.",
  },
]

export function PeopleSection() {
  return (
    <section id="people" aria-labelledby="people-title" className="scroll-mt-(--header-h) border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 py-24 md:py-32 lg:px-8">
        <FadeUp className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="flex flex-col gap-6 md:col-span-7">
            <Eyebrow>Getting started</Eyebrow>
            <SectionTitle id="people-title">
              Protection starts with a <Emphasis>conversation</Emphasis>
            </SectionTitle>
          </div>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground md:col-span-4 md:col-start-9">
            Security is about people looking after people. Reach out in whichever way suits you.
          </p>
        </FadeUp>

        <FadeUp>
          <ol className="relative grid gap-px border-y border-border md:grid-cols-3 md:border-x md:bg-border">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="group relative flex flex-col gap-6 bg-background p-7 md:gap-10 transition-colors hover:bg-card md:p-9"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="flex size-14 items-center justify-center border border-border text-foreground transition-colors group-hover:border-primary"
                    aria-hidden="true"
                  >
                    <step.icon className="size-6" strokeWidth={1.25} />
                  </span>
                  <span
                  className="font-mono text-6xl leading-none font-light tracking-tighter text-foreground/10 before:content-[attr(data-n)]"
                  data-n={String(i + 1).padStart(2, "0")}
                  aria-hidden="true"
                />
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">{step.title}</h3>
                  <p className="text-pretty leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
                <span
                  className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-500 group-hover:scale-x-100 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ol>
        </FadeUp>

        <a
          href={siteConfig.quoteHref}
          className="group flex min-h-11 w-fit items-center gap-3 font-mono text-sm uppercase tracking-[0.2em] text-foreground"
        >
          <span
            className="h-px w-8 bg-primary transition-[width] duration-300 group-hover:w-14 motion-reduce:transition-none"
            aria-hidden="true"
          />
          Start your enquiry
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
