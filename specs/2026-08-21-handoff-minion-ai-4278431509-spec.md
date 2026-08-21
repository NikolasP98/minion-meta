---
id: 2026-08-21-handoff-minion-ai-4278431509-spec
title: "Handoff marker minion-tools.ts:263 — wire gateway.crm.defaultProfile into the CRM tool construction site"
stage: spec
status: approved
pass: 2
created: 2026-08-21
updated: 2026-08-21
proposal: handoff-minion-ai-4278431509
verdict: approved
repos: [minion]
relationship: extends
related: [2026-08-17-gw-defaces-crm-tools-spec]
type: fix
tags: [logic, test, handoff-sweep, crm]
---

# Wire `gateway.crm.defaultProfile` into the CRM tool construction site

## 0. Product

From the approved proposal `handoff-minion-ai-4278431509`, verbatim:

> `NikolasP98/minion-ai@DEV src/agents/minion-tools.ts:263` — all three CRM tools still use the
> built-in profile here
>
> **Definition of done:** the marker's open end is resolved and the `TODO(handoff):` comment
> removed; the sweep closes this proposal automatically once the file carries no more markers.

The live source (`NikolasP98/minion-ai@DEV`, read 2026-08-21 — see §2) carries the exact marker,
which is more specific than the proposal's paraphrase and is the actual instruction this spec
implements:

```ts
// TODO(handoff): all three CRM tools still use the built-in profile here;
// S2 of 2026-08-17-gw-defaces-crm-tools-spec must resolve it from gateway config.
```

This is not a fresh bug report — it is the exact forward-pointer that
`2026-08-17-gw-defaces-crm-tools-spec` (`canonical`, below) told its own S1 implementer to leave
when S2's precondition (an orgId at the tool-construction call site) is not met (canonical spec
⚠️ A1: *"If no orgId is in hand: use `crm.defaultProfile` only, leave a `TODO(handoff):` at the
call site naming the missing thread ... Do not invent an org lookup to close the gap in this
slice."*). §2 confirms no orgId reaches this call site today, so that branch is the live
situation, not a shortcut taken by the S1 implementer. This spec **is** that deferred S2 work,
scoped to the `crm.defaultProfile` (single-tenant / zero-orgId) path canonical S2 itself
prescribed for this exact case — not a redesign of canonical S2.

The approving human's `approved_reason` also cites "the architect-pipeline regression (meta issue
85)." That issue is real, but it is not an open correctness defect for this slice: the required
memory records the one-off Bun-lane failure as new and initially suspected of following PR #219,
while issue #85's closing evidence says the same three-test file passed on subsequent `DEV` runs and
attributes the outlier to runtime-budget proximity. See
`/memory/MINION/sdlc-board-triage-and-phase-gates.md` (entries “gw #216 DISPOSITION VIA REPORT
ARTIFACTS” and “SESSION FINAL”) and `NikolasP98/minion-meta#85`. Because this change again touches
`createMinionTools`, the existing `src/agents/tools/minion-tools.architect-pipeline.test.ts` joins
the targeted regression command in §4/§7; fixing, quarantining, or retiming that test remains outside
this marker's scope.

## 1. Relationship classification (recommend-only)

`relationship: extends`, `related: [2026-08-17-gw-defaces-crm-tools-spec]` — one-line reason:
canonical is `status: implementing`, `verdict: approved`, and its own S2 slice is, verbatim, the
work this marker asks for; this spec fills exactly that slice for the "no orgId in hand" branch
canonical already designed for, and stops at canonical's own scope boundary (it does not touch S3,
per-org `profiles` activation, or locale/matcher behavior). It is not `already-satisfied`: §2 shows
S2 has not landed (no `crm` config key exists yet on `DEV`). It is not `conflicts-with` or
`merges-drafts`: no other open spec or proposal targets this call site (a repo-wide check of
`specs/` and `proposals/` for `minion-tools.ts` found only this proposal and the canonical spec's
own carried, unverified guess of a different file, `src/agents/pi-tools/pi-tools.ts` — see §2's
correction). The S1 preflight checks for competing implementation before edits; if one exists, the
implementer stops for relationship reconciliation instead of opening a duplicate PR.

## 2. Verified AS-IS

