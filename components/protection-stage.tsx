"use client"

import { useCallback, useRef, useState } from "react"
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { ArrowRight, ChevronDown, MessageCircle, Phone } from "lucide-react"
import { HeroMedia } from "@/components/hero-media"
import { LayerScene, type MediaSlot } from "@/components/layer-scene"
import { PhotoSlot } from "@/components/photo-slot"
import { StageHud } from "@/components/stage-hud"
import { Button } from "@/components/ui/button"
import type { ResolvedPhoto } from "@/lib/photo-library"
import { PROTECTION_LAYERS, type LayerId, type ProtectionLayer } from "@/lib/protection-layers"
import { siteConfig } from "@/lib/site-config"
import { usePrefersReducedMotion } from "@/lib/use-media-preferences"
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

export type LayerPhotos = Partial<Record<LayerId, ResolvedPhoto | null>>

const STEP_COUNT = PROTECTION_LAYERS.length + 1
const HANDOFF_END = 0.15
const EASE = [0.22, 1, 0.36, 1] as const

// The five layers are a visual framing of Jolu's existing services,
// not a claim about how operations are sequenced or carried out on site.
const LAYERS_EYEBROW = "How we layer protection"

type StageProps = { heroPoster: ResolvedPhoto | null; layerPhotos: LayerPhotos }

export function ProtectionStage(props: StageProps) {
  const reduced = usePrefersReducedMotion()
  return reduced ? <StackedLayers {...props} /> : <PinnedStage {...props} />
}

function LayerVisual({ layer, photo, isStatic, className }: { layer: ProtectionLayer; photo?: ResolvedPhoto | null; isStatic?: boolean; className?: string }) {
  const media = MEDIA_SLOTS[layer.id]
  if (!media.video && photo) {
    return (
      <motion.div
        className={cn("relative overflow-hidden", className)}
        initial={isStatic ? false : { clipPath: "inset(12% 8% 12% 40%)" }}
        animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
        transition={{ duration: 1.2, ease: EASE }}
      >
        <PhotoSlot photo={photo} aspect={photo} sizes="100vw" fill className="h-full" />
      </motion.div>
    )
  }
  return <LayerScene scene={layer.id} media={media} isStatic={isStatic} className={className} />
}

