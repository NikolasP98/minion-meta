---
id: 2026-08-31-base-meta-status-revision-binding-required-spec
title: "Require status and revision binding at the Base meta-status boundary"
stage: spec
status: draft
pass: 1
created: 2026-08-31
updated: 2026-08-31
proposal: 2026-08-29-base-meta-status-revision-binding-required
verdict: pending
repos: [minion-base]
relationship: extends
related: [2026-08-18-minion-base-mobile-hitl-ux-plan, 2026-08-18-factory-capability-separation-spec]
tags: [security, logic, board]
type: fix
---

# Require status and revision binding at the Base meta-status boundary

## 0. Product

The approved proposal states the problem directly:

> `POST /api/meta/status` refuses to mutate unless the caller states what it reviewed.

Today the Base detail UI supplies both guards, but the mutation boundary accepts a direct request that omits either one. That allows a caller to approve a legal current transition without proving that it reviewed the current status and exact GitHub blob revision. This spec closes that trust-boundary gap while preserving the existing transition outcomes, status-code mapping, queueing behavior, and fixture path.

Because this is tagged `security`, human approval and merge gates remain mandatory.

### Relationship recommendation

**Recommendation: `extends`.** This is the missing server-side enforcement slice of the approved mobile HITL plan, not a duplicate of an existing implementation spec.

- `2026-08-18-minion-base-mobile-hitl-ux-plan` — extends its UI-001 non-negotiable that every consequential mutation is bound to the expected status and exact revision; that plan explicitly records this endpoint gap as open and assigns it to the source proposal.
- `2026-08-18-factory-capability-separation-spec` — overlaps `src/lib/server/meta-write.ts` and `src/routes/api/meta/status/+server.ts` in its later Slice 4 cutover. Its draft pass-2 lifecycle-publisher design must preserve this spec's required guard shape and conflict-before-idempotence behavior if it lands later; concurrent implementation would conflict at the file level and must be sequenced, not merged by this planner.

## 1. AS-IS → TO-BE → DELTA

### AS-IS — verified current behavior

Current behavior was traced on `NikolasP98/minion-base@main` on 2026-08-31; the proposal's pinned evidence remains accurate:

- Entry point: `src/routes/api/meta/status/+server.ts:10-31` parses `expectedStatus?: string` and `expectedRevision?: string`, validates only `kind`, `id`, and `status`, then calls `applyTransition()` with possibly undefined guard members. There is no route-level test for this boundary.
- Public seam/data shape: `src/lib/server/meta-write.ts:90-95` exports `applyTransition(kind, id, status, expected?)`, where both `expected.status` and `expected.revision` are optional. Any TypeScript caller can therefore omit all or part of the reviewed-state proof.
- Observable mutation path: `applyTransition()` fetches the markdown through `getFile()`, derives `currentStatus`, returns `already_applied` before checking the optional guards (`meta-write.ts:108-119`), validates `TRANSITIONS`, then writes the markdown with the fetched `md.sha` and opportunistically syncs the index (`:121-153`). GitHub's PUT SHA is a write/write CAS, but it does not prove what revision the human reviewed.
- Shipped callers already comply: `src/routes/kanban/[kind]/[...ref]/+page.server.ts:321,523-524,535-536` includes both guard strings in gate actions. `tests/e2e/interaction-primitives.spec.ts:168-169` likewise posts both values.
- The Playwright fixture short-circuit is inside `applyTransition()` (`meta-write.ts:96-101`), including the `e2e-stale` conflict result. It must remain available after the type is tightened.
- Existing invariants are encoded by the `TransitionOutcome` discriminated union (`meta-write.ts:80-86`), the `TRANSITIONS` table (`:64-78`), the route's 409/422/500/202 mapping, and the approval queueing branch in `+server.ts:33-65`.

Operator memory reinforces two hard constraints: `/memory/MINION/sdlc-board-triage-and-phase-gates.md` states that consequential mutations are revision-bound and that `approved_queue_pending` is a distinct persistent 202 outcome; it also identifies `metaFileFull`'s GitHub blob SHA as the revision identity. No semantic revision substitute is introduced. The read-only observation `/memory/MINION/factory/2026-08-20-01b2e431.md` notes that Bun tests importing SvelteKit virtual private env modules must mock `$env/dynamic/private` before dynamically importing the subject; new unit tests follow that isolation pattern.

### TO-BE — target behavior and invariants

