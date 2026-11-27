# Legacy website staff-asset containment: runbook (prepared, NOT executed)

For the owner or whoever holds access to the current website host. Nothing here has been done. Each step that changes the live site needs the owner's go-ahead, and deleting a referenced PDF needs a management decision first (questionnaire A11).

## What is exposed today (checked 2026-11-26)

- `https://jolusecurity.com/` still serves the legacy single-page site.
- `https://jolusecurity.com/lovable-uploads/company-profile.pdf` returns the 6-page company profile.
- The repository's hash-only manifest (`docs/assets/WITHHELD-MANIFEST.sha256`) records the withheld staff portraits and other files. Their live URLs were not probed.

## 1. Identify the host (owner)

The apex A record points to `64.204.254.44`. A public reverse-DNS lookup returns no name for it (NXDOMAIN, 2026-11-27), so the provider must come from the owner's records: the hosting account or invoice for the old site, or the Lovable project settings if it is published from there. Record the provider, the account owner and how files are deployed (upload, Git, builder).

## 2. Confirm the document root (read-only)

- Locate the deployed folder that contains `lovable-uploads/` and `index.html`.
- List every file in `lovable-uploads/` and any other image or PDF folder. For each, record its SHA-256.
- Compare the hashes with `docs/assets/WITHHELD-MANIFEST.sha256` to confirm which live files are the withheld ones. Do not upload or share the files while doing this.

## 3. Back up privately (before any change)

- Copy the whole document root to a private, access-controlled location the owner controls (not the public repository, not a shared link).
- Record the backup location, date and the SHA-256 of the archive.

## 4. Remove and answer 404 (owner go-ahead)

- **Staff portraits and unreferenced images:** remove them from the live document root.
- **The two PDFs:** act only on the management decision for each: keep, correct (replace with an approved version) or withdraw.
- **Make removed paths answer HTTP 404.** A single-page app usually has a fallback that serves `index.html` (HTTP 200) for any unknown path. Removing a file then still answers 200, which looks like the file exists and can be cached. Add an explicit rule so `/lovable-uploads/*` paths that no longer exist return 404 (or 410). How depends on the host: an `.htaccess` or Nginx rule, the platform's redirects or headers file, or the builder's settings.

## 5. Verify (anyone, read-only)

For each removed path:

```
curl -sI https://jolusecurity.com/lovable-uploads/<file> | head -1    # expect 404 or 410, not 200
curl -s https://jolusecurity.com/lovable-uploads/<file> | head -c 15  # must not start with %PDF or an image header
```

Also request the removal of cached copies where relevant (for example Google's "Remove outdated content" tool) once the 404 is live.

## Separate exposure surfaces (not covered by this runbook)

- **Public Git history** still holds the old blobs. Making the repository private, or an authorised history rewrite with GitHub Support, is a separate owner decision. Neither revokes copies already downloaded.
- **The new website** never contains these files: the clean branch excludes them and the asset checks enforce it. After the DNS cutover, unknown paths on the new site are real Next.js 404s.