Evidence below was read directly from `NikolasP98/minion-ai@DEV` via `gh api` on 2026-08-21 (the
canonical spec, written 2026-08-17, notes the meta-repo has no `minion/` checkout and worked from
carried, unverified claims instead — this spec had live read access and used it). Re-verify during
the S1 preflight in case `DEV` has moved since.

- `src/agents/minion-tools.ts` defines `createMinionTools` (the actual factory `pi-tools.ts`
  calls — `pi-tools.ts:24` imports it as `import { createMinionTools } from "../minion-tools.js"`
  and calls it at `pi-tools.ts:434`). **Canonical spec's "Files" list names
  `src/agents/pi-tools/pi-tools.ts` as the construction path; that is the caller, not the file that
  needs to change.** The actual per-tool-options logic — and the marker — lives in
  `src/agents/minion-tools.ts`. This spec corrects that carried claim; it does not change
  canonical's design.
- `buildToolOptions(id, ctx)` (private function, `minion-tools.ts`) is a single `switch` reached
  once per tool id per `createMinionTools` call. Lines 265-272 (current `DEV`):
  ```ts
  case "crm_search":
    return { config: opts?.config, profile: DEFAULT_CRM_PROFILE };
  case "crm_insight":
    return { config: opts?.config, agentId: ctx.agentId, profile: DEFAULT_CRM_PROFILE };
  case "crm_query":
    return { agentId: ctx.agentId, profile: DEFAULT_CRM_PROFILE };
  ```
  `DEFAULT_CRM_PROFILE` is imported from `./tools/knowledge/crm-profile.js` (line 15).
- `ToolContext` (lines 65-70) is built exactly once per `createMinionTools` call
  (`const ctx: ToolContext = { options, workspaceDir, agentId, kgSession, gwsEnabled };`, line
  356) and passed into every `buildToolOptions` call in the `TOOL_ORDER` loop. It is the correct
  place to resolve the CRM profile once, not three times per turn.
