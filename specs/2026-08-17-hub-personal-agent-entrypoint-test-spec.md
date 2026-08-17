---
id: 2026-08-17-hub-personal-agent-entrypoint-test-spec
title: "Direct unit tests for loadPersonalAgentForUser — cover the 401 guard and the delegation path"
stage: spec
status: draft
pass: 1
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-hub-personal-agent-entrypoint-test
verdict: pending
repos: [minion_hub]
tags: [test]
type: fix
---

# Direct unit tests for `loadPersonalAgentForUser`

**Owner surface:** `minion_hub` — `src/server/services/personal-agent.service.ts` (the entry point
named at `:282`; **read-only in this spec except for an `export` keyword, see ⚠️ A1**) and its
co-located suite `src/server/services/personal-agent.service.test.ts`, plus whichever caller test
currently stubs the function as a black box (path from Slice 0).
**Design ancestors:**
[`2026-05-20-my-agent-homepage`](2026-05-20-my-agent-homepage.md) (why a personal agent is loaded on
every authenticated page at all — `/my-agent` is the default home and the layout resolves the user's
own agent before render),
[`2026-05-26-auth-token-simplification`](2026-05-26-auth-token-simplification.md) §2.1 (the tenant-context
cascade: `appHandle` → `finishApp` → `(app)/+layout.server.ts` each re-resolve `tenantCtx`, and the
Better-Auth branch fires a **fire-and-forget personal-agent backfill** — this is the surrounding
machinery whose failure modes the 401 guard exists to absorb),
[`hub-erp-roadmap/P4.1-brains-consolidation`](hub-erp-roadmap/P4.1-brains-consolidation.md) (locates
`src/server/services/personal-agent.service.ts`, `derivePersonalAgentId`, `personal-agent-provisioner.ts`
and the privileged `POST /api/personal-agent/create` gateway call),
[`2026-08-13-agentic-sdlc-test-quality-gates-spec`](2026-08-13-agentic-sdlc-test-quality-gates-spec.md)
§S6/§S7 (the test-authoring rubric this spec is graded by — and note S6 already owns a **different**
edit to the *same test file*: see ⚠️ A2).
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
both slices are tagged `test`, which pulls the **mutation spot-check** gate (invert the subject
logic, the new test must fail) and pulls **no** UI-governance checks: no `.svelte` file is touched
anywhere in this spec.

---

## 0. Product

From the approved proposal `2026-08-17-hub-personal-agent-entrypoint-test`, verbatim:

> ## Problem
>
> personal-agent.service.ts:282 has real branching (401 throw, dynamic ctx import) called on every
> authenticated page load, but tests only mock it as a black box.
>
> ## Definition of done
>
> Test covers the 401-no-ctx path and the happy delegation path; bun run test personal-agent.service.test.ts green.
>
> ## Out of scope
>
> Refactoring the function.

**Why this is worth a spec and not "write two `it()` blocks".** The function is on the hot path of
*every* authenticated page load, so its failure mode is not a broken feature — it is a site-wide
white screen or a spurious sign-out. Three things make the test non-trivial, and each is a way a
careless version of this task produces a green suite that proves nothing:

1. **The mock that already exists is the adversary.** Today the function is stubbed wholesale by its
   callers' tests. If the new direct tests land in a file that also carries a module-level
   `vi.mock()` of the module under test, they assert against the stub and pass forever — the exact
   "test asserts the mock returns what the mock was configured to return" anti-pattern §S7 of the
   test-quality spec bans. Slice 0 checks for a self-mock before a line of test is written.
2. **A dynamic `await import(...)` is a different mocking problem than a static one.** Static
   imports are bound when the module under test is first evaluated, so hoisted `vi.mock` is enough.
   A dynamic import inside the function body resolves at *call* time, against the specifier string
   as written (`$server/...` alias vs. relative path — they are different keys to vitest's registry
   unless the alias resolves identically). Getting this wrong yields a test that silently loads the
   *real* module and reaches for a real DB or a real gateway call.
