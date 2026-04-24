---
'@minion-stack/shared': minor
---

Upgrade `extractText` in `@minion-stack/shared/utils` to handle `tool_use`, `tool_result`, and `image` content blocks — backported from minion_hub's local copy.

Previously `extractText` only extracted plain text parts. Now:

- `tool_use` blocks render as `[Tool: <name>]`
- `tool_result` blocks unwrap their `content` (string or nested text-block array)
- `image` / `image_url` blocks render as `[Image]`
- Mixed content (text + tool_use) preserves order and joins with newlines

This lets minion_site and other consumers get richer chat display without duplicating the logic locally. Existing simple-text callers see no behavior change.

Tests ported from minion_hub (22 cases covering tool blocks, images, metadata stripping, and role-specific cleaning).
