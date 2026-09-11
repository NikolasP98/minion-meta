---
phase: 14-sdk-transport
plan: "07"
reviewed: 2026-09-09
status: ready_for_bounded_task2_admission
scope: "Read-only implementation preflight; root must amend and dispatch before source edits"
execution_performed: false
---

# Artifact execution preflight

Task 2 is feasible within the listed files using the qualified `PluginBridge` and a thin adapter. Root settled the remaining adapter choices during this review. Amend the plan's admission text and exact input receipt, then dispatch Task 2. Task 3 browser work remains separately gated. This review did not execute source, tests, a generator, browser, build, network call, or package installation.

## Reviewed bytes and foundation boundary

| Input | SHA-256 |
|---|---|
| Amended `14-07-PLAN.md` | `b69aee4af51bb9eebb10e4e8af93ed32745f5cdcaac129dc1ec75a7e6f9b6dfb` |
| Reuse amendment packet | `daa02905ed86fcf05348410e4468f233651682ef9e93c450bca1a7cfbc8de2da` |
| Overview HTML | `9be70d710752d84299a0f6e63bc20b1fa22c2596bd0d3dec0f23a96bb88b4e00` |
| Triage HTML | `f1b79dffcec387168d31606613a212919fb3bc28310b19f363b3b2297dc4330e` |
| Artifact-builder HTML | `60582d79edff9d53af8fcff0a181d14959dec74289ee4453b128224146d484de` |
| `ArtifactHost.svelte` | `e5fc0325f443e2fcc69d73d00f787aed7df1b6fa33fe7e006bd971e31fb9fabe` |
| `builder-prompt.ts` | `080c620c47caa2a4b7f62996c31bb979120465c106b3366e526480c7e54b6925` |

Root reports the final 14-04 identity amendment independently accepted with 84 tests and selects emitted entry SHA-256 `4f7bd0418fdf85d8a3206cab1c9f3db767de7dc5745a93fbb73b6ab110a098d6`. This preflight inspected the source API but did not independently replay that foundation or build its entry. The executor must verify the exact selected path/hash and its associated source receipt before bundling. Older candidate and Hub-installed 0.4.0 entries are not fallbacks. Preserve the new post-entropy disposal and sequence checks; no package source belongs to Task 2.

Read root, Hub, applicable gateway instructions and the UI-governance skill; inspected all three scripts, the pure prompt/tests and builder import wiring, actual host/mount implementation, serving route, package API, previous receipt and installed Vite declarations. No render/style redesign is proposed.

## Minimum adapter contract selected by root

Expose one narrow IIFE global, `generatedPluginBridge`, with `mount({ render, fail })`. The mount returns final-disposal capability. Local render/error callbacks remain outside the protected generated region; no raw protocol function or package instance needs to be exposed to the renderer. The adapter uses the document's real window, parent and hash. Tests control their environment, not an alternate production message parser.

### Host hint and authority

`src/lib/agents/artifacts.ts:46` constructs the actual navigation suffix as `#hostOrigin=${encodeURIComponent(origin)}`. `ArtifactHost.svelte` supplies `window.location.origin`, mounts the real parent/child bridge with `sandboxed: true`, and uses `sandbox="allow-scripts"` for both iframe branches. The child's own origin is opaque; it must not derive the expected parent origin from its own `location.origin`.

Root selected exactly one nonempty `hostOrigin` hash parameter and no fallback. Use `URLSearchParams.getAll()` to reject missing or duplicate hints rather than silently choosing one. Do not trim or normalize a malformed value into an accepted origin, infer the parent from referrer, fall back to `*`, or supply credentials. Construct `PluginBridge` with `self: window`, `parent: window.parent`, and that hint. The package owns exact-origin, source-window, message-shape, version, response correlation and handshake checks. No adapter `message` listener or copied validators are necessary.

The earlier receipt mentioned a separate exact HTTP(S)-origin check. Root's final selection delegates exact-origin validation to the package; synchronize that wording in the admission receipt so an executor does not independently invent a second URL policy. Actual `ArtifactHost` navigation produces an ordinary application origin. This does not certify arbitrary embedding origins or every browser deployment mode.

Invalid/missing hints and initial `notifyReady()` failure must reach the selected fixed failure display without posting an RPC or leaving an active listener. Require tests for duplicate/empty hints, `*`, `null`, relative URLs, path-bearing origins and a valid exact application origin. No parser duplication is needed to exercise those cases through the actual package.

### Tokens and theme

