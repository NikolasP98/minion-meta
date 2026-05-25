# P3 Live-Turn Credential Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this task-by-task. Steps use checkbox (`- [ ]`) syntax. **This plan edits the LIVE agent-turn path — every task ends green (tsgo + targeted vitest) and commits atomically. Do not deploy to netcup until the prerequisite below is satisfied and the E2E (Task 8) passes locally.**

**Goal:** Make an agent acting over a channel (WhatsApp/Telegram/…) use the *messaging user's own* Google credentials, by threading the resolved hub `userId` into gws tool execution and sourcing the ADC on-demand from the hub.

**Architecture:** Build on P1/P2/P4 (already shipped). The remaining gap is plumbing: the resolved `userId` (`ctxPayload.ResolvedHubUserId`, set by P4 for WhatsApp and by the existing channels) and the hub REST config are **not reachable at the gws tool execution point**. This plan threads both through, then swaps the deprecated gog credential loader for the hub-backed `loadSessionCredentialsViaHub` + `cleanupSessionCredentials`.

**Tech Stack:** TypeScript (nodenext, `.js` import extensions), tsgo, vitest.

**Spec:** `specs/2026-05-24-unified-user-identities-design.md` · **Phase plan:** `specs/2026-05-24-unified-user-identities-plan.md`

---

## ⚠️ Prerequisite (verified 2026-05-24) — REST path is unwired in prod

The netcup gateway's `gateway.hubMetrics` has `enabled:true`, `serverId` SET, `tursoUrl` SET, but **`hubUrl` and `apiKey` are absent** → `resolveHubMetricsConfig().valid === false`. The metrics transport is **Turso direct-write**, not HTTP REST. The P2 credential endpoint (`GET /api/gateway/google-adc`) + `createGoogleAdcClient` therefore have no host/token to talk to in production.

**Decision required before Task 6 (recommend Option A):**

- **Option A (recommended — preserves "hub = sole key holder"):** Register the gateway as a hub "server" to mint a server token, then add to netcup `~bot-prd/.minion/gateway.json` under `gateway.hubMetrics`: `"hubUrl": "<hub https url>"`, `"apiKey": "<server token>"`. `serverId` already present. This activates `valid` and the REST client works unchanged. Operator task; no code change. Verify with the same script used in this session (`REST valid: True`).
- **Option B (only if A is rejected):** Gateway reads `user_identities` ciphertext directly from Turso (it already has `tursoUrl`) and decrypts locally — **requires shipping `ENCRYPTION_KEY` to the gateway, breaking the locked "sole key holder" decision.** Also requires confirming `tursoUrl` points at the hub's *main* DB (where `user_identities` lives), not a separate events DB. Not planned here; raise with the user if Option A is infeasible.

Tasks 1–5 and 7 are transport-agnostic and can land regardless. Task 6 (real client construction) and Task 8 (live E2E) require Option A.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `minion/extensions/gmail-calendar/src/gws-runner.ts` | gws CLI runner; `GwsContext`; cred-file sourcing | Modify |
| `minion/src/agents/tools/auth/gws-exec-tool.ts` | tool→runner bridge; builds `GwsContext` | Modify |
| `minion/src/agents/tools/<tool-context-seam>` | where tools receive per-turn context (TBD in Task 0) | Modify |
| `minion/src/gateway/hub-credential-client-registry.ts` | process-wide accessor for the resolved `GoogleAdcClient` | Create |
| `minion/src/gateway/server.impl.ts` | construct + register the client at startup from resolved hubMetrics | Modify |
| `minion/src/auto-reply/.../turn-end` (TBD in Task 5) | call `cleanupSessionCredentials` on turn completion | Modify |

---

### Task 0: Trace the tool-context seam (research — produces the exact files for Tasks 2)

The resolved `userId` lives on `ctxPayload.ResolvedHubUserId` at `src/web/auto-reply/monitor/process-message.ts` and equivalents per channel. It must reach `GwsContext` in `gws-runner.ts`. The propagation path does not exist yet; pin it before coding.

- [ ] **Step 1:** Trace how `ctxPayload` reaches tool execution. Start at `process-message.ts` (`ctxPayload` → `dispatchReplyWithBufferedBlockDispatcher` / the agent runner) and follow into where agent tools are invoked. Identify the struct that carries per-turn context to a tool call (the seam where `agentId`/`sessionKey` are already passed to tools).
- [ ] **Step 2:** Confirm whether `ResolvedHubUserId` is already carried on that struct or dropped earlier. Record the exact file:line of (a) the context struct definition, (b) where it's populated from `ctxPayload`, (c) where `gws-exec-tool.ts` reads it.
- [ ] **Step 3:** Write findings into this plan's File Structure table (replace the `<tool-context-seam>` row). No commit (research only).

