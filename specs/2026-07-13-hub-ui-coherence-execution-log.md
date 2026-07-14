# Minion Hub UI Coherence — Execution Log

**Date:** 2026-07-13

**Status:** Source implementation certified; authenticated capture, Figma transfer, and publication pending
**Governing documents:**

- [UI coherence audit](./2026-07-13-hub-ui-coherence-audit.md)
- [Design manifesto](./2026-07-13-hub-design-manifesto.md)
- [Implementation spec](./2026-07-13-hub-ui-coherence-implementation-spec.md)
- [Figma screen coverage ledger](./2026-07-13-hub-figma-screen-coverage-ledger.md)

This log distinguishes implemented work, verified work, and remaining gates. A file or harness existing is not treated as evidence that its runtime matrix passed.

## Isolated delivery branches

| Scope | Branch/worktree | Current checkpoint |
|---|---|---|
| Shared packages and DB | `feat/ui-coherence-packages` / `MINION-worktrees/ui-coherence-packages` | Commits `bd44656`, `732e3ed`; meta-repo local `dev` safely fast-forwarded to `732e3ed`; token generation/schema/contrast suite (six tests) and UI test/build/typecheck (seven tests, 0 diagnostics) revalidated from local `dev` |
| Hub consolidated program | `feat/ui-coherence-program` / `minion_hub/.worktrees/ui-coherence-program` | Commit `ff9d47f4`; correctness, composition, package-consumer, behavioral-integrity, executable route/API/runtime/wave contracts, six-viewport and representative-theme capture contracts, expanded token ratchet, and Wave A first-tranche gates green |
| Hub dev integration | local `dev` (program history retained on `feat/ui-coherence-dev-integration`) | Current local authority `5028464c`; the certified program checkpoint `b3b168fe` plus the first authenticated feedback-loop repair for Home theme coherence and the trailing Notes rail are integrated. Source check/test/build, design/token, static contracts, and targeted authenticated browser geometry are green |
| Hub foundations and high-risk layouts | `feat/ui-coherence-foundations` / `minion_hub/.worktrees/ui-coherence-foundations` | Commit `ecc10da`; composition gates green |
| Hub Phase 5 Wave A | `feat/ui-coherence-wave-a` / `minion_hub/.worktrees/ui-coherence-wave-a` | First tranche `73ea4791`, merged as `f8b23dd0`; all 43 named core-platform files pass gates |
| Hub Phase 5 Wave A residual | `feat/ui-coherence-wave-a-residual` / `minion_hub/.worktrees/ui-coherence-wave-a-residual` | Complete at `559ad6cc`; all ten remaining Account/organization/platform screens merged into dev integration as `fbae2395` |
| Hub Phase 5 Wave B | `feat/ui-coherence-wave-b` / `minion_hub/.worktrees/ui-coherence-wave-b` | Complete at `1d581ae1`; full business-operations scope merged into dev integration as `4cafafd1` |
| Hub Phase 5 Wave C | `feat/ui-coherence-wave-c` / `minion_hub/.worktrees/ui-coherence-wave-c` | Complete at `2c7f77bd`; all agent-creation/development screens merged into dev integration as `5f8a1085` |
| Hub Phase 5 Wave D | `feat/ui-coherence-wave-d` / `minion_hub/.worktrees/ui-coherence-wave-d` | Complete at `07e581eb`; all immersive/Home/Marketplace surfaces merged into dev integration as `189fe89d` |
| Hub current-origin Cloud addendum | `feat/ui-coherence-wave-d-cloud` / `minion_hub/.worktrees/ui-coherence-wave-d-cloud` | Complete at `3a91accb`; exactly four Cloud screens and their local components merged into dev integration as `20f130d6` |
| Hub Phase 5 Wave E | `feat/ui-coherence-wave-e` / `minion_hub/.worktrees/ui-coherence-wave-e` | Complete at `53228463`; all ten public/auth/onboarding/booking screens merged into dev integration as `c3afd3b1` |
| Hub route-policy authority | `feat/ui-coherence-policy-authority` / `minion_hub/.worktrees/ui-coherence-policy-authority` | Complete at `8b90916f`; shared server/client/nav/palette authority merged into dev integration as `8d5becd8` |
| Hub capture certification | `feat/ui-coherence-capture-certification` / `minion_hub/.worktrees/ui-coherence-capture-certification` | Complete at `704d82d0`; state/persona/responsive/accessibility runner merged into dev integration as `b6e8e522` |
| Hub token integrity | `feat/ui-coherence-token-integrity` / `minion_hub/.worktrees/ui-coherence-token-integrity` | Complete at `e7be3157`; all known undeclared aliases plus repository scanner merged into dev integration as `10ad8dbe` |
| Hub primitive consolidation | `feat/ui-coherence-primitive-consolidation` / `minion_hub/.worktrees/ui-coherence-primitive-consolidation` | Complete at `f1496529`; shared adapters and canonical Dialog compatibility merged into dev integration as `03df36a1` |
| Hub component debt tranche 1 | `feat/ui-coherence-design-debt-components` / `minion_hub/.worktrees/ui-coherence-design-debt-components` | Complete at `306b03e1`; 417 findings removed across 28 DataTable/Users/Brains/Channels/Config/Provision files and merged as `f0167f28` |
| Hub route debt tranche | `feat/ui-coherence-design-debt-routes` / `minion_hub/.worktrees/ui-coherence-design-debt-routes` | Complete at `d228b621`; all 1,275 governed route findings removed across 64 files and merged as `cfafb1f0` |
| Hub My Agent debt tranche | `feat/ui-coherence-design-debt-components-remaining` / `minion_hub/.worktrees/ui-coherence-design-debt-components-remaining` | Complete at `0dc88be9`; all 844 governed My Agent findings removed across 24 files and merged as `512229da` |
| Site consumer | `feat/ui-coherence-consumer` / `minion_site/.worktrees/ui-coherence-consumer` | Commit `613cb69`; local Site `dev` fast-forwarded without conflicts; frozen Bun install, Svelte check (0 diagnostics), and Node 22 Vercel-adapter build revalidated in the local checkout |

