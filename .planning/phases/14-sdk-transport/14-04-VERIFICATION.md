---
phase: 14-sdk-transport
plan: "04"
status: scoped_pass_broader_requirements_pending
reviewer: jobs_fencing_execute
requirements: ["SDK-01", "SDK-02"]
---

# 14-04 independent verification

Independent review passes the admitted bridge foundation. No blocking defect was found in the selected source boundary. This receipt does not accept installed-package adoption, mounted browser behavior or SDK-01/02 closure. The preserved installed package still accepts a correct-origin hello from the wrong source window; the suite explicitly reproduces that residual.

## Reviewed identities

Reviewed root instructions, gateway `AGENTS.md` and `.dmux-hooks/CLAUDE.md`, Hub `CLAUDE.md`, the selected plan, matrix, actual package/Hub bridge code and tests, compatibility utility, package configuration and selected consumer sites. All eight source/test/config hashes in the frozen SUMMARY matched the working files after independent test execution.

| Artifact | SHA-256 |
|---|---|
| Admitted PLAN | `01dc016b8c79c95eb15f74680ad12c81ea4ee77b9ae817933f27334dde7400ce` |
| Reviewed SUMMARY | `498b0279a822b1c5ff9aeddbbd9d11a95e6ce1445fd112e658ca3b86ee11c4c0` |
| Reviewed matrix | `b2100d332b48c996efaed913328f30d1e978157c815d4c951185ff9835952551` |
| Gateway package source | `020d8c8ede87f547dab7d462ff58b3df2aeb33bf1171d353d72b3c5ffdaa4b3e` |
| Hub host source | `0c34a52b74ca0d194411dd630d31cf1b80218cec9a3ebfd20629eb4672d04596` |
| Existing candidate `minion/packages/plugin-ui-bridge/dist/index.js` | `4f28fc96e03aefe77d29c21aa25d12b8fc10e43db399526e51796553ffb3a768` |
| Preserved Hub installed `@nikolasp98/plugin-ui-bridge/dist/index.js` | `d92bb9daff3f6e56205c41d6aa6e645ec1d2a47e82aa074329d5905dde728a5c` |

The candidate and installed artifacts retain package version 0.4.0. Different entry bytes matter: the package version alone cannot establish which behavior a consumer executes. Existing dist was hashed and imported without rebuilding it.

## Independently executed checks

Commands ran sequentially with an environment allowlist containing only inherited `PATH`, `HOME` and `LANG`; no application environment or live connection was used. Each child had a 120-second watchdog and exited normally.

| Working directory / command | Observed result |
|---|---|
| `minion/packages/plugin-ui-bridge`: `pnpm exec vitest run --config vitest.contract.config.ts src/index.test.ts` | 24/24 passed, one file, 411 ms reported duration, exit 0 |
| Same: `pnpm run typecheck` | `tsc --noEmit`, exit 0 |
| `minion_hub`: `node node_modules/vitest/vitest.mjs run src/lib/plugins/bridge-protocol.contract.test.ts src/lib/plugins/bridge-host.test.ts src/lib/plugins/compat.test.ts --maxWorkers=1` | 51/51 passed, three files, 965 ms reported duration, exit 0 |
| Scoped gateway and Hub `git diff --check` for the eight frozen code/test/config files | Passed |

No skipped test was reported. The Hub total consists of 21 contract/byte cases, six mounting-helper cases and 24 compatibility cases. Logs are local evidence:

| Log | SHA-256 |
|---|---|
| `/tmp/minion-14-04-independent-package-tests.log` | `13c3cd115c49efde053e00bcdb3b8f73e34ad6eecd8f21cc2a61eecfda943cae` |
| `/tmp/minion-14-04-independent-package-typecheck.log` | `1d18076ec072902744c150c31f810083a56e13c1e579acc4e3baa7514bb02498` |
| `/tmp/minion-14-04-independent-hub-tests.log` | `f4cece210fe6d5b81359938ea302a4af91cabf05d0b9be6b63714468b848d962` |

## Standards review

The paired-window fixture imports the actual gateway source PluginBridge, existing built candidate, preserved installed PluginBridge and actual Hub HostBridge. Its transport performs structured cloning and queued delivery, with explicit sender/source and origin identities. This is meaningful class interoperability evidence; it does not simulate real browser navigation or prove sandbox enforcement by Chromium.

