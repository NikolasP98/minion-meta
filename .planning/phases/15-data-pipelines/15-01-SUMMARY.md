---
phase: 15-data-pipelines
plan: "01"
status: complete-private-candidate
requirements-completed: []
plan_sha256: 9fdadc6d2e1f54dffad3ca36c4f322c3ea4317b1e5228af511a2b6744c8158ab
completed: 2026-09-11
snapshot: /home/nikolas/.cache/claude-tmp/15-01-3658a393/minion_hub
snapshot_base: minion_hub origin/master 1df0a9216ad3f7f85d989eb59cfccb779d9f7285 (detached worktree, uncommitted, unstaged)
owned_files:
  - path: minion_hub/src/server/services/assistant-datasets.contract.ts
    before: absent
    after: 294a090c9c88d46b91ce29d0d6ae35b7dde5d61800cb46e529a3030967064746
  - path: minion_hub/src/server/services/assistant-datasets.contract.test.ts
    before: absent
    after: c2f68b7b12e940824da0c46aa90002f1449876938e239caa62f2d0e2f6c6b14a
  - path: .planning/phases/15-data-pipelines/15-ANALYTICS-CONTRACT.md
    before: absent
    after: cd6ada280c43375eebb731f8e72f41d05e7035cc3d04ee7494dd600aeed11274
  - path: .planning/phases/15-data-pipelines/15-DATASET-IMPLEMENTATION-GATES.md
    before: absent
    after: e9b808292a54f4713fae9bae9ec2fe7f8b21f5b7344fb23121f619fd4f1f4859
decisions_honored: [D360-01, D360-02, D360-05, D360-06]
decision_requests: [DR-15-01-A, DR-15-01-B, DR-15-01-C, DR-15-01-D, DR-15-01-E]
receipts: /home/nikolas/.cache/claude-tmp/15-01-3658a393/checks
---

# 15-01 Typed analytics datasets and authorization policy (SEC-06)

Both tasks delivered as an **admission gate**: a closed dataset contract with executable policy
tests, and the exact child slices that would implement it. **SEC-06 is not closed** — no dataset
is wired, no route changed, and the containment prerequisite is not on master (below).
`requirements-completed` is empty on purpose.

## Identities

- Hub base `origin/master` `1df0a921` in worktree `/home/nikolas/.cache/claude-tmp/15-01-3658a393/minion_hub`
  (installed `bun install --frozen-lockfile`, `i18n:compile`, `svelte-kit sync`; exit 0 each).
- Runtime: Node v22.23.2, Bun 1.3.4, vitest 4.1.10, zod 4.4.3, drizzle-orm 0.45.2, svelte-check
  4.7.6 (`checks/freeze.json`).
- The two hub files are untracked in the snapshot only; nothing was staged, committed, pushed or
  copied into the main checkout (`feat/level-2026-07-30`), which was not touched.

## Task 1 — inventory, contract, policy tests (delivered)

- `15-ANALYTICS-CONTRACT.md`: 18 question families (Q1–Q18) mapped from gateway tool
  descriptions and Hub routes (no customer transcripts); the 11 existing typed routes with
  their module/owner/field/bound gaps (F1–F8); tenant/module/owner/field layers mapped
  separately; RLS/GUC review including the caller-mutable `set_config` attack and the
  unverifiable `app_assistant_ro` role; budgets grounded in existing caps (200 rows, 5 s
  statement timeout) with byte/concurrency values explicitly marked proposals; five decision
  requests recorded instead of guessed.
- `assistant-datasets.contract.ts` (766 lines after Prettier): closed registry of 18 dataset ids
  (14 `existing`, 2 `candidate`, 2 `gated` with decision ids), `validateManifest`,
  per-dataset strict zod `requestSchema`/`parseDatasetRequest`, `authorizeDataset`
  (deny-by-default: gated → tenant → principal kind → every required module → owner scope →
  field tier), `boundResult` (row-by-row byte bound). Executes no SQL; imports only types and
  constants from `rbac.service` and `$lib/permissions`.
- `assistant-datasets.contract.test.ts`: 45 cases — registry valid; 12 unsafe-manifest
  rejections (duplicate id, unknown module, id/module drift, missing own module, over-budget
  rows, sensitive field without a tier, owner-scopable module ignoring scope, owner column
  drift, gated without decision, sort outside fields, unknown filter kind, empty enum);
  13 request rejections (unknown dataset, caller `sql` key, undeclared filter, injected enum,
  bad date/uuid, missing required filter, undeclared sort/field, empty projection, limit
  0/201, non-uuid org); authorization matrix with synthetic personas (masked viewer, full
  owner, explicit sensitive request denied, finance-only and crm-only denied on the
  cross-module rank, cross-module deny, tenant mismatch, owner filter on rows, owner-scoped
  aggregate denied, brain agent denied on every dataset, empty capabilities denied, gated
  dataset denied with its decision id, limit capped); result bounds (limit+1 truncation, exact
  byte accounting, byte budget stops before the row limit).
