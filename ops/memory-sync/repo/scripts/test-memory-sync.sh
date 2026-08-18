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

# --- plant: a legitimate memory edit, plus everything that must NOT sync ---
echo "- new topic" >>"$WORK/clone/MINION/MEMORY.md"
echo "operator scratch notes" >"$WORK/clone/operator-notes.txt" # repo-root file, outside memory roots
mkdir -p "$WORK/clone/.claude-mem"
echo "not really sqlite" >"$WORK/clone/.claude-mem/claude-mem.db" # bulk-store tier
echo "PROD_TOKEN=x" >"$WORK/clone/prod.env"     # credential-shaped, *.env
echo "SECRET=y" >"$WORK/clone/secrets.env"      # credential-shaped, *.env
echo "not a real key" >"$WORK/clone/MINION/id_rsa" # credential-shaped, inside an allowed root

MEMORY_SYNC_DIR="$WORK/clone" MEMORY_SYNC_PUSH_TIMEOUT=5 bash "$SYNC_SCRIPT" push >"$WORK/sync.log" 2>&1 \
	|| fail "sync script exited non-zero: $(cat "$WORK/sync.log")"

# --- verify: inspect what actually landed on the remote, not the local tree ---
git init --quiet --bare "$WORK/check.git"
git -C "$WORK/origin.git" push --quiet "$WORK/check.git" main
FILES="$(git --git-dir="$WORK/check.git" ls-tree -r --name-only main)"

echo "$FILES" | grep -q '^MINION/MEMORY.md$' || fail "expected memory edit did not sync"
echo "$FILES" | grep -q '^operator-notes.txt$' && fail "repo-root file outside memory roots was synced"
echo "$FILES" | grep -q '^\.claude-mem/' && fail "bulk-store tier was synced"
echo "$FILES" | grep -q '^prod\.env$' && fail "credential-shaped *.env at repo root was synced"
echo "$FILES" | grep -q '^secrets\.env$' && fail "credential-shaped *.env at repo root was synced"
echo "$FILES" | grep -q '^MINION/id_rsa$' && fail "credential-shaped file inside an allowed root was synced"

pass "MINION/MEMORY.md edit synced"
pass "operator-notes.txt (repo root, outside memory roots) never synced"
pass ".claude-mem/ (bulk store tier) never synced"
pass "prod.env / secrets.env (credential-shaped *.env) never synced"
pass "MINION/id_rsa (credential-shaped, inside an allowed root) never synced"
echo "all memory-sync boundary checks passed"
