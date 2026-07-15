# Hub — TanStack AI fit assessment: DO NOT ADOPT (+ the real work it surfaced)

**Date:** 2026-07-06
**Repo:** `minion_hub/` (SvelteKit 2, Svelte 5 runes, Bun, branch `dev`)
**Library:** TanStack AI — https://tanstack.com/ai/latest
**Verdict:** SKIP for now. Re-evaluate at `@tanstack/ai` 1.0 **or** if the gateway ever adopts the AG-UI wire protocol natively.
**But:** the recon surfaced three concrete cleanup workstreams (§3) that ARE executable by sonnet agents today, with zero new dependencies.

---

## 1. What TanStack AI is (so the verdict is legible later)

Two clean halves: `@tanstack/ai` (server LLM SDK — provider adapters incl. Anthropic + OpenRouter, `chat()`, isomorphic `toolDefinition().server()/.client()`, zod `outputSchema`, middleware, AG-UI wire protocol) and `@tanstack/ai-client` + `@tanstack/ai-svelte` (headless chat client; the Svelte binding is genuinely runes-native — `createChat` with `$state` internally, no store shim, unlike the Virtual situation). Transport is pluggable: a documented `SubscribeConnectionAdapter` interface (`subscribe()` long-lived stream + `send()` per message) explicitly designed for a single long-lived WebSocket serving many runs — with a full WS example in the docs.