`ArtifactHost.svelte:27–48` collects **all** CSS custom-property families from inline styles and accessible `:root` rules. The package validates the theme union and a map of string values. Root selected projection of own token entries whose keys start with `--`; use `Object.entries` rather than `for...in`, and pass only those entries to `style.setProperty`. Do not narrow to `--color-*`: current HTML consumes `--radius`, and host snapshots also carry spacing, shadows and other variable families. Do not apply ordinary CSS property names supplied in the token object.

This is DOM projection of an already validated message, not another frame/token-value parser. Preserve existing overlay behavior for absent keys; do not silently delete previously applied variables or turn updates into a new theme system. Apply validated theme changes without another context RPC. Do not interpolate tokens into stylesheet text or HTML.

The existing compatibility behavior toggles a `dark` class using the host's light/dark value. The host does not send the actual design-system theme identifier, and this file set cannot repair its snapshot selection. Preserve that existing behavior if needed for byte-compatible semantics; do not invent a `data-theme` identity from the binary field or claim full design-theme synchronization. The governance skill's canonical `data-theme` policy and any existing host/theme debt remain separate from this transport repair. Run the two required UI lint gates after script changes and report their actual results.

### Context and render inputs

Register `onHello` and `onThemeChange` before `notifyReady`. Set the lifetime's context-request flag before calling `bridge.call('hub.artifact.context.get', {})`; one supported hello admits exactly one such call. Repeated valid hello may update tokens but cannot request context again, including after an RPC error. No mutation retry or general RPC API is added.

Pass the complete context payload unchanged to the existing renderer. Do not project only the fields listed in the overview prompt, flatten `vars`, or replace null with `{}`:

| Builtin | Actual render inputs that must survive |
|---|---|
| Overview | `agentName`, `agentRole`, `agentDescription`, `status.state/detail/stats`, `trigger` |
| Triage | `data.counts` and `data.recent`; preserve existing `esc` and relative-time behavior |
| Artifact-builder | `vars['artifacts.builtCount']`, `vars['artifacts.recent']`; preserve title/agent/version/time rendering and escaping |

The adapter treats payload as unknown and contains render exceptions. Root selected fixed adapter failure text, without raw exception strings, RPC messages, payloads, URLs, or causes. Keep the existing `fail(msg)` body, but supply only a reviewed constant from adapter failures. This preserves its `Could not load:` display prefix while preventing a new raw-error path. If renderer callbacks themselves throw, contain/report that outcome without starting another RPC.

Null context is not identical across current renderers: overview dereferences `c.agentName` and errors; triage and artifact-builder use guarded access and render empty states. Tests must record those actual outcomes rather than modifying the renderers or mocking them away to obtain one uniform result. General context-schema validation, overview stats interpolation and renderer safety are outside this slice.

### Lifecycle

On pagehide, clear the active-instance reference before disposing it. Both fulfillment and failure continuations compare their captured lifetime with the active one before invoking render/fail. This covers a response already settled before retirement but whose continuation has not run.

Retain only page lifecycle listeners needed for restoration. A persisted pageshow starts one fresh instance when none is active; a nonpersisted initial pageshow and duplicate persisted event cannot create a second concurrent instance. Final dispose removes those listeners and retires the active bridge. Keep the one-context flag per instance. Do not add an adapter pending map, timestamp ID, response remapper or global instance registry.

Actual Hub `HostBridge` retains its hello payload and `flushHello()` runs again for another valid `plugin:ready`, so a fresh package lifetime can re-handshake on the same parent/WindowProxy without a host edit. Its native random namespace separates old/new pending IDs. Neither this source reasoning nor synthetic persisted events proves real BFCache entry/restoration; Task 3 must record the native persisted flag and any host lifecycle gap separately.

## One-time HTML split and subsequent generation

Root explicitly admitted the initial split: remove the old host-hint/protocol/pending-map/message-listener shell; preserve complete `render`, `fail`, `esc`, and `relTime` function bodies, plus all markup/style bytes; insert the delimited generated IIFE and a thin `mount({ render, fail })` call outside it. This necessary initial migration is distinct from recurring generator write mode, which replaces only the protected region and provenance. There are no existing delimiters to replace in the baseline HTML.

All three protected regions must be identical. Choose exact marker spelling once, include it in prompt/tests/provenance, and reject zero, repeated, reversed or nested markers. Retain the renderer functions in their existing closure where possible. Compare their captured body hashes before/after the split; do not let formatting or extraction silently rewrite their logic. Later generator `--check` must reject drift rather than re-pin it.

## Generator and provenance requirements

Installed Vite is 8.1.3. Its installed `InlineConfig` declaration explicitly supports `configFile: false` and `envFile: false`; `envFile` is deprecated but available. The plan does not require a new bundler dependency or application Vite configuration. Use the declared Vite public API and fixed IIFE configuration, not a direct undeclared transitive bundler import.

