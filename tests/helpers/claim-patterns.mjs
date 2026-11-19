// Words and phrases that would be unsupported public claims today (lib/claims.ts: every claim "needs-evidence").
export const CLAIM_PATTERNS = [
  /licen[cs]ed/i, /registered/i, /certified/i, /accredited/i, /compliant/i, /\bpsra\b/i,
  /24\s?\/\s?7/, /24[- ]hours?/i, /round[- ]the[- ]clock/i, /around the clock/i,
  /(?<![\w-])best(?![\w-])/i, /(?<![\w-])top[- ](rated|tier)(?![\w-])/i, /(?<![\w-])leading(?![\w-])/i, /\btrusted\b/i, /\bno\.?\s?1\b/i, /#1/, /award/i,
  /guarantee/i, /\brapid\b/i, /(?<![\w-])fast(?![\w-])/i, /within \d+/i, /\b\d+\s*(minutes?|hours?|hrs?)\b/i, /\d+\+/, /since \d{4}/i, /\bover \d+ years/i,
  /testimonial/i, /\breviews?\b/i, /rated/i, /\bstars?\b/i, /\bcheap/i, /\baffordable\b/i,
]
export const claimsIn = (text) => CLAIM_PATTERNS.filter((rx) => rx.test(text)).map(String)

// Wording found in legacy marketing documents and common sales language that the claims registry has no approved
// evidence for. Used for proposed copy (titles, descriptions, headings), where the bar is stricter than for existing source.
export const QUALITY_CLAIM_PATTERNS = [
  /\bswift(ly)?\b/i, /\bimmediate(ly)?\b/i, /\belite\b/i, /state[- ]of[- ]the[- ]art/i, /cutting[- ]edge/i,
  /\bhighly[- ]trained\b/i, /\bexperienced\b/i, /\breliab(le|ility)\b/i, /\bdependable\b/i, /\bprofessional(ism)?\b/i,
  /\bexceptional\b/i, /\badvanced\b/i, /\bdurable\b/i, /low[- ]maintenance/i, /\bpowerful\b/i, /\bcontinuous(ly)?\b/i,
  /\bstandby\b/i, /\bpremier\b/i, /\bexpert/i, /\bwarrant(y|ies)\b/i, /\binternational\b/i, /\bcompetitive\b/i,
  /\ball[- ]time\b/i, /\bexplosives?\b/i, /\bnarcotics?\b/i, /\bbouncers?\b/i,
]
export const strictClaimsIn = (text) => [...CLAIM_PATTERNS, ...QUALITY_CLAIM_PATTERNS].filter((rx) => rx.test(text)).map(String)
