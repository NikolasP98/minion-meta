# Gateway (`minion/`) DX Simplification Roadmap

**Date:** 2026-05-27
**Scope:** `minion/src/` (~750k LOC). Behavior-, performance-, and security-preserving cleanups only.
**Method:** 6 parallel recon agents (agents/, channels/, gateway+web+plugins/, cli+config/, infra+memory+auto-reply/, cross-cutting). Findings below are deduplicated and merged across agents.

Each item: **Effort** S/M/L · **Risk** low/med/high · **Value**.

---

## ✅ Wave 1 — DONE this session (verified: tsgo clean on touched files, oxlint 0/0)

| # | Change | Files |
|---|--------|-------|
| W1.1 | Removed 4 duplicate local `sleep()` defs → import canonical `sleep` from `src/utils.ts` | `web/login-qr.ts`, `web/auto-reply/monitor/process-message.ts`, `channels/impl/telegram/bot-message-dispatch.ts`, `channels/impl/discord/monitor/message-handler.process.ts` |
| W1.2 | Removed duplicate `isRecord` → import from `utils.ts` | `channels/impl/imessage/monitor/parse-notification.ts` (left `response-formatter.ts` local — deliberate worker-isolation boundary; left `sandbox/registry.ts` — *different* array-inclusive semantics) |
| W1.3 | Extracted `StringOrNumberSchema` / `StringOrNumberListSchema` Zod primitives; replaced 22 inline `z.array(z.union([z.string(),z.number()])).optional()` | `config/zod-schema.providers-core.ts` |
| W1.4 | Deleted pure re-export shim, repointed its one importer to canonical path | deleted `cli/commands/auth-choice-options.ts`; updated `cli/program/register.onboard.ts` |

---

## Evaluation (2026-05-27, code-architect subagent) — corrections applied

A subagent verified the roadmap against the code. Key corrections, now reflected below:
- **2.1 count understated & conflated.** ~106 inline `errorShape(...)` sites across 31 files, spanning 3 codes: INVALID_REQUEST (~54), FORBIDDEN (~25), UNAVAILABLE (~52). Schema-validation vs business-logic vs auth vs catch-block are different migrations. `assertValidParams` only fits true schema checks; `respondError` fits the rest. Blueprint rewritten in 2.1.
- **2.3 is largely WRONG — re-scoped/dropped.** `infra/retry.ts` already exports a full `retryAsync` (jitter, shouldRetry, onRetry), and `infra/retry-policy.ts` already wraps it for Discord/Telegram. The cited "retry loops" (`session-slug.ts:117` uniqueness probe, `api-key-rotation.ts:49` key rotation, `subagent-announce.ts:237` poll loop, `session-write-lock.ts:410` lock poll) are **not** generic retries — do not touch.
- **2.6 not equivalent.** Discord parses `<@!mention>` syntax; Telegram is numeric-only with warnings; LINE inverts the empty-list default (`false` vs Telegram `true`). A shared helper must be **parameterized** to preserve each; −400 LOC optimistic.
- **2.7 partially done** (Discord/Telegram runners exist) → scope to Slack + LINE only; overlaps 2.3 premise.
- **Pull forward:** Wave 3 `infra/outbound/outbound-session.ts` switch→registry is a pure data-structure refactor (low risk) — slot it mid-Wave-2.

**Revised execution order:** 2.1 → 2.9 → 2.8 → 2.5 → 2.2 → 2.6 → (Wave-3 outbound-session) → 2.4 → 2.7 → ~~2.3~~ (audit-only).

## Post-implementation recalibration (2026-05-27)

