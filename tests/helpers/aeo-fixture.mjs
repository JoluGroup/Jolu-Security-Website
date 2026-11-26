// Test-only helpers for the answer-first service pages (never imported by application code).
// `scrubbed(content)` rewrites the few claim-sensitive words (pricing, regulator wording) in the real draft content so the
// text can pass the publication gate in a SYNTHETIC world. That is how the tests prove that, once a reviewer approves the
// pricing and regulatory wording, the content, sections, rendering and structured data all line up. It approves nothing.
const { SERVICE_CONTENT } = await import("@/lib/seo/service-content")
const { contentToSections } = await import("@/lib/seo/service-sections")
const { SERVICE_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const W = await import("./gate-world.mjs")

// Release 04B: the pricing swaps were removed. Plain commercial wording now passes the gate unchanged (lib/seo/publication-gate.ts,
// R04B claims policy), and rewriting it here produced ungrammatical text that the sentence allowlist rightly refuses.
// Only the regulator wording, which still needs compliance approval, is stood in for.
const SWAPS = [
  [/\bPrivate Security Regulatory Authority \(PSRA\)/g, "Authority"],
  [/\bPrivate Security Regulatory Authority\b/g, "Authority"],
  [/\bPSRA\b/g, "Authority"],
]
export const scrubText = (s) => SWAPS.reduce((acc, [re, to]) => acc.replace(re, to), s)
export const scrubDeep = (v) => (typeof v === "string" ? scrubText(v) : Array.isArray(v) ? v.map(scrubDeep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrubDeep(x)])) : v)

export const contentFor = (slug) => SERVICE_CONTENT.find((c) => c.slug === slug)
export const recordFor = (slug) => SERVICE_PAGE_RECORDS.find((r) => r.slug === slug)

/** A synthetic, fully approved world for `slug` whose sections are exactly the given content's sections. */
export function worldFor(slug, content) {
  return W.world(recordFor(slug), { sections: contentToSections(content), compliance: true })
}
