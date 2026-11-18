# Validation: 126 booking product consistency

## T001 — approval and scope (2026-11-17)

The owner approved implementation of the FACES follow-ups on 2026-11-17: "please complete the revisions and proposals and begin implementation". Scope of this candidate: F5 on Hub branch `feat/126-booking-product-consistency`, clone `~/.cache/claude-tmp/hub-faces-F5`, based on F3 `e5913287`. Independent review: the EGM results under `egm/` and `.local/faces-followups-2026-11-16/review-results/native-r6-*-f5.json`; their open findings are answered in `spec.md` decisions 6–14. Merge approval and runtime verification remain owner actions.

## T002 — candidate identity

PR base `master` (repo-policy, Hub); package manager Bun. Isolated clone, no push, no PR, no shared checkout touched. Local PostgreSQL lanes were not needed: no suite of this slice is a `*.sql.integration.test.ts`.

## Focused test runs (all with the production database URLs unset)

- 106 files / 1,000 tests of `src/lib/components/scheduling`, the touched services, `src/routes/api/{scheduling,pos}`, `src/server/auth`, `(app)/scheduling`, `(app)/pos/appointments`: all passed except `pos-service-boundaries.test.ts` "plain-loads both public barrels", which times out at the default 5 s when run with other suites (and alone) and passes with `--testTimeout=90000` (3/3). Whether it also times out on the F3 base was not measured.
- `bun run lint:design` and `bun run lint:tokens`: no governed-debt increase, 0 violations. `bun run lint:optimistic`: pass. `bun run i18n:compile`: pass. Prettier clean on every changed file.
- Not run: `bun run check` (central), the full suite (forbidden), the qa-native lane (nothing registered; T025 blocked on F3), browser acceptance (T015), real-database RLS proof (T009).
