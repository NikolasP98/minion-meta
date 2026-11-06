---

description: "Task list for the Generic Agent Action Dispatcher"
---

# Tasks: Generic Agent Action Dispatcher

**Input**: Design documents from `specs/004-generic-agent-action-dispatcher/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED. The spec's DELTA table names a proof per transition and Constitution II makes
that proof part of the spec, so tests are not optional here.

**⛔ Do not start any task below T004.** Constitution V: this is a security-tagged generic write
path; the owner approves the design before code and merges every PR. T002 is that gate.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1…US5 from [spec.md](./spec.md)
- Paths are repo-relative inside the named repository (`minion_hub/`, `minion/`, meta root)

## Repository / branch conventions (from `repo-policy.yaml`)

| Repo | PR base | Gates before the PR opens |
|---|---|---|
| `minion_hub` | `master` | `bun run check`, scoped `vitest`, `format:check` (+ `lint:design && lint:tokens` if any `.svelte` changed) |
| `minion` (gateway) | `DEV` | `pnpm check`, `pnpm tsgo`, `pnpm vitest run test/ci/` — **never** `pnpm test` |
| meta | `dev` | `node scripts/check-agent-instructions.mjs`, spec/proposal index |

**Honest note on story independence**: the template assumes each user story ships alone. Here US1,
US2 and US3 are each *one manifest row plus its proof* on top of the same foundation, so they are
independently **testable** but not independently **deliverable**. US4 (in-app forms) genuinely is
independent and needs none of the foundation. US5 is the safety mechanism and ships with the
foundation. This deviation is recorded in `sdd-notes.md` §4.

---

## Phase 1: Setup

**Purpose**: the gates and workspaces, before any code.

- [ ] T001 [P] Add the board stub `specs/2026-10-15-agent-action-dispatcher-spec.md` in the meta repo with `specs/TEMPLATE.md` frontmatter (`status: draft`, security tag) and a pointer to `specs/004-generic-agent-action-dispatcher/`, then run `node scripts/spec-index.mjs` so the board shows this feature (Constitution "Artifact layout" — the only item that check marked PARTIAL)
- [ ] T002 **OWNER GATE** — present `spec.md` + `plan.md` to the owner and record the decision on the three `[NEEDS CLARIFICATION]` markers (credential model, per-turn write ceiling, principled exclusions) in `specs/004-generic-agent-action-dispatcher/spec.md`, replacing each marker with the answer; blocks every task below
- [ ] T003 [P] Append the three known open ends (171 unmapped write pairs; the 19 legacy bridge endpoints still lacking module-enabled/owner/masking; any deferred marker from T002) to `proposals/2026-10-15-agent-harness-restoration.md` in the meta repo (Constitution open-items ledger)
- [ ] T004 [P] Create the two worktrees — `minion_hub` off `origin/master`, `minion` off `origin/DEV` — under `~/.cache/claude-tmp/`, and in the hub worktree run `bunx svelte-kit sync && bun run i18n:compile` (a fresh hub worktree fails `check` without both)

**Checkpoint**: owner has approved; worktrees build.

---

## Phase 2: Foundational (blocking for US1, US2, US3)

**Purpose**: the manifest, its gate, and the one dispatch endpoint. Nothing user-visible yet.

### Slice A — manifest + repository gate (hub PR 1, ships inert)

- [ ] T005 Create `minion_hub/src/lib/routes/agent-dispatch-manifest.ts` exporting `DISPATCH_MANIFEST` and `DISPATCH_EXCLUSIONS` with the field rules verbatim from `data-model.md` §1–§2: `pattern` (MUST exist on disk, MUST NOT start with `/api/gateway` or `/api/internal`), `methods` (non-empty, each MUST be exported by that route's `+server.ts`), `effect` (one line, non-empty), `fields`, `destructive`, `params` (each MUST match `/^[\w-]+$/`); exclusion `reason` is one of `machine-only | anonymous | platform-admin | unmapped-capability | dedicated-tool | principle`, and `note` is REQUIRED when `reason = 'principle'`
- [ ] T006 Populate `DISPATCH_EXCLUSIONS` so every write `(route, method)` pair outside `api/gateway`/`api/internal` that is not a manifest row is listed once with a reason — including the 171 pairs with no `apiWriteCapability` mapping (`reason: 'unmapped-capability'`) and the four principled exclusions from `research.md` R4 (`/api/modules`, `/api/plugins`, `/api/builder/*`, `/api/pulse`) in `minion_hub/src/lib/routes/agent-dispatch-manifest.ts`
- [ ] T007 Write the repository gate `minion_hub/src/lib/routes/agent-dispatch-manifest.test.ts` implementing all five assertions of `contracts/dispatch-manifest.md` §"Repository gate": enumerate `src/routes/api/**/+server.ts` write methods, assert partition into manifest ∪ exclusions, assert each manifest pattern exists with its methods exported, assert non-null `apiWriteCapability` per manifest pair, and assert the explicit total (364 today) so a new route reddens the gate
- [ ] T008 Update the hub route-contract manifest and re-assert **all six** counts for the new `/api/gateway/actions/dispatch` route — remember that 2 of the 6 counts live outside `src/lib/routes/`, so a green `vitest src/lib/routes/` is not proof (memory: route contract)
- [ ] T009 Open hub PR 1 (`master`) with slice A only; gates in the foreground, exit codes captured (never `… | tail`)

### Slice B — the dispatch endpoint (hub PR 2)

- [ ] T010 Create `minion_hub/src/routes/api/gateway/_shared/dispatch-principal.ts`: an `AsyncLocalStorage<{orgId: string; profileId: string}>` with `runAsPrincipal(p, fn)` and `currentDispatchPrincipal()`, per `research.md` R1 (same pattern as `src/server/ai-usage.ts`)
- [ ] T011 Edit `minion_hub/src/server/auth/resolve-identity.ts` to consult `currentDispatchPrincipal()` **first** and, when present, build `locals.user` + `locals.tenantCtx` for that principal with `bypassGate: false` so the hooks guards still run; add a comment stating that an absent scope must never be inferred from a header
- [ ] T012 Create `minion_hub/src/routes/api/gateway/actions/dispatch/+server.ts` implementing `contracts/dispatch-endpoint.md`: resolve the assistant principal, look the `(route, method)` pair up in the manifest, resolve the capability via `apiWriteCapability` (refuse if null), reject route strings containing `..`, `//`, `\`, an authority or a percent-encoded separator, refuse GET/HEAD, return `preview` when `confirm !== true`, else `runAsPrincipal(...)` around `event.fetch(route, {method, body})` and map the inner response onto the five `DispatchOutcome` statuses of `data-model.md` §4
- [ ] T013 In the same handler, apply `agentActor(principalId)` (`_shared/action-auth.ts:38-50`) to the dispatched write so the audit trail carries `"<name> (via agent)"` (FR-014), and default the org to the user's active org rather than `organization_members` row 0 (FR-012)
- [ ] T014 [P] Add every user-visible refusal string to Paraglide and run `bun run i18n:compile` in `minion_hub` (Constitution IV)
- [ ] T015 Extend `minion_hub/src/routes/api/gateway/query/sdk-catalog/+server.ts` with the `writes` section of `contracts/dispatch-manifest.md` — `hash` plus rows, **filtered to the calling principal's capabilities** so the model is never shown a write it cannot perform (the `E-O4` lesson)
- [ ] T016 Write `minion_hub/src/routes/api/gateway/actions/dispatch/server.test.ts` fail-closed cases (DELTA D3, quickstart Scenario 2): unlisted route → `422 refused_not_dispatchable` with no mutation; excluded route → same; unmapped capability (`POST /api/users/[id]/member-role`) → same and **not** phrased as a permission problem; `GET` → refused; `..`, `//`, percent-encoded separator → refused; `/api/gateway/actions/dispatch` itself → refused; missing `agentId` → 403; none returns 5xx
- [ ] T017 Add to the same test file the pipeline invariants of `contracts/dispatch-endpoint.md` §4–5: the inner request's `locals.user.supabaseId` equals the principal; an inner request made **outside** the ALS scope resolves to no user and is refused; `bypassGate` stays `false`
- [ ] T018 Open hub PR 2 (`master`) with slice B; same gates as T009

