---
id: 2026-08-21-handoff-minion-ai-4278431509-spec
title: "Handoff marker minion-tools.ts:263 — wire gateway.crm.defaultProfile into the CRM tool construction site"
stage: spec
status: draft
pass: 1
created: 2026-08-21
updated: 2026-08-21
proposal: handoff-minion-ai-4278431509
verdict: pending
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
85)" as related territory. I could not verify this: no `architect-pipeline`/`architect_pipeline`
string appears anywhere in `specs/`, `proposals/`, or this workspace outside the proposal file
itself, and no "issue 85" is referenced anywhere in the meta-repo. The only concrete adjacency I
found is that `minion-tools.ts` has an unrelated `case "architect_pipeline":` tool-options branch
(line 251, `KnowledgeSession`-style config only) a few lines above the CRM marker in the same
`switch` statement — plausibly the source of the reference, but I am not confident of that and
this spec does not rely on it. Flagging per the honesty rules rather than treating it as an
established fact; if it names a real, separate defect, that belongs in its own proposal.

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
correction). I recommend a human confirm this classification and that the canonical spec owner
sequences this PR as canonical's S2, rather than a competing implementation.

## 2. Verified AS-IS

Evidence below was read directly from `NikolasP98/minion-ai@DEV` via `gh api` on 2026-08-21 (the
canonical spec, written 2026-08-17, notes the meta-repo has no `minion/` checkout and worked from
carried, unverified claims instead — this spec had live read access and used it). Re-verify in
Slice 0 in case `DEV` has moved since.

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
  (§8), exactly as canonical S2 instructs.
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

## 3. TO-BE

Invariants (all must hold; none may regress what S1 shipped):

- A zero-config gateway (`gateway.crm` absent) produces byte-identical tool descriptions,
  parameters, and behavior to what `DEV` produces today — no observable change for every currently
  configured gateway.
- Profile resolution stays fully synchronous (no `await`, no hub/DB read) on the per-turn tool
  build path — the architecture constraint `2026-06-26-gateway-config-db-migration-plan` and
  canonical spec ⚠️ A1 both require this.
- Resolution never throws. A malformed `gateway.crm` value that somehow reaches runtime past Zod
  validation logs one `warn` and falls back to `DEFAULT_CRM_PROFILE`.
- The resolved profile is computed once per `createMinionTools` call (in `ToolContext`) and reused
  by all three CRM `buildToolOptions` cases — not re-resolved per tool.
- `resolveCrmProfile` accepts an optional `orgId` parameter per canonical S2's designed signature,
  for forward compatibility, but no caller in this repo passes one yet (§8) — the `profiles`
  per-org override map is defined in the schema/type but is dormant (unreachable) until a future
  spec threads an orgId to this call site.

Target behavior:

1. `gateway.crm.defaultProfile?: CrmProfileConfig` (and a currently-dormant
   `gateway.crm.profiles?: Record<string, CrmProfileConfig>`) exist in `zod-schema.ts` (`.strict()`)
   and the mirrored `types.gateway.ts`, nested beside `memorySync` exactly as canonical S2
   specifies, with the same caps: `businessName` ≤ 80 chars, `subjectNoun`/`subjectNounPlural` ≤ 40,
   `idLabel` ≤ 16, `examples` ≤ 12 entries × ≤ 60 chars each, `locale` restricted to the enum of
   `LOCALE_PATTERNS` keys (today just `"PE"`).
2. A new synchronous resolver, `resolveCrmProfile(cfg: MinionConfig, orgId?: string): CrmProfile`,
   lives in `src/config/` (Slice 0 confirms the exact filename against local naming conventions —
   e.g. sibling to `group-policy.ts`/`profile-loader.ts`). Precedence:
   `crm.profiles[orgId]` (dormant — never hit while no caller passes `orgId`) → `crm.defaultProfile`
   → `DEFAULT_CRM_PROFILE`, merged field-wise (a sparse override does not discard defaults below
   it). It normalizes (trim, drop empty strings, dedupe `examples`) and maps a validated `locale`
   key to `CrmProfile.localeId` + `CrmProfile.phonePattern` (from `LOCALE_PATTERNS`). This module
   is the only place gateway config is read for this feature; `crm-profile.ts` itself stays pure
   and config-free per S1.
3. `minion-tools.ts` resolves the profile once into `ToolContext` (e.g. `ctx.crmProfile`) and the
   `crm_search`/`crm_insight`/`crm_query` `buildToolOptions` cases pass `ctx.crmProfile` instead of
   the `DEFAULT_CRM_PROFILE` literal. No other tool's options change.
4. The exact `TODO(handoff):` marker quoted in §0 is removed once 1-3 are proven (§4/§6). No other
   `TODO(handoff):` marker in `src/agents/tools/` or `src/config/` is touched.

