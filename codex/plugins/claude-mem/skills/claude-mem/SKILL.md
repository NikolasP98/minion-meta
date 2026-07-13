---
name: claude-mem
description: Search and use claude-mem persistent coding-session memory from Codex. Use when the user asks what happened in prior sessions, whether something was already solved, how a prior implementation worked, or to save/reuse project observations across sessions.
---

# claude-mem

Use the `mcp-search` tools from this plugin when available.

## Search workflow

1. Search first with a focused query.
   - Prefer 5-20 results.
   - Filter by project when obvious, usually the repo or subproject basename.
2. Inspect result titles/IDs before fetching full observations.
3. Fetch only the specific observations needed.
4. State when findings come from memory rather than current source inspection.

Expected MCP tools:

- `search` — returns indexed memory results.
- `get_observations` — fetches selected observation details.

## Save workflow

When a task reveals a reusable pattern, decision, gotcha, or deployment recipe, save concise durable memory through active claude-mem hooks or available memory tools. Do not save secrets, raw credentials, private tokens, or unrelated transcript bulk.

If hooks are unavailable in the current session, tell the user the memory should be captured and include the concise memory text in the final response.
