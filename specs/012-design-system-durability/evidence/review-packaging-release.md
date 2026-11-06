# Independent review — packaging, consumer install and release-clone hygiene

Reviewer: independent Claude agent, 2026-10-16 (America/Lima). Read-only on product files.
Scope: design-system durability (Spec Kit 012), the four uncommitted clones under
`/home/nikolas/.cache/codex-implementation/design-durability-2026-10-16/`.
Runs used: `git status/diff`, `diff -rq`, `cmp`, `sha256sum`, `tar -tzf/-xOzf`, `grep`,
`node scripts/generate-css.mjs --check`, `node scripts/generate-inventory.mjs --check`,
`node --test packages/design-tokens/tests/contract.test.mjs` (8/8),
`node --test scripts/pack-design-system.test.mjs` (6/6), `node scripts/spec-index.mjs --check`,
`node scripts/proposal-index.mjs --check` (both clones). No build, svelte-check or full suite.

Disclosure: in `meta-release` the inherited `scripts/proposal-index.mjs` (main's version) has no
`--check` mode and rewrote `proposals/index.json` when I invoked it. The result is byte-identical
to the pre-existing working-tree diff (same 17-line insertion vs `85539ae`), so no content changed;
noted as finding M-R3 because the same thing will happen to anyone following the dev-side recipe.

## Scope reviewed

### 1. meta (`feat/design-system-durability`, base `17bce12f`, PR → dev)
Modified: `.claude/skills/ui-design-governance/SKILL.md`, `packages/design-tokens/{README.md,
contract.json, contract.schema.json, package.json, tokens.css, utilities.css,
scripts/contract.mjs, tests/contract.test.mjs}`, `packages/ui/{README.md, src/lib/Checkbox.svelte,
FormField.svelte, Radio.svelte, Toggle.svelte}`, `proposals/index.json`, `specs/index.json`,
`scripts/pack-design-tokens-readiness.mjs`, `scripts/pack-ui-button-readiness.mjs`.
Untracked: `.changeset/design-system-durability.md`, `packages/design-tokens/{inventory.json,
scripts/generate-inventory.mjs, tests/inventory.test.mjs}`, `packages/ui/src/lib/{FormField.test.svelte,
control-targets.test.ts, form-field.test.ts}`, `proposals/2026-10-16-design-system-durability.md`,
`scripts/pack-design-system.mjs`, `scripts/pack-design-system.test.mjs`,
`specs/012-design-system-durability/`, `specs/2026-10-16-design-system-durability-spec.md` (+ `.review.md`).

### 2. site (`feat/design-system-durability`, base `82887a9d`, PR → dev)
Modified: `.github/workflows/ci.yml`, `bun.lock`, `deps/design-token-provenance.json`, `package.json`,
`scripts/design-lint.mjs`, `scripts/token-integrity.test.mjs`, `src/lib/ui-button-artifact.test.ts`.
Untracked: `deps/design-system-provenance.json`,
`deps/minion-stack-design-tokens-0.1.1-durability.h3bfd6bda….tgz`,
`deps/minion-stack-ui-0.1.0-durability.hf35a998e….tgz`, `scripts/design-lint.test.mjs`.

### 3. site-release (`release/design-system-durability`, base `0ed4e1b1`, PR → master, PRODUCTION)
`git diff --name-only 0ed4e1b` + `git status --porcelain`, every path:
- M `.github/workflows/ci.yml`
- M `bun.lock` (only the 4 lines for the two design packages change; verified by diff)
- M `package.json` (two `file:deps/…` entries; `lint:tokens` → `node scripts/token-integrity.mjs`; new `test:tokens`)
- M `scripts/design-lint.mjs`
- ?? `deps/design-system-provenance.json`
- ?? `deps/design-token-provenance.json`
- ?? `deps/minion-stack-design-tokens-0.1.1-durability.h3bfd6bda….tgz`
- ?? `deps/minion-stack-ui-0.1.0-durability.hf35a998e….tgz`
- ?? `scripts/design-lint.test.mjs`
- ?? `scripts/token-integrity.mjs`
- ?? `scripts/token-integrity.test.mjs`
- ?? `src/lib/ui-button-artifact.test.ts`
No member/product source, route, i18n or server file is touched. The only `src/` path is the
artifact test. Confirmed.

### 4. meta-release (`release/design-system-durability`, base `85539aee`, PR → main, PRODUCTION line)
Modified: `.claude/skills/ui-design-governance/SKILL.md`, `packages/design-tokens/{README.md,
contract.json, contract.schema.json, package.json, scripts/contract.mjs, tests/contract.test.mjs,
tokens.css, utilities.css}`, `packages/ui/{README.md, src/lib/Button.svelte, Checkbox.svelte,
FormField.svelte, Radio.svelte, Toggle.svelte, primitives.test.ts}`, `proposals/index.json`, `specs/index.json`.
Untracked: `.changeset/design-system-durability.md`, `packages/design-tokens/{audit.mjs, inventory.json,
scripts/generate-inventory.mjs, tests/audit.test.mjs, tests/inventory.test.mjs}`,
`packages/ui/src/lib/{FormField.test.svelte, control-targets.test.ts, form-field.test.ts}`,
`proposals/2026-10-16-design-system-durability.md`, `scripts/pack-design-system.mjs`,
`scripts/pack-design-system.test.mjs`, `scripts/pack-design-tokens-readiness.mjs`,
`scripts/pack-ui-button-readiness.mjs`, `scripts/qc/` (package-provenance.mjs + test only),
`specs/012-design-system-durability/`, `specs/2026-10-16-design-system-durability-spec.md` (+ `.review.md`).

`diff -rq -x node_modules` meta-release vs meta:
- `packages/ui/src`: **identical**.
- `packages/design-tokens`: only `package.json` differs (release keeps `"version": "0.2.0"`, dev has
  `0.1.0`; the files/exports/scripts hunks are identical) and `CHANGELOG.md` exists only in the
  release clone (main carries it; dev does not). Both divergences are the intended "keep 0.2.0 and
  changelogs" state. `packages/ui/package.json` untouched on release (0.2.0).
- All 23 paths in `design-meta-release-package-copy-list.json` are present; `scripts/qc/package-provenance.mjs`
  and its test are byte-identical to dev (`cmp`).
- The release `scripts/` tree does NOT carry dev-only backlog (`board-ranking-catalog*`, `pack-shared-*`,
  `pack-workforce-*`, `qc/bridge-runtime*`, `qc/handoff-ledger*`, `qc/migration-*`, `qc/release-evidence*`,
  `qc/repo-truth*`, `qc/package-consumer-matrix*`, `qc/proposal-requirement-map*` are absent). Good.
- Indices were regenerated, not copied: release `proposals/index.json` entry lacks the `effort` field that
  the dev index has (main's older script does not emit it) and release counts are 202 specs / 156 proposals vs
  dev 287 / 804.

## Verdict per clone

| Clone | Verdict |
|---|---|
| meta | **PASS WITH FINDINGS** (all LOW) |
| site | **PASS WITH FINDINGS** (all LOW) |
| site-release | **PASS** (scope strictly honored; inherits site LOW S1/S2) |
| meta-release | **PASS WITH FINDINGS** (all LOW) |

No BLOCK or HIGH finding. No gate was weakened, no immutable archive was overwritten, and nothing
installed in a consumer differs from the canonical receipt.

## Findings (real defects / risks only; severity, file:line, scenario, minimal fix)

### meta

**M1 — LOW — `.changeset/design-system-durability.md:2-3` — `patch` understates public surface change.**
Scenario: `@minion-stack/design-tokens` gains two new public exports (`./audit`, `./inventory.json`,
`packages/design-tokens/package.json:25,32` in meta-release) and `@minion-stack/ui` changes Toggle's DOM
contract (new `data-part="toggle-track"` wrapper; `data-part="toggle"` is now the transparent hit target,
`Toggle.svelte:60-84`) and FormField's rendering (helper now co-rendered with error). A consumer styling
`[data-part='toggle']` as the track, or asserting helper absence while an error is shown, changes behavior
on a "patch". Minimal fix: `minor` for both packages, one sentence naming the two exports and the Toggle
hook rename.

**M2 — LOW — `packages/ui/src/lib/FormField.svelte:38-40` vs `:67-82` — describedby order ≠ DOM order.**
`aria-describedby` is `"<id>-helper <id>-error"` (helper first) while the template renders the error span
before the helper span. Screen readers announce helper then error; sighted users read error then helper.
Not broken, but pick one. Minimal fix: swap the two `{#if}` blocks (helper, then error) so DOM order
matches the announced order and `form-field.test.ts:8` stays green.

**M3 — LOW — `packages/design-tokens/utilities.css:187-191` — coarse label `display:flex` can lose to Tailwind `.block`.**
`Checkbox.svelte:55` / `Radio.svelte:52` keep `class="block …"` on the label; the coarse rule
`[data-part='checkbox-label'] { display:flex; align-items:center }` has equal specificity (0,1,0), so the
winner is stylesheet order in each consumer (meta memory: "Tailwind SOURCE order wins"). `min-height`/
`min-width` still apply (the measured 44×44 target holds), only vertical centering of the label text is
order-dependent. Minimal fix: `label[data-part='checkbox-label']` (0,1,1) in utilities.css, or drop `block`
from the two labels.

**M4 — LOW (informational) — `scripts/pack-design-system.mjs:110-115` — installed identity is not reproducible from `main`.**
`sourceDigest` hashes the source `package.json` bytes including `"version"`. Dev has `0.1.0`
(sha `cf864133…`, the one in the receipt), main keeps `0.2.0` (sha `1c5e28d4…`). A re-pack from `main` after
promotion yields a different `h<digest>` for byte-identical CSS/contract/inventory/audit members. The receipt
remains internally consistent (it names its own `authoringSources`), consumers validate installed bytes, so
this is not a defect of this change — but reviewers must not expect `pack-design-system.mjs` on `main` to
re-mint `h3bfd6bda…`. If reproducibility from the release line is wanted later: digest the manifest with
`version` normalized to `definition.baseVersion`. Record this in evidence rather than change the packer now.

### site

**S1 — LOW — `scripts/design-lint.mjs:52-79` + `.github/workflows/ci.yml:35` — compares against the base tip, not the merge-base.**
`DESIGN_LINT_BASE_REF = pull_request.base.sha` is the base branch tip at event time. If `dev` reduces debt in
`src/x.svelte` after the PR branched and the PR has not rebased, `git show base:src/x.svelte` (less debt) vs
the PR working tree (older, more debt) reports a regression the PR never introduced. Direction is fail-closed
(cannot admit debt), cost is a false red fixable by rebase. Minimal fix: in `fileRegressions`,
`const base = git(['merge-base', resolved, 'HEAD'])` after the `rev-parse --verify`. Same for site-release.

**S2 — LOW — `scripts/design-lint.mjs:55-58` — a renamed file that carries existing debt fails the ratchet.**
`git diff --name-only` with default rename detection lists only the new path; `git show base:newpath`
throws → previous 0 → current N → FAIL. Again fail-closed, and arguably what "debt may only decrease"
wants; just know that moving a debt-carrying `.svelte` requires paying the debt. Document it in the
script header, or add `--no-renames` so both paths are evaluated (old: N→0, new: 0→N still fails).
Either way this cannot be used to transfer debt, which is the invariant that matters.

### site-release

No release-specific finding. The only code difference vs `site` is the intended default base
(`'origin/master'` at `scripts/design-lint.mjs:103` and its test line 64) and prettier formatting of the
three test files (same assertions, verified by diff). Two now-unreferenced archives remain in `deps/`
(`minion-stack-design-tokens-0.1.0-concourse-r2.tgz`, `minion-stack-ui-0.1.0-r2.tgz`); HANDOVER §Packages
explicitly keeps historical archives, so this is a recorded decision, not a defect.

### meta-release

**M-R1 — LOW — `scripts/pack-design-tokens-readiness.mjs`, `scripts/pack-ui-button-readiness.mjs` (untracked) — dead stubs added to `main`.**
Both files are new on the release line (main never had the readiness packers) and consist solely of a
`throw`. They exist only because `scripts/pack-design-system.test.mjs:102` ("retired fixed-version packers
fail before writing output") spawns them. Minimal fix: either keep them (harmless, 5 lines each) and say
so in the PR body, or guard that one test with `existsSync` and drop the two stubs from the release clone.
Do not let this become a reason to diverge the packer test between dev and main.

**M-R2 — LOW (informational) — `packages/design-tokens/package.json` adds `audit.mjs` to `files` and `./audit` to `exports` on a 0.2.0 → 0.2.1 `patch` changeset.** Same root as M1; approved as a prerequisite, but the semver label should be `minor`.

**M-R3 — LOW (process) — main's `scripts/proposal-index.mjs` has no `--check`; it writes.** Anyone validating the release clone with the dev recipe (`--check`) silently regenerates `proposals/index.json`. Output was byte-identical here, but the release PR body should state "indices regenerated with the release line's own scripts" and CI on main should be relied on, not a local `--check`.

## Claims verified

Token contract (I02)
- `contract.json` `contractVersion` 1.0.0 → 1.1.0; the only color edits are 12 foreground values across 9 light themes (textTertiary ×9, textSecondary ×2, textPrimary ×1); no `aliases`/`domainAliases` hunk; no forbidden name (`--accent`, `--color-background`, `--color-bg1`, `--color-error`, `--color-primary*`) in `tokens.css`/`utilities.css`.
- `contract.contrast.normalText` is schema-pinned by `const` (`contract.schema.json:98-124`), so the matrix cannot be shrunk; test asserts `18×3×5 = 270` and `normalTextContrastFailures(contract)` is empty; a negative control re-injects gruvbox-light `#716c5f` and must fail on `surface3`.
- Contrast is computed on resolved colors: every `theme.colors[*]` used by the matrix is a literal 6-digit hex (checked all 18 themes × 8 roles, 0 non-hex), and `parseHex` throws on anything else (`contract.mjs:61-66`), so a non-literal cannot produce a silent `NaN` pass.
- `generate-css.mjs --check` and `generate-inventory.mjs --check` exit 0 in both meta and meta-release → `tokens.css`/`inventory.json` are generator output, not hand edits. `contract.test.mjs` 8/8.

Shared controls (I02 / "Shared controls preserve caller semantics")
- Toggle keeps `role="switch"`, `aria-checked`, `aria-label`, `{disabled}`, `type="button"`, `{...rest}` spread first (so caller `tabindex` survives) on the single `<button>`; track/thumb are `aria-hidden` spans. `control-targets.test.ts` asserts exactly one `<button>`, `tabindex="-1"` and `disabled` preserved.
- Checkbox/Radio only add `data-part="checkbox-label"`/`"radio-label"`; native `for`/`id` association unchanged.
- Coarse rules live only inside `@media (pointer: coarse)` (`utilities.css:173-196`); fine-pointer blocks are untouched by the diff. Packed `utilities.css` contains `min-width: var(--control-height-touch)` twice (shared `.control-target/[data-part=button]/[data-part=toggle]` block and the label block) — the radio-label 37.17 px regression fix is in the installed archive.

Packer (I01/I08)
- Version = `${baseVersion}-durability.h${sha256({inputDigests, recipe})}`; recipe includes node, pnpm, `packageManager` and the packer's own sha → any content, toolchain or packer change changes the version (`pack-design-system.mjs:44-52,110-115`).
- Repeat-pack byte equality enforced via `assertNoVersionDigestConflict` (`:171-175`); packed member set must equal the canonical allowlist and each member must byte-equal the snapshot (`:176-185`).
- Authoring-source fence: `collectAuthoringSources()` before build and after qualification, plus a second `snapshotPackage` digest compare (`:259-272`).
- `validateExports` requires every `exports`/`svelte`/`types`/`main`/`module` path to be an exact packed member; token kind additionally requires `./inventory.json` export (`:67-81,108-109`).
- Output is `wx`-flagged into a fresh directory and removed wholesale on failure (`:205-231`).
- Retired readiness packers `throw` at module top before any I/O. `pack-design-system.test.mjs` 6/6 (includes "retired fixed-version packers fail before writing output", symlink/missing-export rejection, and "same input keeps version while changed member receives a different version").

Consumers (site, site-release)
- Canonical receipt sha256 = `f53996517d83223776fb9fbb0cccf57fa9ed5459ca7ea33a8a85b426e6c98477`; `deps/design-system-provenance.json` in both clones has the same sha; `ui-button-artifact.test.ts` pins exactly that value (site:37, site-release:56).
- Archive sha256 in both `deps/`: tokens `9cb3b707…77450`, ui `f6b7ee0c…baf7cd` — equal to the receipt.
- `package.json` and `bun.lock` (workspace + resolution lines) reference exactly `minion-stack-design-tokens-0.1.1-durability.h3bfd6bda….tgz` and `minion-stack-ui-0.1.0-durability.hf35a998e….tgz`; the lock diff touches only those 4 lines in each clone.
- `deps/design-token-provenance.json` = the receipt's token package entry + `sourceRepository`/`baseCommit`/`canonicalReceipt: "design-system-provenance.json"` (values match field-for-field).
- Packed `utilities.css`, `tokens.css`, `contract.json` are byte-identical to meta's working-tree sources (`diff` → no output); `sourceMembers.package.json` sha `cf864133…` = meta's `packages/design-tokens/package.json`.
- Token tgz has the 8 canonical members; UI tgz has 30 members, no `.test.` files.
- `token-integrity.test.mjs` asserts the exact token version string (site:64, site-release:64-67) and the negative mutation now removes a real production consumer token (`--color-text-secondary`) instead of `--color-accent`, which production has no consumer for (HANDOVER item 8).

Site gates (I08)
- Per-file ratchet: `fileRegressions` resolves `rev-parse --verify <ref>^{commit}` first → missing base throws → `design-lint failed`, exit 1 (fail-closed); tests cover debt transfer to a new file, untracked governed CSS, missing base, explicit/CI/default base precedence (`design-lint.test.mjs`, 5 tests).
- CI passes the exact base SHA (`pull_request.base.sha || event.before`, zero-SHA fallback to `HEAD^`), and `actions/checkout` uses `fetch-depth: 0` in both site workflows, so that SHA is present.
- Global `BASELINE` ratchet retained alongside the per-file one; `process.exit` replaced by `exitCode` with a top-level `try/catch` that cannot swallow into a pass.
- site-release `lint:tokens` moves from the old in-script `--tokens` mode (with the hand-maintained `--page-max` cap 10) to `scripts/token-integrity.mjs`, which delegates to the installed `@minion-stack/design-tokens/audit` with the same 8 forbidden legacy tokens; `--page-max` is now produced by the installed contract (test asserts 10 resolved consumers), so the TODO(handoff) ratchet is retired by a real producer, not by deleting the check.

Release hygiene
- site-release: no product/member code changed (full path list above).
- meta-release: `packages/ui/src` byte-identical to dev; design-tokens differs only by `version` 0.2.0 and the main-only `CHANGELOG.md`; `packages/ui/package.json` untouched; `Button.svelte`/`primitives.test.ts` deltas are the approved role/tabindex prerequisite and match dev byte-for-byte; `scripts/qc/` holds only the approved provenance helper + test; no dev backlog scripts present; indices regenerated by the release line's scripts (field set differs from dev's, counts 202/156).
- Spec/proposal frontmatter: flat scalars + string arrays per `specs/TEMPLATE.md` / `proposals/TEMPLATE.md`; `spec-index.mjs --check` and `proposal-index.mjs --check` pass in meta; `spec-index.mjs --check` passes in meta-release (proposal index: see M-R3).

## Not verified (out of budget or needs a runtime)

- Browser-measured 44×44 targets for Checkbox/Radio/Toggle under `(pointer: coarse)` with the *installed* archive, and that the checkbox mark size equals `--space-4` (the `margin-top: calc((44 - var(--space-4))/2)` centering assumes it). HANDOVER says the corrected archive is not yet browser-tested.
- Hub/site consumers that pass `class=` to Toggle (the class now lands on the hit target, not the track) or style `[data-part='toggle']` as a track — grep of hub/site product code not performed.
- `svelte-check`, `bun run build`, vitest run of `ui-button-artifact.test.ts` against a fresh `bun install --frozen-lockfile` (needs node_modules state; RAM-constrained, other gates running). The lock/manifest/receipt/archive layer was verified by hash; the `installed()` walk of `node_modules/@minion-stack/*` was not re-executed here.
- `changeset status` in meta-release (fails locally: no `main` ref in the clone) — CI's `changeset:status --since=origin/main` is the authority.
- Whether `@minion-stack/design-tokens/audit` scans `.ts` consumers (`setProperty('--x')`, style strings) as the retired `--tokens` mode did; the shared auditor is already the dev gate, so this is parity with dev, not a regression introduced here, but it was not inspected.
- `node --test packages/ui` / vitest for `control-targets.test.ts` and `form-field.test.ts` (require the ui package's vitest env).
- Vercel deployment source SHA / production alias (release not yet executed).
