---
phase: 14-sdk-transport
plan: "01"
verified: 2026-09-11
status: complete-private-candidate
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/14-01-a10d14a5
---

# 14-01 Verification — goal-backward check of must_haves

Evidence root: `/home/nikolas/.cache/claude-tmp/14-01-a10d14a5/checks/`. Source identities in `14-01-SUMMARY.md` frontmatter (`before.txt`/`after.txt`). Nothing below claims consumer adoption, publication or deployment.

## Truth 1 — "Malformed/oversized frames, forged identity and unsupported versions have deterministic rejection; documented supported combinations reflect actual consumers."

| Claim | Evidence | Status |
|---|---|---|
| Malformed inbound frames rejected deterministically by the shared client | `envelope-contract.test.ts` 27 malformed rejections with exact reasons + non-text; `client.test.ts` "malformed frames are discarded before the pending map is touched" (12 shapes, pending size stays 1, later valid response resolves) — `task1-envelope-test.log` 104/104, `task2-client-test.log` 87/87 | VERIFIED (unit) |
| Malformed frames rejected deterministically by the real gateway | `wire-fixture.log`: first frame non-JSON → close 1000; not-req → 1008 `invalid request frame`; req-not-connect → `INVALID_REQUEST` + 1008; after handshake `res`/`event`/empty-method → `INVALID_REQUEST invalid request frame…`, session stays open | VERIFIED (real build, loopback) |
| Oversized frames | `parseFrame` PAYLOAD_TOO_LARGE before parse (UTF-8 counted); client refuses outbound > `hello.policy.maxPayload` without sending (unit + wire `client-oversized-local`); real gateway closes 25 MiB+1 with **1009** (`raw-oversized`) | VERIFIED |
| Forged identity | `validateHelloOk` derives identity only from `hello.server/auth` (unit "never derives identity from caller assertions"); real gateway: asserted scopes/userId with token → established scopes `[]`, `auth` absent, read RPC denied `missing scope: operator.read`; without credentials → `NOT_PAIRED` 1008; wrong token → `INVALID_REQUEST` 1008 | VERIFIED |
| Unsupported versions | Client: challenge-announced protocol outside advertised range → `UNSUPPORTED_PROTOCOL`, **connect never sent** (unit + wire `client-protocol-mismatch-local`, `sentConnect:false`); hello protocol outside range → `UNSUPPORTED_PROTOCOL` (unit, newer and older); server: `[99,99]` → `INVALID_REQUEST protocol mismatch expectedProtocol 3` + close 1002 (wire) | VERIFIED |
| Supported combinations reflect actual consumers | `14-COMPATIBILITY.md` §"14-01 envelope contract": Hub `minion-control-ui`, Paperclip Node wrapper, Site `minion-member-ui`; the Site id is **rejected** by gateway DEV `e499c3f5` (wire case `site client.id`) — recorded as a finding, not hidden | VERIFIED as documented; Site combination is UNSUPPORTED as-is (gap 1) |
| Additive negotiation keeps old clients | Wire shape unchanged (`req/res/event`, same connect params); wider range tolerates older gateway, legacy challenge without `protocol` still connects (unit) | VERIFIED (unit); no old-client archive was executed against the new server here |

## Truth 2 — "Shared client tests cover pending-call cleanup, handshake/version errors, malformed frames and idempotent retry classification."

| Claim | Evidence | Status |
|---|---|---|
| Pending-call cleanup | `client.test.ts`: send failure releases slot (`pendingSize 0`, later request works); unserializable/empty method leave no entry; close 1009 flushes both pending calls as `DISCONNECTED{code:1009}`, `pendingSize 0`; timeout deletes entry; 6 hello rejections end with `pendingSize 0`; existing `close()` flush test retained | VERIFIED |
| Handshake/version errors | 5 handshake tests + 6-row hello rejection table + server-side `protocol mismatch` propagation | VERIFIED |
| Malformed frames | as Truth 1 | VERIFIED |
| Idempotent retry classification | `canRetry` 15-row matrix (`envelope-contract.test.ts`) + client tests asserting classes on `SEND_FAILED`, `NOT_CONNECTED`, `DISCONNECTED`, `TIMEOUT`, `PAYLOAD_TOO_LARGE`, server `INVALID_REQUEST`; no automatic replay exists (`requests(next,'mutation')` length 0 in retained 14-08 test) | VERIFIED |
| Trace context | outbound parent inherited only when `isValidTraceparent` (zero span id → fresh root) — client test + 10 validator cases | VERIFIED |
| Binary Yjs transport / lifecycle preserved | `String(data)` conversion and generation fencing untouched; all 65 pre-existing client cases pass after fixture update; full package 380/380 | VERIFIED (no binary consumer executed) |

## Artifacts

| Artifact | Provides | Status |
|---|---|---|
| `packages/shared/src/gateway/envelope-contract.ts` | frozen contracts, validators, error model, retry rule | PRESENT (`bf597e15…`), built to `dist/gateway/envelope-contract.js` (`d9534734…`) |
| `packages/shared/src/gateway/client.ts` | validators wired at inbound/outbound boundaries | PRESENT (`86a7821a…`); `TODO(handoff)` for send/serialization cleanup removed at the site it described; the two remaining `TODO(handoff)` comments are consumer-adoption notes (14-09/14-10/14-02), unchanged |

## Key links

- `envelope-contract.ts → types.ts`: imports `GatewayFrame` only; `frameDefect` mirrors `RequestFrame/ResponseFrame/EventFrame` fields. Verified by typecheck (exit 0) and accepted-shape tests.
- `client.ts → connection.ts`: connection.ts is untouched; it shares `flushPending`/`handleResponseFrame` from `protocol.ts`, which now emits `GatewayError` — `connection.ts` typechecks unchanged.

## Gate summary

| Gate | Exit | Count |
|---|---|---|
| envelope-contract tests | 0 | 104/104 |
| client tests | 0 | 87/87 (65 retained + 22 new) |
| `@minion-stack/shared test` | 0 | 11 files, 380/380 |
| typecheck / lint / build | 0 / 0 / 0 | lint: 0 errors, 2 pre-existing warnings outside owned files |
| gateway snapshot `pnpm build` (DEV `e499c3f5`) | 0 | — |
| wire fixture (built client + raw ws vs built gateway, 127.0.0.1:18901, `env -i`) | 0 | 24/24 |
| `git diff --check` | 0 | — |

## Not verified / open

- No consumer (Hub/Site/Paperclip) installed or executed this client; Site's connect params are rejected by gateway DEV regardless of this client (gap 1 in SUMMARY).
- Oversized close with an in-flight call was not observed on the wire (server answered first); unit-proven only.
- ACP/shells-bridge and 11-03 receiver acknowledgment contracts are documented gaps, not implemented here.
- Old released client archives were not run against the built gateway in this slice.
