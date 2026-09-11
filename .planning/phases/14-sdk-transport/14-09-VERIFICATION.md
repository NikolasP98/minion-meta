---
phase: 14-sdk-transport
plan: "09"
status: isolated_candidate_scoped_pass
requirements_completed: []
---

# Independent Hub consumer verification

Root reviewed the candidate service/state diff and the native client-mode fixtures. The final independent run passes all 44 tests, with no skipped cases or reported unhandled errors. Native SvelteKit sync and complete candidate svelte-check pass with zero errors and zero warnings. Tests took 3.96 seconds total (3.14 seconds in cases). The active Hub source and installed package remain unchanged.

The fixture uses the real emitted shared GatewayClient, actual Svelte runes and the production RPC holder; only external transport and surrounding application services are synthetic. Every case asserts zero native socket connection attempts. This verifies consumer lifecycle behavior, not a real gateway server or browser connection.

Root found two additional gaps during review: delayed update-event work could cross a session boundary, and events arriving before authentication could mutate health/state. The amended ownership fences have meaningful failing baselines and passing controls. Final tests cover initial/internal authentication, publication, socket replacement, backup cutover, current-close invalidation, hydration/poll/import continuations and these update/pre-hello event cases. Existing focused regressions passed 15 cases before the last event-only amendments; this is not a claim that they were repeated afterward.

The full check includes 35 non-owned files from the accepted 14-07 source snapshot and six plugin sibling files, with the overlay recorded separately. Root also corrected an overly broad snapshot exclusion which omitted src/lib/data/tool-manifest.ts. Owned service/state/fixture/config files were preserved. Native generation and checks ran with an empty application environment, private HOME and explicitly empty public PostHog values. No app server, customer data, provider or production database was used.

The private package is the complete 14-11 archive, SHA-256 b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9. It contains matching runtime/declarations for reconnect work; it predates the 11-07 durable Shells contract. Neither artifact may stand in for a later package version.

Standards review: scoped changes, strict native compilation and real reactive tests pass. Spec review: the selected authenticated-session ownership boundary passes. Imported history/config/group completions and remaining chat/event asynchronous continuations are outside this claim, alongside broader diagnostic redaction and envelope validation. Paired active source/package adoption, plugin component qualification and deployed acceptance remain open; SDK-01/02 are not complete.

Evidence directory: `/tmp/minion-14-consumers-61p26r_z/minion_hub`.

| File | SHA-256 |
| --- | --- |
| `src/lib/services/gateway.svelte.ts` | `af6d5ae7c7083265cede7a78dd295363f3c20808705e4ba85b167fa862da8d5c` |
| `src/lib/state/gateway/gateway-data.svelte.ts` | `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03` |
| `src/lib/services/gateway.contract.fixture.ts` | `e5a920702fe4e8f08e013271b105d95f10a252e8f154f003b64eb82d573cbbc0` |
| `vitest.gateway-contract.config.ts` | `16b5100b6fd8a222a61a628590be014e3fb236e2704eefde73ef1650054a918a` |
| `root-full-check.log` | `32c437de41f686eb0533a14d0da71459f9405dd3caf6b64cb7840feeefc8b938` |
| `root-independent-contract.log` | `f5316cf1cb0e9f9d49147542733704275bc8a13d4a1a283a73b2bd7232b590e6` |
| `root-full-check-overlay.json` | `3bf9f47c4c58e8f3990db5c3d14212875f34d70683ef57a463009f567aae3fe6` |


## Task 4: first-mount accepted-session association

Root independently reviewed the accessor/token source and native host-selection fixtures, repeated all 53 tests (7.27 seconds total) and reran the full native candidate app check: zero errors and zero warnings. The earlier 44-case receipt above remains tied to its earlier hashes. This amendment returns a stable frozen token only for the private current authenticated session; structural token copies, selected-host mismatch, retired connections and private backup sessions cannot acquire the association. Actual reactive reads notify a first-mounted consumer. A selection-only A→B→A round trip can restore the same still-authenticated A token; a component must independently retire its prior mount and callbacks.

The eight new missing-export red failures prove the new API contract was absent; one additional control exposes retained A state after actual selection of B. They are not eight reproduced live authority exploits. All prior 44 cases remain in the 53-case run. Five exact-site TODO comments now record remaining event timer, stream and imported-history continuation boundaries, paired with the root proposal.

This supplies the service prerequisite for 14-06. Actual mounted plugin compatibility and dispatch are not verified by this accessor alone. No active app source/package or deployment changed.

| Final Task 4 input | SHA-256 |
| --- | --- |
| `src/lib/services/gateway.svelte.ts` | `d047a0516d53d2a2c8077205b2b41cfb8a1cbcce9e40952a742595a9d8752f7e` |
| `src/lib/services/gateway.contract.fixture.ts` | `e20561f0439040f2192681f1e6570c65fbd848c41be6028826503378ead64f16` |
| `root-task4-contract.log` | `cbfa84394b42d29e3bb333a07d124f9ab6012a9d4cd09f2e5ff4f2955f5e9e06` |
| `root-task4-full-check.log` | `32c437de41f686eb0533a14d0da71459f9405dd3caf6b64cb7840feeefc8b938` |


Routing correction: root inspected the construction-time frozen Host copy, captured public gatewayUrl and backup committed host identity, then independently repeated all58 focused cases successfully. This includes five added routing/aliasing cases. Source50c4ac224ce35a48a9ed09c86bc8c054f60231df162bb22d246bf8fdd31f5110 and fixturec72e008de580eb8e5e59b52c270cc941a890a54cbf5625948f3e06c844177541 are the current private pair. Prior53 fullcheck is a dated receipt; final aggregate compilation is serialized with the changing14-06 component fixture. Actual component mount/dispatch qualification remains separate.


## Final paired component checkpoint

Root passed the full native Hub check with zero errors and warnings against final58-case service, typed compatibility utility and56-case PluginIframe candidate. Exact paired source/log identities are recorded in14-06-VERIFICATION.md. This closes the previously pending aggregate type check for these private bytes; active/deployed adoption and browser qualification remain open.
