// Single source of truth for the optional "How did you hear about us?" field.
// Imported by the client form (options) and the API schema (validation). There is no free-text path:
// the only accepted values are these exact labels.
export const REFERRAL_SOURCES = [
  "Google Search",
  "ChatGPT / OpenAI",
  "Google Gemini",
  "Perplexity AI",
  "Microsoft Copilot",
  "LinkedIn / Social Media",
  "Client Referral / Word of Mouth",
  "Directory / Tender Portal",
  "Other",
] as const

export type ReferralSource = (typeof REFERRAL_SOURCES)[number]

export function isReferralSource(value: unknown): value is ReferralSource {
  return typeof value === "string" && (REFERRAL_SOURCES as readonly string[]).includes(value)
}
