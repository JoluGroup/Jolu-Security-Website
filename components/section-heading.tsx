import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground", className)}>
      <span className="h-px w-6 bg-primary" aria-hidden="true" />
      {children}
    </p>
  )
}

export function SectionTitle({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      className={cn("text-balance text-4xl font-semibold leading-[1.02] tracking-tight text-foreground md:text-6xl", className)}
    >
      {children}
    </h2>
  )
}

export function Emphasis({ children }: { children: ReactNode }) {
  return <em className="font-serif font-normal italic text-primary">{children}</em>
}
