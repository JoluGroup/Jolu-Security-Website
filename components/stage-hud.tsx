"use client"

import { motion, type MotionValue } from "framer-motion"
import { PROTECTION_LAYERS } from "@/lib/protection-layers"
import { cn } from "@/lib/utils"

const pad = (n: number) => String(n).padStart(2, "0")

export function StageHud({
  activeLayer,
  progress,
  onSelect,
}: {
  activeLayer: number
  progress: MotionValue<number>
  onSelect: (index: number) => void
}) {
  const total = PROTECTION_LAYERS.length
  const current = activeLayer >= 0 ? PROTECTION_LAYERS[activeLayer] : null

  return (
    <nav
      aria-label="Layers of protection"
      className="absolute inset-x-0 bottom-20 border-t border-border bg-background/70 backdrop-blur-md md:bottom-0"
    >
      <motion.div
        className="absolute inset-x-0 -top-px h-px origin-left bg-primary"
        style={{ scaleX: progress }}
        aria-hidden="true"
      />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <p className="flex min-w-0 items-baseline gap-3 font-mono text-xs uppercase tracking-[0.2em]" aria-live="polite">
          <span className="whitespace-nowrap text-foreground">
            Layer {current ? pad(activeLayer + 1) : "00"}{" "}
            <span className="text-muted-foreground">/ {pad(total)}</span>
          </span>
          <span className="hidden truncate text-muted-foreground sm:inline">{current ? current.name : "Overview"}</span>
        </p>
        <ol className="flex items-center gap-1">
          {PROTECTION_LAYERS.map((layer, i) => {
            const isActive = i === activeLayer
            const isPast = i < activeLayer
            return (
              <li key={layer.id}>
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Go to layer ${i + 1}: ${layer.name}`}
                  className="group flex h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span
                    className={cn(
                      "block h-0.5 transition-all duration-500",
                      isActive ? "w-8 bg-primary" : isPast ? "w-4 bg-foreground/70" : "w-4 bg-foreground/25 group-hover:bg-foreground/60",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "hidden font-mono text-[11px] uppercase tracking-[0.18em] lg:inline",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {layer.name}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
