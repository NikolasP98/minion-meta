# SDK and container proposal history review

Date: 2026-09-09. Scope: selected SDK, HTTP, WebSocket, ACP, plugin distribution and container/release histories. This report records a bounded local review, not an exhaustive review of all 678 documents or removed historical files. No source, index, status, branch, package or runtime was changed during inspection.

## Snapshot and method

- Working root: `69739a7c7b1a92e442b5a574d88f167a0fe40db3` on `feat/curated-engineering-skills`, with concurrent WIP preserved.
- Separate reference `minion-meta/`: clean `main` at `59c4b56c192a730dbd63bb8e51dd8305eb2ad424`.
- Follow-up path inspection: gateway branch `fix/ci-cost-remaining-gaps`; Hub branch `feat/level-2026-07-30`. These are source identities, not deployment identities.
- Read the current disposition inventory and status packet, the mapper implementation, selected complete bodies, same-ID diffs, bounded local Git logs/diffs, and the source seams identified below. No remote fetch, registry lookup, paid call, production probe or implementation test was performed.

`R/` below means `minion-meta/`; other paths are relative to the working root. The mapper links by topic family, not semantic coverage (`scripts/qc/proposal-requirement-map.mjs:12–23,132–134`). Neither matching words nor `merged/done/shipped` status establishes current consumer or runtime behavior.

## Findings and dispositions

### HSDK-01: Select existing reference fixes before implementing the shared transport plans

Working `packages/shared/src/gateway/client.ts:263,296` still discards async handler/reconnect errors. Reference `R/packages/shared/src/gateway/client.ts:38,46,53` declares `onEventError`, `onReconnectError` and `onSocketError`; `:291–340` contains handler and reporter failures. Working `packages/workforce-client/src/client.ts:96–98` still parses before checking HTTP status; reference `:121–137` implements typed non-JSON errors.

**Disposition:** root must select exact reference patches, API and tests before 14-01 edits the shared client or 14-05 edits Workforce. Reconcile with current WIP; do not overwrite the working root or reinvent the old fixes. Publication, installed consumer bytes and deployed adoption remain separate unknowns.

### HSDK-02: One approved adoption spec conflicts with its amended proposal

`R/proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md:22–37` requires all three hooks and explicitly records its conflict with the spawned spec. `R/specs/2026-08-19-gateway-client-error-hook-consumer-adoption-spec.md:35–39` still requires one hook and a separate later pass. Its `:46–79` describes an earlier unpublished release snapshot, not today's registry state.

**Disposition:** reconcile one selected adoption spec into a three-consumer by three-hook decision matrix before 14-02 consumer work. Preserve exact archive verification. Each consumer chooses a reporting sink or explicitly accepts the default for each hook. No consumer drives reconnect from the socket-error hook. The original reporting change excludes replay, backpressure, typed transport provenance and remote telemetry (`R/specs/2026-08-17-pkg-gateway-client-onevent-errors-spec.md`, section 5); keep those obligations separately owned.

### HSDK-03: Plugin postMessage compatibility needs its own qualification, using existing code

`specs/2026-06-15-plugin-distribution-cicd-design.md:133–160,210–224` requires bridge negotiation, manifest compatibility, `requiredRpc` and a current/candidate gateway matrix. The named transport scope in `14-01-PLAN.md:87–99` is HTTP/gateway WS/ACP; the iframe postMessage boundary is distinct.

**Current-source refinement:** the historical claim that this layer is absent is obsolete. `minion/packages/plugin-ui-bridge/package.json` declares `@nikolasp98/plugin-ui-bridge@0.4.0`; Hub's `src/lib/plugins/bridge-protocol.ts:6–16` imports its types and version. `compat.ts` implements gateway/version/method checks, permissive when facts are unknown. Both peers already advertise protocol versions and normalize omitted legacy versions to 1. This audit has not certified those implementations.

Concrete review seams: Hub `bridge-protocol.ts:23–33` validates message type only; its `:105–113` checks source-window identity only for sandboxed peers and origin only for ordinary peers. The package has analogous type-only validation and origin checks (`src/index.ts:103–131,201–206,363–365`). Current fake-window fixtures omit source identity for normal peers. Hub `PluginIframe.test.ts` contains component-existence checks, which do not qualify a real handshake.

