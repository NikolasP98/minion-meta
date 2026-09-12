# Priority delivery and independent review — 2026-09-12

The resumed operation followed the requested order: jobs/stock, UI/accessibility, then agents/governance. Three bounded agents implemented, independently reviewed and monitored releases while root resolved cross-project policy and reviewed their corrections. Active dirty checkouts were preserved; release work used private clones. No production data, tenant permissions, runtime activation flags or customer accounts were changed for tests.

## What the takeover review changed

Claude's work supplied substantial source and test foundations, but several completion claims exceeded their evidence. The review found a finance parser/service version mismatch, non-atomic booking edits, client-visible persistence errors, cross-shell outcome authorization and a legacy invocation key dropped at the gateway RPC boundary. The native corpus fixture also substituted text for vectors and omitted the real serving trigger. These issues were reproduced or traced to their actual source boundary, then corrected with meaningful regression evidence.

During review of the new fixes, root also caught a reduced-motion implementation that froze pixel spawn/despawn cleanup; it was corrected before delivery. The ACP candidate cannot safely assume that caller sessions are independent one-shot requests. SDK qualification therefore remains separate from production adoption until conversation continuity and restart mapping are explicit.

## Delivery receipts

| Slice | Reviewed source and delivery | Verification |
|---|---|---|
| Hub jobs/stock and API repairs | PR269; reviewed a8efe289b4d1377edcf3b58ab8ae2d6f22888b52; deployed f97efb2d43742772d5bc44b93260920bb20bb0a4 |148 native tests across five exact suites, zero skips; both CRM native lanes; full ordinary/build gates green |
| Hub UI/accessibility | PR270; reviewed32f7b2293700f803fd66307bf94960fac4874443; deployed77445c01ec38657c767d6f011e77148be3cc4ccf |3800 ordinary pass/25 existing skips;148 native pass/zero skips; full build and design/token checks; mobile/desktop public login smoke |
| Bridge Node support floor | Meta PR400 merged dev6103e982508ec3cdc18488eb4f855474ef52c907 |216 actual Node22.13.0 tests; emitted journal on22.13.0 and22.23.1; real unavailable-builtin rejection on20.18.0 |
| Gateway authorization/retry repair | PR292 mergedDEV2a2fdace858536114783d6d7dc4a3fbb76801898; production promotion PR293 pending below |99 native/manager/RPC tests; exact shell identity and keyed legacy rejection |
| Factory governance boundary | PR187 mergeddev905b4b10a2553f56625331eefcade4794589a188; trusted automatic promotion pending below |184 hosted boundary tests, zero skips; actual MCP→HTTP→runner→SQLite admission, owned-child restart/replay and revoked capability |
| Official ACP SDK candidate | Meta PR401 mergeddev48e67faff5aa9f320f371f985dd599efdf82bde0 |157/157 package cases including22 SDK stdio cases; officialSDK1.4.0/exactZod4.3.6 dev-only; no runtime replacement or publication |

Hub production deployment6413695862 / VercelJ1pG3JEVZVs31aEHNw3QmzEju2dc serves exact77445c01. The reviewed and merged UI trees match. Public sign-in rendered at1440×1000 and390×844 without horizontal overflow. This is public smoke, not authenticated workflow acceptance. Hosted ordinary CI retains its existing retry setting; focused independent checks ran without retries. The25 ordinary skips are disclosed and do not apply to the strict native qualification lane.

The owner previously authorized the Hub360 release review exception. After independent review and all required checks passed, exact-head admin squash was used because GitHub required one external review. No test gate was waived. Gateway/Factory use their normal protected release routes. Factory must preserve active workers and use only its trusted promoter; no direct dev→main PR or flag activation is authorized by these tests.

## Scope of the completed work

Jobs: finance checkpoints now bind parser version3; historical incompatible cursors return409. Booking PATCH validates and transacts coupled changes, rolling back on invalid invoice/event type or audit failure. Server APIs return generic failures. Native stock fixtures include archived_at. The selected corpus fixture uses actual vector(1536), HNSW indexes and hash-pinned serving trigger, with handler ownership, replay, deletion and RLS tests. The CI guard rejects missing, skipped or failed selected suites. Backend fault injection remains excluded and was not rerun.

