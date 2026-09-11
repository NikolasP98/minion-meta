---
phase: 12-dependency-provenance
plan: "02"
status: complete_uncommitted
requirements_completed: []
---

# 12-02 remove proven dead declarations + replace deprecated locale adapter — SUMMARY

Executed in two private worktrees, both detached from their real remotes:
`git worktree add --detach ~/.cache/claude-tmp/hub-12-02 origin/master`
(minion_hub, base `1df0a921`) and `~/.cache/claude-tmp/site-12-02
origin/dev` (minion_site, base `a23ee4b`). Branch `feat/dep-provenance-12-02`
created in both. Nothing in either live checkout was touched.

**Status is `complete_uncommitted`, not `complete`**: all work is done and
verified with real evidence below, staged (`git add`) in both worktrees,
but `git commit` fails in this environment on every attempt (6 tries
across both worktrees) with `error: 1Password: agent returned an error /
failed to fill whole buffer` / `fatal: failed to write commit object` — the
configured SSH-commit-signing path through 1Password's `op-ssh-sign` is not
responding. Per this repo's own standing rule, signing was never disabled
to force a commit through. See "Blocker" below for exact recovery steps and
current staged state. This SUMMARY documents work as it stands staged,
ready to commit and push the moment signing is available again.

## Task 1 — peer-aware removal trials (hub + site): DONE, fully verified