The user's original dirty Hub state was archived before reconciliation, its genuine Cloud/session/chat and PostgreSQL/host/token behavior was preserved in committed form, and local Hub `dev` was advanced without discarding that behavior. The meta-repo's unrelated dirty files remain untouched.

## Post-certification feedback loop 1 — Home theme and Notes rail

The first review session used the authenticated local 5173 Hub as the feedback surface. It exposed two coupled coherence failures: Ayu Light updated legacy `--color-*` aliases while migrated semantic surfaces remained on New York dark, and the Notes & Todos rail rendered immediately after the left navigation instead of at the workspace's trailing edge.

- Isolated branch `fix/home-theme-notes-right` committed the repair as `c7997357`; local Hub `dev` merged it without conflict as `5028464c`.
- Runtime theme selection now activates the shared `data-minion-theme` semantic preset and removes stale inline legacy palette/style overrides. Preset previews, contrast checks, all 16 themes, and all ten accent choices derive from `@minion-stack/design-tokens/contract.json` rather than a duplicated local palette.
- `PageShell` now owns an explicit `direction="row"` composition contract. Home uses it to place Notes after the chat column at the right edge. Below 768px, open Notes becomes a 320px right overlay while the Home column retains full width; collapsed Notes shrinks both the visible rail and its pointer hitbox to 46px and removes the overlay shadow.
- Authenticated browser evidence for Ayu Light recorded a desktop 910px Home column followed by a 46px Notes rail at the 1180px viewport edge. Inactive navigation hover resolved to `rgb(243, 244, 245)`, not a dark surface. At 375px, open Notes occupied x=55–375 over a full-width 375px Home column; collapsed Notes occupied only x=329–375. Browser console errors were zero in all three proofs.
- Final source evidence at `5028464c`: 257 files/1,946 tests green, `svelte-check` 0 errors/0 warnings, production Vite/Vercel-adapter build green, changed-file design debt zero, token-integrity violations zero, and independent review with no merge blockers. The live main 5173 process also resolved Ayu Light semantic and legacy canvas/border roles to identical computed values after the merge.

## Completed and independently verified

### Shared package release candidate

