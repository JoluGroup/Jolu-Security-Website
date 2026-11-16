import { ContactSection } from "@/components/contact-section"
import { IndustriesSection } from "@/components/industries-section"
import { IntroSection } from "@/components/intro-section"
import { MobileActionBar } from "@/components/mobile-action-bar"
import { Navbar } from "@/components/navbar"
import { PeopleSection } from "@/components/people-section"
import { ProtectionStage } from "@/components/protection-stage"
import { ServicesSection } from "@/components/services-section"
import { SiteFooter } from "@/components/site-footer"
import { TrustStrip } from "@/components/trust-strip"
import { WhySection } from "@/components/why-section"
import { firstClearedPhoto, resolvePhoto } from "@/lib/photo-library"
import { siteConfig } from "@/lib/site-config"

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  telephone: siteConfig.contact.phoneE164,
  email: siteConfig.contact.email,
}

export default function HomePage() {
  // Photo visibility is decided only by clearance records in lib/photo-library.ts.
  const heroPoster = firstClearedPhoto(["team-wide", "hero-3", "hero-1"])
  const layerPhotos = { access: resolvePhoto("gallery-2"), people: resolvePhoto("gallery-3") }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <ProtectionStage heroPoster={heroPoster} layerPhotos={layerPhotos} />
        <TrustStrip />
        <IntroSection />
        <ServicesSection />
        <IndustriesSection />
        <WhySection />
        <PeopleSection />
        <ContactSection />
      </main>
      <SiteFooter />
      <MobileActionBar />
    </>
  )
}
