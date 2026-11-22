# EGM round 1 — spec 138 (2026-11-20)

Reviewers, run in parallel against hub `3677e35a`: zoom-out, comprehension, design critic.
Deviation from the standard stage order: the three ran in parallel, and the structural and style
reviewers were not run. The owner's stop rule for long specs applies: two rounds, then implement.

## Findings and disposition

| # | Reviewer | Severity | Finding | Disposition |
|---|---|---|---|---|
| 1 | Design | Blocker | The live-entry race is already serialised by the stock gate (`stock.service.ts:716-720`); the TODO at `pos.service.ts:2848` is a different race, which a uniqueness index does not close. | Accepted. H2 restated as defence against writers that skip the gate; no application change; TODO and proposal item stay open. |
| 2 | Design | Major | Mapping the unique violation in application code misses one insert site and leaves the transaction aborted. | Accepted by removal: no mapping. |
| 3 | Design, zoom-out | Major | The new-table template would reject recent, reasonable tables (`org_api_keys`, `pos_period_locks`, `stk_corrections`). | Accepted. Reduced to `org_id` plus an org-leading index; split into H1b. |
| 4 | Design | Major | `created_at` filled from the entry is a lower bound, not the write time; a second copied table definition exists. | Accepted. G4 reworded; both copies named. |
| 5 | Design | Major | The revoke omitted `service_role`. | Accepted. Production query on 2026-11-19 shows `service_role` holds DELETE. |
| 6 | Design | Major | A `--update` flag contradicts hub `AGENTS.md:52`; the inventory script cannot run under plain node. | Accepted. Update through the test with an environment flag; inventory is TypeScript loaded by the test. |
| 7 | Design | Major | Write coverage was scored per file. | Accepted. Scored per method, with a marked file-level fallback. |
| 8 | Zoom-out | Major | `DomainError` has no consumer in these slices. | Accepted. Cut. |
| 9 | Zoom-out | Major | The tick rule "reads `CRON_SECRET`" also matches two non-tick routes. | Accepted. Rule matches directories named `tick`. |
| 10 | Zoom-out | Major | The 401 codemod is about 290 edits for no behaviour gain and collides with other PRs. | Accepted. Deferred; counter kept. |
| 11 | Zoom-out | Major | The 403 → 404 change should merge alone; PRs editing the baseline must be serial; H3 depended on H1 silently. | Accepted. H7 is the module change; H5 → H6 → H7 serial; cascade test in its own file. |
| 12 | Zoom-out | Major | Listing all eleven proposal rules recreates prose-only rules. | Accepted. Gated rules only. |
| 13 | Comprehension | Blocker | Doors body contradicted the envelope. | Accepted. Doors keeps `error` equal to the code; D13 asserts it. |
| 14 | Comprehension | Blocker | Scheduling `message` after the change was unstated. | Accepted. Stated. |
| 15 | Comprehension | Blocker | Classification "from evidence" had no per-file list or rules. | Accepted. Decision rule per class and a class per file for the 29. |
| 16 | Comprehension | Blocker | Four counters had no matcher. | Accepted. Matchers added. |
| 17 | Comprehension | Major/Minor | Undefined terms; "ledger" used five ways; inventory file shape; G3 wording. | Accepted. Terms table; shapes fixed. |
| 18 | Zoom-out | Minor | Fixtures written into live `src`. | Accepted. Temporary directories. |
| 19 | Zoom-out | Minor | A raising migration blocks every deploy. | Accepted. Scan rerun before merge, stated in Risks. |

No finding was contested.
