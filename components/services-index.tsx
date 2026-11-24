"use client"

import { useState } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, BellRing, Cctv, Dog, Fence, ShieldUser, Ticket, UserRoundCheck } from "lucide-react"
import { ServiceArt } from "@/components/brand-art"
import { PhotoSlot } from "@/components/photo-slot"
import type { ResolvedPhoto } from "@/lib/photo-library"
import type { ServiceId } from "@/lib/services"

const ICONS: Record<ServiceId, LucideIcon> = {
  "manned-guarding": ShieldUser,
  "events-security": Ticket,
  "k9-unit": Dog,
  "cctv-installation": Cctv,
  "electric-fencing": Fence,
  "alarm-response": BellRing,
  "vip-close-protection": UserRoundCheck,
}

export type ServiceIndexItem = {
  id: ServiceId
  name: string
  description: string
  photo: ResolvedPhoto | null
  aspect: { width: number; height: number }
}

const numeral = (i: number) => String(i + 1).padStart(2, "0")

// Link scroll={false} keeps Next from jumping on every query change, so the click scrolls explicitly.
// scrollIntoView honours the html scroll-padding-top (--header-h).
function scrollToEnquiry() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  requestAnimationFrame(() => {
    document.getElementById("contact")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" })
  })
}

export function ServicesIndex({ items }: { items: ServiceIndexItem[] }) {
  const [active, setActive] = useState(0)
  const current = items[active]

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <ul className="flex flex-col border-t border-border lg:col-span-7">
        {items.map((service, i) => {
          const Icon = ICONS[service.id]
          const isActive = i === active
          return (
            <li key={service.id} className="border-b border-border">
              <Link
                href={`/?service=${service.id}#contact`}
                scroll={false}
                onClick={scrollToEnquiry}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                data-active={isActive || undefined}
                className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 gap-y-2 py-6 md:py-8"
              >
                <span
                  className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-red-400 group-focus-visible:text-red-400 lg:group-data-active:text-red-400"
                  aria-hidden="true"
                >
                  {numeral(i)}
                </span>
                <span className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl lg:text-4xl">
                  <Icon
                    className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                  {service.name}
                </span>
                <ArrowUpRight
                  className="size-4 self-center text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden="true"
                />
                <span className="col-start-2 col-end-4 text-pretty leading-relaxed text-muted-foreground">
                  {service.description}
                  <span className="sr-only"> Enquire about {service.name}.</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="hidden lg:col-span-5 lg:block" aria-hidden="true">
        <div className="sticky top-[calc(var(--header-h)+2rem)]">
          <div key={current.id} className="animate-in fade-in duration-500 motion-reduce:animate-none">
            {current.photo ? (
              <PhotoSlot photo={current.photo} aspect={current.aspect} sizes="40vw" />
            ) : (
              <ServiceArt id={current.id} index={numeral(active)} total={String(items.length).padStart(2, "0")} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
