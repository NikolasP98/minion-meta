# Tasks: Hub AI chat kit

- [x] T001 `ai/ai-state.ts`, `ai/sources.ts` + `sources.test.ts` (FR-008)
- [x] T002 `AiToolCall.svelte` + status ring (FR-007)
- [x] T003 `AiReasoning.svelte` (FR-006)
- [x] T004 `AiSources.svelte` (FR-008)
- [x] T005 `AiApproval.svelte` (FR-009)
- [x] T006 `AiConversation.svelte` (FR-004)
- [x] T007 `AiPromptInput.svelte` (FR-001, FR-002)
- [x] T008 `AiMessage.svelte` + `MessageActions` reveal (FR-005)
- [x] T009 Paraglide keys `en`/`es` + `i18n:compile` (FR-010)
- [x] T010 `ChatBlocks.svelte` adopts T002–T004 (S2, FR-011)
- [x] T011 `AssistChoice.svelte` → AiApproval
- [x] T012 `abortChat()` in `chat-rpc.ts` (FR-003)
- [x] T013 `ChatPanel.svelte` → AiConversation + AiPromptInput + AiMessage via ChatMessage
- [x] T014 `FloatingAssistant.svelte` → AiConversation + AiPromptInput (Stop)
- [x] T015 `/home` thread → AiConversation; `.ai-message-root` on bubble rows
- [x] T016 mounted tests: prompt input, reasoning, approval
- [x] T017 gates: `bun run check`, scoped `vitest`, `lint:design && lint:tokens`, prettier on changed files
- [x] T018 browser proof on `dev:local` (evidence/): reasoning/tools, hover reveal, jump pill (scrollTop held at 0 during stream), floating Stop (run ended 176 ms after click). Sources NOT live-proven: local gateway lacks a Brave key — unit + mounted tests only (ledger item 3)
- [x] T019 ledger: `TODO(handoff)` + proposal for `/home` composer migration

## Amendment A — orb face
- [x] T020 `ai/orb-color.ts` (+test): accent hex → OkLab stops, light/dark mixes
- [x] T021 `ai/AiOrb.svelte` WebGL2 port with painted fallback + context release
- [x] T022 `ai/AiOrbFace.svelte`: expressions, blink, gaze, saccades, error, done, listening
- [x] T023 swap 4 `OpenHumanAvatar` + 4 `Sparkles` sites; delete the mascot
- [x] T024 gates + dev:local screenshots