- `@minion-stack/design-tokens`: generated `contract.json` authority, 16 Hub themes, ten accent/on-accent pairs, semantic status triples, typography, spacing, radii, controls, shadows, motion, layers, layout, compatibility aliases, documentation, and generated CSS.
- `@minion-stack/ui`: accessible, token-driven Button, IconButton, Badge, Card, FormField, Input, Textarea, Select, Checkbox, Radio, Toggle, Spinner, and Skeleton exports.
- `@minion-stack/db`: nullable `built_agents.runtime_agent_id`, no foreign key, and partial index for deployed drafts.
- Additive Changesets are present for the three packages.

Recorded gates:

- Design tokens: 6/6 tests green; generated CSS check and build green.
- Shared UI: 7/7 tests green; Svelte check 0 errors/0 warnings; build green.
- Shared DB: 12/12 tests green; typecheck and build green.
- Meta-repo `build-all`, `typecheck-all`, and `test-all` were green before the package checkpoint; lint reported only pre-existing warnings.
- Three canonical migrations that existed in Hub history but were absent from the shared package were reconciled in commit `732e3ed`; the shared migration integrity suite remains green.

The packages are implementation-ready but not published. Publication, remote pushes, and release PRs are external mutations and remain outside this local implementation checkpoint.

### Route/Figma coverage authority

- Immutable pre-program baseline: 142 endpoints, 135 screens, and seven redirects at its recorded source commit.
- Current dev-integration inventory after the Cloud workstation merge: 146 endpoints.
- Current renderable screens at `b3b168fe`: 136 (126 authenticated app, ten public/auth).
- Current redirect/proxy endpoints: ten, each with an explicit contract. Legacy `/terminal` redirects to `/cloud/terminal` while preserving query state; `/shells` and `/shells/[shellId]` are unconditional 307 legacy redirects to `/cloud` and `/cloud?server=[shellId]` respectively.
- Dynamic screen fixture families: 27.
- Planned base Figma archive: 408 compact/medium/wide route frames before state variants. These are coverage requirements, not evidence that a Figma file or frames already exist.
- The immutable baseline reads the recorded Git tree, records commit/tree SHAs, and has a regression proving dirty route edits cannot change clean-baseline evidence.
- Commit `f449234c`, merged as `07fc1794`, makes the 142/135/7/28 inventory executable: filesystem, redirect, navigation, dynamic-fixture, capture-state, component export, and closed-variant parity are covered by 11 green focused tests.
- The capture matrix is explicitly two-stage. A runner cannot claim a named state by relabeling a default screenshot; it must provision the fixture/persona/state through the preparation hook before capture.
- Commit `1ee90bf3` originally assigned every endpoint to exactly one executable Phase 5 owner. Current integration ownership is Wave A 30, B 67, C 16, D 23, and E 10 after adding four Cloud screens; the route-contract suite keeps the assignment exact.

### Current dev integration

