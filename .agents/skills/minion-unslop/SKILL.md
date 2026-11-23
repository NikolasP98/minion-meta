---
name: minion-unslop
description: Audit English Markdown for deterministic AI-writing phrase, structure, silhouette, and readability signals while preserving facts and technical force. Use when asked to unslop, humanize, clean up, or review prose; this MINION variant is report-only by default and never rewrites or authorizes a merge automatically.
---

# MINION UNSLOP

Treat every result as advisory. The default action is **scan and report only**. Never rewrite text unless the human explicitly requests a rewrite in the current task. Never grant merge, publish, approval, or acceptance authority. English only; for non-English text, decline the prose judgment and leave the text unchanged.

Read [core-contract.md](references/core-contract.md) before any audit or requested rewrite. Read [fact-preservation.md](references/fact-preservation.md) before proposing edits to facts, technical instructions, policy, legal, safety, or security text.

## Audit

Resolve every script in `scripts/` relative to this skill's loaded directory, never relative to the working directory. This shell snippet sets `$unslop` to that directory for a Claude plugin install and for a project-local `.agents` install; every command in this skill and its references uses `$unslop`. A Cursor or Codex project needs the skill tree copied to `<project>/.agents/skills/`, so that `$unslop` resolves to `<project>/.agents/skills/minion-unslop/scripts`; the marketplace README documents the copy.

```bash
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  unslop="$CLAUDE_PLUGIN_ROOT/skills/minion-unslop/scripts"
else
  root=$PWD
  until [ -d "$root/.agents/skills/minion-unslop/scripts" ] || [ "$root" = / ]; do root=$(dirname "$root"); done
  unslop="$root/.agents/skills/minion-unslop/scripts"
fi
[ -f "$unslop/audit.py" ] || { echo "minion-unslop scripts not found" >&2; exit 2; }
python3 "$unslop/audit.py" -- path/to/file.md path/to/another.md
```

The wrapper prints deterministic JSON sections and returns zero when scans find issues. A nonzero status means invocation or tool failure, never prose findings.

`--genre` selects the threshold profile the structure and silhouette scans score against: `docs` (the default, for documentation, READMEs, and reference material), `prose` (articles, posts, essays), or `social`. Pass it before the `--` separator, and state the genre used when reporting, because thresholds differ between profiles.

Every scan obeys the English-only contract. The banned-phrase, structure, and silhouette scans each carry their own language check and decline on their own; the wrapper never overrides one of those verdicts. Readability carries no language check, so the wrapper applies the same shared heuristic to the file itself and declines that scan when the text is not English, rather than scoring it against an English syllable model.

Verdicts can therefore differ across scans on one file. That is intended: each scan reports what it confirmed. A structure or silhouette flag on non-English text is a cadence measurement that does not depend on language, while a declined scan means that scanner refused to judge. Read both, name which scans declined, and treat a mixed verdict as a signal that the language heuristic sits near its threshold.

Report:

1. The file and scanner category.
2. The smallest quoted span or document-level metric.
3. Why it may be a defect in context.
4. Whether the match is confirmed, protected/domain-valid, or a judgment call.
5. A minimal proposed repair only if the user asked for suggestions.

A scanner match does not authorize an edit. Protect literal terms, quotations, attribution, code, domain language, accurate caveats, and genre-natural structure. Soft cadence or silhouette scores are weak evidence by themselves.

## Explicit rewrite requests

Preserve untouched sentences byte-for-byte. Repair only confirmed spans with the smallest change. Preserve facts, quantities, names, dates, quotations, citations, code, commands, symbols, paths, units, scope, uncertainty, attribution, register, and force-bearing terms. Validate against the original with `extract_constraints.py`, `validate_preservation.py`, and `diff_check.py`. Return the proposal for review; do not apply, merge, publish, or approve it unless separately and explicitly authorized.

Upstream's latest valid public result is **NO-SHIP**. Do not represent this skill as proven to improve prose safely.