Origin/source checks occur before shape handling. Shape guards exclude null/arrays, validate IDs, methods, boolean flags, finite nonnegative resize, theme/tokens/locale and error fields. Valid version omission is distinguished from an explicitly present undefined/null/string/unsupported version. The package-local test config selects the otherwise separately discovered package suite. Review found no new dependency, public frame/export, unsafe type escape or unrelated implementation expansion in the frozen slice.

## Selected behavior review

| Requirement | Evidence and conclusion |
|---|---|
| Ordinary exact origin and source; no wildcard authority | Package and Hub guards require both. Negative fixtures exercise wrong origin, same-origin wrong source and wildcard package configuration. Denied host requests reach zero forward calls. |
| Explicit opaque mode | Hub requires the known window and `origin === null`; outbound wildcard remains necessary for that peer. Ordinary-origin and unrelated-window attempts are denied. This is a protocol fixture result, with browser qualification pending. |
| Supported handshake before privileged RPC | Hub requires both accepted ready and sent hello. Package requires accepted host v1. Invalid ready/hello versions cannot establish that state; omission retains selected legacy v1. |
| Supported ordering and buffered state | Candidate source, candidate dist and installed baseline each pass ordinary/opaque mode with both ready/hello orderings. Latest theme/locale, hello, real RPC exchange and save reply traverse the actual classes. |
| Correlation and cleanup | Invalid/unknown/duplicate responses do not complete pending work. Save results require an outstanding ID and are consumed once. Duplicate in-flight RPC IDs forward once; forwarder rejection and uncloneable result receive correlated failures. This is not durable mutation idempotency. |
| Disposal and synchronous failure | Package clone/post exceptions remove pending entries; disposal rejects pending/new calls and removes listeners. Hub refuses new save work and drops asynchronous forwarding replies after disposal. These guarantees do not cancel an already executing gateway operation. |
| Compatibility grammar | Positive integer bridge majors and validated numeric CalVer comparison enforce the selected policy. Unknown constrained gateway version and absent required methods deny at the utility boundary; unconstrained legacy passes. No SemVer range support or universal request timeout was invented. |
| Public package HostBridge | The retained legacy stub has exact origin/source validation, guarded frames and disposal. Its original behavior tests plus wrong-source regression pass; it is not the production RPC forwarder. |

## Mandatory remaining gates

These are recorded in the matrix, owned-site TODO comments and root proposal `proposals/2026-09-08-platform-qc-remediation.md`, section “Plugin consumer gates beyond the 14-04 foundation”. They remain outside this source acceptance:

- Installed baseline ingress remains vulnerable to the tested wrong-source hello. Source and local dist repairs must be deliberately adopted and qualified in actual consumer bundles; no registry, installation, release or deployment change occurred here.
- `PluginIframe.svelte` still initially permits constrained mounting before capability loading. Its actual mount forwards gateway URL/token in hello. Compatibility utility tests neither repair that lifecycle nor establish method/token authority. Existing comments that claim the plugin never sees the token are not evidence of isolation; the matrix already records the contradiction.
- Gateway manifest normalization and response projection, seven extension mounting paths and wildcard fallback behavior, three handwritten artifact peers, the generator template and previously stored artifact HTML need their selected child checks. No stored artifact was inspected or changed.
- Real browser source/window behavior, opaque sandbox behavior, navigation/remounting, consumer adoption and gateway interoperability remain unverified. The ArtifactHost source supplies empty gateway credentials and restricts its forwarding method, but it was not mounted in this review.
- Operation-specific cancellation/timeouts, backpressure and safe RPC error projection remain open. Existing generation/edit operations permit 180 seconds, so this slice correctly avoids a blanket short timeout. In-flight suppression alone does not provide replay protection.
- Aggregate current-source Hub checking belongs to root and is not claimed by this focused receipt. No full Hub check, build, browser, network, install or product-file mutation was performed by this reviewer.

This review wrote only this verification file. SDK-01/02 and the broader 360 operation remain open while their mandatory consumer and transport gates are pending.


## Full Hub source check

