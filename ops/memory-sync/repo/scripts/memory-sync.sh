#!/usr/bin/env bash
# memory-sync — keeps a local clone of minion-agent-memory in sync with origin.
# Installed at ~/.local/bin/memory-sync (copy or symlink this file there).
#
# TODO(handoff): this staged copy has hardened the file/secret boundary
# (allowlist staging, split pull/push timeouts) beyond what is live today
# in NikolasP98/minion-agent-memory's scripts/memory-sync.sh. Not yet
# applied there — that's a human/interactive action, not a factory run
# (single-writer rule). Tracked in
# proposals/2026-08-18-memory-sync-repo-bootstrap.md.
#
# Usage:
#   memory-sync pull   # fast-forward only, short timeout, offline-safe no-op.
#                       # For hooks that must never block a session (e.g. Claude
#                       # Code SessionStart) — never rewrites local history.
#   memory-sync push   # commit -> pull --rebase --autostash -> push. Only the
#                       # allowlisted memory roots are staged (see below). For
#                       # hooks that run at the end of a session (e.g.
#                       # Stop/PreCompact) where a local write-back exists.
#   memory-sync         # same as `push` (the default full sync).
#
# Env:
#   MEMORY_SYNC_DIR           path to the minion-agent-memory clone (preferred override)
#   MEMORY_REPO_DIR           legacy path override used by the live installation
#                             (default ~/.minion-agent-memory)
#   MEMORY_SYNC_ROOTS         comma-separated list of directories (relative to
#                             MEMORY_SYNC_DIR) that push is allowed to stage
#                             (default "MINION"). Nothing outside these
#                             directories is ever added, committed, or pushed —
#                             this is the spec's secret/file boundary: sync
#                             must never add new files outside the memory dirs.
#                             Repo infra (README.md, scripts/, .gitattributes,
#                             .gitignore) is intentionally excluded; those are
#                             edited and pushed by a human, not by the hook.
#   MEMORY_SYNC_PULL_TIMEOUT  seconds for the SessionStart-safe pull path (default 2)
#   MEMORY_SYNC_PUSH_TIMEOUT  seconds for the end-of-session push path (default 5)
#
# Conflict policy: *.md conflicts during the rebase are resolved by the
# `mdunion` merge driver declared in .gitattributes (union of both sides,
# append-biased — memory loss is worse than duplication). That driver's
# COMMAND is repo-local config (git will not execute a driver command that
# merely came from a cloned .gitattributes), so this script registers it
# idempotently on every run.
#
# This script is intentionally soft-fail on anything network-related: a
# session or hook calling it must never hang or abort because memory-sync
# is offline. It is NOT soft-fail on local git errors (not a repo, dirty
# rebase left behind by a previous failed run) — those need a human.

set -euo pipefail

MODE="${1:-push}"
REPO_DIR="${MEMORY_SYNC_DIR:-${MEMORY_REPO_DIR:-$HOME/.minion-agent-memory}}"
IFS=',' read -ra MEMORY_ROOTS <<<"${MEMORY_SYNC_ROOTS:-MINION}"
PULL_TIMEOUT="${MEMORY_SYNC_PULL_TIMEOUT:-2}"
PUSH_TIMEOUT="${MEMORY_SYNC_PUSH_TIMEOUT:-5}"

log() { echo "memory-sync: $*" >&2; }

is_allowed_path() {
	local path="$1"
	local root
	for root in "${MEMORY_ROOTS[@]}"; do
		[[ "$path" == "$root" || "$path" == "$root/"* ]] && return 0
	done
	return 1
}

for root in "${MEMORY_ROOTS[@]}"; do
	if [[ -z "$root" || "$root" == /* || "$root" == "." || "$root" == ".." || "$root" == ../* || "$root" == */../* || "$root" == */.. ]]; then
		log "invalid MEMORY_SYNC_ROOTS entry '$root' (expected a relative memory directory)"
		exit 2
	fi
done

if [[ ! -d "$REPO_DIR/.git" ]]; then
	log "no clone at $REPO_DIR — nothing to sync (no-op)"
	exit 0
fi

cd "$REPO_DIR"

# Idempotent local registration of the union merge driver named in .gitattributes.
git config --local merge.mdunion.name "append-biased union merge for memory .md files"
git config --local merge.mdunion.driver 'git merge-file --union %A %O %B'

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

case "$MODE" in
pull)
	if ! timeout "$PULL_TIMEOUT" git fetch --quiet origin "$BRANCH" 2>/dev/null; then
		log "offline or origin unreachable — no-op"
		exit 0
	fi
	if ! timeout "$PULL_TIMEOUT" git merge --ff-only "origin/$BRANCH" --quiet 2>/dev/null; then
		log "pull: not fast-forwardable locally, leaving as-is (run 'memory-sync push' to reconcile)"
	fi
	;;
push)
	# Stage ONLY the allowlisted memory roots — never `git add -A`. This is
	# the spec's file/secret boundary: an operator-notes.txt at the repo
	# root, a stray *.env, or the claude-mem bulk store must never be swept
	# into a sync commit just because it happens to sit in the worktree.
	for root in "${MEMORY_ROOTS[@]}"; do
		[[ -d "$root" ]] && git add -- "$root"
	done

	# `git commit` consumes the whole index, including entries staged before
	# this hook ran. Enforce the boundary on the resulting index, not merely
	# on this script's `git add`, so a pre-staged root file cannot hitchhike.
	while IFS= read -r staged_path; do
		if ! is_allowed_path "$staged_path"; then
			log "refusing to commit staged path outside MEMORY_SYNC_ROOTS: $staged_path"
			exit 1
		fi
	done < <(git diff --cached --name-only --diff-filter=ACDMRTUXB)

	if ! git diff --cached --quiet; then
		git commit --quiet -m "memory-sync: $(hostname)-$(date -u +%Y%m%dT%H%M%SZ)"
	fi

	if ! timeout "$PUSH_TIMEOUT" git fetch --quiet origin "$BRANCH" 2>/dev/null; then
		log "offline or origin unreachable — no-op"
		exit 0
	fi

	if ! timeout "$PUSH_TIMEOUT" git rebase --autostash "origin/$BRANCH" --quiet 2>/dev/null; then
		log "rebase hit an unresolved conflict outside the union driver's reach — aborting rebase, needs a human"
		git rebase --abort 2>/dev/null || true
		exit 1
	fi

	# The index check above protects this hook's new commit, but an earlier local
	# commit may already contain an out-of-root path. Validate the complete range
	# that push would publish after rebasing, and leave rejected commits local for
	# a human to handle.
	while IFS= read -r outgoing_path; do
		if ! is_allowed_path "$outgoing_path"; then
			log "refusing to push committed path outside MEMORY_SYNC_ROOTS: $outgoing_path"
			exit 1
		fi
	done < <(git diff --name-only --diff-filter=ACDMRTUXB "origin/$BRANCH..HEAD")

	if ! timeout "$PUSH_TIMEOUT" git push --quiet origin "$BRANCH" 2>/dev/null; then
		log "push failed (offline, or a race with another writer) — will retry next sync"
		exit 0
	fi
	;;
*)
	log "unknown mode '$MODE' (expected 'pull' or 'push')"
	exit 2
	;;
esac

log "sync ok ($MODE, $BRANCH)"
