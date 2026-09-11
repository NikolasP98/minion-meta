---
phase: 11-agent-lifecycle
plan: "04"
status: partial
requirements: ["AGT-05"]
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/11-04-q7m3xk/minion-meta
base: origin/dev 96e5ceeb25a7544e47fb9f3362c4d2b6849fcc5f
executed: 2026-09-11
owned_files:
  - path: packages/shells-bridge/src/acp-client.ts
    before: 50bd2e115feb19029b8de58e0b7a9e19de8700d3aa056792c5396eff75330bea
    after: 3b1db7dcd3589a12bb5e96a76ab3be7e0abf8344c9739beb3497fed86b3c5152
  - path: packages/shells-bridge/src/acp-conformance.test.ts
    before: (absent)
    after: 2ea58d5f10deec8c6e8046579da67c2c1ed4c49464bc79ae9c90f0724d81f6b2
  - path: packages/shells-bridge/test/fixtures/acp-transcript.json
    before: (absent)
    after: e20292104e4389a6a8e4be26f02daaa4d35ce4e1cbc09aee92c376ee1d4abd1d
  - path: packages/shells-bridge/package.json
    before: 44147587821a3c7054c8663919385e77aa6d3e1fd36cda27d1945509b01f710e
    after: 44147587821a3c7054c8663919385e77aa6d3e1fd36cda27d1945509b01f710e (unchanged)
  - path: pnpm-lock.yaml
    before: aba495daa6e1b80094661fa4a9cce508e10d7bf29b194244299970745164a136
    after: aba495daa6e1b80094661fa4a9cce508e10d7bf29b194244299970745164a136 (unchanged)
  - path: .planning/phases/11-agent-lifecycle/11-ACP-RESEARCH.md (main checkout, untracked)
    before: abc17df44f65bd976c9671d536d1c2a6f0b5d936f3f19e9751ca276c0cf23417
    after: 01ad8354ed191e74bc239708f8f8139f3622e2e666c6e73a647b9c5777bb6dd3
decisions: [D360-01, D360-04, D360-06]
---

# ACP conformance: synthetic transcript + pinned SDK example agent, real harness still gated

Status is **partial**: Task 1 is complete as a private candidate; Task 2's synthetic regression and typecheck gates pass, but its "real pinned harness" clause is blocked on credential, adapter identity and live-test authority that this executor does not have. Mock and SDK-example transcripts do not close AGT-05.

## Task 1 — transcript fixture, conformance suite, research addendum

- `test/fixtures/acp-transcript.json`: 12 synthetic scenarios, every step labelled `dir` (`client->agent` / `agent->client`) and `kind` (`request` / `response` / `notification` / `malformed` / `exit`), shapes from `schema/schema.json` of `@agentclientprotocol/sdk@1.4.0`. Covers initialize (ok / version mismatch / error), session/new (ok / missing id), prompt with a numeric permission id colliding with the pending prompt id, string permission id with default reject, cancel mid-turn, cancel during pending permission, a malformed/oversize/unknown-id/unknown-method burst followed by a healthy call, harness exit mid-call, and a peer that ignores EOF.
- `src/acp-conformance.test.ts`: tier 1 replays the fixture through a scripted peer written to a temp dir and spawned over real stdio with an allowlisted env (`PATH`, `HOME`, `TMPDIR`); the peer echoes every client line and exits 3 on the first contract mismatch. Tier 2 runs the pinned official example agent when `ACP_EXAMPLE_AGENT` is set; otherwise those 3 cases skip (pending, not pass).
- Research doc: appended "Execution addendum 2026-09-11" with the pinned harness receipt and the exact unresolved real-run prerequisites.

## Task 2 — adapter

`acp-client.ts` was corrected in place rather than replaced by the SDK (no root lock ownership; the required behaviour is ~300 lines and reuses the existing client). Inbound frames are classified by structure, so agent requests are never mistaken for responses regardless of id type; `initialize` enforces protocol version 1; `newSession` requires a session id; `prompt` has no local deadline and requires `stopReason`; `cancel` is a notification and answers pending permission requests `cancelled` synchronously before it; default permission policy is reject-kind-or-cancelled (never auto-allow); unknown methods get `-32601`; stdout has a byte ceiling; spawn failure surfaces on `exit`; exit is observed on `close` (stdio drained); `stop(timeoutMs)` returns `{exited}`. `call/notify/kill/start` and the `notification/stderr/exit/parse_error` events are preserved, so `bridge.ts` compiles unchanged and the existing fake-ACP bridge suite is untouched.

The SDK dependency transaction is prepared but **not applied**: `<snapshot>/checks/pending-root-lock-sdk-transaction.diff` (sdk 1.4.0 + zod peer, registry hashes recorded). `package.json` and `pnpm-lock.yaml` are byte-identical to `origin/dev`.

## Gates (logs under `/home/nikolas/.cache/claude-tmp/11-04-q7m3xk/checks/`)