## 4. DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | Add `gateway.crm.defaultProfile` (+ dormant `profiles`) to the Zod schema and mirrored type, capped and `.strict()` | S1 | schema/type compile + a config-validation test asserting an oversize/invalid field is rejected |
| 2 | Add `resolveCrmProfile(cfg, orgId?)`: synchronous, fail-soft (warn + default, never throw), field-wise precedence, locale→pattern mapping | S1 | unit tests: absent config, valid custom config, malformed value past the boundary, unknown-locale-injected-past-schema |
| 3 | `ToolContext` resolves the profile once; `crm_search`/`crm_insight`/`crm_query` in `buildToolOptions` use it instead of the `DEFAULT_CRM_PROFILE` literal | S1 | a `createMinionTools`-level test proving a configured `defaultProfile` reaches all three built tools' descriptions/parameters, and that it is resolved exactly once per call |
| 4 | Zero-config output is byte-identical to pre-change `DEV` | S1 | existing `crm-tool-descriptions.faces.txt` fixture assertion stays green unmodified; a new default-profile fixture assertion added |
| 5 | The exact marker quoted in §0 is removed; no other marker is touched | S1 | exact-text guard (`rg`) returns no match in `minion-tools.ts`; sibling markers (if any, per Slice 0) are unaffected |

### Slice 0 — reconcile before editing (read-only, ≤ 30 min)

**Topics:** `crm`, `hygiene`

`minion/` is not checked out in the meta-repo; §2's evidence came from live GitHub reads, which
can drift. Before implementing, on the actual branch to be worked from, confirm:

- The marker still reads exactly as quoted in §0, at the same or a nearby line in
  `src/agents/minion-tools.ts`, and no other open PR/branch already added a `gateway.crm` block or
  changed these three `buildToolOptions` cases (if one exists, verify it there instead of opening a
  duplicate — do not implement a second resolver).
- No `orgId`/`organizationId` has been threaded into `CreateMinionToolsOptions` or the
  `pi-tools.ts` call chain since 2026-08-21 (§2). If one has landed, canonical S2's full
  `profiles[orgId]` precedence becomes reachable and this spec's scope should grow to wire it
  rather than leaving `profiles` dormant — flag this to a human before proceeding, since it changes
  the DELTA.
- The exact naming/location convention for a new `src/config/` resolver module (sibling examples:
  `group-policy.ts`, `profile-loader.ts`, `plugin-auto-enable.ts`) and confirm `schema-parity.test.ts`
  (`src/config/schema-parity.test.ts`) only checks **top-level** `MinionConfig` keys (confirmed in
  §2 reading of that file) — nesting `crm` under the existing top-level `gateway` key means this
  slice does **not** need a `schema-parity.test.ts` update; verify that is still true.
- Whether canonical spec's own status/pass has changed (e.g. a human already revised it to reflect
  the corrected file path from §2) and reconcile against that instead of this spec's carried
  snapshot.

### Slice 1 — resolve the marker (4-6 h)

**Topics:** `crm`, `logic`, `test`

**Files:**

- `src/config/zod-schema.ts` — add `crm` beside `memorySync` (~line 489)
- `src/config/types.gateway.ts` — mirror the type beside `memorySync` (~line 419)
- a new `src/config/<name>.ts` resolver module (name from Slice 0) + its unit test
- `src/agents/minion-tools.ts` — resolve once into `ToolContext`, use it in the three CRM cases,
  remove the marker
- `test/crm-tool-descriptions.test.ts` or a new `src/agents/minion-tools.crm-profile.test.ts` —
  the missing `createMinionTools`-level coverage (§2)
- `test/fixtures/crm-tool-descriptions.faces.txt` untouched; optionally add a second default-profile
  fixture if the new test wants byte-exact assertions

**Do not touch:** `crm-profile.ts` renderers, the three CRM tool factory files' signatures (already
accept `profile?`), `_gen/*`, `tools.status`, MCP export, the JIT tool index (canonical S3), any
`.svelte` file, any migration/DDL, `pi-tools.ts` (no new option needs threading through it — the
resolver reads `opts?.config`, which `pi-tools.ts` already passes to `createMinionTools`).

**Definition of done (machine-checkable):**

