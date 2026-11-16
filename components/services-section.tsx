import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, BellRing, Cctv, Dog, Fence, ShieldUser, Ticket, UserRoundCheck } from "lucide-react"
import { PhotoSlot } from "@/components/photo-slot"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { photoAspect, resolvePhoto, type PhotoId } from "@/lib/photo-library"
import { SERVICES, type ServiceId } from "@/lib/services"

const ICONS: Record<ServiceId, LucideIcon> = {
  "manned-guarding": ShieldUser,
  "events-security": Ticket,
  "k9-unit": Dog,
  "cctv-installation": Cctv,
  "electric-fencing": Fence,
  "alarm-response": BellRing,
  "vip-close-protection": UserRoundCheck,
}

const SERVICE_PHOTOS: Partial<Record<ServiceId, PhotoId>> = {
  "manned-guarding": "manned-guarding",
  "events-security": "events-security",
  "k9-unit": "k9-unit",
}

export function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 py-24 md:py-32 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-6">
            <Eyebrow>Services</Eyebrow>
            <SectionTitle id="services-title">What we provide</SectionTitle>
          </div>
          <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
            Choose a service to start an enquiry. You can describe exactly what you need in the form.
          </p>
        </div>

        <ul className="flex flex-col">
          {SERVICES.map((service) => {
            const Icon = ICONS[service.id]
            const photoId = SERVICE_PHOTOS[service.id]
            const photo = photoId ? resolvePhoto(photoId) : null
            return (
              <li key={service.id} className="border-t border-border last:border-b">
                <Link
                  href={`/?service=${service.id}#contact`}
                  scroll={false}
                  className="group grid items-center gap-4 py-7 md:grid-cols-12 md:gap-8 md:py-9"
                >
                  <span className="flex items-center gap-4 md:col-span-5">
                    <Icon className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" strokeWidth={1.25} aria-hidden="true" />
                    <span className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{service.name}</span>
                  </span>
                  <span className="text-pretty leading-relaxed text-muted-foreground md:col-span-5">
                    {service.description}
                  </span>
                  <span className="flex items-center justify-between gap-4 md:col-span-2 md:justify-end">
                    {photo && photoId && (
                      <PhotoSlot photo={photo} aspect={photoAspect(photoId)} sizes="96px" className="w-24" />
                    )}
                    <span className="flex items-center gap-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground">
                      Enquire
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
