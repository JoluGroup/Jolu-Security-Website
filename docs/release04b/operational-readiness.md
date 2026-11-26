# Release 04B operational readiness (lanes A and I, staff-asset containment)

Checked 2026-11-26 from the Claude Account 2 environment. Status words: VERIFIED (evidence observed here), PENDING, BLOCKED (needs owner action), NOT AUTHORIZED. No provider account was signed in to, no setting was changed, no DNS record was touched, nothing was purchased and no enquiry was submitted.

## A. Release 04A publication (PR #13)

| Item | Status | Evidence |
| --- | --- | --- |
| Remote `publish/clean-main-squash` HEAD | VERIFIED | `git ls-remote`: `99078374392975df33615a61589e229e75e1e19b` |
| `main` unchanged | VERIFIED | `git ls-remote`: `459529fea3ef2ec878133ff0b28fe23de843723f` |
| PR #13 open and unmerged | VERIFIED | Public PR page: "Open", 21 commits from `publish/clean-main-squash` into `main` |
| GitHub CI for `9907837` | VERIFIED | Actions run #20 (id 45812977439), job "Test, typecheck, lint and build", **Success**, 1m 27s, triggered by the PR synchronize of 2026-11-26. 3 warnings: Node 20 action-runtime deprecation; two unused variables in `scripts/assets/build-inventory.mjs` (lines 21, 22) |
| CI test totals | PENDING | Logs need a GitHub sign-in; totals not read. Local re-run of `9907837` here: 606 passed, 0 failed, 0 skipped, real Redis (with substitute packages, see the acceptance report) |
| Vercel "Preview Comments" check | VERIFIED | Passed on `9907837` |
| Vercel deployment commit and preview READY | BLOCKED | Preview is protected (correct). Needs the owner signed in to Vercel to confirm the deployment for `9907837` |
| Referral field, form validation, mobile menu, phone and WhatsApp links on the preview | BLOCKED | Same: protected preview. Covered by unit and render tests locally |
| Analytics inactive | VERIFIED (code) | No measurement id, no tag script, no consent banner in the repository; tests assert it |
| No service-page exposure | VERIFIED (code) | Seven `app/services/<slug>/page.tsx` canonical gated templates (Release 04B final) answer `notFound()` with the empty manifest and ledger; sitemap lists only the homepage. To confirm on the deployed preview after push: `curl -I` of each `/services/<slug>` returns HTTP 404 |

## B. DNS (public resolver, read-only)

Matches the historical observations:

| Record | Value |
| --- | --- |
| NS | `abby.ns.cloudflare.com`, `melnicoff.ns.cloudflare.com` |
| A `jolusecurity.com` | `64.204.254.44` |
| CNAME `www` | `jolusecurity.com` |
| MX | `0 mail.jolusecurity.com` |
| A `mail` | `162.213.251.177` |
| TXT `_dmarc` | `v=DMARC1; p=none;` |
| TXT `resend._domainkey` | present, DKIM public key (`p=...`) |
| `send.jolusecurity.com` | CNAME `send.forge.rmta.net` (MX `10 feedback.forge.rmta.net`) |

Note: the `send` record does not point at the Amazon SES feedback host that Resend has historically issued. Confirm in the Resend account that this record belongs to the Resend domain before relying on it. Do not change it.

Still needed (BLOCKED, owner sign-in): authenticated Cloudflare access, a complete private zone export, exact cutover and rollback records, and mail continuity verification. The cutover may change only the website records (apex and `www`); MX, mail A, SPF, DKIM, DMARC, verification and Resend records stay untouched, and the separate HostPinnacle-to-Namecheap mail migration is not touched.

## C. Providers

| Provider | Status | What is needed |
| --- | --- | --- |
| Vercel | BLOCKED | Owner sign-in. Plan approved in principle; before payment: billing address, checkout total, taxes, recurring terms, then owner confirmation. Preview protection stays on; production not activated |
| Upstash | BLOCKED | Owner sign-in. Approved: pay-as-you-go, $5 per database budget. Verify the budget is enforced per database (not assumed account-wide), alert thresholds, preview and production isolation; provision only the approved minimum |
| Resend | BLOCKED | Owner sign-in. Verify account ownership, sending domain and DNS verification, authorised sender, intended recipient, provider limits. Then one test enquiry in an approved window to an approved mailbox, with provider acceptance AND mailbox receipt evidence |
| GitHub governance | PENDING | JoluGroup is a personal account on GitHub Free with a public repository. Confirm the current GitHub Pro price and terms before any spending (separate authorisation). The proposed model must work for a sole owner: required CI, no force-push, no branch deletion, PR-only changes to `main`, independent engineering review recorded in the PR (no impossible second GitHub approver) |

Enquiry limits, verified in `lib/enquiry/rate-limit.ts` (`DEFAULTS`) and `.env.example`:

| Limit | Default | Override variable | Accepted range |
| --- | --- | --- | --- |
| Per client | 5 per 600 s (10 minutes) | `ENQUIRY_CLIENT_LIMIT`, `ENQUIRY_CLIENT_WINDOW_SECONDS` | 1-1000; 60-86400 s |
| Site-wide hourly | **30 per 3600 s** | `ENQUIRY_GLOBAL_LIMIT`, `ENQUIRY_GLOBAL_WINDOW_SECONDS` | 1-100000; 60-86400 s |
| Site-wide daily | **80 per 86400 s** | `ENQUIRY_DAILY_LIMIT`, `ENQUIRY_DAILY_WINDOW_SECONDS` | 1-100000; 60-86400 s |

The obsolete "200 per hour" was the hourly default before commit `3320350`. A value outside its range, or not a whole number, falls back to the default. The repository sets no override (no `vercel.json`; `.env.example` lists them commented out). Whether the Vercel project sets any override for preview or production can only be read in Vercel (owner sign-in). No quota was changed.

## D. Staff-asset privacy containment

| Surface | Status | Evidence |
| --- | --- | --- |
| Clean publication branch | VERIFIED | 66 withheld files absent; hash-only manifest `docs/assets/WITHHELD-MANIFEST.sha256`; `check:assets` and asset tests pass; candidate ancestry contains only `publish/clean-main-squash` commits |
| Live legacy website | **NOT CONTAINED** | `https://jolusecurity.com/` is still the legacy Lovable site, and `/lovable-uploads/company-profile.pdf` still returns the 6-page company profile PDF (checked 2026-11-26). Staff portrait paths were not probed (the repository records hashes only) |
| Older public Git history | NOT CONTAINED | Old blobs remain in `main` and earlier branches. Making the repository private, or an authorised history rewrite, is required; neither revokes existing copies |

Step-by-step owner runbook: `docs/release04b/legacy-containment-runbook.md` (host identification, read-only document-root check against the hash manifest, private backup, removal with explicit 404 instead of SPA fallback, verification). The host behind `64.204.254.44` has no reverse-DNS name (NXDOMAIN, checked 2026-11-27), so it must be identified from the owner's records. Prepared, not executed: explicit 404 handling for removed assets on the new site (no SPA fallback; Next.js answers unknown paths with a real 404); a hash-only manifest; the containment plan. Not recoverable in this environment: the private recovery archive and the GitHub Support escalation draft (previous environment). Live containment needs owner access to the legacy host behind `64.204.254.44`, a confirmed document root, and a management decision on the two PDFs (questionnaire A11). Do not delete a referenced PDF without that decision.