```bash
cd minion

pnpm tsgo && pnpm check

pnpm vitest run src/config/schema-parity.test.ts \
                src/config/<resolver-file>.test.ts \
                test/crm-tool-descriptions.test.ts
#   - CUSTOM CONFIG: gateway.crm.defaultProfile = { businessName: 'Northwind Retail',
#     subjectNoun: 'customer', subjectNounPlural: 'customers',
#     examples: ['annual maintenance plan'] } → createMinionTools(...) builds crm_search,
#     crm_insight, crm_query whose descriptions contain 'Northwind Retail' and match NONE of
#     /faces|sculptor|patient|clinic|DNI/i
#   - NO CONFIG: absent gateway.crm → identical output to current DEV (assert against the existing
#     faces-fixture test path AND a new default-profile fixture)   ← DELTA #4
#   - MALFORMED: an invalid value injected past the Zod boundary → resolveCrmProfile returns
#     DEFAULT_CRM_PROFILE, logs one warn, does NOT throw (expect(...).not.toThrow())
#   - ONCE-PER-CALL: a spy/counter proves resolveCrmProfile is invoked exactly once per
#     createMinionTools call, not once per CRM tool
#   - resolveCrmProfile is synchronous: no `await`, compiles when assigned without `Promise<...>`

git diff --name-only <base>...HEAD | grep -E 'supabase/migrations|drizzle' && echo "FAIL: no DDL" && exit 1
git diff --name-only <base>...HEAD | grep -E '\.svelte$' && echo "FAIL: no UI in scope" && exit 1

rg -n -F 'TODO(handoff): all three CRM tools still use the built-in profile here' src/agents/minion-tools.ts
# → must be EMPTY (exit 1 if it still matches)

rg -n 'DEFAULT_CRM_PROFILE' src/agents/minion-tools.ts
# → the import line only; no remaining literal use in buildToolOptions' crm_* cases
```

## 7. Cross-repo impact assessment

| Surface | Impact | Handling |
|---|---|---|
| `minion` gateway config schema/type | New optional, `.strict()`, capped `gateway.crm` block. Additive only. | No migration; existing `gateway.json` files parse unchanged (absent key). |
| `minion` tool construction (`minion-tools.ts`) | One extra synchronous resolve per `createMinionTools` call. | Resolve once in `ToolContext`, not per tool — no measurable per-turn cost beyond a plain object read/merge. |
| `@minion-stack/shared`, `minion_hub`, `minion_site`, `paperclip-minion` | None. No protocol type, DB schema, or shared package touched — this is a gateway-local config leaf, same class as `memorySync`. | No changeset, no cross-repo dispatch needed. |
| Canonical spec `2026-08-17-gw-defaces-crm-tools-spec` (S2/S3) | This slice implements canonical S2's "no orgId" branch only. S2's `profiles[orgId]` precedence stays dormant; S3 (republisher sweep, locale hardening, anti-recurrence guard) is untouched. | PR description should say explicitly "implements canonical S2 for the no-orgId case"; a human sequences this against any other in-flight canonical work found in Slice 0. |
| Sibling handoff markers `handoff-minion-ai-3238987400` / `handoff-minion-ai-492754540` (nostr dispatch) | Unrelated file (`extensions/nostr/`), unrelated marker. | Not touched; do not close or edit those proposals from this spec. |

## 8. Out of scope (explicit)

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
- **The `handoff-minion-ai-3238987400` / `handoff-minion-ai-492754540` nostr markers** and the
  "architect-pipeline / meta issue 85" claim from the proposal's `approved_reason` (§0) — unverified
  and unrelated to this file; if real, it needs its own proposal.
- **Schema/DDL changes.** None in this slice.

## 9. End-to-end verification

Run on the reconciled branch from Slice 0, all of Slice 1's DoD green, then:

```bash
cd minion
pnpm tsgo && pnpm check
pnpm vitest run src/config/schema-parity.test.ts src/config/<resolver-file>.test.ts \
                test/crm-tool-descriptions.test.ts
rg -n -F 'TODO(handoff): all three CRM tools still use the built-in profile here' src/agents/minion-tools.ts   # empty
rg -n -i 'faces sculptors' src/agents/tools/   # still zero — no regression on canonical's own DoD
```

Manual smoke (dev gateway only, never production — mirrors canonical §6 step 3, scoped to
`defaultProfile`):

1. Zero-config: `minion gateway rpc tools.status | jq '.tools[] | select(.name=="crm_search") | .description'` — unchanged from pre-change baseline.
2. `minion gateway rpc config.patch --data '{"gateway":{"crm":{"defaultProfile":{"businessName":"Northwind Retail","subjectNoun":"customer","subjectNounPlural":"customers"}}}}'`.
3. Re-read `tools.status` for `crm_search`/`crm_insight`/`crm_query` — all three now mention
   "Northwind Retail"; none contain FACES/clinic vocabulary.
4. Restore the FACES gateway's config (or confirm it was never touched) and diff its rendered
   description against `test/fixtures/crm-tool-descriptions.faces.txt` — byte-equal.

**Ship gate:** §9 all green; DELTA #1-5 each individually proven per their listed test; the
`TODO(handoff):` marker gone and no other marker touched; the cross-repo impact table's "no
changeset needed" claim confirmed by an actual empty `git diff` outside `minion/`; Slice 0's
findings (especially any orgId-threading landed since 2026-08-21, or another branch already
covering this) reconciled and, if they change the DELTA, escalated to a human rather than silently
re-scoped.
