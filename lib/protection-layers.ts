export type LayerId = "perimeter" | "access" | "eyes" | "response" | "people"

export type ProtectionLayer = {
  id: LayerId
  name: string
  services: string
  headline: { lead: string; emphasis: string }
  description: string
}

export const PROTECTION_LAYERS: readonly ProtectionLayer[] = [
  {
    id: "perimeter",
    name: "Perimeter",
    services: "Electric fencing",
    headline: { lead: "Every perimeter,", emphasis: "defended." },
    description: "Electric fencing that deters, detects and delays intrusion right at the boundary line.",
  },
  {
    id: "access",
    name: "Access",
    services: "Manned guarding",
    headline: { lead: "Every entrance,", emphasis: "controlled." },
    description: "Trained, vetted guards managing who comes in, who leaves and when.",
  },
  {
    id: "eyes",
    name: "Eyes",
    services: "CCTV installation and monitoring",
    headline: { lead: "Every angle,", emphasis: "watched." },
    description: "CCTV installation and monitoring that keeps sight of what matters, day and night.",
  },
  {
    id: "response",
    name: "Response",
    services: "Alarm response and K9 unit",
    headline: { lead: "Every alarm,", emphasis: "answered." },
    description: "Alarm response teams and K9 units ready to move the moment something is wrong.",
  },
  {
    id: "people",
    name: "People",
    services: "VIP close protection and events security",
    headline: { lead: "Every person,", emphasis: "protected." },
    description: "VIP close protection and events security for the people at the centre of it all.",
  },
] as const