**Checkpoint**: a dispatch of any manifest row works end to end against the QA stack; everything
else is refused without mutating.

---

## Phase 3: User Story 1 — Open the till through the assistant (P1) 🎯 MVP

**Goal**: the agent can open and close a POS shift, so the existing `pos-sale` path stops dead-ending.

**Independent Test**: with a POS-capable principal and no open shift, dispatch the shift-open and
verify the shift exists, is attributed to the human with the agent marker, and that a principal
without the capability is refused.

- [ ] T019 [P] [US1] Add manifest rows for `/api/pos/shifts/open` and `/api/pos/shifts/close` (and `/api/pos/shifts/[id]/emit` if its capability resolves) to `minion_hub/src/lib/routes/agent-dispatch-manifest.ts`, each with a one-line `effect`, its `fields`, and `destructive: false`
- [ ] T020 [US1] Add the four acceptance scenarios of US1 as tests in `minion_hub/src/routes/api/gateway/actions/dispatch/server.test.ts`: capable principal opens a shift; incapable principal gets `refused_permission` naming module+action and no shift; POS module disabled gives the same refusal the UI gives; the audit entry names the human with the agent marker
- [ ] T021 [US1] Run quickstart Scenario 1 against a QA org and record the result (including the latency measurement for SC-009) in `specs/004-generic-agent-action-dispatcher/analysis.md`'s evidence appendix

