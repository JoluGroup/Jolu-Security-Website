// Analytics is OFF unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set to a real GA4 measurement ID (G-XXXXXXXXXX).
// No default and no placeholder ID exists anywhere in the code.

/** Accepts only a well-formed GA4 ID; anything else means disabled. */
export function parseMeasurementId(value: unknown): string | null {
  return typeof value === "string" && /^G-[A-Z0-9]{4,20}$/.test(value.trim()) ? value.trim() : null
}

/** Literal env access so Next.js can inline the NEXT_PUBLIC_ value into the client bundle. */
export function getMeasurementId(): string | null {
  return parseMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
}

export function isAnalyticsEnabled(): boolean {
  return getMeasurementId() !== null
}
