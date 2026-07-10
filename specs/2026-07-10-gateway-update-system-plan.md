# Gateway Update System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Webhook-driven update detection for the prod gateway, notification fan-out (hub WS + WhatsApp/Telegram/Discord), one-click install-and-restart from hub settings with crash-loop auto-rollback.

**Architecture:** New `prd` npm dist-tag published by CI on push to a `prd` branch; CI POSTs to the gateway's existing `/hooks` endpoint; a small gateway `update-notify` module owns pending-update state and fan-out; the **existing** `update.run` RPC does the install/restart, extended with a dist-tag override and a detached crash-loop watchdog; hub gets an Updates card on `/settings/gateways`.

**Tech Stack:** Gateway: TypeScript, vitest, pnpm (repo `minion/`, branch off `DEV`). Hub: SvelteKit 2 / Svelte 5, Bun (repo `minion_hub/`, branch `dev`). CI: GitHub Actions (`minion/.github/workflows/npm-publish.yml`).

**Spec:** `specs/2026-07-10-gateway-update-system.md` (meta-repo). Read it first — especially §3 (blue-green rejected), §7 (prod-test containment), §8 (rollout order).

## Global Constraints

- TypeScript strict; no `any`; no `@ts-nocheck`.
- Gateway repo: `pnpm test` (vitest), `pnpm check` (oxlint+oxfmt), `pnpm tsgo` (type-check gate). Note: oxfmt re-stages whole files — scope commits carefully.
- Hub repo: Svelte 5 runes only; new UI strings go through paraglide (`m.x()` + `bun run i18n:compile`); `bun run check`.
- Never commit to `main`/`master`; gateway work branches off `DEV`, hub work on `dev`.
- Prod-touching tests must be reversible; delete any test branches/tags immediately after (spec §7).
- No secrets in code, logs, or docs. Version strings validated (`/^[0-9A-Za-z.+-]+$/`, max 64 chars) before any shell/template use.
- Package name is always the literal `@nikolasp98/minion` — never accept a package name from input.

---

### Task 1: Gateway — extend `update` config schema

**Files:**
- Modify: `minion/src/config/zod-schema.ts:208-214` (the `update` object)
- Modify: `minion/src/config/types.openclaw.ts` (find the existing `update?:` member of the config type and extend it to match)
- Test: `minion/src/config/zod-schema.update.test.ts` (create)

**Interfaces:**
- Produces: `cfg.update.tag?: string`, `cfg.update.checkIntervalHours?: number`, `cfg.update.notify?: Array<{ channel: string; to: string }>` — consumed by Tasks 2, 4, 6.

- [ ] **Step 1: Write the failing test**

```ts
// minion/src/config/zod-schema.update.test.ts
import { describe, expect, it } from "vitest";
import { MinionSchema } from "./zod-schema.js"; // match the actual exported schema name used by existing zod-schema tests

describe("update config section", () => {
  it("accepts tag, checkIntervalHours and notify entries", () => {
    const res = MinionSchema.safeParse({
      update: {
        channel: "stable",
        tag: "prd",
        checkIntervalHours: 6,
        notify: [{ channel: "whatsapp", to: "+51900000000" }],
      },
    });
    expect(res.success).toBe(true);
  });

  it("rejects unknown keys (strict) and bad notify entries", () => {
    expect(MinionSchema.safeParse({ update: { bogus: true } }).success).toBe(false);
    expect(
      MinionSchema.safeParse({ update: { notify: [{ channel: "whatsapp" }] } }).success,
    ).toBe(false);
  });
});
```