**Disposition:** proposed 14-04 inventories and tests the existing package/host implementation. Freeze supported legacy and unknown-capability behavior before changing it. Verify source-window and origin pairing, malformed messages, lifecycle cleanup and actual host/plugin classes. Preserve useful compatibility requirements without forcing npm/CDN repackaging or claiming actual-browser coverage from a fake-window fixture.

### HSDK-04: Typed Workforce errors do not bound network bodies or finish the consumer boundary

Reference `packages/workforce-client/src/client.ts:121` reads all `res.text()` before truncating the error field. Its spec `:393–403` explicitly excludes retry, timeout/AbortSignal and JSON shape validation. The 2048-character error-field limit is not a download or memory cap.

`R/proposals/2026-08-17-hub-workforce-error-body-leak.md:36–38,54–69` leaves browser forwarding unaudited and makes suppression precede dependency adoption. Current Hub adds two distinct paths: `src/lib/server/workforce-fetch.ts` has typed-client factories plus `workforceRawFetch`, while `src/routes/api/workforce/[...path]/+server.ts` directly relays upstream body/status/headers. A JSON-client fix cannot silently qualify that streaming proxy. The proxy's supported binary/streaming behavior was not inventoried here.

**Disposition:** proposed 14-05 selects the existing typed-error patch, then defines caller cancellation/deadline, streamed byte limits and sanitized consumer errors for identified JSON paths. Inventory raw-fetch/proxy consumers before deciding which are JSON-only. Preserve legitimate streaming/binary routes. Do not log raw upstream HTML automatically: it can contain secrets even when truncated. New route/schema seams require exact child ownership before edits.

### HOPS-01: Supersession is partial, and the old blue-green instruction conflicts with later design

June distribution `:229–234` prescribes blue-green Caddy deployment. July `specs/2026-07-10-gateway-update-system.md:50–67` rejects concurrent same-account gateways. `R/specs/2026-07-13-runtime-aware-fleet-image-updates.md:16–17` explicitly supersedes only container npm updates and preserves legacy systemd behavior; `:122–128` requires host control, stop-first updates, serialization and rollback.

**Disposition:** container updates belong to July13; legacy package updating remains a preserved July10 contract; plugin compatibility belongs to phase14. June same-account blue-green advice is obsolete. Do not globally retire the legacy updater or revive the entire June plan merely to recover compatibility requirements.

### HOPS-02: Factory toolchain closure deliberately removed proposed scripts

`R/specs/2026-08-17-factory-agent-cli-unpinned-spec.md:15–16` records descoped S2 completion through PR120. `:270–345` still describes two scripts and probes; `:512–518` narrows the authorized remainder to README/playbook and excludes changing shipped S1. `:410–416` explicitly disclaims byte-reproducible images.

**Disposition:** retain pinning and the documented bump procedure as the accepted historical scope. Mark superseded body instructions clearly; do not create the discarded scripts as completion work. Carry actual image/transitive/base/architecture provenance and CLI parser fixtures into AGT-06/OPS-04 with current acceptance criteria. Fixed top-level versions prove neither immutable complete images nor harness conformance.

### HOPS-03: The Site tarball incident is historically closed, with provenance separately deferred

`R/specs/2026-08-18-site-vendored-tgz-untracked-spec.md:14,19–25` records verification-only closure at Site `940f0e6`. `:123–145` separates source/snapshot parity, cross-repo provenance and de-vendoring.

**Disposition:** refresh committed artifact and manifest/lock agreement on the selected Site source. Keep DEP-03 source revision, digest, license and export-content proof separate. Do not repack or remove a tarball as the remainder of this closed incident. No current Site artifact was verified in this review.

### HOPS-04: Repository release gates do not constrain a general deployment principal

`R/proposals/2026-08-28-factory-supervised-release-defense-in-depth.md:18–26,30–56` identifies general-shell/Docker authority, mutable marker ownership, controller-repair identity, external receipts and rollback/data reconciliation.

