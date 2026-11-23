import { FadeUp } from "@/components/motion-frames"
import { PhotoSlot } from "@/components/photo-slot"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { photoAspect, resolvePhoto } from "@/lib/photo-library"
import { INDUSTRIES } from "@/lib/services"

const INDUSTRY_PHOTO = "gallery-13" as const

export function IndustriesSection() {
  const photo = resolvePhoto(INDUSTRY_PHOTO)

  return (
    <section id="industries" aria-labelledby="industries-title" className="scroll-mt-(--header-h) border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 py-24 md:py-32 lg:grid-cols-12 lg:gap-8 lg:px-8">
        <div className="flex flex-col gap-14 lg:col-span-7">
          <FadeUp className="flex flex-col gap-6">
            <Eyebrow>Industries</Eyebrow>
            <SectionTitle id="industries-title">Security Solutions for Different Environments</SectionTitle>
          </FadeUp>
          <ol className="flex flex-col border-t border-border">
            {INDUSTRIES.map((industry, i) => (
              <li key={industry.id} className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 border-b border-border py-8 md:py-10">
                <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between md:gap-8">
                  <h3 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">{industry.name}</h3>
                  <p className="max-w-xs text-pretty leading-relaxed text-muted-foreground md:text-right">
                    {industry.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="hidden lg:col-span-4 lg:col-start-9 lg:block">
          <div className="sticky top-[calc(var(--header-h)+2rem)]">
            <PhotoSlot photo={photo} aspect={photoAspect(INDUSTRY_PHOTO)} sizes="33vw" />
          </div>
        </div>
      </div>
    </section>
  )
}
