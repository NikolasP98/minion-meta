---
name: lessons-learned
description: Capture observations, improvements, and durable memory follow-ups after a non-trivial coding task, deployment, bug fix, infrastructure change, or implementation. Use when the user asks for lessons learned, post-task review, improvement capture, deployment observations, or when recurring patterns should be saved into the active memory system.
---

# Lessons Learned

Use this after completing meaningful work to turn execution friction into concrete improvements and durable memory.

## Workflow

1. Observe during execution:
   - friction points or manual workarounds
   - version/config drift
   - missing flags, automation, or docs
   - confusing output or UX
   - performance issues or excessive round trips
   - recurring gotchas that should affect future work
2. Summarize observations before proposing fixes:

   ```text
   Observations and potential improvements:

   1. [Category] — What happened, why it matters, and the concrete fix if obvious.
   2. ...
   ```

3. Ask before expanding scope:
   - “Want me to file these as improvements and/or fix any now?”
4. If approved, implement fixes as separate, scoped changes.
   - For version drift, search all references before changing one file.
   - For UX/output fixes, check all conditional branches.
   - For performance fixes, quantify before/after when possible.
5. Save durable memory when a pattern is likely to recur.
   - Prefer available memory tools in this order: `claude-mem`, `mempalace-memory`, then Codex native memory if exposed in the session.
   - Do not save secrets, raw credentials, or sensitive user data.
   - Save concise rules/patterns, not long transcripts.

## Commit guidance

Keep primary task commits separate from follow-up improvement commits when practical.

Use a message shape like:

```text
fix(scope): address lessons from <task>

- Improvement 1 with measurable impact
- Improvement 2 with source/context
```