- Red→green: first run **1 failed / 44 passed** — "rejects missing required filter" exposed
  that zod 4 `.default({})` bypasses the inner required check; fixed with `.prefault({})`.
  Second run 45/45.

## Task 2 — implementation slices (delivered as specification)

`15-DATASET-IMPLEMENTATION-GATES.md`: gates G0–G5 and six slices (S1 runner/route/PGlite policy
fixture, S2 finance, S3 CRM cross-module incl. `insight` alignment, S4 operations, S5 stock,
S6 gateway `crm_query` retirement) with exclusive file lists, parametrized-query and
`LIMIT $n+1` rules, negative tests named before implementation, and verify commands.

## Gate results (full logs under `checks/`, exit codes captured with `$?`)

| Gate | Result | Exit |
|---|---|---|
| `node node_modules/vitest/vitest.mjs run src/server/services/assistant-datasets.contract.test.ts` | 1 file, **45 passed, 0 failed** (`vitest-contract.log`) | 0 |
| `bunx prettier --check` on the two owned files | clean after `--write` (`prettier.log`) | 0 |
| `git diff --check` (snapshot) | clean | 0 |
| `bun run check` (full svelte-check, snapshot) | **2 errors / 0 warnings in 1 file**: `src/hooks.client.ts:5` `PUBLIC_POSTHOG_KEY`/`PUBLIC_POSTHOG_HOST` missing from `$env/static/public` — no `.env` in the snapshot per brief rule 3; **0 diagnostics in owned files** (`svelte-check.log`) | 1 |
| `node …/gsd-tools.cjs verify plan-structure .planning/phases/15-data-pipelines/15-01-PLAN.md` | `valid: true`, 2 tasks (`gsd-plan-structure.log`) | 0 |

## Deviations

- Plan `read_first` names `src/server/auth/secure-permissions.ts`; on master that file is
  filesystem chmod hardening, not RBAC. The actual authorization surfaces are
  `rbac.service.ts` (`Capabilities`, `OWNER_SCOPABLE_MODULES`) and `$lib/permissions`
  (`FIELD_LEVEL_MODULES`, `SENSITIVE_FIELD_LEVEL`); the contract imports those.
- Plan `<interfaces>` cites `StatementEntryRejected`/brain job keys (15-02/15-03 seams); not
  relevant to this plan and untouched.
- The plan prose assumes the 09-01 containment is the current `assistant-query.service.ts`.
  On `origin/master` it is not (D360-05 check): master still executes caller SQL under
  `app_assistant_ro` with a `set_config` tenant GUC. Recorded as gate G0; those files are not
  owned by this plan and were not edited.
- Child PLAN files were not created: `files_modified` owns only the gates document. The slices
  are written as complete PLAN bodies for root to lift, allowlist and index (D360-09).

## Gaps / blocked items and what unblocks them

1. **G0 — containment not on master.** Unblocks when 09-01's candidate (`feat/level-2026-07-30`
   files `a3b69a03…`/`4de53242…`) is merged to `minion_hub` `master`. Until then any slice
   built on master would sit beside a live raw-SQL path.
2. **Decision requests** DR-15-01-A (stock valuation cost tier), B (conversation text tier and
   owner scope), C (`insight` both-vs-either), D (owner-scoped roles on aggregates), E (byte and
   concurrency budgets). Deny defaults are encoded; enabling `stock.valuation` or
   `crm.conversation_search` is a registry edit under the recorded decision — not done.
3. **Gateway `crm_query` retirement** (S6/G2) is cross-repo (`minion`, base `DEV`); not
   Hub-ownable.
4. **Deployed RLS/pooler evidence** (G5) needs environment access; no production or staging
   URL was used.
5. **Existing-route findings F1–F6** (insight OR-gate and owner scope, unbounded
   bookings/tasks/stock/daily series) are unfixed — files not owned; assigned to S3/S4/S5.
6. No `TODO(handoff)` was added because no implementation file was edited; the open ends live
   in the gates document and the decision requests above. Root may want a `proposals/` entry
   mirroring DR-15-01-A…E.

## Next gated plan

S1 (`15-01a` when admitted) after G0; S2–S5 after S1; S6 in the gateway repo after G0.
