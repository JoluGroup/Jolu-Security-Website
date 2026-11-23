# Asset policy and withheld originals

## Where the originals are

66 legacy files (photographs of people, page images, stock-looking imagery and two PDFs) are not cleared for
publication. They have been removed from `public/` and are **withheld from this repository's new history**: no
copy of them, and no path naming them, is added by this branch. The originals are preserved in a private
bundle held by the repository owner. This repository keeps only a hash-only manifest,
`WITHHELD-MANIFEST.sha256` (SHA-256, neutral index `W001`..`W066`, and a coarse kind), so the originals can be
verified later: hash each file from the private bundle and match it against the manifest.

## What this does not do

The old blobs still exist in older public history (`main` and earlier branches). Nothing in this branch removes
them. Only making the repository private, or a history rewrite (not authorised and of limited effect, since
clones, forks and caches may keep copies), can remove them. See
`legacy-exposure-and-production-proposal.md`.

## Rules enforced by `pnpm check:assets` and `tests/assets`

1. Any media or PDF file under `public/` must be either on the pinned brand allowlist (SHA-256) or referenced by an
   approved registry entry (`lib/photo-library.ts`, `lib/document-library.ts`) and live under `public/cleared/`.
2. A registry entry that is not fully cleared must not have its file under `public/`.
3. No file anywhere in the working tree (any directory, any name) may have a SHA-256 listed in the manifest.
   The check does not require the withheld files to exist.
4. Code outside the registries must not hard-code `/lovable-uploads/` (except the logo), `/cleared/` or
   `quarantine` paths.
5. The manifest must be well formed and list exactly 66 entries.

## Clearing a file for publication

1. Obtain the file from the private bundle and record all four clearance criteria in the registry with evidence
   (staff photos need employee consent on record).
2. Place it at `public/cleared/<path>` (the registry `src` is `/cleared/<path>`).
3. Remove its line from `WITHHELD-MANIFEST.sha256` and lower `WITHHELD_COUNT` in
   `scripts/assets/asset-rules.mjs` by one; otherwise the guard fails because the file matches a withheld hash.
4. Run `pnpm test` and `pnpm check:assets`.
