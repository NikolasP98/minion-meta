# Shared action service implementation and release evidence

## Authorization and table integration

The user authorized implementation, merging Hub PR #352, finishing the action
service and deployment. After GitHub required an approving review, the user
explicitly authorized the admin override for #352. It merged as `698aaa71` on
2026-09-21 after its checks passed.

Implementation is isolated in `/home/nikolas/.cache/codex-work/hub-actions-20260921`,
branch `feat/shared-action-service`, based on that merge. The shared Hub checkout
and concurrent POS changes remain untouched. This release integrates the existing
table editor; it does not repeat Claude's raw-table migration.

## Implemented scope

- One context-scoped Svelte 5 runtime owns read/command/job metadata, lifecycle
  signals, foreground activity, job counts and unresolved attention. Request and
  result bodies never enter shared history.
- Navigation starts tracking before server loads finish. A shared ProgressBar
  appears after 150 ms of continuous foreground work. Background reads stay silent.
- Confirmed commands distinguish failure, conflict, unknown outcome, partial
  completion and committed writes whose refresh failed. Child attempts belong to
  one logical action; a fill creates one action and refreshes once.
- The shared row controller retains optimistic drafts, orders full snapshots per
  row, fences older completions by revision, and resets on user/organization scope
  changes. Failed writes retain explicit retry; unknown/conflict writes require
  authoritative reload. Capacity rejection preserves unsent drafts.
- Stock cells and POS catalog cells/Active toggles use the same adapter. Canonical
  refresh reconciles after the final queued row write.
- Finance submission attaches an exact durable job identity. Tenant-scoped status
  polling continues in the persistent root shell across module navigation. Neither
  navigation nor scope cleanup cancels the server job. An unrelated latest job
  cannot establish the outcome of an unknown submission.

Active/attention admission is bounded at 128 with two reserved navigation slots.
Settled history is bounded at 100 records/five minutes; attempt history at 32.
Progress updates are limited to 10 Hz, with immediate first and final updates.

## Review and validation

Independent Standards/Spec source review passed after correcting reentrant scope
handling, navigation admission at capacity, job acknowledgement, monitor lifetime,
row revision/scope handling, early canonical refresh and rejected admission.

Executed evidence so far:

- Type check: 0 errors, 0 warnings.
- Shared table suite: 35 passing tests, including admission/revision/scope cases.
- Finance service/status/monitor suite: 15 passing tests, including tenant job
  lookup and module replacement preserving a single running job.
- Design lint: no changed-file debt increase. Token lint: 0 violations.
- Architecture recon suite: 3 passing tests.
- Disposable seeded QA app, headless Chromium: real stock PATCH succeeds; two
  rapid same-row edits execute sequentially (second dispatch follows first
  response); injected 422 preserves its draft and explicit retry succeeds.
- Delayed authenticated navigation shows the global bar during the load and
  returns to idle. The job indicator survives module navigation. Reduced-motion
  progress has computed animation-name `none`; activity fits a 390px viewport.
  Original QA item name restored after validation.
- A browser-injected refresh failure exposed SvelteKit resolving invalidation into
  a 500 route boundary. The checked-refresh adapter now classifies
  this as committed-refreshing; browser retest showed exactly one PATCH and the
  global message "Saved. Refreshing the latest view failed.".

The initial full-suite run hit local 1Password signing in disposable Git tests.
Those 26 tests pass with process-local `commit.gpgsign=false`; the complete suite
passed with 4,332 tests and 206 skipped across 505 passing/3 skipped files. No global Git setting changed.
Production build passed, including Vercel adapter output. Final type check again
reported 0 errors/0 warnings; formatting passed for all 28 release files. Signed commit `aaf61ac9` is published in [Hub PR #354](https://github.com/NikolasP98/minion_hub/pull/354).
All PR checks passed, including hosted QA and Vercel. The user explicitly
approved the admin override for #354; it merged as
`2365d2042b7d73473c25a7782d42598b95e23234` at `2026-09-22T00:22:04Z`.

Production deployment `dpl_EJDZv5LGKCcyt2M1erLNjXXBaZ5V` reached Ready, with GitHub
deployment `6580832713` confirming that exact SHA and success at
`2026-09-22T00:24:41Z`. Vercel aliases include `https://hub.minion-ai.org`.
Headless Chromium loaded `/en/login`, title `Sign in — Minion Hub`, with the
expected email/password form and Google sign-in control. No production sign-in
or mutation was performed. [Production screenshot](browser/production-login.png).

## Scope limits

This release does not implement all 43 interaction families or remove financial,
creation-form or destructive-action confirmation. It does not add backend
idempotency/version checks, cross-client write ordering or universal realtime
cache propagation. Existing transport/query/event owners remain in place until
qualified adapters are added. The wider centralization proposal remains open.

Browser artifacts: [recorded observations](browser/evidence.json),
[pending save](browser/pending.png), [serialized result](browser/serialized-saved.png),
[retained rejected draft](browser/rejected.png), [refresh error](browser/refresh-retest.png),
[reduced motion](browser/reduced-motion.png), [390px viewport](browser/mobile.png).