Root ran a fresh 2,417-file Hub snapshot plus six exact sibling plugin source/dist files, preserving relative cross-project imports. No application .env was copied; the subprocess environment contained only PATH, LANG and empty public PostHog bindings. Existing installed Hub dependencies were used without mutation. Snapshot `/tmp/minion-360-check-14/snapshot.json`, SHA-256 `c0d281de08c70c0dc70eea68fa2ad74fc51cfe06f4f2a9c6c7c79eba9170e458`; `bun run check` exited 0 with zero errors and zero warnings. Log `/tmp/minion-360-check-14.log`. This covers the frozen plugin source and preceding Hub changes; it is not a package installation or browser/release certificate.


## Request-identity amendment independent review — correction requested

This append preserves the preceding foundation receipt. It reviews amended PLAN `f8dffd9e17761fbe7af177dd26b3e13ae2d6387e1e31e996482697f99677d444` and request-identity packet `daa02905ed86fcf05348410e4468f233651682ef9e93c450bca1a7cfbc8de2da`. Reviewed SUMMARY identity is `6390935b3d3f1908841916b401f3621dd87641fcab914be873c1e604b04bfbc7`; matrix is `19f419747849142b34d3467da8fad07c01cc3916843cf28871768ba7e732bbd4`.

The ordinary same-window successor defect is repaired in the reviewed source and emitted candidate. One additional synthetic reentrancy/sequence boundary needs a small correction before accepting this amendment's complete nonwrapping contract. This finding is not a demonstrated native-browser exploit.

| Reviewed input | SHA-256 |
|---|---|
| Package `src/index.ts` | `7bfe17c603ff5e461f5cc2dfbe8a6fb4c0d08efc2eca4d838f33116bb6af0676` |
| Package `src/index.test.ts` | `fe9e12d8126e884ef2ffe056ac445ba7289dfe7ad5028931627b1f58fe4bfe3e` |
| Hub `bridge-protocol.contract.test.ts` | `c0c8e9cb7693631eee14278fbb6abb1cce098af501d53a638a280a6e48a93266` |
| Existing emitted candidate `dist/index.js` | `d0d9a106ee9a9abfa7c77b24603158f9e28a5c1773430f12f08430bbc3585b82` |
| Preserved Hub installed baseline | `d92bb9daff3f6e56205c41d6aa6e645ec1d2a47e82aa074329d5905dde728a5c` |

Independent commands repeated the preceding receipt's package/Hub focused commands with PATH/HOME/LANG only and 120-second child watchdogs. Package tests passed **30/30**, one file, 329 ms; package typecheck passed; Hub passed **53/53**, three files, 973 ms. No skips. No package build, install, full Hub check, browser or network operation was performed. Existing emitted bytes were imported unchanged.

Logs and SHA-256:

- `/tmp/minion-14-04-identity-independent-package-tests.log`: `a8d11aa308607ec0ca513fd116d6e48d8bbdc7984abdac977a464bac950283d3`
- `/tmp/minion-14-04-identity-independent-package-typecheck.log`: `1d18076ec072902744c150c31f810083a56e13c1e579acc4e3baa7514bb02498`
- `/tmp/minion-14-04-identity-independent-hub-tests.log`: `6d16e938a336c17174303f0f554d3d8d3e4660f2ca6dcf7927b75aadba9cf104`

Standards review: the namespace is private, lazy, exactly 16 native getRandomValues bytes, and generated with its Crypto receiver intact. There is no public injection option, weak fallback, new dependency or wire-frame change. Missing/throwing entropy rejects with a fixed local error, without native cause, pending insertion or post. Calls share the namespace and increment their sequence. Disposal after entropy allocation is rechecked. Existing supported source/installed combinations, origin checks and disposal behavior still pass.

Spec review: the actual two-instance regression uses the same child and parent fixture windows, a frozen clock, actual PluginBridge and Hub HostBridge, deferred forwarding and two deterministic entropy allocations. Both source and emitted candidate keep B pending when A's old response arrives, forward both requests and resolve B only with B's response. This is actual class/correlation evidence, not a helper-string test or BFCache/browser qualification. Native entropy availability outside this local runtime and installed/bundled adoption remain open.

### Finding ID14-04-IDENTITY-1: sequence guard precedes a reentrant entropy boundary

At package `src/index.ts:331–349`, the safe-integer exhaustion check runs before getRandomValues. After that call only disposed state is checked, then rpcSeq increments. Using the same private sequence-boundary setup as the committed test, set rpcSeq to MAX_SAFE_INTEGER minus one and make the test-only entropy stub issue one nested bridge.call before returning. The nested call consumes the final safe value; the outer call then posts MAX_SAFE_INTEGER plus one.

