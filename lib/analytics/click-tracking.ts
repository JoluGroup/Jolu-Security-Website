// Delegated click tracking for existing tel: and WhatsApp links, so no component markup is edited.
// Only the KIND of link and the page area are recorded; the phone number and URL are never read into an event.
import type { SourceComponent } from "@/lib/analytics/events"

export type LinkKind = "phone_click" | "whatsapp_click"

/** Classifies an href. Returns null for everything else (including malformed values). */
export function classifyLink(href: string | null | undefined): LinkKind | null {
  if (typeof href !== "string") return null
  const h = href.trim().toLowerCase()
  if (h.startsWith("tel:")) return "phone_click"
  try {
    const u = new URL(h)
    if (u.protocol === "https:" || u.protocol === "http:") {
      if (u.hostname === "wa.me" || u.hostname === "api.whatsapp.com" || u.hostname === "web.whatsapp.com") return "whatsapp_click"
    }
  } catch {
    // not an absolute URL
  }
  return null
}

/** Maps the nearest landmark ancestor tag to an allowlisted source component. */
export function sourceFromTag(tags: readonly string[]): SourceComponent {
  for (const t of tags) {
    const tag = t.toLowerCase()
    if (tag === "form") return "enquiry_form"
    if (tag === "header") return "header"
    if (tag === "footer") return "footer"
    if (tag === "nav") return "nav"
    if (tag === "main") return "main"
  }
  return "other"
}