3. **A SvelteKit 401 is not an `Error`.** If the guard uses `error(401, …)` from `@sveltejs/kit`, it
   throws an `HttpError` whose `message` is not what `toThrow('...')` matches; asserting on message
   text passes/fails for the wrong reason. The assertion has to be on `status === 401`.

The value here is precisely that these tests must be *falsifiable*: each one has to fail when the
branch it covers is inverted. That is the machine-checkable core of both slices' DoD.

## 1. Assumptions — Slice 0 is mandatory

**This spec was written from the meta-repo, where `minion_hub/` is not checked out** (the meta-repo
`.gitignore` excludes every subproject; verified: no `personal-agent.service.ts` on disk here). The
file path comes from `P4.1-brains-consolidation`; the test-file path and line 159-179 reference come
from `2026-08-13-agentic-sdlc-test-quality-gates-spec` §S6; the `:282` line number comes from the
proposal (written today, so strong, but line numbers move the moment anyone else touches the file).
Treat every path, line and symbol below as a **lead, not a fact**. Slice 0 converts them to fact; if
something moved, correct §3 of this spec in the same commit rather than testing a different function
in silence.

Five carried claims are load-bearing:

1. **`loadPersonalAgentForUser` is exported.** Its caller is a `+layout.server.ts` in another
   directory, so it almost certainly is. If it is *not*, see ⚠️ A1 before touching the source.
2. **The suite `src/server/services/personal-agent.service.test.ts` already exists** and uses a
   `mock-db` helper (per §S6: "check `mock-db` captures args first"). New cases are appended to it;
   do not create a second suite for the same module.
3. **The black-box stub lives in a *caller's* test**, not in the service's own suite — most likely
   the `(app)` layout-load test. If it turns out to live in the service's own suite, the direct
   tests cannot go in that file until the self-mock is scoped (Slice 0 decides; see §2 S1 "Do").
4. **The 401 branch keys off a missing tenant context**, not a missing user — the proposal says
   "401-no-ctx". If the real guard is `!locals.user`, or if there are *two* guards, the test names
   and the mutation spot-check target change accordingly. Correct this spec, don't test the wrong
   predicate.
5. **`bun run test <file>` is a working invocation in hub.** The proposal's DoD names it literally.
   Other hub specs use `bun run vitest run <file>`, and `2026-08-13-agentic-sdlc-test-quality-gates-spec`
   §S3 records the hub gate as `bunx svelte-kit sync && bun run check && bunx vitest run --retry=2`.
   These may all be the same thing behind a package script. Slice 0 runs the proposal's exact
   command; if it does not accept a file filter, record the working equivalent in the PR and use it
   in the DoD blocks below — the DoD is "the suite runs green from a documented command", not
   "this exact string parses".

**Branch discrepancy to settle before branching.** AGENTS.md's project map says hub's branch is
`dev`; `2026-08-13-crm-customers-server-pagination-spec` states `origin/dev` was **deleted** and the
live base is `origin/master`. Run `git -C minion_hub branch -r` and branch off whatever is actually
live. Do not create or resurrect a branch to match the docs.

### Slice 0 — recon (≤ 40 min, prepended to S1, not counted as a slice)

