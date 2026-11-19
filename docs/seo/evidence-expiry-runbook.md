# Evidence expiry runbook (F5D5-02)

Status: **operational procedure, not yet exercised**. No page is published and the evidence ledger is empty, so today the monitor reports "no page is published". Nothing here is executed automatically, and nothing here authorises anyone to publish or unpublish a page.

## Why this exists

The publication gate decides as of a committed date (`PUBLICATION_AS_OF`) because prerendered code cannot read the clock. A page can therefore stay live after the evidence behind it has expired in real time. The continuous-integration check for the committed date runs only when a pull request is opened. The monitor below closes the *detection* gap. It does **not** remove the page: removal is a reviewed code change by an authorised operator.

## 1. How expiry is detected

| Mechanism | What it does | Limit |
| --- | --- | --- |
| `scripts/check-evidence-freshness.mjs` (uses `lib/seo/evidence-monitor.ts`) | Re-decides every published page as of **today**, and reports expired, soon-to-expire, revoked, superseded-but-still-cited and stale evidence, licence-related evidence needing attention, an old or future `PUBLICATION_AS_OF`, and old verification dates. Read-only. Exit code 1 on any ERROR. | Reports only. |
| `.github/workflows/evidence-freshness.yml` | Runs the script weekly (Mondays 05:17 UTC) and on demand. Read-only permissions, no secrets, no deployment. | See "Scheduling limits". |
| `tests/seo/publication-clock.test.mjs` | Fails a pull request if a published page's evidence has expired or the committed date is stale. | Runs only when a PR is opened. |

Run it yourself at any time (no network, no writes):

    node --import ./tests/register.mjs scripts/check-evidence-freshness.mjs
    node --import ./tests/register.mjs scripts/check-evidence-freshness.mjs --today=2027-01-15   # what-if

Thresholds (warning): evidence expiring within 60 days; licence-related evidence (CMP-01 to CMP-04, CLM-01) within 120 days; verification older than 365 days; `PUBLICATION_AS_OF` within 7 days of its 31-day limit. Anything already expired, revoked, a page failing the gate today, or a date in the future or past 31 days is an ERROR.

### Scheduling limits (read this)

- GitHub only runs `schedule` triggers from the workflow file **on the default branch (`main`)**. While this file exists only on a feature branch, **the schedule does not run**. It will start only after the file reaches `main`, which is a repository decision outside this milestone.
- GitHub pauses scheduled workflows in a public repository after 60 days without repository activity, and scheduled runs are best-effort (they can be late or skipped).
- A failed run notifies people only through the notification settings of the person who last edited the workflow or its cron line. Someone must be named to watch it (below).
- Until the workflow runs on `main`, the risk is **mitigated by documentation and a manual command, not resolved**. A calendar reminder to run the command is the fallback.

## 2. Who must review a finding

- **Evidence owner** (the person who supplied the verified document): confirms the facts.
- **Compliance reviewer**: for licence-related findings, confirms the licensing position.
- **Owner** (the person whose written authorisation published the page): decides on renewal or suspension.
- Name these people in the page's approval reference. Until names are recorded the repository owner is the default reviewer.

## 3. Confirm whether the evidence is still valid

1. Read the finding: it names the page path, the evidence id and the date.
2. Open the source document recorded for that evidence entry (`document` in the ledger). Do not use website text, the claims registry or an old PDF as proof.
3. Check with the issuing body or supplier whether the document is current, renewed, revoked or replaced.
4. Record the outcome in writing (who, when, what was seen).

## 4. Request owner authorisation

Send the owner a short note: the page path, the evidence id, the expiry or problem, the outcome of step 3, and one of two requests:

- **Renewal**: a new verified evidence entry that replaces the old one (supersession), a new approval that cites the current entry, and a renewed `PUBLICATION_AS_OF`. This is a normal reviewed publication change.
- **Suspension**: authority to remove the page from publication until the evidence is renewed.

Without a written answer, do not change publication state; keep the finding open and escalate.

## 5. Removing or suspending a page (authorised operator only)

Do this only with the owner's written authorisation. It is a reviewed code change, not an automatic action:

1. Create a branch. In `lib/seo/page-records.ts` set the page's record back to `status: "unpublished"` and `approval: null`. In `lib/seo/publication-manifest.ts` remove its entry. Remove nothing else.
2. Open a pull request. The gate then returns no page: the sitemap entry, metadata, structured data and internal links disappear, and the static route returns 404 through `notFound()`. Keep the route folder in place only if the owner wants a quick re-publish; otherwise remove it in the same change.
3. Obtain independent review, wait for the required CI check, merge and deploy through the normal process.
4. Do not edit ledger entries to hide the problem. Mark an entry revoked or let it expire; a corrected fact is a replacement entry.

## 6. Verify the page is no longer public

After the deployment:

1. `curl -I https://www.jolusecurity.com/<path>` returns `404`.
2. `curl -s https://www.jolusecurity.com/sitemap.xml` no longer contains the path.
3. The homepage and other pages no longer link to it (search the page source for the path).
4. The page's structured data no longer appears in any other page (search for the page's `@id`).
5. Ask the owner to request removal from search results if the page was already indexed.
6. Re-run the monitor and record the clean result with the date.

## 7. What the monitor does not do

- It does not decide that evidence is true, only that recorded dates and states are current.
- It cannot see a licence revoked in the real world unless the ledger is updated.
- It does not unpublish, deploy, push, open issues or send messages.