A read-only Node probe imported the frozen emitted candidate, used synthetic windows and supported hello, stubbed only the native entropy seam, attached rejection handling and restored crypto after disposal. Observed output was:

```json
{"postedSequences":["9007199254740991","9007199254740992"],"safe":[true,false]}
```

The probe did not run a server or modify product source. Native getRandomValues ordinarily does not invoke application JavaScript; the reentrancy here is synthetic, like the amendment's existing dispose-during-entropy fixture. Thus this is a narrow contract/test-boundary defect, not evidence that ordinary native entropy causes unsafe IDs or that 128-bit random namespaces guarantee absolute uniqueness.

Requested correction: retain the pre-allocation exhaustion check and recheck sequence safety immediately after entropy allocation, before increment/pending insertion/post. Add the nested-call final-sequence fixture; it must show one valid final request and reject the outer call without an unsafe post or leaked pending entry. This fits the already admitted package source/test scope. Root and the implementation owner were notified; this reviewer made no source change. Root owns any proposal/source-TODO disposition if the correction remains open.

The preceding broader SDK limits remain: installed baseline is not repaired, no deployed or real browser/BFCache behavior is certified, and 14-07 adapter generation/lifecycle, 14-06 mounting, token/method policy and package adoption still require their own receipts.


## Request-identity correction independently accepted

**Scoped PASS; ID14-04-IDENTITY-1 is closed for the reviewed amendment.** The earlier conditional finding and runtime-exploit caveat remain preserved above. The package now repeats its safe-integer exhaustion check after entropy/disposal handling, immediately before increment. The new actual PluginBridge regression reenters at the entropy seam, consumes the last safe value in the nested call, rejects the outer call, asserts exactly one posted request with that safe suffix and leaves zero pending entries after response. No broader protocol change was required.

Corrected frozen inputs:

| File | SHA-256 |
|---|---|
| Package `src/index.ts` | `cd8380839105f35ee996a5d6e893f87a3dd676616b4c2be9c827f55b150e4862` |
| Package `src/index.test.ts` | `f1a52af6d511200f5862bcea634e5a50c8d3fe37587e141d04a3e16bcd332e90` |
| Existing emitted candidate `dist/index.js` | `4f7bd0418fdf85d8a3206cab1c9f3db767de7dc5745a93fbb73b6ab110a098d6` |
| Hub `bridge-protocol.contract.test.ts` (unchanged by the correction) | `c0c8e9cb7693631eee14278fbb6abb1cce098af501d53a638a280a6e48a93266` |

Independent rerun with the same allowlisted environment and commands passed **31/31 package tests** (315 ms), package typecheck, and **53/53 Hub tests** (847 ms across three files). No skips. Both source and corrected emitted candidate pass the same-window late-response test. Scoped gateway/Hub diff checks passed.

All five other foundation source/config/test hashes remain unchanged: package contract config; Hub bridge-protocol.ts, bridge-host.test.ts, compat.ts and compat.test.ts. Thus only the three reopened identity source/test files differ from the earlier foundation freeze; the emitted candidate is the separately recorded local build output. This reviewer did not rebuild, install or change source. The unchanged Hub installed-baseline digest is still pinned and checked by the passing contract fixture.

Final independent logs:

| Log | SHA-256 |
|---|---|
| `/tmp/minion-14-04-identity-corrected-independent-package-tests.log` | `27f003bb02ec36d8c061e60b4bf2ba62adee5346dbb51de00bf5dc6391a9bedd` |
| `/tmp/minion-14-04-identity-corrected-independent-package-typecheck.log` | `1d18076ec072902744c150c31f810083a56e13c1e579acc4e3baa7514bb02498` |
| `/tmp/minion-14-04-identity-corrected-independent-hub-tests.log` | `bf3fee010cf3f167653cb4cc3c33a7833f30c292e74e63bebe2f4f26cdbf7497` |

The corrected source and emitted identity are qualified inputs for root's separate 14-07 generation admission. Native browser crypto/BFCache behavior, installed plugin adoption, component capability enforcement and broader SDK-01/02 closure remain pending; this scoped acceptance does not waive them. Only this verification append was written by the reviewer.