> Output of Task 0 makes Task 2's edits concrete. If the seam genuinely drops user identity before tools run, Task 2 grows to thread one field through each hop — enumerate each hop as a sub-step then.

---

### Task 1: Add `userId` to `GwsContext`

**Files:** Modify `minion/extensions/gmail-calendar/src/gws-runner.ts`

- [ ] **Step 1:** Extend the context type (currently `{ agentId: string; sessionKey: string }`):

```ts
type GwsContext = {
  agentId: string;
  sessionKey: string;
  /** Resolved hub user id for the messaging end-user (channel→user). When
   *  present, credentials are sourced on-demand from the hub for THIS user. */
  userId?: string;
};
```

- [ ] **Step 2:** `pnpm tsgo` — expect only "unused"/optional-prop noise, no new hard errors. Commit: `refactor(gateway): add optional userId to GwsContext`.

---

### Task 2: Thread `ResolvedHubUserId` → `GwsContext.userId`

**Files:** per Task 0 output (`gws-exec-tool.ts` + the seam files).

- [ ] **Step 1:** At each hop identified in Task 0, carry `ResolvedHubUserId` through to the point where `gws-exec-tool.ts` builds the `GwsContext`, setting `userId: ctx.resolvedHubUserId`.
- [ ] **Step 2:** `pnpm tsgo` clean. Commit: `feat(gateway): thread resolved hub userId into gws tool context`.

> No unit test here (pure plumbing across integration boundaries); correctness is exercised by Task 8 E2E. If Task 0 reveals a single carrier object, add a focused test asserting it preserves `userId`.

---

### Task 3: Process-wide credential-client registry

**Files:** Create `minion/src/gateway/hub-credential-client-registry.ts`; Test `…registry.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setGoogleAdcClient, getGoogleAdcClient } from "./hub-credential-client-registry.js";

describe("hub-credential-client-registry", () => {
  beforeEach(() => setGoogleAdcClient(null));
  it("returns null before registration", () => {
    expect(getGoogleAdcClient()).toBeNull();
  });
  it("returns the registered client", () => {
    const fake = { fetchForUser: async () => null, invalidate: () => {} };
    setGoogleAdcClient(fake);
    expect(getGoogleAdcClient()).toBe(fake);
  });
});
```

- [ ] **Step 2:** Run → FAIL (module missing). `npx vitest run src/gateway/hub-credential-client-registry.test.ts`.
- [ ] **Step 3: Implement**

```ts
import type { GoogleAdcClient } from "../personal-agent/credential-client.js";

let client: GoogleAdcClient | null = null;

/** Set (or clear with null) the process-wide on-demand Google ADC client. */
export function setGoogleAdcClient(c: GoogleAdcClient | null): void {
  client = c;
}

/** Returns the registered client, or null when the gateway has no valid hub
 *  REST config (then Google-backed gws tools degrade to "not connected"). */
export function getGoogleAdcClient(): GoogleAdcClient | null {
  return client;
}
```

- [ ] **Step 4:** Run → PASS. Commit: `feat(gateway): registry for the on-demand Google ADC client`.

---

### Task 4: Construct + register the client at startup (Option A)

**Files:** Modify `minion/src/gateway/server.impl.ts` (near the existing `resolveHubMetricsConfig(...)` at ~line 120).

- [ ] **Step 1:** After `hubMetricsResolved` is computed, register a client when REST config is valid:

```ts
import { createGoogleAdcClient } from "../personal-agent/credential-client.js";
import { setGoogleAdcClient } from "./hub-credential-client-registry.js";
// …
if (hubMetricsResolved.valid && hubMetricsResolved.hubUrl && hubMetricsResolved.apiKey) {
  setGoogleAdcClient(
    createGoogleAdcClient({
      hubUrl: hubMetricsResolved.hubUrl,
      serverToken: hubMetricsResolved.apiKey,
    }),
  );
} else {
  setGoogleAdcClient(null); // REST unwired → Google tools report "not connected"
}
```

- [ ] **Step 2:** `pnpm tsgo` clean. Commit: `feat(gateway): register Google ADC client at startup when hub REST config valid`.

