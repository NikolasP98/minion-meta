---
id: 2026-08-13-agentic-sdlc-test-quality-gates-spec
title: Agentic SDLC test & quality gates — execution surfaces, test integrity, train gates
stage: spec
status: approved
pass: 1
created: 2026-08-13
updated: 2026-08-28
repos: [minion, minion_hub, minion-meta, minion-factory]
verdict: pending
tags: [infra, test]
type: infra
approved_reason: "Pending verdict resolved under overnight mandate: spec is the quality-gates plan of record (S1 already shipped as gw PR #214/#225 lineage); slice-scoped dev runs to continue."
---

# Agentic SDLC test & quality gates

**Extends:** `2026-08-13-request-to-deploy-sdlc-pipeline-spec.md` §5 (which delegates the test stage to "the repo's own gate command" — this spec is what makes that gate command worth trusting). **Evidence:** 2026-08-10 test-suite recon (2,060 files / 17,214 tests swept; 1,069 tests deep-read) + three research passes 2026-08-13 (industry practices; gw e2e feasibility; test-integrity scoping).

## 0. Product

User intent (verbatim, 2026-08-13): "proceed with scoping and spec'ing those high ROI items; find more improvements in the SDLC pipeline. … question everything and research existing workflows online: how are companies and teams building agentic SDLC infra and how do they evaluate quality? How are their tests built? What is the order of operations?"

The factory pipeline ships agent-written code end-to-end. Agent-written code is exactly the code most prone to *plausible-but-worthless tests* (mock-mirrors, tautologies, reward-hacked green) — and our quality gates must catch that without a human reading every diff. Today they can't: most of our test surface never executes anywhere, and the parts that do have no integrity enforcement.

## 1. Current state — the gate ladder is broken at every rung

