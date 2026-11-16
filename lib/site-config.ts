// Single source of truth for brand, contact details and navigation.
// Edit values here; components read from this object only.
// Factual claims (licensing, availability, statistics) do NOT belong here — see lib/claims.ts.

export type Phone = {
  /** Local format shown in compact UI, e.g. the contact bar. */
  display: string
  /** International format shown in larger contact blocks. */
  displayIntl: string
  e164: string
  href: string
}

export type Office = { name: string; label: string; address: string }

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

// Office locations follow the Jolu Machineries production footer, per the CEO's direction.
// Only the location descriptions are shared; every contact detail on this site is Jolu Security's own.
const offices: readonly Office[] = [
  { name: "Nairobi", label: "Head Office", address: "Thome, Nairobi, Kenya" },
  {
    name: "Nakuru",
    label: "Regional Office & Showroom",
    address: "Along West Road, Opposite Nakuru Athletics, Next to Evans Hospital, Nakuru, Kenya",
  },
  { name: "Migori", label: "Branch Office", address: "Near KENGAS Rongo, Migori, Kenya" },
]

export const siteConfig = {
  name: "Jolu Security",
  url: "https://www.jolusecurity.com",
  description: "Security services across Kenya.",
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
  offices,
  downloads: [
    { label: "Company profile", href: "/lovable-uploads/company-profile.pdf" },
    { label: "Brochure", href: "/lovable-uploads/brochure.pdf" },
  ],
  // Licensed hero footage goes here. Fill these fields only — <HeroMedia> picks them up.
  // `licenceRef` should record where the footage licence is documented.
  heroVideo: {
    srcWebm: null as string | null,
    srcMp4: null as string | null,
    poster: null as string | null,
    licenceRef: null as string | null,
  },
  clientCategories: [
    "Estates",
    "Events",
    "Residential communities",
    "Churches",
    "Schools",
    "Businesses",
  ],
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
