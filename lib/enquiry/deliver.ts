import type { Enquiry } from "@/lib/enquiry/schema"
import { SERVICES } from "@/lib/services"

export type DeliveryConfig = { apiKey: string; from: string; to: string }

/** Reads delivery settings from server env only. Never falls back to invented values. */
export function getDeliveryConfig(): DeliveryConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.ENQUIRY_FROM?.trim()
  const to = process.env.ENQUIRY_TO?.trim()
  return apiKey && from && to ? { apiKey, from, to } : null
}

/**
 * Explicit delivery mode, read from ENQUIRY_DELIVERY. It does not depend on NODE_ENV,
 * so previews (which run production builds) behave exactly as configured.
 *
 *   live      send through Resend. Requires RESEND_API_KEY, ENQUIRY_FROM and ENQUIRY_TO.
 *             Having credentials alone never enables sending.
 *   test      validate and respond, never contact Resend, even if credentials exist.
 *   disabled  anything else (unset, empty, misspelled): the endpoint returns 503.
 */
export type DeliveryMode = "live" | "test" | "disabled"

export function getDeliveryMode(): DeliveryMode {
  const value = process.env.ENQUIRY_DELIVERY?.trim().toLowerCase()
  return value === "live" || value === "test" ? value : "disabled"
}

function buildText(enquiry: Enquiry, ref: string) {
  const service = SERVICES.find((s) => s.id === enquiry.service)?.name ?? enquiry.service
  return [
    `Website enquiry ${ref}`,
    "",
    `Name: ${enquiry.name}`,
    `Phone: ${enquiry.phone}`,
    `Email: ${enquiry.email}`,
    `Service: ${service}`,
    `County: ${enquiry.county}`,
    `Town/area: ${enquiry.town}`,
    "",
    "Details:",
    enquiry.details,
    "",
    "--",
    "Sent from the enquiry form on the Jolu Security website. The visitor consented to these details being used to respond to this enquiry.",
  ].join("\n")
}

/**
 * Submits the enquiry to Resend. A 2xx response with an `id` means the provider
 * ACCEPTED the message for sending; it does not confirm inbox delivery.
 */
export async function deliverEnquiry(
  enquiry: Enquiry,
  ref: string,
  config: DeliveryConfig,
): Promise<{ ok: true; id: string } | { ok: false }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": ref,
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        reply_to: enquiry.email,
        subject: `Website enquiry ${ref}`,
        text: buildText(enquiry, ref),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { ok: false }
    const body = (await res.json().catch(() => null)) as { id?: unknown } | null
    return typeof body?.id === "string" && body.id ? { ok: true, id: body.id } : { ok: false }
  } catch {
    return { ok: false }
  }
}
