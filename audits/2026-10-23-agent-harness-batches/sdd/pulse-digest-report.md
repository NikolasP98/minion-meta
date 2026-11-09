# Pulse D and digest E — authored SDD readiness

Author: `/root/astra_sdd_pulse_digest` (Astra). Date: 2026-10-23. Status: **ready for independent technical passes 1 and 2**. This is the author's SpecKit analyze/readiness record, not independent approval or runtime qualification. No runtime files, indices, parent specification, feature selection state, branch/worktree configuration or commits were changed.

## Source and ownership

- Meta checkout `f-evals`, branch `feature/agent-harness-f-evals`, source `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`, registered PR base `dev`.
- Hub D/E source `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, `bun.lock` SHA-256 `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`, package SHA-256 `414630467f55fe315264d5874c916fc4bf779bf2378f3a5384237a1846abdf65`. D/E registered PR base remains `master`.
- Gateway C source `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`, shared contract `specs/107-harness-gateway/contracts/cron-binding.md`. Existing authenticated `hello-ok.server.version` and `.commit` at `src/gateway/server/ws-connection/message-handler.ts:1077–1078` supply the current identity comparison. Missing exact full commit/version or assignment mismatch disables dispatch before a cron request. Qualification and dispatch use the same prepared connection.
- Parent reported fresh Bun 1.3.4 installs and Node 22.23.3, unchanged Hub lock, no env/dependency symlinks. Source/lock pins were rechecked during authoring; installation/build/runtime qualification must be checked by development.
- User grouping authorizes one PR each for D and E. E consumes D's implementation commit and serializes changes to shared schema/runtime/page/state/localization/seed files. Parent owns stacking and canonical PR bases; E stays a dependency-marked draft until D merge, with D...E scope review and combined-tree tests. No self-authorized merge.

## SpecKit execution and standards self-check

Read meta AGENTS/constitution, approved parent §§0–12, four SpecKit skills, MINION engineering/writing skills and references, Hub instructions, DB auth conventions and UI governance. Resolved actual templates, inspected extensions/hooks (none configured), and ran setup-plan/setup-tasks with absolute `SPECIFY_FEATURE_DIRECTORY` plus `SPECIFY_FEATURE_NO_PERSIST=1`; shared feature state was not selected or persisted.

Both `check-prerequisites.sh --json --require-spec --require-tasks --include-tasks` calls pass with research, data-model, contracts and tasks. Actual exported spec-index heading/scalar/array/slice-topic validators return zero errors for both board stubs. A lightweight local check confirms relative Markdown targets exist, sequential unchecked task IDs, no unresolved template/clarification markers, and functional requirement/acceptance coverage. The first coverage checker failed to expand compact `FR-001/004` references; corrected parsing reports all requirements covered. An initial validation command imported an unavailable optional Markdown package; the final check uses the repository's own `parseFrontmatter`, with no dependency change.

D: 3 independently testable user stories, 9 functional requirements, 26 executable tasks. E: 4 stories, 10 functional requirements, 30 tasks. Both retain review checkboxes pending. Generated index regeneration and the full repository-wide registration gate are parent-owned and not claimed here. No author G2 scores substitute for independent reviewers.

## Spec self-analysis and seams

| Acceptance | Contract and actual implementation boundaries | Required proof |
|---|---|---|
| A17 | D revision/decision/dispatch schema; one approval transaction; domain dedup before transaction-taking enqueue; restricted deletion | Real PostgreSQL parallel decisions, immutable content, scoped FKs/RLS, migration+seed rerun and surviving admission tombstones |
| A18 | D current POST/PATCH, Pulse service/state/page and NotificationsPopup; private receipt and bounded recent decisions | Stale/missing revisions, informational no-dispatch, actual mounted EN/ES keyboard/reconnect/save-refresh and browser evidence |
| A19 | D `runSelectedTick`/claim/direct advance; due/owner/type/org filters before LIMIT; atomic domain/job postponement | Older unrelated backlog, stale candidate after postpone, truthful advanced count and unchanged default jobs tick/legacy handler tests |
| A20 Hub | D exact personal authority, scoped credential socket, deployment qualification, flat cron schema; C exact explicit agent admission | Local WS actual serialized requests for two profiles; no ambient fallback; unknown/deleted bindings; crash/ambiguous outcome no replay |
| A21 | E strict immutable policy, pinned dependency inputs and connection-bound public HTTPS fetch | 5-source/20-item/48-KiB limits; DNS rebinding/body/deadline/redirect fixtures; deterministic unchanged no inference; zero spend disabled default |
| A22 | E stable budget namespace, row-lock admission, unique logical run/job and generation/day settlement | Competing snapshots/last allowance, midnight/revision unknown fence, stale receipt and current owner/policy denial on real SQL |
| A23 | E existing metered adapter opt-in bounds, one 1024-token/30s no-tools request, durable received envelope | Actual installed SDK wire count, retries/fallback off, known/unknown bill cases, process death/received recovery without another request |
| A24 | E internal transaction-taking publication and reserved ingress rejection; immutable complete binding and source CAS | Card/checkpoints/run/job atomic rollback/recovery, binding mismatch, no-signal no card, decided content immutable, separate claim-support qualification |
| A25 | E append-only feedback routes/component/export, stable client action and immutable actor/content/source/policy | Concurrent corrections, owner denial, 500-character bound, export factual/preference distinction, failed-save/reconnect no repeat |
| A32 | E durable collection lease and D selected tick; shipped uninstalled cron template/script | Empty queue with clients closed, minute scheduler fixture triggers real authenticated route, simultaneous ticks/restart/expired lease, visible card and unrelated queue unchanged |

Self-analysis found no uncovered approved acceptance or unresolved design blocker. Two consistency fixes were made before freezing: deterministic no-signal runs keep the same one-run/one-job transaction path; dispatch retention permits only a one-way raw-snapshot redaction with preserved immutable hashes/admission identity and no payload restoration/replay. Ordinary proposal content remains immutable.

The shared transaction seam preserves existing background-runtime ownership/generation semantics and restores bookkeeping role around bg job writes; it does not grant the domain role broad queue access. Only explicitly registered Pulse families can use atomic bounded postponement. The selected execution budget allows E's 30s request within the 50s tick without changing the legacy 25s cap. D owns the foundation migration `20261023010000_pulse_dispatch_receipts.sql`; E owns the later `20261023020000_pulse_digest.sql`, each paired with local QA seeds.

## Validation evidence boundary

No runtime implementation, model request, source polling, production migration, build or browser acceptance was performed by this author. Parent's qualified disposable PostgreSQL fixture is available at loopback `127.0.0.1:55461`, DB/owner `minion_qc_harness`/`minion_qc`, marker `minion-360-disposable:v1`; setup receipt is `audits/2026-10-23-agent-harness-batches/setup/disposable-postgres.json`. Developers must use `openDisposablePostgres` guards, isolated schemas, independent connections/processes and cleanup. Full local Supabase/app browser environment remains a separate parent-coordinated gate.

Next: independent two-pass Astra SDD reviews at these hashes; then Sol development, local real-DB and browser verification, separate Standards/Spec reviews and one draft PR per group. Human merge, current deployment Gateway qualification, schedule installation, personal activation, actual model spend and sampled claim-support promotion retain their respective gates. They are planned rollout qualifications, not hidden implementation gaps.

## Frozen authored files

| File (meta-relative) | SHA-256 |
|---|---|
| `specs/108-harness-pulse/checklists/requirements.md` | `433626aee35d88ea157e6d1f4d4bea20e55083d6f03596f1d17efdfeb430be24` |
| `specs/108-harness-pulse/contracts/pulse.md` | `f79b1711226b807a3541f29fe16ab9574431f0fca9f24b6cb3af6d72799a4b52` |
| `specs/108-harness-pulse/contracts/shared.md` | `cb836393e5545253cfc7b4d15d781188429da1f42a1f787c6fc5764599bfd3ae` |
| `specs/108-harness-pulse/contracts/validation.md` | `0838bbb2ecde42f077693ded6ee4d7e29c7ae61638bacc7b3c4b802164ec6f5d` |
| `specs/108-harness-pulse/data-model.md` | `d02b11e5ac0354f44c9bd171fc80d13d2c2fa74d3cf9dfcddde5a78a0d1bb0ac` |
| `specs/108-harness-pulse/plan.md` | `46d8a9fcaedf597d833487b9e77a1072f51feeff532fb1bc823e9d4b1c555940` |
| `specs/108-harness-pulse/research.md` | `5b3180441368c36546e433c02ceaa8499c60edbfe81324b0cfac235e36630797` |
| `specs/108-harness-pulse/spec.md` | `60908aae64fee65aa9de9f100fee3d6354bb79a8fc3a49d1de931914b6a060e4` |
| `specs/108-harness-pulse/tasks.md` | `6bcff6d90d081bec9bdba831789b3179ddac2ae4b082a58e99fe64fa34d67694` |
| `specs/109-harness-digest/checklists/requirements.md` | `459007f7ab5f9c0c083d4964cbb4cb595fb19d46b31b30abe81b78654fe6d50a` |
| `specs/109-harness-digest/contracts/digest.md` | `8f857d926b91127dfb4a903cd7d76ed2a0e51b494797f77d377aee573195d837` |
| `specs/109-harness-digest/contracts/validation.md` | `04ecc81d86b6cba2be3a289fbb7327de67c02e9b646c19449bca80a5cfee5ccf` |
| `specs/109-harness-digest/data-model.md` | `49e8df968841c8781fd06599e4ecc767074a450e9880430940be0a932c4d945b` |
| `specs/109-harness-digest/plan.md` | `496056737f51b774a0c7b55a8b2aedce67b572d56c3d277682648c793a4b80b9` |
| `specs/109-harness-digest/research.md` | `181e2cd87b2e60889f5c88e29ab5b809e1118ffb50340369e1bda70d1270fd5f` |
| `specs/109-harness-digest/spec.md` | `cc06e7bff979aba0bf9f2d5ea27c2cab2e965ee99541f5a7b4e403f5ebc91fb7` |
| `specs/109-harness-digest/tasks.md` | `6964546c73968567f4e6f4e738a061fad08e4bbcd47949c4550d2ba3241532fc` |
| `specs/2026-10-23-harness-digest-spec.md` | `af3c2f9a73e342dd17377e051e4f8193eec9edcc31258349378062de98f390fc` |
| `specs/2026-10-23-harness-pulse-spec.md` | `5fb285a2cf7ad547340dac392ac5a73dfe3b4cc48c239a8e2b99a5154b33d6f8` |
