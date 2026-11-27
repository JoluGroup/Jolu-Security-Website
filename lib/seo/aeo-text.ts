// Fixed wording used by the AEO components (components/aeo/*). It lives here, not inside the components, so that the SAME
// strings are included in the page sections the publication gate reviews (lib/seo/service-sections.ts): no rendered
// sentence escapes the claim scan. Headings are claim-free on purpose: the gate rejects claims in headings, so
// pricing and licensing words are kept out of them. Plain ASCII only (lib/seo/text-policy.ts).
export const AEO_HEADINGS = {
  answer: "In short",
  budget: "Budget factors",
  requirements: "What buyers should ask for",
  assessment: "What a site assessment should cover",
  scope: "What the service covers",
  confirm: "Confirmed with you in writing",
  regulatory: "Regulatory considerations",
  request: "How to request a site assessment",
  faq: "Frequently asked questions",
} as const

export const purposeHeading = (serviceName: string) => `What ${serviceName} is for`
export const requestLinkText = (serviceName: string) => `Request a site assessment for ${serviceName}`

export const AEO_TABLE_HEADERS = { factor: "Factor", why: "Why it affects the budget" } as const

/**
 * Shown above the assessment steps: they are a proposed process, not a statement about operations. It names the service so
 * that no paragraph is identical across pages (the publication gate rejects paragraphs copied from a sibling page).
 */
export const assessmentNote = (serviceName: string) =>
  `This is the process JOLU SECURITY proposes for ${serviceName}. The details are confirmed with you in writing, and nothing here is a statement about work done for other clients.`
