#!/usr/bin/env bash
# Sync the released MINION skill bundle into Factory and project-local agents.
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PLUGIN_REPO=${MINION_PLUGIN_REPO:-"$ROOT/minion_plugins"}
PLUGIN="$PLUGIN_REPO/plugins/minion-engineering"
FACTORY=${MINION_FACTORY_REPO:-"$ROOT/minion_factory"}
FACTORY_CHECK="$FACTORY/scripts/check-agent-skills.py"
FACTORY_SKILLS="$FACTORY/agent/skills"
SKILLS=(minion-engineering minion-technical-writing minion-unslop)
FACTORY_SHARED=(minion-technical-writing minion-unslop)

require_clean_repo() {
	local label=$1 repo=$2
	git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
		|| { echo "$label is not a git worktree: $repo" >&2; exit 1; }
	[ -z "$(git -C "$repo" status --porcelain=v1 --untracked-files=all)" ] \
		|| { echo "$label has uncommitted work; refusing to overwrite it: $repo" >&2; exit 1; }
}

[ -d "$PLUGIN/skills" ] || { echo "missing plugin: $PLUGIN" >&2; exit 1; }
[ -d "$FACTORY" ] || { echo "missing subproject: $FACTORY" >&2; exit 1; }
[ -f "$FACTORY_CHECK" ] || { echo "missing factory checker: $FACTORY_CHECK" >&2; exit 1; }
require_clean_repo "plugin source" "$PLUGIN_REPO"
require_clean_repo "Factory target" "$FACTORY"

PLUGIN_COMMIT=$(git -C "$PLUGIN_REPO" rev-parse HEAD)
PLUGIN_MAIN=$(git -C "$PLUGIN_REPO" rev-parse --verify refs/remotes/origin/main 2>/dev/null) \
	|| { echo "plugin source has no origin/main ref" >&2; exit 1; }
[ "$PLUGIN_COMMIT" = "$PLUGIN_MAIN" ] \
	|| { echo "plugin source must be the released origin/main commit ($PLUGIN_MAIN), got $PLUGIN_COMMIT" >&2; exit 1; }

for skill in "${SKILLS[@]}"; do
	[ -f "$PLUGIN/skills/$skill/SKILL.md" ] || { echo "missing skill: $skill" >&2; exit 1; }
	cmp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$PLUGIN/skills/$skill/THIRD_PARTY_NOTICES.md"
done

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
printf 'repository=https://github.com/NikolasP98/minion_plugins\ncommit=%s\n' "$PLUGIN_COMMIT" \
	> "$ROOT/.agents/skills/MINION_ENGINEERING_SOURCE"

for skill in "${SKILLS[@]}"; do
	diff -qr "$PLUGIN/skills/$skill" "$ROOT/.agents/skills/$skill"
done
cmp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$ROOT/.agents/skills/THIRD_PARTY_NOTICES.md"
"$ROOT/scripts/check-minion-engineering-skills.sh"

# Build the complete Factory directory beside the target, then swap it as one
# same-filesystem rename. A checker failure restores the prior directory.
FACTORY_SKILLS_PARENT=$(dirname "$FACTORY_SKILLS")
mkdir -p "$FACTORY_SKILLS_PARENT"
FACTORY_STAGE=$(mktemp -d "$FACTORY_SKILLS_PARENT/.skills-sync.XXXXXX")
if [ -d "$FACTORY_SKILLS" ]; then
	cp -a "$FACTORY_SKILLS/." "$FACTORY_STAGE/"
fi
for skill in "${FACTORY_SHARED[@]}"; do
	rm -rf "${FACTORY_STAGE:?}/$skill"
	cp -a "$PLUGIN/skills/$skill" "$FACTORY_STAGE/$skill"
done
cp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$FACTORY_STAGE/THIRD_PARTY_NOTICES.md"
cp "$ROOT/.agents/skills/MINION_ENGINEERING_SOURCE" "$FACTORY_STAGE/MINION_ENGINEERING_SOURCE"

for skill in "${FACTORY_SHARED[@]}"; do
	diff -qr "$PLUGIN/skills/$skill" "$FACTORY_STAGE/$skill"
done
cmp "$PLUGIN/THIRD_PARTY_NOTICES.md" "$FACTORY_STAGE/THIRD_PARTY_NOTICES.md"
cmp "$ROOT/.agents/skills/MINION_ENGINEERING_SOURCE" "$FACTORY_STAGE/MINION_ENGINEERING_SOURCE"

FACTORY_BACKUP=""
if [ -d "$FACTORY_SKILLS" ]; then
	FACTORY_BACKUP="$FACTORY_SKILLS_PARENT/.skills-backup.$$"
	mv "$FACTORY_SKILLS" "$FACTORY_BACKUP"
fi
if ! mv "$FACTORY_STAGE" "$FACTORY_SKILLS"; then
	[ -z "$FACTORY_BACKUP" ] || mv "$FACTORY_BACKUP" "$FACTORY_SKILLS"
	exit 1
fi
if ! python3 "$FACTORY_CHECK"; then
	rm -rf "${FACTORY_SKILLS:?}"
	[ -z "$FACTORY_BACKUP" ] || mv "$FACTORY_BACKUP" "$FACTORY_SKILLS"
	exit 1
fi
[ -z "$FACTORY_BACKUP" ] || rm -rf "${FACTORY_BACKUP:?}"
echo "synced MINION engineering skills from $PLUGIN_COMMIT for Claude, Cursor, Codex, and Factory"