- Commit `cc10fb06` merges the consolidated program onto current `origin/dev` and resolves four conflicts in Command Palette, GNav, Topbar, and RBAC without dropping current Cloud navigation or security behavior.
- The integration absorbs four Cloud screens into the route/Figma authority and converts legacy `/terminal` from a screen contract to a query-preserving redirect contract.
- The RBAC resolution preserves the current fail-closed business/config write mapping and adds the Builder agents/skills/tools capability prefixes plus correct POST collection `create` semantics.
- The merge exposed and repaired invalid decimal CSS custom-property names (`--space-3.5`, etc.), an auto-merged CRT dialog closing tag, stale select/icon types, and six embedded NUL separators in a reliability source file.
- Before Wave D, the integration checkpoint passed 84 focused correctness/route/API tests, the 43-test Wave B/C composition and scanner gate, Svelte check with zero errors, per-file design-lint debt enforcement, and a production Vite/Vercel-adapter build.
- Wave D commit `07e581eb` passes the full serial suite (239 files, 1,842 tests), its 31 focused composition contracts, `git diff --check`, and zero governed design debt in every changed file. It is merged into dev integration as `189fe89d`; the post-merge Wave D/route-contract smoke is green (three files, 33 tests), and the former FeedCard interactive-container warning is resolved.
- Post-Wave-D Svelte check is fully clean (zero errors and zero warnings). Production build exposed one invalid decimal custom-property reference introduced by the wave; commit `55446d00` corrects `--space-0.5` to the canonical `--space-0-5`, after which the full Vite/Vercel-adapter production build exits successfully.
- Wave E commit `53228463` migrates every one of the ten public/auth/onboarding/booking screens behind the shared `PublicTaskShell`. Its focused implementation suite is green (ten files, 55 tests), compact/medium/wide Chromium overflow smokes are green, and every changed file reaches zero governed design debt. The integration merge `c3afd3b1` passes its route/component/scanner/auth smoke (four files, 29 tests) and retains zero per-file design-lint regressions.
- Cloud addendum commit `3a91accb` migrates `/cloud`, `/cloud/gui`, `/cloud/settings`, and `/cloud/terminal` plus their local navigation, provisioning dialog, remote desktop, and remote terminal components. Its full serial suite passes 244 files/1,862 tests; Svelte check and production build are green; changed-file design debt, decimal-token, NUL, formatting, and diff gates are clean. The integration merge `20f130d6` passes the four-file Cloud/route/scanner/nav smoke (23 tests) and leaves legacy `/terminal` as the current query-preserving 307 redirect.
- Wave A residual commit `559ad6cc` migrates `/account`, `/account/connections`, `/account/security`, `/orgs`, `/team`, `/users`, `/users/join-requests`, `/killswitches`, `/notifications`, and `/overview`, with an exact ten-route executable composition contract. Its full serial suite passes 244 files/1,869 tests; check and production build are green; all owned diagnostics are cleared and changed-file design debt is zero. The integration merge `fbae2395` passes the four-file A/route/scanner/nav smoke (30 tests), completing executable page-migration ownership for all 138 routes classified as renderable at that checkpoint. The later `fc7028db` authority reclassifies the two Shells routes as redirects, producing the current 136-screen inventory.
- Route-policy commit `8b90916f` replaces divergent server/client/navigation decision tables with one serializable exact/prefix/subresource registry and shared evaluator. Server layout denial, client `canViewPath`, Sidebar, Topbar, GNav, Command Palette, and route-design metadata now resolve through the same authority; `/team` gains its missing server guard, `/notifications` no longer leaks through palette drift, Cloud action levels remain exact, and settings/gateways retains its 404 denial behavior. The integration merge `8d5becd8` passes the five-file policy/route/nav/layout/scanner smoke (22 tests).
- Capture-certification commit `704d82d0` changes the Playwright program from a signed-in one-state crawl to the manifest's persona/state/viewport matrix. It adds anonymous public capture, deterministic fixture/state prepare/reset hooks, explicit blocker records, atomic schema-v3 JSON artifacts, isolated strict port 5187, 200% reflow, coarse-pointer 44px enforcement, keyboard traversal, long-content mode, visible-title assertions, and behavioral reduced-motion checks. The integration merge `b6e8e522` passes the three-file certification/route/runtime suite (22 tests), Playwright discovery, and diff check. Live authenticated execution remains explicitly blocked by the safe disposable Supabase dependency; no database reset was attempted.
- Token-integrity commit `e7be3157` removes the exact 154 legacy custom-property consumers and their forbidden definitions across the original 51-file inventory, including adjacent undefined aliases and standalone built-in artifact surfaces. Its scanner is wired into CI and, after integration as `10ad8dbe`, resolved 7,003 consumers across 1,900 frontend source files against 210 declared names with zero violations; 117 occurrences were individually reason-coded runtime-authored, optional component-input, render-surface, or third-party-runtime variables. The merged five-file token/capture/policy/route/scanner suite passed 30 tests. At final checkpoint `b3b168fe`, the gate resolves 12,337 consumers across 1,913 frontend source files against 214 declared names with zero violations; all 114 remaining occurrences are reason-coded.
- Primitive commit `f1496529` converts Hub Select, Toggle, Spinner, and Skeleton into thin compatibility adapters over `@minion-stack/ui`, while legacy Modal becomes a deprecated no-style adapter over canonical foundations Dialog. Existing string/number select values, `xs` mapping, visible toggle labels/descriptions, skeleton geometry, modal callbacks, and custom-header labelling remain compatible. The integration merge `03df36a1` passes the four-file primitive/token/policy/capture suite (19 tests), and token integrity remains green with zero violations.
- Component-debt commit `306b03e1` removes all 417 governed findings from 28 files in DataTable, Users, Brains, Channels, Config, and Provision: 124 palette utilities, 122 type sizes, 106 bare buttons, 24 spacing values, ten raw colors, ten numeric layers, eight shadows, eight motion values, four radii, and one native select. It adds no exceptions; check and 16 focused tests are green. After integration as `f0167f28`, the primitive/token/route smoke passes 20 tests and token integrity remains at zero violations.
- Route-debt commits `450e09e2` and `d228b621` remove all 1,275 governed findings from the Svelte route scope, including conversion of 83 bare buttons and 11 native selects. The only 17 raw-color matches left in routes are existing reason-coded marketplace identity-card/holographic illustrations; no new exception was added. Check, token integrity, 93 route tests, and the zero-changed design gate are green; the tranche is integrated as `cfafb1f0`.
- My Agent debt commit `0dc88be9` removes all 844 governed findings from its 24-file component scope: 171 raw colors, 106 radii, 235 spacing values, 27 shadows, 59 motion values, 18 layers, 125 type sizes, and 103 bare buttons. It adds no exceptions; Svelte check is 0/0, 33 focused tests and token integrity are green, and the tranche is integrated as `512229da`.
- Authoring debt commits `62881dc1` and `ae98dc5f` remove all 1,966 governed findings from the Agents, Builder, Flow Editor, and Prompt component scopes across 110 changed files, including migration of 197 bare buttons and 21 native selects. No exception was added; Svelte check, token integrity, diff check, and 55 focused tests are green. The complete authoring tranche is integrated as `8017e420`.
- Operations debt commit `c8b7d21c` removes all 357 governed findings from Layout, Settings, Sessions, Reliability, Debug, and Decorations: 127 type sizes, 54 spacing values, 54 palette utilities, 45 bare buttons, 18 radii, 18 layers, 16 motion values, 12 shadows, 11 raw colors, one native select, and one easing value. No exception was added; its 29 focused tests, Svelte check, token integrity, and diff check are green. The tranche is integrated as `fd1bae60`, where the previously isolated shared-Select resolution issue is also cleared by the canonical package and primitive conformance passes.
- Business-component debt commit `32811625` removes all 667 governed findings from the CRM, Workforce, POS, Scheduling, Tasks, and Stock component scopes; Finance, Socials, and Support were already at zero. No exception was added; scoped Svelte diagnostics are 0/0, token integrity and diff checks are green, and 57 focused regression tests pass. The tranche is integrated as `168dda00`.
- Immersive-component debt commit `b67e461e` removes all 395 governed findings from Chat, Artifacts, Charts, Cloud, Dashboard, Hosts, Marketplace, Overview, Shared, Shells, Workshop, UI primitives, and plugin render hosts: 112 palette utilities, 86 type sizes, 69 spacing values, 29 raw colors, 29 bare buttons, 26 layers, 21 radii, 13 shadows, and ten motion values. It preserves the existing reason-coded illustration/render exceptions, adds no new exception, produces 0/0 owned Svelte diagnostics, and passes 76 focused tests plus token/diff gates. After integration as `532faf85`, the absolute repository gate reports exactly zero non-exempt governed findings.
- Route-compiler cleanup `e6e0f7fc`, integrated as `77df65e3`, reconciles generated route/access metadata with the migrated source. Inventory commit `fc7028db` records the two unconditional Shells redirects and the 136-screen/ten-redirect authority.
- Interaction commits `d7f21b19` and `8b7b34e4` restore composed Button layouts and route legacy Select classes to the control; `85ba7366` eliminates invalid Svelte global selectors. `ac5ae6ea` preserves the finalized bounded PostgreSQL pool, host state, and token route patch, while `bb143a54` preserves Cloud refresh continuity, shell access-session identity, and bounded chat-history loading. Local `dev` merge `b3b168fe` reconciles the equivalent latest `origin/dev` patch with no content conflict.
- Final source certification under Node 22 passes 256 test files/1,942 tests, `svelte-check` with 0 errors/0 warnings, and the Vite/Vercel-adapter production build with zero invalid-selector warnings. The design-lint absolute gate and token-integrity gate both report zero violations.
- The local `dev` checkout was reconciled with a forced frozen Bun install after its pre-merge dependency tree exposed a stale nested Svelte copy and stale packed UI payload. Regenerated Paraglide output matches the validated integration worktree, the 14-test route/component contract smoke is green, and local `svelte-check` returns 0 errors/0 warnings.

