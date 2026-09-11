---
phase: 14-sdk-transport
plan: "04"
status: source_verified_pending_root_review
requirements: ["SDK-01", "SDK-02"]
---

# 14-04 plugin bridge foundation

The admitted source slice rejects wrongly sourced/malformed messages before privileged forwarding, requires a supported handshake, applies explicit legacyv1 compatibility, and cleans disposed/failed requests. Exact plan SHA-256 `01dc016b8c79c95eb15f74680ad12c81ea4ee77b9ae817933f27334dde7400ce`. Task1 packet before source admission SHA-256 `ab9ba7c2730d4aaf3cf569e916e84b39fc31f59904bf4c3dba45ad28832b501b`.

## Validation

| Command / check | Result |
|---|---|
| Hub real-peer test before source changes |5 failed /8 passed; confirmed five actual boundary defects |
| Gateway package: `pnpm exec vitest run --config vitest.contract.config.ts src/index.test.ts` |24/24 passed |
| Gateway package: `pnpm run typecheck` |Passed |
| Gateway package: `pnpm run build` |Passed; package-local only |
| Hub: `node node_modules/vitest/vitest.mjs run src/lib/plugins/bridge-protocol.contract.test.ts src/lib/plugins/bridge-host.test.ts src/lib/plugins/compat.test.ts --maxWorkers=1` |51/51 passed across3 files; final focused run1.07s |
| Gateway and Hub scoped `git diff --check` |Passed |
| Full Hub `bun run check` |Not run by executor; source frozen and root asked to serialize it |
| Browser, mounted extension UI, live gateway, npm registry, package installation |Not performed; outside admission |

An initial test invocation used the wrong working directory and found no test file. It was corrected before the recorded red suite; that invocation is not counted as validation.

The final suite distinguishes source, built candidate and installed baseline. Each has ordinary and opaque modes plus both handshake orderings, with actual class RPC/save/theme/locale exchange. The installed baseline still accepts a correct-origin wrong-source hello; the candidate rejects it. Baseline entry SHA `d92bb9daff3f6e56205c41d6aa6e645ec1d2a47e82aa074329d5905dde728a5c` remains in untouched Hub node_modules. Built candidate entry SHA `4f28fc96e03aefe77d29c21aa25d12b8fc10e43db399526e51796553ffb3a768` now backs seven local gateway workspace links. Neither proves deployed/bundled consumer adoption.

## Scope and reviews

Standards self-review: confined to the eight admitted code/test files and owned matrix/summary; no new public protocol frame/export, dependency, lock, browser, network operation or commit. Message guards use actual field checks; no `any` or `@ts-nocheck` added. Normal and sandbox identity policies are explicit. New fixtures exercise real classes and structured cloning, not a mocked protocol. Formatting ran only against owned code/tests.

Spec self-review: selected omitted-onlyv1, strict major/CalVer grammar, constrained unknown denial, handshake gating, source/origin checks, correlation and disposal are implemented with local evidence. Exact generic error-projection, method authority, browser navigation, component pre-capability mounting and artifact peer/generator behavior remain outside the foundation. No universal timeout or full compatibility claim was added. Root independent review is pending; this self-review is not that receipt.

No UI component, gateway manifest/loader, artifact HTML/prompt, package manifest/lock or installed Hub package was edited. Owned TODOs reference the root-owned proposal `proposals/2026-09-08-platform-qc-remediation.md` and the matrix. Mandatory child/runtime/release gates keep SDK-01/02 and the broader360 operation open.

## Frozen files

Before hashes and consumer inventory are in `14-PLUGIN-BRIDGE-MATRIX.md`. After hashes:

