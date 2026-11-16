import type { LucideIcon } from "lucide-react"
import { Briefcase, Building2, Church, House, School, ShieldCheck, Ticket } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

const categoryIcons: Record<(typeof siteConfig.clientCategories)[number], LucideIcon> = {
  Estates: Building2,
  Events: Ticket,
  "Residential communities": House,
  Churches: Church,
  Schools: School,
  Businesses: Briefcase,
}

export function TrustStrip() {
  const { licence, clientCategories } = siteConfig

  return (
    <section aria-label="Licensing and clients" className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 lg:flex-row lg:items-center lg:gap-12 lg:px-8">
        <div className="flex shrink-0 items-center gap-4 rounded-lg border border-border px-4 py-3">
          <ShieldCheck className="size-6 text-foreground" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Licensed and Vetted</span>
            <span
              className={`font-mono text-xs ${licence.isPlaceholder ? "text-muted-foreground italic" : "text-muted-foreground"}`}
              data-placeholder={licence.isPlaceholder || undefined}
            >
              Licence {licence.number}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <h2 className="shrink-0 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Trusted by
          </h2>
          <ul className="flex flex-wrap gap-2">
            {clientCategories.map((category) => {
              const Icon = categoryIcons[category]
              return (
                <li
                  key={category}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-foreground"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {category}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
