# Legacy production exposure and remediation proposal

Status: PROPOSAL ONLY. Nothing here has been executed. `main` and every other branch are unchanged, and nothing was deployed.

## Facts (verified from git objects in this clone; no network access was used)

- Branch `main` (head 459529f, "Add files via upload") is the old static site. Its repository root contains `index.html`, `assets/`, `favicon.ico`, `placeholder.svg`, `robots.txt` and a root-level `lovable-uploads/` folder with 67 files.
- Those 67 files are the same set that the redesign had under `public/lovable-uploads/` (file-for-file name match): 14 named staff portraits in `team/`, 26 gallery and group photos, hero images, service and industry images, a profile page image, two PDFs (`brochure.pdf`, `company-profile.pdf`) and `jolu-logo.png`.
- The legacy bundle `assets/index-csAAFF5b.js` references 50 of these paths, including both PDFs. The `team/` portraits are not referenced by the bundle, but they are still ordinary static files at the repository root.
- The GitHub repository `JoluGroup/jolu-security-website` is PUBLIC (per the task brief). Therefore every file on every branch and in all history is downloadable from GitHub by anyone, independent of what any deployment serves.
- The live site is reported to be built from `main`; a static deployment of the repo root normally serves every file in it, so these files are probably reachable at `https://<live-domain>/lovable-uploads/...`. This was NOT verified here (no network calls allowed). The owner or an authorised verifier should confirm with a plain HTTP request.

## What this remediation branch changes, and what it does not

Changes (branch `remediate/c-asset-security`): uncleared photos and both PDFs were removed from `public/` and withheld from this branch's history (originals preserved in a private bundle; hash-only manifest `docs/assets/WITHHELD-MANIFEST.sha256`); the registry now requires approved files to live under `public/cleared/`; tests prevent regression.

Does not change: the legacy deployment, `main`, GitHub visibility, or git history. All older history (including the old blobs on `main`) remains downloadable from the public repository.

## Options

| Option | Effect | Limits |
|---|---|---|
| A. Small PR to `main` removing `lovable-uploads/` (or at least `team/` and the PDFs) | Live legacy site stops serving them after redeploy; images referenced by the old bundle would 404, so the old page would show broken images | Files stay in history and on GitHub; needs owner approval of site degradation |
| B. Make the GitHub repository private | Stops anonymous download of files and history from GitHub; combined with A, stops serving | Existing forks, clones and caches may persist; requires the owner to confirm Vercel/GitHub integration still works |
| C. Move originals to private storage (cloud bucket or private repo), keep only a hash manifest here | Durable home for originals | Does not remove what is already public; requires owner-chosen storage |
| D. Rewrite history to purge files (filter-repo, force-push) | Removes files from the repository's refs | NOT authorised. Does not recall forks, clones or cached copies; requires GitHub support to purge cached views and PR refs |
| E. Do nothing until the hosting migration | Smallest change | Exposure continues until the cutover |

## Minimal production-remediation proposal (not deployed)

1. Owner decides the sensitivity threshold. Staff portraits (`team/*`) and the two PDFs are the highest priority, followed by group and event photographs.
2. Preserve originals first: keep the private bundle (or copy the legacy `lovable-uploads/` tree) in private storage and verify with `docs/assets/WITHHELD-MANIFEST.sha256`.
3. Open a PR to `main` that deletes `lovable-uploads/team/`, `lovable-uploads/brochure.pdf` and `lovable-uploads/company-profile.pdf` (the team portraits are not referenced by the legacy bundle, so the old page is unaffected; the PDFs are linked from the old page and the download links will 404). Review before merge; do not auto-merge.
4. Make the repository private if the owner agrees, then confirm the hosting integration still builds.
5. Verify afterwards with unauthenticated HTTP requests to the former URLs, expecting 404 or 403.

## Sequencing relative to the hosting migration

- Before cutover: do step 2 (preserve) and decide A/B. Ship this remediation branch with the redesign so the new deployment never serves uncleared files.
- If the redesign deployment replaces the legacy deployment on the production domain, the legacy `lovable-uploads` URLs stop being served by the production domain at cutover, but the GitHub exposure remains until B/C/D.
- If cutover is delayed, option A is the only action that stops the live legacy exposure sooner.
- After cutover, retire or archive `main` and `legacy-static/` per the owner's policy.

## Owner decisions required

1. Is the repository to be made private (and when)?
2. Authorise the PR to `main` removing the files (A), including accepting broken legacy images/PDF links in the interim?
3. Where do originals live (private storage choice and access control)?
4. Is a history rewrite wanted despite its limits? (Not authorised in this work.)
5. For each photo and document: who supplies consent, copyright and venue permission evidence, and who approves publication?
6. Has any person pictured already objected or requested removal? If so, treat as urgent.
