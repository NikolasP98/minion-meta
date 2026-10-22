# Agent harness implementation ledger

The owner authorized implementation after the two-pass reviewed [specification](../../../specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md): “Okay, begin implementation. Use subagents and validate work.”

Wave1 implements Slices1–2 (Hub),6–7 (Factory) and10 (gateway), plus the shared SDK boundary needed to make Hub submission concrete. Other slices remain planned in [state.json](state.json). Each domain has an implementing worker and an independent standards/spec review. There were no paid model runs, production writes, merges, deployments or classifier acting-mode changes.

## Changes and review

| Area | Result | Review and evidence |
|---|---|---|
| Hub Home/Floating | Immutable preparation ownership, A→B→A generation fences, cancel before send, exact-run Stop, preserved draft and fenced acknowledgement/history recovery | [Review](hub-independent-review.md), [Hub report](hub/REPORT.md) |
| Shared SDK | New synchronous `beginRequest` admission seam; existing async `request` compatibility. Exact tested archive adopted through Hub's existing checked-in `file:deps` convention | [Review](shared-independent-review.md), [artifact identity](shared-artifact.json) |
| Factory | Attempt/decision provenance, central/local deduplication, known failed bills and unknown exposure preserved in reports; incompatible cohorts separated | [Review](factory-independent-review.md), [Factory report](factory/REPORT.md) |
| Gateway Telegram | Ordered original source units survive debounce/fragments/albums and raw/received hooks; synthetic callback commands remain uncertified | [Review](gateway-independent-review.md), [Gateway report](gateway/report.md) |

The Hub browser gate also reproduced an existing AiOrb teardown error when a queued observer read a cleared canvas binding. Its bounded lifecycle repair has separate red/green and source-review evidence; it does not expand classifier authority.

## Verification boundary

Frozen installs used Bun for Hub, pnpm for gateway/meta and npm ci for the Factory runner. The [workspace manifest](workspaces.json) records pinned bases, feature clones, implementation commits and draft PRs. Factory and the initial gateway runtime exact-head CI are terminal green in [ci-wave1.json](ci-wave1.json). The gateway comment-only successor is also terminal green in [its separate receipt](ci-gateway-comment-head.json); skipped platform checks are not passes.

Shared source passed392 tests, typecheck and build. Factory passed1239 runner tests,16 report tests, focused proxy/direct-shell contracts, typecheck and build. Gateway passed full `pnpm check` and the final carrier/media suites; its test-only media harness correction is qualified against the untouched base in the domain report. Counts from overlapping focused suites are not added as unique tests.

Hub source, mounted component, build and browser evidence are recorded in its report with command exits. The critical fixture uses the actual installed GatewayClient and actual Home component but a synthetic WebSocket peer. It proves handshake/submission/rendering behavior for that fixture, not authenticated backend actions, WhatsApp delivery, production identity or live model economics. Host WebKit cannot launch because the machine lacks the exact runtime libraries; the full matrix is separately run in a pinned disposable official Playwright image. Host failures and container receipts are both retained.

## Remaining work

- Slice3 accepted-final/UI-action lineage is still planned. Current automatic UI dispatch has an exact-site TODO; passing choice/artifact preparation tests does not establish replay-safe automatic callbacks.
- Legacy init/manual history loaders, voice chat and Site members chat are outside the new Home/Floating preparation owner. The generic history helper retains its own TODO/proposal entry.
- Factory Slice8 must add full run-level admission/accounting and unknown exposure; the old numeric run subtotal and failed-error-file aggregation are not a full spend bound. Rank absolute-scale mapping remains unverified.
- Slice10 is a provenance producer. Watcher consumption, admission, classification/suggestion/recipient receipts and usage joins remain Slices11–16.
- Pulse approval, the targeted worker, informational digest, feedback and offline/live qualification remain planned. No new global scheduler or automatic policy promotion was activated.

Every known implementation seam above has its exact-site TODO and the [matching proposal ledger](../../../proposals/2026-10-22-agent-decision-and-proactivity-experiments.md). Planned requirements are not marked completed by source comments or green compilation.

## Shared web and WhatsApp engine

The owner's additional request is covered by [common-engine reconnaissance](engine-recon/report.md), a [Hub/Site crosscheck](engine-recon/hub-site-crosscheck.md), executable offline probes and an independent source review. Hub manifest selection is a prompt-budget sidecar. Web `chat.send` and WhatsApp converge deeper in the gateway reply/agent-execution pipeline. Transport authority, browser-only actions, cancellation and task receipts remain distinct contracts.

The new engine findings and bounded next-wave acceptance outlines are planning input in the proposal. They do not silently amend the already-reviewed 32-slice design or claim engine fixes have shipped.

## Source preservation

All product edits are in isolated feature clones. Original Hub/gateway HEADs and tracked diff hashes still match the initial fingerprint; their untracked status listings changed during the session and are not attributed or overwritten. Factory's original checkout fingerprint matches entirely. [Recheck](original-checkout-recheck.json).

The dirty original meta registry was stale about Factory's PR base. Freshly fetched canonical meta `dev` already says `dev`, matching Factory's instructions/promoter and fetched base commit43a174b2. No registry repair was required. Root spec/proposal indices are updated only for this task's rows, preserving other WIP.

## Current review checkpoint

Draft PRs: [Hub587](https://github.com/NikolasP98/minion_hub/pull/587), [Factory200](https://github.com/NikolasP98/minion-factory/pull/200), [Gateway354](https://github.com/NikolasP98/minion-ai/pull/354). Hub source is frozen at3ebd0ded with25 owned paths; its full local tests/final browser/check/build and hosted CI are in progress. This is a reviewable checkpoint, not merge readiness.

Meta local build, typecheck and lint passed. The parallel package test run hit one retry-count assertion in unchanged shell-bridge tests; the same file passed66/66 in isolation. Remaining package follow-through and163 script tests passed, as did canonical index/policy/changeset gates. [Detailed receipt](meta-validation.json) preserves the failed full command and successful bounded reruns; it does not relabel that original command green.
