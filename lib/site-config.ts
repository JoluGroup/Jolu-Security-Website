// Single source of truth for brand, contact details and navigation.
// Edit values here; components read from this object only.
// Factual claims (licensing, availability, statistics) do NOT belong here — see lib/claims.ts.
export const siteConfig = {
  name: "Jolu Security",
  url: "https://www.jolusecurity.com",
  description: "Security services across Kenya.",
  logo: {
    src: "/lovable-uploads/jolu-logo.png",
    alt: "Jolu Security logo",
  },
  contact: {
    phoneDisplay: "+254 790 298 003",
    phoneE164: "+254790298003",
    phoneHref: "tel:+254790298003",
    whatsappNumber: "254790298003",
    whatsappHref: "https://wa.me/254790298003",
    whatsappGreeting: "Hello Jolu Security",
    email: "info@jolusecurity.com",
  },
  // TODO(jolu): confirm office names and locations with the company before publishing.
  offices: [
    { name: "Nairobi", detail: "Head Office" },
    { name: "Nakuru", detail: "KFA Building" },
    { name: "Rongo", detail: "Quickfill Service Station" },
  ],
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
  nav: [
    { label: "Services", href: "#services" },
    { label: "Industries", href: "#industries" },
    { label: "About", href: "#about" },
    { label: "Why Jolu", href: "#why-jolu" },
    { label: "Contact", href: "#contact" },
    { label: "Blog", href: "#blog" },
  ],
  quoteHref: "#contact",
  servicesHref: "#services",
}

export function whatsappLink(message: string) {
  return `${siteConfig.contact.whatsappHref}?text=${encodeURIComponent(message)}`
}