**Checkpoint**: US1 is demonstrable; MVP reached.

---

## Phase 4: User Story 2 — A money correction the owner can audit (P1)

**Goal**: void / refund / tender-correct through the agent, with confirmation and an audit trail.

**Independent Test**: dispatch a void of a known QA ticket; the refund row lands in the refunding
shift, a locked period still refuses, and an unconfirmed call previews without mutating.

- [ ] T022 [P] [US2] Add manifest rows for `/api/pos/tickets/[id]/void`, `/api/pos/tickets/[id]/payments/[paymentId]` (PATCH) and `/api/pos/tickets/[id]/emit`, each `destructive: true`, in `minion_hub/src/lib/routes/agent-dispatch-manifest.ts`
- [ ] T023 [US2] Add the three US2 acceptance scenarios as tests in `minion_hub/src/routes/api/gateway/actions/dispatch/server.test.ts`, including that `confirm:false` mutates nothing and that the period-lock refusal surfaces as `refused_validation` carrying the route's own reason — never as a permission problem
- [ ] T024 [US2] Assert the money invariant explicitly: a void's refund row belongs to the **refunding** shift, not the selling one (memory: FACES sweep) — test in `minion_hub/src/routes/api/gateway/actions/dispatch/server.test.ts`
- [ ] T025 [US2] Run quickstart Scenario 4 against a QA org; never against FACES production rows

**Checkpoint**: money corrections work and are traceable.

---

## Phase 5: User Story 3 — Create a customer, then book them (P1)

**Goal**: close the "can update, cannot create" dead end and give POS-only roles a booking path.

**Independent Test**: as a role with POS create and no CRM access, dispatch a customer create then
an appointment create; both succeed, and a role with neither is refused on both.

- [ ] T026 [P] [US3] Add manifest rows for `/api/crm/parties` (POST), `/api/crm/contacts` (POST), `/api/pos/appointments` (POST), `/api/pos/appointments/[id]/complete`, `/unschedule`, `/group`, `/notes` in `minion_hub/src/lib/routes/agent-dispatch-manifest.ts`
- [ ] T027 [US3] Test the alternative-capability rule (FR-010): a role with `pos:create` and CRM switched off passes `POST /api/crm/parties` via `CUSTOMER_REGISTRATION_ALTERNATIVES` (`rbac.service.ts:1156-1171`), and a role with neither is refused — in `minion_hub/src/routes/api/gateway/actions/dispatch/server.test.ts`
- [ ] T028 [US3] Test the two checks the current bridge omits entirely: a record-level ("own records only") CRM persona cannot dispatch an update of someone else's contact, and a masked-field persona gets masked fields back in the dispatch response (FR-008, FR-009) — in the same file
- [ ] T029 [US3] Build the 4-persona parity matrix test (owner, module-editor, view-only, module-disabled) over **every** manifest row, asserting the dispatch decision equals the human decision for the same route+method (SC-004, quickstart Scenario 3) in `minion_hub/src/routes/api/gateway/actions/dispatch/parity.test.ts`

