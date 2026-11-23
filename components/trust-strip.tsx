import type { LucideIcon } from "lucide-react"
import { Briefcase, Building2, Church, House, School, Ticket } from "lucide-react"
import { getApprovedClientCategories, type ClientCategory } from "@/lib/client-categories"

const categoryIcons: Record<ClientCategory["id"], LucideIcon> = {
  estates: Building2,
  events: Ticket,
  "residential-communities": House,
  churches: Church,
  schools: School,
  businesses: Briefcase,
}

/** Renders only evidence-approved client categories (lib/client-categories.ts); nothing at all when none are approved. */
export function TrustStrip() {
  const categories = getApprovedClientCategories()
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="trust-title" className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-8">
        <h2 id="trust-title" className="max-w-md text-pretty text-base leading-relaxed text-foreground">
          Security for {categories.map((c) => c.label.toLowerCase()).join(", ")}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = categoryIcons[category.id]
            return (
              <li key={category.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-foreground">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {category.label}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
