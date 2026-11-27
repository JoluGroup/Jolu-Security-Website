"use client"

import { useRef, type ReactNode } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useIsSmallScreen, usePrefersReducedMotion } from "@/lib/use-media-preferences"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

/** One-time masked reveal: content wipes up from the bottom edge the first time it enters view. */
export function MaskReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = usePrefersReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** One-time fade-up for text blocks. */
export function FadeUp({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = usePrefersReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Subtle vertical parallax inside a clipped frame. `amount` is a percentage of the frame height. */
export function ParallaxFrame({ children, className, amount = 6 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const small = useIsSmallScreen()
  const range = reduced ? 0 : small ? amount / 2 : amount
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${range}%`, `${range}%`])

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.div style={{ y, scale: range ? 1 + (range * 2.2) / 100 : 1 }}>{children}</motion.div>
    </div>
  )
}
