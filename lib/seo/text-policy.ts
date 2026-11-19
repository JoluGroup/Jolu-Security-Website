// Policy for every string a published page can render. Claim scanning is only meaningful on text that cannot hide
// wording, so ambiguous text is REJECTED rather than silently normalised (normalising would let the scanner and the
// renderer disagree). Allowed: NFKC-stable text written in the Latin script with ASCII digits and ordinary spaces.
// Rejected: control, format (zero-width, soft hyphen, bidi), private-use, unassigned and surrogate code points;
// line and paragraph separators; any whitespace other than U+0020; combining marks; compatibility and fullwidth
// forms (anything NFKC would change); letters outside the Latin script; non-ASCII digits.
// Consequence for editors: type plain text. Typographic ellipses, non-breaking spaces and ligatures are rejected.

const HIDDEN = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{Zl}\p{Zp}]/u
const OTHER_WHITESPACE = /[^\S ]/u
const MARKS = /\p{M}/u
const NON_LATIN_LETTER = /(?!\p{Script=Latin})\p{L}/u
const NON_ASCII_DIGIT = /(?![0-9])\p{Nd}/u

/** Returns why `s` is not acceptable rendered text, or null. */
export function textProblem(s: unknown): string | null {
  if (typeof s !== "string") return "is not text"
  if (HIDDEN.test(s)) return "contains control, formatting or non-printing characters"
  if (OTHER_WHITESPACE.test(s)) return "contains whitespace other than an ordinary space"
  if (MARKS.test(s)) return "contains combining marks"
  if (s !== s.normalize("NFKC")) return "contains compatibility or fullwidth characters (not NFKC-stable)"
  if (NON_LATIN_LETTER.test(s)) return "contains letters outside the Latin script"
  if (NON_ASCII_DIGIT.test(s)) return "contains non-ASCII digits"
  return null
}
