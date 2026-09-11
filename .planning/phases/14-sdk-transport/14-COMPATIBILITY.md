---
phase: 14-sdk-transport
plan: "01"
reviewed: 2026-09-11
status: source_and_artifact_matrix_local_integration_pending
requirements_completed: []
---

# Gateway compatibility and candidate identity

Site's frozen session-aware service can be paired locally with the complete clean shared archive identified below. It cannot be paired with Site's current installed client: that client lacks the authenticated-session callback on which the service depends. The proposed pairing still needs native contract and mounted-page qualification. This matrix does not approve publication, deployment, or completion of SDK-01/02.

This review read actual source, prior independent verifications, archives and installed files. It ran no tests, builds, installers, servers, registry requests or provider calls. Live file evidence is in `/tmp/minion-14-compat-ls1ca8wl/identity.json`, `installed-whole-members.json` and `production-comparison.json`. Historical execution results below retain their original scopes. Git references were read locally without fetching.

## Contract that exists

| Boundary | Actual contract | Limit |
|---|---|---|
| Gateway wire | `PROTOCOL_VERSION = 3`; JSON `req`, `res`, `event`; challenge nonce precedes a correlated `connect` request. Hub/Site submit `minProtocol: 3` and `maxProtocol: 3`. | These fields request negotiation. They do not prove client-side runtime validation of the resulting protocol or authenticated organization. |
| Handshake ownership | `GatewayClientOptions.onAuthenticated?: (hello: unknown, session: { readonly generation: number }) => void \| Promise<void>` fires once per successful current handshake, including internal reconnect. Socket-open is not authentication. Generation is local to a client instance. | Consumers must bind both the actual client object and generation; equal numbers on different clients are not the same session. `hello` remains unknown. |
| Current-session publication | Site 14-10 publishes from that callback; Hub 14-09 also exposes a private-current-session association, stable token and construction-time `gatewayUrl`. Both invalidate retired work. | Hub's token/accessor is a consumer API, not an exported shared-client capability. Site does not implement that Hub plugin API. |
| Requests and close | `request<T>(method, params?, {timeoutMs?})`; default request timeout 15,000ms, connect timeout 10,000ms. Close flushes pending requests. Reconnect does not automatically replay effects. | No `AbortSignal`/durable delivery contract is exposed by this request method. Serialization/send failures can retain bookkeeping until timeout/close (`client.ts:194`). |
| Reporting | Optional `onEventError`, `onReconnectError`, `onSocketError` contain synchronous throws and rejected promises. Qualified consumers select fixed-message sinks. | Default reporting can include raw exceptions. Site signing/connect/agents diagnostics are separate TODOs; its three sanitized hooks are not whole-service redaction. |
| Envelope and HelloOk | `HelloOk` is a TypeScript interface; response helper uses truthiness of `ok`. `handleMessage` parses JSON then reads `frame.type`. | `envelope-contract.ts` is absent. Parsed null, structural/size validation, unsupported-version rejection and server-established actor/tenant authority remain 14-01 work. No fixture counts close these gaps. |
| Binary transports | The reviewed client converts message data with `String(...)` before JSON parsing. | Do not infer Yjs/binary compatibility from these text-protocol fixtures. Preserve and qualify each actual binary consumer separately before 14-01 transport changes. |
| Durable Shells | Canonical 14-16 adds explicit `shells.invoke_durable`, required response/profile validators and bounded canonical outcome contracts. 14-14 re-exports the actual canonical runtime objects; 14-12/17 use them for a private receiver/caller implementation. | This is distinct from generic WS envelopes. Static method advertisement is not durable readiness. Sender 11-03 and executed gateway startup/end-to-end delivery remain pending. |
| Node wrapper | `@minion-stack/shared/node` imports `ws`, forwards options including callback hooks, injects constructor arguments/headers and defaults `maxPayload` to 25MiB. Browser exports do not import this entry. | Optional peer metadata means browser users can omit `ws`; Node users still require it. Payload limit at Node `ws` is not a browser envelope policy. |

