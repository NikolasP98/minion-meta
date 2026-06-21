# Constructed Pipelines — Closing Minion's Dead-Ends (VoltAgent gap analysis)

**Status:** draft · **Date:** 2026-06-20 · **Author:** orchestrator recon
**Scope:** `minion/` gateway + `minion_hub/` (AI Brain page) · **Lens:** ponytail (replace dead-ends/fallbacks with real pipelines, build nothing speculative)

## Problem

A recon of the VoltAgent framework (34-pkg TS agent framework, Vercel-AI-SDK-native) against Minion confirmed Minion **matches or beats it on 8 of 12 pillars** and runs an incompatible runtime (`pi-ai`, not the AI SDK). So there is **nothing to adopt wholesale**. But the recon surfaced something more useful: a set of places where Minion ships a **hard-coded dead-end or fallback instead of a constructed pipeline**:

| As-is dead-end / fallback (file) | What it should be |
|---|---|
| 3 disconnected memory stores, no facade — callers hard-pick a store | one `memory.query`/`memory.write` seam over all three |
| Flows can only **trigger on** `memory:node_*`, can't read/write (`data-nodes.ts` has no memory node) | flow nodes that query/write memory |
| Output guardrail schema with **zero runtime consumer** — `types.guardrails.ts:1` "enforcement deferred to v3.1" | an output-enforcement hook at the reply choke point |
| Stream reconnect → hard-coded **"apology"** copy (`recovery.ts:38`), in-flight events lost | seq-cursor catch-up replay (the wire schema already carries `seq`) |
| Eval harness is GDPVal-specific with **no production caller**; validation scorers "stubbed assumed passing" | general dataset→score loop reusing the existing scorer |
| Telemetry: flat backdated spans, **orphaned** `prometheus-metrics.ts`, runner has zero tracer | OTel run-span tree + `tool.call` event over the existing OTLP exporter |
| `mcpServers` config key explicitly **ignored** (`acp/translator.ts:125`) | real MCP client — external servers + the gw's own `/mcp` |

**The one transferable VoltAgent lesson:** *put one facade where you have N silos.* It applies in exactly two spots (memory, guardrails). Everywhere else Minion is equal or cleaner — VoltAgent's own runtime is a 77K-LOC god-class, no role model.

## Goals

