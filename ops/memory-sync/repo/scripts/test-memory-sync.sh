#!/usr/bin/env bash
# Isolated integration test for memory-sync.sh's file/secret boundary.
# No network use: origin is a local bare repo. Run manually:
#   bash ops/memory-sync/repo/scripts/test-memory-sync.sh
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$SELF_DIR/memory-sync.sh"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass() { echo "PASS: $*"; }
fail() {
	echo "FAIL: $*" >&2
	exit 1
}

# --- fixture: bare "origin" + a working clone seeded with the memory layout ---
git init --quiet --bare "$WORK/origin.git"

git init --quiet "$WORK/seed"
git -C "$WORK/seed" config user.email test@example.com
git -C "$WORK/seed" config user.name test
mkdir -p "$WORK/seed/MINION"
echo "# index" >"$WORK/seed/MINION/MEMORY.md"
cp "$SELF_DIR/../.gitignore" "$WORK/seed/.gitignore"
git -C "$WORK/seed" add MINION .gitignore
git -C "$WORK/seed" commit --quiet -m seed
git -C "$WORK/seed" branch -M main
git -C "$WORK/seed" remote add origin "$WORK/origin.git"
git -C "$WORK/seed" push --quiet -u origin main

git clone --quiet "$WORK/origin.git" "$WORK/clone"
git -C "$WORK/clone" config user.email test@example.com
git -C "$WORK/clone" config user.name test
git -C "$WORK/clone" checkout --quiet main

# --- pre-staged out-of-root entries must fail closed before commit/push ---
echo "API_SECRET=should-not-sync" >"$WORK/clone/operator-secrets.txt"
git -C "$WORK/clone" add operator-secrets.txt
echo "- first edit" >>"$WORK/clone/MINION/MEMORY.md"

if MEMORY_SYNC_DIR="$WORK/clone" bash "$SYNC_SCRIPT" push >"$WORK/prestaged.log" 2>&1; then
	fail "sync accepted a pre-staged path outside the memory roots"
fi
git --git-dir="$WORK/origin.git" show main:MINION/MEMORY.md | grep -q 'first edit' \
	&& fail "memory edit reached remote despite pre-staged boundary violation"
git --git-dir="$WORK/origin.git" cat-file -e main:operator-secrets.txt 2>/dev/null \
	&& fail "pre-staged out-of-root file reached remote"
pass "pre-staged out-of-root file fails closed and remote remains unchanged"

git -C "$WORK/clone" reset --quiet
rm "$WORK/clone/operator-secrets.txt"
git -C "$WORK/clone" checkout --quiet -- MINION/MEMORY.md

# --- already-committed out-of-root entries must also fail before push ---
echo "API_SECRET=already-committed" >"$WORK/clone/operator-secrets.txt"
git -C "$WORK/clone" add operator-secrets.txt
git -C "$WORK/clone" commit --quiet -m "plant out-of-root commit"

if MEMORY_SYNC_DIR="$WORK/clone" bash "$SYNC_SCRIPT" push >"$WORK/committed.log" 2>&1; then
	fail "sync accepted an already-committed path outside the memory roots"
fi
git --git-dir="$WORK/origin.git" cat-file -e main:operator-secrets.txt 2>/dev/null \
	&& fail "already-committed out-of-root file reached remote"
pass "already-committed out-of-root file fails closed and remains absent remotely"

git -C "$WORK/clone" reset --hard --quiet origin/main

# --- plant: a legitimate memory edit, plus everything that must NOT sync ---
SYNC_MARKER="memory-sync-marker-20260818"
echo "- $SYNC_MARKER" >>"$WORK/clone/MINION/MEMORY.md"
echo "operator scratch notes" >"$WORK/clone/operator-notes.txt" # repo-root file, outside memory roots
mkdir -p "$WORK/clone/.claude-mem"
echo "not really sqlite" >"$WORK/clone/.claude-mem/claude-mem.db" # bulk-store tier
echo "PROD_TOKEN=x" >"$WORK/clone/prod.env"     # credential-shaped, *.env
echo "SECRET=y" >"$WORK/clone/secrets.env"      # credential-shaped, *.env
echo "not a real key" >"$WORK/clone/MINION/id_rsa" # credential-shaped, inside an allowed root

# Exercise the live installation's no-env contract: ~/.minion-agent-memory.
mv "$WORK/clone" "$WORK/.minion-agent-memory"
HOME="$WORK" MEMORY_SYNC_PUSH_TIMEOUT=5 bash "$SYNC_SCRIPT" push >"$WORK/sync.log" 2>&1 \
	|| fail "sync script exited non-zero: $(cat "$WORK/sync.log")"

# --- verify: inspect what actually landed on the remote, not the local tree ---
git init --quiet --bare "$WORK/check.git"
git -C "$WORK/origin.git" push --quiet "$WORK/check.git" main
FILES="$(git --git-dir="$WORK/check.git" ls-tree -r --name-only main)"

echo "$FILES" | grep -q '^MINION/MEMORY.md$' || fail "expected memory edit did not sync"
git --git-dir="$WORK/check.git" show main:MINION/MEMORY.md | grep -q -- "- $SYNC_MARKER" \
	|| fail "memory edit marker did not reach remote"
echo "$FILES" | grep -q '^operator-notes.txt$' && fail "repo-root file outside memory roots was synced"
echo "$FILES" | grep -q '^\.claude-mem/' && fail "bulk-store tier was synced"
echo "$FILES" | grep -q '^prod\.env$' && fail "credential-shaped *.env at repo root was synced"
echo "$FILES" | grep -q '^secrets\.env$' && fail "credential-shaped *.env at repo root was synced"
echo "$FILES" | grep -q '^MINION/id_rsa$' && fail "credential-shaped file inside an allowed root was synced"

pass "MINION/MEMORY.md edit synced"
pass "no-env live layout (~/.minion-agent-memory) remains compatible"
pass "operator-notes.txt (repo root, outside memory roots) never synced"
pass ".claude-mem/ (bulk store tier) never synced"
pass "prod.env / secrets.env (credential-shaped *.env) never synced"
pass "MINION/id_rsa (credential-shaped, inside an allowed root) never synced"
echo "all memory-sync boundary checks passed"