- **S1 of canonical has landed** (PR `NikolasP98/minion-ai#219`, merged 2026-08-19 to `DEV`,
  title "factory: auto: gw-defaces-crm-tools-spec S1", body explicitly scoped to "ONLY Slice 0 ...
  and Slice 1"): `crm-profile.ts` exists with `CrmProfile`, `DEFAULT_CRM_PROFILE`,
  `LOCALE_PATTERNS` (currently just `PE`), and template renderers; `crm-search-tool.ts`,
  `crm-insight-tool.ts`, `crm-query-tool.ts` each already accept an optional
  `profile?: CrmProfile` parameter and fall back to `DEFAULT_CRM_PROFILE` only when the caller
  omits it. **No further change to the three tool factories or `crm-profile.ts`'s renderers is
  needed** — only the caller in `minion-tools.ts` needs to stop passing the hardcoded default.
- **S2 has not landed.** `src/config/zod-schema.ts` and `src/config/types.gateway.ts` have no
  `crm` key. The sibling `gateway.memorySync` block (the location canonical S2 says to add `crm`
  beside) is at `zod-schema.ts:489-494` (`.strict().optional()`, object `{ enabled: z.boolean()
  .optional() }`) and `types.gateway.ts:418-419` (`memorySync?: { enabled?: boolean }`). No
  `resolveCrmProfile` or equivalent resolver exists anywhere in `src/config/`.
- **No orgId reaches this call site**, confirming canonical's ⚠️ A1 branch is the live case, not
  an implementer shortcut: `CreateMinionToolsOptions` (`minion-tools.ts`) and the options bag
  `pi-tools.ts:createOpenClawCodingTools` builds for it carry `resolvedHubUserId` (a hub *user*
  id), `agentAccountId`, `agentChannel`, `agentGroupId`/`agentGroupChannel`/`agentGroupSpace`, but
  no `orgId`/`organizationId` field anywhere in the chain. Threading one in is out of scope here
  (§6), exactly as canonical S2 instructs.
- `test/crm-tool-descriptions.test.ts` and `crm-profile.test.ts` (both added/extended by PR #219)
  exercise the renderer functions and call `createCrmSearchTool`/`createCrmInsightTool`/
  `createCrmQueryTool` directly with an explicit `profile` argument. **Neither test calls
  `createMinionTools` or `buildToolOptions`.** There is currently zero test coverage proving (a)
  that the wiring gap exists, or (b) that fixing it actually threads a configured profile through
  to the built tools — this spec's Slice 1 DoD adds that missing coverage.
- `crm-search-tool.meta.ts` (and its `crm-insight`/`crm-query` siblings) hold only
  `{ id, factory, display: { emoji, title, detailKeys }, groups }` — no description text. Canonical
  S3's "other copies" concern (`_gen/*`, `tools.status`, MCP `tools/list`, the JIT tool index) is
  unaffected by this slice and stays owned by canonical S3.
- `src/agents/tools/minion-tools.architect-pipeline.test.ts` calls `createMinionTools` three times
  and passed on the subsequent `DEV` runs recorded when meta issue #85 was closed. It is a relevant
  same-factory regression guard, not evidence that this CRM slice owns architect-pipeline behavior.

## 3. TO-BE

Invariants (all must hold; none may regress what S1 shipped):

- A zero-config gateway (`gateway.crm` absent) produces byte-identical tool descriptions,
  parameters, and behavior to what `DEV` produces today — no observable change for every currently
  configured gateway.
- Profile resolution stays fully synchronous (no `await`, no hub/DB read) on the per-turn tool
  build path — the architecture constraint `2026-06-26-gateway-config-db-migration-plan` and
  canonical spec ⚠️ A1 both require this.
- Resolution never throws. A malformed `gateway.crm` value that somehow reaches runtime past Zod
  validation logs exactly one `warn` per resolver invocation and falls back to
  `DEFAULT_CRM_PROFILE`.
- The resolved profile is computed once per `createMinionTools` call (in `ToolContext`) and reused
  by all three CRM `buildToolOptions` cases — not re-resolved per tool.
- `resolveCrmProfile` accepts optional config and `orgId` parameters per canonical S2's designed
  behavior, for forward compatibility, but no caller in this repo passes one yet (§6) — the `profiles`
  per-org override map is defined in the schema/type but is dormant (unreachable) until a future
  spec threads an orgId to this call site.

Target behavior:

1. `gateway.crm.defaultProfile?: CrmProfileConfig` (and a currently-dormant
   `gateway.crm.profiles?: Record<string, CrmProfileConfig>`) exist in `zod-schema.ts` (`.strict()`)
   and the mirrored `types.gateway.ts`, nested beside `memorySync` exactly as canonical S2
   specifies, with the same caps: `businessName` ≤ 80 chars, `subjectNoun`/`subjectNounPlural` ≤ 40,
   `idLabel` ≤ 16, `examples` ≤ 12 entries × ≤ 60 chars each, `locale` restricted to the enum of
   `LOCALE_PATTERNS` keys (today just `"PE"`).
2. A new synchronous resolver,
   `resolveCrmProfile(cfg?: MinionConfig, orgId?: string): CrmProfile`, lives in
   `src/config/crm-profile-resolver.ts`. Precedence:
   `crm.profiles[orgId]` (dormant — never hit while no caller passes `orgId`) → `crm.defaultProfile`
   → `DEFAULT_CRM_PROFILE`, merged field-wise (a sparse override does not discard defaults below
   it). It normalizes (trim, drop empty strings, dedupe `examples`) and maps a validated `locale`
   key to `CrmProfile.localeId` + `CrmProfile.phonePattern` (from `LOCALE_PATTERNS`). This module
   is the only place gateway config is read for this feature; `crm-profile.ts` itself stays pure
   and config-free per S1. The optional `cfg` is required because `createMinionTools()` is a
   supported zero-config call; it resolves directly to the built-in default without manufacturing
   a partial `MinionConfig` cast.
3. `minion-tools.ts` resolves the profile once into `ToolContext` (e.g. `ctx.crmProfile`) and the
   `crm_search`/`crm_insight`/`crm_query` `buildToolOptions` cases pass `ctx.crmProfile` instead of
   the `DEFAULT_CRM_PROFILE` literal. No other tool's options change.
4. The exact `TODO(handoff):` marker quoted in §0 is removed once 1-3 are proven (§4/§7). No other
   `TODO(handoff):` marker in `src/agents/tools/` or `src/config/` is touched.

## 4. DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | Add `gateway.crm.defaultProfile` (+ dormant `profiles`) to the Zod schema and mirrored type, capped and `.strict()` | S1 | schema/type compile + a config-validation test asserting an oversize/invalid field is rejected |
| 2 | Add `resolveCrmProfile(cfg?, orgId?)`: synchronous, fail-soft (warn + default, never throw), field-wise precedence, normalization, locale→pattern mapping | S1 | unit tests: absent config, all three precedence levels, trim/drop-empty/dedupe behavior, malformed value past the boundary, unknown-locale-injected-past-schema |
| 3 | `ToolContext` resolves the profile once; `crm_search`/`crm_insight`/`crm_query` in `buildToolOptions` use it instead of the `DEFAULT_CRM_PROFILE` literal | S1 | a `createMinionTools`-level test proves a unique configured noun reaches all three built tools, the business name reaches the two renderers that currently emit it, and the resolver runs exactly once per call |
| 4 | Zero-config output is byte-identical to pre-change `DEV` | S1 | built tool descriptions and parameters equal the existing direct-factory default outputs; the existing generic-default and explicit-FACES fixture assertions stay green unmodified |
| 5 | The exact marker quoted in §0 is removed; no other marker is touched | S1 | exact-text guard (`rg`) returns no match in `minion-tools.ts`; `DEFAULT_CRM_PROFILE` is no longer imported or used there; sibling markers (if any, per the S1 preflight) are unaffected |

### S1 preflight — reconcile before editing (read-only, ≤ 30 min of S1)

**Topics:** `crm`, `hygiene`

This preflight is part of Slice 1's 5–7 hour estimate and is not independently scheduled.
`minion/` is not checked out in the meta-repo; §2's evidence came from live GitHub reads, which can
drift. Before editing, on the actual branch to be worked from, confirm:

- The marker still reads exactly as quoted in §0, at the same or a nearby line in
  `src/agents/minion-tools.ts`, and no other open PR/branch already added a `gateway.crm` block or
  changed these three `buildToolOptions` cases (if one exists, verify it there instead of opening a
  duplicate — do not implement a second resolver).
- No `orgId`/`organizationId` has been threaded into `CreateMinionToolsOptions` or the
  `pi-tools.ts` call chain since 2026-08-21 (§2). If one has landed, canonical S2's full
  `profiles[orgId]` precedence becomes reachable and this spec's scope should grow to wire it
  rather than leaving `profiles` dormant — flag this to a human before proceeding, since it changes
  the DELTA.
- Confirm `src/config/crm-profile-resolver.ts` does not already exist under another name, and confirm
  `schema-parity.test.ts` (`src/config/schema-parity.test.ts`) still checks only **top-level**
  `MinionConfig` keys (confirmed in §2 reading of that file). Nesting `crm` under the existing
  top-level `gateway` key means this slice does **not** edit that test; it still runs as a gate.
- Whether canonical spec's own status/pass has changed (e.g. a human already revised it to reflect
  the corrected file path from §2) and reconcile against that instead of this spec's carried
  snapshot.
- Whether `minion_hub` passes unknown gateway config leaves through unchanged or reconstructs/
  validates the `gateway` object. If it would reject or drop `gateway.crm`, stop and revise `repos`
  and the DELTA before implementation; a required transport fix cannot be silently deferred from a
  `repos: [minion]` slice.

### Slice 1 — resolve the marker (5–7 h, including preflight)

**Topics:** `crm`, `logic`, `test`

**Files:**

- `src/config/zod-schema.ts` — add `crm` beside `memorySync` (~line 489)
- `src/config/types.gateway.ts` — mirror the type beside `memorySync` (~line 419)
- new `src/config/crm-profile-resolver.ts` + `src/config/crm-profile-resolver.test.ts`
- `src/agents/minion-tools.ts` — resolve once into `ToolContext`, use it in the three CRM cases,
  remove the marker
- `test/crm-tool-descriptions.test.ts` — extend with the missing `createMinionTools`-level coverage
  (§2)
- `test/fixtures/crm-tool-descriptions.faces.txt` untouched
- `src/agents/tools/minion-tools.architect-pipeline.test.ts` — run unchanged as a same-factory
  regression guard; it is not an implementation file

**Do not touch:** `crm-profile.ts` renderers, the three CRM tool factory files' signatures (already
accept `profile?`), `_gen/*`, `tools.status`, MCP export, the JIT tool index (canonical S3), any
`.svelte` file, any migration/DDL, `pi-tools.ts` (no new option needs threading through it — the
resolver reads `opts?.config`, which `pi-tools.ts` already passes to `createMinionTools`).

