#!/usr/bin/env bash
set -euo pipefail

BASELINE=${DETECT_SECRETS_BASELINE:-.secrets.baseline}
HOOK_BIN=${DETECT_SECRETS_HOOK_BIN:-detect-secrets-hook}

die() {
  echo "::error::$*" >&2
  exit 1
}

write_audit_output() {
  local value=$1
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "audit_dependencies=${value}" >> "$GITHUB_OUTPUT"
  fi
}

is_dependency_input() {
  case "$1" in
    package.json|*/package.json|package-lock.json|*/package-lock.json|npm-shrinkwrap.json|*/npm-shrinkwrap.json|pnpm-lock.yaml|*/pnpm-lock.yaml|pnpm-workspace.yaml|bun.lock|*/bun.lock|bun.lockb|*/bun.lockb|yarn.lock|*/yarn.lock|.npmrc|*/.npmrc|.pnpmfile.cjs|*/.pnpmfile.cjs|patches/*)
      return 0
      ;;
  esac
  return 1
}

BASE_SHA=${BASE_SHA:-}
if [ -z "$BASE_SHA" ] || ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
  die "Security scan base commit is unavailable; refusing to skip commit-delta scanning"
fi
expected_head=${GITHUB_SHA:-}
actual_head=$(git rev-parse HEAD 2>/dev/null || true)
if [[ ! "$expected_head" =~ ^[0-9a-f]{40}$ ]]; then
  die "Security scan head identity is invalid"
fi
if [ "$actual_head" != "$expected_head" ]; then
  die "Security scan checkout does not match the expected head"
fi

# TODO(handoff): Audit and refresh the February 2026 baseline before adding
# periodic full-repository equivalence; see minion-meta/proposals/2026-08-24-minion-ai-secret-baseline-refresh.md.

commit_file=$(mktemp)
changed_file=$(mktemp)
scan_root=$(mktemp -d)
trap 'rm -f "$commit_file" "$changed_file"; rm -rf -- "$scan_root"' EXIT
# `detect-secrets-hook --baseline` runs `git diff --name-only` in its working
# directory to check the baseline is staged. The per-commit scan sandboxes below
# are plain temp directories, so give them an empty enclosing repository —
# otherwise git aborts and the hook exits non-zero for every scanned commit.
git init -q "$scan_root"
if ! git rev-list --reverse --topo-order "$BASE_SHA..HEAD" > "$commit_file"; then
  die "Commit history detection failed; refusing to skip commit-delta scanning"
fi

# The "dedicated audited update" contract binds the pull request that proposes a
# baseline change: a branch may not allowlist its own findings. A push validates
# what already landed, and its range starts at the last validated commit, which
# can predate an audited update — so there the pushed baseline is the reference.
# PR334 is the dedicated audit of two public contract checksums. Bind this
# one-time transition to its repository/PR identity and byte-exact baseline
# blobs (reviewed commits 1e7ec283 and 79d5c433648). No general approval override.
# TODO(handoff): Retire this PR334-only exception after the audited baseline lands;
# see minion-meta/proposals/2026-08-24-minion-ai-secret-baseline-refresh.md.
is_audited_pr334_update() {
  [ "$BASELINE" = .secrets.baseline ] &&
    [ "${GITHUB_EVENT_NAME:-}" = pull_request ] &&
    [ "${GITHUB_REPOSITORY:-}" = NikolasP98/minion-ai ] &&
    [ "${GITHUB_REF:-}" = refs/pull/334/merge ] &&
    [ "${GITHUB_BASE_REF:-}" = DEV ] &&
    [ "${GITHUB_HEAD_REF:-}" = chore/audit-dynamic-catalog-checksums ] || {
      echo "::error::PR334 audit rejected: workflow identity mismatch" >&2
      return 1
    }
  [ "$(git rev-parse "$BASE_SHA:$BASELINE" 2>/dev/null)" = 511b294d40e6c24d7fdc8ebd0e5ecbe6e50277d5 ] &&
    [ "$(git rev-parse "HEAD:$BASELINE" 2>/dev/null)" = b3d83ed3f2bfc2c01e8fe1f57ce8e3cb8fd9f45a ] &&
    git diff --quiet HEAD -- "$BASELINE" || {
      echo "::error::PR334 audit rejected: reviewed baseline snapshots mismatch" >&2
      return 1
    }
  node <<'NODE'
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
function reject(reason) {
  console.error(`::error::PR334 audit rejected: ${reason}`);
  process.exit(1);
}
try {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const pr = event.pull_request;
  const repo = 'NikolasP98/minion-ai';
  if (event.number !== 334 || pr?.number !== 334 ||
      event.repository?.full_name !== repo ||
      pr.base?.repo?.full_name !== repo || pr.base?.ref !== 'DEV' ||
      pr.head?.repo?.full_name !== repo ||
      pr.head?.ref !== 'chore/audit-dynamic-catalog-checksums') reject('event identity mismatch');
  const sha = /^[0-9a-f]{40}$/;
  if (!sha.test(pr.base.sha ?? '') || !sha.test(pr.head.sha ?? '')) reject('missing or invalid commit identity');
  // The event's cached merge_commit_sha may be stale/null on synchronize.
  // GITHUB_SHA already binds HEAD; verify its actual ordered merge parents.
  const parents = execFileSync('git', ['show', '-s', '--format=%P', 'HEAD'], { encoding: 'utf8' }).trim().split(' ');
  if (parents.length !== 2 || parents[0] !== pr.base.sha || parents[1] !== pr.head.sha) reject('merge parents mismatch');
} catch {
  reject('event or git metadata unavailable');
}
NODE
}

# Exact-DEV push/dispatch validate the landed baseline; ordinary PRs still
# compare against the base. The audited PR must also pass every scan below.
if {
  [ "${GITHUB_EVENT_NAME:-}" = "push" ] ||
  [ "${GITHUB_EVENT_NAME:-}" = "workflow_dispatch" ]
} &&
  [ "${GITHUB_REF:-}" = "refs/heads/DEV" ]
then
  baseline_ref=HEAD
else
  baseline_ref=$BASE_SHA
  if ! git diff --quiet "$BASE_SHA" HEAD -- "$BASELINE"; then
    if is_audited_pr334_update; then
      baseline_ref=HEAD
    else
      die "Baseline changes require a dedicated audited update"
    fi
  fi
fi

# mapfile is a bash 4+ builtin; macOS CI runners' /usr/bin/env bash resolves to
# the system bash 3.2, which lacks it. Use a portable read loop instead.
commits=()
while IFS= read -r line || [ -n "$line" ]; do
  commits+=("$line")
done < "$commit_file"
audit_dependencies=false
scanned_files=false
for commit in "${commits[@]}"; do
  parent=$(git rev-parse "${commit}^" 2>/dev/null || true)
  if [ -n "$parent" ]; then
    if ! git diff-tree --no-commit-id --name-only -z -r --no-renames --diff-filter=ACMRTD "$parent" "$commit" > "$changed_file"; then
      die "Changed-file detection failed; refusing to skip commit-delta scanning"
    fi
  elif ! git diff-tree --root --no-commit-id --name-only -z -r --no-renames --diff-filter=ACMRTD "$commit" > "$changed_file"; then
    die "Changed-file detection failed; refusing to skip commit-delta scanning"
  fi

  changed=()
  while IFS= read -r -d '' entry; do
    changed+=("$entry")
  done < "$changed_file"
  files=()
  commit_root="$scan_root/$commit"
  mkdir -p "$commit_root/$(dirname "$BASELINE")"
  cp -- "$BASELINE" "$commit_root/$BASELINE"

  for path in "${changed[@]}"; do
    if is_dependency_input "$path"; then
      audit_dependencies=true
    fi
    case "$path" in
      .secrets.baseline)
        # Merging the base branch in carries its baseline across, and the guard
        # above already proved HEAD's baseline matches the reference. Only a
        # commit whose baseline differs from the reference is a self-approved
        # allowlist — including one that changed it and changed it back.
        if ! git diff --quiet "$baseline_ref" "$commit" -- "$BASELINE"; then
          die "Baseline changes require a dedicated audited update"
        fi
        ;;
    esac
    if [ "$(git cat-file -t "${commit}:${path}" 2>/dev/null || true)" = "blob" ]; then
      mkdir -p "$commit_root/$(dirname "$path")"
      git cat-file blob "${commit}:${path}" > "$commit_root/$path"
      files+=("$path")
    fi
  done

  if ((${#files[@]} > 0)); then
    scanned_files=true
    hook_status=0
    (
      cd "$commit_root"
      "$HOOK_BIN" --no-verify --baseline "$BASELINE" -- "${files[@]}"
    ) || hook_status=$?
    # Status 3 means the hook rewrote its baseline to refresh line numbers. That
    # baseline is a throwaway copy inside the per-commit sandbox, so it reports
    # bookkeeping on a file we are about to delete, not a finding — otherwise any
    # range that moves or drops a baselined secret fails. Status 1 (new secret)
    # and every other status stay fatal.
    if [ "$hook_status" -ne 0 ] && [ "$hook_status" -ne 3 ]; then
      exit "$hook_status"
    fi
  fi
done
write_audit_output "$audit_dependencies"

if [ "$scanned_files" = false ]; then
  echo "No added, copied, modified, renamed, or type-changed files require scanning"
fi
