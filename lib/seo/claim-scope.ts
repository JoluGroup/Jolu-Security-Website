// Which wording each registry claim may authorise. lib/claims.ts is unchanged and carries no scope, so the scope
// lives here, explicitly, per claim id. A bound statement can unlock a span of claim-sensitive wording only if the
// claim's scope permits that span's category AND (where listed) its wording. A claim id with no entry here authorises
// nothing, so a newly registered claim must be scoped in a reviewed change before a page can use it.
//
// LIMIT: the categories come from keyword rules (lib/seo/claim-classifier.ts and the extra patterns in the gate).
// This is a heuristic safety net for known wording. It does NOT establish that any statement is true, and wording the
// rules do not recognise is controlled only by editorial and compliance review.
import { deepFreeze } from "@/lib/seo/freeze"

export const CATEGORY = {
  licensing: "licensing",
  quality: "superlative or quality",
  availability: "availability or response time",
  pricing: "pricing",
  recognition: "awards or recognition",
  coverage: "coverage claim",
  statistics: "numbers or track record",
  guarantee: "guarantee",
  designation: "office designation",
} as const

export type ClaimScope = { categories: readonly string[]; terms?: readonly RegExp[] }

export const CLAIM_SCOPE: Readonly<Record<string, ClaimScope>> = deepFreeze({
  "licensed-compliant": { categories: [CATEGORY.licensing] },
  "availability-24-7": { categories: [CATEGORY.availability], terms: [/^(24\/7|24 ?x ?7|24 ?hours?|24-hours?|round[- ]the[- ]clock|twenty[- ]four)/i] },
  "trained-personnel": { categories: [CATEGORY.quality], terms: [/^(trained|vetted|professional|experienced)$/i] },
  "technology-driven": { categories: [] },
  "trusted-by-clients": { categories: [CATEGORY.quality], terms: [/^trusted$/i] },
  "years-operating": { categories: [CATEGORY.statistics], terms: [/\byears?\b/i, /^since\b/i] },
  "guards-deployed": { categories: [CATEGORY.statistics], terms: [/\bguards\b/i] },
  "reply-time": { categories: [CATEGORY.availability], terms: [/^(response time|rapid|fast|quick|immediate|same[- ]day)$/i] },
} as Record<string, ClaimScope>)
