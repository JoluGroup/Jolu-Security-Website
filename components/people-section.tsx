import { MaskReveal, ParallaxFrame } from "@/components/motion-frames"
import { PhotoSlot } from "@/components/photo-slot"
import { Emphasis, Eyebrow, SectionTitle } from "@/components/section-heading"
import { photoAspect, resolvePhoto, type PhotoId } from "@/lib/photo-library"
import { cn } from "@/lib/utils"

type Frame = { id: PhotoId; className: string; sizes: string; parallax?: boolean; delay?: number }

const FRAMES: Frame[] = [
  { id: "team-wide", className: "md:col-span-8", sizes: "(min-width: 768px) 66vw, 100vw", parallax: true },
  { id: "gallery-3", className: "md:col-span-4 md:mt-24", sizes: "(min-width: 768px) 33vw, 100vw", parallax: true, delay: 0.1 },
  { id: "gallery-1", className: "md:col-span-5 md:col-start-2", sizes: "(min-width: 768px) 42vw, 100vw" },
  { id: "gallery-13", className: "md:col-span-3 md:mt-16", sizes: "(min-width: 768px) 25vw, 100vw", delay: 0.08 },
  { id: "office-team", className: "md:col-span-3 md:-mt-8", sizes: "(min-width: 768px) 25vw, 100vw", delay: 0.16 },
]

export function PeopleSection() {
  return (
    <section id="people" aria-labelledby="people-title" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 py-24 md:py-32 lg:px-8">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="flex flex-col gap-6 md:col-span-7">
            <Eyebrow>People and operations</Eyebrow>
            <SectionTitle id="people-title">
              The <Emphasis>people</Emphasis> behind the service
            </SectionTitle>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-12">
          {FRAMES.map((frame) => {
            const photo = resolvePhoto(frame.id)
            const slot = <PhotoSlot photo={photo} aspect={photoAspect(frame.id)} sizes={frame.sizes} />
            return (
              <li key={frame.id} className={cn("flex flex-col gap-3", frame.className)}>
                <MaskReveal delay={frame.delay}>
                  {frame.parallax ? <ParallaxFrame amount={6}>{slot}</ParallaxFrame> : slot}
                </MaskReveal>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Our team</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