| Rung | Intended | Reality (verified 2026-08-13) |
|---|---|---|
| Factory dev loop | selfTest gate, cap 5 | `runner/src/repos.ts` built-ins: minion-base = lint+svelte-check+build, minion-site = `bun run build`. **Zero tests anywhere.** hub/gw not in fleet |
| gw PR CI | `pnpm test` (12,017 tests) | **Never ran once on this fork.** Every job `needs:` → `docker-security-check` → `runs-on: blacksmith-4vcpu-ubuntu-2404` (upstream's paid runner; fork has none) → queued forever → cancelled by next push. 0 green runs in last 100. The queued DEV→main train PR is blocked by this too |
| hub PR CI | vitest suite | ✅ Fixed 2026-08-12 (PR #94): `bunx vitest run --retry=2` + architecture-recon, green, ~90s |
| gw e2e tier | 349 files / ~2,482 tests | No workflow invokes the `e2e` vitest project. Not deliberate — `ci.yml:232` comment omits it, no ADR; "never wired," unlike `install-smoke.yml` which documents its exclusion |
| brain-vector | 17 files / 64 tests | `test` + `test:postgres` scripts exist, no workflow calls them |
| Promotion train | Sat 21:00 DEV→PRD | No test gate at all — promotes whatever DEV is, and (gw) even a dead CI doesn't block it |
| Test integrity | tests mean what they say | No enforcement. Recon: ~97% of sampled tests functional, but confirmed liars exist (§5) and the worst one (`ChannelSetupWizard.test.ts`) has **drifted** — its hand-copied `commit()` tests a pre-Phase-4 contract the component no longer has |
| Local | full gw suite | Unrunnable (crashes the box); gate = `test/ci/` (36 tests) |

## 2. Research verdict — the order of operations

Convergent 2026 industry design (Devin, Copilot coding agent, Cursor Cloud, Jules, Factory.ai, Anthropic guidance — sources in the research annex of this spec's review sidecar when pass 2 lands):

1. **Agent inner loop**: run the existing suite until green inside the sandbox; checks enforced by the orchestrator, not the prompt (we already do this shape — but our selfTest commands contain no tests, so "green" is vacuous).
2. **Human-gated PR CI**: the trust boundary. Copilot makes it structural: the agent's CI needs human approval; the assigner can't merge.
3. **Nightly / heavy tier**: suites too slow for PR gating run on cron + label opt-in; merge queues batch them (not needed at our PR volume).
4. **Promotion gates** (Chrome/Firefox/GitLab trains): cut → full regression **on the cut** → soak → smoke → promote; blockers respin, never patch the moving train.
5. **Anti-worthless-test mechanisms with primary-source evidence**: Meta's filters (must build, pass 5×, measurably increase coverage — 57%/25% survival); mutation-kill gates (Meta ACH); TDD red-state locks (failing test verified red *before* implementation); fresh-context reviewer ("the agent doing the work isn't the one grading it"); lint rules `expect-expect` / `no-conditional-expect`; patch-coverage required checks. Reward hacking is a documented model-level behavior (Claude 3.7 system card §6) — instructions alone don't stop it; deterministic gates do.
6. **Flakes**: retries first (we do, `--retry=2`), quarantine + tracking only at volume we don't have; agent-flow flakes get fixed by extracting deterministic scripts.

## 3. Target gate ladder

```
L0  factory dev loop   selfTest = lint + typecheck + UNIT TESTS (fast, <10 min)     every attempt
L1  PR CI              full unit/integration matrix, retry=2, integrity lint        every PR/push
L2  nightly            gw e2e project + brain-vector (incl. Docker-PG) + timings    cron + label/dispatch
L3  train gate         promotion PR requires: DEV CI green + last nightly green     Sat 21:00, hotfix bypass
L4  measurement        vitest-slowest artifacts, flake count, (parked: mutation)    continuous
```

## 4. Slices

Ordered by ROI. Each is a junior-dev 4–8h slice with a machine-checkable DoD.

### S1 — Resurrect gw CI (URGENT; everything else in gw is moot until this)
Swap `runs-on: blacksmith-4vcpu-ubuntu-2404` → `ubuntu-latest` in `ci.yml:15` **or** drop the fork-irrelevant `docker-security-check` from the `needs:` chain (docs-scope roots the whole graph on it, `ci.yml:36`). Prefer the smallest diff that makes `checks` (pnpm test) reachable. ⚠️ A co-agent pushed CI fixes to DEV today (2026-08-13 17:45) — rebase and check `git log @{u}..` before touching.
**DoD:** one CI run on DEV where the `checks` matrix job (node + bun) reaches `completed/success`. The queued train PR's checks go green or fail honestly.

### S2 — gw e2e nightly workflow
New `.github/workflows/e2e.yml` modeled on `install-smoke.yml` (cron + `workflow_dispatch`, explicit not-a-PR-gate comment). Two jobs:
- **e2e**: `setup-node-env` composite → `pnpm canvas:a2ui:bundle` → `pnpm vitest run --config vitest.e2e.config.ts` with `MINION_VITEST_REPORT_DIR` + `scripts/vitest-slowest.mjs` artifact upload (this first run *is* the timing measurement we currently lack — estimate 8–20 min at maxWorkers=2, unverified). `timeout-minutes: 60`. Note: most "e2e" files are mocked in-process tests (94/349 use `vi.mock`); the genuinely heavy tail is `test/gateway.multi.e2e.test.ts` (spawns real gateways, 120s budget) and ~9 sandbox/doctor files touching Docker — ubuntu-latest has Docker, no `services:` block needed.
- **brain-vector**: `cd services/brain-vector && pnpm vitest run` incl. `migration.postgres.test.ts` (it runs its own `docker run postgres:15` — do NOT add a workflow `services:` container).
Optional PR opt-in via `run-e2e` label once flakiness is characterized — never default PRs into it.
**DoD:** one green scheduled run with a `vitest-slowest.md` artifact; failure visible in Actions UI (notification wiring is out of scope).

### S3 — Put tests in the factory's selfTest gates
- minion-base: append its test command (add a minimal vitest suite if none exists — the dashboard has logic worth one suite; if truly nothing to test, leave build-only and say so in repos.ts comment).
- Add hub + gw fleet entries when they join the factory, with test-bearing gates from day one: hub = `bunx svelte-kit sync && bun run check && bunx vitest run --retry=2`; gw = `pnpm check && pnpm vitest run test/ci/` plus the unit project scoped to changed dirs if runtime allows (never the full suite in-container).
- Runner change: `run.sh` records the selfTest command + exit in `result.json` so the dashboard can show *what* gate passed, not just "green".
**DoD:** `repos.ts` (or mounted repos.json) has no fleet entry whose selfTest lacks a test command, or carries an explicit `// build-only:` justification comment; one factory run shows the gate output in its PR comment.

### S4 — Train test gate
The Saturday train script, before opening/promoting each promotion PR, queries (`gh api`): (a) latest DEV-branch CI run conclusion == success; (b) latest scheduled e2e run conclusion == success (gw only). Either red → train skips that repo with a comment on the would-be promotion PR naming the failing run. `hotfix` label bypass unchanged.
**DoD:** dry-run of the train script against a repo with a red nightly produces a skip + comment, and against all-green produces the promotion PR.

### S5 — Test-integrity lint
- **gw (one-liner + cleanup):** `.oxlintrc.json` plugins += `jest`, `vitest`; rules: `jest/expect-expect: error`, `jest/no-conditional-expect: error`, `jest/no-disabled-tests: warn`, `vitest/no-conditional-tests: error`. Plugs into existing `pnpm check` — no new CI wiring. Fix or annotate the ~7 files it will flag first (§6 list).
- **hub (no eslint exists — don't add one for this):** `scripts/test-integrity-lint.mjs` cloned from the `design-lint.mjs` ratchet pattern (RULES map, changed-file scope, committed baseline, decrease-only, `--ci`): rules = test block with zero `expect(` calls; `expect(true).toBe(`; `it.skip` without a `// skip-reason:` comment; `expect` inside `catch`/`if`. Wire into hub CI next to `lint:design:ci`.
**DoD:** both gates red on a seeded violation commit, green on current tree (post-cleanup); hub baseline committed.

### S6 — Fix the confirmed liar tests
| File | Fix (verified line numbers, 2026-08-13) |
|---|---|
| hub `ChannelSetupWizard.test.ts` | Extract pure response-interpretation fns → `wizard-verify.ts` (kills the duplication for 4/6 tests, ~45 min); rewrite commit-order tests with `@testing-library/svelte` (already a devDep) mounting the real component, mocking `sendRequest`+`fetch` (~2h). The shadow `commit()` (test:73-95) has drifted from the real `commitVerified()` (svelte:146-219) — currently tests a false contract; this is the priority fix |
| gw `agent-dirs.test.ts` | Real inputs: two agents with identical explicit `agentDir` → expect 1 dupe; export `resolveEffectiveAgentDir` (or wrapper) and assert the OPENCLAW_HOME-derived path string; explicit-agentDir-beats-env case |
| gw `circuit-breaker.test.ts:80-86` | Add the missing assertion (`recordFailure` 4th call → expect `false`) |
| gw `livekit-voice-agent.test.ts` | Delete tautology (258); rewrite the 3 assert-nothing tests against exposed state or observable side effects |
| hub `personal-agent.service.test.ts:159-179` | Assert the values passed to `.set()` (status/error), not just `db.update` called; check `mock-db` captures args first |
| hub `mission.service.test.ts:55-63,87-92` | Capture insert/select args; assert null defaults and sessionId filter actually threaded |
| gw `voice-call.plugin.test.ts` (5× it.skip) | Attempt the `server.deps.inline` fix per the file's own TODO; if it works, unskip; else add `// skip-reason:` and file issue |
| Leave with comment | `golden-snapshots.test.ts:8-12` (legit parity guard — add companion content assertion note); msteams privacy-notice (content-snapshot, acceptable); `hub-credential-client-registry` (harmless, low-ROI); `pg-client.test.ts:13-20` (honest smoke) |
**DoD:** S5's lint passes with zero exceptions for these files; each rewritten test demonstrably fails when its subject logic is inverted (spot-check by temporary mutation).

### S7 — Test-authoring standard for agents
One markdown section, added in three places (factory `playbooks/*.md`, each repo's `copilot-instructions.md`, hub/gw CLAUDE.md test notes): the rubric the recon graded by, as authoring rules — every test asserts observable behavior that would fail on regression; never assert a mock returns what the mock was configured to return; no `expect(true)`; no env-gated silent no-op (use `describe.skipIf` + a logged reason); test the shipped module, never a copied reimplementation; new features in the factory loop follow TDD red-state: the dev stage writes the failing test first and the runner verifies non-zero exit before implementation counts (orderable in `run.sh` as a pre-develop check, cheap to add since the loop already runs selfTest per attempt).
**DoD:** text landed in all three surfaces; one factory run's PR shows a red-state check line in its log.

### S8 — Parked (revisit after S1–S7 prove out)
- **Mutation-testing pilot**: Stryker 9.6 + vitest-runner is compatible (gw first-class via pnpm; hub needs a bun-compat spike). Scope: `mutate` glob over just the S6-fixed modules to verify the rewritten tests kill mutants. Parked: cost/benefit unproven at our scale.
- **Agent quality metrics**: PR revert rate, human-intervention rate, loop-cap-hit rate — no industry standard exists yet (DORA 2025 shows throughput↑/stability↓ with AI; vendors use merge-rate). The factory DB already stores runs; a dashboard card is cheap *later*.
- **Patch-coverage gate** (Codecov-style): premature until CI is stably green.

## 5. Out of scope

Live tests (`*.live.test.ts`) stay manual/env-gated — correct design for real-API tests. No merge queue (single-operator PR volume). No LLM-as-judge scoring. No full gw suite locally, ever. No new eslint infra in hub. Site CI is covered by `2026-08-13-ci-minion-site-ci-spec.md`, not here.

## 6. End-to-end verification

After S1–S5: (1) push a gw commit with a deliberately broken unit test → PR CI goes red (first time in this fork's history that's possible); revert. (2) Trigger the e2e workflow via dispatch → green + timing artifact. (3) Add `expect(true).toBe(true)` to a hub test → `test-integrity-lint --ci` fails; to a gw test → `pnpm check` fails; revert both. (4) Run the train dry-run with nightly forced red → skip + comment. (5) One factory run on a fleet repo shows selfTest output including a test count in its PR comment.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Scope narrowed to what is still factory-actionable: S3 — minion-base and minion-site registry entries still ship no test command and no `// build-only:` justification (repos.ts:94,:110); S7 — test-authoring rubric exists only in playbooks/minion-hub.md, no red-state TDD check. S1/S2/S5/S6 are gw/hub work that moved independently.
