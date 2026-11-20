# EGM round 2 — spec 138 (2026-11-20)

Reviewers, run in parallel against hub `3677e35a`: implementation readiness, codebase details.
This is the last document round under the owner's two-round stop rule. Findings an implementer
meets after this point are resolved as decisions written back into the spec, and the code gets an
independent audit.

| # | Reviewer | Severity | Finding | Disposition |
|---|---|---|---|---|
| 1 | Readiness | Major | The `pulse/tick` manifest row needs `key`, `cadence`, two message keys and a map entry, or the autonomous-agents page throws. | Accepted. Row and companions specified; listed as a visible change. |
| 2 | Readiness | Major | "The stock Postgres lane" does not exist. | Accepted. D6 and D10 placed in `stock.sourced-issue.test.ts` (in-memory Postgres). |
| 3 | Readiness | Blocker | The grants test had no file, lane or manifest registration; the candidate file pins its assertion count. | Accepted. File, lane and manifest change named. |
| 4 | Readiness, codebase | Blocker | `requireModuleEnabled` in `modules.service.ts` trips `kit-in-services` and is undefined under about 20 test mocks. | Accepted. Moved to `src/server/http/require-module.ts`. |
| 5 | Readiness, codebase | Major | "43 endpoints" is 43 call sites in about 31 files; two shared helpers reach about 21 more route files, read handlers included. | Accepted. Shapes table added; invariant and visible effect reworded. |
| 6 | Readiness | Major | Doors body carries `issues`; the mapper also serves authenticated routes. | Accepted. |
| 7 | Codebase | Wrong claim | 17 tick routes, not 18; `hand-401` 347 in 241; `service_role` also holds ledger grants; owner role differs in the CI native lane; a third reduced ledger copy exists. | Accepted. Corrected. |
| 8 | Codebase | Reuse | `walk`/`strip`/diff are private to the read ratchet; `.svelte` imports need the script block extracted; a "no later migration contains X" test exists to copy; the model migration's `BEGIN`/`COMMIT` must be omitted. | Accepted. Stated. |
| 9 | Readiness | Note | All 428 handlers are `export const`; the file-level fallback should be unused. | Recorded. |

No finding was contested. Not reviewed in either round: the structural and style personas.
