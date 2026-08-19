---
name: minion-unslop
description: Audit English Markdown for deterministic AI-writing phrase, structure, silhouette, and readability signals while preserving facts and technical force. Use when asked to unslop, humanize, clean up, or review prose; this MINION variant is report-only by default and never rewrites or authorizes a merge automatically.
---

# MINION UNSLOP

Treat every result as advisory. The default action is **scan and report only**. Never rewrite text unless the human explicitly requests a rewrite in the current task. Never grant merge, publish, approval, or acceptance authority. English only; for non-English text, decline the prose judgment and leave the text unchanged.

Read [core-contract.md](references/core-contract.md) before any audit or requested rewrite. Read [fact-preservation.md](references/fact-preservation.md) before proposing edits to facts, technical instructions, policy, legal, safety, or security text.

## Audit

Resolve `scripts/audit.py` relative to this skill's loaded directory, never relative to the working directory. For a project-local install, this shell snippet searches parent directories; a Claude plugin may instead use `${CLAUDE_PLUGIN_ROOT}/skills/minion-unslop/scripts/audit.py`.

```bash
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  audit="$CLAUDE_PLUGIN_ROOT/skills/minion-unslop/scripts/audit.py"
else
  root=$PWD
  until [ -f "$root/.agents/skills/minion-unslop/scripts/audit.py" ] || [ "$root" = / ]; do root=$(dirname "$root"); done
  audit="$root/.agents/skills/minion-unslop/scripts/audit.py"
fi
[ -f "$audit" ] || { echo "minion-unslop audit.py not found" >&2; exit 2; }
python3 "$audit" -- path/to/file.md path/to/another.md
```

The wrapper prints deterministic JSON sections and returns zero when scans find issues. A nonzero status means invocation or tool failure, never prose findings.

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
