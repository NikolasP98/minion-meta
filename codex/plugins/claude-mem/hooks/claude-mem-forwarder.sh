#!/usr/bin/env bash
set -euo pipefail

# TODO(handoff): Codex 0.172 does not run plugin hooks (plugin_hooks is removed), so these hooks are
# inert today and Codex capture comes from claude-mem's transcript watcher. If plugin hooks return,
# turn CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION off or sessions are captured twice.
# See proposals/2026-11-26-claude-mem-17-upgrade-day.md.

event="${1:?usage: claude-mem-forwarder.sh <setup|start|context|session-init|observation|file-context|summarize|user-message>}"

# A runtime root holds the claude-mem worker scripts.
is_runtime_root() { [ -f "$1/scripts/bun-runner.js" ] && [ -f "$1/scripts/worker-service.cjs" ]; }

# Newest installed claude-mem runtime, the same order claude-mem 17's own hooks use:
# highest version first, a release before its prereleases, skipping folders marked .orphaned_at.
# This keeps Codex working when an upgrade removes the old version folder.
resolve_runtime_root() {
  if [ -n "${CLAUDE_MEM_PLUGIN_ROOT:-}" ] && is_runtime_root "$CLAUDE_MEM_PLUGIN_ROOT"; then
    printf '%s\n' "$CLAUDE_MEM_PLUGIN_ROOT"
    return
  fi
  local config_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}" dir name found=""
  found="$(
    for dir in "$config_dir/plugins/cache/thedotmack/claude-mem"/[0-9]*/; do
      dir="${dir%/}"
      [ -d "$dir" ] && [ ! -e "$dir/.orphaned_at" ] || continue
      name="${dir##*/}"
      printf '%s\t%d\t%s\n' "${name%%-*}" "$([ "$name" = "${name%%-*}" ] && echo 1 || echo 0)" "$dir"
    done | sort -t $'\t' -k1,1Vr -k2,2nr | cut -f3- | while IFS= read -r dir; do
      if is_runtime_root "$dir"; then printf '%s\n' "$dir"; fi
    done
  )"
  found="${found%%$'\n'*}"
  if [ -z "$found" ] && is_runtime_root "$config_dir/plugins/marketplaces/thedotmack/plugin"; then
    found="$config_dir/plugins/marketplaces/thedotmack/plugin"
  fi
  [ -n "$found" ] || { echo "claude-mem: no installed runtime found under $config_dir/plugins" >&2; return 1; }
  printf '%s\n' "$found"
}

export PATH="$("${SHELL:-/bin/bash}" -lc 'echo "$PATH"' 2>/dev/null):$PATH"
runtime_root="$(resolve_runtime_root)"
export CLAUDE_PLUGIN_ROOT="$runtime_root"
export CLAUDE_MEM_PLUGIN_ROOT="$runtime_root"
export _R="$runtime_root"

case "$event" in
  resolve)
    printf '%s\n' "$runtime_root"
    ;;
  setup)
    # claude-mem 17 replaced smart-install.js with version-check.js.
    if [ -f "$runtime_root/scripts/version-check.js" ]; then
      node "$runtime_root/scripts/version-check.js"
    else
      node "$runtime_root/scripts/smart-install.js"
    fi
    ;;
  start)
    node "$runtime_root/scripts/bun-runner.js" "$runtime_root/scripts/worker-service.cjs" start
    echo '{"continue":true,"suppressOutput":true}'
    ;;
  context|session-init|observation|file-context|summarize|user-message)
    node "$runtime_root/scripts/bun-runner.js" "$runtime_root/scripts/worker-service.cjs" hook codex "$event"
    ;;
  *)
    echo "Unknown claude-mem event: $event" >&2
    exit 2
    ;;
esac