---

### Task 5: Use hub creds in the gws runner + cleanup on turn end

**Files:** Modify `minion/extensions/gmail-calendar/src/gws-runner.ts` (cred-file sourcing at ~line 173); turn-end site (per Task 0/5 trace).

- [ ] **Step 1:** Replace the deprecated `getValidGwsCredentialsFile(...)` path. When `ctx.userId` is present and a client is registered, source on-demand:

```ts
import { loadSessionCredentialsViaHub } from "../../../src/hooks/gws-credentials.js"; // adjust rel path
import { getGoogleAdcClient } from "../../../src/gateway/hub-credential-client-registry.js";
// …
let credFile: string | null = null;
const client = getGoogleAdcClient();
if (ctx.userId && client) {
  credFile = await loadSessionCredentialsViaHub({
    agentId, sessionKey, userId: ctx.userId, client,
  });
}
if (!credFile) {
  // fall back to legacy path during migration, or report not-connected
  return { ok: false, error: "Not connected to Google. Link your account on your profile (Settings → Account)." };
}
// … runCommandWithTimeout([...], { env: { …process.env, GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: credFile } })
```

(Decide per Task 0 whether to keep the legacy gog fallback for non-resolved turns or hard-cut. Default: keep fallback until P6.)

- [ ] **Step 2:** At the turn-end site identified in Task 0, call `cleanupSessionCredentials(agentId, sessionKey)` so the decrypted file does not linger. Wrap in try/catch (best-effort).
- [ ] **Step 3:** `pnpm tsgo` clean; existing gws-runner tests pass. Commit: `feat(gateway): source gws credentials on-demand from hub + cleanup on turn end`.

---

### Task 6: Activate REST config on netcup (prerequisite — Option A)

- [ ] **Step 1:** Register the gateway as a server in the hub (mint server token), or reuse the existing `serverId` registration to obtain a token.
- [ ] **Step 2:** Patch netcup `~bot-prd/.minion/gateway.json` `gateway.hubMetrics` with `hubUrl` + `apiKey`; restart `systemctl --user restart minion-gateway`. Back up first (`/tmp/gateway.bak.<ts>.json`).
- [ ] **Step 3:** Verify `REST valid: True` with the session's python check script over SSH.

---

### Task 7: Unit coverage for the runner branch

**Files:** `minion/extensions/gmail-calendar/src/gws-runner.test.ts` (create or extend)

- [ ] **Step 1:** Test that with a registered fake client returning a credential, `runGws` sets `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` to the written path; with the client returning null, it returns the "not connected" error. Mock `getGoogleAdcClient`, `loadSessionCredentialsViaHub`, and `runCommandWithTimeout`. Run → PASS. Commit.

---

### Task 8: Live netcup E2E (after Task 6)

- [ ] **Step 1:** Via the hub UI (Settings → Account), link a real Google account and a WhatsApp identity (real OTP).
- [ ] **Step 2:** Message the agent over WhatsApp ("¿qué tengo en el calendario hoy?"). Confirm the agent resolves sender→userId→on-demand fetch→real calendar data.
- [ ] **Step 3:** Via SSH, confirm the gateway log shows the resolve + a hub `google-adc` fetch, and that the transient cred file under `~/.minion/agents/<agentId>/auth-credentials/gws/` is created during the turn and removed after.
- [ ] **Step 4: Negative:** a sender with no linked Google → agent reports "not connected", no file written.

---

## Self-Review

- **Spec coverage:** threads userId (Tasks 0–2), exposes client (Tasks 3–4), uses hub creds + cleanup (Task 5), prod config (Task 6), tests (Task 7), live E2E (Task 8). The "sole key holder" invariant holds under Option A.
- **Placeholder honesty:** Task 0 is an explicit, bounded research task because the tool-context seam genuinely does not carry user identity today — its output makes Task 2 concrete. This is flagged, not hidden.
- **Risk controls:** every code task ends tsgo-green + atomic commit; no netcup deploy until Task 6 prerequisite + local checks; legacy gog fallback retained until P6 so non-resolved turns don't break.
- **Type consistency:** `GwsContext.userId?` (Task 1) consumed in Task 5; `getGoogleAdcClient(): GoogleAdcClient | null` (Task 3) matches the `createGoogleAdcClient` return type from P2 and the `loadSessionCredentialsViaHub` client param from P3-core.
