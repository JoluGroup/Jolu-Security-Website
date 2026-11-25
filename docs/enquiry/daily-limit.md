# Site-wide daily enquiry cap (new control)

Status: NEW. Before this change the site had only an hourly site-wide cap (and a per-client cap that is inactive
while `ENQUIRY_TRUSTED_PROXY` is unset). There was no daily cap.

## Owner-proposed limits and where each is configured

| Limit | Setting | Value to run | Status |
|---|---|---|---|
| 5 enquiries per client per 10 min | `ENQUIRY_CLIENT_LIMIT=5`, `ENQUIRY_CLIENT_WINDOW_SECONDS=600` | already the default | Existing, but INACTIVE until `ENQUIRY_TRUSTED_PROXY` is set (see `trusted-client-ip.md`) |
| 30 per hour, whole site | `ENQUIRY_GLOBAL_LIMIT=30` | default changed 200 -> 30 in this change | Existing control, new default |
| 80 per day, whole site | `ENQUIRY_DAILY_LIMIT=80` | default 80 | NEW |

Setting the environment variables explicitly in Vercel is still recommended (documented, visible, and survives a
future default change). `ENQUIRY_DAILY_WINDOW_SECONDS` defaults to 86400; the accepted range mirrors the other
windows (60-86400) and invalid values fall back to the default. Leave it unset.

## Behaviour

- One Redis Lua script (`ADMIT_SCRIPT`, `EVAL` inside one `/multi-exec`) checks BOTH counters and increments BOTH
  only if both have room. If either cap is reached nothing is incremented. Concurrent requests are serialised by
  Redis, so exactly N are admitted.
- Counting semantics: a request is charged only when it is admitted, meaning it passed the per-client limit,
  validation (including the honeypot), the duplicate check, and both caps. Junk, duplicates, in-progress retries and
  refused requests consume no site-wide quota. A request admitted and then refused or lost by the email provider
  keeps its charge (no refund: a refund cannot be made atomic with concurrent admissions, and the provider call
  may have sent the message anyway).
- Window: fixed, created at the first admitted request (`SET ... EX ... NX` inside the script) and never
  extended. It is NOT a calendar day. A counter found without an expiry is given one inside the script.
- Retry-After: if one cap is reached, its remaining TTL; if both, the longer one. The response is the existing
  `429 { code: "rate_limited" }` with `Retry-After`.
- Fail closed: any Redis error, malformed reply or non-numeric counter gives `503 { code: "unavailable" }` and
  nothing is sent (the claim step already failed closed the same way).
- Order in the route (live mode): per-client limit, body, validation, duplicate claim, site-wide charge, send. If
  the site-wide charge refuses, the duplicate lock just taken is released and no state is recorded, so an
  immediate retry is not blocked. Test mode has no duplicate protection and charges the caps before returning.
- Transition: the hourly key `enquiry:rl:global` keeps its name and format; the daily key is
  `enquiry:rl:global:day`. A running hourly counter is honoured at deploy time. Hourly counters previously kept
  counting refused requests past the limit; now they stop at the limit (same refusals, no visible difference).

## Honest limitations

- A shared cap is a shared resource: an anonymous attacker sending well-formed, varied enquiries can spend all 80
  slots (and 30 per hour) and lock real visitors out until the window ends, up to 24 h for the daily cap. The
  daily cap bounds email volume and cost; it does not stop lockout. Per-client identity or an edge rule (see the
  Vercel Firewall note in the report) is the only mitigation for lockout. Phone and WhatsApp stay as the fallback.
- The form's 429 message is wording that does not promise a retry time ("try again later" plus phone and
  WhatsApp), because the daily cap can last hours. It states that the enquiry was not sent, which is true of
  the 429 path (fail-closed); the status code and Retry-After header are unchanged.
- The fixed window allows up to 2x the cap across a window boundary (up to 160 in 24 h worst case for the daily
  cap, 60 across an hour boundary); not a sliding window.
- Verified on open-source Redis (real `redis-server`) and a JavaScript model of Upstash, not on Upstash itself.
  Upstash supports `EVAL` in `/multi-exec` (the dedup finalize script already relies on it), and the two keys are
  used in one script, which is fine on a non-cluster database; the Upstash smoke script was NOT changed, so the
  new script has not been exercised there.