After shipping 2.1, I verified each remaining item against the code instead of trusting recon. **Finding: the recon agents systematically over-claimed "duplication" — flagging code that is superficially similar but intentionally divergent per channel/context.** Outcome:
- **Shipped (real, verified, committed):** Wave 1 + 2.1. Net win ~−745 LOC, behavior-preserving, tests green.
- **Killed as mirages (verified NOT real duplication):** 2.2 (token resolvers — divergent sources/precedence), 2.3 (`retryAsync` already exists; cited loops aren't retries), 2.8 (canonical helpers already reused).
- **Lateral / negative-value (verified):** Wave-3 `outbound-session` switch→registry — the `switch` is exhaustive + type-safe over a `channel` union; a string-keyed map loses type-safety and doesn't reduce the work of adding a channel. Churn, not improvement. **Drop.**
- **Real but constrained:** 2.6 allow-list dedup is genuine, **but it's a security/access-control boundary** with per-channel correctness semantics (LINE inverts empty-list default; Telegram numeric-only; Discord mention-parse). Treat as a careful, test-backed security task — NOT mechanical cleanup. Low net simplification once parameterized to preserve all four behaviors.
- **Killed after verification (2026-05-27, 2nd pass):** 2.4 (truncate) — the 6 impls are genuinely divergent (return `string` vs `{text,truncated}`; head-slice vs middle-ellipsis vs newline-boundary; thresholds 0.8 vs 0.7 vs none; differing UTF-16 safety + suffix constants). A shared helper needs a pile of flags → KISS regression. **Drop.** 2.5 (logger registry) — only 4 of ~150 `createSubsystemLogger` keys are reused (`memory`×16, `plugins`×9, `agent/embedded`×7, `skills`×4); a 100+-const registry for single-use keys is churn. Marginal at best.
- **Genuinely valuable but separate efforts:** Wave 3 god-file splits (navigation wins) — scope each as its own tested project, not bulk cleanup.

**Wave 3 progress:** `auto-reply/reply/smart-routing.ts` ✅ first split DONE 2026-05-27 (commit `283218c13`) — extracted the 8 per-language keyword vocabularies + lazy cache + getter map into `smart-routing.keywords.ts` (exports `getMultilingualKeywords` / `hasMultilingualKeywords`). God-file 1263→840 LOC. Pure data move; tsgo 46 baseline, oxlint 0/0, 109/109 tests pass.

**Lesson for future passes:** treat multi-agent "duplication" findings as *leads to verify*, not facts. Confirm semantic equivalence before extracting a shared helper; a helper that needs N flags to reproduce N call sites is a KISS regression.

## Wave 2 — High-value, low-risk shared helpers (recommended next)

### 2.1 — Server-method validation + error envelope helpers · M · low · **high**  ✅ DONE 2026-05-27
**Result:** Added `respondError(respond, code, message, options?)` to `validation.ts` (and surfaced `ErrorCode` through the protocol barrel). Migrated **371** direct `respond(false,undefined,errorShape(...))` sites across **52 files** → `respondError(...)`. **Net −684 LOC in server-methods.** Verified: `pnpm tsgo` 46 (baseline, none new), oxlint clean (1 pre-existing `estop.test.ts as-any`), **194/194 server-methods tests pass**.
**Deviation from blueprint (intentional, lower-churn):** `respondInvalidParams`/`respondUnavailableOnThrow` were left in place in `nodes.helpers.ts` rather than moved to `validation.ts` — nothing needed the move once `respondError` covered the inline sites. Local wrapper helpers (`requireAdmin`, `tryRespond`, `resolveNodeIdOrRespond`, etc.) and the deliberate `shells.ts`/`chat.ts` error-code choices were left intact as specified.

<details><summary>original plan</summary>
~106 inline `respond(false, undefined, errorShape(CODE, msg))` sites across 31 files, 3 codes (INVALID_REQUEST/FORBIDDEN/UNAVAILABLE). `assertValidParams()` exists in `validation.ts` (used by 5 files / 19 call sites); `respondInvalidParams` + `respondUnavailableOnThrow` live in `nodes.helpers.ts`.
- **Action (verified blueprint):**
  1. In `validation.ts`: add `respondError(respond, code, msg)`; **move** `respondInvalidParams` + `respondUnavailableOnThrow` there. Leave `uniqueSortedStrings`/`safeParseJson`/`respondUnavailableOnNodeInvokeError` in `nodes.helpers.ts`. Re-export the two moved fns from `nodes.helpers.ts` so its 5 importers keep working. `pnpm tsgo` clean.
  2. Migrate business-logic/auth/literal inline sites to `respondError(respond, CODE, msg)`. Largest: `prompt-sections.ts` (~15 INV + ~12 FORBIDDEN — own commit), `pi-agent.ts` (12), `secrets.ts` (12), `shells.ts` (8 — **skip the `tryRespond` helper at :79, deliberate INVALID_REQUEST-on-catch**), `nodes.ts`, `devices.ts`, then small files (1–4 each).
- **DO NOT touch:** `shells.ts:79` `tryRespond`; `chat.ts:762` (INVALID_REQUEST-on-bad-attachment is deliberate); don't change `formatForLog(err)` serializers in catch blocks; split `return respond(...)` (e.g. `memory.ts:9`) into `respondError(...); return;`.
- **Watch:** files may drop their `errorShape`/`ErrorCodes` protocol import once converted — oxlint flags unused. Group FORBIDDEN conversions separately for review.
</details>

### 2.2 — ~~Channel token resolver~~ SKIPPED (over-claimed)
**Verified 2026-05-27: not real duplication.** The 4 resolvers only look alike. Telegram reads token *files* via `fs` + per-account normalized-key matching; Discord strips `Bot ` prefix, returns `{token, source}`, env only for default account; Slack = trivial trim wrappers (no env/config); LINE = `explicit||param||throw`→string. Divergent precedence/sources/return-types. Unifying needs more parameterization than it removes — KISS violation. The shared part (trim→undefined) is trivial. Skip.

### 2.3 — ~~`withRetry` / backoff helper~~ DROPPED (audit-only)
**Evaluation result: premise false.** `infra/retry.ts` already exports a full `retryAsync` (jitter, shouldRetry, retryAfterMs, onRetry); `infra/retry-policy.ts` already wraps it. The cited loops are NOT generic retries and must not be converted: `session-slug.ts:117` (slug uniqueness probe), `api-key-rotation.ts:49` (key rotation — has its own `executeWithApiKeyRotation`), `subagent-announce.ts:237` (poll-until-data, fixed 150ms), `session-write-lock.ts:410` (lock poll w/ stale removal). If anything, do a one-time audit for any loop that *should* use `retryAsync` but doesn't — no mechanical change.

### 2.4 — Consolidate `truncate*` text helpers · M · low–med · **med**
6+ truncation impls. Canonicalize in one module with named variants (`truncateMiddle`, `truncateEnd`).
- **Anchors:** `agents/pi-embedded-runner/tool-result-truncation.ts:39`, `agents/bash/bash-tools.shared.ts:172` (`truncateMiddle`), `agents/tools/web/web-fetch-utils.ts:103`, + private copies in `tool-result-context-guard.ts:164`, `tools/automation/cron-tool.ts:69`, `pi-embedded/pi-embedded-subscribe.tools.ts:11`.

### 2.5 — Subsystem logger registry · S · low · **med**
`createSubsystemLogger("...")` string-keyed in 30+ infra/memory files (typo-prone).
- **Action:** `infra/loggers.ts` exporting pre-bound logger consts; import by symbol.
- **Anchors:** `infra/heartbeat-runner.ts:83`, `infra/cost-guard.ts:13`, `memory/sync/manager-sync-ops.ts:77`, etc.

### 2.6 — Cross-channel allow-list / policy evaluation · M · low · **high**
4 near-identical `normalizeAllowFrom` / `isSenderAllowed` / wildcard-match impls; 4 parallel policy checks. A shared `AllowlistMatch<T>` type already exists — add the helper layer.
- **Anchors:** `channels/impl/{discord/monitor/allow-list.ts:56, telegram/bot-access.ts:37, slack/monitor/allow-list.ts:12, line/bot-access.ts:37}`; policy: `discord/monitor/allow-list.ts:150`, `telegram/group-access.ts`, `slack/monitor/policy.ts`, `line/bot-access.ts`.
- **Action:** `channels/shared/allow-list.ts` + `policy-evaluator.ts`. Est −400 LOC.

### 2.7 — Cross-channel send retry/error classification · M · med · **med**
Discord/Telegram/Slack/LINE each hand-roll retry + rate-limit detection.
- **Anchors:** `discord/send.shared.ts:14`, `telegram/send.ts:14`, `slack/send.ts`, `line/send.ts`.
- **Action:** `channels/shared/retry-helpers.ts` (`createChannelRetryRunner`, `categorizeChannelSendError`).

### 2.8 — ~~Session-key util grouping + cross-module dedup~~ SKIPPED (over-claimed)
**Verified 2026-05-27: no real dedup.** `state-migrations.ts` (`canonicalizeSessionKeyForAgent`) and `heartbeat-runner.ts` **already import and reuse** the canonical `normalizeAgentId`/`toAgentStoreSessionKey`/`canonicalizeMainSessionAlias`. What remains is bespoke legacy-WhatsApp-JID migration + heartbeat resolution logic — intentionally separate, not duplication. Only cosmetic section-comment grouping remains (low value, churn in a routing-critical file). Skip.

### 2.9 — Obsolete deprecated aliases · S · low · **low**
After a deprecation window: `alertsHandlers`→`complaintsHandlers` (`server-methods/alerts.ts:67,265`), `MinionConfig`→`MinionbotConfig`/`OpenClawConfig`/`ClawdbotConfig` (`plugins/types.ts:800`), and the `OpenClawConfig` import still used in `telegram/bot-message-dispatch.ts:19`. Confirm no external consumers first.

---

## Wave 3 — God-file decomposition (SHIPPED 2026-05-27/28)

> Executed via parallel subagent dispatch with the recalibration rule: each agent verified seams against shared state / closures / divergent semantics before splitting, and STOPPED rather than force a leaky abstraction. **Result: 11 splits shipped, 5 verified STOPs.**

| # | File | LOC before → after | Outcome | Commit |
|---|------|--------------------|---------|--------|
| ✅ | `auto-reply/reply/smart-routing.ts` | 1263 → 840 | Keyword data extracted to `smart-routing.keywords.ts` | `283218c13` |
| ✅ | `cli/commands/auth-choice/auth-choice.apply.api-providers.ts` | 957 → 9 (shim) + 1213 across 16 files | 15 per-provider handlers + `dispatch.ts` registry; 45/45 tests pass | `c94f44e9c` |
| ✅ | `channels/impl/discord/components.ts` | 1145 → 1 (shim) + 5 files | `types/custom-id-codec/parsing/builders/index`; codec round-trip preserved | `e98b3b0ae` |
| ✅ | `gateway/server-methods/chat.ts` | 1046 → 4 (shim) + 5 files | `sanitize/transcript-io/abort/handlers/index`; 47/47 tests pass | `da25efc72` |
| ✅ | `channels/impl/telegram/send.ts` | 1189 → 14 (shim) + 4 files | `dispatch/payload/media/index`; `format.ts` already standalone; 68/68 tests | `61c17f839` |
| ✅ | `node-host/invoke.ts` | 923 → 7 (barrel) + 4 files | `environment/result-format/approval/system-run`; 5/5 tests | `67c90e3e2` |
| ✅ | `channels/impl/discord/monitor/agent-components.ts` | 1664 → 1 (shim) + 7 files | `types/context-resolution/dispatch/handlers/agent-classes/discord-classes/index`; 136/136 tests | `9493154c1` |
| ✅ | `infra/outbound/outbound-session.ts` | 991 → 11 (shim) + 22 files | Per-channel resolvers extracted to siblings; **exhaustive `switch (channel)` dispatcher retained** (type-safety preserved); 66/66 tests | `6b2835145` |
| ✅ | `channels/impl/telegram/bot-handlers.ts` | 1384 → 1097 + 5 sibling files | Factories wired: `text-fragment-buffer/media-group-buffer/synthetic/access/constants`; per-call closure state preserved | `78d8a9614` |
| ✅ | `agents/pi-embedded-runner/run.ts` | 1416 → 1340 + 87 (sibling) | Pure `UsageAccumulator` extracted to `run.usage.ts`; other seams deemed too closure-bound | `a30ef9482` |
| ✅ | `agents/subagents/subagent-announce.ts` | 991 → 6 (shim) + 4 files | `formatters/delivery/session-resolver/orchestrator/index`; 150ms poll-loop frozen | `068bc5be5` |
| 🛑 | `memory/compaction/qmd-manager.ts` | 1266 (unchanged) | STOP — spec's "79-method" framing was inaccurate (~40 methods on one class); collection state (`collectionRoots` Map, `sources` Set, `qmd.collections` array) is read by status/read/path-resolution methods outside collection management. Extraction → leaky getters or duplicated state. |  |
| 🛑 | `gateway/server.impl.ts` | 1189 (unchanged) | STOP — file is already mid-refactor; the legitimate subsystem extractions LIVE in `server-core/*` (15 files). What remains is the orchestration shell with ~40 shared locals, several reassigned by config-reloader `setState` callback and captured by `close` handler closure. Forcing extraction → giant mutable `BootContext` + reassignment-semantics changes. |  |
| 🛑 | `gateway/server/ws-connection/message-handler.ts` | 1133 (unchanged) | STOP — handshake is one async flow with ~10 phases (protocol-negotiate, origin, device-validate, shared-auth, device-token, pairing, JWT, service-account, proxy-userId, presence/hello) all mutating shared locals (`authResult`, `authOk`, `authMethod`, `scopes`, `mtUserId/Role/OrgId/assignedAgentIds`) and short-circuiting via `send+close+setHandshakeState("failed")+return`. Trivially separable parts (binary-frame ~17 LOC, post-handshake dispatch ~45 LOC) would total ~60 LOC out of 1133 — cosmetic. |  |
| 🛑 | `config/io.ts` | 1299 (unchanged) | STOP — the spec's "applyXDefaults repeated 3× → applyAllDefaults" target was a recon hallucination. The 3 sites compose **intentionally different** chains: site 1 (`Model→Compaction→ContextPruning→Agent→Session→Logging→Message`), site 2 (`TalkApiKey→Model→Compaction→ContextPruning→Agent→Session→Message`, no Logging), site 3 (`TalkApiKey→Model→Agent→Session→Logging→Message`, no Compaction/ContextPruning). Site-3 skips Compaction so snapshot `diffConfigPaths` doesn't flag phantom diffs — intentional. |  |
| 🛑 | `agents/bash/bash-tools.exec.ts` | 1128 (unchanged) | STOP — single 906-LOC `createExecTool.execute` closure over `defaults`/`warnings`/`execCommandOverride`/etc. Approval flow mutates `warnings` and assigns `execCommandOverride` (safeBins hardening); executor stage reads `execCommand: execCommandOverride`. Extraction → either result-tuples that re-thread mutations (control-flow change) or mutable context obscuring security-relevant data flow. Approval IIFEs close over 15+ locals each; extracting → 15-arg signatures, strictly worse for review of security-sensitive path. |  |

### Recurring sub-patterns inside the god files
- **Defaults-chain** `applyModelDefaults(applyCompactionDefaults(...))` repeated 3× in `config/io.ts:610,750,1250` and in onboard/doctor → single `applyAllDefaults(cfg)` composition (`config/defaults.ts:470`).
- **`apply<Provider>Config` boilerplate** identical across `cli/commands/model-defaults/*` → `createProviderConfigFactory(modelRef, alias)`.
- **Load→mutate→update session store** RMW pattern repeated in `heartbeat-runner.ts:282,368,458` + `state-migrations.ts:810` → `atomicSessionUpdate(path, fn)`.

---

## Wave 4 — Barrel / navigation hygiene · S–M · low

- `gateway/protocol/index.ts` (680 LOC) and `plugin-sdk/index.ts` (173 exports) — group exports by domain with section comments or split barrels.
- `plugins/hooks.ts` (888 LOC) — move the 30+ type re-exports (lines 1–90) into `plugins/types.ts`.
- `channels/impl/line/index.ts` (155 LOC, 70+ re-exports) — split into focused barrels.
- Audit remaining 5-line re-export shims under `cli/commands/` (e.g. `openai-model-default.ts`) → consolidate via `model-defaults/index.ts`.

---

## Deferred / needs-care (do NOT do as mechanical cleanup)
- **`console.log` → logger migration** (255+ sites): behavior-affecting, high risk; only with explicit scope + tests.
- **Redaction consolidation** (`audit/data-classifier.ts`, `logging/redact.ts`, `logging/tool-tracking.ts`): privacy-critical; treat as a deliberate feature task with edge-case tests, not a refactor.
- **`response-formatter.ts` isRecord**: keep local — module is intentionally Cloudflare-Worker-safe (no Node imports).
- **`sandbox/registry.ts` isRecord**: keep — array-inclusive semantics differ from canonical.

---

## Pre-existing issues surfaced (out of scope, worth a separate pass)
`pnpm tsgo` reports 46 errors unrelated to this work: TS2835 "explicit file extension" in several `secrets/probes/*.test.ts` and `extensions/*/ui/**` files, plus implicit-`any` in `secrets/store.test.ts`. These pre-date Wave 1.
