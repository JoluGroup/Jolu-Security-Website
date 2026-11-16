import { cn } from "@/lib/utils"

export function StatusDot({
  tone = "status",
  pulse = false,
  className,
}: {
  tone?: "status" | "primary"
  pulse?: boolean
  className?: string
}) {
  const color = tone === "status" ? "bg-status" : "bg-primary"
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden="true">
      {pulse && (
        <span className={cn("absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping", color)} />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  )
}