**Definition of done (machine-checkable):**

```bash
cd minion

pnpm tsgo && pnpm check

pnpm vitest run src/config/schema-parity.test.ts \
                src/config/crm-profile-resolver.test.ts \
                test/crm-tool-descriptions.test.ts \
                src/agents/tools/minion-tools.architect-pipeline.test.ts
#   - CUSTOM CONFIG: gateway.crm.defaultProfile = { businessName: 'Northwind Retail',
#     subjectNoun: 'client', subjectNounPlural: 'clients',
#     examples: ['annual maintenance plan'] } → createMinionTools(...) builds crm_search,
#     crm_insight, crm_query; all three descriptions contain the configured client vocabulary,
#     crm_search + crm_insight contain 'Northwind Retail' (crm_query's existing renderer does not
#     emit businessName), and all match NONE of /faces|sculptor|patient|clinic|DNI/i
#   - NO CONFIG: absent gateway.crm → each built CRM tool's description + parameters equal the
#     corresponding direct factory called with the same non-profile options but without `profile`;
#     existing generic-default and explicit-FACES fixture tests remain green and unmodified
#     ← DELTA #4
#   - PRECEDENCE/NORMALIZATION: profiles[orgId] field-wise overrides defaultProfile, which
#     field-wise overrides DEFAULT_CRM_PROFILE; strings are trimmed, empty strings dropped, and
#     examples deduped in first-seen order
#   - SCHEMA CAPS: invalid locale and every over-cap field/array shape are rejected
#   - MALFORMED: an invalid value injected past the Zod boundary → resolveCrmProfile returns
#     DEFAULT_CRM_PROFILE, logs exactly one warn for that invocation, and does NOT throw
#     (expect(...).not.toThrow())
#   - ONCE-PER-CALL: a spy/counter proves resolveCrmProfile is invoked exactly once per
#     createMinionTools call, not once per CRM tool
#   - resolveCrmProfile is synchronous: no `await`, compiles when assigned without `Promise<...>`

BASE_REF=origin/DEV
if git diff --name-only "$BASE_REF"...HEAD | rg 'supabase/migrations|drizzle'; then
  echo "FAIL: no DDL"; exit 1
fi
if git diff --name-only "$BASE_REF"...HEAD | rg '\.svelte$'; then
  echo "FAIL: no UI in scope"; exit 1
fi

if rg -n -F 'TODO(handoff): all three CRM tools still use the built-in profile here' src/agents/minion-tools.ts; then
  echo "FAIL: handoff marker remains"; exit 1
fi

if rg -n 'DEFAULT_CRM_PROFILE' src/agents/minion-tools.ts; then
  echo "FAIL: minion-tools must consume the resolver result, not import/use the built-in literal"; exit 1
fi
```