Maturity: repo is ~9 months old, pre-1.0 everywhere (`@tanstack/ai` 0.39.1 = 64 releases; `ai-svelte` 0.14.2 = 66 releases; near-daily commits and breaking minors). Known friction: `@ag-ui/core` transitive Zod-3 conflict for Zod-4 consumers (issue #520 — hub is on Zod 4), Anthropic structured-output JSON edge cases (#282), no server-side persistence story (#715), **no embeddings API at all**, `ai-svelte` requires manual `chat.stop()` on destroy.

## 2. Why it doesn't fit the hub (both recon agents independently converged)

- **The gateway owns the LLM loop.** TanStack AI's server value (middleware, agent-loop strategies, tool approval, devtools) assumes `chat()` runs in the process terminating the client connection. Here that process is the gateway (separate Node service, own repo), reached over the custom `req`/`res`/`event` WS frame protocol in `@minion-stack/shared`. Adopting the server half means teaching the *gateway* AG-UI — an architectural commitment far beyond hub scope.
- **Client-half-only = writing a protocol translator.** A `SubscribeConnectionAdapter` shim would have to re-encode gateway frames as AG-UI `StreamChunk`s AND still reimplement everything that is protocol business logic, not transport: the typewriter smoother (`chat.svelte.ts:186-322`, deliberately `setTimeout` not rAF), the gateway-context-stripping regexes (`chat-rpc.ts` — voice prefix, page-context, semantic-recall envelopes), the dual Anthropic/gateway-native content-block schema, the reconcile-after-final `chat.history` reload, and cross-run `runId` guards. You'd build the adapter, not adopt the library — against a pre-1.0 event surface shipping breaking changes near-daily.
- **The server side already chose its SDK.** Hub has `ai@^6` + `@ai-sdk/openai@^3` (Vercel AI SDK, stable v6) in production across 11 files (`generateText`/`generateObject`/`streamObject`/`tool()`). TanStack AI would be a second, younger SDK doing the same job, minus embeddings (which hub needs for pgvector).

**Re-adoption triggers (record, then move on):** (a) `@tanstack/ai` hits 1.0 with stable AG-UI shapes AND the gateway wants AG-UI as its wire protocol; (b) a green-field chat surface appears that talks HTTP/SSE directly to a SvelteKit endpoint instead of the gateway.

---

## 3. The real work the recon surfaced (executable NOW, no new deps)

These are internal-consistency workstreams — each is a standalone spec-sized task for a sonnet agent. They deliver most of what a chat/LLM library would have bought, at zero dependency risk.

### W1 — Consolidate the 5 divergent chat message renderers (MEDIUM-HIGH)

Five independent implementations of "render a ChatMessage's content blocks" read the same `agentChat` state with wildly different feature coverage:

| Consumer | Tool cards | Thinking | Impl |
|---|---|---|---|
| `src/lib/components/my-agent/ChatTurn.svelte` (used by `/home`) | ✅ full (pending/success/error keyed by `toolResults[id]`) | ✅ collapsible | own `blocks/metaBlocks/bodyBlocks` derivation (lines 27-74) |
| `src/routes/(app)/home/+page.svelte:272-406` | (feeds ChatTurn) | — | **second** independent aggregation pass: `toolResultsById`, `isToolResultOnly`, `stringifyToolResult`, handles BOTH Anthropic (`tool_result`/`tool_use_id`) and gateway-native (`role:'toolResult'`/`toolCallId`) shapes |
| `src/lib/components/layout/FloatingAssistant.svelte:167-183` | ❌ silently dropped | ❌ | **third** `isToolResultOnly` copy, commented "Mirrors /home's" |
| `src/lib/components/chat/ChatMessage.svelte` (agent-detail panel) | ❌ vanish entirely | ❌ | `extractText()` flatten only |
| `src/lib/components/sessions/SessionViewer.svelte:39-47` | ❌ | ❌ | fourth standalone `extractContent()` |

Net: 3 copies of the "is this a tool-result carrier" predicate, 2 tool-call-card implementations (one real, one absent), and the same message renders differently on 4 surfaces.

**Task:** extract ONE shared module — `src/lib/chat/blocks.ts` (pure functions: normalize both block schemas into a typed `ChatBlock[]`, `isToolResultOnly`, `toolResultsById`, `stringifyToolResult`) + ONE `<ChatBlocks>` component (renders text/markdown, collapsible thinking, tool cards, images; props to disable heavy features for compact surfaces). Route all five consumers through it. ChatTurn's rendering is the reference implementation — hoist it, don't rewrite it. Behavior change to advertise in the commit: FloatingAssistant and the agent-detail ChatPanel will start showing tool/thinking blocks (that's the point).
⚠️ Coordinate with the Virtual spec (`specs/2026-07-05-hub-tanstack-virtual.md` T2 touches SessionViewer): land whichever goes first, rebase the other.

### W2 — Kill the 6 raw-fetch LLM endpoints + shared OpenRouter factory (MEDIUM)

- The exact `createOpenAI({ apiKey: OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })` block is copy-pasted into **12 files**. Add `src/server/llm.ts` → `getOpenRouterModel(modelId: string)` and swap all 12.
- Migrate the raw-fetch outliers onto the `ai` SDK already in package.json:
  - `src/routes/api/builder/ai/{dry-run,analyze-run,suggest-prompts,suggest-skill,suggest-chapter}/+server.ts` — hand-rolled `fetch('https://openrouter.ai/api/v1/chat/completions')`, manual `choices[0]` extraction, and **duplicated hardcoded pricing tables** (`suggest-skill/+server.ts:9-12` ≡ `suggest-chapter/+server.ts:9-12`) → `generateText` via `getOpenRouterModel`; hoist the pricing table to one shared const (or drop cost display if unused).
  - `src/routes/api/marketplace/generate-agent/+server.ts:24,68-91` — raw Anthropic Messages API + `JSON.parse` on free text with **no schema validation** (malformed/injected output throws) → `generateObject` + zod schema.
- `src/server/services/embeddings.ts` stays raw-fetch **deliberately** (documented OpenRouter-embeddings permission rationale at lines 3-14) — optionally migrate to the SDK's `embedMany()` only if it supports a custom baseURL cleanly; otherwise leave, it works.

### W3 — Replace regex-JSON extraction with `generateObject`+zod in batch jobs (LOW-MEDIUM)

Half the CRM batch jobs call `generateText` then `text.match(/\[[\s\S]*\]/)` + `JSON.parse` with no schema: `crm/tags/[id]/evaluate/+server.ts:67`, `crm/cleanup/review/+server.ts:88`, `crm/contacts/[id]/funnel/analyze/+server.ts:76`, `crm-insights.service.ts:79-146`, `crm-journey.service.ts:162-163`, `crm-similarity.service.ts:181-182`. Each has silent-skip error handling (failed batch → dropped, no retry). Swap to `generateObject` with a zod schema per job; keep the existing fallback semantics (these are best-effort enrichment jobs — deterministic fallbacks in `reminder-compose.ts` are the model to preserve, don't make failures louder than today).

---

## Execution rules (W1–W3)

Branch `dev` in `minion_hub/`; one commit per workstream; `bun run check` + `bun run build` per task; browser QA for W1 (all 5 chat surfaces: `/home`, ⌘J floating assistant, agent-detail chat, `/sessions` viewer, plus a tool-call-bearing conversation); for W2/W3 exercise one endpoint per file touched (the builder AI endpoints and CRM tag evaluate can be hit via their UI or curl with a session cookie). Surgical staging — concurrent WIP exists.
