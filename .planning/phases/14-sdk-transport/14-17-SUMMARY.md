---
phase: 14-sdk-transport
plan: "17"
status: private_candidate_frozen_for_independent_review
requirements-completed: []
---

# Durable caller publication, strict configuration and owned store lifecycle

Two authorized caller methods (`shells.invoke_durable`, `shells.get_outcome`), a strict
`gateway.shells.durability` selector and an owned startup-open/shutdown-quiesce-close lifecycle now
exist in the private candidate `~/.cache/claude-tmp/minion-14-17/minion`, copied from the qualified
14-12 receiver candidate. Receiver semantics are unchanged, nothing is adopted into the active
checkout, and no requirement closes.

Plan `e0ecdbb34de31a87514eea68c545fb46148d5208c1d10967498bdeb8ebffc93a` was executed. All thirteen
frontmatter files were owned and no fourteenth source file was written; two structural seams are
reported below.

## Frozen owned sources

| File | Before | After |
| --- | --- | --- |
| `src/gateway/server-methods/shells.ts` | `8ab33a7e…` | `4e57322e5b6d19c0202e04917ef521c96d74518e726e03449bc3e86744078575` |
| `src/gateway/server-methods/shells.test.ts` | `a975c6ec…` | `69414588bd7b4e42e84622e01b126b0a3c27be45baf07efca4622a40fe289c98` |
| `src/gateway/server-core/server-methods.ts` | `a6076749…` | `94e983767121c250df97481d4e247136fd993ba5df7a2b8ba21bd3f60803e401` |
| `src/gateway/server-core/server-methods.test.ts` | `f63e5e33…` | `3e809fd0e8f255ba2a23737b82444a7a68c2df0ed89959a001f26880d4978d3a` |
| `src/gateway/server-core/server-methods-list.ts` | `dfb4cc2c…` | `8ccb3b4e29b8ee26edc926a55871fbef7078225db67cee4ae873bf864ec2c5be` |
| `src/gateway/server-core/server-methods-list.test.ts` (new) | — | `942c92a28483a555577da9c8fc26179723e5e23a29b2d5d8398821f0adc3f1ca` |
| `capabilities.json` (regenerated) | `6a8ac5e9…` | `84d4387d63a0b0142e9db14c2019675c40a1d7829e233b9ad19c54ad54929963` |
| `src/config/types.gateway.ts` | `c8d1701f…` | `5e3ea72acb7f24c918556e14e3d56a0486cc5ebe05ad90dcb9a36043b667e48c` |
| `src/config/zod-schema.ts` | `80720521…` | `9a2e93cf8ec1d7f05a003d1cde296b73d365b9de3b5a6c0a77c400f00ec62c93` |
| `src/config/config.schema-regressions.test.ts` | `534aed6e…` | `cf87fe51d49cca0c1f73c01efbe7582266902f36ebbe081da0095db804854d31` |
| `src/gateway/server.impl.ts` | `42f1902e…` | `c9666f5f7d2b7f3bd0e78cf07fa0e1e199e3606f74d5c2bde0caa1db5eeae876` |
| `src/gateway/server-core/server-close.ts` | `3e440c39…` | `7da964d30ec2a09f41db86d58780f30b08564a63643abfd9223718f64236a3f2` |
| `src/gateway/server-core/server-close.test.ts` | `07244bda…` | `abd7f0ae6a34c172ffbcfe975c16d6c011c6c381c3bd05eabb7f177582250cfc` |

`capabilities.json` was produced only by `node --import tsx scripts/generate-capabilities.ts`
(159 → 161 methods); it was never hand-edited.

Receiver and facade inputs are byte-identical before and after: `run-store.ts` `fe5181fb…`,
`manager.ts` `5543ffdc…`, `bridge-ws.ts` `e7f30b92…`, `shared-types.ts` `114feca0…`,
`invoke-contract.ts` `b69a8256…`, plus all five receiver/facade test files.

## Package, runtime and setup identity

