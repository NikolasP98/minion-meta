# minion_site Member Gateway — Manual Smoke Runbook

**Phase:** 07-ws-consolidation / Plan 07-03 Task 2
**Purpose:** Manual verification of the GatewayClient migration in minion_site (no vitest — per D-06)

## Prerequisites

- Local gateway running at a known WSS URL (e.g. `wss://localhost:3000` or Tailscale funnel URL)
- `.env.local` in minion_site with `OPENCLAW_GATEWAY_URL` set
- A registered member account in the shared DB

## Steps

1. Start the dev server:
   ```bash
   cd minion_site && bun dev
   ```

2. Open `http://localhost:5173/login` in browser, log in with a member account.

3. Navigate to `/members` (should redirect automatically after login).

4. Open DevTools → Network → WS tab. Verify:
   - A WebSocket connection opens to the gateway URL
   - First incoming frame is `type: "event", event: "connect.challenge"` with a `nonce` field
   - Shortly after, an outgoing `type: "req", method: "connect"` frame is sent containing `device` + auth fields
   - Server responds with `type: "res", ok: true` containing the `HelloOk` payload

5. Send a chat message via the UI chat input. Verify:
   - A `chat.send` request frame is sent
   - Delta events arrive and the stream updates in the UI
   - A final `chat` event arrives and the message appears in chat history

6. Simulate a network flap:
   - Disable wifi or block the gateway URL briefly (e.g. firewall rule for 5 seconds)
   - Re-enable connection
   - Observe browser console for reconnect attempts with increasing backoff delays (~800ms, ~1360ms, ~2312ms)
   - Verify the connection re-establishes and chat continues working

## Checklist

- [ ] WebSocket connects to gateway
- [ ] `connect.challenge` / `connect` handshake completes successfully
- [ ] Chat round-trip works (send message → receive delta → receive final)
- [ ] Reconnect succeeds after network flap (autoReconnect: true)
- [ ] No `ws` module errors in browser console (browser bundle must use native WebSocket)