## Implemented with recorded checkpoint evidence on the consolidated Hub branch

### Hub correctness (`UI-001` through `UI-010`)

- Draft-first Builder wizard and explicit runtime-agent linkage.
- Idempotent create/update runtime synchronization with publish-time gateway-access revalidation.
- Hub-owned production migration in `minion_hub/supabase/migrations`, matching the shared DB schema.
- Builder capability, tenant, owner, and gateway gates.
- Permission- and owner-aware global record search.
- Graph mode derived from `theme.mode`.
- Corrected current accent/on-accent and status contrast behavior.
- Primitive IDs, naming, dialog names, disabled-link semantics, palette visibility, typed fetch errors, false-success paths, dead controls, and icon-only names.
- Deterministic local audit tenant seeder, four personas, 27 current dynamic fixtures, route inventory, redirect checks, and machine-readable capture-run support.

At final source checkpoint `b3b168fe`, the full serialized Hub suite is green: 256 files and 1,942 tests. Svelte check reports zero errors/warnings, and the production Vite/Vercel-adapter build exits successfully with zero invalid-selector warnings. The authenticated route crawl is not marked complete until the local tenant is safely seeded and the matrix exits without unexplained auth/onboarding failures.

### Hub composition and high-risk responsiveness

- Portal/layer tiers; Dialog, ConfirmDialog, and Sheet; FormField family; AsyncBoundary.
- AppViewport, PageShell/PageBody/SectionShell, responsive PageHeader and SectionNav.
- Responsive DraggableWindow behavior with keyboard movement/resizing instructions.
- Shell safe-area and single-scroll-owner contract; nav/overlay tiers.
- Responsive Settings, Sessions master/detail, Overview inspector, Shells list/detail, Memberships, Sales, Support, and Workforce project-board behavior.
- Per-file design-lint ratchet with reason-coded exceptions and a decrease-only legacy baseline.

