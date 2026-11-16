"use client"

import { useCallback, useRef, useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion"
import { ArrowRight, ChevronDown } from "lucide-react"
import { LayerScene, type MediaSlot, type SceneId } from "@/components/layer-scene"
import { StageHud } from "@/components/stage-hud"
import { Button } from "@/components/ui/button"
import { PROTECTION_LAYERS, type LayerId, type ProtectionLayer } from "@/lib/protection-layers"
import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"

// Drop real footage in here later. A `video` replaces that layer's SVG scene;
// `poster` is shown while it loads or if it cannot play. Paths are relative to /public.
export const MEDIA_SLOTS: Record<LayerId, MediaSlot> = {
  perimeter: { video: undefined, poster: undefined },
  access: { video: undefined, poster: undefined },
  eyes: { video: undefined, poster: undefined },
  response: { video: undefined, poster: undefined },
  people: { video: undefined, poster: undefined },
}

const STEP_COUNT = PROTECTION_LAYERS.length + 1
const EASE = [0.22, 1, 0.36, 1] as const

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"
function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(reducedMotionQuery)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  )
}

export function ProtectionStage() {
  const reduced = usePrefersReducedMotion()
  return reduced ? <StackedLayers /> : <PinnedStage />
}

function PinnedStage() {
  const sectionRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] })

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(STEP_COUNT - 1, Math.max(0, Math.floor(p * STEP_COUNT)))
    setStep((prev) => (prev === next ? prev : next))
  })

  const goToLayer = useCallback((layerIndex: number) => {
    const el = sectionRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const scrollable = el.offsetHeight - window.innerHeight
    const target = top + scrollable * ((layerIndex + 1 + 0.5) / STEP_COUNT)
    window.scrollTo({ top: target, behavior: "smooth" })
  }, [])

  const scene: SceneId = step === 0 ? "intro" : PROTECTION_LAYERS[step - 1].id
  const media = step === 0 ? undefined : MEDIA_SLOTS[PROTECTION_LAYERS[step - 1].id]

  return (
    <section
      ref={sectionRef}
      id="layers-of-protection"
      aria-labelledby="stage-title"
      className="relative h-[380svh] md:h-[560svh]"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={scene}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <LayerScene scene={scene} media={media} />
          </motion.div>
        </AnimatePresence>

        <div className="stage-veil pointer-events-none absolute inset-0" />

        <div className="relative mx-auto grid h-full max-w-7xl px-5 pt-24 pb-44 md:pb-32 lg:px-8">
          <div className="relative col-start-1 row-start-1 self-center md:max-w-2xl">
            <IntroCopy active={step === 0} />
            {PROTECTION_LAYERS.map((layer, i) => (
              <LayerCopy key={layer.id} layer={layer} index={i} active={step === i + 1} />
            ))}
          </div>
        </div>

        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-36 flex justify-center md:bottom-28"
          animate={{ opacity: step === 0 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden={step !== 0}
        >
          <span className="flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Scroll to discover
            <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
          </span>
        </motion.div>

        <StageHud
          activeLayer={step - 1}
          progress={scrollYProgress}
          onSelect={goToLayer}
        />
      </div>
    </section>
  )
}

function IntroCopy({ active }: { active: boolean }) {
  const tab = active ? 0 : -1
  return (
    <motion.div
      className={cn("flex flex-col gap-6", !active && "pointer-events-none")}
      initial={{ opacity: 0, y: 24 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
        <span>Jolu Security</span> <span aria-hidden="true">•</span> <span>Professional Protection</span>
      </p>
      <h1
        id="stage-title"
        className="text-balance text-5xl font-semibold leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
      >
        Confidence in every{" "}
        <em className="font-serif font-normal italic text-primary">layer</em> of protection.
      </h1>
      <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
        Professional security solutions built around the people, properties and operations that matter to you.
      </p>
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          size="lg"
          tabIndex={tab}
          className="h-12 px-6 text-base"
          nativeButton={false}
          render={<a href={siteConfig.quoteHref} />}
        >
          Request a Quote
          <ArrowRight aria-hidden="true" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          tabIndex={tab}
          className="h-12 border-input bg-background/40 px-6 text-base backdrop-blur-sm"
          nativeButton={false}
          render={<a href={siteConfig.servicesHref} />}
        >
          Explore Services
        </Button>
      </div>
    </motion.div>
  )
}

function LayerCopy({ layer, index, active }: { layer: ProtectionLayer; index: number; active: boolean }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col gap-5"
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.7, ease: EASE, delay: active ? 0.15 : 0 }}
    >
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
        <span className="text-primary">Layer {String(index + 1).padStart(2, "0")}</span>
        <span aria-hidden="true"> / </span>
        {layer.name}
        <span className="sr-only"> — </span>
        <span className="mt-2 block normal-case tracking-normal text-foreground/70 md:mt-0 md:ml-3 md:inline">
          {layer.services}
        </span>
      </p>
      <h2 className="text-balance text-5xl font-semibold leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
        {layer.headline.lead}{" "}
        <em className="font-serif font-normal italic text-primary">{layer.headline.emphasis}</em>
      </h2>
      <p className="max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
        {layer.description}
      </p>
    </motion.div>
  )
}

function StackedLayers() {
  return (
    <section id="layers-of-protection" aria-labelledby="stage-title" className="pt-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-20 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Jolu Security <span aria-hidden="true">•</span> Professional Protection
        </p>
        <h1 id="stage-title" className="text-balance text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl">
          Confidence in every <em className="font-serif font-normal italic text-primary">layer</em> of protection.
        </h1>
        <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Professional security solutions built around the people, properties and operations that matter to you.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<a href={siteConfig.quoteHref} />}>
            Request a Quote
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-6 text-base" nativeButton={false} render={<a href={siteConfig.servicesHref} />}>
            Explore Services
          </Button>
        </div>
      </div>
      <ol className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-20 lg:px-8">
        {PROTECTION_LAYERS.map((layer, i) => (
          <li
            key={layer.id}
            id={`layer-${layer.id}`}
            className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-2"
          >
            <div className="flex flex-col gap-4 p-6 md:p-10">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <span className="text-primary">Layer {String(i + 1).padStart(2, "0")}</span> / {layer.name}
              </p>
              <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight">
                {layer.headline.lead} <em className="font-serif font-normal italic text-primary">{layer.headline.emphasis}</em>
              </h2>
              <p className="text-pretty leading-relaxed text-muted-foreground">{layer.description}</p>
              <p className="text-sm text-foreground/70">{layer.services}</p>
            </div>
            <LayerScene scene={layer.id} media={MEDIA_SLOTS[layer.id]} isStatic className="aspect-video md:aspect-auto md:min-h-72" />
          </li>
        ))}
      </ol>
    </section>
  )
}
