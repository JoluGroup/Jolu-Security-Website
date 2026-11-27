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
 * Explicit delivery mode, read from ENQUIRY_DELIVERY. The mode itself does not depend on
 * NODE_ENV; test mode in a production build (previews included) additionally needs
 * ENQUIRY_ALLOW_PRODUCTION_TEST=true, enforced in the route.
 *
 *   live      send through Resend. Requires RESEND_API_KEY, ENQUIRY_FROM and ENQUIRY_TO.
 *             Having credentials alone never enables sending.
 *   test      validate and respond, never contact Resend, even if credentials exist.
 *   disabled  anything else (unset, empty, misspelled): the endpoint returns 503.
 */
export type DeliveryMode = "live" | "test" | "disabled"

/**
 * Test mode in a production build (NODE_ENV=production, which includes preview
 * deployments) discards real enquiries, so it must be opted into explicitly with
 * ENQUIRY_ALLOW_PRODUCTION_TEST=true. This flag only permits test mode there. It never
 * enables sending: test mode contacts Resend under no circumstances, and the flag has no
 * effect on live mode.
 */
export function isProductionTestAllowed() {
  return process.env.ENQUIRY_ALLOW_PRODUCTION_TEST?.trim().toLowerCase() === "true"
}

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
    ...(enquiry.referralSource ? [`How they heard about us: ${enquiry.referralSource}`] : []),
    "",
    "Details:",
    enquiry.details,
    "",
    "--",
    "Sent from the enquiry form on the Jolu Security website. The visitor consented to these details being used to respond to this enquiry.",
  ].join("\n")
}

/**
 * What we know after asking Resend to send the enquiry.
 *
 *   accepted   2xx with a message id: the provider ACCEPTED the message for sending. This does
 *              not confirm inbox delivery.
 *   rejected   the provider answered with a 4xx (other than 408/409): it refused the request, so
 *              nothing was sent and the visitor can safely retry.
 *   uncertain  we cannot tell whether the message was sent: a timeout or network error after the
 *              request may have been received, a 5xx, a 408/409, or a 2xx without a usable id.
 *              The visitor must NOT be told that nothing was sent.
 */
export type DeliveryOutcome =
  | { kind: "accepted"; id: string }
  | { kind: "rejected"; status: number; providerError?: ProviderErrorName }
  | {
      kind: "uncertain"
      reason: "timeout" | "network" | "server_error" | "conflict" | "bad_response"
      /** HTTP status the provider answered with, when there was an answer. */
      status?: number
      providerError?: ProviderErrorName
    }

/**
 * Provider error names that may appear in logs. Anything else is dropped, so a response body can never
 * smuggle text (or visitor data, keys, addresses) into the logs. The list comes from Resend's published
 * error reference plus two legacy names; it is a fixed allowlist, not derived from the response.
 */
export const PROVIDER_ERROR_NAMES = [
  "invalid_idempotency_key",
  "validation_error",
  "missing_api_key",
  "invalid_api_key",
  "restricted_api_key",
  "suspended_api_key",
  "email_above_quota",
  "invalid_permission",
  "invalid_from_address",
  "not_found",
  "method_not_allowed",
  "concurrent_idempotent_requests",
  "invalid_idempotent_request",
  "resource_locked",
  "invalid_attachment",
  "invalid_parameter",
  "missing_required_field",
  "missing_required_parameter",
  "daily_quota_exceeded",
  "monthly_quota_exceeded",
  "rate_limit_exceeded",
  "security_error",
  "application_error",
  "internal_server_error",
  "service_unavailable",
] as const
export type ProviderErrorName = (typeof PROVIDER_ERROR_NAMES)[number]

const MAX_ERROR_BODY_CHARS = 4096

/** Maps an untrusted value to an allowlisted provider error name, or undefined. Never returns input text. */
export function allowlistedProviderError(value: unknown): ProviderErrorName | undefined {
  return typeof value === "string" ? PROVIDER_ERROR_NAMES.find((n) => n === value) : undefined
}

/** Reads only the `name` field of an error response, bounded and failure-tolerant. The body is never kept or logged. */
async function readProviderError(res: Response): Promise<ProviderErrorName | undefined> {
  try {
    const text = await res.text()
    if (text.length > MAX_ERROR_BODY_CHARS) return undefined
    return allowlistedProviderError((JSON.parse(text) as { name?: unknown } | null)?.name)
  } catch {
    return undefined
  }
}

/**
 * Submits the enquiry to Resend. `ref` doubles as the Idempotency-Key, so a retry that reuses the
 * same ref (see dedup.ts) asks Resend not to send a second message. Whether Resend honours the key
 * for this endpoint is an external assumption that is not verified here.
 */
export async function deliverEnquiry(enquiry: Enquiry, ref: string, config: DeliveryConfig): Promise<DeliveryOutcome> {
  let res: Response
  try {
    res = await fetch("https://api.resend.com/emails", {
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
  } catch (error) {
    const name = (error as { name?: string } | null)?.name
    return { kind: "uncertain", reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network" }
  }
  if (res.ok) {
    const body = (await res.json().catch(() => null)) as { id?: unknown } | null
    return typeof body?.id === "string" && body.id
      ? { kind: "accepted", id: body.id }
      : { kind: "uncertain", reason: "bad_response" }
  }
  const providerError = await readProviderError(res)
  if (res.status === 408 || res.status === 409) return { kind: "uncertain", reason: "conflict", status: res.status, providerError }
  if (res.status >= 400 && res.status < 500) return { kind: "rejected", status: res.status, providerError }
  return { kind: "uncertain", reason: "server_error", status: res.status, providerError }
}