Foundation-branch recorded evidence: ten focused foundation/layer tests, Svelte check 0 errors/0 warnings, production Vite/Vercel-adapter build, design-lint CI, diff check, and script syntax check were green. Repository debt decreased by 51 raw-color and ten bare-button violations at that checkpoint. Current source at `b3b168fe` is certified and the global governed-debt gate is zero, but declared responsive route cells still require authenticated browser evidence.

### Consolidated Hub package consumption

- The Hub consumes unique packed artifacts for `@minion-stack/design-tokens`, `@minion-stack/ui`, and `@minion-stack/db`; the lockfile resolves the exact candidate contents rather than an ambient workspace state.
- Shared Button disabled-anchor semantics and semantic Badge triples were verified from the installed package payload.
- On commit `64d2351b`, Svelte check is green with zero errors/warnings, the focused integration suite is green (five files, 15 tests), design-lint CI stays within its per-file ratchet, and the production Vite/Vercel-adapter build exits successfully.

### Static link, redirect, and API contract reconnaissance

- Current integration resolves 298 identifiable navigation references against the 146-endpoint route authority with no unresolved paths or parameter mismatches.
- All 51 registry entries resolve. At `b3b168fe`, the scanner reconciles 146 pages, 352 API handlers, 298 navigation references, and 387 API calls with zero unresolved destinations and zero HTTP-method mismatches; the sole deliberate ambiguity is Builder's typed dynamic `DELETE` target across three registered handlers.
- Commit `0288e925` makes the static reconnaissance executable. The original scanner checkpoint resolved 389 method-specific frontend calls. After the Wave D merge, the integration resolves 298 identifiable navigation references and 387 `fetch`, `fetchJson`, and `jsonMutation` calls against 352 filesystem API handlers, with zero unresolved destinations and zero HTTP-method mismatches; the sole deliberate static ambiguity remains Builder's dynamic DELETE target across its registered agent, skill, and tool handlers.
- One Builder delete call deliberately uses a typed runtime segment shared by the agents, skills, and tools endpoints. Its exact three-handler ambiguity is reason-coded in the test so the set cannot grow silently.
- The executable contract has two focused tests and is documented with its static-analysis boundary; indirect/runtime-only URLs, response schemas, authorization outcomes, and third-party destinations remain browser/behavioral concerns.
- Commits `a906c594` and `ea1049f5` extend the deterministic browser capture with machine-readable document overflow, duplicate-ID, accessible-name, dialog-name, form-button-type, local-link, route-title, target-size, console, page-error, request-failure, and same-origin GET diagnostics. Critical DOM invariants plus console/page failures and unexpected 4xx/5xx GETs fail the capture; intentional 403/404 page documents remain state evidence rather than being mislabeled as broken APIs.
- The runtime diagnostics gate has three green unit tests and the Playwright spec compiles; its authenticated route matrix remains blocked by the disposable local database drift described below.
- Commit `a1311e5e` replaces the three-class-only browser loop with the exact six certification dimensions (360×800, 390×844, 768×1024, 1024×768, 1280×800, and 1440×900) and full/reduced-motion capture. Legacy class aliases remain deterministic and unknown viewport values fail; two viewport-contract tests plus the three runtime-diagnostic tests are green.
- Commit `ff9d47f4` adds bounded default-dark, GitHub-light, CRT, and Voxelized capture preparation plus exact route filtering so representative theme review does not multiply the full screen matrix. Captures include theme and motion in unique screenshot/run IDs, restore the disposable persona's prior preference in a `finally` path, and reject unknown theme/filter values. Two theme-contract tests are green.
- Behavioral error-handling defects found beyond static contract matching were repaired in a dedicated branch and merged after focused validation.

