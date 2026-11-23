# Upstash finalize-step smoke test (manual, owner approval required)

Purpose: the automated tests prove the dedup finalize Lua script on a real local `redis-server`, and the HTTP path
against a JavaScript model of Upstash. Neither proves that Upstash's hosted REST `/multi-exec` accepts `EVAL`
inside a transaction the way `lib/enquiry/dedup.ts` uses it. `scripts/enquiry/upstash-smoke.mjs` checks exactly that.

## Safety properties

- Refuses unless `ENQUIRY_UPSTASH_SMOKE=confirm` (exact value) and both `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` are set. Without them it prints "REFUSED", contacts nothing, exits 2. Unit tests cover this.
- Not run by `pnpm test` (it lives under `scripts/`, is not named `*.test.mjs`).
- Uses the production finalize script (read from `lib/enquiry/dedup.ts` at run time) and the same `/multi-exec` request shape.
- Writes only keys named `enquiry-smoke:<16 random hex>:...`, each with a 20 second TTL, and deletes them at the
  end. It never uses the `enquiry:rl:` or `enquiry:dd:` namespaces.
- Prints PASS/FAIL lines and a final RESULT only: no URL, token or key names.
- Volume: a few dozen Redis commands in a few dozen small requests.

## Procedure (owner runs it; do not run against production data stores unless you accept the cost)

Prefer a separate throwaway Upstash database (free tier). If you use the production database the script is still
isolated by key prefix, but a throwaway database removes any doubt.

1. In a terminal, export the credentials for that database (do not paste them into chat or commit them):
   `export UPSTASH_REDIS_REST_URL=...` and `export UPSTASH_REDIS_REST_TOKEN=...`
2. Run it with the confirmation variable, from the repository root:
   `ENQUIRY_UPSTASH_SMOKE=confirm node scripts/enquiry/upstash-smoke.mjs`
3. Expect eight PASS lines and `RESULT: PASS (8 checks)`, exit code 0. Any FAIL, or exit 1, means the finalize
   path does not behave as documented on Upstash: do not go live with duplicate protection until investigated.
4. The cleanup line should read PASS. If it says the request failed, the keys expire by themselves within 20 seconds.
5. `unset UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN` afterwards.

Checks performed: first claim wins and a second is refused; keys have a short TTL; owner finalize records `sent`
and releases the lock (returns 1); a non-owner finalize returns 0, leaves the other owner's lock and does not
downgrade `sent`; `unsure` is recorded only when empty, `sent` upgrades it, `unsure` never downgrades; empty
value records nothing but releases an owned lock; cleanup.

## Not run here

This lane did not run the script against any external service, and did not run it against the local
`redis-server` either: that server speaks the Redis protocol, not Upstash's REST API, so there is no
offline path for this script. The Lua itself is already checked on a real local server by
`tests/enquiry/finalize-script.redis.test.mjs`.