Runtime and declarations resolve to the same private complete `@minion-stack/shared` 0.9.0 the
14-12 candidate recorded (`package.json` `e1610bed…`, `dist/gateway/shells.js` `2487c9fb…`,
`dist/gateway/shells.d.ts` `007ea18a…`); 101 read-only dependency links resolve unchanged. Node
`/usr/bin/node` v22.23.2, TypeScript 5.9.3, oxlint 1.48.0 with tsgolint 0.14.2, oxfmt 0.51.0,
vitest 4.1.10, zod 4.4.3.

The loopback network guard `qc-receiver-network.mjs` is byte-identical to 14-12
(`196ef2298a8b00e18fc720d6a1d8bf08dea118f835132d02b845c05eb7206ef9`). The runner
`qc-run-caller.mjs` and config `qc-caller.config.mjs` are the reviewed 14-12 runner/config with only
the selected-file list, the config filename and the receipt tag changed. The executor additionally
added `qc-types-gate.mjs`, `qc-types-baseline.json` and copied `scripts/generate-capabilities.ts`
from the active checkout (unmodified, `890c14e0…`) because the capability artifact cannot be
regenerated without it.

## Effective commands and results

cwd = the candidate, `env -i PATH=/usr/bin:/bin HOME=<candidate> LANG=C.UTF-8` (the lint lane adds
the pinned `@oxlint-tsgolint/linux-x64` directory to PATH).

| Command | Result |
| --- | --- |
| `node qc-run-caller.mjs` | exit 0 — **127/127 passed**, 0 skipped, 0 unhandled, 27.6 s. shells 27, manager 40, run-store 16, bridge-ws 13, server-close 8, config-regressions 8, methods-list 4, server-methods 11. Collected set equals the selected set. |
| `node qc-types-gate.mjs qc-types.json` | exit 0 — **0 diagnostics attributed to any owned or receiver file**; raw `tsc -p qc-types.json --noEmit` exits 2 with 5 pre-existing structural diagnostics in unowned files |
| `node node_modules/oxlint/bin/oxlint --type-aware --tsconfig=qc-types.json <12 owned .ts>` | exit 0 — 0 warnings, 0 errors, 134 rules |
| `node node_modules/oxfmt/bin/oxfmt --check <12 owned .ts>` | exit 0 — all files correctly formatted |
| `node --import tsx scripts/generate-capabilities.ts --check` | exit 0, 161 methods |

Vite/Vitest cache resolved to the asserted private `qc-cache/vitest/da39a3ee…`; `TMPDIR` was
`qc-db/`, empty afterwards. The guard recorded 32 `listen` and 26 `connect` calls (shells 13/5,
bridge-ws 13/21, server-close 6/0), **0 denied**, residue `openServers 0, allowedPorts 0,
openClients 0`. The capabilities drift check was proven meaningful: restoring the pre-edit artifact
made `--check` exit 1, regenerating restored exit 0.

Meaningful red preceded green. Two authored assertions were wrong and the qualified parser corrected
them: a caller-supplied `params.orgId` is not silently dropped — `ownData` copies every own
enumerable key into the strict envelope, so the canonical validator **refuses** the request with
`INVALID_SHELL_OUTCOME`. The tests now assert the refusal and separately assert that the
authoritative organization argument stays the connect-derived one on every such call. A fixture
HTTP server that never listened also failed shutdown ordering until it was given a real owned
loopback listener.

## Authority and lifecycle boundaries

- **Caller methods.** Both handlers take their names from `SHELLS_METHODS` through the 14-14 facade.
  `shells.invoke_durable` gates on `requireAdmin` then `requireOrgScope`; it is deliberately absent
  from `READ_METHODS`/`WRITE_METHODS` so `authorizeGatewayMethod`'s terminal
  `missing scope: operator.admin` fallthrough governs it, and the local check is belt-and-braces.
  `shells.get_outcome` gates on `requireOperator` then `requireOrgScope` and joins `READ_METHODS`.
  Both pass raw `params` to the manager and the organization separately; no local `asString`/
  `asObject` pre-parsing, no byte/Unicode rules copied, no `ShellAdmittedInvoke` built here.