| File | SHA-256 |
|---|---|
| `minion/packages/plugin-ui-bridge/src/index.ts` | `020d8c8ede87f547dab7d462ff58b3df2aeb33bf1171d353d72b3c5ffdaa4b3e` |
| `minion/packages/plugin-ui-bridge/src/index.test.ts` | `d66bc599876347d75f0e2e6581a7056e3b2143e3f0b66c9392a3fc3f4ce00c4e` |
| `minion/packages/plugin-ui-bridge/vitest.contract.config.ts` | `c054ced414e3198efec4f2975b95de18d2ce2bec6c6f5eee82305d684641d5d7` |
| `minion_hub/src/lib/plugins/bridge-protocol.ts` | `0c34a52b74ca0d194411dd630d31cf1b80218cec9a3ebfd20629eb4672d04596` |
| `minion_hub/src/lib/plugins/bridge-protocol.contract.test.ts` | `7b4f021da5b2dfa0487682619bac4d8a6968e7ec33bd0b6f0958b73a5b6d3d90` |
| `minion_hub/src/lib/plugins/bridge-host.test.ts` | `a2d50ce01068e092b4a6e5884b7e7e49b67fc7961478a9924f1dfaaf267fc850` |
| `minion_hub/src/lib/plugins/compat.ts` | `935a3ce25df11929c2e04de8a4b4a45fe6a724f5dd9ee841cd0a6788cf44f290` |
| `minion_hub/src/lib/plugins/compat.test.ts` | `e3374a924f834d914f59e95846acde78d182b12426f36d35cca4e72bcc937781` |


## Request identity amendment — local execution receipt, 2026-09-09

Admission: `14-04-PLAN.md` SHA-256 `f8dffd9e17761fbe7af177dd26b3e13ae2d6387e1e31e996482697f99677d444`; selected request-identity portion of `14-ARTIFACT-REUSE-AMENDMENT.md` SHA-256 `daa02905ed86fcf05348410e4468f233651682ef9e93c450bca1a7cfbc8de2da`.

The reopened implementation is confined to the package bridge source, its unit tests and the Hub real-peer contract test. RPC IDs now combine a lazily allocated private namespace from 16 native `crypto.getRandomValues` bytes with an instance sequence that rejects exhaustion at the safe-integer limit. The native call retains its Crypto receiver. Missing or throwing entropy produces the fixed local error `secure randomness unavailable`, without native detail, cause, weak fallback or a public injection option. Allocation precedes pending insertion and posting. A disposal recheck after allocation prevents a reentrant native test stub from posting after disposal. This is collision resistance; source/origin validation and privileged host authorization remain separate controls. No protocol frame, exported option, timeout, package version or lock changed.

Before changing the source, the actual Hub HostBridge and two successive actual PluginBridge instances shared the same opaque child window and parent window, with a frozen clock and distinct deterministic native entropy. The first forwarded RPC remained unresolved through disposal. Its eventual response incorrectly resolved the successor's call with `{ lifetime: 'old' }`: the targeted RED invocation failed on the assertion that the successor had not settled (1 failed, 21 unselected). With the fix, the same test runs against source and emitted candidate. Both requests forward independently, the old response leaves the successor pending, and only the successor's response resolves it. No test implements its own protocol correlation.

| Check | Actual result |
|---|---|
| Package `pnpm exec vitest run --config vitest.contract.config.ts src/index.test.ts` | 30 passed; includes native absence, native throw with sanitized error and retry, lazy single allocation/receiver/16-byte size, last safe sequence/exhaustion, and disposal during entropy |
| Package `pnpm run typecheck` | Passed |
| Package `pnpm run build` | Passed; existing local TypeScript build only |
| Hub `node node_modules/vitest/vitest.mjs run src/lib/plugins/bridge-protocol.contract.test.ts src/lib/plugins/bridge-host.test.ts src/lib/plugins/compat.test.ts --maxWorkers=1` | 53 passed across 3 files, 520 ms reported duration |
| Scoped gateway and Hub `git diff --check` | Passed |
| Full Hub check | Executor did not run; source frozen and root asked to serialize |
| Browser/BFCache, artifact generation, mounted extension, publication, deployment | Not performed; separately gated |

