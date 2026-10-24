# Implementation Plan: Data-source permissions enforced on reads

**Branch**: `spec/039-data-source-rbac` (meta) | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/039-data-source-rbac/spec.md`; companion spec 037 Amendment B.

## Summary
Roles grant view/add/edit/remove per dataset (= today's module), and reads are enforced at ONE boundary: page/layout loads obtain their tenant handle through `datasetCtx(locals, module)` (or `readDataset`) which returns a typed `DatasetDenied` marker instead of a handle when the member lacks `view`; the page still renders and every visual bound to that dataset shows a disabled state through `DataSource` (over `AsyncBoundary forbidden` / `CollectionState denied`). A vitest ratchet with a decrease-only baseline forbids bare tenant reads and requires zero for modules in `DATASET_ENFORCED`, which grows one module per rollout slice (POS first) and flips spec 037's transition floor. Writes stay on `apiWriteCapability`/`requireOrgCapability`; the Roles matrix is relabelled to the four verbs with export/manage under "Advanced".

## Technical Context
**Language/Version**: TypeScript strict, Svelte 5, SvelteKit 2.70.2, Bun
**Primary Dependencies**: `rbac.service` (`resolveCapabilities`, cached), `core-ctx` (`getCoreCtx`), `$lib/components/ui/foundations/AsyncBoundary`, `data-view/CollectionState`, Paraglide
**Storage**: none new; `permission_rules` unchanged
**Testing**: vitest (targeted); new ratchet test; mounted component tests; QA-stack persona matrix per module
**Target Platform**: Vercel (hub)
**Project Type**: web app
**Performance Goals**: ≤ 1 extra cached `resolveCapabilities` hit per dataset per load; zero added SQL
**Constraints**: constitution IV (RBAC wiring, i18n, tokens), security/data tag; never `bun run test`; hub worktrees need a real `bun install`
**Scale/Scope**: 62 load files + their pages across 6 PRs; 0 new routes; 0 migrations

## Constitution Check
| Principle | Status | How |
|---|---|---|
| I Spec before code | PASS | this dir + stub `specs/2026-10-23-hub-data-source-rbac-spec.md`; owner approval precedes `/speckit-implement` |
| II AS-IS → TO-BE → DELTA with evidence | PASS | inventory method + numbers in AS-IS and research R1; DELTA D1–D8 each with a proving test; unknown API-GET bucket count labelled as measured in S5 |
| III Slice-scoped delivery | PASS | 6 slices, one hub PR each against `master`, own worktrees, foreground gates |
| IV Required build steps | PASS | RBAC wiring table below; Paraglide keys for every denied string + `i18n:compile`; `lint:design && lint:tokens` on every slice that touches `.svelte`; no route contract change (no new page) |
| V Security/data human gates | PASS | tags `security`, `data`; owner approves and merges every slice; J5 proven per module before merge |
| Open-items ledger | PASS | S6 writes `proposals/2026-10-23-hub-data-source-rbac-followups.md` |

## Project Structure
```text
specs/039-data-source-rbac/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── contracts/read-enforcement.md
├── checklists/requirements.md
└── evidence/            # per-slice J5 persona tables + screenshots
```
Hub (`minion_hub/`, PR base `master`):
```text
src/lib/permissions.ts                                   # S1: DATA_VERBS, DATASET_ENFORCED (shared with 037), client isDenied
src/server/auth/dataset-ctx.ts (+ .test.ts)              # S1 new
src/server/auth/dataset-read.ratchet.test.ts             # S1 new
scripts/.dataset-read-baseline.json, scripts/dataset-read-baseline.mjs   # S1 new
src/lib/components/ui/DataSource.svelte (+ .mounted.test.ts), ui/index.ts  # S1 new
src/lib/api/fetch-json.ts (or the existing helper)       # S1 edit (K3 mapping)
messages/en.json, messages/es.json                       # S1, S6 append
src/routes/(app)/pos/**/+page.server.ts, pos/+layout.server.ts, their +page.svelte, ShiftBanner.svelte   # S2
src/routes/(app)/scheduling/**, stock/**                 # S3
src/routes/(app)/crm/**, finances/**, sales/**, support/**, memberships/**, socials/**   # S4
src/routes/(app)/workforce/**, work/**, brains/**, agents/**, overview/**, home/settings/**, channels/gmail/**, (app)/+layout.server.ts; src/routes/api/** GET bucket   # S5
src/lib/components/users/RbacRolesSection.svelte, src/server/services/rbac.service.ts (includeSubResources), settings/roles/+page.server.ts, AGENTS.md   # S6
```

## Slices (one hub PR each)
| Slice | Branch (hub) | Depends on | Parallel with | Scope |
|---|---|---|---|---|
| S1 primitives + ratchet + denied visual | `feat/data-rbac-s1-primitives` | 037 S1 merged OR creates `DATASET_ENFORCED` itself | 037 S2–S4 | D1–D3 |
| S2 POS rollout (`DATASET_ENFORCED += pos`) | `feat/data-rbac-s2-pos` | S1 | 037 S3–S5 | D4 |
| S3 scheduling + stock | `feat/data-rbac-s3-scheduling-stock` | S1 | S4, S5 | D5 |
| S4 crm · finances · sales · support · memberships · socials | `feat/data-rbac-s4-business` | S1 | S3, S5 | D6 |
| S5 remaining modules + API GET bucket | `feat/data-rbac-s5-rest` | S1 | S3, S4 | D7 |
| S6 matrix relabel + Sections removal + docs + ledger | `feat/data-rbac-s6-matrix` | S1–S5, **037 S5** | — | D8 |

File overlap: S3/S4/S5 touch disjoint route trees and append to `messages/*.json` only if they add strings (they should not — S1 owns the denied strings). Each rebases on `master` before PR. S2 and 037 S2 both touch `src/lib/permissions.ts` (one line) — whichever is second rebases.

## Slice graph with spec 037
See `specs/037-custom-nav-sections/plan.md` §Slice graph. In short: 037 S1–S5 can ship first under the transition floor; 039 S2 flips the floor for POS and is a prerequisite of 037 S6's proof; 039 S6 waits for 037 S5.

## Gates (every slice, foreground, capture exit codes)
```bash
bun install --frozen-lockfile
bun run i18n:compile                    # when messages/*.json changed
timeout 900 bun run check; echo "check exit=$?"
bun run lint:design && bun run lint:tokens   # any .svelte touched
bun x vitest run src/server/auth <slice paths>   # ratchet runs in every slice
```
Rollout slices add the QA-stack persona matrix (quickstart §3) and attach it to the PR body.

## RBAC wiring checklist (constitution IV)
| Item | Slice |
|---|---|
| Read gate at the load boundary (`datasetCtx`) for every converted module | S2–S5 |
| Nav visibility | unchanged (page roles, 037) |
| Write-API gate | unchanged (`apiWriteCapability` + handlers); API GETs keep `requireOrgCapability(view)` |
| Owner scope / field masking | unchanged (services, gateway query endpoints) |
| Button gating | `canAct(module, DATA_VERBS[verb].action)` where a converted page exposes writes (audit per slice; gaps → ledger) |
| Matrix editing gate | `users:manage` unchanged (S6) |

## Risks and fallbacks
- A converted page passes a denied slot into a component untouched by the slice → `bun run check` catches it (`T | DatasetDenied`); fix by wrapping in `DataSource`.
- Layout-level denial (POS shift banner) looks heavy → K2 compact variant; owner may choose hide.
- `resolveCapabilities` in a load for users without `supabaseId` (dev `AUTH_DISABLED` bypass has none) → `datasetCtx` denies; the bypass sets `user.role === 'admin'` (`hooks.server.ts` bypass branch) so dev keeps full reads — verify in S1's test.
- Ratchet false positives from the regex (e.g. `getCoreDb(` inside a string) → comment-stripping + per-file baseline make them visible, not blocking; adjust the regex in S1.
