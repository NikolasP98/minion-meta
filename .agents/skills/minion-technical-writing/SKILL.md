---
name: minion-technical-writing
description: Write or review precise MINION technical documentation and agent-facing instructions. Use for READMEs, runbooks, references, tutorials, specs, architecture notes, AGENTS.md, CLAUDE.md, skills, prompts, and other machine-consumed Markdown where exact symbols, commands, constraints, or routing must survive.
---

# MINION technical writing

Preserve exact symbols, paths, flags, commands, code, machine-readable frontmatter, and force-bearing terms such as `must`, `never`, `only`, `all`, and `required`. Do not normalize or paraphrase them unless the source of truth changed.

Follow local documentation and product terminology first. Use one name per concept. Verify paths, symbols, output, counts, and commands against the repository.

## Choose a branch

- For human-facing technical prose, read [technical-prose.md](references/technical-prose.md).
- For skills, prompts, `AGENTS.md`, `CLAUDE.md`, or other agent-facing material, also read [agent-facing.md](references/agent-facing.md).

## Shared workflow

1. Identify the reader's task and the document's single primary mode.
2. Locate machine-owned spans and the authoritative code or config.
3. Preserve those spans byte-exact while revising prose around them.
4. Put conditions before actions. Use direct commands for procedures.
5. Keep one instruction or thought per sentence when splitting improves clarity.
6. Remove filler without weakening certainty, scope, attribution, or safety language.
7. Re-run every safe command or use its authoritative `--help`; validate links, frontmatter, and examples.
8. Review the diff for accidental symbol, command, and force changes.

If meaning is uncertain, leave the span unchanged and report the ambiguity. Do not make prose smoother by changing technical truth.