```bash
cd minion_hub
git branch -r                                                    # settle the base branch (above)
test -f src/server/services/personal-agent.service.ts
rg -n 'loadPersonalAgentForUser' src/ --type ts                  # real line no. + every call site
rg -n -B5 -A45 'function loadPersonalAgentForUser' src/server/services/personal-agent.service.ts
#   ^ from this one output, write down: (a) is it `export`ed? (b) the exact 401 predicate,
#     (c) the exact dynamic-import specifier string, (d) the delegate it calls and with which args,
#     (e) EVERY other branch in the body (early returns, try/catch, null coalescing)
rg -n 'from .@sveltejs/kit.|\berror\(4' src/server/services/personal-agent.service.ts
rg -n 'vi\.mock|vi\.doMock|mockResolvedValue' src/server/services/personal-agent.service.test.ts
rg -rn "vi\.mock\(.*personal-agent" src/ --type ts               # ← the black-box stub(s); note each file
rg -n 'mock-db|mockDb' src/server/services/personal-agent.service.test.ts src/**/mock-db*  # helper shape
rg -n 'personal-agent' src/routes/\(app\)/+layout.server.ts      # the every-page-load caller
cat package.json | rg -n '"(test|check|lint:.*)":'               # settle assumption 5
bun run test src/server/services/personal-agent.service.test.ts  # baseline: green BEFORE any edit
rg -n 'alias|\$server' vite.config.* svelte.config.* vitest.config.* 2>/dev/null | head
#   ^ does `$server/...` resolve in the vitest run? decides the vi.mock key (see §0 hazard 2)
```

Record the actuals in the PR description. Nothing in Slice 0 changes a file.

## 2. Approach — two vertical slices

```
S0 (recon) ─▶ S1 (the two DoD paths, falsifiable) ─▶ S2 (remaining branches + anti-black-box guard)
```

**S1 alone satisfies the proposal's Definition of Done** and is safe to ship on its own. S2 pays off
the proposal's *Problem* sentence in full ("real branching … only mocked as a black box") by
covering the branches S1 doesn't and by making a future re-black-boxing visible. If the wave needs
to cut scope, cut after S1 — but then AGENTS.md's **open-items ledger** rule applies: a
`TODO(handoff):` comment at the top of the new `describe` block naming the uncovered branches, plus
an appended entry on the source proposal.

---

### S1 — The 401 guard and the happy delegation path, proven falsifiable

**Tags:** `test` · **Estimate:** 4–6 h

**Goal:** `loadPersonalAgentForUser` is called *directly* — not through a caller, not through a
stub — for both paths the proposal names, and each new test provably fails when its branch is
inverted.

**Do:**
- Append one `describe('loadPersonalAgentForUser', …)` block to
  `src/server/services/personal-agent.service.test.ts`. Import the **real** function from the
  **shipped module path** (never a copied reimplementation — §S7 rubric).
- **Resolve the self-mock question first** (Slice 0 finding 3). If the service's own suite contains a
  module-level `vi.mock()` of `personal-agent.service` itself, the new `describe` is vacuous there:
  either narrow that mock to the specific exports the old cases need (`vi.mock(path, async (orig) =>
  ({ ...(await orig()), someExport: vi.fn() }))`) or place the new block in a sibling file
  `personal-agent.service.entrypoint.test.ts` with no self-mock. Prefer narrowing; record which you
  chose and why in the PR.
- **Solve the dynamic-import seam** using the specifier string exactly as it appears in the source
  (Slice 0 finding c). Register the mock with hoisted `vi.mock` when one shape serves every case; use
  `vi.doMock` + `await import('./personal-agent.service')` inside the test when the delegate must
  differ per case. Assert the seam actually took: the mocked delegate must have been *called* — if
  its call count is 0 in the happy path, the real module loaded and the test is lying.
- **401 case:** invoke with a context/locals shape that has no tenant ctx (the exact predicate from
  Slice 0 finding b). Assert on the **status**, not the message:
  `await expect(fn(noCtx)).rejects.toMatchObject({ status: 401 })` (or `isHttpError(e) && e.status === 401`
  if the codebase already imports that helper). Additionally assert the delegate was **not** called —
  a guard that throws *after* doing the work is a different, worse bug and this is what catches it.
- **Happy case:** supply a valid ctx + user and a delegate stub returning a distinctive sentinel.
  Assert (i) the sentinel is returned unchanged by the entry point, **and** (ii) the exact arguments
  the delegate received (ctx identity, user id, any derived agent id — reuse `mock-db`'s arg capture
  per §S6 rather than inventing a second fake). Argument assertions are the part that survives a
  refactor of the delegate; a return-value-only assertion would pass even if the entry point passed
  the wrong user's id — which on this code path means showing user A the personal agent of user B.
