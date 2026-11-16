import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"

/** Renders siteConfig.offices with identical wording on every surface. */
export function OfficeList({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {siteConfig.offices.map((office) => (
        <li
          key={office.name}
          className={cn("flex flex-col gap-1 border-t border-border last:border-b", compact ? "py-3" : "py-4")}
        >
          <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-foreground">{office.name}</span>
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{office.label}</span>
          </span>
          <span className="text-pretty text-sm leading-relaxed text-muted-foreground">{office.address}</span>
        </li>
      ))}
    </ul>
  )
}