| Gate | Command | Result | Log |
|---|---|---|---|
| Baseline at origin/dev (after `pnpm --filter @minion-stack/shared build`) | `pnpm --filter @minion-stack/shells-bridge test` | exit 1: 112 passed / 1 failed (pre-existing: `run-journal.test.ts` needs `dist/` built) | `baseline-test.log` |
| Red (fixture+test vs unmodified client) | `vitest run src/acp-conformance.test.ts` | exit 1: 91 tests, 85 failed, 3 skipped | `red.log` |
| Task 1 verify | `pnpm --filter @minion-stack/shells-bridge exec vitest run src/acp-conformance.test.ts` | exit 0: **88 passed, 3 skipped** (tier 2 without env) | `task1-conformance.log` |
| Tier 2, pinned SDK example agent | same with `ACP_EXAMPLE_AGENT=<scratch>/package/dist/examples/agent.js -t 'example agent'` | exit 0: **3 passed** (full turn end_turn; cancel mid-turn → cancelled; NEGATIVE cancel-during-permission → end_turn, upstream 1.4.0 defect reproduced) | `tier2-sdk-example-agent.log` |
| Task 2 verify | `pnpm --filter @minion-stack/shells-bridge test && pnpm --filter @minion-stack/shells-bridge typecheck` | test exit 0: **201 passed, 3 skipped** (4 files; after `build` so the journal dist case runs); typecheck exit 0 | `task2-package-test.log`, `typecheck.log`, `build.log` |
| Task 2 with tier 2 enabled | `ACP_EXAMPLE_AGENT=… pnpm --filter @minion-stack/shells-bridge test` | exit 0: **204 passed, 0 skipped** | `task2-package-test-with-sdk-agent.log` |
| Lint | `pnpm --filter @minion-stack/shells-bridge lint` | exit 0; 1 warning = pre-existing unused `handleBackup(params)` in `bridge.ts`; no new debt | `lint.log` |
| Whitespace | `git diff --check -- packages/shells-bridge` | exit 0 | `diff-check.log` |
| Working tree | `git status --porcelain` | exactly `M acp-client.ts`, `?? acp-conformance.test.ts`, `?? test/` | `git-status.log` |

Runtime freeze (`checks/freeze.json`): Node v22.23.2, pnpm 10.15.0, vitest 2.1.9, typescript 5.9.3, oxlint 1.66.0, ws 8.21.0, shared workspace 0.9.0. SDK tarball verified against registry sha1/sha512; `dist/examples/agent.js` SHA-256 `65133ba9e228782be3b6e995a0ac35d554b762a6bb6033682503f116729f7d73`; zod 3.25.76; all in `<snapshot>/sdk-scratch`, outside the repo.

## Deviations

1. SDK not adopted (research recommended it). Reason: no root lock ownership; the corrected in-repo client passes the same contract. Transaction prepared for root's decision.
2. `run-journal.test.ts` emitted-module case requires `pnpm --filter @minion-stack/shells-bridge build` before `test`; I ran build first. That is a pre-existing package quirk, not changed here.
3. Package install in the snapshot needed `pnpm --filter @minion-stack/shared build` for `@minion-stack/shared` to resolve (`--ignore-scripts` skips it). Recorded in `shared-build.log`.
4. Tier-2 harness acquisition used a scratch `npm pack` + `npm install --no-save zod` outside the repo. This is a package fetch, not a workspace change; if root does not admit even scratch acquisition, disregard the tier-2 receipt — tier 1 stands alone.
5. One transient `exit 137` (killed, no output) on the very first `pnpm exec vitest` red run; the immediate rerun produced the recorded red log. Cause not identified; not reproduced afterwards.

## Gaps / blocked (precise)

- **Real pinned harness (Task 2 clause) — BLOCKED.** Needs (a) a pinned ACP adapter binary (`codex-acp` / `claude-agent-acp`, neither on PATH, images pin `latest`), (b) a provider credential, (c) explicit recorded live-test authority and budget (D360-04). None was available; none was used. Without all three, AGT-05 stays open.
- **Bridge call sites not adopted — out of ownership.** `bridge.ts:546` still sends `session/cancel` via `call()` (adds an id, awaits a response) and prompts with `{ sessionId, input }`; `bridge.ts` is not in this plan's `files_modified`. `TODO(handoff)` added at `acp-client.ts` `cancel()`. Proposal text for root's ledger (`proposals/2026-09-08-platform-qc-remediation.md`, Shells lifecycle):

  > 11-04 delivers a v1-conformant `AcpClient` (`initialize/newSession/prompt/cancel`, structural inbound classification, permission answers, byte ceiling, close-based exit). The sender slice must (1) replace `acp.call('session/prompt', {sessionId, input})` with `initialize` → `newSession` → `prompt(sessionId, ContentBlock[])` and define the input→content mapping, (2) replace `acp.call('session/cancel')` with `acp.cancel()` and record `cancel_acknowledged` only from the prompt response `stopReason: "cancelled"`, (3) treat `end_turn` after a cancel request as completion, not acknowledgement (reproduced against SDK 1.4.0 example agent), (4) decide SDK adoption (pending diff in the 11-04 snapshot).

- **SDK dependency transaction — pending root lock.** `checks/pending-root-lock-sdk-transaction.diff`.
- Not changed: gateway/image Dockerfiles, `config.ts` command parsing, `index.ts` exit-on-stop.