- **No network, no DB, no gateway** in these tests: the personal-agent create path makes privileged
  gateway calls (P4.1). Stub at the module seam and assert `fetch` was never called.

**Files:** `src/server/services/personal-agent.service.test.ts` (or the sibling entrypoint test file,
per the self-mock decision). **No source file is edited in S1** unless ⚠️ A1 applies.

**Definition of done (machine-checkable):**
```bash
bun run test src/server/services/personal-agent.service.test.ts   # or the Slice-0-confirmed equivalent
#   - 401 case: rejects with status 401 AND the delegate mock has 0 calls
#   - happy case: returns the delegate's sentinel AND the delegate was called exactly once
#                 with the expected (ctx, userId, …) arguments
#   - global fetch mock: 0 calls in both cases

# MUTATION SPOT-CHECK (the `test`-tag gate, §4b) — run, capture output in the PR, then `git checkout` the source:
#   1. invert the guard in personal-agent.service.ts (`if (!ctx)` → `if (ctx)`)
#        → the 401 case must FAIL. Restore.
#   2. break the delegation (pass a wrong/empty user id to the delegate)
#        → the happy case must FAIL on the argument assertion. Restore.
git diff --quiet src/server/services/personal-agent.service.ts    # source restored / untouched
bun run check                                                     # 0 errors / 0 warnings
git diff --name-only <base>...HEAD | grep -E '\.svelte$' && echo "FAIL: no UI in this spec" && exit 1
```

---

### S2 — The rest of the branching, and a guard against re-black-boxing

**Tags:** `test` · **Estimate:** 4–5 h

**Goal:** every branch Slice 0 enumerated in the function body is exercised by a direct call, and the
caller-side black-box stub can no longer hide a regression without someone noticing.

**Do:**
- Cover the branches beyond the two in S1, from Slice 0 finding (e). Expected candidates — confirm
  against the real body, do **not** invent tests for branches that don't exist:
  - the dynamic import **failing** (module rejects) — does the page load 500, or degrade? Assert
    whatever it actually does, then decide: if it swallows the error silently, that is a *finding*,
    not a test to write around. File it as a new proposal (do not fix it here — "refactoring the
    function" is out of scope) and add a `TODO(handoff):` at the site.
  - the delegate throwing (provisioning not yet complete / gateway unreachable) — per
    `2026-05-26-auth-token-simplification` §2.1 the surrounding backfill is fire-and-forget, so the
    expectation is that a *page load* does not die on a provisioning hiccup. Assert the real
    behavior.
  - ctx present but user/session partially populated (the `AUTH_DISABLED` and Supabase branches of
    `appHandle` build different-shaped locals) — at minimum one non-Better-Auth-shaped ctx.
- **Anti-recurrence guard:** at each caller-side `vi.mock('…personal-agent…')` found in Slice 0, add a
  one-line comment pointing at the direct suite (`// black-box stub: real branching is covered in
  personal-agent.service.test.ts`), so the next reader knows the coverage exists elsewhere rather
  than assuming it doesn't exist at all. Do not delete the caller stubs — a layout test mocking a
  service is correct isolation, not a defect.
- If hub's `scripts/test-integrity-lint.mjs` exists (shipped by `2026-08-13-agentic-sdlc-test-quality-gates-spec`
  §S5), run it and keep the baseline **decreasing or flat**; new cases must not introduce
  assertion-free blocks, `expect(true)`, or `expect` inside `catch`/`if`. If the script does not
  exist yet, say so in the PR — do not build it here.
- Remove any `TODO(handoff):` left by a cut-short S1.

**Files:** `src/server/services/personal-agent.service.test.ts` (+ the sibling entrypoint file if S1
created one), and the caller test file(s) from Slice 0 — **comment-only edits** there.

