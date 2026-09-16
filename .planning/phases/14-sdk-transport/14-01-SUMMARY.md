---
phase: 14-sdk-transport
plan: "01"
status: complete-private-candidate
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/14-01-a10d14a5
executed: 2026-09-11
executor: Claude (Fable 5.1) continuation, ponytail mode
bases:
  meta: origin/dev 026afe8a26b010f164dc1129bf34b34715375d64
  gateway: origin/DEV e499c3f50b72c4f12b6f874e0e9ad97d823b1317
owned_files:
  - path: packages/shared/src/gateway/envelope-contract.ts
    before: ABSENT
    after: bf597e15be26fe026f0d148363c6183aef0b258195a011b1d0bb406e0b5943e9
  - path: packages/shared/src/gateway/envelope-contract.test.ts
    before: ABSENT
    after: ccb289ff7fb4c41246acd5c104f47398ee9f64b130be87b0e488883cab6e615b
  - path: packages/shared/src/gateway/client.ts
    before: 5c3fcc3f3ec214698b821d694d7f4586326138719e691902bad8b37f1596ae93
    after: 86a7821a8edd701449acb3a08dc99682baaa0ff6180b78f79b0c73241aa61d19
  - path: packages/shared/src/gateway/protocol.ts
    before: 2f2c02b92bccde3f3feb4711dc1b6a5544195a1df613ee39241999a0d7cd591a
    after: 4c9db3fdf3a26520ef0a45faf597a36381904a8e4bc4a0cb33943f35f32bf0c9
  - path: packages/shared/src/gateway/client.test.ts
    before: d1a46f6ffd2ac86e4ac7200c0873bfc4244171c52e285ff5ecbfaca59458d45b
    after: 2daaf68f22bc13609c63bf3d02954362f9c69750ea0a5bd1f275032f794851b1
  - path: packages/shared/src/gateway/index.ts
    before: 3d7c3236a66c405ab5b1e9373e68e73b2034c7ea2245dc43510fce73ec6dd232
    after: fa25985bfd98b8707d881a0ab7833da7c647cf9f3f8953f677302008894c6d0b
  - path: .planning/phases/14-sdk-transport/14-COMPATIBILITY.md
    before: da316646303f62d9c8e08b52a928eca8a7b576c8f88a9c527b1d9fb3abf5ec61
    after: 66880f01d82e410ab288f41f9de83b48cf09a7e460bedeb51956b63fef6749ff
decision_ids: [D360-01, D360-04, D360-05, D360-06]
---

# 14-01 Summary — Specify and validate transport authority contracts

Source edits live only in the private meta snapshot `/home/nikolas/.cache/claude-tmp/14-01-a10d14a5/MINION` (worktree, detached at `origin/dev` `026afe8a`; its `packages/shared/src/gateway/client.ts` before-image is byte-identical to merged `main` `f4343b79` 0.12.0, SHA `5c3fcc3f…`, so the change applies to the released client line). The gateway was never edited: a detached snapshot of `origin/DEV` `e499c3f5` at `/home/nikolas/.cache/claude-tmp/14-01-a10d14a5/minion` was installed and built (`pnpm install --ignore-scripts && pnpm rebuild better-sqlite3 && pnpm baml:generate && pnpm build`, all exit 0) purely as the wire-fixture peer. The two planning docs (this file, VERIFICATION) and the appended section of `14-COMPATIBILITY.md` are in the main checkout. Nothing committed, staged, pushed, published, installed into a consumer, or deployed. Receipts: `<snapshot>/checks/{before,after}.txt`, `freeze.json`, `dist-hashes.txt`, `*.log` (each ends with `exit=<code>`).

## Dependency state