`POST /api/meta/status` accepts a mutation request only when `expectedStatus` and `expectedRevision` are both strings. Missing values and non-string values receive HTTP 400 before `applyTransition()`, `factoryFetch()`, or any GitHub transport can run.

The internal contract is:

```ts
type TransitionExpectation = {
	status: string;
	revision: string;
};

applyTransition(
	kind: 'proposal' | 'spec',
	id: string,
	status: string,
	expected: TransitionExpectation
): Promise<TransitionOutcome>;
```

After the markdown read, both expectation members are compared with `{ currentStatus, md.sha }` before the `already_applied` branch. Therefore a request whose target already equals the current status succeeds as `already_applied` only when both guards still match; a stale status or revision returns `revision_conflict` with the current pair and performs no PUT.

The following invariants remain unchanged:

- `TransitionOutcome` variants and response mapping remain 409 for `revision_conflict`, 422 for `invalid_transition`, 500 for `failed`, 202 for `approved_queue_pending`, and success for committed/idempotent outcomes.
- `already_applied` remains a no-write success for a correctly guarded replay.
- `TRANSITIONS` remains the sole source-to-target legality table.
- The markdown PUT continues to use the fetched GitHub blob SHA as its CAS, and that SHA remains the revision identity exposed to callers.
- `transition_committed.indexSynced`, `approved_and_queued`, and `approved_queue_pending.retryState` remain intact; approval and queueing remain separate facts.
- The `PLAYWRIGHT_FIXTURES` shortcut remains functional with the required expectation argument. No browser/UI behavior or request payload emitted by the shipped UI changes.

### DELTA — transitions, slices, and proof

1. **Reject incomplete or wrongly typed guard input at the HTTP boundary** → Slice 1. Proved by route-unit cases for each missing and non-string guard asserting HTTP 400 and zero calls to both the transition helper and factory transport.
2. **Make the reviewed-state expectation structurally mandatory in TypeScript** → Slice 1. Proved by `bun run check` and by updating every in-repo `applyTransition()` call to pass `{ status: string, revision: string }`.
3. **Compare both guards before recognizing an idempotent target** → Slice 2. Proved by helper tests in which target equals current status: matching guards yield `already_applied`, stale status and stale revision independently yield `revision_conflict`, and every case performs zero PUTs.
4. **Preserve committed, queueing, transition-legality, status mapping, and fixture outcomes** → Slice 2. Proved by focused route/helper tests, the existing Bun suite, the focused Playwright interaction test, and the full prescribed verification matrix.

Every transition above has one owning slice and executable proof; work not traceable to one of these four transitions is out of scope.

## 2. Approach: vertical implementation slices

### Slice 1 — enforce and type the request contract (4–6 focused hours)

**Topics:** `security`, `logic`, `board`

**Files to touch:**

- `src/routes/api/meta/status/+server.ts`
- `src/routes/api/meta/status/server.test.ts` (new)
- `src/lib/server/meta-write.ts`

At the route boundary, parse the JSON body as untrusted input and require `typeof expectedStatus === 'string'` and `typeof expectedRevision === 'string'` along with the existing kind/id/status validation. Empty strings are strings under the proposal's requested contract; do not silently add non-empty or SHA-format policy in this slice. Return a stable 400 error before calling any effectful collaborator. Pass a complete expectation object to `applyTransition()` and change its signature so the object and both members are required.

The route test must mock `applyTransition` and `factoryFetch`, dynamically import the handler after module mocks are installed, invoke `POST` with real `Request` objects, and cover omission and a representative non-string value for each guard. Assertions must prove response status 400 and zero helper/factory calls, rather than inferring no GitHub activity from the response. Add a valid guarded control showing the helper is reached and its existing outcome mapping is retained.

**Definition of done (machine-checkable):**

```bash
cd <minion-base checkout>
bun test src/routes/api/meta/status/server.test.ts
bun run check
```

The focused test passes all missing/non-string/control cases; static checking finds no optional expectation at the exported helper seam and no unguarded in-repo call.

### Slice 2 — conflict before idempotence and preserve outcomes (4–6 focused hours)

**Topics:** `security`, `logic`, `test`

**Files to touch:**

- `src/lib/server/meta-write.ts`
- `src/lib/server/meta-write.test.ts` (new)
- `src/routes/api/meta/status/server.test.ts`
- `tests/e2e/interaction-primitives.spec.ts`

Move the comparison of both required expectation fields ahead of `already_applied`, after the current markdown status and blob SHA are available. Keep the fixture short-circuit usable with the now-required argument; change fixture IDs or expected assertions only if the stale-target ordering changes an existing fixture's observable outcome. Do not move transition legality ahead of the guard: stale callers receive the current `{ status, revision }` without acting on a decision made against unreviewed state.

