"use client"

import { motion, MotionConfig, type Variants } from "framer-motion"
import { ArrowRight, Phone } from "lucide-react"
import { StatusDot } from "@/components/status-dot"
import { StatusPanel } from "@/components/status-panel"
import { siteConfig } from "@/lib/site-config"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function Hero() {
  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden border-b border-border"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-0 -z-10 h-[640px] w-full max-w-4xl bg-[radial-gradient(ellipse_at_30%_40%,rgb(225_29_46/0.18),transparent_60%)]"
        />

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-24">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col lg:col-span-7"
          >
            <motion.p
              variants={fadeUp}
              className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground"
            >
              <StatusDot tone="primary" />
              Security you can rely on
            </motion.p>

            <motion.h1
              id="hero-title"
              variants={fadeUp}
              className="mt-6 text-balance text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              Protection built for places where{" "}
              <span className="text-primary">failure is not an option.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Manned guarding, K9, CCTV, electric fencing and VIP close protection across Kenya.
              Licensed, vetted, 24/7 monitored.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href={siteConfig.assessmentHref}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Request a Security Assessment
                <ArrowRight
                  className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
              <a
                href={siteConfig.contact.phoneHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-input px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Phone className="size-4" aria-hidden="true" />
                Call <span className="font-mono">{siteConfig.contact.phoneDisplay}</span>
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="mt-4 text-sm text-muted-foreground">
              {siteConfig.contact.replyPromise}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5"
          >
            <StatusPanel />
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  )
}