Previous candidate and installed-baseline **bytes**, including each complete dist directory and package manifest, were copied before building to `/tmp/minion-plugin-bridge-before-identity-yr2fkb5z/`. `sha256.json` in that directory records each copied file. This is a local temporary review artifact, not a durable release archive. The prior emitted candidate JS remains available there at SHA `4f28fc96e03aefe77d29c21aa25d12b8fc10e43db399526e51796553ffb3a768`. The Hub installed baseline JS and package manifest remain unchanged at SHA `d92bb9daff3f6e56205c41d6aa6e645ec1d2a47e82aa074329d5905dde728a5c` and `8493506e66d30f765616173f5e09cb40a18b0e5115a35b0234f529bfa3d45e8a` respectively. Its existing expected-vulnerability test is evidence against deployment acceptance, not qualification.

| Frozen file / artifact | SHA-256 |
|---|---|
| `minion/packages/plugin-ui-bridge/src/index.ts` | `7bfe17c603ff5e461f5cc2dfbe8a6fb4c0d08efc2eca4d838f33116bb6af0676` |
| `minion/packages/plugin-ui-bridge/src/index.test.ts` | `fe9e12d8126e884ef2ffe056ac445ba7289dfe7ad5028931627b1f58fe4bfe3e` |
| `minion_hub/src/lib/plugins/bridge-protocol.contract.test.ts` | `c0c8e9cb7693631eee14278fbb6abb1cce098af501d53a638a280a6e48a93266` |
| New local candidate `minion/packages/plugin-ui-bridge/dist/index.js` | `d0d9a106ee9a9abfa7c77b24603158f9e28a5c1773430f12f08430bbc3585b82` |
| Unchanged candidate package manifest | `9cff62650ae812b1a9b934129a8fd9e713e34c5afcda2e40819cc7f7160a8aa0` |

The package-local Vitest configuration, Hub HostBridge implementation/tests and compatibility implementation/tests retain their preceding frozen hashes. Tests retain ordinary/opaque ingress, handshake orderings, omitted-only legacy v1 and the prior malformed/source/lifecycle cases. Native entropy is stubbed only at the native global test boundary; no production test hook was added. Native browser availability and persisted-page behavior still require the later browser qualification. Root selected a fresh persisted-pageshow lifetime for 14-07; this receipt does not admit or implement its adapter, generator, fixture or browser work. Existing source TODOs and the proposal's “Plugin consumer gates beyond the 14-04 foundation” section retain those open gates. SDK-01/02 remain open.

Standards self-review: the three reopened files and receipt appends are the complete authored scope; no install, network, runtime state mutation or dependency addition. Spec self-review: the selected native namespace, failure handling, nonwrapping sequence and actual late-response regression are implemented. Independent review remains root-owned.

## Root correction and independent final identity acceptance

Independent review found a synthetic reentrant entropy hook could consume the last safe sequence before the outer call incremented it. This is a hook-boundary regression, not a demonstrated real-browser exploit. Root added an actual nested-call fixture: before repair its outer result was `resolved` instead of `RPC sequence exhausted` (one focused failure, 30 unselected cases). A second safety check immediately before increment repairs it without changing public API or transport authority.

Final package suite: 31/31, typecheck and build pass. Independent verification repeats 31 package + 53 Hub cases (84 total) and typecheck, and closes finding ID14-04-IDENTITY-1. Logs `/tmp/minion-14-04-root-final/` and `/tmp/minion-14-04-identity-corrected-independent-*.log`. Prior candidate/finding receipts remain retained.

Final source `src/index.ts`: `cd8380839105f35ee996a5d6e893f87a3dd676616b4c2be9c827f55b150e4862`; tests: `f1a52af6d511200f5862bcea634e5a50c8d3fe37587e141d04a3e16bcd332e90`; emitted entry: `4f7bd0418fdf85d8a3206cab1c9f3db767de7dc5745a93fbb73b6ab110a098d6`. Hub contract remains `c0c8e9cb7693631eee14278fbb6abb1cce098af501d53a638a280a6e48a93266`; other foundation sources and installed Hub baseline are unchanged. Root selects this entry for subsequent 14-07 generation. Aggregate Hub validation will be scheduled with that consumer change; prior full-check receipts retain their original snapshots.