Dead-code proof, not import-search-alone (per the plan's own warning):

- **`d3-scale`, `d3-shape`, `@types/d3-scale`, `@types/d3-shape`** (hub):
  zero imports anywhere in `src/`, `vite.config.ts`, `svelte.config.js`
  (current sentiment chart uses ECharts, confirmed by
  `.planning/research/360-ui-dependency-verification.md`). Peer check:
  `node_modules/d3-cloud/package.json` depends only on `d3-dispatch` — no
  installed package in this checkout requires `d3-scale`/`d3-shape` as a
  dependency or peer.
- **`@codemirror/lang-sql`** (hub): `CodeMirrorEditor.svelte` imports
  `@codemirror/lang-javascript`, `@codemirror/lang-python`, and
  `@codemirror/legacy-modes/mode/shell` — never `lang-sql`. No other
  installed package peers on it.
- **`@types/dompurify`** (hub): `node_modules/dompurify/package.json` ships
  its own `types`/`typings` fields (`./dist/purify.cjs.d.ts` etc.) — the
  stub is redundant, and real `DOMPurify` imports (`AgentFiles.svelte`,
  `AddSourceDialog.svelte`, `MarkdownMessage.svelte`, `MarkdownView.svelte`,
  `ConversationSidebar.svelte`) are unaffected by removing the stub.
- **Kept, per plan**: `@tiptap/extension-node-range` (exact peer of
  `extension-drag-handle`), Site `postgres` (real peer of
  `@minion-stack/crm-sdk`, confirmed via `packages/crm-sdk/package.json`
  `peerDependencies.postgres: "^3.4.0"` and Site's real dependency on
  `@minion-stack/crm-sdk`), `d3-cloud` and Workshop features.
- **Site `@node-rs/argon2`, `@paper-design/shaders`**: zero real imports —
  the only hits for "argon2"/"paper-design" in Site's `src/` are prose
  mentions in `privacy/+page.svelte` and `terms/+page.svelte` (marketing
  copy describing password hashing), not code. `better-auth`'s installed
  dist (`node_modules/better-auth/dist/*.mjs`) contains no reference to
  either package. Removed.
- Site's Vercel telemetry / TanStack Table major migration: explicitly left
  untouched per the plan ("Optional telemetry package with no measured use
  is a decision record, not automatic product removal" / "A table-library
  major migration is separate evidence, not bundled here").

**Lockfile changes** (each repo's own manager, `bun install`, no
`--force`/no unrelated bumps):

- hub: `bun.lock` — pure deletions (36 lines removed, "Removed: 6" reported
  by bun), no other package version changed.
- site: `bun.lock` — pure deletions (52 lines removed, "Removed: 2"), no
  other package version changed.

**Gates — hub** (all passed, real commands, real output):
- `bun run check`: `COMPLETED 10771 FILES 0 ERRORS 0 WARNINGS`.
- `bun run build`: succeeded twice (1m50s isolated; 3m58s+adapter under
  concurrent system load from unrelated sessions on this shared box — see
  "Environmental note" below). `.vercel/output/functions` populated both
  times, `✔ done`.
- `DESIGN_LINT_BASE_REF=origin/master bun run lint:design`: exit 0, "no
  changed file increased governed debt" (I touched no `.svelte` files).
- `bun run lint:tokens`: exit 0, 0 violations.
- `bunx vitest run src/lib/routes/ src/server/ui-audit/`: not separately
  re-run for Task 1 alone since no route/UI-audit files were touched by
  this task; `bun run check` (svelte-check across the whole tree) already
  covers type-level regressions from the removal.

**Gates — site**:
- `bun run check`: `COMPLETED 4921 FILES 0 ERRORS 0 WARNINGS`.
- `bun run build`: succeeded (`✓ built in 30.82s`, only pre-existing,
  unrelated optional-native-module warnings — `@opentelemetry/api`,
  `bufferutil`/`utf-8-validate`, `/index.node` — present before and after
  this change).

## Task 2 — deprecated Paraglide adapter migration: BLOCKED, not done

`npm view @inlang/paraglide-sveltekit deprecated` confirms: *"use the
paraglide-js package directly with v2 or above ... the sveltekit adapter is
not needed anymore."* Verified the current official replacement is
`@inlang/paraglide-js@2.x`'s own SvelteKit integration (registry: latest is
`2.25.1`; installed here is the deprecated `0.16.1`).

**Why it is not done**: the deprecated package's actual runtime surface —
`createI18n()`, `.handle()`, `.reroute()`, and the link-translation
preprocessor pulled out of its vite plugin — is consumed from:
- `src/lib/i18n.ts` (`createI18n(runtime, { prefixDefaultLanguage: 'always', exclude: [...] })`)
- `src/hooks.server.ts:548` (`i18n.handle()` inside the `sequence(...)` chain)
- `src/hooks.ts` (`export const reroute = i18n.reroute();`)
- `src/lib/canonical-path.ts` (locale-prefix stripping, "equivalent to `i18n.route()`")
- `svelte.config.js` (extracts `.api.sveltePreprocess` off the deprecated
  plugin because `@sveltejs/vite-plugin-svelte@7` removed the
  auto-registration hook it used to rely on)

**None of those five files are in this plan's `files_modified`**
(`minion_hub/vite.config.ts`, `package.json`, `bun.lock`,
`tests/dependencies/locale-parity.test.ts` only). Swapping the package
without editing them breaks routing; editing them is out of this plan's
file ownership. This is exactly the scenario the plan's own Task 2 action
text names: *"If hooks need changing, acquire ownership and split the exact
integration task before editing."* No such ownership grant was available to
this dispatch, so the package/adapter itself was **not** removed —
`@inlang/paraglide-sveltekit` stays at `0.16.1` in `package.json`/`bun.lock`,
unchanged.

**What was delivered instead** — a real, partial regression baseline in
the one owned test file, `tests/dependencies/locale-parity.test.ts` (4
tests, all passing, run against the *current* compiled runtime, no
app/hooks code involved):
1. `sourceLanguageTag === 'en'`, `availableLanguageTags === ['en','es']`.
2. A real generated message key (`a11y0_alerts`) round-trips correctly
   through the *safe per-call* form: `m.a11y0_alerts({}, { languageTag:
   'en' | 'es' })` → `"Alerts"` / `"Alertas"`.
3. That safe per-call form does **not** bleed locale under 20 concurrent
   simulated requests.
4. **A reproduced, real defect, documented not fixed**: the *ambient* form
   the app actually uses (`setLanguageTag()` mutating
   `$lib/paraglide/runtime.js`'s shared module-level `languageTag`
   variable, read later by unqualified `m.key()` calls during page render)
   **does** bleed under concurrency — two simulated requests via
   `Promise.all` with `setLanguageTag('en')` / `setLanguageTag('es')` both
   observe `'es'` (deterministic last-write-wins; not flaky, since both
   synchronous `setLanguageTag` calls complete before either
   `setTimeout` fires). The test asserts `expect(bled).toBe(true)` — a
   characterization of the current, un-fixed state, not a target;
   flipping it to `false` is exactly the acceptance bar the real migration
   (blocked above) must clear.

This required one file beyond the plan's exact list:
**`vitest.config.ts`** — `test.include` was `['src/**/*.test.ts',
'scripts/**/*.test.ts']`, which does not match `tests/**`. Verified
directly: `node node_modules/vitest/vitest.mjs run
tests/dependencies/locale-parity.test.ts` reports "No test files found"
against the unmodified config. Added `'tests/**/*.test.ts'` to the include
array — the exact same shape of fix 12-01's own SUMMARY describes as
"the independently admitted Vitest include glob" for the same reason
(discoverability of a new `tests/dependencies/` file). Two-line diff, no
functional/runtime behavior change.

**Task 2 verify command** (`node node_modules/vitest/vitest.mjs run
tests/dependencies/locale-parity.test.ts && bun run check && bun run
build`) — run as three real, separate commands, all passed:
- vitest: exit 0, 4/4 tests pass.
- `bun run check`: `COMPLETED 10771 FILES 0 ERRORS 0 WARNINGS`.
- `bun run build`: succeeded (`✓ built in 3m 51s`, `.vercel/output`
  produced, adapter completed).

**Open item filed**: `proposals/2026-09-10-hub-paraglide-adapter-migration-followup.md`
(delivered via the 12-03 meta worktree/PR, since `minion_hub` has no
`proposals/` directory — see 12-03-SUMMARY.md's Deviations). TODO(handoff)
comment left at the top of the owned test file pointing at the exact five
unowned blocking sites and the proposal.

## Environmental note (not a regression)

This machine is running many concurrent, unrelated agent worktrees/sessions
(`hub-13-02`, `hub-13-04`, `hub-14-04`, `hub-16-01-15-02`, `hub-09-sec`, all
running their own `svelte-check`/builds simultaneously, confirmed via `ps
aux`). One `bun run build` attempt for Task 2 stalled indefinitely at the
Vercel adapter's packaging step under `free -h` showing 541Mi free / 19Gi
swap in use at the time; a clean retry after other sessions' memory
pressure eased (7.6Gi free) completed normally in 3m51s with the identical
file set. This matches 12-01's own documented finding about the adapter's
memory-hungry packaging step; it is not attributable to this plan's
changes (`vitest.config.ts`/a new test file do not participate in `vite
build`/`adapter-vercel` at all), and the successful retry is the evidence
used above.

## Files touched (staged, not committed — see Blocker)

**hub** (`~/.cache/claude-tmp/hub-12-02`, branch `feat/dep-provenance-12-02`):

| File | Before SHA-256 | After SHA-256 |
|---|---|---|
| `package.json` | `12199632c49e0bc9960ec32203357b6bdfe90981f7b4d78ba771c1b9f5e547f6` | `67dc978f938507f07988479c20a85e788ba9530d46a8e699367591027a244754` |
| `bun.lock` | `ebc14272d106ebd486bedc7128fbaa5e775b15f1f675c026c33d5c9507c2963d` | `3b0e4ab352d9f5e08769fef7c12995d0919aae4f9b67c9890a3574a77c738d91` |
| `vitest.config.ts` | (2-line diff, `include` array only) | — |
| `tests/dependencies/locale-parity.test.ts` | new | `f90c248966eec0d6944308d5ab921fbeac91f7575e3fdcebf3b7efbb0cfa02c9` |

**site** (`~/.cache/claude-tmp/site-12-02`, branch `feat/dep-provenance-12-02`):

| File | Before SHA-256 | After SHA-256 |
|---|---|---|
| `package.json` | `fafb5915d116605b1aea0fcd8e973096be01369e1a43ce65ceffa02f2908fe70` | `1162abeadac808dfab3049b8441a700479a94964db99847e51d82a0c517f5aec` |
| `bun.lock` | `2495bc0821366c085a421b61be244d12d8867d854abe76c6da4e830137057acc` | `13dc6e49a0a4a4e461921e2a7e17198afbbd329cc445afe411e2061f59ede437` |

## Blocker: commit signing (unresolved in this session)

Every `git commit` in both worktrees (attempted 6 times total across hub
and site, spanning several minutes of other real work in between) fails
identically:

```
error: 1Password: agent returned an error
fatal: failed to write commit object
```

(or `error: 1Password: failed to fill whole buffer` on some attempts).
`gpg.format=ssh`, signing key routes through `/opt/1Password/op-ssh-sign`.
1Password desktop processes are running (`pgrep` confirms), so this is not
the "app fully closed" case the project's own memory notes as the usual
cause — the agent/helper itself is refusing or timing out, most likely
because no interactive user session is present in this environment to
satisfy 1Password's signing approval, compounded by many concurrent
unrelated agent sessions on this same machine also contending for it.

**Per this repo's standing rule, signing was not disabled to force a
commit through.** Both worktrees are left with every change `git add`-ed
(confirmed via `git status --short` / `git diff --cached --stat` above)
and ready to commit verbatim with the message already prepared, the moment
1Password signing responds. No PR exists yet for 12-02 as a result — this
is the one requirement-closure item this SUMMARY cannot self-close.

## Requirements

`requirements_completed: []` — DEP-02 is NOT closed: Task 1 is fully done
and verified; Task 2 is blocked on file ownership (adapter migration itself)
and, separately, the commit could not be made at all in this environment.
Per this plan's closure policy, the phase stays open on both counts.
