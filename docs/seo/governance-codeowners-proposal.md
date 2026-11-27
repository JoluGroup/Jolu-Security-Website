# Proposed publication governance (F-13) — proposal only

**Status: proposal. No `CODEOWNERS` file has been created and no repository setting has been changed.** The owner decides whether to adopt any of this.

## Problem

The publication gate checks data, not people. A pull request that edits the ledger, manifest, records and approval together could publish a page if the only reviewer is its author. The gate cannot tell whether an `authorization: "owner"` record was truly given by the owner.

## Proposed controls

1. A `CODEOWNERS` file requiring review from a named owner and a named compliance reviewer for these paths:
   - `lib/seo/page-records.ts`, `lib/seo/evidence-ledger.ts`, `lib/seo/publication-manifest.ts`, `lib/seo/publication-requirements.ts`, `lib/seo/publication-deps.ts`
   - `lib/claims.ts`
   - `app/services/`, `app/locations/`
   - `lib/seo/publication-gate.ts` and `tests/seo/` (so the checks cannot be weakened quietly)
2. Branch protection on the default branch: required review from code owners, required status check "Test, typecheck, lint and build", no self-approval, no bypass.
3. The approval `reference` should be a verifiable item (signed email or ticket) that the compliance reviewer opens before approving.
4. A PR template for publication changes listing the 5B.1 / 5B.2 acceptance checklists and the evidence being relied on.
5. A calendar owner for renewing `PUBLICATION_AS_OF` and licence expiries.

## Not done here

Creating `CODEOWNERS`, enabling branch protection or changing any repository setting is outside this milestone and needs the owner's decision.
