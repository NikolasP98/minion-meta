# Implementation Plan: Hub AI chat kit

**Spec**: [spec.md](spec.md) | **Repo**: minion_hub (`bun`, PR base `master`) | **Worktree**: `~/.cache/claude-tmp/hub-ai` on `feat/ai-components` off `origin/master@21c00d15`

## Constitution check
- I spec-first: this spec/plan/tasks precede code. ✅
- II AS-IS/TO-BE/DELTA with anchors: spec §1. ✅
- III one slice → one hub PR from an isolated worktree, gates in the foreground. ✅
- IV UI build steps: design-token contract + `bun run lint:design && bun run lint:tokens`; Paraglide `en`/`es` + `i18n:compile`; no new route ⇒ no route-contract or RBAC change. ✅
- V no security/data tags (one existing RPC, `chat.abort`, scoped by the session key the surface already owns). ✅

## Technical approach
- `src/lib/components/ai/`: `ai-state.ts` (AIState type), `sources.ts` (pure `turnSources(blocks, toolResults)`), `AiPromptInput`, `AiConversation`, `AiMessage`, `AiReasoning`, `AiToolCall` (+ `AiToolStatusRing`), `AiSources`, `AiApproval`, `index.ts`.
- Motion: Svelte `slide`/`fade`/`scale` with `prefersReducedMotion` from `svelte/motion` (duration 0 when reduced) and CSS keyframes under `@media (prefers-reduced-motion: reduce)`; SVG ring uses `pathLength=1` + `stroke-dasharray` transitions, check/cross drawn with `stroke-dashoffset`.
- Tokens: `--color-foreground|muted-foreground|border|accent|danger-*|success-*`, `--space-*`, `--radius-*`, `--duration-*`, `--ease-standard`; checked against `packages/design-tokens/contract.json` via the hub lints.
- Stop: `abortChat(agentId, sessionKey?)` in `services/gateway/chat-rpc.ts` → `sendRequest('chat.abort', { sessionKey })`; the existing `aborted` event handler clears state.
- Adoption order: ChatBlocks (all surfaces benefit) → AssistChoice → ChatPanel → FloatingAssistant → `/home` scroll + MessageActions.

## Risks
- FloatingAssistant is 1255 lines with factory mode: the composer swap keeps its `send()`, `onInputKey` hotkeys, and `composerMode` placeholder logic.
- `ChatBlocks` is used by 6 surfaces; compact mode must keep icon+status-only rows.
