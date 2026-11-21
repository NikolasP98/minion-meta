#!/usr/bin/env bash
# Capture FACES production hub screens (data-full previews) with the provisioned QA account into hub2-faces/.
# Private Chromium on :9224 so the shared headless browser never touches prod. Usage: HUB_PASS='...' bash faces-cap.sh [MAXV]
set -euo pipefail
W=~/Documents/CODE/MINION/.local/figcraft/work; PROF=~/.cache/claude-tmp/chromium-faces-qa; mkdir -p "$PROF"
: "${HUB_PASS:?set HUB_PASS to the qa.minion@facesculptors.net password}"
PORT=$((20000 + RANDOM % 20000)); PROF="$(mktemp -d "$HOME/.cache/claude-tmp/chromium-faces-XXXXXX")"
chromium --headless=new --remote-debugging-port=$PORT --user-data-dir="$PROF" --no-first-run --window-size=1440,1000 about:blank > "$W/chromium-faces.log" 2>&1 &
CHROME_PID=$!
for i in $(seq 1 20); do curl -s -m 2 "http://127.0.0.1:$PORT/json/version" >/dev/null && break; sleep 1; done
# the listener must be the browser we just started (never attach to a stranger's debug port)
if ! ss -ltnp 2>/dev/null | grep -q "127.0.0.1:$PORT .*pid=$CHROME_PID,"; then echo "debug port $PORT is not our chromium (pid $CHROME_PID)"; kill $CHROME_PID 2>/dev/null; rm -rf "$PROF"; exit 1; fi
trap 'kill $CHROME_PID 2>/dev/null; rm -rf "$PROF"' EXIT  # session + profile never outlive the run
cd "$W" && HUB_BASE=https://hub.minion-ai.org HUB_USER=qa.minion@facesculptors.net HUB_OUT=hub2-faces MAXV="${1:-12}" MAXB=0 SANITIZE=1 \
  HUB_ROUTES="${HUB_ROUTES:-/en/home,/en/overview,/en/team,/en/crm,/en/crm/customers,/en/crm/doors,/en/crm/insights,/en/pos/sell,/en/pos/catalog,/en/pos/accounts,/en/scheduling,/en/scheduling/calendar,/en/scheduling/bookings,/en/stock,/en/stock/items,/en/stock/entries,/en/settings,/en/notifications,/en/account}" \
  BU_NAME=minion-faces-figcraft BU_CDP_URL="http://127.0.0.1:$PORT" browser-harness < hubcap3.py
