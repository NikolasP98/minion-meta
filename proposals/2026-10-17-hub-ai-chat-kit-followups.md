---
id: 2026-10-17-hub-ai-chat-kit-followups
title: Hub AI chat kit — follow-ups left by spec 019
status: open
repo: minion_hub
spec: specs/019-hub-ai-chat-kit/spec.md
created: 2026-10-17
---

# Hub AI chat kit — follow-ups (spec 019)

Open ends from the first slice (hub `feat/ai-components`). Each has a `TODO(handoff)` at the site.

1. **/home composer is not on AiPromptInput.** `my-agent/ChatInput.svelte` keeps its terminal-style composer (mentions, `/` skills, drag-in context chips, `#` capture mode). /home therefore has no Stop control. Move those features into AiPromptInput's toolbar slot and attachment chips, then wire `abortChat()`.
2. **Live tool rings settle only on commit.** `ChatBlocks.toolStatus()` reads results from committed history (`toolResultsById`), so a tool that finished mid-stream keeps the running ring until the turn commits. `chat.liveTools` already tracks per-tool progress; feed its completion into the live turn.
3. **Sources not proven live.** The local gateway has no Brave Search key (`web_search` → `missing_brave_api_key`), so the sources stack was verified by unit and mounted tests only. Verify on a gateway with web search configured.
4. **Tool "success" can carry an error payload.** `crm_query` returned `{"code":"ASSISTANT_SQL_DISABLED", …}` with `isError:false`, so its ring shows done. The ring is honest to the transport flag; the gateway tool should set `isError` for refusals.
5. **Floating-assistant factory submit label.** The factory mode now uses the kit's generic "Send message" label instead of `factoryDesk_submit`. Add a `submitLabel` prop if the distinction matters.
6. **No vote actions.** SmoothUI's thumbs up/down were skipped: there is no feedback store to receive them.
