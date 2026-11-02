# Tasks: Tenant isolation hardening (spec 048)

Worktree `~/.cache/claude-tmp/hub-048` from `origin/master`; H1 and H2 may share one PR if small, else two.

- [ ] T201 [H1] `rls-coverage.sql.integration.test.ts` + allowlist seeded from the first run; ledger lines in the hardening proposal.
- [ ] T202 [H2] `scripts/rls-bypass-inventory.ts` (`--check`), `rls-bypass-inventory.json`, `rls-bypass-inventory.test.ts`; meta mirror + README.
- [ ] T203 Gates: `bun run check`; `HUB_TEST_DB_URL` integration run; full `bun run test` (`SUPABASE_DB_URL` unset); `format:check`. Draft PR(s).
- [ ] T204 [H3] (later) convert write-path services, one PR each.
- [ ] T205 [H4] (blocked) owner dump → core-tables migration → replay CI job.