Source anchors: `packages/shared/src/gateway/client.ts:62`, `:178`, `:299`, `:407`; `gateway/protocol.ts:47`; `gateway/types.ts:72`; `src/node/index.ts:6`. These known source gaps already have the 14-01/root remediation handoff; this review changes no runtime source.

## Exact shared package identities

All three archives below declare version **0.9.0**, but are different content identities. None is interchangeable with registry or currently installed 0.9.0 merely because the version matches.

| Identifier | Complete archive SHA-256 | Members and scope |
|---|---|---|
| A — 14-11 reconnect | `b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9` | 121 ordinary files. Qualified Hub/Site session fixtures use this exact archive. Predates durable contract. |
| B — 14-11 required durable contract | `f6a3c237c0264a2a8ef75906991ae8fa84504bf637d3b6655d07058582b603fa` | 125 ordinary files. Qualified gateway facade/receiver/caller use this exact archive. Includes 40 test-derived outputs and 62 maps, no README/license. |
| C — 12-08 clean emission | `d01a528579e7b0877d05565b9d3ad2747ab45610d634948f51b6a25b4bf4f756` | 44 ordinary files: 42 production JS/declarations, package.json and README. No maps/test outputs/license. Best existing bounded Site integration candidate. |

Archive locations are respectively `/tmp/minion-14-11-84XpBnCA/archives/minion-stack-shared-0.9.0.tgz`, `/tmp/minion-14-11-1ss7iase/archives/minion-stack-shared-0.9.0.tgz`, and `/tmp/minion-12-08-fa2dci45/cases/pack-root-a/minion-stack-shared-0.9.0.tgz`. All three digests and complete member lists were read again in this review.

| Entry | A/B SHA-256 | C SHA-256 |
|---|---|---|
| `dist/gateway/client.js` | `9fd0783baa97b9d64844ce1c3058966a0193f2ef8f4a148c3cc50139b119d474` | `6116b0a85d475d27780a0b641ca00da25c37598ae34f5a68f6e34ef04ae6386d` |
| `dist/gateway/client.d.ts` | `4904536794ee4d7c009e2061727afad2371ff18fa5485c993d147440007fbaf1` | `339a733252d691e84b6e985568589093ae0bf6e3585d0e5e3840ed91b1c4bf46` |

Live comparison found all **42** C production files equal to their B counterparts after removing only the final `//# sourceMappingURL=...` comment and trailing whitespace; none was raw-byte-identical. This is a narrow source/artifact comparison, not an executed consumer compatibility result. Keep exact C hashes in new acceptance assertions. Do not retain A's hardcoded client/declaration/package hashes or weaken checks to the package version.

12-08 independently exercised all five exports (`.`, `./gateway`, `./utils`, `./node`, `./brain-vector`), declaration closure, clean emission and failed-compiler/stale-output refusal. Its Node-positive control imported and constructed the wrapper with real `ws` **without connecting**. Missing `ws` produced native `ERR_MODULE_NOT_FOUND`. A real Paperclip connection lifecycle was not tested by that control. See [12-08 verification](../12-dependency-provenance/12-08-VERIFICATION.md) and [14-11 artifact verification](14-11-VERIFICATION.md).

## Source, installation and delivery matrix

