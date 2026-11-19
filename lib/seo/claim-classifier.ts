import type { ClaimCategory, ClassificationBasis } from "@/lib/seo/types"

/**
 * Explicit, reproducible rule set for deciding which workbook keywords are "claim-sensitive": writing
 * them into public copy would assert something that needs evidence or owner approval first
 * (lib/claims.ts: every claim is still "needs-evidence").
 *
 * Method: a keyword is matched case-insensitively, on whole words, against CLAIM_RULES. JUDGMENT_RULES
 * then add or remove categories where a pure word match is wrong or too narrow. Every judgment is listed
 * here with its reason and is repeated in docs/seo/implementation-matrix.md.
 *
 * "Claim-sensitive" does not mean "do not target". It means the page may use the topic, but must not
 * assert the claim (a licence, a best/top ranking, 24-hour availability, a price) until evidenced.
 */
export const CLAIM_RULES: readonly { category: ClaimCategory; pattern: RegExp }[] = [
  {
    category: "licensing",
    pattern: /\b(licen[cs]e[ds]?|licen[cs]ing|psra|registered|registration|accredited|accreditation|certified|certification|certificate|compliant|compliance)\b/i,
  },
  {
    category: "superlative or quality",
    pattern: /\b(best|top|leading|trusted|reliable|reputable|professional|affordable|cheap|cheapest|quality|premier|experienced|trained|vetted|insured|guaranteed)\b/i,
  },
  {
    category: "availability or response time",
    pattern: /\b(24\/7|24 ?hours?|24-hours?|round[- ]the[- ]clock|emergency|rapid|fast|quick|immediate|same[- ]day|response time|armed response|open now)\b/i,
  },
  {
    category: "pricing",
    pattern: /\b(costs?|prices?|pricing|rates?|quotations?|quotes?|fees?|how much)\b/i,
  },
]

export type JudgmentRule = {
  id: string
  category: ClaimCategory
  pattern: RegExp
  decision: "include" | "exclude"
  reason: string
}

export const JUDGMENT_RULES: readonly JudgmentRule[] = [
  {
    id: "J1-near-me",
    category: "local presence or proximity",
    pattern: /\b(near me|nearby|closest|nearest)\b/i,
    decision: "include",
    reason:
      "A page answering 'near me' implies a verified local office and reachable service area. Included so it is not written into copy before the office details are verified; no word rule would catch it.",
  },
  {
    id: "J2-best-placement",
    category: "superlative or quality",
    pattern: /\bbest\b.*\bplacement\b/i,
    decision: "exclude",
    reason:
      "'best CCTV placement for a home' asks for technique advice. 'best' does not describe the company, so no quality claim is made. Excluded from the superlative category.",
  },
]

export type Classification = {
  categories: ClaimCategory[]
  basis: ClassificationBasis
  /** Categories the word rules matched before judgment rules were applied. */
  ruleCategories: ClaimCategory[]
  judgmentRuleIds: string[]
}

export function classifyKeyword(keyword: string): Classification {
  const ruleCategories = CLAIM_RULES.filter((r) => r.pattern.test(keyword)).map((r) => r.category)
  const judgments = JUDGMENT_RULES.filter((j) => j.pattern.test(keyword))
  const excluded = new Set(judgments.filter((j) => j.decision === "exclude").map((j) => j.category))
  const included = judgments.filter((j) => j.decision === "include").map((j) => j.category)
  const kept = ruleCategories.filter((c) => !excluded.has(c))
  const categories = [...new Set([...kept, ...included])]
  const judgmentRuleIds = judgments
    .filter((j) => (j.decision === "exclude" ? ruleCategories.includes(j.category) : true))
    .map((j) => j.id)

  let basis: ClassificationBasis = "none"
  if (categories.length > 0) basis = kept.length > 0 ? "rule" : "judgment-included"
  else if (ruleCategories.length > 0) basis = "judgment-excluded"
  return { categories, basis, ruleCategories, judgmentRuleIds }
}
