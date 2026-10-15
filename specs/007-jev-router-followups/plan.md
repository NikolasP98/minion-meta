# Implementation Plan: Hub assistant JEV turn router — follow-up defects

**Branch**: `007-jev-router-followups` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-jev-router-followups/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Six remaining defects from the 2026-10-15 agent-harness audit of the hub assistant's JEV turn
router, after hub #540 already shipped the four highest-impact fixes (D1, D2, D4, D6). This
plan closes the rest: reword the unusable `brain` noul question (D3); carry the prior turn's
mode into the classifier's state so mid-form-fill follow-ups aren't starved (D7); make the
`hub.pages` recovery tool mark weak/module-missing matches so the anti-hallucination rule has
evidence even when the page list manifest is withheld (D5); add a per-user rate limit to
`POST /api/assistant/route` (D8); un-nest the two 1500 ms timeout budgets (D9); and commit the
audit's 46-turn live probe set as an opt-in test so future threshold changes are checked
against a repeatable fixture instead of discovered in production (D10). No new dependencies,
no schema changes, no new routes — every change is inside files the shipped router already
touches, in `minion_hub` (SvelteKit 2, Bun, Vitest).

## Technical Context

**Language/Version**: TypeScript (SvelteKit 2, Svelte 5), Node/Bun runtime — same as the
already-shipped turn router this feature extends.

**Primary Dependencies**: None new. Reuses `src/server/auth/rate-limit.ts`
(`checkRateLimit`), the existing OpenRouter `~typesafe/jev-latest` decisions client in
`src/server/services/assistant-router.service.ts`, and Vitest (existing
`src/lib/assistant/prompt-contract.live.test.ts` pattern for the opt-in live test).

**Storage**: N/A — no persistence change. The classifier's "history" (D7) is in-memory,
client-held last-routed-mode (already partially present as `lastMode` client state in
`FloatingAssistant.svelte`), not a stored session field.

