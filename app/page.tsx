import type { Metadata } from "next"
import { ContactSection } from "@/components/contact-section"
import { IndustriesSection } from "@/components/industries-section"
import { IntroSection } from "@/components/intro-section"
import { PeopleSection } from "@/components/people-section"
import { ProtectionStage } from "@/components/protection-stage"
import { ServicesSection } from "@/components/services-section"
import { SiteShell } from "@/components/site-shell"
import { TrustStrip } from "@/components/trust-strip"
import { WhySection } from "@/components/why-section"
import { firstClearedPhoto, resolvePhoto } from "@/lib/photo-library"
import { buildHomeJsonLd, serializeJsonLd } from "@/lib/seo/json-ld"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = pageMetadata("/")

const homeJsonLd = serializeJsonLd(buildHomeJsonLd())

export default function HomePage() {
  // Photo visibility is decided only by clearance records in lib/photo-library.ts.
  const heroPoster = firstClearedPhoto(["team-wide", "hero-3", "hero-1"])
  const layerPhotos = { access: resolvePhoto("gallery-2"), people: resolvePhoto("gallery-3") }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: homeJsonLd }}
      />
      <SiteShell>
        <ProtectionStage heroPoster={heroPoster} layerPhotos={layerPhotos} />
        <TrustStrip />
        <IntroSection />
        <ServicesSection />
        <IndustriesSection />
        <WhySection />
        <PeopleSection />
        <ContactSection />
      </SiteShell>
    </>
  )
}