function PinnedStage({ heroPoster, layerPhotos }: StageProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] })

  const heroScale = useTransform(scrollYProgress, [0, HANDOFF_END], [1, 1.08])
  const heroOpacity = useTransform(scrollYProgress, [0, HANDOFF_END], [1, 0])
  const heroFilter = useTransform(scrollYProgress, [0, HANDOFF_END], ["grayscale(0)", "grayscale(1)"])

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

  const activeLayer = step === 0 ? null : PROTECTION_LAYERS[step - 1]

  return (
    <section
      ref={sectionRef}
      id="layers-of-protection"
      aria-labelledby="stage-title"
      className="relative h-[380svh] md:h-[560svh]"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ scale: heroScale, opacity: heroOpacity, filter: heroFilter }}
          aria-hidden="true"
        >
          <HeroMedia poster={heroPoster} />
        </motion.div>

        <AnimatePresence initial={false}>
          {activeLayer && (
            <motion.div
              key={activeLayer.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <LayerVisual layer={activeLayer} photo={layerPhotos[activeLayer.id]} className="size-full" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="stage-veil pointer-events-none absolute inset-0" />

        <div className="relative mx-auto grid h-full max-w-7xl px-5 pt-[calc(var(--header-h)+1rem)] pb-44 md:pb-32 lg:px-8 [@media(max-height:640px)]:pt-[calc(var(--header-h)+0.5rem)] [@media(max-height:640px)_and_(max-width:767px)]:pb-[9.5rem] [@media(max-height:480px)_and_(max-width:767px)]:pb-[8.5rem]!">
          <div className="relative col-start-1 row-start-1 self-center md:max-w-2xl">
            <IntroCopy active={step === 0} />
            {PROTECTION_LAYERS.map((layer, i) => (
              <LayerCopy key={layer.id} layer={layer} index={i} active={step === i + 1} />
            ))}
          </div>
        </div>

        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-36 hidden justify-center md:bottom-28 md:flex [@media(max-height:700px)]:md:hidden"
          animate={{ opacity: step === 0 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden={step !== 0}
        >
          <span className="flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Scroll to discover
            <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
          </span>
        </motion.div>

        <StageHud activeLayer={step - 1} progress={scrollYProgress} onSelect={goToLayer} />
      </div>
    </section>
  )
}

function HeroActions({ tab }: { tab?: number }) {
  return (
    <div className="flex flex-col gap-5 pt-2 [@media(max-height:640px)]:gap-0 [@media(max-height:640px)]:pt-0">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" tabIndex={tab} className="h-12 px-6 text-base [@media(max-height:640px)]:h-11" nativeButton={false} render={<a href={siteConfig.quoteHref} />}>
          Request a Quote
          <ArrowRight aria-hidden="true" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          tabIndex={tab}
          className="h-12 border-input bg-background/40 px-6 text-base backdrop-blur-sm [@media(max-height:640px)]:hidden"
          nativeButton={false}
          render={<a href={siteConfig.servicesHref} />}
        >
          Explore Services
        </Button>
        <a
          href={siteConfig.servicesHref}
          tabIndex={tab}
          className="hidden h-11 items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-foreground underline-offset-4 hover:underline [@media(max-height:640px)]:inline-flex"
        >
          Our services
          <ArrowRight className="size-4 text-primary" aria-hidden="true" />
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm [@media(max-height:640px)]:hidden [@media(max-height:790px)_and_(max-width:767px)]:hidden">
        <a
          href={siteConfig.contact.phoneHref}
          tabIndex={tab}
          className="flex min-h-11 items-center gap-2 rounded-sm font-mono text-foreground underline-offset-4 hover:underline"
        >
          <Phone className="size-4 text-primary" aria-hidden="true" />
          {siteConfig.contact.phoneDisplay}
        </a>
        <a
          href={siteConfig.contact.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={tab}
          className="flex min-h-11 items-center gap-2 rounded-sm text-foreground underline-offset-4 hover:underline"
        >
          <MessageCircle className="size-4 text-primary" aria-hidden="true" />
          WhatsApp us
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  )
}

function IntroCopy({ active }: { active: boolean }) {
  return (
    <motion.div
      // Server-rendered visible so the h1 paints before hydration; the entrance is a CSS animation, not a JS-gated opacity:0 state.
      className={cn(
        "flex flex-col gap-6 [@media(max-height:640px)]:gap-4 [@media(max-height:480px)]:gap-2! duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:animate-in motion-safe:slide-in-from-bottom-6",
        !active && "pointer-events-none",
      )}
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <IntroText />
      <HeroActions tab={active ? 0 : -1} />
    </motion.div>
  )
}

function IntroText() {
  return (
    <>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
        <span>{siteConfig.name}</span> <span aria-hidden="true">•</span> <span>Professional Protection</span>
      </p>
      <h1
        id="stage-title"
        className="text-balance text-5xl font-semibold leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl [@media(max-height:640px)]:text-4xl [@media(max-height:480px)]:text-3xl!"
      >
        Confidence in every <em className="font-serif font-normal italic text-primary">layer</em> of protection.
      </h1>
      <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl [@media(max-height:640px)]:hidden [@media(max-height:790px)_and_(max-width:767px)]:hidden">{siteConfig.description}</p>
    </>
  )
}

function LayerCopy({ layer, index, active }: { layer: ProtectionLayer; index: number; active: boolean }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col gap-5"
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.7, ease: EASE, delay: active ? 0.15 : 0 }}
      aria-hidden={!active}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{LAYERS_EYEBROW}</p>
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
        <span className="text-red-400">Layer {String(index + 1).padStart(2, "0")}</span>
        <span aria-hidden="true"> / </span>
        {layer.name}
        <span className="sr-only"> — </span>
        <span className="mt-2 block normal-case tracking-normal text-foreground/70 md:mt-0 md:ml-3 md:inline">{layer.services}</span>
      </p>
      <h2 className="text-balance text-5xl font-semibold leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
        {layer.headline.lead} <em className="font-serif font-normal italic text-primary">{layer.headline.emphasis}</em>
      </h2>
      <p className="max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">{layer.description}</p>
    </motion.div>
  )
}

function StackedLayers({ heroPoster, layerPhotos }: StageProps) {
  return (
    <section id="layers-of-protection" aria-labelledby="stage-title">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <HeroMedia poster={heroPoster} />
        </div>
        <div className="stage-veil pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex min-h-[80svh] max-w-7xl flex-col justify-center gap-6 px-5 pt-28 pb-20 lg:px-8">
          <IntroText />
          <HeroActions />
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-20 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">{LAYERS_EYEBROW}</p>
        <ol className="flex flex-col gap-6">
          {PROTECTION_LAYERS.map((layer, i) => (
            <li key={layer.id} id={`layer-${layer.id}`} className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-2">
              <div className="flex flex-col gap-4 p-6 md:p-10">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <span className="text-red-400">Layer {String(i + 1).padStart(2, "0")}</span> / {layer.name}
                </p>
                <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight">
                  {layer.headline.lead} <em className="font-serif font-normal italic text-primary">{layer.headline.emphasis}</em>
                </h2>
                <p className="text-pretty leading-relaxed text-muted-foreground">{layer.description}</p>
                <p className="text-sm text-foreground/70">{layer.services}</p>
              </div>
              <LayerVisual layer={layer} photo={layerPhotos[layer.id]} isStatic className="aspect-video md:aspect-auto md:min-h-72" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
