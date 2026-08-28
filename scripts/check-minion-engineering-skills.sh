#!/usr/bin/env bash
# Validate the checked-in interactive bundle without requiring subproject clones.
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SKILLS="$ROOT/.agents/skills"
REQUIRED=(minion-engineering minion-technical-writing minion-unslop)

for skill in "${REQUIRED[@]}"; do
	[ -f "$SKILLS/$skill/SKILL.md" ] || { echo "missing checked-in skill: $skill" >&2; exit 1; }
	cmp "$SKILLS/THIRD_PARTY_NOTICES.md" "$SKILLS/$skill/THIRD_PARTY_NOTICES.md"
done

grep -Eq '^repository=https://github\.com/NikolasP98/minion_plugins$' "$SKILLS/MINION_ENGINEERING_SOURCE"
grep -Eq '^commit=[0-9a-f]{40}$' "$SKILLS/MINION_ENGINEERING_SOURCE"
PYTHONDONTWRITEBYTECODE=1 python3 "$SKILLS/minion-unslop/tests/test_audit.py"
echo "checked interactive MINION engineering skill bundle"