Transient external dependency probe on 2026-07-14:

- The public B2 registry `index.json` and `catalog.json` endpoints both returned HTTP 200 and parsed as the expected JSON object/array shapes.
- The Hub's DiceBear v9 and v10 SVG forms and the Simple Icons GitHub SVG endpoint returned HTTP 200 with `image/svg+xml`.
- The configured open exchange-rate endpoint returned a successful USD response. These probes are live evidence only, not deterministic CI gates; authenticated OpenRouter, GitHub, Meta, Google, Instagram, ElevenLabs, and Susii behavior still requires configured integration tests.

### Phase 5 Wave A first tranche: named core platform surfaces

- Commit `73ea4791`, merged as `f8b23dd0`, migrates 43 tracked files across Settings, Sessions, Channels, Reliability, Shells, and Config.
- Shared PageShell/PageBody/AsyncBoundary/Dialog/Button/Select/Toggle composition, semantic state variants, responsive layouts, explicit icon names, and stateful `aria-expanded`/`aria-pressed` contracts replace local reimplementations.
- ConfigField now uses the shared Select value contract. The CRT editor uses the shared Dialog, Toggle, and Button while retaining only its authored miniature display as a narrow reason-coded exception.
- Consolidated evidence is green: seven focused files/74 tests, executable route/API contracts, Svelte check 0 errors/0 warnings, strict migrated-file zero debt against the pre-merge parent, and `git diff --check`.
- This tranche is not mislabeled as the whole executable Wave A. Account, organization/team/users, Kill Switches, Notifications, and Overview remain assigned to A and require the same strict migration gate.

### Behavioral integrity

- Commit `783150ef` introduces a strict JSON mutation boundary and prevents local UI commits after non-2xx responses across the scoped high-risk screens.
- Flow activation now coordinates the gateway and Hub write, restores the prior gateway state if Hub persistence fails, and preserves the proposed preview when apply fails.
- Brain deletion navigates only after confirmed success; Home feed cards no longer expose no-op actions or static-card click semantics.
- The two remaining raw `fetch()` calls in the scoped mutation paths are intentional Backups server-sent-event streams and both validate non-2xx responses.
- Focused evidence is green: four test files/25 tests, Svelte check 0 errors/0 warnings, design-lint per-file ratchet, and `git diff --check`. The commit is merged into the program as `86e24cbd`; the same 25 tests pass on the merged tree.

### Complete token-category ratchet

- Commits `46cadc25`, `28eaec26`, `dc9bca5e`, and `73825763` extend changed-file enforcement beyond literal colors, bare buttons, and native selects to Tailwind palette utilities plus arbitrary spacing, radii, shadows, motion durations/easing, numeric layers, and type sizes; the scanner can target isolated worktrees without copying code.
- Token-backed arbitrary utilities such as `shadow-[var(--shadow-overlay)]` and named CSS variable values remain valid; reset values and documented expressive exceptions are not treated as semantic debt.
- The expanded ratchet is green on the consolidated branch with no changed-file increase. `--zero-changed` additionally makes the specification's migrated-file definition of done executable against an individual wave base. Historical totals remain visible as migration inventory rather than being hidden by a raised baseline.
- Commit `4e1591f7` adds the distinct `--zero-global` completion gate. `--strict-global` continues to enforce the decrease-only historical ceiling, while final certification now invokes both flags and fails whenever any non-exempt governed finding remains anywhere in the source tree.

