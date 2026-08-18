---
id: 2026-08-18-site-vendored-tgz-untracked-spec
title: "Vendored tgz untracked — the tarball is committed; build the gate that keeps it committed and stops it masking its source"
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-site-vendored-tgz-untracked
verdict: pending
repos: [minion_site, minion-meta]
tags: [deps, infra]
type: infra
---

# Vendored design-tokens tgz untracked

**Owner surface:**
`minion_site` — `scripts/deps-lint.mjs` (new), `deps/README.md`, `package.json`,
`git-hooks/pre-push`, `.github/workflows/ci.yml`.
`minion-meta` — `packages/design-tokens/vendored-snapshots.json` (new),
`packages/design-tokens/tests/vendored-parity.test.mjs` (new),
`packages/design-tokens/README.md`.

**Target repos:** `NikolasP98/minion-site` (private, default branch `master`, work branch `dev`)
and this meta-repo. The meta-repo `.gitignore` excludes subprojects, so there is no local
`minion_site/` checkout — every fact about it in §1 was read from the GitHub API on 2026-08-18
and is quoted, not remembered.

**Decision the proposal leaves open** ("owner's call on timing"): **the timing question is
already resolved — the redesign landed and the tarball went with it.** §1 proves it. This spec
therefore does not re-commit anything; it builds the gate that makes the next occurrence
impossible to push, and closes the second-order hazard the same incident exposed.

