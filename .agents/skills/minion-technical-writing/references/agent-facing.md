# Agent-facing writing

Design agent-facing documents for predictable process, not identical output.

## Route by branch

A pointer must say what it opens and the distinct condition that requires it. Put trigger terms early. Collapse synonyms that describe the same branch. Inline what every run needs; put branch-specific reference one level away and name when to load it.

## Separate steps from reference

Keep ordered actions visible. Give each step a checkable, demanding completion criterion. Co-locate a concept's definition, rules, exceptions, and failure example. Split when optional reference buries the main sequence or when genuinely separate branches would otherwise load together.

## Reduce load without hiding obligations

- Keep one authoritative statement for each rule.
- Treat code, config, directory layout, and `--help` as sources of truth; do not cache cheap lookups in prose.
- Retain only non-obvious convention, rationale, routing, and hazards.
- Use established compact terms when they sharpen behavior; define any project-local term once.
- Prefer positive target behavior. Use prohibitions only for hard guardrails, paired with the required behavior.
- Delete no-op instructions that do not change agent behavior.

## Protect machine contracts

Preserve YAML frontmatter keys and delimiters, XML-like tags, JSON keys, command tokens, placeholders, environment variable names, exact symbols, and force-bearing language byte-for-byte unless intentionally changing the contract. Validate the machine format after editing.