### Site consumer

- Packed shared tokens/UI are consumed through reproducible local artifacts and lockfile entries.
- Site intentionally keeps its pink brand and typography while inheriting semantic foundations.
- Theme state sets both Site mode and canonical Minion theme metadata.
- The Site Button adapter delegates interaction semantics to the shared Button.
- Authentication and selected marketing/member surfaces use semantic on-accent behavior.
- Under Node v22.23.1, frozen install, Svelte check (0 errors/0 warnings), two tests, and the production build are green. The clean browser artifact covers 96 route/viewport/theme/motion cells, including 48 screenshots and 48 reduced-motion cells, with zero status, overflow, branding, console, page, same-origin network, naming, duplicate-ID, disabled-link, button-type, interaction, or remaining scroll-reveal failures. Its report SHA-256 is `d6887b665804eeba2feff487f0135d79f4765b333bf097570318bcefc0084f3a`.

Live review caught and repaired a selector-specificity defect where `github-light` changed the Site light accent to blue. The clean matrix now asserts computed pink accent/brand and on-accent values for every cell.

## Acceptance audit and remaining gates

The post-Wave-E acceptance audit intentionally distinguishes route migration from program completion. The normal design-lint gate proves that changed files do not regress and that explicitly migrated files can reach zero debt; it does **not** prove the specification's final repository-wide scorecard. At that historical audit checkpoint, strict-global scanning found 6,545 total findings, including 382 approved expressive/data-visualization exceptions and 6,163 unexcepted legacy findings. It also found undeclared legacy token aliases. Subsequent token-integrity and debt tranches resolved that inventory: at `b3b168fe`, `design-lint --ci --strict-global --zero-global` reports zero non-exempt governed findings and 242 remaining matches, all reason-coded. Token integrity reports 12,337 consumers across 1,913 files, 214 declarations, 114 reason-coded exceptions, and zero violations.

The audit also found three architectural/certification gaps that remained after the page waves:

- Route access metadata originally validated parity but did not drive every server guard, `canViewPath`, navigation, and Command Palette consumer. This was observable for `/notifications`, whose palette visibility could diverge from its platform-admin route guard. Commit `8b90916f`, merged as `8d5becd8`, closes that gap without weakening fail-closed RBAC.
- The Playwright audit originally declared state/persona metadata but captured only one signed-in current state per route. Commit `704d82d0`, merged as `b6e8e522`, now executes the manifest matrix and emits explicit blockers whenever disposable local auth/fixture/state preparation is unavailable.
- The local duplicate Select/Toggle/Modal/Spinner/Skeleton systems and thousands of legacy token/type/spacing/button findings identified by the audit were closed by the primitive-consolidation and debt-tranche commits above. `--zero-global` is the explicit completion gate and passes at `b3b168fe`; the consolidated compiler/check/test/build and interaction pass is complete.

Current remaining order:

1. Complete the deterministic authenticated local capture after a safe seeded database is available; the current local Supabase schema is drifted and has not been destructively reset.
2. Reconfirm the session-specific Figma connector authorization, select the owning workspace, create the actual file, transfer all 136 current screens (408 planned compact/medium/wide base frames), and reconcile route/component IDs with code.
3. Publish the package candidates through the normal Changeset/npm flow and replace packed `file:` consumers with recorded released versions; no external publication has been performed.

## Open external decisions

- **Figma owner:** the connector reports three eligible Starter workspaces: MELOFOBIA, Harvest Fintech, and Sandbox. The required choice was not made, so no Figma file exists; Sandbox remains recommended.
- **Figma variables:** all three workspaces are currently Starter. Starter permits only one variable mode per collection, so the canonical 16-theme collection requires Pro. Screen capture can start before that upgrade; silently splitting or flattening the theme model is not an accepted substitute.
- **Package publication:** the local release candidate is ready for normal Changeset review, but no push, merge, npm publish, or production migration has been performed.