- Replace the seven dead-ends above with real, composable pipelines — **lazy version first**, ceiling documented.
- Unify memory access behind one seam so flows/agents/users/the AI Brain page all use the same call.
- Stay on the `pi-ai` runtime; add **zero** new runtime frameworks; exactly **one** new dependency total (`@modelcontextprotocol/sdk`, for #10).

## Non-goals

- Adopting/porting any VoltAgent package or its Vercel-AI-SDK abstractions.
- Merging the three storage engines (they hold genuinely different shapes: docs / entities-relations / extracted facts).
- Building an observability UI (the dashboard is OSS — Grafana/Tempo).
- Live mid-token stream resumption (Redis-backed); catch-up of missed events is enough until proven otherwise.

---

## ROI ranking (highest → lowest)

ROI = value ÷ effort, with a thumb on the scale for "kills a dead-end that blocks other work." Effort is t-shirt; **dep** flags coupling cost.

| # | Item | Value | Effort | ROI | Unblocks | Decision needed |
|---|------|-------|--------|-----|----------|-----------------|
| **1** | **Memory facade** (`memory.query` + `memory.write` over the 3 stores) | High | M | **★★★★★** | 2,3,7 + AI Brain | ✓ resolved: org-scoped + tier |
| **2** | **`memory_write` tool** (agents can write, not just read) | High | XS | **★★★★★** | — | none (after #1) |
| **3** | **Flow memory nodes** (search/write/get) | High | S | **★★★★☆** | flows→memory | none (after #1) |
| **4** | **Guardrail output enforcement** (hook at reply choke point) | High | S–M | **★★★★☆** | compliance | none |
| **5** | **Evals join** (general dataset→score loop) | Med | XS | **★★★★☆** | quality CI | none |
| **8** | **Durable turn ledger** (restart-resume + reconnect catch-up + delta persistence) | High | M | **★★★★☆** | reliability | ✓ resolved: SQLite ledger, no Redis |
| **6** | **Telemetry span tree** (run-span + `tool.call`, reuse OTLP) | Med-High | M | **★★★☆☆** | observ. plane | none |
| **7** | **AI Brain page** (standalone `/brain`: org view + KG graph) | Med | M | **★★★☆☆** | product | ✓ resolved (after #1) |
| **10** | **MCP client** (consume external + own-gw MCP servers) | High | L | **★★★☆☆** | tool reach | ✓ resolved: build, +1 dep |
| **9** | **Prompt registry** (versioned system prompts + run-stamping) | Med | M | **★★★☆☆** | eval/telemetry reproducibility | ✓ active: SQLite table + resolver |

Rows carry a stable **item ID** (`#`), listed in ROI order. #8 (ledger) jumped from ★★★ to ★★★★ once recon showed the table + boot task already exist (see below); #10 (MCP) moved from parked to active per product decision.

---

## Per-item specs

Each: **As-is (dead-end)** → **Target pipeline** → **Plan (file:line)** → **Skip / ceiling**.

### 1. Memory facade ★★★★★ — the keystone

**As-is.** Three stores, three scopings, no shared API:
- file RAG — agent-scoped, `sqlite-vec` (`src/memory/manager.ts`)
- knowledge graph — per-agent **isolated SQLite silo** (`src/memory/knowledge-graph.ts:341`)
- pgvector corpus — **org-scoped, RLS** (`minion_hub/.../agent-memories.service.ts`)

Agents get read-only `memory_search`/`memory_get` (`tool-registry.ts:158`); flows get nothing; the hub UI talks only to pgvector. Every consumer hard-wires one store.

**Target pipeline.** One `memory.query({ scope, agentId, kinds?, q, k })` + `memory.write({ kind, scope, agentId, payload })` gateway method that fans out to the right backend and merges/reranks. *Facade, not merge* — backends stay as-is behind it. This is the seam VoltAgent's `Memory` class has and Minion lacks.

**Plan.**
- New `src/memory/facade.ts`: `query()` / `write()` dispatch by `kind` (`doc` → manager, `entity` → KG, `fact` → pgvector via existing hub HTTP `api/agent-memories/recall`). Reuse existing search (`src/memory/search/` hybrid+MMR) for the doc/fact merge.
- Gateway protocol method `memory.query`/`memory.write` in `src/gateway/server-methods/` (mirror an existing handler).
- Ingestion/write path **reuses** the shared extractor from `specs/2026-05-22-document-ingestion.md` — do not re-spec ingestion here.

**Scoping (RESOLVED).** **All memory is org-scoped, always** — `orgId` is the mandatory partition key on every store and every query. Within an org, a `scope: 'org' | 'user' | 'agent'` discriminator + the relevant id narrows visibility:
- `org` — shared across the whole org (default for facts everyone should see)
- `user` — visible to one user across their agents
- `agent` — private to one agent

`memory.query`/`memory.write` take `{ orgId, scope, ownerId?, agentId? }`. The pgvector corpus is already org-scoped+RLS — no change. **KG must migrate off per-agent SQLite silos** to the same `orgId + scope + tag` model (the one real data-model change here); file RAG gains the same tag columns. The Brain is therefore *one shared, filterable store*, not N silos.

**Skip / ceiling.** No storage-engine merge — facade dispatches by `kind`, backends stay separate. `// ponytail: org is always the partition; scope tier is a column, not a new store. Collapse engines only if the 3-way split ever causes a real bug.`

### 2. `memory_write` tool ★★★★★

**As-is.** Read tools exist; **no write tool** — agent writes happen only via the KG tool `n` + auto-extraction (a fallback, not an explicit capability).

**Target/Plan.** One tool in `src/tools/tool-registry.ts` mirroring `memory_search`, calling `facade.write()`. ~30 lines. Hard-depends on #1.

**Skip.** No new categories; reuse `memory` group + existing rate-limit/undo wrappers.

### 3. Flow memory nodes ★★★★☆

**As-is.** `src/flows/trigger-manager.ts:30` lets flows **trigger on** `memory:node_created/updated/deleted` — listen-only. `extensions/flows/src/data-nodes.ts` has **no** read/search/write node. A flow can't use memory.

**Target/Plan.** Three data-nodes — `memory.search`, `memory.get`, `memory.write` — each a thin wrapper over the #1 facade. Register in `data-nodes.ts` alongside existing nodes.

**Skip.** No flow-specific memory logic; nodes are facade adapters only.

### 4. Guardrail output enforcement ★★★★☆

**As-is.** `src/config/types.guardrails.ts:1` — *"Enforcement is deferred to v3.1; this phase establishes the config contract only."* Schema with `action?: redact|block|warn` and **zero consumers**. A literal dead-end.

**Target pipeline.** Run output guardrails at the single reply choke point, sharing the input-side `{action, redacted, severity}` result shape (VoltAgent lesson 1b — one contract, not two vocabularies).

**Plan.**
- Hook at `src/auto-reply/reply/reply-dispatcher.ts:156` (right after `sanitizeOutboundText`): call `scanAndRedact` (`src/security/leak-detector.ts:109`) → `redact` reassigns text · `block` mirrors existing skip path (`:149-152`) · `warn`/`dryRun` logs.
- **The real work:** thread `GuardrailConfig` into `enqueue` (none today) via `createReplyDispatcher` from `dispatch-from-config.ts` (holds `cfg`); add `resolveGuardrailFor(agentId, cfg)`.

**Skip / ceiling.** Custom `topicBoundaries`/pattern runner only when a config sets it. **Known asymmetry:** TTS is generated upstream (`:144`) → text redaction won't scrub spoken audio. `// ponytail: credential-redact first; generic pattern runner when a config actually needs it.`

### 5. Evals join ★★★★☆

**As-is.** Two disjoint halves, never wired: the dataset loop (`src/eval/gdpval.ts:130 run()`, injectable agent+scorer) is GDPVal-typed with **no production caller**; the generic weighted scorer (`src/validation-harness/scoring.ts:7-41`) grades one output, many assertions "stubbed assumed passing."

**Target/Plan.** (a) Loosen `GDPValTask` (`gdpval.ts:18-39`) → `EvalTask {id, prompt, metadata, criteria}`, ROI fields optional. (b) One adapter: default `EvalFunction` wraps `runValidationHarness` so scoring reuses `determineGrade` (`scoring.ts:31`). `run()`/`summary()` unchanged.

**Skip.** No new run loop, no scorer framework — both halves already exist.

### 6. Telemetry span tree ★★★☆☆ (roadmap)

**As-is.** `extensions/diagnostics-otel` is a full OTLP pipeline already emitting `tokens`/`cost.usd`/`run.duration_ms` per run (`agent-runner.ts:497`), **but** spans are flat/backdated, the runner (`pi-embedded-runner/run.ts`, 1368 LOC) has **zero tracer refs**, there's **no `tool.call`** event (13 diag types, none for tool dispatch), and `prometheus-metrics.ts` is **orphaned** (no route imports it).

**Target/Plan.** Root run-span in `run.ts` with child spans per LLM call + per tool call via OTel context; add a `tool.call` diagnostic event at the tool layer; either wire `/metrics` or delete the orphaned renderer. Point existing OTLP at Grafana/Tempo.

**Skip.** **No UI.** "VoltOps-like plane" = standard OTLP + OSS dashboard. `// ponytail: instrument what already exports; the dashboard is Grafana, not a product.`

### 7. AI Brain page ★★★☆☆

**As-is.** "AI Brain" is an *archetype label* (`copilot|brain|autonomous`) + config sliders (`AgentSettingsPanel.svelte:47`). The only real space is the per-agent Memory tab (`AgentMemoryPanel.svelte` — search + ECharts scatter + delete) over pgvector only. No KG graph, no cross-agent view.

**Target/Plan.** Promote `AgentMemoryPanel` into a standalone `/brain` route + two views, both reusing existing ECharts: **org-level cross-agent** browser (pgvector is already org-scoped+RLS — data ready) and **KG graph** (ECharts `graph` series; scatter already ECharts). Depends on #1 + its scoping decision.

**Skip.** No new viz stack, no bespoke graph lib, no new backend.

### 8. Durable turn ledger ★★★★☆ — restart-resume + reconnect catch-up + delta persistence, ONE pipeline

**The realization (from recon):** "mid-stream continue", "missed events queue", and "resume unfinished tasks on restart" are **not three systems — they are three reads off one durable turn ledger**, and Minion already has ~80% of it. **No Redis.**

**As-is (three dead-ends, one substrate already present).**
- Turn state IS persisted: `in_flight_turns` table (`src/agents/in-flight-turns/store.ts:17`), per-turn row (channel, session, user message, status). But the state machine is **2-state only** (`running|interrupted`, `store.ts:39`); "done" = row deleted.
- The boot resume task **already exists and already runs**: `recoverInterruptedTurns()` at `server-startup.ts:288` (right after channels start) scans unfinished turns — **and only sends a hard-coded apology** (`recovery.ts:38`). The re-dispatch hook is *already stubbed*: `markRecoveryAttempt` (`store.ts:191`) re-tags to `running` "before re-invoking the agent", but nothing calls it. **The dead-end is one function body.**
- Stream deltas are **in-memory only** (`chatRunState.buffers` Map, `chat-abort.ts:36`) — pushed over WS, never written to SQLite, lost on restart.
- `ioredis` is already a dep but used **only** for an optional reliability-chart cache (`ttl-cache.ts:37`, degrades to in-memory Map). Deployment is **single-node** (fly: 1 machine, one process group). SQLite is the durability substrate.

**Target pipeline.** Promote `in_flight_turns` into the turn/event ledger:
- State machine → `queued | running | streaming | done | interrupted` + `seq` (last broadcast seq for the turn) + `partial_text` (latest streamed snapshot).
- `emitChatDelta` (`server-chat.ts:230`) upserts `partial_text` **coalesced ~1 Hz** (not per token — reuse the outbox `claimBatch` batching, `message-ledger.ts:131`), so write pressure stays flat.
- **Reconnect (brief disconnect):** replay the in-memory buffer — it *already holds the latest full text* (`buffers.get(clientRunId)`), just send it on resubscribe — + a small broadcast ring for non-chat events. Near-zero new work.
- **Restart resume:** swap the apology in `recoverInterruptedTurns` for **re-dispatch into `runEmbeddedPiAgent`** with `partial_text` as prior context (the `markRecoveryAttempt` re-tag is already wired for exactly this).

**Skip / ceiling (honest).**
- **Single-node "continue" = re-dispatch + replay, NOT a provider resume-token.** Lane serialization (`command-queue.ts:42`) and `ACTIVE_EMBEDDED_RUNS` (`runs.ts:14`) are in-memory; on restart you re-run the turn from `partial_text`, not resume the exact generation. The user sees a continued answer; the tail may regenerate. Fine and lazy — most models can't resume a generation anyway.
- **Redis is the multi-replica upgrade path, not now.** Going multi-node breaks the in-memory lanes *and* the single-writer SQLite assumption (`message-ledger.ts:105` explicitly relies on single-process). Until replicas exist, SQLite is lazier and zero new ops.
- Targeted (non-broadcast) events carry no seq — re-fetchable, leave them.
- `// ponytail: promote the table + boot task you already have; persist a coalesced snapshot, not every token; Redis only when you actually run >1 gateway.`

### 9. Prompt registry ★★★☆☆ — versioned prompts + run-stamping (minimal)

**As-is.** System prompts are assembled at runtime in `src/agents/system-prompt/` (`sections/`). There's **no versioning and no record of which prompt a run used** — so evals (#5) and telemetry (#6) can't reproduce or attribute a result to a prompt. A silent dead-end: prompt changes are invisible to measurement.

**Target pipeline.** A minimal registry that versions assembled prompts and **stamps the version onto each run**, closing the reproducibility loop with #5/#6/#8.
- SQLite table `prompt_versions(name, version, body, content_hash, created_at, active)` (reuse existing SQLite infra; co-locate with the turn ledger DB).
- `resolvePrompt(name) → active version` + `recordPromptVersion(name, body)` (hash-dedup: same body → no new row).
- Stamp `promptName@version` onto the turn ledger row (#8) and the run span (#6); evals read it back.

**Plan.** Resolver + table in `src/agents/system-prompt/registry.ts`; call `recordPromptVersion` where the system prompt is finalized in the runner; add `prompt_version` column to the #8 ledger.

**Skip / ceiling.** **NO remote management UI, NO A/B framework, NO prompt editor** — that's VoltOps' product, not ours. Just versioning + stamping. `// ponytail: a table + a resolver + a stamp; the "registry UI" is someone else's SaaS.`

### 10. MCP client ★★★☆☆ — consume external + own-gw MCP servers, one mechanism

**As-is.** `mcpServers` appears only as ACP pass-through that's explicitly **ignored** (`acp/translator.ts:125`). No `@modelcontextprotocol/sdk` (Minion's MCP *server* is hand-rolled JSON-RPC — nothing to reuse). Minion is an MCP **provider** but cannot **consume**.

**Target pipeline.** A single MCP-client path that serves three callers identically: external third-party servers, **the gateway consuming its own `/mcp`**, and the hub consuming the gw — all just `mcpServers` entries.

**Plan.**
- Add `@modelcontextprotocol/sdk` (official client; stdio + StreamableHTTP/SSE).
- `mcpServers` zod block beside `plugins` (`zod-schema.ts:707`): `Record<name, { transport: 'stdio'|'http', command/args/env? | url/headers?, enabled, scope? }>`.
- **`McpClientManager` pre-warms at startup** (sidecar in `server-startup.ts`): connect → `listTools` → wrap as `AnyAgentTool` → cache `Map<server, tools[]>`; re-warm on config hot-reload. Tool assembly **stays synchronous** — spread cached tools at `minion-tools.ts:202`. (This is the lazy move: pre-warm sidesteps the sync→async refactor the recon flagged.)
- **Own-gw MCP is not a special case:** one entry `{ transport: 'http', url: '<gw>/mcp', headers: { Authorization: 'Bearer <gatewayToken>' } }`. Same code path for external servers, gw-consuming-itself, and hub→gw.
- Tools namespaced `mcp__<server>__<tool>`, wired into `normalizeToolName` + tool-policy (respect allow/deny + rate limits like any tool).

**Skip / ceiling.** **Security is NOT lazy:** external MCP is a trust boundary → new servers default to **require-approval** via `autonomy-enforcement.ts` until allowlisted. Real cost is **stdio child-process lifecycle** — manager owns one child per server, restarts on exit, kills on shutdown. `// ponytail: one child per server, no pool until a server needs concurrency; pre-warm so tool assembly never goes async.`

---

## Complexity audit (ponytail pass)

Ran the whole plan back through the ladder (re-run after the three product decisions). Findings:

- **#9 (prompt registry) is now active but kept minimal** — a table + resolver + run-stamp, no UI. It earns its place by closing the eval/telemetry reproducibility loop (#5/#6/#8 can't attribute results to a prompt without it). Resist the VoltOps pull: no remote management, no A/B, no editor.
- **#10 (MCP) is now in-scope** — product decision confirms a real consumer (external servers + the gw's own MCP). It earns its one new dep. But hold the line: **pre-warm at startup** so tool assembly stays sync (no async refactor), **one child per server** (no process pool), **require-approval default** (no skipping the trust boundary). Build the consumer, not a framework.
- **#1 is a facade, not a rewrite — held.** Org is always the partition; the `org|user|agent` tier is a *column*, not a new store. The only migration is KG off per-agent silos. Don't merge engines.
- **#8 got simpler, not bigger.** The instinct to reach for Redis / a new ledger system was wrong: the table (`in_flight_turns`) and the boot task (`recoverInterruptedTurns`) already exist; the re-dispatch hook is already stubbed. The build is *promote what's there* + persist a **coalesced 1 Hz snapshot** (not per-token). Redis is explicitly deferred to the multi-replica future. This is the cleanest dead-end→pipeline in the set.
- **#6 must not grow a UI.** The pull toward "a VoltOps-like dashboard" is the over-build trap. Spans → existing OTLP → Grafana. Zero new surface.
- **#4's hook is 10 lines; its cost is config-threading.** Don't build a generic policy engine — `scanAndRedact` (credential redaction) covers the shipping case; add a pattern runner only when a config sets `topicBoundaries`.
- **#5 writes no new loop.** Both halves exist; this is glue, not a framework.
- **Net new dependencies across the active plan (#1–#8, #10): ONE** (`@modelcontextprotocol/sdk`, for #10). Net new files: ~7 (facade, 1 tool, 3 flow nodes, eval adapter, MCP manager). Everything else is hooks into existing choke points, tables, and boot tasks.

Every item replaces a dead-end with the *minimum* pipeline that removes it. The single most ponytail-aligned outcome: #8, where the "big durable-execution + Redis" temptation collapsed into "swap one apology for a re-dispatch and persist a snapshot."

---

## Sequencing (dependency order)

1. **#1 memory facade** (org-scoped + tier; migrate KG off silos) → unblocks #2, #3, #7.
2. **#2 memory_write tool** + **#3 flow nodes** (parallel, both trivial after #1).
3. **#4 guardrail output** + **#5 evals join** (independent, parallel, no decisions) — *the two no-decision quick wins; start here in parallel with #1.*
4. **#8 durable turn ledger** (promote `in_flight_turns` + boot re-dispatch + 1 Hz delta snapshot).
5. **#7 AI Brain page** (after #1).
6. **#10 MCP client** (add SDK + manager; pre-warm sidecar).
7. **#6 telemetry** (independent; schedule when observability is a priority).
8. **#9 prompt registry** (after #8 ledger exists — stamps onto it; pairs with #6 + #5).

## Decisions (ALL RESOLVED — 2026-06-20)

1. **Memory scoping** ✓ — org-scoped *always*; `scope: org | user | agent` tier as a column; KG migrates off per-agent silos to match. Gates #1, #7.
2. **Resumption model** ✓ — one durable SQLite turn ledger serves restart-resume + reconnect catch-up + delta persistence; "continue" = re-dispatch + replay (not a provider resume-token); **no Redis** until multi-replica. Gates #8.
3. **MCP** ✓ — build the client; consume external servers *and* the gw's own `/mcp` via one path; +1 dep (`@modelcontextprotocol/sdk`). Gates #10.

## Definition of done (active scope = #1–#10, all active)

- One `memory.query`/`memory.write` seam, org-scoped with `org|user|agent` tier; agents (#2), flows (#3), and the `/brain` page (#7) all call it; no consumer hard-picks a store. KG is off per-agent silos.
- Output guardrails enforce `redact|block|warn` at the reply choke point (#4).
- A general eval suite runs dataset→score with the existing scorer (#5).
- A gateway restart **resumes** unfinished turns (re-dispatch, not apology) and reconnects replay in-flight deltas; turn state lives in the promoted `in_flight_turns` ledger (#8).
- Per-agent-run OTel span tree with tool-call children exports over the existing OTLP pipeline (#6).
- External + own-gw MCP servers' tools appear in agent toolsets, namespaced and approval-gated (#10).
- Every run is stamped with the resolved `promptName@version`; evals/telemetry can attribute results to a prompt (#9).
- Net new runtime dependencies: **1** (`@modelcontextprotocol/sdk`). All seven dead-ends in the table above are gone.

## References

- VoltAgent recon (this session) · `specs/2026-05-22-document-ingestion.md` (write/ingest path for #1)
- Memory engine: `minion/src/memory/{manager,knowledge-graph,facade(new)}.ts`, `src/memory/search/`
- Guardrails: `src/config/types.guardrails.ts`, `src/auto-reply/reply/reply-dispatcher.ts:156`, `src/security/leak-detector.ts:109`
- Streaming: `src/gateway/protocol/schema/frames.ts:160`, `src/gateway/server-core/server-broadcast.ts:121`
- Telemetry: `extensions/diagnostics-otel/src/service.ts`, `src/agents/pi-embedded-runner/run.ts`
- Hub: `minion_hub/src/lib/components/agents/AgentMemoryPanel.svelte`, `server/services/agent-memories.service.ts`