**Definition of done (machine-checkable):**
```bash
bun run test src/server/services/personal-agent.service.test.ts
#   - one direct-call case per branch listed in the PR's Slice 0 body inventory; the inventory and
#     the test names are pasted side by side in the PR so the mapping is reviewable
bun run vitest run                       # full hub suite green; no new skips, no `it.skip` without a reason
bun run check
node scripts/test-integrity-lint.mjs --ci 2>/dev/null || echo "(integrity lint not present — noted in PR)"
git diff --name-only <base>...HEAD       # only *.test.ts files; zero non-test source files
```

---

## 3. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `src/server/services/personal-agent.service.test.ts` | S1, S2 | new `describe` for the entry point: 401 guard, delegation args, remaining branches |
| `src/server/services/personal-agent.service.entrypoint.test.ts` | S1 | **only if** the existing suite self-mocks the module (Slice 0 finding 3) |
| caller test with the black-box stub (path from Slice 0) | S2 | comment-only pointer to the direct suite |
| `src/server/services/personal-agent.service.ts` | — | **not edited** — except the ⚠️ A1 `export` case |

All paths relative to `minion_hub/`. Zero `.svelte` files, zero schema files, zero migrations, zero
`package.json` changes.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". This spec adds test files to one repo; every
zone in that table is inert here, and the table below records *why* rather than leaving it implied:

| Surface | Impact | Evidence / mitigation |
|---|---|---|
| `minion_site` (shares the DB + Better Auth with hub) | **None** — no schema, no auth config, no runtime code changed | `git diff --name-only` in the S2 DoD is all `*.test.ts` |
| `@minion-stack/auth` | **None** — hub passes `provisionPersonalAgent` in as a *closure* via `hooks`; the package never imports the hub service (`.planning/phases/06-auth-extraction/06-RESEARCH.md`, Anti-Pattern 1). Testing the hub side cannot reach the package | no changeset, no version bump |
| `@minion-stack/db` / `@minion-stack/shared` | **None** — no schema, no WS frame type | — |
| `minion/` gateway | **None at runtime** — but the personal-agent create path makes privileged gateway calls (P4.1), so a badly-stubbed test could open a real socket in CI | S1 DoD asserts `fetch` has 0 calls |
| `paperclip-minion`, `pixel-agents`, `minion_plugins` | **None** | — |
| meta-repo `packages/*` | **None** — verified in this checkout: `rg -l 'loadPersonalAgentForUser' packages ops scripts` returns zero hits | re-run at PR time |

### ⚠️ A1 — if the function is not exported, that is a source edit and needs a call

The proposal's out-of-scope is "refactoring the function." Adding an `export` keyword to an existing
function is **not** a refactor — no signature, no behavior, no call site changes — so if Slice 0
finds it unexported, add the `export` and say so explicitly in the PR title and body. What is *not*
allowed under this spec: splitting the function, changing its parameters to make it easier to test,
extracting the guard, or adding a dependency-injection seam. If the function genuinely cannot be
called directly without one of those (e.g. it closes over module-private state initialized by an
import side effect), **stop and write a follow-up proposal** for the seam rather than smuggling a
refactor in under a `test` tag — and in the meantime deliver the coverage through the narrowest
possible caller-level test, documented as a deviation from the DoD.

### ⚠️ A2 — `personal-agent.service.test.ts` is contended

`2026-08-13-agentic-sdlc-test-quality-gates-spec` §S6 owns a **separate** edit to this same file
(`:159-179` — "assert the values passed to `.set()` (status/error), not just `db.update` called").
That work is *not* part of this spec and must not be silently absorbed into it. Before starting,
`git log -3 --oneline -- src/server/services/personal-agent.service.test.ts` and check for an open PR
touching it; expect to rebase. Scope commits narrowly to the new `describe` block. If S6's fix has
already landed, reuse the `mock-db` arg-capture pattern it established instead of writing a second
one.

