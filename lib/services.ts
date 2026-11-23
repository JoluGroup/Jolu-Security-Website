export const SERVICES = [
  {
    id: "manned-guarding",
    name: "Manned Guarding",
    description: "Security guards stationed at the sites and entrances you choose.",
  },
  {
    id: "events-security",
    name: "Events Security",
    description: "Security personnel for public and private events.",
  },
  {
    id: "k9-unit",
    name: "K9 Unit Services",
    description: "Dog and handler teams as part of a site's security arrangements.",
  },
  {
    id: "cctv-installation",
    name: "CCTV Installation",
    description: "Supply and installation of CCTV camera systems.",
  },
  {
    id: "electric-fencing",
    name: "Electric Fencing",
    description: "Installation of electric fencing along property boundaries.",
  },
  {
    id: "alarm-response",
    name: "Alarm Response",
    description: "Response to alarm activations.",
  },
  {
    id: "vip-close-protection",
    name: "VIP Close Protection",
    description: "Personal protection for individuals and their movements.",
  },
] as const

export type ServiceId = (typeof SERVICES)[number]["id"]

export const SERVICE_IDS = SERVICES.map((s) => s.id) as readonly ServiceId[]

export function isServiceId(value: unknown): value is ServiceId {
  return typeof value === "string" && (SERVICE_IDS as readonly string[]).includes(value)
}

export const INDUSTRIES = [
  { id: "residential", name: "Residential", description: "Homes, estates and residential communities." },
  { id: "commercial", name: "Commercial", description: "Offices, business premises and commercial property." },
  { id: "educational", name: "Educational", description: "Schools, colleges and other learning institutions." },
  { id: "retail", name: "Retail", description: "Shops, malls and other retail spaces." },
  { id: "hospitality", name: "Hospitality", description: "Hotels, restaurants and venues." },
  { id: "construction", name: "Construction", description: "Building sites, materials and equipment." },
] as const

export const VALUES = [
  { name: "Integrity", description: "Doing what is right, openly and consistently." },
  { name: "Vigilance", description: "Paying close attention to the places and people in our care." },
  { name: "Professionalism", description: "Conduct, presentation and communication held to a high standard." },
] as const
