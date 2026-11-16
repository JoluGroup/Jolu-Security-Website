import type { LucideIcon } from "lucide-react"
import { Briefcase, Building2, Church, House, School, Ticket } from "lucide-react"
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
  const { clientCategories } = siteConfig

  return (
    <section aria-labelledby="trust-title" className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-8">
        <h2 id="trust-title" className="max-w-md text-pretty text-base leading-relaxed text-foreground">
          Security for estates, events, residential communities, churches, schools and businesses
        </h2>
        <ul className="flex flex-wrap gap-2">
          {clientCategories.map((category) => {
            const Icon = categoryIcons[category]
            return (
              <li key={category} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-foreground">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {category}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
