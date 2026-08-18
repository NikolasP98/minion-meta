---
id: 2026-08-17-gw-defaces-crm-tools-spec
title: "Builtin CRM tools — de-FACES the descriptions (business name, locale patterns and examples from org config)"
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-18
proposal: 2026-08-17-gw-defaces-crm-tools
verdict: approved
repos: [minion]
tags: [logic, test]
type: fix
---

# Builtin CRM tools — de-FACES the descriptions

**Owner surface:** `minion` (gateway, branch `DEV`) — `src/agents/tools/knowledge/crm-search-tool.ts`,
`src/agents/tools/knowledge/crm-insight-tool.ts` and their `.meta.ts` siblings, a new pure module
`src/agents/tools/knowledge/crm-profile.ts` (the seam — see §3), the config Zod schema +
types (`src/config/zod-schema.*.ts`, `src/config/types.*.ts`, `src/config/schema-parity.test.ts`),
the tool-construction path (`src/agents/pi-tools/pi-tools.ts` `createMinionTools`), the codegen
output `src/agents/tools/_gen/*` (regenerated, never hand-edited), and a parity fixture deliberately
placed **outside** `src/agents/tools/` (see S1)
**Design ancestors:**
[`2026-07-09-agent-tool-scaling-architecture`](2026-07-09-agent-tool-scaling-architecture.md)
(the tool registry: 53 `.meta.ts` tools incl. **knowledge 5**, `pnpm generate:tools` →
`_registry.generated.ts` / `_groups.generated.ts`, `ToolMeta` at
`src/agents/tool-governance/tool-meta.ts:26-66` with `groups/display/condition/…`, per-turn assembly
`resolveRunEnvironment` → `createOpenClawCodingTools` → `createMinionTools`, and the JIT
`tool-index.ts` that embeds `"<id>. <title>. <description>. groups: …"` — ⚠️ A2),
[`2026-06-26-gateway-config-db-migration-plan`](2026-06-26-gateway-config-db-migration-plan.md)
(`status: shipped` — establishes that gateway config is a Zod-validated `gateway.json` read
**synchronously from an in-memory mirror**, hot-reloaded by chokidar, mutated via `config.get/patch/set/apply`;
its ★ architecture constraint — *no async DB/hub read on the per-message path* — is what forbids
sourcing this text from a hub fetch at tool-construction time),
[`2026-07-02-hub-erp-agent-native-audit`](2026-07-02-hub-erp-agent-native-audit.md) §5
("Agent data tools: CRM only — `crm_insight`, `crm_query`, `crm_search` → hub `/api/gateway/insight`"
— names a **third** tool in the same family, ⚠️ A5),
[`2026-08-17-hub-reserva-keyword-config-spec`](2026-08-17-hub-reserva-keyword-config-spec.md) §4 ⚠️ A2
(the hub-side sibling of this debt; it explicitly routes any gateway-side hardcode it finds **to this
proposal** — the inbound handoff in ⚠️ A5)
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
every slice below is tagged `logic`/`test`: mandatory red-state TDD, **no** UI-governance checks
(no `.svelte` file is edited in any slice — see §5)

---

## 0. Product

From the approved proposal `2026-08-17-gw-defaces-crm-tools`, verbatim:

> ## Problem
>
> src/agents/tools/knowledge/crm-search-tool.ts:37 hardcodes 'Faces Sculptors patient CRM', Peru-only
> phone regex (/(?:\+?51)?([9]\d{8})\b/), DNI terminology and clinic example procedures into a GENERIC
> builtin tool gated only on memorySync.enabled — every org's agents get a wrong, confusing,
> single-tenant tool description. crm-insight-tool.ts:53 same class ('Faces Sculptors CRM + finance').
>
> ## Definition of done
>
> Business display name, locale patterns (phone/DNI), and example vocabulary come from org config;
> descriptions are templated at construction. A non-FACES mock org yields descriptions with zero
> clinic-specific text (unit test). grep for 'Faces Sculptors' in src/agents/tools returns nothing.
>
> ## Out of scope
>
> Changing tool behavior/queries; hub-side org-config UI.

**What an affected org actually gets today.** A tool description is not a comment — it is the only
thing the model reads when deciding whether to call the tool and what to put in the argument. So an
org that is not a Peruvian aesthetics clinic receives, in every single turn:

1. **A false claim about what the tool reaches.** "Faces Sculptors patient CRM" tells the model the
   tool searches *someone else's* customers. The predictable failure is under-calling (the model
   decides the tool is irrelevant to this org) — silent, and invisible in logs because a tool that is
   never called produces no error.
2. **Wrong argument shaping.** A phone regex `/(?:\+?51)?([9]\d{8})\b/` and "DNI" as the identity
   noun teach the model to normalise queries into Peruvian mobile numbers and Peruvian national IDs.
   A Mexican, Spanish or US org's phone number does not match that shape.
3. **Wrong vocabulary.** Clinic example procedures anchor the model's idea of what the org sells.
4. **Tenant data leakage of a mild but real kind.** Every org's agents — and every external
   **MCP client** that lists gateway tools, if these tools are `mcpExport` (⚠️ A2) — learn the name
   of another customer of this platform. That is a disclosure with no upside.

Nothing here fails loudly. That is why it is worth a spec rather than a find-and-replace.

**Why three slices and not a sed.** Four things make this more than a string edit:

- **There are at least two, probably three, copies of the text.** The runtime description passed to
  the model is built by the tool factory; a second description lives in the tool's `ToolMeta.display`
  and is **compiled into `src/agents/tools/_gen/*` by `pnpm generate:tools`** — inside the very
  directory the proposal's grep covers. If the JIT tool index from
  `2026-07-09-agent-tool-scaling-architecture` shipped, a third copy is embedded in a vector index.
  A fix that only edits the factory passes review and fails the DoD grep.