`depends_on: []`. Read-first inputs were the actual gateway sources at `e499c3f5` (`protocol/schema/frames.ts`, `error-codes.ts`, `server-core/server-constants.ts`, `server/ws-connection/message-handler.ts`, `ws-connection.ts`), the shared client/protocol/version/connection/traceparent sources, `packages/shells-bridge/src/acp-client.ts`, and the 14-08 (session callback) and 14-18 (Site fixture hello shapes) receipts. The vendored gateway archive `deps/minion-stack-shared-0.12.0-qc-8c26fdc3.tgz` and Site's `0.9.0-qc-d01a5285…` were not modified or rebuilt; this candidate is a **new** shared source identity (dist hashes in `checks/dist-hashes.txt`), not those archives.

## Task 1 — Freeze supported wire contracts and compatibility cases

`envelope-contract.ts` (new, dependency-free except `types.ts`): `PROTOCOL_VERSION` now lives here (client re-exports it; `version.ts` unchanged), `MAX_FRAME_BYTES` (25 MiB mirror of gateway `MAX_PAYLOAD_BYTES`), `GATEWAY_ERROR_CODES` (the gateway's 8 codes), `CLIENT_ERROR_CODES` (8 local codes), `GatewayError` (`source: 'server'|'client'`, `code`, `details`, `retryable`, `retryAfterMs`; legacy messages preserved), `canRetry()`, `parseFrame()`/`frameDefect()` (size-before-parse, structural req/res/event rules), `isValidTraceparent()` (non-zero trace **and** span id), `validateConnectChallenge()`, `protocolRange()`/`protocolInRange()`, `validateHelloOk()` → `HelloOkView{protocol, identity{connId,role,scopes}, maxPayload}` where identity is server-established only.

`envelope-contract.test.ts`: 104 cases — 27 malformed-frame rejections with exact reasons, oversized (UTF-8 byte counted, incl. multibyte), 8 accepted shapes, traceparent accept/reject (zero ids, version, case, whitespace), challenge shapes, protocol range defaults/invalids, hello-ok full/minimal/forged-assertion/15 rejections, error mapping incl. malformed server error shapes, and a 15-row retry matrix.

`14-COMPATIBILITY.md`: appended "14-01 envelope contract — executed" with the enforced contract table, the real-gateway rejection matrix, consumer findings and explicit gaps (see below).

Gate (plan command, `checks/task1-envelope-test.log`): `pnpm --filter @minion-stack/shared exec vitest run src/gateway/envelope-contract.test.ts` → **1 file, 104/104 passed, exit 0** (run with `--maxWorkers=1 --minWorkers=1`, the same worker bound 14-08 recorded for installed Vitest 2.1.9).

## Task 2 — Validate shared client against protocol fixtures

`client.ts`: inbound `handleMessage` now runs `parseFrame()` first — malformed/oversized frames are discarded before any handshake or pending-map access; only `res` frames reach `handleResponseFrame`; `connect.challenge` payload validated (malformed → `MALFORMED_FRAME`, duplicates after `connectSent` ignored). Handshake: version gate 1 refuses to send `connect` when the challenge announces a protocol outside the params' advertised `[minProtocol,maxProtocol]` (`UNSUPPORTED_PROTOCOL`, credentials never leave); gate 2 validates `hello-ok` shape and protocol range; `hello.policy.maxPayload` is stored per session. `request()`: empty method / unserializable params → local `INVALID_REQUEST`; byte length above session maxPayload → `PAYLOAD_TOO_LARGE` without sending; `ws.send` throw → `SEND_FAILED` with the pending slot released (closes the 14-01 `TODO(handoff)` that was at this site); invalid parent traceparent → fresh root. Timeouts, close, supersede and `close()` reject with `GatewayError` (`TIMEOUT`/`DISCONNECTED`, `details {code, reason}`), messages unchanged. No automatic replay exists (unchanged; now documented and classified by `canRetry`). Binary transport and lifecycle/observer semantics untouched (`String(data)` conversion, generation fencing, `onAuthenticated`, reconnect backoff all as before).

`protocol.ts`: `handleResponseFrame` requires a string id and maps `res.error` through `GatewayError.fromServer`; `sendRequest` gets the same send-failure cleanup and typed errors. `index.ts`: `export * from './envelope-contract.js'`.

`client.test.ts`: 22 new cases (3 describes "14-01 wire boundary") — malformed frames leave the pending map untouched and a later valid response still resolves; malformed events never reach `onEvent`; server errors surface code/details/retryable; `ok:false` without error → `UNKNOWN`/`request failed`; challenge-announced 99 → no connect sent + `UNSUPPORTED_PROTOCOL`; wider range tolerates an older gateway; legacy challenge without protocol; 6 deterministic hello rejections (missing protocol, wrong type, non-object, newer, older, forged scope type) each closing the socket and leaving 0 pending; invalid advertised range; malformed challenge; server-side `protocol mismatch`; send failure cleanup + later request works; unserializable/empty method; hello maxPayload honoured; close 1009 flushes as `DISCONNECTED{code:1009}` with retry classes; `TIMEOUT` classes; traceparent parent inheritance. Existing 14-08 session fixtures updated: `helloReply` now sends `{type:'hello-ok', protocol:3, …}` (`HELLO` constant) and the private-marker key `auth` was renamed `secret` so it is not read as `hello.auth`; three `payload: { type: 'hello-ok' }` literals gained `protocol: 3`. First run after the source change was RED (24 failed / 65 — every hello without `protocol` or `type`), proving the new gate; GREEN after the fixture update.

Gates (`checks/`):

| Gate | Result | Log |
|---|---|---|
| `pnpm --filter @minion-stack/shared test` (`--maxWorkers=1 --minWorkers=1`) | **11 files, 380/380 passed, exit 0** | `shared-test.log` |
| `pnpm --filter @minion-stack/shared typecheck` | exit 0 | `shared-typecheck.log` |
| `pnpm --filter @minion-stack/shared lint` (oxlint 1.66.0) | exit 0; 2 pre-existing warnings in unowned `src/utils/text.ts`, `src/node/index.ts` | `shared-lint.log` |
| `pnpm --filter @minion-stack/shared build` | exit 0 (`dist/gateway/envelope-contract.{js,d.ts}` emitted) | `shared-build.log` |
| `vitest run src/gateway/client.test.ts` | 87/87, exit 0 | `task2-client-test.log` |
| `git diff --check` (meta snapshot) | exit 0 | `git-diff-check.log` |

## Wire fixture — real frames against the actual gateway build (root gate)

`checks/run-wire-fixture.sh` boots `minion.mjs gateway --port 18901 --bind loopback --tailscale off --allow-unconfigured --verbose` from the built DEV snapshot under `env -i PATH HOME=<snapshot>/gw-home TMPDIR MINION_CONFIG_PATH=<snapshot>/gw-home/config.json MINION_STATE_DIR=<snapshot>/gw-home/state MINION_SKIP_CHANNELS=1 MINIONBOT_SKIP_CHANNELS=1` (config: `gateway.mode=local`, token auth with a per-run synthetic token; no `.env`, Infisical, provider key or deployed host), waits for `GET /health`, then runs `checks/wire-fixture.mjs` under `env -i` with the **built** shared client (`packages/shared/dist/gateway/index.js`) and raw `ws` 8.21.0 sockets, and stops the gateway. Real node binary used (`~/.local/share/mise/installs/node/lts-jod/bin/node` v22.23.1) because the `mise` shim cannot run under `env -i`.

Result (`checks/wire-fixture.log`): **24/24 PASS, fixture exit 0, runner exit 0**, gateway `2026.8.7-dev`, `/health → {ok:true, protocol:3}`. Cases: challenge shape (`nonce`, `protocol:3`, `version`) parses under the contract; built-client token handshake → validated `hello-ok` (protocol 3, connId, `policy.maxPayload 26214400`, 161 methods); asserted `['operator.admin','operator.read']`+`userId` not established (scopes `[]`, `auth` absent, never echoed); read RPC → server `INVALID_REQUEST missing scope: operator.read`, not retryable; 25 MiB request refused locally `PAYLOAD_TOO_LARGE` and the session stays usable; unknown method → server error; `close()` → `onClose 1000`, then `NOT_CONNECTED` (retry-safe); no credentials + forged scopes → `NOT_PAIRED device identity required` 1008; wrong token → `INVALID_REQUEST unauthorized…` 1008; raw `[99,99]` → `INVALID_REQUEST protocol mismatch expectedProtocol 3` + close **1002**; built client with `[99,99]` → `UNSUPPORTED_PROTOCOL{gatewayProtocol:3}` and **no connect frame sent**; first frame non-JSON → close 1000 no response; first frame not-req → 1008 `invalid request frame`; first req not connect → `INVALID_REQUEST` + 1008; Site's `client.id 'minion-member-ui'` → `invalid connect params: at /client/id …` + 1008; after handshake `res`/`event`/empty-method → per-frame `INVALID_REQUEST invalid request frame…` with the session open and a later valid req answered; non-JSON after handshake ignored; 25 MiB+1 text frame → close **1009**; after that close the built client reports `NOT_CONNECTED`.

Gateway log (`checks/gateway-run.log`) shows only loopback listeners plus a local Bonjour/mDNS announcement (`minimal=true`, gateway default) and a model *name* — no outbound HTTP, no provider call. Startup side-effects stayed inside the snapshot (`gw-home/state`, generated `baml_client`, build-modified `extensions/*/ui/node_modules/.bin` symlinks and `extensions/meta-graph/minion.plugin.json` — build artefacts in the private gateway worktree, not owned edits, not propagated).

## Deviations

- Meta base is `origin/dev` per the brief; the 0.12.0 version bump and stricter `shells.ts` predicates on `main` are not in this snapshot (`client.ts`, `protocol.ts`, `index.ts` are identical between the two, verified by hash), so the diff applies to either base. Re-application on `main` still needs its own gate run.
- `HOME` for the gateway/fixture processes was pointed at `<snapshot>/gw-home` (brief text says `HOME=$HOME`); stricter reading of the brief's intent (no ambient config/credentials) — the gateway resolves its dev workspace via `os.homedir()`.
- Existing 14-08 test fixtures were tightened (owned file) as described; behaviour asserted by those tests is unchanged.
- The wire fixture script and runner are setup-owned files in `checks/`, not repo files (no repo path for them is in `files_modified`).

## Gaps / open items (not closed by this plan)

1. **Site↔gateway contract break (new finding):** active Site sends `client.id:'minion-member-ui'`, rejected by gateway DEV `e499c3f5` schema (`GATEWAY_CLIENT_IDS`). Needs a bounded child plan (Site source or gateway allow-list) and verification of the deployed gateway's list; outside 14-01 ownership.
2. **Consumer adoption:** Hub/Site/Paperclip still install old archives; any consumer test double must answer `connect` with `{type:'hello-ok', protocol:<int>}`; Hub 14-09 / Site 14-10/14-18 fixtures already comply. No consumer was modified.
3. **ACP boundary** (`shells-bridge/src/acp-client.ts`): no structural validation of JSON-RPC inbound or negotiated capabilities; requires an exact shells-bridge child plan.
4. **11-03 durable receiver/acknowledgment:** still a frozen candidate against a synthetic receiver; 14-12/14-17 real acceptance and 11-04 cancellation acknowledgment remain pending. No receiver frame changed here.
5. Oversized-frame close with a call still pending was not observed on the wire (server answered first); `DISCONNECTED{code:1009}` flush is unit-proven only.
6. Auto-reconnect continues after `UNSUPPORTED_PROTOCOL` (pre-existing handshake-failure policy); left as-is, documented.
7. Registry publish of 0.12.0 remains blocked (out of scope); this candidate is a new source identity that would need its own build/publish/lock transaction.

## Next gated plan

Root decision: (a) admit a Site client-id repair plan (finding 1) before any Site adoption of this client; (b) re-apply this diff on `main` for the 0.12.x line and run the same gates; (c) shells-bridge ACP validation child plan (gap 3). SDK-01 stays open until those and the 11-03/14-12/14-17 runtime gates are independently evidenced.
