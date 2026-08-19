#!/usr/bin/env bash
# Sync the curated MINION skill bundle into Factory and project-local agents.
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PLUGIN="$ROOT/minion_plugins/plugins/minion-engineering"
FACTORY="$ROOT/minion_factory"
FACTORY_CHECK="$FACTORY/scripts/check-agent-skills.py"
FACTORY_SKILLS="$FACTORY/agent/skills"
SKILLS=(minion-engineering minion-technical-writing minion-unslop)
FACTORY_SHARED=(minion-technical-writing minion-unslop)

[ -d "$PLUGIN/skills" ] || { echo "missing plugin: $PLUGIN" >&2; exit 1; }
[ -d "$FACTORY" ] || { echo "missing subproject: $FACTORY" >&2; exit 1; }
[ -f "$FACTORY_CHECK" ] || { echo "missing factory checker: $FACTORY_CHECK" >&2; exit 1; }
for skill in "${SKILLS[@]}"; do
	[ -f "$PLUGIN/skills/$skill/SKILL.md" ] || { echo "missing skill: $skill" >&2; exit 1; }
	cmp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$PLUGIN/skills/$skill/THIRD_PARTY_NOTICES.md"
done

# Factory owns a stage-specific engineering skill and shares the exact writing
# and advisory-audit skills with interactive agents.
mkdir -p "$FACTORY_SKILLS"
for skill in "${FACTORY_SHARED[@]}"; do
	rm -rf "$FACTORY_SKILLS/$skill"
	cp -a "$PLUGIN/skills/$skill" "$FACTORY_SKILLS/$skill"
done
cp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$FACTORY_SKILLS/THIRD_PARTY_NOTICES.md"

# Project scope keeps the installation reproducible and avoids mutating global
# agent configuration. The installer creates the host-specific discovery links.
(
	cd "$ROOT"
	pnpm dlx skills@1.5.23 add "$PLUGIN" \
		--agent claude-code cursor codex \
		--skill "${SKILLS[@]}" \
		--yes
)

cp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$ROOT/.agents/skills/THIRD_PARTY_NOTICES.md"
for skill in "${SKILLS[@]}"; do
	diff -qr "$PLUGIN/skills/$skill" "$ROOT/.agents/skills/$skill"
done
cmp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$ROOT/.agents/skills/THIRD_PARTY_NOTICES.md"
for skill in "${FACTORY_SHARED[@]}"; do
	diff -qr "$PLUGIN/skills/$skill" "$FACTORY_SKILLS/$skill"
done
cmp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$FACTORY_SKILLS/THIRD_PARTY_NOTICES.md"
python3 "$FACTORY_CHECK"
echo "synced MINION engineering skills for Claude, Cursor, Codex, and Factory"