- **Organization.** Only `client.orgId` is ever read. An admin-scoped shared-token session with no
  connect-time organization is refused `organization context required` for BOTH methods before
  `ensureMgr` and before any manager call; so is a client that never completed connect. A
  params-supplied `orgId` — foreign, own or empty — is refused by the canonical envelope, and the
  manager's organization argument is `org-a` on all three attempts. A run admitted under `org-a` is
  `unresolved` to `org-a` and `not_found` to `org-b`.
- **Effective query authority** is the intersection of two gates and the narrower wins: an
  `operator.read`-only session passes the D360-15 ladder but is refused `operator role required` by
  the handler's PRE-EXISTING shells-wide `requireOperator` check, unchanged by this child.
  `["operator","operator.read"]`, `["operator","operator.write"]` and `["operator.admin"]` are
  accepted; `["operator"]` alone is refused `missing scope: operator.read`; the `node` role and every
  non-admin scope are refused on `shells.invoke_durable`.
- **Error surfaces.** `ShellsDurableError` maps `unavailable`/`forward_failed` → UNAVAILABLE,
  `unauthorized` → FORBIDDEN, `conflict`/`invalid` → INVALID_REQUEST, carrying only the fixed
  `SHELL_DURABLE_<code>` text; canonical validation carries only `INVALID_SHELL_OUTCOME`; anything
  else collapses to one fixed refusal. A malformed bridge response was asserted to carry no prompt
  text, no `SELECT`/`INSERT`/`sqlite` substring and no credential. A foreign run and an absent run
  return equal payloads on the same code path.
- **No downgrade.** Required mode refuses legacy `shells.invoke` and the refusal is surfaced, not
  retried; a failed `shells.invoke_durable` never touches `manager.invoke`. Disabled mode answers
  `SHELL_DURABLE_unavailable` for both new methods while legacy invoke still runs.
- **Configuration.** `durability?: {mode:"disabled"} | {mode:"required",storePath?,maxRuns?,
  maxRunsPerOrg?}` is a strict discriminated union inside the still-`.strict()` shells object.
  Twenty-two refused shapes are asserted, including a bare boolean, a missing/unknown/boolean/numeric
  `mode`, an unknown sibling, `storePath` on a disabled selector, zero/negative/fractional/unsafe/NaN
  counts, `maxRunsPerOrg > maxRuns`, and relative/`..`/trailing-slash/`./`/empty paths. Absence is
  always disabled; no input produces required mode by default. Defaults 4096/1024 and the default
  path `<stateDir>/shells/outcomes.sqlite` are applied by the pure
  `resolveShellsDurabilityStoreOptions`, which reads no environment and opens no file.
- **Startup.** `ShellRunStore` is constructed from that resolver **before** the access relay and the
  manager, and deliberately OUTSIDE the existing `[shells] manager init failed` catch, so a required
  store that cannot be opened fails gateway startup loudly with nothing half-initialized. The manager
  receives `{mode:"required",store}` only when the process actually opened one, otherwise
  `{mode:"disabled"}`. A required-mode failure inside the catch tears down the relay and the store
  and rethrows; disabled mode keeps today's tolerant behavior exactly.
- **Shutdown.** `createGatewayCloseHandler` gained an injected
  `shellsDurability?: {quiesce, close}` — a hook, never the manager — called after the client/bridge
  socket close pass and before the HTTP servers finish closing, `quiesce` then `close`, each
  contained so a throw cannot abort the rest of shutdown. Asserted: exact ordering against a real
  loopback HTTP close, close never without quiesce, exactly one close per shutdown, unchanged
  shutdown when no receiver was injected, and — with a real manager over a real native store — that
  a durable query and a durable admission entering after quiesce are both refused
  `SHELL_DURABLE_unavailable` rather than touching the closed store, that a forward settling after
  shutdown performs no store access, and that a second close is a no-op.
