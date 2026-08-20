---
spec: 2026-08-20-handoff-minion-hub-3530856808-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-20
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, `updated: 2026-08-20`, and `verdict: approved` because the corrected spec has no unresolved design decision.
- Required a deterministic `organizations` seed row because the integration suite executes `select id::text from organizations limit 1` and otherwise fails on an empty fixture.
- Corrected the suite dependency from pre-existing `crm_activities` rows to the `crm_activities` table; the suite creates its own activity rows when applicable.
- Replaced “byte-for-byte” schema matching with structural parity to `pg-crm-schema.ts`, which is the verifiable DDL requirement for columns, defaults, nullability, indexes, and the FK.
- Narrowed `organizations` recon to the `id` definition actually consumed by the suite, avoiding an unnecessary full-table reproduction requirement.
- Added recon for `relrowsecurity`, `relforcerowsecurity`, grants, and policy dependencies so the fixture cannot claim prod-equivalent RLS from policy text alone.
- Replaced invalid PostgreSQL `CREATE ROLE IF NOT EXISTS` with an idempotent `DO`-block requirement.
- Required `psql -v ON_ERROR_STOP=1` everywhere the fixture is applied because plain `psql -f` can return success after statement errors.
- Put the RLS behavioral negative control in one explicit transaction because `set_config(..., true)` resets at transaction end and was invalid across autocommit statements.
- Expanded the negative control to both `crm_contacts` and `crm_activities`, matching the two policy surfaces the fixture claims to reproduce.
- Added executable catalog assertions for enabled/forced RLS and the Slice-0 policy snapshot because cross-org behavior under a non-owner role cannot detect missing `FORCE ROW LEVEL SECURITY` by itself.
- Made a separate CI job mandatory, resolving the contradiction between “new or extended job” and the out-of-scope ban on extending `crm-deposit-rule-postgres`; this follows `/memory/MINION/factory/2026-08-20-8e4341e7.md`’s warning not to wire a full-schema test blindly into the bare-schema job.
- Required a vitest JSON artifact plus an exact `3 passed / 0 failed / 0 skipped` assertion so the definition of done remains auditable when raw Actions logs are unavailable.
- Split CI proof from marker removal into two pushes and required a final marker-free PR-head run, replacing the impossible requirement to remove the marker only after a run yet have that same commit prove it absent.
- Added correction of the stale requirement-guard diagnostic as well as the docstring; both currently claim a full-schema database is required and would become false after this change.
- Replaced “loud-skip” wording with the actual behavior: the suite skips without a URL and fails loudly only when the requirement flag promises a database.
- Forced the local skip verification to set `SUPABASE_DB_URL=` explicitly because the test also loads development env files and an ambient URL would otherwise execute it.
- Added exact stale-text checks, final-head Actions evidence, and artifact assertions to the end-to-end ship gate so every DELTA transition has machine-checkable proof.
- Corrected DELTA #1's human-dependency cross-reference from §4 to §5 A1 so the stop-ship pointer resolves to the actual gate.
- Preserved the no-prod-DDL boundary and authoritative-schema recon gate from `/memory/MINION/MEMORY.md` (★★★ schema-not-reproducible constraint) and `/memory/MINION/hub-local-qa-stack-recipe.md` (prod-schema clone and `app_ledger` grant requirements).

## Human flags

- A1 remains an explicit dev-stage human/ops gate: authoritative CRM policy, grant, RLS-flag, and `organizations.id` evidence must be supplied from prod or a verified schema clone; implementation stops if it is unavailable.
- A2 remains an accepted, disclosed residual risk: the CI-only fixture can drift from prod until a separately scoped drift detector exists.

## Review context

- The specified past-session database was unavailable at `/home/agent/.claude-mem/claude-mem.db`, and no semantic memory-search MCP tools were exposed in this session; neither absence changes the corrected requirements above.