Check the real exported schema symbol first (`grep -n "export const" src/config/zod-schema.ts | head`) and mirror how existing `zod-schema.*.test.ts` files import it.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd minion && pnpm vitest run src/config/zod-schema.update.test.ts`
Expected: FAIL — unknown keys `tag`/`checkIntervalHours`/`notify` rejected by `.strict()`.

- [ ] **Step 3: Extend the schema**

```ts
// in zod-schema.ts, replace the update object (lines ~208-214):
update: z
  .object({
    channel: z.union([z.literal("stable"), z.literal("beta"), z.literal("dev")]).optional(),
    checkOnStart: z.boolean().optional(),
    /** Explicit npm dist-tag override (e.g. "prd"). Wins over channel. */
    tag: z
      .string()
      .regex(/^[0-9A-Za-z.+-]+$/)
      .max(64)
      .optional(),
    /** Scheduled update-check interval. Default 24. */
    checkIntervalHours: z.number().int().min(1).max(168).optional(),
    /** Channel fan-out targets for update notifications. */
    notify: z
      .array(
        z
          .object({
            channel: z.string().min(1),
            to: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .optional(),
```

Mirror the same three fields in the `update` member of the config type in `types.openclaw.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/config/zod-schema.update.test.ts` — Expected: PASS.
Also run: `pnpm tsgo` — Expected: clean.

- [ ] **Step 5: Mark `update.*` hot-reloadable**

Open `minion/src/gateway/config-reload.ts`, find where config path prefixes are classified (hot vs restart — see how `hooks` is treated per `server-reload-handlers.ts:66`). Add `update` to the hot-reload set so editing notify targets never restarts the gateway. Follow the existing pattern exactly; if there's a test file like `config-reload.hot-config.test.ts`, add one case asserting a diff at `update.notify` produces a no-restart plan.

- [ ] **Step 6: Commit**

```bash
git add src/config/zod-schema.ts src/config/types.openclaw.ts src/config/zod-schema.update.test.ts src/gateway/config-reload.ts
git commit -m "feat(update): config schema for tag override, check interval, notify targets"
```

---

### Task 2: Gateway — `update-notify` module

**Files:**
- Create: `minion/src/gateway/update-notify.ts`
- Test: `minion/src/gateway/update-notify.test.ts`
- Modify: `minion/src/gateway/server.impl.ts` (call `initUpdateNotify` + startup outcome notify near the existing `scheduleGatewayUpdateCheck` wiring at ~line 1187)

**Interfaces:**
- Consumes: `runMessageAction` (`src/infra/outbound/message-action-runner.ts:689`, shape `{ cfg, action: "send", params: { channel, to, message } }` — confirm exact param keys against `src/cli/program/message/register.send.ts` before writing), `resolveStateDir` (`src/config/paths.ts`), `VERSION` (`src/version.ts`), `broadcast` fn (`server-broadcast.ts:183` `GatewayBroadcastFn`).
- Produces (consumed by Tasks 3, 4, 5, 6):

```ts
export type PendingUpdate = {
  version: string;
  sha?: string;
  notes?: string;
  source: "webhook" | "check";
  detectedAt: string; // ISO
};
export type UpdateApplyResult = {
  ok: boolean;
  from: string;
  to: string;
  rolledBackTo?: string;
  detail?: string;
  at: string; // ISO
};
export type UpdateStatusInfo = {
  current: string; // VERSION
  pending: PendingUpdate | null;
  lastResult: UpdateApplyResult | null;
};

export function initUpdateNotify(params: {
  broadcast: (event: string, payload: unknown) => void;
}): void;
export async function recordAvailableUpdate(
  input: { version: string; sha?: string; notes?: string; source: "webhook" | "check" },
  cfg: MinionConfig,
): Promise<{ notified: boolean; reason?: "duplicate" | "not-newer" }>;
export async function getUpdateStatus(): Promise<UpdateStatusInfo>;
export async function clearPendingIfCurrent(): Promise<void>;
export async function notifyUpdateOutcomeOnStartup(cfg: MinionConfig): Promise<void>;
```

State files (all under `resolveStateDir()`): `update-pending.json` (PendingUpdate), `update-result.json` (UpdateApplyResult, written by the Task-5 watchdog, consumed+archived here).

**Behavior contract:**
- `recordAvailableUpdate`: reject invalid version strings; return `not-newer` when `compareSemverStrings(VERSION, input.version)` (from `src/infra/update-check.ts:344`) is not `< 0`; return `duplicate` when equal to the already-pending version. Otherwise persist pending, `broadcast("update.available", pending)`, and for each `cfg.update.notify` entry call `runMessageAction` with message `Gateway update available: v<version> (current v<VERSION>). Install from Hub → Settings → Gateways.` Each send wrapped in try/catch — one dead channel never blocks the rest. Returns `{ notified: true }`.
- `notifyUpdateOutcomeOnStartup`: if `update-result.json` exists → `broadcast("update.applied", result)` + fan-out message (`Gateway updated to v<to>` or `Gateway update to v<to> FAILED — rolled back to v<rolledBackTo>`), then rename the file to `update-result.last.json` (archive). Then `clearPendingIfCurrent()` (drop pending if `compareSemverStrings(VERSION, pending.version) >= 0`).

- [ ] **Step 1: Write failing tests** — cover: dedupe (`duplicate`), stale (`not-newer`), happy path (broadcast called with `update.available` + one `runMessageAction` per notify entry), send-failure isolation (first entry throws, second still called), startup outcome (result file → broadcast `update.applied` + archive). Mock `runMessageAction` with `vi.mock("../infra/outbound/message-action-runner.js")`; point the state dir at a tmp dir via the same env var `resolveStateDir()` reads (check `src/config/paths.ts` — it honors `MINION_STATE_DIR`/`OPENCLAW_STATE_DIR`).

```ts
// minion/src/gateway/update-notify.test.ts — skeleton for the first case
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

vi.mock("../infra/outbound/message-action-runner.js", () => ({
  runMessageAction: vi.fn(async () => ({ kind: "send" })),
}));
import { runMessageAction } from "../infra/outbound/message-action-runner.js";
import { initUpdateNotify, recordAvailableUpdate } from "./update-notify.js";

describe("recordAvailableUpdate", () => {
  let broadcasts: Array<{ event: string; payload: unknown }>;
  beforeEach(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "upd-notify-"));
    process.env.MINION_STATE_DIR = dir;
    broadcasts = [];
    initUpdateNotify({ broadcast: (event, payload) => broadcasts.push({ event, payload }) });
    vi.mocked(runMessageAction).mockClear();
  });

  it("persists, broadcasts and fans out on a newer version", async () => {
    const cfg = {
      update: { notify: [{ channel: "whatsapp", to: "+51900000000" }] },
    } as never;
    const res = await recordAvailableUpdate(
      { version: "9999.1.1", source: "webhook" },
      cfg,
    );
    expect(res.notified).toBe(true);
    expect(broadcasts[0]?.event).toBe("update.available");
    expect(vi.mocked(runMessageAction)).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL** — `pnpm vitest run src/gateway/update-notify.test.ts` → module not found.
- [ ] **Step 3: Implement `update-notify.ts`** per the behavior contract above (~150 lines; module-level `let broadcastFn` set by `initUpdateNotify`, atomic JSON read/write helpers copied from `update-startup.ts`'s `readState`/`writeState` style).
- [ ] **Step 4: Run tests, verify PASS**, then `pnpm tsgo`.
- [ ] **Step 5: Wire into `server.impl.ts`** — where `scheduleGatewayUpdateCheck` is wired (~:1187) and a `broadcast` fn is in scope (it is, for `shutdown`/`health` events): call `initUpdateNotify({ broadcast })` and `void notifyUpdateOutcomeOnStartup(cfg).catch(() => {})` during startup.
- [ ] **Step 6: Commit** — `git commit -m "feat(update): update-notify module — pending state, WS broadcast, channel fan-out"`

---

### Task 3: Gateway — `/hooks/update` action

**Files:**
- Modify: `minion/src/gateway/hooks.ts` (add `normalizeUpdatePayload` next to `normalizeWakePayload:267`)
- Modify: `minion/src/gateway/server-core/server-http.ts` (new branch beside the `wake` branch at ~:391; extend `createHooksRequestHandler` params at :221 with `dispatchUpdateHook`)
- Modify: `minion/src/gateway/server/hooks.ts` (define `dispatchUpdateHook` inside `createGatewayHooksRequestHandler`, pass through)
- Test: `minion/src/gateway/hooks.update-payload.test.ts` (create); extend whichever existing test covers the wake/agent HTTP branches (find with `grep -rln "hooks/wake" src/gateway --include="*.test.ts"`)

**Interfaces:**
- Consumes: `recordAvailableUpdate` (Task 2).
- Produces: `POST /hooks/update` with body `{ version: string, sha?: string, notes?: string }`, auth = existing bearer/HMAC. Responses: `200 { ok: true, notified }`, `400` on invalid payload. Consumed by Task 7 (CI) and spec §7 rehearsal 2.

- [ ] **Step 1: Failing test for the normalizer**

```ts
// minion/src/gateway/hooks.update-payload.test.ts
import { describe, expect, it } from "vitest";
import { normalizeUpdatePayload } from "./hooks.js";

describe("normalizeUpdatePayload", () => {
  it("accepts version with optional sha/notes", () => {
    const r = normalizeUpdatePayload({ version: "2026.7.5.20260710", sha: "abc123" });
    expect(r).toEqual({ ok: true, value: { version: "2026.7.5.20260710", sha: "abc123", notes: undefined } });
  });
  it("rejects missing or malformed version", () => {
    expect(normalizeUpdatePayload({}).ok).toBe(false);
    expect(normalizeUpdatePayload({ version: "v1; rm -rf /" }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** — `normalizeUpdatePayload(payload: Record<string, unknown>)` returning the same `{ ok, value | error }` shape as `normalizeWakePayload`; version must match `/^[0-9A-Za-z.+-]+$/` and be ≤ 64 chars; `sha`/`notes` optional strings (notes ≤ 2000 chars). Then add the HTTP branch, mirroring `wake`:

```ts
if (subPath === "update") {
  const normalized = normalizeUpdatePayload(payload as Record<string, unknown>);
  if (!normalized.ok) {
    sendJson(res, 400, { ok: false, error: normalized.error });
    return true;
  }
  const outcome = await dispatchUpdateHook(normalized.value);
  sendJson(res, 200, { ok: true, ...outcome });
  return true;
}
```

And in `src/gateway/server/hooks.ts`:

```ts
const dispatchUpdateHook = async (value: { version: string; sha?: string; notes?: string }) => {
  const cfg = loadConfig();
  return await recordAvailableUpdate({ ...value, source: "webhook" }, cfg);
};
```

Thread `dispatchUpdateHook` through `createHooksRequestHandler`'s params exactly like `dispatchWakeHook`.

- [ ] **Step 4: Run tests** (`pnpm vitest run src/gateway/hooks.update-payload.test.ts` + the HTTP-branch test you extended), verify PASS; `pnpm tsgo`.
- [ ] **Step 5: Commit** — `git commit -m "feat(update): /hooks/update webhook action → recordAvailableUpdate"`

---

### Task 4: Gateway — `update.status` + `update.check` RPCs; tag passthrough in `update.run`

**Files:**
- Modify: `minion/src/gateway/server-methods/update.ts`
- Modify: `minion/src/gateway/protocol/index.ts` (schemas + validators next to `UpdateRunParamsSchema`, see :224/:427/:562 and its definition site — find with `grep -rn "UpdateRunParamsSchema" src/gateway/protocol/`)
- Modify: `minion/src/gateway/server-core/server-methods-list.ts` (add `"update.status"`, `"update.check"` beside `"update.run"` at :55)
- Test: extend `minion/src/gateway/server-methods/update.test.ts`

**Interfaces:**
- Consumes: `getUpdateStatus`, `recordAvailableUpdate` (Task 2); `resolveNpmChannelTag`, `fetchNpmTagVersion` (`src/infra/update-check.ts:297,320`); `runGatewayUpdate` `opts.tag` (`update-runner.ts:876`).
- Produces: RPC `update.status` → `UpdateStatusInfo`; `update.check` → `UpdateStatusInfo` (after a live registry lookup); `update.run` unchanged shape but resolves tag as `cfg.update.tag ?? channelToNpmTag(channel)`. Consumed by Task 8 (hub API).

- [ ] **Step 1: Failing tests** — in `update.test.ts` (mirror its existing harness): `update.status` responds with `current === VERSION` and `pending: null` on a clean state dir; `update.run` passes `tag: "prd"` into `runGatewayUpdate` when `cfg.update.tag = "prd"` (mock `runGatewayUpdate`, assert call arg).
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement.**

```ts
// server-methods/update.ts — add handlers + tag passthrough
"update.status": async ({ respond }) => {
  respond(true, await getUpdateStatus(), undefined);
},
"update.check": async ({ respond }) => {
  const cfg = loadConfig();
  const channel = normalizeUpdateChannel(cfg.update?.channel) ?? "stable";
  const tag = cfg.update?.tag ?? channelToNpmTag(channel);
  const remote = await fetchNpmTagVersion({ tag, timeoutMs: 5000 });
  if (remote.version) {
    await recordAvailableUpdate({ version: remote.version, source: "check" }, cfg);
  }
  respond(true, await getUpdateStatus(), undefined);
},
```

In the existing `update.run` handler, add `tag: config.update?.tag ?? undefined` to the `runGatewayUpdate({ … })` options (the runner already prefers `opts.tag` over the channel mapping). Check `fetchNpmTagVersion`'s exact signature/return at `update-check.ts:297` before writing.

Protocol: define `UpdateStatusParamsSchema`/`UpdateCheckParamsSchema` as empty-object schemas exactly like the smallest existing params schema in the protocol file, compile validators, export both, and `assertValidParams` in the handlers.

- [ ] **Step 4: Run tests, verify PASS**; `pnpm tsgo`; `pnpm check`.
- [ ] **Step 5: Commit** — `git commit -m "feat(update): update.status/update.check RPCs + dist-tag override in update.run"`

---

### Task 5: Gateway — crash-loop watchdog

**Files:**
- Create: `minion/src/infra/update-watchdog.ts`
- Test: `minion/src/infra/update-watchdog.test.ts`
- Modify: `minion/src/gateway/server-methods/update.ts` (spawn watchdog on successful update before the scheduled restart)

**Interfaces:**
- Consumes: `runRestartScript` (`src/cli/update-cli/restart-helper.ts:132`) for detached spawn; `resolveSystemdUnit` logic (private in restart-helper — either export it or re-derive from `OPENCLAW_SYSTEMD_UNIT` the same way).
- Produces: `prepareUpdateWatchdogScript(params: { fromVersion: string; toVersion: string; stateDir: string; env?: NodeJS.ProcessEnv }): Promise<string | null>` — returns tmpdir script path (linux-only; returns null on other platforms, callers skip silently).

- [ ] **Step 1: Failing test** — call `prepareUpdateWatchdogScript({ fromVersion: "1.0.0", toVersion: "1.0.1", stateDir: "/tmp/x" })`, read the file, assert it contains the `NRestarts` poll, the exact rollback command `npm install -g '@nikolasp98/minion@1.0.0'`, and the `update-result.json` writes; assert versions with shell metacharacters (`"1.0.0; rm -rf /"`) return `null`.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement.** Script template (single-quoted values via the same `shellEscape` used in restart-helper; validate versions against `/^[0-9A-Za-z.+-]+$/` first and return null otherwise):

```sh
#!/bin/sh
# Update watchdog — detached; survives the gateway restart it observes.
UNIT='<unit>'
RESULT='<stateDir>/update-result.json'
LOG='<stateDir>/update-apply.log'
BASE=$(systemctl --user show "$UNIT" -p NRestarts --value 2>/dev/null || echo 0)
sleep 15   # let the scheduled restart fire and the new process boot
i=0
while [ $i -lt 15 ]; do
  STATE=$(systemctl --user is-active "$UNIT" 2>/dev/null || true)
  SUB=$(systemctl --user show "$UNIT" -p SubState --value 2>/dev/null || true)
  NR=$(systemctl --user show "$UNIT" -p NRestarts --value 2>/dev/null || echo 0)
  if [ "$SUB" = "auto-restart" ] || [ "$NR" -gt $((BASE + 1)) ]; then
    echo "$(date -Is) crash-loop detected (SubState=$SUB NRestarts=$NR base=$BASE) — rolling back to <fromVersion>" >> "$LOG"
    npm install -g '@nikolasp98/minion@<fromVersion>' --omit=dev --no-audit --no-fund >> "$LOG" 2>&1
    rm -rf /tmp/node-compile-cache
    systemctl --user restart "$UNIT"
    printf '{"ok":false,"from":"<fromVersion>","to":"<toVersion>","rolledBackTo":"<fromVersion>","at":"%s"}' "$(date -Is)" > "$RESULT"
    rm -f "$0"; exit 0
  fi
  if [ "$STATE" = "active" ] && [ "$SUB" = "running" ]; then
    printf '{"ok":true,"from":"<fromVersion>","to":"<toVersion>","at":"%s"}' "$(date -Is)" > "$RESULT"
    rm -f "$0"; exit 0
  fi
  sleep 6; i=$((i + 1))
done
echo "$(date -Is) watchdog timed out undecided" >> "$LOG"
rm -f "$0"
```

In `update.run` (server-methods/update.ts), when `result.status === "ok"` and before `scheduleGatewaySigusr1Restart`, best-effort spawn: `const wd = await prepareUpdateWatchdogScript({ fromVersion: result.before ?? VERSION, toVersion: result.after ?? "unknown", stateDir: resolveStateDir() }); if (wd) await runRestartScript(wd);` (reuse `runRestartScript`'s detached spawn — it just executes a script path). Note: `update-result.json` is only written for RPC-triggered updates (watchdog spawned there); Task 2's startup notifier is a no-op when the file is absent.

- [ ] **Step 4: Run tests, verify PASS**; `pnpm tsgo`.
- [ ] **Step 5: Commit** — `git commit -m "feat(update): detached crash-loop watchdog with npm rollback"`

---

### Task 6: Gateway — scheduled check notifies instead of just logging

**Files:**
- Modify: `minion/src/infra/update-startup.ts`
- Test: extend `minion/src/infra/update-startup.test.ts`

**Interfaces:**
- Consumes: `recordAvailableUpdate` (Task 2 — import from `../gateway/update-notify.js`; if that direction creates a cycle, move the two shared types into `update-notify` and keep the call lazy via dynamic `import()` — check with `pnpm tsgo` first, static import is fine if no cycle).
- Produces: unchanged exports; new behavior only.

- [ ] **Step 1: Failing test** — mock `recordAvailableUpdate`; configure `cfg.update = { tag: "prd", checkIntervalHours: 1 }`; make `resolveNpmChannelTag`/`fetchNpmTagVersion` return a newer version (see how the existing tests in `update-startup.test.ts` stub the registry); assert `recordAvailableUpdate` is called with `{ version, source: "check" }`.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** in `runGatewayUpdateCheck`:
  - Interval: `const intervalMs = (params.cfg.update?.checkIntervalHours ?? 24) * 60 * 60 * 1000;` replacing the `UPDATE_CHECK_INTERVAL_MS` use at :66.
  - Tag: when `params.cfg.update?.tag` is set, skip `resolveNpmChannelTag` and use `fetchNpmTagVersion({ tag: params.cfg.update.tag, timeoutMs: 2500 })`.
  - On `cmp < 0` (line ~102): keep the log line, and add `await recordAvailableUpdate({ version: resolved.version, source: "check" }, params.cfg).catch(() => {});` — the module's own dedupe replaces the `lastNotifiedVersion` logic for fan-out (keep the state-file fields for the log-noise guard as-is).
- [ ] **Step 4: Run full file tests, verify PASS**; `pnpm tsgo`; run `pnpm test` (whole suite) once here — this task touches startup code.
- [ ] **Step 5: Commit** — `git commit -m "feat(update): scheduled check notifies via update-notify, honors tag + interval config"`

---

### Task 7: CI — `prd` branch publish + gateway webhook ping

**Files:**
- Modify: `minion/.github/workflows/npm-publish.yml`

**Interfaces:**
- Consumes: repo secrets `GW_HOOKS_TOKEN` (the gateway `hooks.token`) and `GW_HOOKS_URL` (e.g. `https://<gateway-host>/hooks`) — added in Task 10, step 2.
- Produces: pushes to `prd` publish `@nikolasp98/minion@<base>.<timestamp>` under dist-tag `prd`, then POST `/hooks/update`.

- [ ] **Step 1: Add `prd` to the trigger** — `on.push.branches: [main, DEV, prd]`.
- [ ] **Step 2: Version + publish steps for prd** (mirror the DEV steps exactly; only the tag differs):

```yaml
      - name: Set prerelease version (prd only)
        if: github.ref_name == 'prd'
        run: |
          TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
          BASE_VERSION=$(node -p "require('./package.json').version")
          npm version "${BASE_VERSION}.${TIMESTAMP}" --no-git-tag-version
```

Locate the existing publish step(s) and extend their branch conditions so `prd` publishes with `--tag prd` (DEV publishes with `--tag dev` — copy that step, swap the ref check and tag).

- [ ] **Step 3: Webhook ping step** (append as the final job step):

```yaml
      - name: Notify gateway of prd release
        if: github.ref_name == 'prd' && success()
        continue-on-error: true
        run: |
          VERSION=$(node -p "require('./package.json').version")
          curl -fsS -m 15 -X POST "${{ secrets.GW_HOOKS_URL }}/update" \
            -H "Authorization: Bearer ${{ secrets.GW_HOOKS_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d "{\"version\":\"${VERSION}\",\"sha\":\"${GITHUB_SHA}\"}"
```

- [ ] **Step 4: Validate** — `actionlint .github/workflows/npm-publish.yml` if available, else careful YAML review (indentation under the existing job).
- [ ] **Step 5: Commit** — `git commit -m "ci: publish prd dist-tag on prd branch + notify gateway /hooks/update"`

---

### Task 8: Hub — gateway update API routes

**Files:**
- Create: `minion_hub/src/routes/api/gateway/update/+server.ts`
- Test: co-located or under the hub's existing API test convention (find with `ls minion_hub/src/routes/api/plugins/*/`) — at minimum an auth-guard unit test if the hub tests routes; otherwise verified in Task 10 rehearsals.

**Interfaces:**
- Consumes: `gatewayCall` (`minion_hub/src/lib/server/gateway-rpc.ts:217`); admin gating — copy the guard style from `src/routes/api/plugins/[id]/toggle/+server.ts:48` (and the central `apiWriteCapability` guard in `hooks.server.ts:228-236` applies to POST automatically — confirm the new path is covered, add to the capability map if the pattern requires explicit registration).
- Produces: `GET /api/gateway/update` → `UpdateStatusInfo`; `POST /api/gateway/update` body `{ action: "check" | "run" }` → RPC result. Consumed by Task 9 UI.

- [ ] **Step 1: Implement the route:**

```ts
// minion_hub/src/routes/api/gateway/update/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { gatewayCall } from '$lib/server/gateway-rpc';
// import the same admin/capability guard used by api/plugins/[id]/toggle — match it exactly

export const GET: RequestHandler = async (event) => {
  // guard: admin (same helper as plugins toggle)
  const status = await gatewayCall('update.status', {});
  return json(status);
};

export const POST: RequestHandler = async (event) => {
  // guard: admin (same helper as plugins toggle)
  const body = (await event.request.json().catch(() => ({}))) as { action?: string };
  if (body.action === 'check') {
    return json(await gatewayCall('update.check', {}));
  }
  if (body.action === 'run') {
    return json(await gatewayCall('update.run', {}));
  }
  throw error(400, 'action must be "check" or "run"');
};
```

Replace the guard comments with the real imports/calls after reading the plugins toggle route — do not invent a new guard.

- [ ] **Step 2: Type-check** — `cd minion_hub && bun run check`. Expected: clean.
- [ ] **Step 3: Commit** — `git commit -m "feat(update): /api/gateway/update — status/check/run proxy to gateway RPC"`

---

### Task 9: Hub — Updates card, WS events, notification prefs, i18n

**Files:**
- Modify: `minion_hub/src/lib/services/gateway.svelte.ts:564` (`handleEvent` switch — add `update.available` / `update.applied` cases)
- Create: `minion_hub/src/lib/state/gateway/update-state.svelte.ts` (tiny rune store)
- Modify: `minion_hub/src/lib/state/gateway/index.ts` (barrel export)
- Create: `minion_hub/src/lib/components/settings/GatewayUpdateCard.svelte`
- Modify: `minion_hub/src/routes/(app)/settings/gateways/+page.svelte` (mount the card at top)
- Modify: paraglide message files (same dir the existing `m.*` strings live in) + `bun run i18n:compile`
- Modify: `minion_hub/src/lib/components/layout/NotificationsPopup.svelte` (update-available row)

**Interfaces:**
- Consumes: `GET/POST /api/gateway/update` (Task 8); `gw.hello.server.version` (`src/lib/state/gateway/gateway-data.svelte.ts:13`); toast helpers + the config-restart machine (`src/lib/state/config/config-restart.ts` — read its exports first; arm it the same way `config.svelte.ts:337/346` does with `beginRestart`).
- Produces: visible Updates card; toast + bell row on `update.available`.

- [ ] **Step 1: Store.**

```ts
// minion_hub/src/lib/state/gateway/update-state.svelte.ts
export type PendingUpdate = {
  version: string;
  sha?: string;
  notes?: string;
  source: 'webhook' | 'check';
  detectedAt: string;
};
export type UpdateApplyResult = {
  ok: boolean; from: string; to: string; rolledBackTo?: string; detail?: string; at: string;
};

export const updateState = $state({
  pending: null as PendingUpdate | null,
  lastResult: null as UpdateApplyResult | null,
  installing: false,
});
```

- [ ] **Step 2: Event wiring** in `handleEvent`:

```ts
case 'update.available': {
  updateState.pending = evt.payload as PendingUpdate;
  toastInfo(m.gateway_update_available_title(), m.gateway_update_available_body({ version: updateState.pending.version }), { id: 'gateway-update' });
  break;
}
case 'update.applied': {
  const r = evt.payload as UpdateApplyResult;
  updateState.lastResult = r;
  updateState.installing = false;
  if (r.ok) updateState.pending = null;
  break;
}
```

Match the toast helper names actually exported next to `toastError` in this file.

- [ ] **Step 3: Card component** — `GatewayUpdateCard.svelte`: shows current version (`gw.hello?.server?.version ?? '—'` + short commit), pending version/notes when `updateState.pending`, buttons **Check now** (`POST {action:'check'}` then refresh from response) and **Install & restart** (confirm dialog → `updateState.installing = true` → `POST {action:'run'}` → arm the config-restart machine so the WS drop shows the restarting toast; on reconnect compare `gw.hello.server.version` and toast success/mismatch). Notify-targets editor: read `cfg.update.notify` via the existing config state (`config.svelte.ts` exposes the loaded config) and write with the same `config.patch` flow used elsewhere on the settings pages — reuse, don't re-implement. On mount: `fetch('/api/gateway/update')` to seed `updateState` (covers updates that arrived while the tab was closed). All strings via `m.*`; run `bun run i18n:compile` after adding messages. Follow Svelte 5 runes + the svelte-file-editor skill/agent conventions when writing the component.
- [ ] **Step 4: Bell row** — in `NotificationsPopup.svelte`, when `updateState.pending` render one row ("Gateway update v<version> available") linking to `/settings/gateways`; include it in the badge count in `Topbar.svelte` (pendingCount + (updateState.pending ? 1 : 0) — keep it derived, no store writes).
- [ ] **Step 5: Verify** — `bun run check`; `bun run dev` + browser-harness smoke: settings/gateways renders the card with the current version (gateway may be disconnected locally — card must render a disconnected state without crashing).
- [ ] **Step 6: Commit** — `git commit -m "feat(update): gateway Updates card, WS update events, bell row"`

---

### Task 10: Rollout + contained prod rehearsals (spec §7/§8 — human-in-the-loop)

**Files:** none (operational). Each step is reversible; leave no test artifacts.

- [ ] **Step 1: Flush unpushed prod work.** In `minion/`: commit/push current DEV lineage including everything hand-deployed to prod (memory: gw tip `f09bf410f` + scoped dirty adds). **Gate: do not proceed until prod's running code is fully represented in origin/DEV** — the first prd publish replaces `dist/` wholesale.
- [ ] **Step 2: Secrets.** `gh secret set GW_HOOKS_TOKEN --repo NikolasP98/minion-ai` (value = gateway `hooks.token` from prod config) and `gh secret set GW_HOOKS_URL` (public gateway base URL + hooks path). Verify with `gh secret list`.
- [ ] **Step 3: Ship the updater code to prod once via the old path.** Merge tasks 1–7 into DEV → `./setup/utilities/deploy-bot-prd.sh` (the updater must be running before it can self-update). Verify `update.status` RPC responds (via hub or `curl` the hub API).
- [ ] **Step 4: Prod config.** Via hub config editor (or `minion config` on the box): `update.tag = "prd"`, `update.notify = [<real targets>]`. Confirm hot-reload (no restart).
- [ ] **Step 5: Rehearsal — webhook.** `curl -X POST "$GW_HOOKS_URL/update" -H "Authorization: Bearer $GW_HOOKS_TOKEN" -d '{"version":"9999.0.0"}'` → expect WhatsApp/Telegram/Discord messages + hub toast + bell row + card shows 9999.0.0. Clean up: `POST /api/gateway/update {action:"check"}` (real registry lookup resets pending via `not-newer`… it won't — 9999.0.0 is still newer; instead delete `~/.minion/update-pending.json` on the box or call the hub Check button after step 7 publishes a real version). Simplest: run this rehearsal with version `0.0.1` instead — dedupe returns `not-newer`, proving auth+plumbing with zero state to clean.
- [ ] **Step 6: Create `prd` branch** = current DEV tip: `git push origin DEV:refs/heads/prd`. The resulting publish IS the pipeline test (desired end state, not junk — nothing to revert). Watch the workflow; confirm dist-tag: `npm view @nikolasp98/minion dist-tags`.
- [ ] **Step 7: E2E.** The step-6 publish should have fired the webhook → real notification. In hub: **Install & restart**. Watch: restarting toast → reconnect → new version in the card → outcome notification on channels → `update-result.json` consumed. Verify WhatsApp channels re-attached (spec §5 QR risk); if a WA session dropped, re-pair per runbook.
- [ ] **Step 8: Record.** Note the new flow in `minion/docs` ops notes if present; update memory. Escape hatches unchanged: `minion update`, `deploy-bot-prd.sh`.

---

## Self-review (done at write time)

- **Spec coverage:** §4.1→Task 7+10.6; §4.2→Tasks 6,7; §4.3→Task 3; §4.4→Task 2; §4.5→Task 4; §4.6→Task 5; §4.7→Task 1; §4.8→Tasks 8,9; §5 matrix→Tasks 2,4,5 tests; §7→Task 10 rehearsals; §8→Task 10 order. Blue-green (§3) — no task, by design.
- **Type consistency:** `PendingUpdate`/`UpdateApplyResult`/`UpdateStatusInfo` defined in Task 2, mirrored (client copies) in Task 9 — hub types are structural copies, acceptable since the WS payload is untyped JSON at the boundary; if `@minion-stack/shared` is preferred, move them there in Task 9 instead (one file, same shapes).
- **Placeholders:** Task 8 guard import intentionally says "copy from plugins toggle" with an exact source path — that's a reference, not a TBD. Schema export name in Task 1 test likewise pinned to a grep step.