- **Readiness.** No health or status surface gained a durable-ready field. `BASE_METHODS` membership
  is documented and tested as an implementation claim only: the same process that advertises both
  methods answers UNAVAILABLE while durability is disabled.

## Two structural seams (reported, not worked around)

1. **`server.impl.ts` cannot be imported or executed in this snapshot.** The credential-free copy
   omits `extensions/`, and `server-methods/alerts.ts` fails to resolve
   `../../../extensions/alert-watcher/src/*`. Startup ordering is therefore **not executed
   in-process** here. Mitigation inside the thirteen files: the decision (defaults, absolute-canonical
   path, disabled-by-absence) lives in the pure, fully tested
   `resolveShellsDurabilityStoreOptions`, leaving `server.impl.ts` with only construction order,
   injection, the rethrow and the teardown binding — reviewed as source, and type-checked with zero
   diagnostics of its own. Executing gateway startup remains a root-owned gate.
2. **A whole-graph `tsc` cannot exit 0 in this snapshot.** Two directory symlinks
   (`extensions/alert-watcher/src`, `extensions/voice-call/src` → the active checkout, read-only)
   were added so the REAL dispatcher could be imported and type-checked at all; without them
   `server-methods.test.ts` and `shells.test.ts` fail to collect. Five diagnostics remain in unowned
   files (`pty-ws.ts`, `supervisor/adapters/pty.ts`, `web/qr-image.ts` TS7016; `media/input-files.ts`
   TS2353). `qc-types-baseline.json` compiles ONLY those four untouched files and reproduces exactly
   the same five diagnostics, proving they are pre-existing. `qc-types-gate.mjs` fails on any
   diagnostic attributed to an owned or receiver file; there are none.

## Integrity and cleanup

4,624 unowned snapshot inputs, the private shared package and all 101 dependency links rehash
**unchanged**. Only the twelve owned TypeScript files and `qc-types.json` drifted; seven files were
added (`capabilities.json`, the new `server-methods-list.test.ts`, four setup files and the copied
generator script). Nothing in the active checkout was written: `git status --porcelain` over all
thirteen owned paths plus `src/shells/` and `scripts/` is unchanged from session start. `qc-db/` is
empty, every fixture directory and socket was closed and removed, and the stray
`.minion/agents/main/agent/auth.json` that the full handler-graph import creates under
`HOME=<candidate>` (literal `{}`, no credential) was removed. Receipts:
`~/.cache/claude-tmp/minion-14-17/checks/freeze.json`, `tests.log`, `types.log`,
`types-baseline.log`, `lint.log`, `format.log`, `capabilities.log`, `integrity.json`.

## Handoffs and what is not claimed

Exact-site `TODO(handoff)` comments were added on `shells.invoke_durable` (sender 11-03 does not call
it; `packages/shells-bridge` still mints its own run id and emits a transient `shell.final`, so no
terminal is durably recorded end to end; production enablement is a separate gate), on
`shells.get_outcome` (static capability floor is not a live readiness claim), in `zod-schema.ts`
(retained-count operational sizing and production enablement) and in `server.impl.ts` (production
enablement, the image/runtime identity that actually carries the supported `node:sqlite` builtin, and
untested process/power-loss recovery). All point at
`proposals/2026-09-08-platform-qc-remediation.md` (`29fa2b33…`, Shells lifecycle), which root owns.

Not implemented and not claimed: sender 11-03, ACP or restore integration; executed gateway startup
or a live gateway; production enablement or any deployment; `minion/package.json` /
`minion/pnpm-lock.yaml` / dist / image adoption; process, driver or power-loss recovery; any health
or status readiness surface; and the loopback bridge fixture proves protocol behaviour on
127.0.0.1 only, not a network deployment.

Dependency order remains 11-07/09-06 → 14-16 → complete shared artifact → 14-14 facade → 14-12
receiver → **14-17 caller routing, configuration and lifecycle** → sender 11-03, with immutable
package and image adoption separate. Root owns independent verification, adoption and global records.
**SDK-01, SDK-02 and AGT-04 remain open.**