## 5. Cross-repo impact assessment

| Surface | Impact | Handling |
|---|---|---|
| `minion` gateway config schema/type | New optional, `.strict()`, capped `gateway.crm` block. Additive only. | No migration; existing `gateway.json` files parse unchanged (absent key). |
| `minion` tool construction (`minion-tools.ts`) | One extra synchronous resolve per `createMinionTools` call. | Resolve once in `ToolContext`, not per tool — no measurable per-turn cost beyond a plain object read/merge. |
| `minion_hub` gateway-config transport/editor | Conditional compatibility impact: an additive gateway leaf is safe only if Hub passes unknown nested keys through instead of reconstructing or rejecting the object. | S1 preflight verifies this. If Hub drops/rejects `gateway.crm`, stop and revise `repos` + DELTA; do not ship an unreachable config surface. |
| `@minion-stack/shared`, `minion_site`, `paperclip-minion` | None. No protocol frame/type, DB schema, or shared package is touched. | No changeset or consumer update unless the preflight finds a typed mirror, in which case stop and revise the impact assessment. |
| Canonical spec `2026-08-17-gw-defaces-crm-tools-spec` (S2/S3) | This slice implements canonical S2's "no orgId" branch only. S2's `profiles[orgId]` precedence stays dormant; S3 (republisher sweep, locale hardening, anti-recurrence guard) is untouched. | PR description says explicitly "implements canonical S2 for the no-orgId case"; the S1 preflight stops on competing in-flight work. |
| `src/agents/tools/minion-tools.architect-pipeline.test.ts` / meta issue #85 | Same `createMinionTools` factory, but no owned behavior change. Issue #85 closed after subsequent `DEV` passes identified a runtime-budget outlier rather than a #219 correctness regression. | Run the existing test unchanged in the targeted gate. Any timing-policy change remains with the gateway CI spec, not this marker. |
| Sibling handoff markers `handoff-minion-ai-3238987400` / `handoff-minion-ai-492754540` (nostr dispatch) | Unrelated file (`extensions/nostr/`), unrelated marker. | Not touched; do not close or edit those proposals from this spec. |

