#!/usr/bin/env bash
# memory-sync — keeps a local clone of minion-agent-memory in sync with origin.
# Installed at ~/.local/bin/memory-sync (copy or symlink this file there).
#
# Usage:
#   memory-sync pull   # fast-forward only, short timeout, offline-safe no-op.
#                       # For hooks that must never block a session (e.g. Claude
#                       # Code SessionStart) — never rewrites local history.
#   memory-sync push   # commit-all -> pull --rebase --autostash -> push.
#                       # For hooks that run at the end of a session (e.g.
#                       # Stop/PreCompact) where a local write-back exists.
#   memory-sync         # same as `push` (the default full sync).
#
# Env:
#   MEMORY_SYNC_DIR      path to the minion-agent-memory clone (default ~/minion-agent-memory)
#   MEMORY_SYNC_TIMEOUT  seconds for network ops (default 5)
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
REPO_DIR="${MEMORY_SYNC_DIR:-$HOME/minion-agent-memory}"
TIMEOUT="${MEMORY_SYNC_TIMEOUT:-5}"

log() { echo "memory-sync: $*" >&2; }

if [[ ! -d "$REPO_DIR/.git" ]]; then
	log "no clone at $REPO_DIR — nothing to sync (no-op)"
	exit 0
fi

cd "$REPO_DIR"

# Idempotent local registration of the union merge driver named in .gitattributes.
git config --local merge.mdunion.name "append-biased union merge for memory .md files"
git config --local merge.mdunion.driver 'git merge-file --union %A %O %B'

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if ! timeout "$TIMEOUT" git fetch --quiet origin "$BRANCH" 2>/dev/null; then
	log "offline or origin unreachable — no-op"
	exit 0
fi

case "$MODE" in
pull)
	if ! timeout "$TIMEOUT" git merge --ff-only "origin/$BRANCH" --quiet 2>/dev/null; then
		log "pull: not fast-forwardable locally, leaving as-is (run 'memory-sync push' to reconcile)"
	fi
	;;
push)
	if [[ -n "$(git status --porcelain)" ]]; then
		git add -A
		git commit --quiet -m "memory-sync: $(hostname)-$(date -u +%Y%m%dT%H%M%SZ)"
	fi

	if ! timeout "$TIMEOUT" git rebase --autostash "origin/$BRANCH" --quiet 2>/dev/null; then
		log "rebase hit an unresolved conflict outside the union driver's reach — aborting rebase, needs a human"
		git rebase --abort 2>/dev/null || true
		exit 1
	fi

	if ! timeout "$TIMEOUT" git push --quiet origin "$BRANCH" 2>/dev/null; then
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
