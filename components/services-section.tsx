import { ServicesIndex, type ServiceIndexItem } from "@/components/services-index"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { photoAspect, resolvePhoto, type PhotoId } from "@/lib/photo-library"
import { SERVICES, type ServiceId } from "@/lib/services"

const SERVICE_PHOTOS: Partial<Record<ServiceId, PhotoId>> = {
  "manned-guarding": "manned-guarding",
  "events-security": "events-security",
  "k9-unit": "k9-unit",
}

export function ServicesSection() {
  // Photos are resolved on the server; uncleared entries become null and never reach the client.
  const items: ServiceIndexItem[] = SERVICES.map((service) => {
    const photoId = SERVICE_PHOTOS[service.id]
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      photo: photoId ? resolvePhoto(photoId) : null,
      aspect: photoId ? photoAspect(photoId) : { width: 4, height: 5 },
    }
  })

  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-(--header-h) border-t border-border">
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

        <ServicesIndex items={items} />
      </div>
    </section>
  )
}