UI: keyboard agent selection/task entry uses the existing handlers; task entry uses the native shared Dialog. Pixel cleanup continues under reduced motion. Actual classic/Habbo Pixi pulse, reaction and hover effects honor initial/live preferences and clean up listeners. Rapier physics continues. Evidence includes18 component/lifecycle browser cases and9 native WebGL/physics cases across Chromium, Firefox and WebKit,11 native unit cases,30 critical fixture cases and13 Chromium navigation cases. These are component/engine fixtures, not the full authenticated Workshop.

Agents: the support-floor task now has exact-runtime evidence. Gateway repair binds outcome shell identity to its authenticated connection and preserves invocation-key presence so legacy calls cannot silently discard retry semantics. Factory fixtures exercise actual denied/accepted admission and restart/replay effects. Official SDK reuse is being qualified outside the runtime to avoid maintaining another wire dispatcher, while preserving current session behavior until its contract is settled.

## Remaining work and boundaries

1. **Jobs/stock operational closure:** booking status commits still precede best-effort stock realization/release. A process loss can strand an effect; a durable outbox/reconciliation contract and its atomic admission must be implemented. See the paired source TODOs and[booking-stock proposal](../../../proposals/2026-09-12-hub-booking-stock-postcommit-recovery.md). Selected native tests do not certify every producer/provider, old-worker drain, production migration adoption or crash/restore behavior. Driver backend-loss qualification remains gated.
2. **UI:**[bounded remaining consumer plans](../../phases/13-ui-qualification/13-REMAINING-CONSUMER-PLANS.md) cover relationship/element/camera keyboard equivalence and concrete Reliability chart filter/legend/Sankey alternatives. Full Workshop composition, authenticated Supabase/ERP/logout/revocation, native assistive technology and real devices remain open. A non-production identity target has been requested; no credentials or production identity were invented.
3. **Governance:** actual budget exhaustion, mutable tool/schema/model/image identity, expiry policy and external executor effects remain unqualified. Phase admission is not proof of all agent side effects. ACP needs persistent caller→provider session mapping, load/restart and late-update fencing before adoption; credential-free examples do not prove the chosen real harness/provider. Current published shared/bridge packages are not the newest sender generation, and workstation-image adoption remains separate.
4. **Security findings outside these repairs:** attachment read/download/link/unlink still need linked-record/module/owner authorization. Link admission can race the sweeper, and booking deletion can leave references. Keep the sweeper cron disabled; see[review follow-ups](../../../proposals/2026-09-12-360-continuation-review-followups.md).
5. **Rest of360:** dependency advisory/consumer adoption, configured Sentry/PostHog and real alert delivery, full containers/readiness/shutdown, load/SLO and cross-store restore/erasure, and semantic proposal cleanup remain open. No broad production-ready or whole-platform security certification is made.

## Progress method

193/229 original scoped tasks are complete (84.3%), up from190/229 (83.0%). Three credits close actual planned deliverables: native corpus qualification, exact bridge engine-floor qualification, and the canvas audit with precise follow-up plans. The audit credit does not mean those follow-up repairs are implemented. No whole requirement is independently closed. Newly discovered findings are disclosed separately; the old denominator is preserved for comparability.

See[the category table](PROGRESS-2026-09-12.md) and[full task map](PROGRESS-2026-09-12.json). Receipts are copied into[priority-delivery-2026-09-12](priority-delivery-2026-09-12/manifest.json); historical source-only receipts retain their original limits, while later release receipts establish adoption for their exact slices.

## Final promotion updates

ACP PR401 is merged to dev48e67faff5aa9f320f371f985dd599efdf82bde0 after all four hosted checks passed. Production source is unchanged; archive exclusion and normal candidate typecheck are verified. Gateway and Factory final promotion receipts remain pending their current gates.

Independent final task audit by review_gateway_takeover recomputed89 plans/229 tasks (193 complete,29 partial,7 without receipts), checked the three new task credits against actual receipts and canonical scopes, and resolved relative documentation links. No material correction or whole-requirement closure was warranted. Final receipt hashes are regenerated after release monitoring.