- **The phone regex is plausibly executable, not decorative.** If it parses the incoming query, then
  "where the pattern comes from" is config work (in scope, the proposal names locale patterns
  explicitly) while "what the matcher does" is behavior (the proposal's own out-of-scope). The two
  must be separated on purpose, with a compat default, or this fix silently changes search results.
- **Operator-supplied regex on the per-turn hot path is a hazard.** Tools are constructed per turn.
  A config-supplied pattern that fails to compile, or that backtracks catastrophically, degrades
  *every* turn for that gateway — a worse failure than the wrong noun it replaces (⚠️ A3).
- **"Org config" has to mean something concrete in the gateway, and the obvious answer is wrong.**
  The gateway holds no hub-role or org knowledge beyond what is threaded to it, and the shipped
  config architecture forbids an async read on the per-message path. So this is a `gateway.json`
  Zod block resolved synchronously — not a hub REST call at description-build time (⚠️ A1).

## 1. Assumptions — Slice 0 is mandatory

**This spec was written from the meta-repo, where `minion/` is not checked out** (the meta-repo
`.gitignore` excludes every subproject; verified on disk here — there is no `minion/` directory at
all). Every path, line number and symbol *inside `minion/`* below is carried from the proposal
(written today — strong) or from the gateway specs of 2026-06→2026-07 (weeks old; **line numbers have
moved**). Treat them as leads, not fact. Slice 0 turns them into fact; if something moved, correct §3
of this spec in the same commit rather than implementing against a different file in silence.

What **was** independently verified in this checkout (the meta-repo owns these):

- `grep -rniI 'faces sculptors'` over `packages/ ops/ langgraph-server/ scripts/ supabase/` returns
  exactly **one** hit — `scripts/crm-embed-backfill.py:5`, a header comment naming the backfill's
  target org. No shared package, no protocol type and no migration carries the tenant name, so
  nothing outside `minion/` has to move with this change. Re-run at PR time (§4).
- `grep -rniI 'ToolStatusEntry|tools\.status|memorySync|crm_search|crm_insight' packages langgraph-server ops scripts`
  → **zero hits**. `@minion-stack/shared` carries no tool-metadata or gateway-config type, so no
  shared-package version bump and no changeset is implied by this work.
- `packages/shared/src/prompt-sections.ts` (169 lines) is the protocol for the gateway's
  operator-authored prompt system: per-**agent** YAML sections, layers
  `platform | agent-type | identity | user | session`, a `cacheable` flag whose doc-comment says the
  layer "determines ordering + **caching strategy**", and a content-safety scanner
  (`SectionViolation`, `severity: 'block'|'warn'`) that validates operator text on upsert. Two
  consequences, both used below: (a) the platform's existing home for tenant identity text is
  **per-agent prompt sections**, not per-org config — S0 must check it before this spec invents a
  second identity store; (b) validating operator-authored strings at write time, not at render time,
  is established house practice (⚠️ A3).

Six carried claims are load-bearing:

1. **The clinic text sits in the tool factories** at `crm-search-tool.ts:37` and
   `crm-insight-tool.ts:53` (proposal). Line 37 / line 53 being near the top suggests a
   module-level description constant or a template literal inside the factory.
2. **A third sibling exists.** `2026-07-02-hub-erp-agent-native-audit` §5 names `crm_query` alongside
   `crm_search` and `crm_insight`, and the knowledge group holds **5** tools. The proposal names two.
   S0 greps all five; a third infected file joins S1's file list (it does not change the design).
3. **`ToolMeta` has a `display` field and `condition` gating** (`tool-meta.ts:26-66`), codegen is
   `pnpm generate:tools` → `_gen/_registry.generated.ts` + `_gen/_groups.generated.ts`, and
   `_gen/_display.generated.ts` may or may not be regenerated by that script —
   `2026-06-11-gog-nuke-execution-plan` flagged exactly this and told the implementer to verify.
   **Verify it again here**; a stale generated display string is a silent DoD failure.
4. **The gate is `memorySync.enabled`** (proposal), almost certainly the meta's `condition`. Where
   `memorySync` lives in the Zod schema is unknown from here (`agents.defaults.memorySearch` sits at
   `zod-schema.agent-runtime.ts:469+`, so a neighbouring block is likely). The new config block
   should live beside it, not in a new file, unless S0 shows otherwise.
5. **Config is `gateway.json` + Zod, read synchronously from memory, mutated via `config.patch`**
   (`2026-06-26-gateway-config-db-migration-plan`, shipped). Therefore this spec needs **no new RPC**
   and **no migration** — an operator sets the profile with the existing `config.patch`, and the
   existing chokidar hot-reload applies it to the next turn's tool build.
6. **`src/config/schema-parity.test.ts` exists** and enforces Zod↔TS-type parity
   (`2026-07-09-agent-tool-scaling-architecture` names it as a file other agents were told not to
   touch). Adding a config block without updating both sides turns it red.

**Base branch.** AGENTS.md says `minion/` is on `DEV`, and `2026-06-11-gog-nuke-execution-plan` /
`2026-07-11-ws-failover-eager-reconnect` corroborate it. Still run `git -C minion branch -r` and
branch off whatever is actually live; do not resurrect a branch to match the docs.

**Test-suite hazard — read before running anything.** `2026-07-11-ws-failover-eager-reconnect` §3.1
states, for this repo: *"**NEVER run the full suite (`pnpm test`) — it crashes the machine.** Gate =
`pnpm vitest run <specific files>` + `pnpm tsgo`."* Every DoD below therefore names specific test
files. Do not substitute a bare `pnpm test`, and do not "just try it once".

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd minion
git branch -r                                                     # settle the base branch (above)

# 1. Every copy of the tenant text, anywhere — the proposal claims two files
rg -n -i 'faces sculptors|facesculptors' src/ extensions/ scripts/ test/
rg -n 'DNI|\+?51|\[9\]\\d\{8\}' src/agents/ --type ts             # locale patterns, all of them
ls src/agents/tools/knowledge/                                    # the 5 knowledge tools  ← claim 2
rg -n -i 'patient|clinic|procedure|botox|relleno' src/agents/tools/  # clinic vocabulary anywhere

# 2. The two named files in full: is the regex decorative or executable?   ← decisive for §5
rg -n -B10 -A40 'Faces Sculptors' src/agents/tools/knowledge/crm-search-tool.ts
rg -n -B10 -A40 'Faces Sculptors' src/agents/tools/knowledge/crm-insight-tool.ts
#    Record for each: (a) is the description a const, a template literal, or built in the factory?
#    (b) does the phone regex appear in an `exec`/`match`/`test` call on the *query*, or only inside
#        the description string? (c) what does the tool actually send to the hub
#        (/api/gateway/insight per the ERP audit) — does the regex shape that payload?

# 3. The second and third copies                                          ← ⚠️ A2
rg -n -i 'faces|patient' src/agents/tools/knowledge/*.meta.ts
ls src/agents/tools/_gen/ && rg -n -i 'faces|patient' src/agents/tools/_gen/
rg -n 'mcpExport' src/agents/tools/knowledge/*.meta.ts             # do external MCP clients see this?
rg -n 'tool-index|search_tools|load_tools' src/agents/ --type ts    # did the JIT layer ship? if so,
                                                                    #   how is its index cached/keyed?
rg -n -A20 'export const meta' src/agents/tools/knowledge/crm-search-tool.meta.ts

# 4. Is an orgId in hand where the tool is constructed?                    ← ⚠️ A1, decisive
rg -n -A30 'createMinionTools' src/agents/pi-tools/pi-tools.ts
rg -n -B5 -A30 'resolveRunEnvironment' src/agents/pi-embedded-runner/run/attempt-env.ts
rg -n 'orgId|organizationId|accountOrgs|resolvedHubUserId' src/agents/pi-tools/pi-tools.ts | head -30

# 5. Where the config block goes                                          ← claims 4, 5, 6
rg -n -B5 -A20 'memorySync' src/config/ src/agents/ --type ts
ls src/config/zod-schema.*.ts src/config/types.*.ts
rg -n -A15 'schema-parity' src/config/schema-parity.test.ts | head -40

# 6. Does an identity store already exist? Do NOT build a second one.
rg -n 'layer.*identity|identity.*layer' src/agents/sections/ --type ts
rg -n -i 'businessName|companyName|orgName|brandName' src/config/ src/agents/ --type ts

# 7. Inbound handoff from the hub sibling spec                            ← ⚠️ A5
rg -n -i 'reserva' src/ extensions/

# 8. Test homes + the one place the golden fixture may live
ls src/agents/tools/knowledge/*.test.ts test/ 2>/dev/null
rg -n 'toMatchInlineSnapshot|toMatchSnapshot' src/agents/tools/ | head
```

Record the actuals — **especially (2b) regex-executable-or-not and (4) orgId-in-hand-or-not** — in
the PR description. Nothing in Slice 0 changes files.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (descriptions become templates; the tenant text leaves the repo)
                 ─▶ S2 (gateway config supplies the profile) ─▶ S3 (other surfaces, safety, guard)
```

Strictly sequential — S1 creates the seam S2 feeds and S3 defends. **S1 alone satisfies two of the
proposal's three DoD clauses** (templated at construction; the grep returns nothing); **S2 delivers
the first** ("business display name, locale patterns and example vocabulary come from org config")
and the mock-org unit test at org granularity; S3 covers the copies S1 cannot reach from the factory
and makes recurrence a red test. If the wave cuts scope, cut after S2 — but then the AGENTS.md
**open-items ledger** rule applies: a `TODO(handoff):` at each remaining surface plus an append to
the source proposal naming which copies still carry non-generic text.

---

### S1 — The description becomes a template; the tenant identity leaves the code

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** `rg -i 'faces sculptors' src/` returns nothing, both tools build their description from a
`CrmProfile` value at construction, and the **built-in default profile is generic**. No config
reading yet — this slice is a pure parameterisation whose value is that its parity test can be
trusted later.

**Do:**
- Create `src/agents/tools/knowledge/crm-profile.ts` — pure, no I/O, no config import. Exports:
  - `type CrmProfile = { businessName?: string; subjectNoun: string; subjectNounPlural: string;
    idLabel?: string; localeId?: string; phonePattern?: RegExp; examples?: string[] }` —
    `subjectNoun` is the word for the record ("customer" generically, "patient" for a clinic);
    `idLabel` is the national-ID noun ("DNI" in Peru, absent generically); `examples` is the
    org's own vocabulary for what it sells.
  - `const DEFAULT_CRM_PROFILE: CrmProfile` — **generic**: no business name, `subjectNoun: 'customer'`,
    no `idLabel`, no `examples`, and no locale or phone pattern.
    A doc-comment states that this is the zero-config shape and that anything tenant-specific belongs
    in config, never here.
  - `const LOCALE_PATTERNS: Record<string, RegExp>` — a small named table; `PE` holds **today's exact
    regex**, `/(?:\+?51)?([9]\d{8})\b/`. This is the one deliberate survivor: a *named country
    preset* is generic platform data usable by any Peruvian org; a *tenant name* is not. Say exactly
    that in the comment, because the distinction is what a reviewer will challenge.
  - `renderCrmSearchDescription(p: CrmProfile): string` and `renderCrmInsightDescription(p: CrmProfile): string` —
    pure functions, the **only** places either description string is assembled. Every optional field
    must degrade to a clean sentence when absent: no dangling "at ", no empty parentheses, no
    "undefined". That is a test, not a hope.
- Rewrite both factories (and any third tool S0 found) to accept an optional `profile: CrmProfile`
  argument defaulting to `DEFAULT_CRM_PROFILE`, and to call the renderer. Delete every inline string.
- **Behavior stays put.** If S0 (2b) showed the regex is executed against the query, the matcher now
  reads `profile.phonePattern ?? LEGACY_DEFAULT_PHONE_PATTERN`, where the legacy constant is the
  exact PE pattern and is not part of the rendered default profile. This preserves zero-config query
  behavior without putting Peruvian locale text back into the generic description. Do **not**
  change the matcher, the payload, or the hub endpoint in this slice or any other (proposal §Out of
  scope). Compile the pattern **once per tool construction**, never per row or per match.
- De-FACE the `.meta.ts` `display` description to a generic one-liner; run `pnpm generate:tools`;
  **verify `_gen/_display.generated.ts` actually regenerated** (claim 3). If the script does not
  write it, fix the generator in S1 and regenerate; generated output is never hand-edited.
- **The parity fixture lives outside `src/agents/tools/`.** The proposal's DoD grep is written
  without exclusions, so the pre-change FACES description — which we must keep, as the only proof
  that a configured profile reproduces today's text byte-for-byte — goes in
  `test/fixtures/crm-tool-descriptions.faces.txt` with the parity test beside it. This is a
  deliberate placement, not an accident: it lets the DoD grep be run literally, as written, forever.
- `TODO(handoff): profile is the built-in default here — S2 of 2026-08-17-gw-defaces-crm-tools-spec
  reads it from gateway config` at each factory call site; S2 removes them all.

**Files:** `src/agents/tools/knowledge/crm-profile.ts` (new),
`src/agents/tools/knowledge/crm-search-tool.ts`, `src/agents/tools/knowledge/crm-insight-tool.ts`,
their `.meta.ts` siblings, any third infected knowledge tool from S0,
`src/agents/tools/_gen/*` (regenerated), `src/agents/tools/knowledge/crm-profile.test.ts` (new),
`test/fixtures/crm-tool-descriptions.faces.txt` (new), `test/crm-tool-descriptions.test.ts` (new;
exact path per S0's test-layout finding).

**Definition of done (machine-checkable):**
```bash
pnpm vitest run src/agents/tools/knowledge/crm-profile.test.ts test/crm-tool-descriptions.test.ts
#   red-state first (G3): each case shown failing before the fix lands
#   - GENERIC DEFAULT: renderCrmSearchDescription(DEFAULT_CRM_PROFILE) and the insight twin contain
#     none of /faces|sculptor|patient|clinic|DNI/i  ← the proposal's "zero clinic-specific text"
#   - PARITY: rendering the FACES profile literal (defined in the test file, not in src/) is
#     byte-equal to test/fixtures/crm-tool-descriptions.faces.txt, captured from the PRE-change code
#   - DEGRADATION: a profile with only { subjectNoun, subjectNounPlural } renders with no 'undefined',
#     no empty '()' and no double space (assert with /undefined|\(\s*\)|\s{2}/ over the output)
#   - the built tool object's `description` is the renderer's output (assert on the constructed tool,
#     not on the renderer alone — this is what proves "templated at construction")
#   - if S0 (2b) found the regex executable: a query '+51987654321' resolves identically before and
#     after (table test against the pre-change behavior)
pnpm tsgo                                        # clean vs the recorded baseline; no new errors
pnpm check                                       # oxlint + oxfmt clean
rg -n -i 'faces sculptors' src/                  # → ZERO hits, no exclusions  ← the proposal's DoD grep
rg -n -i 'faces sculptors' src/agents/tools/     # → zero; generic noun examples may remain in tests/comments
git diff --name-only <base>...HEAD | grep -E '_gen/' # → present: codegen ran (or a PR note says why not)
```

---

### S2 — Gateway config supplies the profile

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** the proposal's headline. An org's own name, locale and vocabulary reach its agents' tool
descriptions, resolved **synchronously** from the in-memory config mirror at tool-construction time,
with one validation boundary and a default that leaves a zero-config gateway exactly as S1 left it.
**No migration, no new RPC** — `config.patch` + the existing hot-reload already carry it.

**Do:**
- Add the config block to the Zod schema **and** the mirrored TS type (both sides, or
  `schema-parity.test.ts` goes red), beside `memorySync` per S0 (5):
  ```ts
  // gateway.json → crm.profiles — absent ⇒ DEFAULT_CRM_PROFILE (S1 behavior, unchanged)
  crm?: {
    defaultProfile?: CrmProfileConfig            // this gateway's org, when it serves one
    profiles?: Record<string /* orgId */, CrmProfileConfig>   // per-org override, multi-tenant
  }
  // CrmProfileConfig = { businessName?: string; subjectNoun?: string; subjectNounPlural?: string;
  //                      idLabel?: string; locale?: keyof typeof LOCALE_PATTERNS; examples?: string[] }
  ```
  Caps enforced in the schema, not downstream: `businessName` ≤ 80 chars, nouns ≤ 40, `idLabel` ≤ 16,
  `examples` ≤ 12 entries × ≤ 60 chars. `locale` is an enum of the shipped
  `LOCALE_PATTERNS` keys. There is no operator-supplied raw-regex escape hatch: the proposal requires
  locale patterns, and accepting arbitrary regex would add an avoidable ReDoS surface (⚠️ A3).
- Add `resolveCrmProfile(cfg, orgId?): CrmProfile` in the **config/resolution layer** — not inside
  `crm-profile.ts`, which stays pure and config-free. Precedence: `crm.profiles[orgId]` →
  `crm.defaultProfile` → `DEFAULT_CRM_PROFILE`. Resolution is a **field-wise merge** in that order
  (org fields override default-profile fields, which override generic defaults), so a sparse org
  override does not discard the gateway defaults. It is the single place that normalises
  (trim, drop empties, dedupe examples, preserve order) and resolves `locale` → `RegExp`.
  - **Fails soft, always.** A malformed block that somehow reaches runtime (hand-edited json,
    hot-reload race) logs once at `warn` and returns `DEFAULT_CRM_PROFILE`. It must **never throw**:
    this runs on the per-turn tool-build path, and a throw there breaks every turn on the gateway —
    strictly worse than the wrong noun this spec exists to delete.
  - **Synchronous only.** No `await`, no hub call, no DB read — the ★ constraint from
    `2026-06-26-gateway-config-db-migration-plan`. If the business name is only available from the
    hub, that is a *different, larger* spec (§5), not an async read smuggled onto the hot path.
- Wire it into `createMinionTools` (or whichever construction point S0 (4) identified) using the
  orgId already in hand. **If no orgId is in hand** (⚠️ A1): use `crm.defaultProfile` only, leave a
  `TODO(handoff):` at the call site naming the missing thread, and append it to the source proposal.
  Do not invent an org lookup to close the gap in this slice.
- Remove S1's `TODO(handoff):` markers that this slice actually resolves.

**Files:** `src/config/zod-schema.*.ts` + `src/config/types.*.ts` (the pair S0 named),
`src/config/schema-parity.test.ts`, the config resolver module (path from S0),
`src/agents/pi-tools/pi-tools.ts`, both/all CRM tool factories, plus the config + tool test files.

**Definition of done (machine-checkable):**
```bash
pnpm vitest run src/config/schema-parity.test.ts src/config/<config>.test.ts \
                src/agents/tools/knowledge/crm-profile.test.ts test/crm-tool-descriptions.test.ts