The helper tests must mock `$env/dynamic/private` before dynamically importing `meta-write.ts`, intercept GitHub fetches, and distinguish GET from PUT. Cover stale revision and stale status separately when current status already equals target, a fully matching already-applied replay, an invalid transition with matching guards, and a correct legal transition with markdown/index writes and `indexSynced`. Route tests retain the 409/422/500/202 mappings and both approval results without duplicating the helper's implementation assertions. The focused Playwright case proves the compliant browser caller and stale fixture still render the established interaction outcome.

**Definition of done (machine-checkable):**

```bash
cd <minion-base checkout>
bun test src/lib/server/meta-write.test.ts src/routes/api/meta/status/server.test.ts
bun test src/routes/kanban/issue-route.test.ts
bunx playwright test tests/e2e/interaction-primitives.spec.ts
```

The helper test records zero PUT requests for both stale cases and `already_applied`; the legal guarded control records the expected PUT path(s) and preserves `indexSynced`; all outcome/status assertions pass.

## 3. Cross-repo impact assessment

The direct implementation surface is only `minion-base`. This does not alter the gateway WebSocket protocol, shared packages, database schema, authentication, channel extensions, Hub/Site consumers, or Paperclip adapters, so the Cross-Project Impact Zones table triggers no synchronized downstream code change.

There are two external seams to protect:

- **minion-meta GitHub contents:** the wire payload gains no new field; it merely makes the two already-shipped fields mandatory. The markdown/frontmatter and `index.json` formats do not change. Tests prove missing guards cause no read/write and stale guards cause no PUT.
- **minion-factory promotion:** factory calls occur only after a successful or correctly idempotent status result, exactly as today. Route tests lock the 202 partial-success and `retryState: scheduled` behavior. No factory endpoint or response shape changes.

Unavoidable collision alert: `2026-08-18-factory-capability-separation-spec` Slice 4 proposes replacing Base's direct GitHub mutation path and names the same route/helper files. Do not implement these slices concurrently in separate branches without rebasing the later work against the landed contract. If capability separation lands first, this spec must be re-verified against its lifecycle publisher boundary and the same required guard/conflict-order tests moved to that new seam; weakening them is not an acceptable conflict resolution.

No UI-design-governance work is triggered because no Svelte component, stylesheet, token, or rendered layout changes.

## 4. Out of scope

- Durable decision receipts, a datastore for queue-pending state, or changes to reconciliation.
- Factory M2 lifecycle event APIs, capability separation, credential rotation, or removal of Base's GitHub token.
- New status transitions, transition-policy changes, or changes to proposal/spec frontmatter schemas.
- UI action construction, confirmation copy, components, visual snapshots, or feature flags; existing callers already send both guards.
- New validation beyond the approved contract, including non-empty strings, SHA syntax/length, trimming, or normalization.
- Changing `TransitionOutcome`, HTTP status mappings, `indexSynced`, `approved_and_queued`, `approved_queue_pending`, or `retryState`.
- Editing generated `specs/index.json` or `proposals/index.json` as part of this planning pass.

## 5. End-to-end verification

From a clean `minion-base` checkout containing both slices:

```bash
bun test src/lib/server/meta-write.test.ts src/routes/api/meta/status/server.test.ts
bun test src
bun run check
bun run build
bunx playwright test tests/e2e/interaction-primitives.spec.ts
```

Then run an isolated HTTP-level verification against the built/preview server with a mocked or fixture transport (never live production data):

1. POST an otherwise valid body with each guard omitted in turn and with each guard non-string; assert 400 and transport logs containing zero GitHub reads/writes and zero factory calls.
2. POST stale `expectedStatus` and stale `expectedRevision` separately while the requested target already equals current status; assert 409 with exact current `{ status, revision }` and zero PUTs.
3. POST a matching already-applied request; assert success with `already_applied` and zero PUTs.
4. POST a matching legal transition; assert `transition_committed`, the existing `indexSynced` field, and SHA-bound markdown/index effects.
5. Exercise approval with factory success and failure fixtures; assert `approved_and_queued` or HTTP 202 `approved_queue_pending` with unchanged `retryState: scheduled`.

The implementation is complete only when the focused negative proofs, the full Bun suite, static check, production build, and focused Playwright interaction test all pass. Any inability to prove zero effects on rejected/stale requests is a blocking test gap, not an assumed safety property.