## 6. Out of scope (explicit)

- **Threading an `orgId` into `CreateMinionToolsOptions` or the `pi-tools.ts` call chain**, and
  therefore **activating `gateway.crm.profiles[orgId]`**. Canonical S2 explicitly forbids inventing
  an org lookup in this slice; that is separate, larger work (its own proposal, once a caller
  actually has an orgId in hand at this call site).
- **Canonical S3** in full: the `_gen/*` republisher sweep, `tools.status`/MCP `tools/list` text,
  the JIT tool-index singleton-poisoning question, locale-pattern hot-path hardening beyond what
  already shipped in S1, and the anti-recurrence source-scanning guard test. All remain owned by
  the canonical spec.
- **Changing what the CRM tools search, query, or match** — the SQL, the phone regex's matching
  behavior (only *where the pattern comes from* changes, not what it matches), and the hub
  endpoints are untouched, matching both the original proposal's and canonical's own exclusion.
- **`crm-profile.ts` renderer logic or the three tool factories' public signatures** — S1 already
  built the `profile?: CrmProfile` parameter; this slice only changes what the caller passes.
- **The `handoff-minion-ai-3238987400` / `handoff-minion-ai-492754540` nostr markers.**
- **Changing, quarantining, or retiming architect-pipeline behavior/tests.** Meta issue #85 is real
  but closed as a runtime-budget outlier after subsequent passes; this slice only runs the existing
  same-factory test unchanged as regression evidence (§0/§5).
- **Schema/DDL changes.** None in this slice.

## 7. End-to-end verification

Run on the branch reconciled by the S1 preflight, with all of Slice 1's DoD green, then:

```bash
cd minion
pnpm tsgo && pnpm check
pnpm vitest run src/config/schema-parity.test.ts src/config/crm-profile-resolver.test.ts \
                test/crm-tool-descriptions.test.ts \
                src/agents/tools/minion-tools.architect-pipeline.test.ts
if rg -n -F 'TODO(handoff): all three CRM tools still use the built-in profile here' src/agents/minion-tools.ts; then
  echo "FAIL: handoff marker remains"; exit 1
fi
if rg -n 'DEFAULT_CRM_PROFILE' src/agents/minion-tools.ts; then
  echo "FAIL: hardcoded default remains in the construction module"; exit 1
fi
if rg -n -i 'faces sculptors' src/agents/tools/; then
  echo "FAIL: canonical tenant-text DoD regressed"; exit 1
fi
```

Manual smoke is transport/turn safety only (disposable dev gateway, never production):

1. Save the disposable gateway's current config, then patch
   `{"gateway":{"crm":{"defaultProfile":{"businessName":"Northwind Retail","subjectNoun":"client","subjectNounPlural":"clients"}}}}`
   through the existing `config.patch` RPC.
2. Read back `gateway.crm.defaultProfile` with the existing config RPC and assert the values were
   preserved; send one dev turn and assert tool construction completes without a warning or throw.
3. Restore the saved config and confirm the next dev turn constructs tools normally.

`tools.status` is deliberately not used as proof of the configured runtime profile: canonical S3
owns that generic republisher surface, and its metadata description is not the per-call factory
description. The `createMinionTools` integration test is the deterministic wiring proof.

**Ship gate:** §7 all green; DELTA #1-5 each individually proven per their listed test; the
`TODO(handoff):` marker gone and no other marker touched; the cross-repo impact table's "no
changeset needed" claim confirmed by the Hub transport check and absence of a shared typed mirror;
the S1 preflight findings (especially any orgId-threading, Hub key-dropping, or competing resolver
landed since 2026-08-21) reconciled and, if they change the DELTA or `repos`, escalated to a human
rather than silently re-scoped.