**Design ancestors:**
[`2026-08-13-ci-minion-site-ci-spec`](2026-08-13-ci-minion-site-ci-spec.md) — owns
`minion_site` CI triggers, `ci:local`, and the pre-push gate. This spec adds one check to
those surfaces and **must not** re-litigate them (see §5 A1).
[`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
per-slice tags are the routing unit. Both slices below are `deps`, which pulls the
**lockfile-consistency gate** and the **changelog/breaking-change scan**; S1 is additionally
`infra` (workflow lint on the `ci.yml` edit).

---

## 0. Product

From the approved proposal `2026-08-17-site-vendored-tgz-untracked`, verbatim:

> # Vendored design-tokens tgz untracked — fresh clone bun install fails on dev
>
> ## Problem
>
> package.json file: dep points at deps/…concourse-r2.tgz which git status shows untracked
> (prior tgz deleted). Fresh CI/clone cannot install.
>
> ## Definition of done
>
> tgz committed alongside package.json/bun.lock when the redesign lands (owner's call on timing).
>
> ## Out of scope
>
> The redesign content itself (owner's active lane).
>
> ## Gate note 2026-08-18
>
> PARKED: belongs to the in-flight site redesign (owner lane); commit the tgz with that work.

---

## 1. State of the world at spec time (verified, not assumed)

**The proposal's literal definition of done is already satisfied.** Do not skip this section —
it is what makes the rest of this spec the right work rather than a re-fix of a closed card.

| Fact | Evidence (GitHub API, 2026-08-18) |
|---|---|
| The proposal's premise was true when filed (2026-08-17, `debt-sweep-2`) | Operator memory `minion-site-impeccable-redesign.md`: *"BUILD COMPLETE 2026-08-16, still NOTHING COMMITTED (63 files: 22 M · 25 D · 16 ??)"* |
| It was closed by the owner **the same day the sweep filed it** | Same memory file: *"✅ COMMITTED + PUSHED 2026-08-17 — `f05bfa2..7f4c3b2` on site `dev`; 4 grouped commits: vendored `concourse-r2.tgz` deps · design-lint gate · the redesign itself · tooling"* |
| `minion-site@dev` HEAD is that commit | `GET /repos/NikolasP98/minion-site/branches` → `dev` = `7f4c3b25` |
| The tarball **is tracked** on `dev` | `GET /contents/deps?ref=dev` returns `minion-stack-design-tokens-0.1.0-concourse-r2.tgz`, 12,700 bytes, blob `37fae618`. The contents API only lists committed blobs. |
| `package.json@dev` points at exactly that file | line 38: `"@minion-stack/design-tokens": "file:deps/minion-stack-design-tokens-0.1.0-concourse-r2.tgz"` |
| `bun.lock@dev` agrees, in both places it records the spec | line 13 (`dependencies` block) and line 201 (resolution entry) both name `concourse-r2.tgz` |
| The prior tarball is gone from `dev`, as intended | `deps@dev` = `README.md`, `crm-sdk-…776d8c49.tgz`, `design-tokens-…concourse-r2.tgz`, `ui-…r2.tgz`. No `onaccent-3344a63`. |
| `master` is internally consistent too, on the *old* artifact | `package.json@master` line 36 → `…-onaccent-3344a63.tgz`, and that blob is present in `deps@master` |

So a fresh `git clone --branch dev && bun install` succeeds today. **Recommended board action:
flip this card to shipped-by-another-commit rather than routing it to a dev run for the tarball
itself** — the same disposition
[`2026-08-17-meta-spec-index-project-possibly-shipped`](../proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md)
exists to surface.

### 1.1 The findings that reshape this spec

A card that only says "it is green now" would be closed by a commit that already closed it, and
the same class returns on the next revendor. Four things are **live and unfixed**, all verified:

1. **Nothing watches the invariant.** `minion_site/.gitignore` is one line — `node_modules`.
   The tarball was untracked purely because nobody ran `git add`, not because a rule hid it.
   That is the cheapest possible class of defect to lint for, and there is no lint for it.
   `scripts/` on `dev` holds `delete-password-only-users.mjs`, `design-lint.mjs`,
   `migrate-users-to-supabase.mjs`, `smoke-ui-coherence.py` — no deps guard.
2. **The one gate that *would* have caught it never runs on the branch where it happens.**
   `.github/workflows/ci.yml@dev` runs `bun install --frozen-lockfile`, which cannot resolve a
   `file:` dependency whose file is absent — but its triggers are
   `pull_request: branches: [master, main]` and `push: branches: [master, main]`. The redesign
   lived on `dev` for nine days. (Fixing the trigger is **not this spec's job** — see §5 A1.)
3. **The provenance ledger is stale, and states things that are false.**
   `deps/README.md@dev` still documents `minion-stack-design-tokens-0.1.0-r2.tgz` with SHA-256
   `02dc80ad…` — a filename that no longer exists in `deps/` — lists `ui-…-r2.tgz` under a
   pack-time story two revendors old, and omits `crm-sdk-…776d8c49.tgz` entirely. The file that
   is supposed to say what these binaries are is wrong about two of three of them.
4. **🚨 The tarball masks the loss of its own source.** This is the expensive one, and it is a
   recorded incident, not a hypothetical — operator memory
   `minion-site-impeccable-redesign.md`, ★★★:

   > `packages/design-tokens` **WAS REVERTED AT SOURCE** (discovered 2026-08-16). `contract.json`
   > was back to **16 themes with a CLEAN git tree** — both `concourse` themes and all 12
   > `--color-board-*` domain aliases gone, and `tests/contract.test.mjs` back to `length, 16`.
   > **The site kept working only because it runs off the packed `deps/*.tgz` snapshot**, so the
   > loss was invisible until I tried to edit a token. Anyone running `pnpm generate` would have
   > silently dropped the entire site palette. […] **Lesson: a vendored `.tgz` masks the loss of
   > its own source.** After any multi-day gap, verify `contract.json` still contains your themes
   > BEFORE editing — a clean `git status` is not proof the work survived.

   The source is currently intact — verified locally just now:
   `packages/design-tokens/contract.json` has **18 themes** including `concourse` +
   `concourse-day`, all **12** `--color-board-*` aliases are present, and
   `tests/contract.test.mjs:39` asserts `length, 18`. Intact today; nothing prevents the
   silent recurrence tomorrow.

### 1.2 Hard constraints carried in from operator memory

- ★★★ *"A vendored `.tgz` masks the loss of its own source"* (`minion-site-impeccable-redesign.md`)
  — S2 exists solely to serve this. A spec that only checks "is the file committed" would leave
  the more expensive half of the incident unaddressed.
- ★★★ *"The vendored `.tgz` MUST be committed: `package.json` resolves `@minion-stack/design-tokens`
  by `file:deps/…`, so an untracked tarball = broken install for everyone else"* (`MEMORY.md:42`)
  — the invariant S1 encodes, stated by the owner in the owner's own words.
- ★★ *"review churn: strictness must be stakes-proportional"* and ★ *"slice-scoped dev runs
  mandatory (monolith = 101-turn burn)"* (`sdlc-board-triage-and-phase-gates.md`) — this is a
  `value: 6 / effort: S` card. Two slices, no more. S2 deliberately asserts **containment, not
  hash equality**, for the same reason (§3 S2 rationale).
- ★★ *"`tests/contract.test.mjs` hardcodes the theme COUNT, bump 16→18 deliberately"* — the
  existing count assertion is real but was itself reverted alongside the contract. S2 must not
  simply add a second count.

---

## 2. Why a gate, and why these two

`bun install --frozen-lockfile` already fails hard on a missing tarball. The gap is **where and
when** it fails: after a push, on a branch this repo's CI does not watch, to whoever clones next
— which in the recorded case was going to be CI on the eventual `dev → master` merge, nine days
downstream of the mistake. S1 moves that same failure to the machine that made it, before the
push, in under a second.

S2 is a different failure entirely and shares only a cause. Vendoring decouples the consumer from
the source: the consumer keeps building from a snapshot, so the source can rot, revert, or be
truncated with a clean `git status` and nothing anywhere goes red. S1 cannot see this — the
tarball is committed, the lockfile agrees, the site builds. Only a check that reads the *source*
and asks "does it still contain what I shipped?" can.

Retiring the vendoring altogether (publish `@minion-stack/design-tokens@0.2.0`, use a version
range) dissolves both problems and is what `deps/README.md` itself anticipates. It is out of
scope here (§6) — it is a coordinated multi-package release, not an `effort: S` card.

---

## 3. Approach — one recon + two vertical slices

### Slice 0 — recon (≤ 30 min, prepend to whichever slice runs first)

Re-verify §1 before writing code; this spec was written against a snapshot and the site repo is
an owner-active lane.

```bash
gh api repos/NikolasP98/minion-site/contents/deps?ref=dev --jq '.[].name'
gh api repos/NikolasP98/minion-site/contents/package.json?ref=dev --jq .content \
  | base64 -d | grep -n 'file:deps'
node -e "const c=require('./packages/design-tokens/contract.json');
  console.log(Object.keys(c.themes).length, 'themes',
  ['concourse','concourse-day'].every(t=>t in c.themes) ? 'OK' : 'MISSING')"
```

**Stop and re-spec if:** `deps@dev` no longer lists a design-tokens tarball, `package.json` no
longer uses `file:deps/`, or the contract is back under 18 themes (then §1.1(4) has recurred and
S2 becomes urgent, not preventative).

---

### S1 — `lint:deps`: a vendored tarball cannot be missing, untracked, orphaned, or misdescribed

**Repo:** `minion_site` (branch `dev`) · **Tags:** `deps`, `infra` · **Size:** ~4–6 focused hours

Add `scripts/deps-lint.mjs`, modelled on the existing `scripts/design-lint.mjs` in the same
repo — same shebang-and-docblock shape, same `--selftest` flag, same "print every violation,
then exit non-zero" reporting. Five rules:

| Rule | Assertion | Catches |
|---|---|---|
| `R1 exists` | every `file:deps/*.tgz` value in `package.json` (`dependencies` + `devDependencies`) resolves to a file on disk | the deleted-tarball half of the filed defect |
| `R2 tracked` | each of those files is tracked — `git ls-files --error-unmatch <path>` exits 0 | **the filed defect itself** |
| `R3 lockfile` | `bun.lock` names the identical path for that package, in *both* the `dependencies` block and the resolution entry (lines 13 and 201 today) | a hand-edited `package.json` that never got a `bun install` |
| `R4 no orphan` | every `deps/*.tgz` on disk is referenced by `package.json` | the superseded `onaccent` tarball left behind on a revendor |
| `R5 ledger` | every `deps/*.tgz` appears as a row in `deps/README.md` with a SHA-256 that matches the file, and every row names a file that exists | §1.1(3) — the ledger drifting into fiction |

Implementation notes that the implementer should not have to rediscover:

- **`bun.lock` is JSONC, not JSON** (trailing-comma-free but comment-tolerant in Bun's writer).
  Do not `JSON.parse` it blind — either strip comments first or match the dependency strings with
  a regex anchored on the package name. Compare **strings**, not parsed semver.
- **R2 needs a git dir.** `actions/checkout@v4` provides one, so CI is fine. If `git rev-parse
  --is-inside-work-tree` fails, print `R2 SKIPPED (no git dir)` and exit non-zero **only** when
  `--require-git` is passed; CI and the pre-push hook pass it. A silent skip is how a gate becomes
  decorative.
- **Rewrite `deps/README.md` as part of this slice.** It is currently wrong (§1.1(3)); R5 cannot
  go green against it. Regenerate the table from the three tarballs actually on `dev`, with real
  `sha256sum` output, and keep the existing closing paragraph about replacing these with published
  `0.2.0` versions — that intent is still correct.
- Wire `"lint:deps": "node scripts/deps-lint.mjs"` and
  `"lint:deps:selftest": "node scripts/deps-lint.mjs --selftest"` into `package.json`, mirroring
  the `lint:design` pair.
- **Wiring is conditional on what exists at implementation time** (§5 A1): if
  `2026-08-13-ci-minion-site-ci-spec` S2 has landed and a `ci:local` script exists, add
  `lint:deps --require-git` to *that* and touch nothing else. If it has not, add one step to
  `.github/workflows/ci.yml` immediately **before** `bun install` (it must run before the install
  it is protecting) and one line to `git-hooks/pre-push`.

**Definition of done — machine-checkable, run from the `minion_site` root:**

```bash
bun run lint:deps --require-git                 # exit 0 on dev tip
bun run lint:deps:selftest                      # exit 0; ≥1 synthetic fixture per rule R1–R5
node -e "process.exit(/R[1-5]/.test(require('fs').readFileSync('scripts/deps-lint.mjs','utf8'))?0:1)"

# negative control for the filed defect — must FAIL, naming R2, then restore:
git rm --cached deps/minion-stack-design-tokens-0.1.0-concourse-r2.tgz
bun run lint:deps --require-git; test $? -ne 0   # and stderr matches /R2/
git add deps/minion-stack-design-tokens-0.1.0-concourse-r2.tgz

# ledger truth (R5), independently:
sha256sum deps/*.tgz | while read h f; do grep -q "$h" deps/README.md || { echo "MISSING $f"; exit 1; }; done
grep -c '\.tgz' deps/README.md                   # ≥ 3 — one row per tarball

# nothing else regressed:
bun run lint:design && bun run format:check && bun run check
```

Plus the `deps` gate tag's own requirement: `bun install --frozen-lockfile` leaves `bun.lock`
byte-identical (`git diff --exit-code bun.lock`).

---

### S2 — the snapshot can no longer mask its source

**Repo:** `minion-meta` (branch `dev`) · **Tags:** `deps`, `test` · **Size:** ~4–8 focused hours

Record, in the meta-repo, what each downstream vendored snapshot depends on, and fail the
meta-repo's own test run when the source stops providing it.

**1. `packages/design-tokens/vendored-snapshots.json`** — a small registry, one entry per
consumer artifact:

```json
{
  "$comment": "Downstream repos vendor packed snapshots of this package (file:deps/*.tgz). Each entry records what that snapshot relies on. See README.md §Revendoring.",
  "consumers": [
    {
      "repo": "minion-site",
      "branch": "dev",
      "artifact": "deps/minion-stack-design-tokens-0.1.0-concourse-r2.tgz",
      "packedFromCommit": "fd1878d",
      "requiresThemes": ["concourse", "concourse-day"],
      "requiresTokens": [
        "--color-board-recess", "--color-board-flap", "--color-board-flap-raised",
        "--color-board-hinge", "--color-board-frame", "--color-board-legend",
        "--color-board-legend-dim", "--color-board-lamp", "--color-board-on-lamp",
        "--color-board-void", "--color-board-void-surface", "--color-board-cleared"
      ]
    }
  ]
}
```

(`packedFromCommit` above is the meta-repo commit that added the concourse themes; the
implementer records whatever `git rev-parse --short HEAD` was at the real pack. Theme ids and
all 12 aliases are copied verbatim from the current `contract.json`, verified in Slice 0.)

**2. `packages/design-tokens/tests/vendored-parity.test.mjs`** — a `node --test` file asserting,
for every consumer entry: each `requiresThemes` id is a key of `contract.themes`, and each
`requiresTokens` name appears in the generated `tokens.css`. Failure message must name the
consumer, the artifact, and the missing ids.

**Rationale for containment rather than a content hash — this is the load-bearing design
decision.** Two tempting alternatives are both wrong here:

- *Hash the `.tgz`.* `npm pack`/`bun pm pack` output is **not byte-reproducible** — gzip records
  an mtime and the archive's entry order is not pinned — so "repack and compare" produces false
  reds. (A hash of the *committed file*, which never gets repacked, is fine, and that is exactly
  what S1's R5 does. The distinction matters: R5 verifies a file against its own record; a repack
  hash would verify a build against a record, and cannot.)
- *Assert equality of the source contract against the snapshot's contents.* Then every legitimate
  token addition turns the gate red, which is churn, and churn is how a gate gets deleted —
  ★★ *"strictness must be stakes-proportional"*.

Containment fails on exactly one thing: something a shipped snapshot depends on disappearing from
the source. That is the recorded incident and nothing else.

**Honest limit, to be written into the test's docblock:** this is a speed bump, not proof. A
revert that also deletes the consumer entry still passes — just as the 2026-08-16 revert also
reset `contract.test.mjs` to `length, 16`. Its value is that the deletion now has to be
*deliberate and legible in the diff* (removing a named downstream consumer), rather than a number
changing.

**3. `packages/design-tokens/README.md` — a §Revendoring section** giving the one procedure that
keeps S1's ledger and S2's registry honest together: pack → record the sha256 in the consumer's
`deps/README.md` → update or add the `vendored-snapshots.json` entry with the pack-time commit →
`git add` the tarball → run both gates. Six lines; the point is that it exists at the moment
someone is doing it.

**No workflow edit is required, and that is verified:** `packages/design-tokens/package.json`
declares `"test": "node --test tests/*.test.mjs"`, so the glob picks the new file up, and the
meta-repo's `.github/workflows/ci.yml` already runs `pnpm run test-all` (`pnpm -r --parallel
--if-present run test`).

**Definition of done — machine-checkable, from the meta-repo root:**

```bash
node -e "const r=require('./packages/design-tokens/vendored-snapshots.json');
  const c=require('./packages/design-tokens/contract.json');
  if(!r.consumers.length) process.exit(1);
  for(const x of r.consumers) for(const t of x.requiresThemes) if(!(t in c.themes)) process.exit(1)"

cd packages/design-tokens && pnpm test          # exit 0; output names vendored-parity
pnpm run check:generated                        # exit 0 — generated CSS still matches contract

# negative control — must FAIL naming 'concourse' and 'minion-site', then restore:
cp contract.json /tmp/contract.bak
node -e "const f='contract.json',c=require('./'+f);delete c.themes.concourse;
  require('fs').writeFileSync(f,JSON.stringify(c,null,2)+'\n')"
pnpm test; test $? -ne 0
cp /tmp/contract.bak contract.json

cd ../.. && pnpm run test-all                   # exit 0 — the new test runs under the fan-out
```

---

## 4. Files touched (consolidated)

| File | Slice | Action |
|---|---|---|
| `minion_site/scripts/deps-lint.mjs` | S1 | **new** — R1–R5 + `--selftest` + `--require-git` |
| `minion_site/deps/README.md` | S1 | rewrite the table to current truth (3 tarballs, real sha256); keep the de-vendoring closing note |
| `minion_site/package.json` | S1 | add `lint:deps`, `lint:deps:selftest` (scripts block only) |
| `minion_site/.github/workflows/ci.yml` | S1 | one step before `bun install` — **only if** `ci:local` does not exist yet (§5 A1) |
| `minion_site/git-hooks/pre-push` | S1 | one line — **only if** `ci:local` does not exist yet (§5 A1) |
| `packages/design-tokens/vendored-snapshots.json` | S2 | **new** — consumer registry |
| `packages/design-tokens/tests/vendored-parity.test.mjs` | S2 | **new** — containment assertions |
| `packages/design-tokens/README.md` | S2 | **new §Revendoring** |

No `.svelte` file is edited anywhere in this spec, so the UI-governance skill and
`lint:tokens`/`lint:design` review axes do not apply (`lint:design` still runs in S1's DoD purely
as a no-regression check).

## 5. Cross-repo impact

### ⚠️ A1 — file collision with `2026-08-13-ci-minion-site-ci-spec` (mitigated by sequencing)

That spec (verdict `approved`, pass 2) owns three of the same files: its **S2** creates a
`ci:local` script and rewrites the gated section of `git-hooks/pre-push`; its **S3** adds `dev`
to the `ci.yml` triggers — the exact gap §1.1(2) describes.

**Mitigation:** this spec claims **no** authority over triggers or over `ci:local`'s composition.
S1's wiring step is written as a conditional (§3 S1) precisely so that whichever lands second
adds one entry rather than rewriting a section. The semantic content does not conflict — one adds
a check, the other decides when checks run. **Recommended order: land the CI spec's S3 first**;
until `dev` is a CI-triggering branch, S1's CI step is protection for `master` pushes only, and
the pre-push hook carries the load.

### 🚨 A2 — `minion_hub` carries the identical pattern and is not fixed here (alert)

Verified 2026-08-18: `minion_hub@master` (its default branch) vendors **four** tarballs —
`crm-sdk-…776d8c49`, `db-0.9.4-ui-coherence-7942d0d8`, `design-tokens-…onaccent-3344a63`,
`ui-0.1.0-ui-coherence-6b21ce0e` — all currently tracked, so hub is **exposed but not broken**.
Note that hub is pinned to the *superseded* `onaccent` design-tokens snapshot, which makes it a
second consumer whose source dependencies nobody records.

This is a different repo with its own proposal lane, and folding it in would blow an `effort: S`
card into a three-repo change. **No work here.** Filed as an alert for the maintenance lane:
S1's `deps-lint.mjs` is deliberately written with no `minion_site`-specific paths beyond
`deps/` and `deps/README.md`, so porting it to hub is a copy plus a ledger rewrite. Precedent for
this disposition: `2026-08-13-ci-minion-site-ci-spec` §5 A3, which made the same call about the
same repo.

### ⚠️ A3 — the next `dev → master` merge will fire R4, correctly

`master` currently vendors `onaccent-3344a63.tgz`; `dev` vendors `concourse-r2.tgz`. When the
redesign merges to `master`, the old tarball must be deleted in that merge or **R4 (no orphan)
fails**. That is the gate working — an unreferenced 11.8 KB binary is exactly what it exists to
catch — but the implementer should expect it rather than diagnose it. Memory records that this
merge direction is not a fast-forward (*"`dev` is NO LONGER a FF onto master"*), so the deletion
is a deliberate step in that merge, not an automatic consequence.

### ℹ️ A4 — meta-repo CI runs on `main` only

`.github/workflows/ci.yml` here triggers on `pull_request`/`push` to `main`. S2's work lands on
`dev`, so the new test will not run in CI until a `main` merge. Mitigated by S2's DoD requiring a
local `pnpm run test-all`. No workflow change proposed — retriggering meta CI on `dev` is a
meta-repo policy question well outside a `value: 6` card.

### ℹ️ A5 — the real fix is de-vendoring, and this spec does not block it

Publishing `@minion-stack/design-tokens@0.2.0` and replacing `file:deps/*.tgz` with a version
range deletes both problems and every file in §4. `deps/README.md` already names this as the
intended end state. When it happens, S1's `deps-lint.mjs` becomes a no-op (zero `file:deps/`
dependencies → zero rules to evaluate → green) and S2's registry entry is deleted. Neither
becomes an obstacle. Out of scope (§6).

## 6. Out of scope (explicit)

- **The redesign content itself** — the proposal says so, and it has shipped regardless.
- **Re-committing or re-packing any tarball.** §1 proves `dev` is consistent. If Slice 0 finds
  otherwise, that is a re-spec trigger, not a silent expansion.
- **`minion_site` CI triggers, `ci:local`, and the pre-push hook's composition** — owned by
  `2026-08-13-ci-minion-site-ci-spec` S2/S3 (§5 A1).
- **`minion_hub`'s four vendored tarballs** — alert only (§5 A2).
- **Publishing `@minion-stack/*` to npm / de-vendoring** (§5 A5).
- **The contents of `@minion-stack/ui`, `@minion-stack/crm-sdk`, `@minion-stack/db`** — S1 treats
  their tarballs as opaque blobs to be tracked and hashed; S2's registry covers design-tokens
  only, because that is the package with a recorded source-loss incident.
- **The open redesign items in operator memory** (hero sells mechanism not method; pricing CTA
  wording; no `/forgot-password` route) — owner's lane, unrelated to deps.
- **Raising or lowering `design-lint.mjs`'s ratchet baseline** — S1 only requires it stays green.

## 7. End-to-end verification

Run after both slices. This reproduces the proposal's exact failure scenario — a fresh clone —
and then proves the gate catches it at the source rather than at install time.

```bash
# 1. The proposal's literal claim, tested the way it was filed:
rm -rf /tmp/site-fresh
git clone --branch dev --depth 1 git@github.com:NikolasP98/minion-site.git /tmp/site-fresh
cd /tmp/site-fresh
bun install --frozen-lockfile                    # MUST succeed — this is the filed defect
test -f node_modules/@minion-stack/design-tokens/contract.json

# 2. The snapshot actually carries the site's world:
node -e "const c=require('/tmp/site-fresh/node_modules/@minion-stack/design-tokens/contract.json');
  const ok=['concourse','concourse-day'].every(t=>t in c.themes);
  console.log(Object.keys(c.themes).length,'themes;',ok?'concourse OK':'CONCOURSE MISSING');
  process.exit(ok?0:1)"

# 3. The new gate is green on a clean tree:
bun run lint:deps --require-git

# 4. The site still builds end to end:
bunx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
bun run check && bun run format:check && bun run lint:design && bun run build

# 5. The gate fails on the original defect (in the throwaway clone, so no cleanup risk):
git rm --cached deps/minion-stack-design-tokens-0.1.0-concourse-r2.tgz >/dev/null
! bun run lint:deps --require-git                # MUST exit non-zero, naming R2

# 6. Source-parity holds in the meta-repo, and fails when the source loses the site's themes:
cd <meta-repo> && pnpm run test-all
cd packages/design-tokens
cp contract.json /tmp/c.bak
node -e "const f='contract.json',c=require('./'+f);delete c.themes['concourse-day'];
  require('fs').writeFileSync(f,JSON.stringify(c,null,2)+'\n')"
! pnpm test                                      # MUST exit non-zero, naming minion-site
cp /tmp/c.bak contract.json && pnpm test         # green again
```

**Pass condition:** steps 1–4 and the final `pnpm test` exit 0; steps 5 and 6's inverted checks
both fail as instructed, each naming the rule or consumer responsible. Delete `/tmp/site-fresh`
afterwards.