Before building, verify root-selected candidate package entry, adapter, generator/config and exact installed tool/lock identities. Record logical repository-relative source/module paths and hashes, not absolute workstation paths or timestamps. Preserve applicable license notices. Keep mutable output/provenance expectations distinct from the immutable package-input pin: editing output and provenance together must not make an old or unreviewed package acceptable.

Inspect the real output/module graph: one standalone JavaScript chunk; expected adapter/package modules only; no imports left for runtime resolution, dynamic imports, assets, maps, eval, new Function, or network bootstrap. A module allowlist based only on basenames is insufficient. Reject unexpected modules even if a produced script still has the expected global name. Root selected rejection of any literal case-insensitive `</script` sequence in the emitted chunk before insertion. Do not rewrite or arbitrarily escape source text to bypass that failure. Record the actual inserted-region digest. This check protects HTML parsing of the inline region; it does not confine arbitrary generated HTML.

Build twice from the same selected inputs and compare actual bytes. `--check` builds in memory and compares all three regions and provenance; it must not write missing output or update expected hashes. Write mode validates every input/target before changing the bounded destinations. No caller-supplied arbitrary output tree, symlink escape or package-install fallback is necessary for this generator.

Existing `bridge.contract.test.ts` can hold the generator and actual-script tests. Preserve normal test-lane isolation: synthetic DOM/windows, explicit native-random test control, intercepted external operations and real generated code paired with actual `HostBridge`. Generator invocation must use `write: false` for checks/tests; any negative-write fixture belongs only in an admitted temporary directory, not the three source HTML files. Record exact module graph and final artifact hashes for later native qualification.

## Prompt, serving and CSP limits

`builder.ts` imports the real overview HTML with `?raw` and passes it into both generation and regeneration prompts. No builder edit is required to propagate the changed builtin reference. Update `buildBuilderPrompt`, its regenerate-derived wording, and repair tests to require only the **protected generated region** byte-for-byte while permitting render/markup/style customization outside it. Repair must continue carrying that same base contract. Tests must use the actual overview reference, not a placeholder script.

`validateBundle` is defined in the owned `builder-prompt.ts`, and `builder.ts` calls it, but the plan explicitly preserves its shallow acceptance behavior. Add an exact TODO at that owned boundary and send root the proposal wording; do not tighten or pretend to enforce arbitrary generated-script safety in this child. A protected-region hash in model output does not rule out other scripts. Stored artifacts and generation/regeneration model calls remain untouched.

The actual serving route `src/routes/artifacts/[artifactId]/ui/[...path]/+server.ts:27–36` emits:

- Builtins: `frame-ancestors 'self'`.
- Database-stored HTML: `sandbox allow-scripts; frame-ancestors 'self'`.

There is **no** `default-src`, `connect-src` or `script-src` network-denial policy at this route. The real host adds the opaque iframe sandbox for builtins. An inline IIFE requires no CSP relaxation, but existing CSP does not prove network confinement. Generated-graph inspection and blocked external requests in fixtures establish only the bounded tested artifact behavior. Do not change the route/CSP or claim arbitrary stored HTML is confined by it.

## Admission and handoff

Root accepted the one-time split, mount contract, unique hint/no-fallback policy, package-owned validation, all-family custom-property projection, fixed error display and closing-script rejection during this review. No additional product file is required. Root should now amend the plan's stale `ADMITTED_TASK1_ONLY`/draft-only/footer language for Task 2, pin the newly accepted package entry, name exact generator global/markers/config inputs, and record this review's contract. A comment-only TODO at the owned overview stats `innerHTML` site may be separately recorded in that amendment without changing renderer behavior; distinguish that approved comment from the otherwise byte-preserved function body. Keep native/browser Task 3 and any final SUMMARY creation separately admitted as the existing plan requires.

**Standards:** Ready for bounded Task 2 admission after that exact update. Reuse owns protocol parsing; the adapter owns context/render/document lifecycle only. Source/provenance checks and installed/deployed/runtime claims stay separate.

**Spec:** No unresolved implementation blocker was found under root's selected contract. Preserve real renderer input/bytes and all named negative cases. Remaining gates are actual generator output/determinism, synthetic real-host tests, UI lint/check evidence, native opaque/BFCache behavior, generation enforcement, stored adoption, host theme/lifecycle behavior and renderer/schema safety. None is marked executed by this preflight.

Only this review document was written. The executor/root owns exact source TODOs and the global proposal ledger for the deferred seams above.