| Consumer/source | Live identity and installed package | Evidence and status |
|---|---|---|
| Active canonical shared checkout | Client source `c0c492d4e03f0a26ae9afd5b9993bd66c82451f7289670cfed411344ac677666`; Shells source `c6c9397b63bdaf6a6d61ac868286bd4f59fcd3c0a8b32212ac4eb228564e7fcb`; metadata 0.9.0, old emitting build configuration. Dirty source remains separate from the release branch. | 14-08 handshake/observer source independently qualified; 14-16 durable source independently qualified. Active directory is not current merged-main package state. |
| Locally observed merged main | Local `origin/main` = `f4343b79de3d4c1cee128866041f74f3cd90a198`; package metadata 0.12.0. Client source `5c3fcc3f3ec214698b821d694d7f4586326138719e691902bad8b37f1596ae93`; Shells `dca472872ad96ed21b5645b9f07dfca2b13247203a52a17dc059fc80b3ce53da`. | Local history contains #374–378 and release version bump. Client difference against the qualified active source is reporter TODO prose only. Shells adds stricter delta/final predicates, so the entire release source is not byte-equivalent to C. No newly built 0.12.0 archive was qualified here. |
| Active Hub | Branch `feat/level-2026-07-30`, HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`; service `91e8c69ca2c717744f73bc8fb34cb48cc684c63cc369b6298b8b870de0adbaed`. Declares `^0.9.0`; installed 0.9.0 client `082e7c38fa050ceffbcb6e500b8ed2123a1856526c9cbdbad292d165280227bc`. | Lacks the new installed callback. Neither active source nor this installation represents the qualified 14-09 service. |
| Hub 14-09 private candidate | `/tmp/minion-14-consumers-61p26r_z/minion_hub`; service `50c4ac224ce35a48a9ed09c86bc8c054f60231df162bb22d246bf8fdd31f5110`; state `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03`; complete A installation. | All 121 installed members rehash exactly to A. Prior independent 58-case service qualification and paired full Hub check; component/browser work separately recorded in 14-06. Not active/deployed adoption. |
| Active Site and final private UI candidate | Active branch `dev`, HEAD `7f4c3b25679e9aaa622ad695c95069fe97d00c20`. Both active Site and `/tmp/minion-13-08-dn7zbntf/minion_site` retain service `223a2ee825f8a99e62757945299fbd62ac30cee0f73bd1ed27da6566c0c74dc1`, member state `06d7141501f00d31a864aa8330321e526d30a84bfec4030e3bb1df60253cb0ca`, and the old installed client `082e7c38…`. | UI tests qualify rendering/input, with a synthetic gateway adapter. They do not qualify UI plus the real 14-10 service. The UI candidate's ^0.9.0 declaration does not select A/B/C by digest. |
| Site 14-10 private candidate | `/tmp/minion-14-consumers-61p26r_z/minion_site`; service `fb7a2a48c0ad68870b50e25db961f9932c73f0bbc0878212cd53015dbe54b823`; unchanged member-state hash above; complete A installation. Fixture `fa0f2127427509e3e2ea574a0d3b81f97786ff4029e6136b533ce863a4244dff`; config `6beefe2ea15ac6981c2f523d2a9b451fb158006992c4931f1043b55c233a363d`. | All 121 installed members rehash exactly to A. Prior independent 22 native cases and full isolated Site check passed. Runtime runes, same-client reconnect and retired operations qualified; not yet paired with final UI/C. |
| Gateway facade/private receiver chain | Facade `/tmp/minion-14-14-profile-lz9tu2fp/minion/src/shells/shared-types.ts` `114feca04867ca80958183a10ddce35928154f34c36fceee521d30bccc5e4b28`; same facade in `~/.cache/claude-tmp/minion-14-17/minion`. Complete B installations, 125/125 members live-matched. | 14-14 facade/parser 110 cases; receiver 69; caller aggregate 127 in their independent receipts. These are different scopes, not an additive integration score. Caller raw whole-graph tsc retains five reproduced unowned diagnostics; actual startup not executed. |
| Active gateway | Branch `fix/ci-cost-remaining-gaps`, HEAD `db83e075556a28cd15b2bb8feaa602aeea0954e7`; active facade `9e0652b8b398f13f16eede58e3e3e4a2b088099308b7d713e2671481e197002c`; declares ^0.6.0, installed 0.6.0 client `624a59c8bfaa2370b27a9af5921da621838be127e935d91d411d1b7495ee794d`. | Does not contain the private canonical facade installation. Earlier receiver/plugin production delivery recorded elsewhere does not establish deployment of the new durable chain. |
| Paperclip actual gateway adapter | `paperclip-minion/packages/adapters/openclaw-gateway`; registry `server/src/adapters/registry.ts:399` registers **`openclaw_gateway`**. Its gateway-client.ts re-exports `@minion-stack/shared/node`. Declares ^0.3.0, installed 0.3.0 client `624a59c8…`; wrapper source `d587687349be8ad5d32353cc237429158805c0e84cadacba2a2faca3500be11c`. | Actual execute.ts uses `createNodeGatewayClient`, `autoReconnect:false`, explicit scopes/device signing and `connect()` promise; no onAuthenticated adoption. No new adapter/runtime fixture executed. Do not call this a currently registered `minion_gateway` adapter or infer 0.12 compatibility from type forwarding. The separate minion-drone adapter also imports the Node entry and needs its own consumer inventory before broad Node adoption. |

The old Hub/Site declaration SHA is `123346b6915c3f85661f29f2a84c4c5b1263fffe4573a352451083098f183b1b`; it has no `onAuthenticated`. Source-copying 14-10 alone would lose successful connection publication even if compilation were bypassed: that service deliberately removed publication from the initial `connect().then` path. The old client never calls the new option. Do not cast this incompatibility away.

Caret ranges below 1.0 preserve the selected minor line: `^0.9.0`, `^0.6.0` and `^0.3.0` do not automatically adopt 0.12.0. Private complete-package overrides used in earlier fixtures do not constitute a reproducible application manifest/lock transaction.

## What merged and what remains unpublished

[The 2026-09-11 resumption review](../../operations/360/RESUME-2026-09-11.md) refreshed remote PR and public registry evidence: meta PRs 374–378 merged; shared 0.12.0 and shells-bridge 0.2.0 were absent from the registry; observed latest versions were 0.11.0 and 0.1.6. Release run 34440681982 failed with npm PUT E404. Those are dated root observations, not registry checks rerun for this document. E404 alone does not establish the exact credential cause.

Clean build code and version-bump commits do not prove a published archive. The package metadata says MIT, but none of A/B/C ships a package-owned LICENSE/NOTICE. The staged 12-03 license decision records unresolved options and creates no license. Preserve that owner decision and publication gate; this matrix makes no legal attribution or permission determination. The technical local integration below does not require a registry retry and does not resolve that release gate.

The 12-08 clean packaging result supersedes the old test/map shipping defect for **C and the merged build implementation**, not for already-created A/B or active old build directories. Source maps are intentionally absent in C, so consumers cannot expect source-level debugging from that archive. No new deployed SDK identity is established here.

## Smallest coherent next local transaction: proposed 14-18

Use a **fresh ordinary snapshot** of the final Site UI, after root's complete UI check. Preserve the current UI candidate and the original 14-10 snapshot. Select archive C by its complete digest, materialize its entire verified ordinary-file tree into the new snapshot's private shared package location, and record a private override receipt. Do not alias one source file, mix declarations from A with runtime C, modify a linked package store, or update an active application. Retain C's actual metadata without pretending it is published 0.12.0.

Minimal seven-file product/fixture ownership:

1. `src/lib/services/member-gateway.svelte.ts`: exact frozen 14-10 copy. Keep the member-state/UI source unchanged unless a concrete regression requires a separately admitted amendment.
2. `src/lib/services/member-gateway.contract.fixture.ts`: preserve all 22 behavior cases; replace archive-specific expected hashes with C's exact runtime/declaration/package identities and add complete-member verification through setup receipts.
3. `vitest.gateway-contract.config.ts`: exact fixture include; native installed Vitest 3.2.6/Vite 6; explicit `envDir:false`, private cache, `127.0.0.1`, both worker bounds, `passWithNoTests:false`; no broad normal-test alias.
4. `tests/fixtures/member-gateway-parity/Fixture.svelte`: mount the actual members page. No replacement session store/accessor/connected flag.
5. `tests/fixtures/member-gateway-parity/build.mjs`: compile actual page, service, member state, installed complete client and UI components; only page data and external WebSocket/signing HTTP are synthetic. Assert and hash the actual authority modules in the emitted graph. Reuse font/license/static-manifest and network-denied build rules.
6. `tests/fixtures/member-gateway-parity/README.md`: exact contract, source/artifact identities, synthetic limits and commands.
7. `tests/e2e/member-gateway-parity.spec.ts`: actual mounted-page/real-service journeys across the qualified private browsers, with all external requests denied except owned static resources and the explicit synthetic signing response.

Setup-owned temporary files can provide the complete archive extraction manifest, private runner, strict type probe and Playwright configuration. Existing package/lock files and dependencies remain inputs. If root chooses a **manifest/lock-based install** instead of isolated complete materialization, add exactly `package.json`, `bun.lock` and a digest-named `deps/*.tgz` to the admitted transaction first, verify the native Bun offline resolution and peer graph, and treat that as a different acceptance claim. The initial seven-file slice must not silently perform that larger transaction.

Viable native runner: installed Vitest 3 still declares `testTransformMode`; retain the 14-10 explicit web transform for the Node-executed rune fixture, real Svelte plugin with `configFile:false`, browser resolution and inline Svelte. The earlier SSR transform and cross-reset static Svelte import were real fixture failures; preserve the subscriber control `[false,true,false,true,false]` and dynamic same-runtime imports. Do not obtain green results from a synthetic state model. Native config compatibility remains to be executed, not assumed from the declared option alone.

Required acceptance sequence:

1. Verify complete C membership, public runtime/declaration closure, browser resolution and unchanged UI source. Prove the old installed client is still the missing-callback negative control without installing it into the new candidate.
2. Run all preserved 22 service cases against C under the actual installed Vitest 3 compiler path, plus strict declarations. The present fixture intentionally hardcodes A hashes; changing those assertions is an identity migration, not relaxing behavior.
3. Build the new mounted-page fixture. Synthetic WebSocket must deliver challenge, correlated hello, initialization, chat events and delayed close/results through the real client; it must never set `memberState.connected` directly. Signing responses must be synthetic and contain no real user credentials.
4. Verify initial authentication makes the actual composer usable; open alone does not. Cover same-object reconnect, delayed old close/history/send, no stale UI mutation, no effect replay, current stream with empty history, reduced motion, safe error projection and manual tabs at narrow/desktop sizes. Gate screenshots on actual Barlow faces. Keep OS IME and real gateway authorization outside this claim.
5. Repeat the prior UI/native cases and full native Site sync/check with explicit synthetic public environment values. Record original and new package/member/source hashes, no unexpected network, caches and clean process teardown. Root independently reviews the frozen combined candidate.

Only after that candidate passes should root define a separate active source/archive/manifest/lock adoption. Production release additionally requires license disposition, immutable registry archive identity, consumer lock updates and real authenticated/deployed validation. Broad 14-01 envelope repair, ACP governance, Paperclip/Node lifecycle, durable sender/startup and physical-device qualification remain explicit next gates rather than hidden acceptance assumptions.

## Evidence references

- [14-08 source verification](14-08-VERIFICATION.md), [14-09 Hub verification](14-09-VERIFICATION.md), [14-10 Site verification](14-10-VERIFICATION.md).
- [14-14 facade verification](14-14-VERIFICATION.md), [14-12 receiver verification](14-12-VERIFICATION.md), [14-17 caller verification](14-17-VERIFICATION.md).
- [14-02 consumer plan](14-02-PLAN.md) retains the actual `openclaw-gateway` path; broad adapter runtime qualification is not supplied by this document.
- Final Site UI receipt: `/tmp/minion-13-08-dn7zbntf/chat-freeze/manifest.json`, SHA `4c87eb7866118704d081ff96ece8e44dfc9f1ec9058619219be50e828050b1d5`; frozen UI/native/browser results are separate from the proposed real-service pairing.

Standards review: exact hashes, preserved source/installed distinctions, no package mutation and no inferred license/release authority. Spec review: this matrix supplies the supported-combination inventory and next bounded integration seam; 14-01 runtime envelope implementation and phase-level compatibility remain incomplete.