**Disposition:** carry these into OPS-03/04 decision coverage. Forced-command deployment identity, marker ownership and external receipt retention require separate operator-reviewed infrastructure changes. Do not infer host containment from exact-candidate repository checks or activate production from this report.

### HOPS-05: Release-probe silence is resolved in the incident's own update

`R/proposals/2026-08-28-factory-release-probe-red-and-silent.md:66–88` says diagnostic silence was fixed; intermittent mandatory posture-call omission caused replay and later passed against the unchanged candidate.

**Disposition:** update the selected active summary to omission counts, bounded provider metadata and measured retry policy. Preserve the mandatory call. The old emergency-route question at `:63–64` is superseded by `:68–70`, which retains the supervised route. This is historical documentary evidence, not a current operational probe.

### HSDK-05: The Shells ancestor is not an ACP conformance certificate

`specs/2026-05-20-shells-golden-agents.md:130–139` contains provisional mappings including `session/done`; `:196–206` proposes stub-first testing. Preserve lifecycle intent under AGT-03/04 and qualify a pinned actual harness under AGT-05. Do not copy historical mappings as current protocol truth. External ACP documentation and runtime conformance were not checked here.

## Bounded Git evidence

- Reference `76d433a43b3d3fad870c1d20135d484a59a0b85f` changed Shells/distribution/gateway-update frontmatter to `superseded` without successor links or body updates. Working-root equivalent: `045d019bc94c6b558bc6af8fa8c51dfc63cdd242`.
- Reference `a7ce06aeb1ceaea821f92be9fce97baa2ef421e1` added toolchain S2 descoping; `32ad1ae993838c311a8683a496816148cc4258e4` recorded shipped disposition.
- Reference `8d87aa4` amended the adoption chain after lifecycle implementation; the conflicting approved consumer spec remains in the current reference.
- Reference source history includes `399fc59c78f4aea2176737f32d654a3c6914498b` for event-handler containment and `a8e6c6d8771025a6549cd079be2ebf0a74c94159` for lifecycle reporting.
- `R/specs/2026-08-26-spec-heading-lint-baseline-backfill-spec.md:98–104` already identifies the five orphan supersessions. Reuse that cleanup owner rather than adding a competing corpus rewrite.

## SHA-256 receipts

| Artifact | SHA-256 |
|---|---|
| Working shared client | `9a4a63b8ad9ca3f7ec3c9832c7b597a274e56cebea0e21c47f54e3223aa10532` |
| Reference shared client | `b81c7ff63c371909fccdd7c08525f4b84573f03baca71cfccfbc16d54da32dc3` |
| Working Workforce client | `21109422235a9b18438475562bd74bf9de9687c47fc3361a57fa0768b89c81a7` |
| Reference Workforce client | `303b8eb1af55cf08010d33f62e858cf5959992a5482129f2b634ddd057bef68b` |
| June15 distribution spec | `27d21388d33050b69aa5196917d0f0cfc4dd328770d517db70f84d6dc66662f0` |
| July13 runtime-aware update spec | `a6990931327a46928df8d59b3abd8fe9624b036be6fb7dfc2ec2cc40a9bf6030` |
| Reference three-hook adoption proposal | `73e18aaa5ae2da00ed465e84aac6f9899bf53c6c024b919c24fd578d461cfc0a` |
| Reference one-hook adoption spec | `ff333773804b74a83bceff3f328dad553adc6d07b3e876bd9df1b0311c582d6e` |
| Reference Factory toolchain spec | `293f6f721af49f97afe6baa3fd5b5e61377afc25322a2fe1c31f4c10e251a400` |
| Reference Site tarball spec | `117f89dd5a52a86cfeb01ca32ed315040021dfe667d76d540ec4e8ae986de227` |
| Reference release-defense proposal | `de75977f1ba3f187aa5bbb095e2adbff787b3d2ffb44a850d29e2ad75c87d646` |

Root owns conversion into the existing proposal ledger, disposition packet and plan allowlist. Plans 14-04/14-05 are drafts until independently reviewed and admitted. This report closes no SDK, documentation or runtime requirement.
