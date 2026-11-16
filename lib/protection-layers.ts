export type LayerId = "perimeter" | "access" | "eyes" | "response" | "people"

export type ProtectionLayer = {
  id: LayerId
  name: string
  services: string
  headline: { lead: string; emphasis: string }
  description: string
}

// These layers are a visual framing of Jolu's existing services. They are not claims
// about operating procedures, response times or how services are combined on site.
export const PROTECTION_LAYERS: readonly ProtectionLayer[] = [
  {
    id: "perimeter",
    name: "Perimeter",
    services: "Electric fencing",
    headline: { lead: "Every perimeter,", emphasis: "defended." },
    description: "Electric fencing installed along the boundary of your property.",
  },
  {
    id: "access",
    name: "Access",
    services: "Manned guarding",
    headline: { lead: "Every entrance,", emphasis: "controlled." },
    description: "Guards at the entrances you choose to control, managing who comes in and out.",
  },
  {
    id: "eyes",
    name: "Eyes",
    services: "CCTV installation",
    headline: { lead: "Every angle,", emphasis: "watched." },
    description: "CCTV camera systems installed to cover the areas that matter to you.",
  },
  {
    id: "response",
    name: "Response",
    services: "Alarm response and K9 unit",
    headline: { lead: "Every alarm,", emphasis: "answered." },
    description: "Alarm response and K9 unit services as part of your site's security.",
  },
  {
    id: "people",
    name: "People",
    services: "VIP close protection and events security",
    headline: { lead: "Every person,", emphasis: "protected." },
    description: "VIP close protection and events security for individuals and the occasions they attend.",
  },
] as const
