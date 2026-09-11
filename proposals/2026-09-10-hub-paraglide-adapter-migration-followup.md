---
id: 2026-09-10-hub-paraglide-adapter-migration-followup
title: Migrate Hub off the deprecated @inlang/paraglide-sveltekit adapter
status: review
created: 2026-09-10
updated: 2026-09-11
repos: [minion_hub]
duplicate_candidate: 2026-09-08-platform-qc-remediation
---

# Migrate Hub off the deprecated @inlang/paraglide-sveltekit adapter

## Problem

`@inlang/paraglide-sveltekit@0.16.1` is npm-deprecated: `npm view
@inlang/paraglide-sveltekit deprecated` returns "use the paraglide-js package
directly with v2 or above ... the sveltekit adapter is not needed anymore."
Phase 12-02 (DEP-02) was scoped to remove it, but the plan's owned files for
that task were `minion_hub/vite.config.ts`, `package.json`, `bun.lock`, and
`tests/dependencies/locale-parity.test.ts` only.

The deprecated package's runtime surface — `createI18n()`, `.handle()`,
`.reroute()`, and the link-translation preprocessor pulled out of its vite
plugin — is actually consumed from files 12-02 did not own:

- `src/lib/i18n.ts` — `createI18n(runtime, { prefixDefaultLanguage: 'always',
  exclude: [...] })`
- `src/hooks.server.ts:548` — `i18n.handle()` wired into the `sequence(...)`
  handle chain
- `src/hooks.ts` — `export const reroute = i18n.reroute();`
- `src/lib/canonical-path.ts` — locale-prefix stripping logic described as
  "equivalent to `i18n.route()`"
- `svelte.config.js` — extracts `.api.sveltePreprocess` off the deprecated
  package's `register-preprocessor` plugin for href/action locale-prefixing,
  because `@sveltejs/vite-plugin-svelte@7` removed the auto-registration hook
  it used to rely on

Swapping the dependency without touching those five files breaks routing;
touching them was out of 12-02's file ownership. 12-02 therefore did not
remove the adapter — see `.planning/phases/12-dependency-provenance/12-02-SUMMARY.md`.

## Evidence already in hand (12-02, DEP-02)

`minion_hub/tests/dependencies/locale-parity.test.ts` (merged in 12-02)
characterizes the current runtime directly against
`src/lib/paraglide/{runtime,messages}.js`, no app/hooks code involved:

- Message identity round-trips correctly through the safe per-call form:
  `m.a11y0_alerts({}, { languageTag: 'en' | 'es' })` → `"Alerts"` / `"Alertas"`.
- That safe per-call form does **not** bleed locale under concurrent async
  interleaving (20 simulated concurrent requests, zero cross-talk).
- The **ambient** form the app actually uses — `setLanguageTag()` mutating a
  shared module-level variable, then `languageTag()` read later by message
  calls during page render — **does** bleed under concurrency: two requests
  started via `Promise.all` with `setLanguageTag('en')` / `setLanguageTag('es')`
  both observe `'es'` (last synchronous write wins) once either resolves.
  This is deterministic, not flaky, because both `setLanguageTag` calls happen
  synchronously before either `setTimeout` fires.

This is a real, currently-latent defect in the deprecated adapter's runtime
model (no per-request locale context), independent of whether this migration
ever happens. It is not proof that production has hit it — SvelteKit's
request lifecycle may or may not create the interleaving window in practice —
but it is a concrete reason paraglide-js v2 (which added an
AsyncLocalStorage-scoped locale context) is the correct target, not just an
"unblock the deprecation warning" exercise.

## Sketch

1. Read paraglide-js v2's current official SvelteKit integration docs (the
   plan explicitly requires re-verifying the API before picking an approach —
   don't assume the shape from training data).
2. Replace `createI18n()`/`.handle()`/`.reroute()` in `src/lib/i18n.ts`,
   `src/hooks.server.ts`, `src/hooks.ts` with the v2-native equivalents,
   preserving: `prefixDefaultLanguage: 'always'` semantics, the `/api`,
   `/ingest`, `/.well-known` exclusion list, and the exact position of the
   locale handle inside the existing `sequence(...)` chain in
   `hooks.server.ts` (it currently runs after `Sentry.sentryHandle()` and
   before `cloudPasskeyHandle`; reordering changes which handles see the
   negotiated locale).
3. Replace the link-translation preprocessor extraction in `svelte.config.js`
   with whatever v2's own preprocessor/plugin registration requires under
   `@sveltejs/vite-plugin-svelte@7`.
4. Update `src/lib/canonical-path.ts` if v2 changes the prefix-stripping
   contract.
5. Extend `tests/dependencies/locale-parity.test.ts` (or add a sibling) with
   a fixture that drives the real `handle` chain (or the smallest slice that
   includes the new locale handle) with two concurrent requests and asserts
   **no** bleed — flipping the current characterization test's `expect(bled).toBe(true)`
   to `toBe(false)` once the fix is real, not by relaxing the assertion.
6. Re-run `bun run check`, `bun run build`, `lint:design`, `lint:tokens`.

## Out of scope

- Any TanStack Table migration (separate, already flagged as its own
  evidence item in `.planning/research/360-ui-dependency-verification.md`).
- Rewriting or re-translating any EN/ES message content.
- Site (`minion_site`) — it does not depend on `@inlang/paraglide-sveltekit`.

## Reconciliation note (2026-09-11, proposal-sweep)

`2026-09-08-platform-qc-remediation.md` priority slice 7 (UI-06) already names
"Replace deprecated Paraglide adapter" as an open item under the same
`.planning/phases/12-dependency-provenance/` work (12-02/DEP-02 is cited by
both documents). Flagged `duplicate_candidate` rather than merged: this
proposal is a much richer, independently actionable implementation plan for
that one named item, not a restatement of the whole multi-topic audit
document — a human should decide whether to track it as the closing slice for
UI-06's Paraglide item or keep it fully standalone.

## Definition of done

- `@inlang/paraglide-sveltekit` removed from `minion_hub/package.json` and
  `bun.lock`.
- `src/lib/i18n.ts`, `src/hooks.server.ts`, `src/hooks.ts`,
  `src/lib/canonical-path.ts`, `svelte.config.js` updated to the v2-native
  integration with no change to EN/ES message identifiers or the generated
  output location (`src/lib/paraglide/`).
- The concurrency fixture in `tests/dependencies/locale-parity.test.ts`
  demonstrates **no** locale bleed against the real handle chain (not just
  the safe per-call primitive).
- `bun run check`, `bun run build`, `DESIGN_LINT_BASE_REF=origin/master bun
  run lint:design`, `bun run lint:tokens` all pass.