#   - MOCK ORG: profile { businessName: 'Northwind Retail', subjectNoun: 'customer',
#     examples: ['annual maintenance plan'] } → the built tool description contains 'Northwind Retail'
#     and matches NONE of /faces|sculptor|patient|clinic|DNI/i
#     ← the proposal's "a non-FACES mock org yields descriptions with zero clinic-specific text"
#   - FACES ORG: the profile that reproduces test/fixtures/crm-tool-descriptions.faces.txt is
#     byte-equal to it   ← zero-regression proof for the org that has the text today
#   - NO CONFIG: absent `crm` block → identical output to S1's default (assert against the S1 test)
#   - PRECEDENCE: profiles[orgId] beats defaultProfile beats DEFAULT_CRM_PROFILE (3 explicit cases)
#   - locale: 'PE' → phonePattern === LOCALE_PATTERNS.PE; locale: 'XX' → REJECTED by the schema
#   - an unknown locale injected past the schema → default profile + one warning, never a throw
#   - a malformed block injected past the schema → resolveCrmProfile returns the default, logs warn,
#     does NOT throw (assert with expect(...).not.toThrow())
#   - resolveCrmProfile is synchronous: a compile-time assertion assigns its result to `CrmProfile`
pnpm tsgo && pnpm check
git diff --name-only <base>...HEAD | grep -E 'supabase/migrations|drizzle' && echo "FAIL: no DDL" && exit 1
rg -n -i 'faces sculptors' src/                  # → still zero
```

---

### S3 — The other copies, locale safety, and the anti-recurrence guard

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** every surface that republishes a tool description carries generic text; config cannot
introduce an arbitrary regex; and a fourth tenant hardcode cannot land without a red test.

**Do:**
- **Sweep the republishers found in S0 (3).** For each of `_gen/_display.generated.ts` (or whatever
  the codegen writes), the `tools.status` RPC payload, the MCP `tools/list` export, and the JIT
  `tool-index.ts` embedding text: confirm it now carries the generic meta description. Where a
  surface is **shared across orgs** (the tool index is a lazy singleton per
  `2026-07-09-agent-tool-scaling-architecture` §2), it must index the **generic** text, not a
  per-org rendering — otherwise the first org to warm the cache poisons every other org's tool
  selection. State the resolution explicitly in the PR: either the index keys per profile, or it
  deliberately indexes the generic description. Do not leave this undecided.
  If `_display.generated.ts` turns out not to be regenerated by `pnpm generate:tools` (claim 3),
  fix the script here and regenerate it; do not defer a generator defect while claiming codegen clean.
- **Locale safety (⚠️ A3).** Resolve only enum-validated, code-owned locale presets and reuse the
  selected `RegExp` for the tool's lifetime; never build one inside a matching loop. Tests prove every
  configured locale maps to its named preset and that no config field accepts an arbitrary pattern.
- **Anti-recurrence guard.** A test that reads the source of `src/agents/tools/**` (excluding
  `_gen/`, which is generated, the test files, and the named legacy locale-preset declaration) and
  fails on the exact pre-change tenant identifiers and clinic procedure literals recorded by S0.
  It must include `/faces\s*sculptors/i`; do not ban generic words such as `patient` or `DNI`, which
  are valid configured vocabulary and would make the source-scanning test fail on its own fixtures
  or documentation. Failure message points at `crm-profile.ts` and this spec id. The proposal's grep
  is a one-time check; this makes the tenant-specific portion permanent and avoids false positives.
- **`crm_query` and any third tool** (⚠️ A5, claim 2): if S0 found the same class of text there,
  it is covered by the same renderer here. If S0 found a `%reserva%`-style deposit keyword in these
  tools (the inbound handoff from `2026-08-17-hub-reserva-keyword-config-spec` §4 ⚠️ A2), **do not
  fix it here** — it is a different rule with a hub-side owner. Append the exact path and line to
  `proposals/2026-08-17-gw-defaces-crm-tools.md` and say in the PR that you did.
- **Operator documentation.** One short block in the gateway's own config reference (path from S0;
  if the gateway has none in-repo, this is a `Minion Docs/` item — file it, do not skip it silently)
  showing a filled `crm.profiles` example and stating that a gateway without one gets generic
  descriptions.

**Files:** `src/agents/tools/_gen/*` (regenerated), the MCP export / `tools.status` path and the JIT
`tool-index.ts` if S0 shows they exist, `scripts/generate-tool-registry.ts` (only if claim 3 proves
the script is incomplete), `src/agents/tools/knowledge/crm-profile.test.ts` (guard + locale validation),
the config resolver, `proposals/2026-08-17-gw-defaces-crm-tools.md` (handoff appends, meta-repo).

**Definition of done (machine-checkable):**
```bash
pnpm generate:tools && git diff --exit-code src/agents/tools/_gen/   # → clean: codegen is committed
pnpm vitest run src/agents/tools/knowledge/crm-profile.test.ts test/crm-tool-descriptions.test.ts \
                src/agents/tool-governance/               # + the MCP/tool-index tests S0 named
#   - guard test: adding `const X = 'Faces Sculptors patient CRM'` to crm-search-tool.ts makes the
#     suite fail (verify by doing it once locally, then reverting — state in the PR that you did)
#   - the tool-index / MCP text for crm_search matches none of /faces|sculptor|patient|clinic|DNI/i
#   - every accepted locale resolves to a code-owned preset; arbitrary regex config is rejected
pnpm tsgo && pnpm check
rg -n -i 'faces sculptors' src/ extensions/ scripts/ test/ \
   --glob '!test/fixtures/crm-tool-descriptions.faces.txt'
#   → zero. The single exclusion is the parity fixture, which lives OUTSIDE src/agents/tools/ so the
#     proposal's own grep ("src/agents/tools returns nothing") passes with no exclusion at all.
rg -n 'TODO\(handoff\)' src/agents/tools/ src/config/    # → only genuinely deferred items (⚠️ A1),
                                                          #   each with a matching proposal entry
```

---

## 3. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `src/agents/tools/knowledge/crm-profile.ts` | S1, S3 | **new** — `CrmProfile`, generic `DEFAULT_CRM_PROFILE`, `LOCALE_PATTERNS` (the only surviving Peru regex, named), the two `render*Description` functions. Pure; no config, no I/O |
| `src/agents/tools/knowledge/crm-search-tool.ts` | S1, S2 | inline description + regex → renderer + `profile.phonePattern`; profile injected at construction |
| `src/agents/tools/knowledge/crm-insight-tool.ts` | S1, S2 | same |
| third knowledge tool (`crm-query-tool.ts`?, path from S0) | S1, S2 | same, **only if** S0 finds the same text |
| `src/agents/tools/knowledge/*.meta.ts` | S1 | `display` description → generic one-liner |
| `src/agents/tools/_gen/*` | S1, S3 | regenerated by `pnpm generate:tools`; never hand-edited |
| `src/config/zod-schema.*.ts` + `src/config/types.*.ts` | S2 | the `crm.defaultProfile` / `crm.profiles` block, both sides |
| `src/config/schema-parity.test.ts` | S2 | parity for the new block |
| config resolver module (path from S0) | S2, S3 | `resolveCrmProfile(cfg, orgId?)` — sync, fail-soft, compile-once |
| `src/agents/pi-tools/pi-tools.ts` | S2 | pass the resolved profile into the CRM tool factories |
| MCP export / `tools.status` / `tool-index.ts` | S3 | verify generic text; decide and record the shared-cache resolution |
| `scripts/generate-tool-registry.ts` | S3 | **only if** `_display.generated.ts` is proven unwritten |
| `src/agents/tools/knowledge/crm-profile.test.ts` | S1, S2, S3 | rendering, degradation, precedence, fail-soft, locale validation, guard |
| `test/fixtures/crm-tool-descriptions.faces.txt` + `test/crm-tool-descriptions.test.ts` | S1, S2 | the pre-change golden text and the parity test — **outside** `src/agents/tools/` on purpose |
| `proposals/2026-08-17-gw-defaces-crm-tools.md` (meta-repo) | S2, S3 | handoff appends (A1 orgId gap, A5 findings) |

All `src/`, `test/` and `scripts/` paths are relative to `minion/`. **No `.svelte` file is edited in
any slice** — see §5. **Zero DDL and zero new RPC**: the config already has a transport
(`config.patch` + chokidar hot-reload, `2026-06-26-gateway-config-db-migration-plan`).

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". Four zones could plausibly apply — **gateway
protocol**, **agent definition format**, **shared packages**, **DB schema** — and only the first
carries a real (non-blocking) alert.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `@minion-stack/shared` / gateway WS frames | **None.** No frame type, no protocol field. Verified in this checkout: `grep -rniI 'ToolStatusEntry\|tools\.status\|memorySync\|crm_search\|crm_insight' packages langgraph-server ops scripts` → **zero hits** | re-run that grep at PR time; if S0 finds a typed config mirror in `packages/`, it joins S2's file list and needs a changeset |
| `minion_hub` `/config` editor + `/capabilities` | **Conditional compatibility impact.** A new optional `crm` block is additive only if the hub passes through unknown gateway config keys | S0 records whether the hub validates or reconstructs gateway config. If it would reject/drop `crm`, update its typed mirror in this work (and add `minion_hub` to `repos`) or stop and re-spec; a required transport fix is not a follow-up |
| External **MCP clients** (`tools/list`) | **Visible behavior change** if these tools are `mcpExport` — third-party clients see a different description string. This is the fix working as intended, and it *removes* a tenant-name disclosure | S0 (3) records `mcpExport`; state the before/after strings in the PR |
| `minion_hub` `/api/gateway/insight` | **None.** The request payload and endpoint are untouched — the proposal's own out-of-scope | assert in S1's DoD: no diff in the request-building code path |
| `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins` | **None** — no shared type, no protocol, no DB | — |
| Shared DB / `@minion-stack/db` | **None** — zero DDL, zero schema edit, no changeset | `git diff --name-only <base>...HEAD \| grep -E 'supabase/migrations\|drizzle'` → empty (in S2's DoD) |
| `Minion Docs/` | **Possible doc drift** — if any doc quotes the current tool description, it now names a tool text that no longer exists | S3's documentation bullet; `rg -ri 'faces sculptors' "Minion Docs/"` at PR time, and file a docs item rather than editing another repo from this PR |

### ⚠️ A1 — is an orgId in hand at tool-construction time? Do not guess, and do not fetch

The proposal says "org config", but the gateway "has **NO** hub-role knowledge; only
`resolvedHubUserId`" (`2026-07-09-agent-tool-scaling-architecture` §1), while `accountOrgs` /
`org-enforcement.ts` prove the gateway *does* map channel accounts → orgs somewhere. Two outcomes,
both acceptable, one forbidden:

- **orgId reachable at construction** ⇒ `crm.profiles[orgId]` works as designed; a multi-org gateway
  gives each org its own description. This is the target.
- **orgId not reachable** ⇒ ship `crm.defaultProfile` only (one profile per gateway instance — which
  matches how instances are actually pinned today: `minion-2 → FACES SCULPTORS` per
  `2026-07-19-build-channel-dev-prd-pipeline`), file the `TODO(handoff):` and the proposal append.
  The proposal's DoD is still met: the text comes from config and a mock org renders clean.
- **Forbidden:** an `await` on a hub REST call inside the per-turn tool build to discover the org.
  That violates the ★ architecture constraint of `2026-06-26-gateway-config-db-migration-plan`
  (no async read on the per-message path), and it makes every turn depend on hub availability for a
  string. If someone argues for it in review, the answer is a follow-up spec that hydrates an
  in-memory org mirror — the same pattern that spec already built for channels.

### ⚠️ A2 — the description has more than one home

The factory string is the copy the model reads, but not the only copy: `ToolMeta.display` is compiled
into `src/agents/tools/_gen/*` (inside the proposal's grep path), `tools.status` republishes it to
the hub, MCP `tools/list` republishes it to third parties, and the JIT `tool-index.ts` embeds
`"<id>. <title>. <description>. groups: …"` into a **lazily-built singleton** vector index. The
singleton is the sharp edge: a per-org rendering written into a process-wide index means org B's tool
selection is scored against org A's text. S3 resolves it explicitly (index the generic text, or key
the index per profile) rather than leaving it to whoever warms the cache first. If S0 shows the JIT
layer never shipped (`2026-07-09-agent-tool-scaling-architecture` is `status: unknown`), drop that
bullet and say so — do not defend against a layer that does not exist.

### ⚠️ A3 — locale patterns run on the hot path

`locale` selects a code-owned `RegExp`; config never supplies regex source. Unknown locales are
rejected at the Zod boundary, while a malformed value injected past validation makes
`resolveCrmProfile` warn once and return the default. The selected preset is resolved once and reused
for the tool lifetime. This keeps the render path unbreakable without introducing operator-controlled
regular-expression execution.

### ⚠️ A4 — tool text sits in the prompt's cached prefix

Tool definitions are assembled per turn and sit near the front of the prompt, which is the region
prompt caching keys on. Within one org the profile is constant, so its cache behaves exactly as
today. The consideration is a gateway that serves **several orgs** with per-org descriptions: the
cached prefix then differs per org, which is correct but may reduce cross-session cache reuse and
shift latency/cost. I am not certain how the gateway currently segments its cache — the
`prompt-sections` protocol's per-section `cacheable` flag (§1) shows the platform models this
explicitly, so the mechanism exists to inspect. **Measure, do not assume:** S3 records turn latency
and any cache-hit metric the gateway already emits, before and after, for a two-org gateway, and
pastes both in the PR. If a regression shows up, it is a finding for a follow-up — not a reason to
keep shipping one org's name to every other org.

### ⚠️ A5 — the sibling CRM tools, and the inbound handoff from the hub spec

`2026-07-02-hub-erp-agent-native-audit` §5 names **three** CRM tools (`crm_insight`, `crm_query`,
`crm_search`); the proposal names two. And `2026-08-17-hub-reserva-keyword-config-spec` §4 ⚠️ A2
instructs its implementer to route any gateway-side `%reserva%` hardcode **to this proposal** rather
than fixing it hub-side. So S0's greps (1) and (7) can legitimately grow this spec's file list. Rule:
**same class of text** (tenant name, locale pattern, tenant vocabulary in a description) ⇒ it is
covered by the renderer here, in the same slices. **Different rule** (a deposit-keyword predicate, a
funnel stage, anything that changes what a query returns) ⇒ append it to
`proposals/2026-08-17-gw-defaces-crm-tools.md` and leave it alone; two repos silently disagreeing
about what a deposit is would be worse than today's single wrong answer.

## 5. Out of scope (explicit)

- **Changing tool behavior or queries** — the proposal's own exclusion. The hub endpoint, the request
  payload, the matcher algorithm and the result shape are untouched. Parameterising *where the phone
  pattern comes from* is in scope (the DoD names locale patterns); changing *how phone matching
  works* — libphonenumber, multi-locale fallback, fuzzy matching — is not.
- **Flipping the executable matcher default away from Peru.** `LEGACY_DEFAULT_PHONE_PATTERN` stays
  `LOCALE_PATTERNS.PE` if S0 proves the regex affects query behavior, so a zero-config gateway behaves
  exactly as today. It is not rendered as part of `DEFAULT_CRM_PROFILE`. Stated plainly as a
  residual: a non-Peruvian org that never configures a profile still gets Peruvian *phone matching*,
  though it no longer gets clinic *text*. Changing the default changes behavior for every existing
  org, so it needs its own proposal — and S3 leaves a `TODO(handoff):` at the default naming it.
- **The `memorySync.enabled` gate.** These tools are exposed to any gateway with memory sync on,
  including orgs with no CRM data at all. That is a real defect and the proposal's problem statement
  names it — but narrowing tool availability is a behavior change, out of the proposal's DoD, and it
  deserves its own proposal with data on who currently gets the tool. This spec makes the
  description honest for those orgs; it does not remove the tool from them.
- **A hub-side org-config UI** for the profile — the proposal's own exclusion. Configuration is
  `config.patch` / `gateway.json` only. **No `.svelte` file is edited in any slice**, so the `ui`
  tag and its governance gates (`lint:design` / `lint:tokens`, the ui-design-governance skill) do
  **not** apply to this spec, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b. Because this is an
  explicit exclusion rather than a half-built surface, it creates no implementation handoff item.
- **Sourcing the business name from the hub** (org record, `/api/gateway/*`). Forbidden on the
  per-turn path (⚠️ A1); the right version is an in-memory org mirror hydrated over the data plane,
  which is a separate spec following the channels template.
- **Unifying this with the per-agent prompt-sections `identity` layer.** Two operator-authored
  identity surfaces will exist after this spec (prompt sections per agent, CRM profile per org).
  Consolidating them is a design question, not a bug fix — record it in the PR as a candidate
  proposal if S0 (6) shows the overlap is real.
- **The other single-tenant hardcodes elsewhere in the gateway** (channel labels, seeded agent
  prompts, extension defaults). Same debt class, separate proposals. Do not opportunistically widen
  the diff; `pi-tools.ts` and the config schema are contended files and a wide diff guarantees a
  painful rebase.
- **Schema/DDL changes and new RPCs.** None in any slice. If one appears necessary, stop and re-spec.
- **Running the gateway's full test suite.** `pnpm test` crashes the machine (§1); it is not a gate
  here and must not be added to one.

## 6. End-to-end verification

Run with all three slices merged, on the live `minion` base branch confirmed in Slice 0.

```bash
cd minion

# 1. Gates (logic/test-tagged: no design/token lint — see §5). NEVER `pnpm test` (§1).
pnpm tsgo                                        # clean vs the baseline recorded in S0
pnpm check                                       # oxlint + oxfmt clean
pnpm vitest run src/agents/tools/knowledge/ src/config/schema-parity.test.ts test/crm-tool-descriptions.test.ts
pnpm generate:tools && git diff --exit-code src/agents/tools/_gen/   # codegen committed and current
git diff --name-only <base>...HEAD | grep -E '\.svelte$'                  && echo "FAIL: UI out of scope" && exit 1
git diff --name-only <base>...HEAD | grep -E 'supabase/migrations|drizzle' && echo "FAIL: no DDL"        && exit 1

# 2. The proposal's DoD, literally
rg -n -i 'faces sculptors' src/agents/tools/     # → ZERO hits, no exclusions   ← DoD clause 3
rg -n 'renderCrmSearchDescription|renderCrmInsightDescription' src/agents/tools/knowledge/*-tool.ts
                                                 # → both factories template at construction  ← clause 1

# 3. Config actually drives the text, on a running gateway (dev instance, never production)
#    a. zero-config baseline — the generic description
minion gateway rpc tools.status | jq '.tools[] | select(.name=="crm_search") | .description'
#       → contains none of: Faces, Sculptors, patient, clinic, DNI
#    b. patch a mock non-FACES org profile through the EXISTING config RPC (no new surface)
minion gateway rpc config.patch --data '{"crm":{"defaultProfile":{
  "businessName":"Northwind Retail","subjectNoun":"customer","subjectNounPlural":"customers",
  "locale":"PE","examples":["annual maintenance plan","extended warranty"]}}}'
#    c. hot-reload applies on the next turn (chokidar; no restart) — re-read:
minion gateway rpc tools.status | jq '.tools[] | select(.name=="crm_search") | .description'
#       → contains 'Northwind Retail' and 'annual maintenance plan'; still zero clinic text
#    d. send one real turn to an agent on that gateway that should trigger a CRM lookup, and confirm
#       from the tool-event log that crm_search was called with a sane argument. The point is that a
#       de-FACED description does not stop the model from using the tool.
#    e. restore the FACES profile on the FACES-facing instance and diff its rendered description
#       against test/fixtures/crm-tool-descriptions.faces.txt → byte-equal  ← zero-regression proof
#    f. patch a deliberately broken profile ({"locale":"XX"}) → config.patch REJECTS it and the
#       running gateway keeps serving the previous profile (assert both).

# 4. Republisher sweep (⚠️ A2) — every surface that shows a description
minion gateway rpc tools.status | jq -r '.tools[].description' | rg -i 'faces|sculptor|patient|clinic|DNI'  # → empty
#    + the MCP tools/list output if mcpExport is true, and the tool-index text if the JIT layer shipped

# 5. Sibling / handoff greps (⚠️ A5) — paste the results in the PR either way
rg -n -i 'reserva' src/ extensions/
rg -ri 'faces sculptors' "../Minion Docs/" ../packages ../langgraph-server ../ops ../scripts

# 6. Cache/latency note (⚠️ A4)
#    On a two-org gateway, record turn latency and any cache-hit metric already emitted, before and
#    after. Paste both. A regression is a finding for a follow-up, not a blocker for this spec.
```

**Ship gate:** §6 all green; the proposal's DoD checked clause by clause (config-sourced name /
locale / examples — step 3b-c; templated at construction — step 2; mock org yields zero clinic text —
step 3c plus the S2 unit test; grep clean — step 2); S0's two decisive findings (regex
executable-or-not, orgId in hand-or-not) pasted into the PR with the A1 branch that was taken; the
A2 shared-index resolution stated explicitly; the A5 grep results pasted and any non-description
finding appended to the source proposal; and Slice 0's recorded actuals reconciled against §3, with
any correction committed to this spec in the same PR.
