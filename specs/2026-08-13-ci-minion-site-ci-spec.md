---
id: 2026-08-13-ci-minion-site-ci-spec
title: CI red — keep minion-site@master green (env registry, local parity, red-visibility)
stage: spec
status: done
pass: 2
created: 2026-08-13
updated: 2026-08-18
proposal: ci-minion-site-ci
verdict: approved
repos: [minion_site]
tags: [infra]
type: infra
link_review: "pass 2 but has neither \"revises\" nor \"supersedes\" — no predecessor could be determined automatically; add revises: <pass-1 spec id> if a separate predecessor spec exists, or supersedes if this replaces a different spec"
---

# CI red — keep `NikolasP98/minion-site@master` green

**Owner surface:** `minion_site` — `.github/workflows/ci.yml`, `git-hooks/pre-push`,
`.env.example`, `package.json`, `scripts/check-public-env.mjs`, `CLAUDE.md`
**Target repo:** `NikolasP98/minion-site` (private, default branch `master`; the meta-repo
does not check this subproject out — see §1)
**Decision required by the proposal ("the fix may be code, CI config, or retiring the
workflow — say which"):** **CI config.** The workflow is kept. It is the only automated
gate this repo has, and §2 explains why retiring it is the wrong call.

---

## 0. Product

From the approved proposal `ci-minion-site-ci`, verbatim:

> # CI red — CI on NikolasP98/minion-site@master
>
> Filed automatically by the factory CI watch: the most recent completed run of
> this workflow on the deploy branch failed. Approving sends it into the spec
> pipeline; the fix may be code, CI config, or retiring the workflow (say which).
>
> **Definition of done:** the workflow's latest completed run on `master` is
> green, or the workflow is deliberately removed/disabled with rationale.
>
> ## Latest failure
>
> - run: https://github.com/NikolasP98/minion-site/actions/runs/30767780401
> - checked: 2026-08-13
>
> ```
> Error: Module '"$env/static/public"' has no exported member 'PUBLIC_SUPABASE_ANON_KEY'.
> …
> svelte-check found 4 errors and 0 warnings in 2 files
> error: script "check" exited with code 1
> ```

## 1. State of the world at spec time (verified, not assumed)

Everything in this section was read from the GitHub API on 2026-08-13 against
`NikolasP98/minion-site`. The meta-repo's `.gitignore` excludes subprojects, so there is no
local checkout; file contents below come from the repo's `master` tip
(`56149da4`) and are quoted, not remembered.

**The proposal's literal definition of done is already satisfied.** Do not skip this
section — it is what makes the rest of the spec the right work rather than a re-fix.

| Fact | Evidence |
|---|---|
| The cited failure is real and was the latest completed `master` run *when the proposal was filed* | run `30767780401`, `push`/`master`/`31b5aa05`, `failure`, 2026-08-02T21:23:37Z |
| It was already fixed **before the proposal was approved** | commit `4847196a` "fix: apply PR #10 agent-review findings + CI supabase env" (2026-08-13T17:01:58Z) added an `env:` block to `ci.yml` |
| The latest completed `master` run is **green** | run `31726661225`, `push`/`master`/`56149da4`, `success`, 2026-08-13T17:37:47Z — all 8 steps `success` |
| The proposal was filed 17:17:32Z and approved 17:40:25Z; the green run landed 17:37:47Z | git log of `proposals/ci-minion-site-ci.md` vs. the run timestamp — the card went stale ~3 minutes before a human approved it |

The failure mechanism was exactly this and nothing more: two modules import
`PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` from `$env/static/public`
(`src/lib/supabase/client.ts`, `src/lib/server/supabase.ts` — 2 files × 2 names = the
"4 errors in 2 files" in the log). SvelteKit generates the `$env/static/public` module from
the environment **present at check/build time**; those names were never defined in the CI
job, so `svelte-check` reported them as missing exports. `src/routes/(app)/login/+page.svelte`
uses `$env/dynamic/public` instead and is therefore invisible to this failure mode — which
is why only two files broke.

### 1.1 The finding that changes the shape of this spec

`master` CI has been red on **every push since 2026-04-24**. Full history of the `ci.yml`
workflow (43 runs total, 28 on `master`):

```
2026-08-13  56149da4  success   ← today, first green master run in 3.5 months
2026-08-02  31b5aa05  failure   ← the proposal's citation
2026-07-15  613cb695  failure
2026-07-03  2f0dae8b  failure
2026-06-30  ded7b625  failure
2026-06-23  bb802a5a / b2ced591 / b571920f / dca28be0   failure ×4
2026-06-18  d7b2fffc  failure
2026-06-12  9faf95f8  failure
2026-06-02  742bbda7 / 756a9e19 / df79dce7 / 66e60b1e   failure ×4
2026-05-28  94ff69c3 / b362f28d                         failure ×2
2026-05-26  9f42bf0d / ab682498 / 6f8ab7de / 1b3e705d   failure ×4
2026-05-20  4e53026f  failure
2026-04-24  7007749e / 60a92d6c                         failure ×2
2026-04-21  8db35e88 / 511efb2c / a7dd5979               success ×3
```

24 consecutive red pushes to the deploy branch. The PR that produced the cited failure
(`#9`, `feat/install-sh`) had **its own red CI run** (`30767652636`) and was merged anyway.

So: a spec that only confirms "it is green now" would be closing a card that a different
commit already closed, and the same class of failure would return on the next
`$env/static/public` import. **The deliverable of this spec is that the green stays green** —
specifically, that CI derives its env from the committed registry rather than a hand-copied
pair of names, that the local gate and the CI gate check the same things, and that a red
`master` becomes visible in hours rather than 11 days.

### 1.2 Hard constraint — branch protection is not available

```
$ gh api repos/NikolasP98/minion-site/branches/master/protection
403 — "Upgrade to GitHub Pro or make this repository public to enable this feature."
```

The repo is **private on a plan without protected branches**. Required status checks,
"block merge on red", and linear-history enforcement are all off the table. Every
enforcement mechanism in this spec must therefore be client-side (the pre-push hook) or
after-the-fact (§S4 visibility). This is alert **A1** and it constrains S2 and S4 —
do not write a slice that assumes a required check.

## 2. Why the workflow is kept, not retired

The proposal explicitly allows "retiring the workflow" as an outcome. Rejected, because:

- `ci.yml` is the **only** automated correctness gate in the repo. The three sibling
  workflows (`claude.yml`, `claude-code-review.yml`, `thermonuclear-review.yml`) are
  LLM review jobs — advisory, not gates, and `claude.yml` runs `skipped` on `master`.
- The site deploys from `master` to Vercel. Vercel runs its own `vite build`, so a red
  `bun run check` does not by itself block a deploy — but the failing class of error
  (**missing `$env/static/public` name**) *is* a build-time error and would take the
  production deploy down. CI is the cheap place to find it.
- The workflow is not flaky. Its 24 failures were 24 true negatives that nobody acted on.
  The problem was never the signal; it was that nothing consumed it.

## 3. Approach — four vertical slices

Each slice is ~4–8 focused hours, lands independently, and leaves `master` green at every
commit boundary. S1 is the one that closes the reported failure class; S2–S4 are what stop
it recurring. They are independent and may land in any order, but the listed order is
cheapest-value-first.

```
S1 (CI derives env from .env.example + guard)   ─┐
S2 (local gate == CI gate, and it installs)     ─┼─▶  E2E verification (§7)
S3 (CI covers what the repo has; reproducible)  ─┤
S4 (red master becomes visible)                 ─┘
```

### Slice 0 — recon (≤ 30 min, prepend to whichever slice is done first)

Re-verify §1 before writing code; this spec was written against `master` at `56149da4` and
the repo is actively moving (three merges to `master` on 2026-08-13 alone).

```bash
gh run list -R NikolasP98/minion-site -w ci.yml -b master -L 3 \
  --json databaseId,conclusion,headSha,createdAt
#   expect: latest completed run on master is `success` on the current master tip.
#   If it is red again, read the log FIRST — a new failure is new work, not this spec.

git clone git@github.com:NikolasP98/minion-site.git && cd minion-site   # or reuse a checkout
test -f .github/workflows/ci.yml && test -f .env.example && test -f git-hooks/pre-push
rg -n '\$env/static/public' src/          # expect exactly src/lib/supabase/client.ts
                                          # and src/lib/server/supabase.ts
rg -n 'PUBLIC_' .env.example              # the name registry S1 keys off
git config --get core.hooksPath           # expect EMPTY — see S2
bun install --frozen-lockfile && bun run check   # must pass locally before you change anything
```

If `rg '\$env/static/public'` returns files beyond the two above, S1's guard is still
correct — but add them to the S1 DoD's expected output so the count assertion is honest.

---

### S1 — CI derives its public env from `.env.example`, and drift fails loudly

**Goal:** the exact failure in the proposal becomes structurally impossible: a new
`$env/static/public` import either resolves in CI automatically or fails with a one-line
message naming the undeclared variable, instead of a `svelte-check` "has no exported member".

**Why not just leave `4847196a`'s fix:** it hard-codes two names in `ci.yml`:

```yaml
env:
  PUBLIC_SUPABASE_URL: https://gxvsaskbohavnurfvshr.supabase.co
  PUBLIC_SUPABASE_ANON_KEY: ci-placeholder-anon-key
```

That is a second, undeclared copy of a registry that already exists (`.env.example`, which
is the documented name list for the `@minion-stack/env` 6-layer resolver). Two copies drift;
this one drifted for 3.5 months. The third import to be added will drift it again.

**Do:**

- Replace the literal `env:` block with a step that materializes every `PUBLIC_*` name found
  in `.env.example` into `$GITHUB_ENV`, before `bun run check`:
  - use the value from `.env.example` when it is non-empty (so the real, already-public
    Supabase project URL keeps being used),
  - otherwise synthesize `ci-placeholder-<lowercased-name>`.
  - Emit one `NAME=value` line per var into `$GITHUB_ENV`, and separately echo one
    `public env: <NAME>` line per var (name only, never the value) to the step's stdout so a
    future failure is one glance to diagnose.
- Add `scripts/check-public-env.mjs`: parse every `import { … } from '$env/static/public'`
  in `src/`, collect the imported identifiers, and exit 1 listing any that `.env.example`
  does not declare. Message must name the file, the identifier, and the fix
  ("add `<NAME>=` to .env.example").
- Wire it as `"check:env": "node scripts/check-public-env.mjs"` in `package.json`, and run it
  in CI **before** `bun run check` (fast, and its error message is legible where
  `svelte-check`'s is not).
- Leave `$env/dynamic/public` alone — it is resolved at runtime, is not type-checked, and is
  deliberately out of this guard's scope. Say so in a comment in the script.

**Files:** `.github/workflows/ci.yml`, `scripts/check-public-env.mjs` (new),
`package.json` (one script), `.env.example` (only if Slice 0 finds an imported name missing
from it).

**Definition of done (machine-checkable):**

```bash
# 1. Guard passes on clean master
bun run check:env                                    # exit 0

# 2. Guard catches the exact regression from the proposal — negative test, run on a scratch
#    branch, then revert. This is the slice's real proof.
printf "import { PUBLIC_TOTALLY_UNDECLARED } from '\$env/static/public';\nexport const x = PUBLIC_TOTALLY_UNDECLARED;\n" > src/lib/__ci_probe.ts
bun run check:env; test $? -eq 1                     # exits 1
bun run check:env 2>&1 | grep -q 'PUBLIC_TOTALLY_UNDECLARED'   # names the offender
bun run check:env 2>&1 | grep -q '__ci_probe.ts'               # names the file
rm src/lib/__ci_probe.ts

# 3. No hard-coded PUBLIC_ pair survives in the workflow
rg -n 'PUBLIC_SUPABASE_ANON_KEY' .github/workflows/ci.yml   # zero matches

# 4. The derived env is actually applied — the CI log lists the names it exported
gh run view <run-id> -R NikolasP98/minion-site --log \
  | grep -E 'public env: PUBLIC_SUPABASE_URL' 
gh run view <run-id> -R NikolasP98/minion-site --log | grep -vq 'ci-placeholder-public_supabase_anon_key'  # values not echoed

# 5. Nothing regressed
bun run check && bun run build
```

⚠️ The placeholder anon key is a **non-secret dummy**; it must never be a real key, and CI
must never reach Supabase. Keep the existing comment in `ci.yml` explaining that. If a future
step needs a live Supabase call, that is a different job with repo secrets, not this env
block.

**Estimate:** 5–6 h (most of it is the negative test and getting the `$GITHUB_ENV` quoting
right for values containing `=` or `#`).

---

### S2 — The local gate checks what CI checks, and something installs it

**Goal:** a developer cannot push a `master` that CI will reject. Given A1 (no branch
protection), the pre-push hook is the only enforcement point that exists.

**Two defects in the current gate**, both verified:

1. `git-hooks/pre-push` runs `bun run check` + `bun run build` — but **not**
   `bun run format:check`, which CI does run. Evidence that this leaks: commit `1ece9a4d`,
   "chore: prettier pass over files that drifted from format:check", landed the same day as
   the CI fix. Format drift reaches `master` and turns CI red for a reason that has nothing
   to do with correctness.
2. Nothing installs the hook. `git config --get core.hooksPath` is unset on a fresh clone and
   there is **no reference to `hooksPath` anywhere in the repo** (searched). A hook in
   `git-hooks/` that git never reads is documentation, not a gate — which is consistent with
   24 red pushes.

**Do:**

- Add `"ci:local"` to `package.json` running, in CI's order:
  `check:env → check → format:check → test → build`. One script, so hook and workflow can
  never disagree about the list again.
- Rewrite the gated section of `git-hooks/pre-push` to call `bun run ci:local` instead of an
  inlined subset. Keep the existing structure: the `master`-only gate, the logging, and the
  documented `git push --no-verify` escape hatch (do not remove it — a hook that cannot be
  bypassed gets uninstalled).
- Extend the gate to `dev` as well as `master`. `dev` is where work actually lands
  (PR #10 was `dev → master`), and per S3 CI will start running on `dev` pushes.
- Add `"hooks:install": "git config core.hooksPath git-hooks"` plus a `postinstall` (or
  `prepare`) that runs it, so a fresh `bun install` arms the gate. Guard the postinstall to
  no-op outside a git work tree (CI checkouts, tarball installs) so `bun install
  --frozen-lockfile` in the workflow never fails on it.
- Document the one-liner and the escape hatch in `CLAUDE.md` under Commands.

**Files:** `git-hooks/pre-push`, `package.json`, `CLAUDE.md`.

**Definition of done (machine-checkable):**

```bash
# fresh clone arms the hook
rm -rf /tmp/ms && git clone git@github.com:NikolasP98/minion-site.git /tmp/ms && cd /tmp/ms
bun install --frozen-lockfile
test "$(git config --get core.hooksPath)" = "git-hooks"

# the hook runs the same list as CI, in the same order
bun run ci:local                                     # exit 0 on clean master
diff <(rg -o 'bun run [a-z:]+' git-hooks/pre-push | sort -u) \
     <(echo "bun run ci:local")                      # hook delegates, does not re-list steps

# format drift is caught locally now (negative test, revert after)
printf 'export const  x   =    1\n' > src/lib/__fmt_probe.ts
bun run ci:local; test $? -ne 0
bun run ci:local 2>&1 | grep -q '__fmt_probe.ts'
rm src/lib/__fmt_probe.ts

# postinstall is inert outside a work tree (npm pack does not run postinstall, so exercise it directly)
rm -rf /tmp/notgit && cp -r /tmp/ms /tmp/notgit && rm -rf /tmp/notgit/.git
cd /tmp/notgit && bun install --frozen-lockfile   # must not fail: postinstall no-ops without a .git dir
```

**Estimate:** 4–5 h.

---

### S3 — CI covers what the repo actually contains, and is reproducible

**Goal:** close three gaps that make the workflow either weaker or more fragile than it
looks. None of these caused the reported failure; all three are cheap and one of them
(unpinned toolchain) can turn `master` red with no code change at all.

**Do:**

- **Run the tests.** `vitest` is a devDependency, `vitest.config.ts` exists and scopes to
  `src/**/*.test.ts`, and `src/lib/server/identity-sync.test.ts` exists — and CI never runs
  it. Add a `bun run test` step after `format:check`.
- **Pin the toolchain.** `oven-sh/setup-bun@v2` is configured `bun-version: latest`. That is
  an unpinned dependency on the outside world in the repo's only gate. Pin to an explicit
  version (the one the team runs locally, recorded in the same commit), and add a comment
  saying how to bump it.
- **Retire the deprecated action.** The failing run's log ends with:
  `Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to
  run on Node.js 24: actions/checkout@v4`. Move to `actions/checkout@v5`.
- **Add a `concurrency` group** keyed on `${{ github.workflow }}-${{ github.ref }}` with
  `cancel-in-progress: true` for non-`master` refs — several of the historical failure
  clusters are 4 runs inside 40 minutes on the same branch.
- **Trigger on `dev`.** Today `ci.yml` triggers on push/PR to `master`/`main` only, so `dev`
  gets CI *only* via an open PR. Add `dev` to the push trigger. Given A1 this is the
  earliest signal available.

**Files:** `.github/workflows/ci.yml` only.

**Definition of done (machine-checkable):**

```bash
actionlint .github/workflows/ci.yml                  # clean (or: `bunx --bun @rhysd/actionlint`)
rg -n 'bun-version: latest' .github/workflows/ci.yml            # zero matches
rg -n 'actions/checkout@v[0-4]' .github/workflows/ci.yml        # zero matches
rg -n 'bun run test' .github/workflows/ci.yml                   # exactly one match
rg -n 'concurrency:' .github/workflows/ci.yml                   # present
rg -n 'branches: \[master, main, dev\]' .github/workflows/ci.yml # push trigger includes dev

# and a real run, not just a lint:
gh run list -R NikolasP98/minion-site -w ci.yml -b dev -L 1 --json conclusion \
  --jq '.[0].conclusion'                             # "success" after pushing this slice to dev
gh api repos/NikolasP98/minion-site/actions/runs/<id>/jobs \
  --jq '.jobs[].steps[].name'                        # includes a test step; all conclusions success
```

**Estimate:** 4–5 h (the pin needs a local/CI bun-version reconciliation; budget for one
surprise from a newer bun).

---

### S4 — A red `master` is visible in hours, not 11 days

**Goal:** remove the actual root cause of "24 red pushes went unnoticed". Per A1 this cannot
be a required check, so it must be a notification the repo itself emits.

**Do:**

- Add a second job to `ci.yml`, `notify-red`, `needs: [check-and-build]`,
  `if: failure() && github.ref == 'refs/heads/master'`, `permissions: { issues: write }`.
  It opens — or updates, never duplicates — a single issue titled
  `CI red on master` labelled `ci-red`, body containing the run URL, the head SHA, and the
  failing step name. Use `actions/github-script` and search by label before creating.
- Add the mirror: on a green `master` run, if an open `ci-red` issue exists, comment the
  green run URL and close it. A signal that never clears gets muted.
- Keep it inside `ci.yml` — a separate workflow file is a fourth thing to keep in sync.
- Add a `workflow_dispatch` trigger with one input, `force_fail` (boolean, default `false`).
  When `true`, `check-and-build` fails deterministically (e.g. a step that runs
  `exit 1` gated on the input) before its normal work. This is the only way to exercise
  `notify-red` without actually breaking `master`'s real CI — see the DoD below and the
  ⚠️ note on removing/keeping it.
- Document in `CLAUDE.md`: an open `ci-red` issue means **do not merge to master**. That is
  the enforcement A1 leaves us with, and it should be written down rather than assumed.

**Files:** `.github/workflows/ci.yml`, `CLAUDE.md`.

**Definition of done (machine-checkable):**

```bash
# negative test on a scratch branch that pushes to a fork/branch of master is not possible
# without going red on the real master — so prove it with workflow_dispatch instead:
#   add a `workflow_dispatch` input `force_fail` (default false) that fails check-and-build,
#   run it once on master, assert the issue appears, then run it clean and assert it closes.
gh workflow run ci.yml -R NikolasP98/minion-site -r master -f force_fail=true
gh issue list -R NikolasP98/minion-site --label ci-red --state open --json number,title \
  --jq 'length'                                      # == 1
gh workflow run ci.yml -R NikolasP98/minion-site -r master -f force_fail=true   # second red run
gh issue list -R NikolasP98/minion-site --label ci-red --state open --json number --jq 'length'
                                                     # still == 1 (updated, not duplicated)
gh workflow run ci.yml -R NikolasP98/minion-site -r master                      # clean run
gh issue list -R NikolasP98/minion-site --label ci-red --state open --jq 'length'  # == 0
```

⚠️ `force_fail` is a test affordance in the shipped workflow. Either keep it (documented,
defaulting false, only reachable via `workflow_dispatch`) or delete it in the same PR after
the DoD is recorded — reviewer's call, but say which in the PR description.

**Estimate:** 5–7 h (github-script idempotency and the label bootstrap are the work).

---

## 4. Files touched (consolidated)

All paths relative to the root of `NikolasP98/minion-site`.

| File | Slices | Nature |
|---|---|---|
| `.github/workflows/ci.yml` | S1, S3, S4 | env derivation step, guard step, test step, pinned bun, checkout@v5, concurrency, `dev` trigger, `notify-red` job |
| `scripts/check-public-env.mjs` | S1 | new — static public-env drift guard |
| `.env.example` | S1 | only if Slice 0 finds an imported name missing |
| `package.json` | S1, S2 | `check:env`, `ci:local`, `hooks:install`, guarded postinstall |
| `git-hooks/pre-push` | S2 | delegate to `ci:local`; gate `dev` too |
| `CLAUDE.md` | S2, S4 | hook install one-liner; `ci-red` = do-not-merge |

**No file under `src/` is modified by this spec.** That is a load-bearing property — see §5.

## 5. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". This work touches **no** zone,
because it changes no application code:

| Zone / surface | Impact | Basis |
|---|---|---|
| Gateway protocol (`@minion-stack/shared` → hub, site, paperclip) | **None** | no `src/` change; no frame types touched |
| DB schema (`@minion-stack/db`, hub ↔ site shared DB) | **None** | no schema file, no migration |
| Auth (`@minion-stack/auth`, hub ↔ site session continuity) | **None** | `.env.example` gains at most a *name*, never a value or a provider change |
| Agent definition format, workshop/canvas, pixel office, paperclip adapters | **None** | different repos entirely |
| UI design governance (`@minion-stack/design-tokens`, `lint:design`/`lint:tokens`) | **None** | no `.svelte` file is edited, so the governance skill's trigger does not fire |
| Vercel production deploy | **None by construction** | the deploy runs `vite build` from `master`; CI config is not read by Vercel. Do not add a step that mutates `src/`, `svelte.config.js` or `vite.config.ts` — that *would* cross into deploy behavior |
| `minion_hub` | **None**, but see A3 | hub has its own CI; nothing here is shared |

### 🚨 A1 — no branch protection available (constraint, not a risk)

Restated from §1.2 because it invalidates the obvious design. `gh api …/branches/master/protection`
returns **403 — "Upgrade to GitHub Pro or make this repository public"**. Required status
checks do not exist for this repo. Consequences the implementer must respect:

- Do **not** write a slice, runbook step, or DoD that says "make CI a required check".
- The enforcement surface is S2's pre-push hook (client-side, bypassable by design) plus
  S4's `ci-red` issue convention (social).
- If someone later upgrades the plan or makes the repo public, adding a required check on
  `check-and-build` is the correct follow-up — file it then; it is out of scope here.

### ⚠️ A2 — `@minion-stack/lint-config` upgrades can newly block pushes

S2 puts `format:check` into the pre-push gate. `format:check` runs prettier through
`"prettier": "@minion-stack/lint-config/prettier.config.cjs"`, a **caret-ranged**
(`^0.1.1`) dependency shared with the rest of the stack. A formatting-rule change published
upstream would reformat opinions under the team's feet and block pushes that were fine
yesterday — the same floating-dependency failure class S3 fixes for bun.

Mitigation: in the S2 commit, pin `@minion-stack/lint-config` to an exact version
(drop the caret) and note that bumping it requires a `bun run format` pass in the same
commit. `bun install --frozen-lockfile` already pins in CI; this pins for humans.

### ⚠️ A3 — the same guard probably belongs in `minion_hub`, but not from here

`minion_hub` is also SvelteKit + Vercel and plausibly has the same `$env/static/public`
exposure. It is a separate repo with its own CI and was **not inspected** for this spec —
that is a claim I have no evidence for either way. If S1's guard proves out, porting
`check-public-env.mjs` to hub is a good follow-up proposal. Do not widen this spec to do it.

### ℹ️ A4 — feedback for `minion-factory` (no work in this spec)

The proposal was filed at 17:17:32Z citing the then-latest red run, and approved at 17:40:25Z
— by which time a green run (17:37:47Z) had superseded it. The card was stale by ~3 minutes
at the moment a human approved it. Two observations worth a factory-side proposal:

1. The CI watch should re-check the workflow's latest run at **approval** time (and the spec
   stage should re-check again, as §1 of this spec did), or cards will keep arriving
   pre-closed.
2. A watch that files "the latest run failed" cannot distinguish *one* red run from *24
   consecutive* red runs. The streak is the interesting signal and it was invisible on the
   card. Including "N consecutive failures since <date>" would have made this card obviously
   urgent rather than routine.

Neither is actionable in `minion_site`; both are recorded here so the information is not lost.

## 6. Out of scope (explicit)

- **Retiring or disabling `ci.yml`.** Considered and rejected with rationale in §2.
- **The other three workflows** — `claude.yml`, `claude-code-review.yml`,
  `thermonuclear-review.yml`. They are advisory LLM review jobs, not gates. The
  `action_required` runs on 2026-08-13 are a separate matter; if they need fixing, file a
  proposal.
- **Any change under `src/`.** The proposal's failure was a CI-environment defect, not a code
  defect: `src/lib/supabase/client.ts` is correct as written. If a slice finds itself editing
  application code, stop — that is a different spec.
- **The Supabase ↔ Better Auth situation.** `.env.example` carries `AUTH_PROVIDER=supabase`
  while `CLAUDE.md` documents Better Auth, and both dependency trees are installed. That may
  be mid-migration (`specs/2026-05-25-auth-supabase-*`) or may be drift. Either way this spec
  only makes CI *define* the names; it takes no position on which provider wins.
- **Deploy/Vercel pipeline changes**, preview environments, and anything requiring repo
  secrets or a live Supabase connection from CI.
- **New test coverage.** S3 makes CI *run* the existing vitest suite; writing component or
  SSR tests is separate work.
- **Backfilling the 24 historical red runs.** They are explained (§1) and superseded; nobody
  should re-run them.
- **Porting anything to `minion_hub`** — see A3.

## 7. End-to-end verification

Run after all four slices are merged to `master`. Steps 1–3 are the proposal's definition of
done; steps 4–6 are this spec's actual deliverable (that it *stays* green).

```bash
cd minion-site && git checkout master && git pull

# 1. The proposal's DoD, re-proved on a run this work produced
gh run list -R NikolasP98/minion-site -w ci.yml -b master -L 1 \
  --json conclusion,headSha,databaseId --jq '.[0]'
#    conclusion == "success", headSha == current master tip

# 2. Every step green, and the new ones are present
gh api repos/NikolasP98/minion-site/actions/runs/<id>/jobs \
  --jq '.jobs[] | .name, (.steps[] | "  \(.name) → \(.conclusion)")'
#    check-and-build: derive public env / check:env / check / format:check / test / build
#    all "success"; no step "skipped" that should have run

# 3. Local parity — the same gate a developer hits
bun install --frozen-lockfile && bun run ci:local     # exit 0
test "$(git config --get core.hooksPath)" = "git-hooks"

# 4. Regression proof — the reported failure class cannot come back silently.
#    On a scratch branch: add a real import of an undeclared PUBLIC_ var, push, open a PR
#    (S3 scopes ci.yml's push trigger to [master, main, dev] — an arbitrary branch push
#    alone will not fire it; a PR targeting dev/master does, via the pull_request trigger),
#    observe CI fail at `check:env` with the variable name in the message (NOT at
#    svelte-check with "has no exported member"), then close the PR and delete the branch.
git checkout -b ci-probe/undeclared-public-env
printf "import { PUBLIC_PROBE_ONLY } from '\$env/static/public';\nexport const p = PUBLIC_PROBE_ONLY;\n" > src/lib/__ci_probe.ts
git add -A && git commit -m "test: CI probe — undeclared public env (revert)" && git push -u origin HEAD
gh pr create -R NikolasP98/minion-site --base dev --head ci-probe/undeclared-public-env \
  --title "test: CI probe (revert)" --body "Regression proof for check:env — closes without merge."
gh run watch -R NikolasP98/minion-site "$(gh run list -R NikolasP98/minion-site -b ci-probe/undeclared-public-env -L1 --json databaseId --jq '.[0].databaseId')"
gh run view <probe-run-id> -R NikolasP98/minion-site --log | grep -q 'PUBLIC_PROBE_ONLY'
gh run view <probe-run-id> -R NikolasP98/minion-site --log | grep -vq 'has no exported member'
gh pr close -R NikolasP98/minion-site ci-probe/undeclared-public-env
git push origin --delete ci-probe/undeclared-public-env && git checkout master && git branch -D ci-probe/undeclared-public-env

# 5. Visibility proof — a red master surfaces (S4 DoD's workflow_dispatch sequence),
#    then clears. Paste the issue number and its close event into the PR.

# 6. Determinism — two consecutive runs of the same SHA agree
gh workflow run ci.yml -R NikolasP98/minion-site -r master && sleep 60
gh run list -R NikolasP98/minion-site -w ci.yml -b master -L 2 --json conclusion \
  --jq '[.[].conclusion] | unique | length'          # == 1
```

**Ship gate:** §7 steps 1–4 green, step 5's issue lifecycle pasted into the PR, and the
`check-and-build` step list from step 2 pasted into the PR description as the record of what
CI now actually checks. Step 6 is a nice-to-have; a single flake there is a finding, not a
blocker — file it.
