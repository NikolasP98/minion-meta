#!/usr/bin/env bash
set -euo pipefail

event="${1:?usage: claude-mem-forwarder.sh <setup|start|context|session-init|observation|file-context|summarize|user-message>}"
runtime_root="${CLAUDE_MEM_PLUGIN_ROOT:-/home/nikolas/.claude/plugins/cache/thedotmack/claude-mem/12.4.7}"
plugin_root="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

export PATH="$("${SHELL:-/bin/bash}" -lc 'echo "$PATH"' 2>/dev/null):$PATH"
export CLAUDE_PLUGIN_ROOT="$plugin_root"
export CLAUDE_MEM_PLUGIN_ROOT="$runtime_root"
export _R="$runtime_root"

case "$event" in
  setup)
    node "$runtime_root/scripts/smart-install.js"
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