**Checkpoint**: SC-004 has zero divergences; US1–US3 all demonstrable.

---

## Phase 6: User Story 4 — Finish the form instead of typing into it (P2, independent of all the above)

**Goal**: the in-app assistant completes the 8 forms it can only fill. This is the only slice
observable before the bridge is restored (slice S0).

**Independent Test**: on a mounted form, the submit tool creates the record through the ordinary
human API; a view-only user is offered neither fill nor submit.

- [ ] T030 [US4] Add the optional `submit?: () => Promise<{ ok: boolean; message?: string; recordId?: string }>` to `FormBinding` and the required `write: { module, action }` to `FormDef` in `minion_hub/src/lib/assistant/forms.ts` (optional so the 8 existing `registerForm` call sites keep compiling)
- [ ] T031 [US4] In `registerForm` (`minion_hub/src/lib/assistant/forms.ts`), register `fill_<id>` only when `canAct(def.write.module, def.write.action)` holds, and register `submit_<id>` only when the binding provides `submit` and the same capability holds
- [ ] T032 [P] [US4] Fill `write` on all 8 `FORM_CATALOG` rows (`stock_entry`, `stock_item`, `warehouse`, `sellable`, `party`, `booking`, `purchase`, `pos_sale`) in `minion_hub/src/lib/assistant/catalog.ts`
- [ ] T033 [US4] Change the catalog filter in `minion_hub/src/lib/state/features/assistant-context.ts` from `canViewPath(f.route)` to that ANDed with `canAct(f.write.module, f.write.action)` using `src/lib/access/can.svelte.ts` (closes `E-O4`)
- [ ] T034 [US4] Pass each page's existing submit handler into its `registerForm` binding — 8 edits under `minion_hub/src/routes/(app)/` (stock entry, stock item, warehouse, sellable, party, booking, purchase, POS sale)
- [ ] T035 [US4] Test in `minion_hub/src/lib/assistant/forms.test.ts`: a filled form submits and reports the outcome; a refused submit relays the server's reason and never reports success; a view-only user is offered neither tool; `runner.ts`'s `final`-events-only rule still prevents a replayed transcript from re-submitting
- [ ] T036 [US4] Run `bun run lint:design && bun run lint:tokens` (debt may only decrease) and `bun run i18n:compile`, then open hub PR 3 (`master`)

**Checkpoint**: 8 forms fillable **and** submittable, gated on write capability.

---

## Phase 7: User Story 5 — The owner can see and bound what the agent may do (P2)

**Goal**: the manifest is readable as a list, and a new write route cannot slip onto it.

**Independent Test**: inspect the manifest; add a write route in a fixture and confirm the gate
fails until the route is listed or excluded with a reason.

- [ ] T037 [US5] Add the fixture demonstration for SC-005 to `minion_hub/src/lib/routes/agent-dispatch-manifest.test.ts`: a synthetic write route that is in neither list makes the gate fail, and listing it makes the gate pass
- [ ] T038 [US5] Produce the owner-facing list — every dispatchable write with its `effect` and resolved capability, generated from the manifest (not hand-curated, so it cannot be honest about what it lists and blind to what it omits) — and record it in `specs/004-generic-agent-action-dispatcher/analysis.md`'s evidence appendix for the owner's sign-off (SC-010)

---

## Phase 8: The gateway tool (slice D — merges after slice B is live)

