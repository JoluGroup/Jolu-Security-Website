// Single source of truth for contact details, navigation and trust content on the homepage.
// Edit values here; components read from this object only.
export const siteConfig = {
  name: "Jolu Group Security",
  logo: {
    src: "https://www.jolusecurity.com/lovable-uploads/jolu-logo.png",
    alt: "Jolu Group Security logo",
  },
  contact: {
    phoneDisplay: "+254 790 298 003",
    phoneHref: "tel:+254790298003",
    whatsappHref: "https://wa.me/254790298003",
  },
  licence: {
    // TODO(jolu): replace with the official licence number before publishing.
    number: "[LICENCE NO. — TO BE CONFIRMED]",
    isPlaceholder: true,
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
} as const
