"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { HeroEmblem } from "@/components/brand-art"
import { PhotoSlot } from "@/components/photo-slot"
import type { ResolvedPhoto } from "@/lib/photo-library"
import { siteConfig } from "@/lib/site-config"
import { usePrefersReducedMotion, useSaveData } from "@/lib/use-media-preferences"

/**
 * Hero background. Priority: licensed video (siteConfig.heroVideo) -> one cleared
 * poster photo -> a typographic composition that looks finished without any media.
 * Footage is decorative (aria-hidden) and must not be presented as Jolu staff
 * unless that is what it actually shows.
 */
export function HeroMedia({ poster }: { poster: ResolvedPhoto | null }) {
  const reduced = usePrefersReducedMotion()
  const saveData = useSaveData()
  const { srcWebm, srcMp4, poster: videoPoster } = siteConfig.heroVideo
  const hasVideo = Boolean(srcWebm || srcMp4)

  if (hasVideo && !reduced && !saveData) {
    return <HeroVideo webm={srcWebm} mp4={srcMp4} poster={videoPoster} />
  }

  if (hasVideo && videoPoster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- poster URL is configured content, size unknown
      <img src={videoPoster} alt="" aria-hidden="true" className="photo-grade absolute inset-0 size-full object-cover" />
    )
  }

  if (poster) {
    return (
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { scale: 1.04 }}
        animate={{ scale: 1 }}
        transition={{ duration: 14, ease: "linear" }}
      >
        <PhotoSlot photo={poster} aspect={poster} sizes="100vw" priority fill className="h-full" />
      </motion.div>
    )
  }

  return <TypographicComposition />
}

function HeroVideo({ webm, mp4, poster }: { webm: string | null; mp4: string | null; poster: string | null }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    let inView = true
    const sync = () => {
      if (inView && document.visibilityState === "visible") void video.play().catch(() => {})
      else video.pause()
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      sync()
    })
    observer.observe(video)
    document.addEventListener("visibilitychange", sync)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", sync)
    }
  }, [])

  return (
    <video
      ref={ref}
      className="photo-grade absolute inset-0 size-full object-cover"
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    >
      {webm && <source src={webm} type="video/webm" />}
      {mp4 && <source src={mp4} type="video/mp4" />}
    </video>
  )
}

function TypographicComposition() {
  return (
    <div className="grain absolute inset-0 overflow-hidden bg-background" aria-hidden="true">
      <div className="scene-grid absolute inset-0 scene" style={{ ["--scene-faint" as string]: "rgb(255 255 255 / 0.07)" }} />
      <div className="scene scene-glow absolute inset-0" />
      <HeroEmblem />
      <div className="absolute inset-x-0 top-1/3 hidden h-px bg-border md:block" />
      <div className="absolute inset-x-0 bottom-1/4 hidden h-px bg-border md:block" />
      <span className="absolute top-1/3 right-[6vw] hidden h-px w-40 -translate-y-px bg-primary md:block" />
    </div>
  )
}