### ⚠️ A3 — a green suite is not evidence; the mutation output is

The single highest-probability failure of this task is a suite that passes while asserting nothing
real (self-mock, unresolved dynamic import, message-matched `HttpError`). The mutation spot-check in
S1's DoD is therefore not optional decoration — **its captured output is the deliverable**, pasted
into the PR body. A PR without a "test failed when I inverted the guard" transcript does not pass G4
for this spec regardless of a green CI run.

## 5. Out of scope (explicit)

- **Refactoring `loadPersonalAgentForUser`** (the proposal's own exclusion) — no extracted guard, no
  injected dependencies, no signature change, no behavior change. See ⚠️ A1 for the one keyword-sized
  exception and its escape hatch.
- **Fixing whatever the new tests reveal.** If a branch turns out to swallow an error, mis-thread a
  user id, or 500 where it should degrade, this spec's job is to *characterize* it: assert the real
  current behavior, add a `TODO(handoff):`, and file a proposal. Changing behavior here would make
  the tests unfalsifiable against the shipped code and blow the out-of-scope line in one move.
- **`2026-08-13-agentic-sdlc-test-quality-gates-spec` §S6's rewrite of `:159-179`** — same file,
  different work (⚠️ A2).
- **Building hub's test-integrity lint** (§S5 of that spec) or any new test infrastructure, config,
  coverage threshold, or Stryker/mutation-testing harness. The mutation check here is a manual,
  documented spot-check, exactly as §4b's `test` lane specifies.
- **Deleting or rewriting the caller-side black-box stubs.** A layout test mocking a service is
  correct isolation; S2 annotates, never removes.
- **Any UI work.** No `.svelte` file is touched, so the `ui` tag and its governance gates
  (`lint:design` / `lint:tokens`, the ui-design-governance skill) do **not** apply to this spec per
  `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **The provisioning pipeline itself** — `personal-agent-provisioner.ts`, `POST /api/personal-agent/create`,
  `derivePersonalAgentId`, `resolveAssistantPrincipal`. Only the layout-load entry point is in scope.
- **E2E / browser coverage of `/my-agent`.** Unit tests only.

## 6. End-to-end verification

Run with both slices merged, on the live hub base branch confirmed in Slice 0.

```bash
cd minion_hub

# 1. The proposal's DoD, literally
bun run test src/server/services/personal-agent.service.test.ts     # green (or Slice-0 equivalent, recorded in PR)

# 2. Gates (test-tagged: no design/token lint — see §5)
bunx svelte-kit sync && bun run check                                # 0 errors / 0 warnings
bun run vitest run                                                   # full hub suite green, no new skips

# 3. Falsifiability — the actual deliverable (⚠️ A3). Capture each transcript in the PR body.
#    a. invert the 401 guard in personal-agent.service.ts  → the 401 test FAILS   → git checkout the file
#    b. pass a wrong user id to the delegate               → the happy test FAILS → git checkout the file
#    c. after both restores: `git diff --quiet src/server/services/personal-agent.service.ts`

# 4. The tests exercise the real module, not a stub
rg -n "vi\.mock\('.*personal-agent\.service'\)" src/server/services/personal-agent.service.test.ts
#    → must return nothing (a bare self-mock), or only a narrowed `async (orig) => ({...await orig()})` form

# 5. Blast radius is exactly what was promised
git diff --name-only <base>...HEAD
#    → only *.test.ts files (plus, at most, a single `export` keyword on the service — ⚠️ A1)

# 6. The page path still works (no source change should mean no behavior change — verify, don't assume)
#    bun run dev, sign in, load any authenticated page → /my-agent renders, no 401, no white screen
```

**Ship gate:** §6 all green; the mutation transcripts from step 3 pasted in the PR; Slice 0's recorded
actuals reconciled against §3 with any correction committed to this spec in the same PR; ⚠️ A1 and
⚠️ A2 each explicitly answered in the PR body (exported y/n; contended-file rebase status).
