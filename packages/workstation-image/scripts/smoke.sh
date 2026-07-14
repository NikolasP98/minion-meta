#!/usr/bin/env bash
set -euo pipefail

image="${1:-minion-workstation:local}"

fail() {
  printf 'smoke: %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null || fail "docker is required"
docker image inspect "${image}" >/dev/null || fail "image not found: ${image}"

blueprint="$(docker image inspect --format '{{ index .Config.Labels "ai.minion.workstation.blueprint" }}' "${image}")"
[[ "${blueprint}" == "minion-workstation-v1" ]] || fail "unexpected blueprint label: ${blueprint}"

architecture="$(docker image inspect --format '{{ .Architecture }}' "${image}")"

docker run --rm --entrypoint /bin/bash "${image}" -lc '
  set -euo pipefail

  . /etc/os-release
  [[ "${VERSION_ID}" == "24.04" ]]
  [[ "$(node --version)" == "v22.23.1" ]]
  [[ "$(/usr/bin/node --version)" == "v22.23.1" ]]
  [[ "$(opencode --version)" == "1.17.18" ]]
  minion --version | grep -F "2026.7.11-dev" >/dev/null
  notesmd-cli --version | grep -Fx "notesmd-cli version v0.3.6" >/dev/null
  [[ "$(readlink -f /usr/local/bin/obsidian-cli)" == "/usr/local/bin/notesmd-cli" ]]
  /opt/hermes-agent/.venv/bin/python -c '\''import acp; from importlib.metadata import version; assert version("hermes-agent") == "0.18.2"'\''
  command -v claude >/dev/null
  command -v codex >/dev/null
  command -v pi >/dev/null
  command -v browser >/dev/null
  command -v rclone >/dev/null
  command -v shells-bridge >/dev/null
  command -v minion-preview >/dev/null
  id agent >/dev/null
  [[ "$(stat -c %U:%G /home/agent/state)" == "agent:agent" ]]
  [[ "$(node -p '\''require("/usr/local/lib/node_modules/@minion-stack/shells-bridge/package.json").version'\'')" == "0.1.4" ]]
  [[ "$(node -p '\''require("/usr/local/lib/node_modules/@minion-stack/drone/package.json").version'\'')" == "0.3.0" ]]

  [[ "$(systemctl is-enabled minion-vnc.service)" == "enabled" ]]
  [[ "$(systemctl is-enabled minion-novnc.service)" == "enabled" ]]
  [[ "$(systemctl is-enabled shells-bridge.service)" == "enabled" ]]
  systemd-analyze verify /etc/systemd/system/minion-vnc.service /etc/systemd/system/minion-novnc.service /etc/systemd/system/minion-workstation-env.service /etc/systemd/system/shells-bridge.service
  grep -F -- "-localhost yes" /etc/systemd/system/minion-vnc.service >/dev/null
  grep -F -- "127.0.0.1:5901" /etc/systemd/system/minion-novnc.service >/dev/null
  grep -F -- "0.0.0.0:8000" /etc/systemd/system/minion-novnc.service >/dev/null
  grep -F -- "EnvironmentFile=-/run/minion-workstation/bridge.env" /etc/systemd/system/shells-bridge.service >/dev/null
  grep -F -- "ExecCondition=/usr/bin/test -s /run/minion-workstation/bridge.env" /etc/systemd/system/shells-bridge.service >/dev/null
  test -x /usr/local/libexec/minion-capture-environment
  [[ -r /usr/share/novnc/vnc.html ]]
  [[ -L /usr/share/novnc/index.html ]]
  [[ -r /home/agent/state/AGENTS.md ]]
  [[ "$(readlink /home/agent/state/CLAUDE.md)" == "AGENTS.md" ]]
  [[ -r /home/exedev/AGENTS.md ]]
  [[ -r /usr/local/share/minion-workstation/preview-demo/index.html ]]

  MINION_PREVIEW_ORIGIN=http://127.0.0.1 minion-preview start \
    /usr/local/share/minion-workstation/preview-demo \
    --port 4173 --ttl 30s --name smoke --json | grep -F "\"url\":\"http://127.0.0.1:4173/\"" >/dev/null
  curl -fsS http://127.0.0.1:4173/ | grep -F "Minion Preview Station" >/dev/null
  minion-preview status --json | grep -F "\"name\":\"smoke\"" >/dev/null
  minion-preview stop smoke >/dev/null

  python3 - <<'\''PY'\''
import json
from pathlib import Path

manifest = json.loads(Path("/usr/local/share/minion-workstation/versions.json").read_text())
assert manifest["schemaVersion"] == 1
assert manifest["blueprint"] == "minion-workstation-v1"
assert manifest["desktop"]["vncListen"] == "127.0.0.1:5901"
assert manifest["desktop"]["webListen"] == "0.0.0.0:8000"
assert manifest["runtimes"]["shellsBridge"]["version"] == "0.1.4"
assert manifest["runtimes"]["drone"]["version"] == "0.3.0"
assert manifest["tools"]["preview"]["command"] == "minion-preview"
PY
'

docker run --rm \
  --env SHELLS_SHELL_ID=smoke-shell \
  --env SHELLS_ORG_ID=smoke-org \
  --env SHELLS_GATEWAY_URL=wss://gateway.invalid \
  --env SHELLS_DEVICE_TOKEN=smoke-token \
  --env SHELLS_HARNESS=hermes \
  --env SHELLS_HARNESS_VERSION=smoke \
  --env SHELLS_HARNESS_CMD=hermes-acp \
  --entrypoint /bin/bash "${image}" -lc '
    /usr/local/libexec/minion-capture-environment
    [[ "$(stat -c %U:%G:%a /run/minion-workstation/bridge.env)" == "root:agent:640" ]]
    grep -Fx "SHELLS_DEVICE_TOKEN=smoke-token" /run/minion-workstation/bridge.env >/dev/null
    ! grep -F "NPM_CONFIG_AUDIT" /run/minion-workstation/bridge.env >/dev/null
  '

if [[ "${architecture}" == "amd64" ]]; then
  docker run --rm --entrypoint /bin/bash "${image}" -lc '
    [[ "$(readlink -f /usr/local/bin/chromium)" == "/opt/google/chrome/google-chrome" ]]
    chromium --version | grep -F "Google Chrome 150.0.7871.114" >/dev/null
  '
fi

if [[ "${BOOT_TEST:-0}" == "1" ]]; then
  cid="$(docker run --detach --privileged --cgroupns=host --publish 127.0.0.1::8000 "${image}")"
  cleanup() {
    docker rm --force "${cid}" >/dev/null 2>&1 || true
  }
  trap cleanup EXIT

  ready=0
  for _ in $(seq 1 60); do
    if docker exec "${cid}" systemctl is-active --quiet minion-vnc.service minion-novnc.service >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done

  if [[ "${ready}" != "1" ]]; then
    docker exec "${cid}" systemctl --no-pager --full status minion-vnc.service minion-novnc.service || true
    docker logs "${cid}" || true
    fail "desktop services did not become active"
  fi

  host_port="$(docker port "${cid}" 8000/tcp | sed -n 's/.*://p' | head -1)"
  web_ready=0
  for _ in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:${host_port}/vnc.html" 2>/dev/null | grep -F "noVNC" >/dev/null; then
      web_ready=1
      break
    fi
    sleep 1
  done
  [[ "${web_ready}" == "1" ]] || fail "noVNC page did not become reachable"
  docker exec "${cid}" bash -lc '! ss -ltn | grep -F "0.0.0.0:5901" && ss -ltn | grep -F "127.0.0.1:5901"'
fi

printf 'smoke: ok (%s, %s)\n' "${image}" "${architecture}"