- [ ] T039 Create `minion/src/agents/tools/hub/hub-action-tool.ts` with fixed parameters `{route, method, body, confirm}` per `contracts/dispatch-manifest.md`, reusing `CONFIRM_FIELD` and `hubPost` from `src/agents/tools/hub/hub-common.ts` verbatim
- [ ] T040 Create `minion/src/agents/tools/hub/hub-action-tool.meta.ts` **without** `mcpExport` (slice S5 must give `/mcp` per-user identity first — synthesis D-G3), register it in `TOOL_ORDER`, and regenerate `src/agents/tools/_registry.generated.ts`
- [ ] T041 Delete `minion/src/agents/tools/hub/module-action-tool.ts` and its meta once all 17 of its endpoints are manifest rows (FR-022), and confirm the `TOOL_REGISTRY ⊆ TOOL_ORDER` invariant test (gateway #329) still passes
- [ ] T042 Run `pnpm check`, `pnpm tsgo`, `pnpm vitest run test/ci/` in the gateway worktree and open the gateway PR (`DEV`)

---

## Phase 9: Polish & cross-cutting

- [ ] T043 [P] Replace `HUB_ROUTE_MAP`'s stale entries (`/bookings`, `/crm/customers` do not match current `MODULE_SUBRESOURCES`) in `minion_hub/src/routes/api/gateway/_shared/hub-route-map.ts` so the agent cannot deep-link a page that 404s (`A-coverage-matrix.md` §5.5) — or leave a `TODO(handoff)` and a ledger entry if deferred
- [ ] T044 Add `TODO(handoff): <what, why, pointer>` comments at each open end named in T003, at the exact site (Constitution open-items ledger: twice, or it is a defect)
- [ ] T045 Run the whole of `quickstart.md` end to end and paste the measured outcomes into `specs/004-generic-agent-action-dispatcher/analysis.md`
- [ ] T046 Flip the spec's `status` to `shipped` in the meta board stub and append the merged PR numbers and commits

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: T002 blocks everything. T001/T003/T004 are parallel.
- **Phase 2 (Foundational)**: slice A (T005–T009) before slice B (T010–T018), because the endpoint reads the manifest. **Blocks US1, US2, US3, US5.**
- **US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5)**: independently testable, each adds manifest rows and tests to the same two files, so they serialize on file contention rather than on logic. T029 (parity matrix) needs all rows present, so it runs last of the three.
- **US4 (Phase 6)**: depends on **nothing** above except T002. Can run first, in parallel with Phase 2, by a different agent. It is also the only phase observable before slice S0.
- **US5 (Phase 7)**: needs T007 (the gate) and the manifest rows of US1–US3.
- **Phase 8 (gateway)**: needs slice B merged and deployed, or the tool calls an endpoint that does not exist.
- **Phase 9**: last.

### Parallel opportunities

- T001, T003, T004 together.
- Phase 6 (US4) entirely parallel to Phase 2 — different files, different repo surface, no shared state.
- T019, T022, T026 (the manifest-row tasks) are each `[P]` **only if** worked by one agent at a time per file; three agents appending to `agent-dispatch-manifest.ts` will conflict at every merge (memory: N parallel PRs appending to one file conflict at every merge — chain-rebase before merging).
- T039/T040 in the gateway are parallel to any hub task.

---

## Implementation Strategy

### MVP (US1 only)

1. T001–T004 (owner gate).
2. Phase 2 in full — there is no smaller foundation; the manifest without the endpoint does nothing and the endpoint without the manifest refuses everything.
3. Phase 3.
4. **STOP and validate** quickstart Scenario 1 and Scenario 2 against a QA org.
5. US1 is not visible through a channel agent until slice S0 lands. Demonstrate it with a direct call to the dispatch endpoint, and say so rather than claiming the assistant can do it.

### Incremental delivery

Meta PR (T001, T003) → hub PR 1 (slice A, inert) → hub PR 3 (US4, independent, shippable today) →
hub PR 2 (slice B + US1) → hub PR 4 (US2, US3, parity matrix) → gateway PR (slice D) → polish.

### Notes

- Chain-rebase before merging any two hub PRs that both touch `agent-dispatch-manifest.ts` or the i18n message files.
- Hub `master` is REVIEW_REQUIRED; the owner merges (Constitution V). Do not attempt `--admin`.
- Never pipe a gate into `tail` — the pipeline returns `tail`'s exit code and a red gate reads green.
