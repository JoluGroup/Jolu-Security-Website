// Pure, dependency-free analytics vocabulary and privacy sanitiser. No DOM, no network.
// Everything that can leave the browser goes through sanitizeEvent(): anything not explicitly
// allowlisted is dropped, so PII cannot be emitted by accident.
import { isReferralSource } from "@/lib/enquiry/referral"
import { isServiceId } from "@/lib/services"

export const ANALYTICS_EVENTS = [
  "generate_lead",
  "phone_click",
  "whatsapp_click",
  "enquiry_attempt",
  "enquiry_accepted",
  "enquiry_uncertain",
  "enquiry_rejected",
] as const
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

export const SOURCE_COMPONENTS = ["enquiry_form", "header", "footer", "nav", "main", "other"] as const
export type SourceComponent = (typeof SOURCE_COMPONENTS)[number]

/** The ONLY parameter keys that may be emitted. */
export const PARAM_ALLOWLIST = ["page_path", "service", "referral_source", "source_component"] as const

export type AnalyticsParams = {
  page_path?: string
  service?: string
  referral_source?: string
  source_component?: string
}
export type SafeParams = Partial<Record<(typeof PARAM_ALLOWLIST)[number], string>>

export function isAnalyticsEvent(name: unknown): name is AnalyticsEventName {
  return typeof name === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(name)
}

/** Path only: no origin, query or hash. Returns undefined for anything that is not a plain, short path. */
export function safePagePath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) return undefined
  let path: string
  try {
    path = new URL(value, "https://placeholder.invalid").pathname
  } catch {
    return undefined
  }
  // Letters, digits and URL-safe punctuation only. Rejects "@", "%", spaces etc. so an identifier
  // smuggled into a path segment (an email, an encoded token) is dropped rather than emitted.
  return path.length <= 200 && /^\/[A-Za-z0-9\-_./]*$/.test(path) ? path : undefined
}

/**
 * Returns a copy containing only allowlisted keys with allowlisted/validated values. Unknown keys
 * (name, phone, email, message, token, url ...) are dropped. Never throws.
 */
export function sanitizeParams(raw: unknown): SafeParams {
  const out: SafeParams = {}
  if (!raw || typeof raw !== "object") return out
  const input = raw as Record<string, unknown>
  const path = safePagePath(input.page_path)
  if (path) out.page_path = path
  if (isServiceId(input.service)) out.service = input.service
  if (isReferralSource(input.referral_source)) out.referral_source = input.referral_source
  if (typeof input.source_component === "string" && (SOURCE_COMPONENTS as readonly string[]).includes(input.source_component)) {
    out.source_component = input.source_component
  }
  return out
}

/** Unknown event names yield null (nothing is sent). */
export function sanitizeEvent(name: unknown, raw: unknown): { name: AnalyticsEventName; params: SafeParams } | null {
  if (!isAnalyticsEvent(name)) return null
  return { name, params: sanitizeParams(raw) }
}