**Testing**: `bun run vitest run` (hub's existing runner). New/changed unit tests in
`turn-router.test.ts`, `assistant-router.service.test.ts`, a new
`src/server/global-tools.test.ts`-adjacent case for `hub.pages`, and a new opt-in
`jev-probe-set.live.test.ts` gated the same way `prompt-contract.live.test.ts` is: matched by
vitest's default glob but runtime-skipped (`describe.skipIf(!LIVE)`) unless `LIVE_LLM=1` is set
(see research.md D10 — corrected from an earlier, unverified "excluded from CI" assumption).

**Target Platform**: Web (SvelteKit on Vercel), browser client + server route — unchanged from
the shipped router.

**Project Type**: Web application (single SvelteKit app; this feature touches client state,
one server route, and one server service — no frontend/backend split beyond what already
exists).

**Performance Goals**: No regression to the measured p50 ≈ 225 ms classifier latency; the new
server-side timeout (1200 ms, FR-007) must not cause a false-negative abort inside that budget
in the probe set.

**Constraints**: `/api/assistant/route` must remain always-HTTP-200, fail-open on every error
path (unchanged shipped invariant, FR-011). The rate limit (FR-006) must fail open to
`{decision: null}`, never reject or delay a send. The probe-set test must not run in default
CI (costs real OpenRouter credit).

**Scale/Scope**: Six defects, each independently shippable (User Stories 1–5 in spec.md; US5
bundles D8+D9 as one slice). No change to the five manifests, their modes, or the envelope
shape — only to one question's wording (D3), one input (`state`, D7), one tool's result shape
(D5), one route's throttling (D8), one timeout constant (D9), and test fixtures (D10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec before code** — PASS. This plan follows `spec.md`, itself produced by
  `/speckit-specify` → `/speckit-clarify` before this `/speckit-plan` run.
- **II. AS-IS → TO-BE → DELTA, with evidence** — PASS, with a named gap. The AS-IS for every
  defect is anchored to `audits/2026-10-15-agent-harness/B-jev-router.md` (file:line citations,
  live-probed scores, the merged hub #540 PR as the baseline this plan builds on — verified via
  `gh pr view 540 -R NikolasP98/minion_hub`, `mergedAt: 2026-10-15T21:20:01Z`). The TO-BE and
  DELTA are in spec.md's Functional Requirements and this plan's Phase 1 artifacts. **Gap**:
  three numeric defaults (FR-003's mechanism, FR-006's rate limit, FR-007's timeout) are
  resolved as `(ASSUMPTION — owner to confirm)` rather than measured — this plan treats them as
  provisional and names them again in Complexity Tracking's notes below so a reviewer cannot
  miss them.
- **III. Slice-scoped delivery** — PASS, with a cross-repo note. The repo policy for a hub
  change is `minion_hub`, PR base `master` (`node scripts/repo-policy.mjs show minion_hub` —
  not re-run in this read-only probe worktree since the script needs a symlinked
  `node_modules`, but the value is already known from `AGENTS.md`'s Project Map and confirmed
  by hub #540's own `baseRefName: "master"`). **This plan's artifacts live in `minion-meta`
  (`specs/007-jev-router-followups/`) but the code they describe lives in a sibling repo
  (`minion_hub/`) with its own git history, worktrees, and gates** — Spec Kit's own templates
  assume spec and code share one repo tree (see Project Structure below and the friction log in
  `sdd-notes.md`). Each user story in spec.md (US1–US5) is sized as one PR against
  `minion_hub`'s `master`, from an isolated worktree, running the hub's own gates
  (`bun run vitest run`, `bunx prettier --check`, `bunx svelte-check`,
  `DESIGN_LINT_BASE_REF=origin/master node scripts/design-lint.mjs` — the same four gates hub
  #540 ran) before any PR opens.
- **IV. Required build steps are spec requirements** — PASS, not applicable in the strict
  sense: this feature adds no new page, route, nav link, or user-facing string (the `brain`
  question text and the rate-limit/timeout values are server-/classifier-internal, never
  rendered as UI copy), so RBAC wiring and Paraglide `i18n:compile` are out of scope. Confirmed
  by reading all five touched files (`turn-router.ts`, `assistant-router.service.ts`,
  `+server.ts`, `global-tools.ts`, plus the new test files) — none add a route, page, or
  user-visible string.
- **V. Security and data work keeps human gates** — **CONDITIONAL PASS, flagged**. FR-006 adds
  abuse/cost throttling to an authenticated endpoint, which reads as security-adjacent by the
  constitution's own examples ("credentials, tenant scoping" — rate limiting is not literally
  named, but cost-abuse control is the same family). The task description explicitly states
  "Not security tagged," which this plan follows, but spec.md's Assumptions section already
  flags the tension: *"if the owner disagrees, FR-006 escalates to the gated path on review."*
  This plan does NOT add an owner-approval gate before code for FR-006, per the task's explicit
  instruction, but the PR for US5 should surface this flag in its description so the merge
  reviewer (owner, per hub's admin-merge requirement) sees it named, not buried.

**No blocking violation.** Principle V is the one to watch — re-confirm the "not security
tagged" call at PR review for US5, since it is the one load-bearing judgment call this plan
inherited rather than re-derived.

### Post-design re-check (after Phase 1)

Re-read against `data-model.md`, `contracts/assistant-route.md`, `quickstart.md`: no new
violation introduced by the design. The contract stays additive/backward-compatible (I), the
data-model changes are all extensions of existing shapes with no new persisted entity (II), the
source tree confirms no new route/page/nav-link (IV unaffected), and Principle V's flag is
unchanged — still a named judgment call for PR review, not a blocker to drafting tasks.

## Project Structure

### Documentation (this feature)

```text
specs/007-jev-router-followups/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # /speckit-specify + /speckit-clarify output
├── sdd-notes.md          # friction log (audit brief, not a Spec Kit artifact)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (lives in a sibling repository, not this one)

**This plan's artifacts are in `minion-meta`; every file they describe is in the independent
`minion_hub` repository** (own remote, own branches, own package manager — see
`AGENTS.md` Project Map). Spec Kit's template assumes source sits under the same tree as
`specs/`; it does not here. Paths below are relative to `minion_hub/`'s own root
(read at `~/.cache/claude-tmp/hub-ro/` for this plan, `origin/master`, post-#540):

```text
minion_hub/
├── src/
│   ├── lib/
│   │   └── assistant/
│   │       ├── turn-router.ts              # D3 (question wording), D7 (state carries prior mode), D9 (timeout)
│   │       ├── turn-router.test.ts          # new/changed cases for D3, D7, D9
│   │       ├── global-tools.ts              # D5 (hub.pages weak-match flag)
│   │       ├── site-map.ts                  # read-only reference for D5 (rankPages weak detection, unchanged)
│   │       └── jev-probe-set.live.test.ts   # NEW — D10, 46-case fixture, opt-in pattern
│   ├── server/
│   │   ├── services/
│   │   │   ├── assistant-router.service.ts  # D7 (state carries prior mode), D9 (server timeout)
│   │   │   └── assistant-router.service.test.ts
│   │   └── auth/
│   │       └── rate-limit.ts                # reused unchanged for D8 (no new primitive)
│   ├── routes/
│   │   ├── api/
│   │   │   └── assistant/
│   │   │       └── route/
│   │   │           └── +server.ts           # D8 (per-user rate limit), D7 (accepts prior mode from client)
│   │   └── (app)/
│   │       └── home/+page.svelte            # D7 (tracks/sends prior mode) — mirrors FloatingAssistant's existing `lastMode`
│   └── lib/components/layout/
│       └── FloatingAssistant.svelte          # D7 (sends existing `lastMode` state to the classifier — it already tracks it, just never sent it)
└── (test runner: bun run vitest; gates: prettier, svelte-check, design-lint — all per hub's own CLAUDE.md)
```

**Structure Decision**: No new files beyond the one opt-in test (`jev-probe-set.live.test.ts`)
and the probe fixtures it reads. Every other change is inside a file the shipped router (hub
#540) already modified. No Option 1/2/3 web-app split applies — this is six surgical edits plus
one new test file inside an existing SvelteKit app, not a new surface.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No blocking violation to justify. Two provisional numbers inherited from `/speckit-clarify`
(not a constitution violation, but worth tracking here so Phase 2 doesn't silently treat them
as final):

| Item | Why provisional | What would change it |
|------|------------------|------------------------|
| FR-006 rate limit: 20 calls / 60 s per user | Audit names the defect, not a number; clarify answered it as a ponytail-sized default | Owner confirms, or production `assistant_route` volume (D10's own calibration data) suggests a different number |
| FR-007 server timeout: 1200 ms | Audit suggests this number as one of two options (the other being "just document it") | Owner confirms, or the probe-set test (D10) measures a latency distribution that argues for a different split |
