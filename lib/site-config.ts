// Single source of truth for brand, contact details and navigation.
// Edit values here; components read from this object only.
// Factual claims (licensing, availability, statistics) do NOT belong here — see lib/claims.ts.
// Office locations live in lib/offices.ts and client categories in lib/client-categories.ts (evidence-gated).

export type Phone = {
  /** Local format shown in compact UI, e.g. the contact bar. */
  display: string
  /** International format shown in larger contact blocks. */
  displayIntl: string
  e164: string
  href: string
}

const primaryPhone: Phone = {
  display: "0790 298 003",
  displayIntl: "+254 790 298 003",
  e164: "+254790298003",
  href: "tel:+254790298003",
}

const secondaryPhone: Phone = {
  display: "0705 038 679",
  displayIntl: "+254 705 038 679",
  e164: "+254705038679",
  href: "tel:+254705038679",
}

export const siteConfig = {
  name: "Jolu Security",
  url: "https://jolusecurity.com",
  // No geographic-coverage wording: coverage is unverified (lib/offices.ts, lib/claims.ts).
  description: "Security services: guarding, events, K9, CCTV, electric fencing, alarm response and VIP protection.",
  logo: {
    src: "/lovable-uploads/jolu-logo.png",
    alt: "Jolu Security logo",
  },
  contact: {
    primaryPhone,
    secondaryPhone,
    phones: [primaryPhone, secondaryPhone] as const,
    // Primary-number aliases kept for existing components and JSON-LD.
    phoneDisplay: primaryPhone.displayIntl,
    phoneE164: primaryPhone.e164,
    phoneHref: primaryPhone.href,
    whatsappNumber: "254790298003",
    whatsappHref: "https://wa.me/254790298003",
    whatsappGreeting: "Hello Jolu Security",
    email: "info@jolusecurity.com",
  },
  // Downloads moved to lib/document-library.ts: a link renders only for an approved document.
  // Licensed hero footage goes here. Fill these fields only — <HeroMedia> picks them up.
  // `licenceRef` should record where the footage licence is documented.
  heroVideo: {
    srcWebm: null as string | null,
    srcMp4: null as string | null,
    poster: null as string | null,
    licenceRef: null as string | null,
  },
  // Root-relative hashes so links work from any route; the homepage still scrolls in place.
  nav: [
    { label: "Services", href: "/#services" },
    { label: "Industries", href: "/#industries" },
    { label: "About", href: "/#about" },
    { label: "Why Jolu", href: "/#why-jolu" },
    { label: "Contact", href: "/#contact" },
    { label: "Blog", href: "/blog" },
  ],
  quoteHref: "/#contact",
  servicesHref: "/#services",
}

export function whatsappLink(message: string) {
  return `${siteConfig.contact.whatsappHref}?text=${encodeURIComponent(message)}`
}
