/**
 * Existing, owner-approved public copy that contains wording the SEO workbook treats as a quality claim
 * ("professional"). It is NOT changed here: approved website copy is frozen. It is listed so the owner can
 * decide whether it is evidenced (lib/claims.ts has no approved claim for it) and so tests fail if NEW
 * unreviewed occurrences appear.
 */
export type CopyReviewItem = {
  file: string
  phrase: string
  note: string
}

export const COPY_REVIEW_ITEMS: readonly CopyReviewItem[] = [
  {
    file: "components/protection-stage.tsx",
    phrase: "Professional Protection",
    note: "Hero tagline. Quality wording with no approved claim behind it; owner to approve as brand voice or replace.",
  },
  {
    file: "lib/services.ts",
    phrase: "Professionalism",
    note: "Values title with the description 'Conduct, presentation and communication held to a high standard.' Owner to confirm it is a value statement, not a verified claim.",
  },
]

/** Words that mark copy for owner review (not a pass/fail claim rule). */
export const COPY_REVIEW_PATTERN = /\bprofessional(ism)?\b/i
