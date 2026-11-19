// Enquiry validation shared by the client form (inline errors) and the API route (authoritative).
import { isKenyaCounty, type KenyaCounty } from "@/lib/kenya-counties"
import { isServiceId, type ServiceId } from "@/lib/services"
import { cleanLine, cleanMultiline } from "@/lib/enquiry/sanitize"

export const LIMITS = {
  name: 80,
  phone: 20,
  email: 120,
  town: 80,
  details: 2000,
  rawBodyBytes: 16 * 1024,
} as const

export const ENQUIRY_FIELDS = ["name", "phone", "email", "service", "county", "town", "details", "consent"] as const
export type EnquiryField = (typeof ENQUIRY_FIELDS)[number]
export type FieldErrors = Partial<Record<EnquiryField, string>>

export type Enquiry = {
  name: string
  phone: string
  email: string
  service: ServiceId
  county: KenyaCounty
  town: string
  details: string
}

/** Honeypot field name. Real visitors never see or fill it. */
export const HONEYPOT_FIELD = "company_website"

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/

/**
 * Normalises Kenyan numbers to E.164 (+2547XXXXXXXX / +2541XXXXXXXX).
 * Accepts 07.., 01.., 7.., 1.., 2547.., +2547.. with spaces, dashes or brackets.
 * Other international numbers in +E.164 form are accepted as-is.
 */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-().]/g, "")
  if (!/^\+?\d+$/.test(compact)) return null

  const kenyan = compact.match(/^(?:\+?254|0)?([71]\d{8})$/)
  if (kenyan) return `+254${kenyan[1]}`

  if (compact.startsWith("+") && !compact.startsWith("+254") && /^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact
  }
  return null
}

export function validateEnquiry(
  raw: unknown,
): { ok: true; data: Enquiry } | { ok: false; errors: FieldErrors } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const errors: FieldErrors = {}

  const name = cleanLine(input.name, LIMITS.name)
  if (name.length < 2) errors.name = "Enter your name."

  const phoneRaw = cleanLine(input.phone, LIMITS.phone + 10)
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null
  if (!phoneRaw) errors.phone = "Enter a phone number."
  else if (!phone) errors.phone = "Enter a valid phone number, for example 0712 345 678."

  const email = cleanLine(input.email, LIMITS.email).toLowerCase()
  if (!email) errors.email = "Enter your email address."
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address."

  const service = input.service
  if (!isServiceId(service)) errors.service = "Choose a service."

  const county = input.county
  if (!isKenyaCounty(county)) errors.county = "Choose a county from the list."

  const town = cleanLine(input.town, LIMITS.town)
  if (town.length < 2) errors.town = "Enter your town or area."

  const details = cleanMultiline(input.details, LIMITS.details)
  if (details.length < 10) errors.details = "Tell us a little about what you need (at least 10 characters)."

  if (input.consent !== true) errors.consent = "Please confirm you agree to us using these details to respond."

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    data: {
      name,
      phone: phone as string,
      email,
      service: service as ServiceId,
      county: county as KenyaCounty,
      town,
      details,
    },
  }
}

export type EnquiryResponse =
  // `duplicate: true` means an identical enquiry was already accepted a moment ago; nothing new was sent.
  | { ok: true; ref: string; state: "accepted"; duplicate?: true }
  | { ok: true; delivered: false; mode: "test" }
  | { ok: false; code: "invalid"; errors: FieldErrors }
  // Delivery outcome unknown: the enquiry may or may not have reached us. Never shown as success.
  | { ok: false; code: "delivery_uncertain"; ref: string }
  | {
      ok: false
      code:
        | "rate_limited"
        | "not_configured"
        | "unavailable"
        | "delivery_failed"
        | "in_progress"
        | "rejected"
        | "bad_request"
    }
