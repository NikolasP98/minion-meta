# Hub and gateway readiness implementation

The user authorized implementation of every readiness finding. The register now contains 152 findings across Hub, Gateway, FACES, notifications and affected Site consumers. The second FACES recon was read-only. The notification platform contract passed independent and parent review; its narrow tenant/audience patch is accepted, while the broader platform remains to implement. No live notification was sent. UI governance receives evidence-backed lessons from each correction. The historical 360 task denominator is unchanged.

## Evidence and completion

`findings.json` is the per-finding implementation ledger. Each finding requires source changes (or demonstrated existing satisfaction), a meaningful regression, independent review, and a recorded remaining runtime gate. Local validation, hosted CI, merge, deployment, and live acceptance are separate statuses. A placeholder, TODO, passing mock, or prepared draft is not closure. Every finding in the Lavish report must expose before/after evidence: screenshots where captured, frozen source anchors, exact committed changes and console/test receipts otherwise. Missing after evidence stays explicitly pending. Performance claims require the measured workload, environment, sample count and observation window; test duration is not p99 latency.

Security and data scope approval comes from the user selecting every finding. Human merge remains required. Production migration, release, live alert configuration, and customer-data writes require their own concrete qualification and authorization. Local disposable fixtures are authorized.

## Isolation and ownership

Work runs in new independent feature checkouts. Original dirty repositories and immutable audit snapshots remain untouched. Three Sol workers operate bounded batches; the root orchestrator reviews each result and owns this ledger. Hub workers share a checkout with disjoint file ownership and scoped staging. Heavy suites and the local browser are serialized by the root.

## Sequence and dependencies

1. Gateway isolation, honest UI mutations and trustworthy test gates.
2. Hub authorization/jobs, money invariants, inventory/booking transactions and durable effects.
3. Calendar and shared UI reactivity/accessibility; measured module extraction.
4. Gateway shutdown/delivery/leases, CI and durable shell integration.
5. Correct financial metrics, request-lifetime telemetry, release qualification and operational backlog health.
6. Integrated checks and independent review; create concrete draft PRs and retain the final human release gate.

Batch specs define smaller implementation slices with separate tests. Existing open PRs are sources to inspect, not assumed merged. In particular Hub #340 may supply reviewed money/booking corrections; #358 is a separate experimental JEV deployment.

## User-requested checkpoint — 2026-10-03

Implementation is paused at the user's request for continuation next week. [RESUME-2026-10-03.md](RESUME-2026-10-03.md) is the authoritative restart entry, with exact source manifests, failed tests, owner handoffs and the merge assessment. There are **152 findings**, including the newly recorded ordinary-mention contrast follow-on HC043. Status counts do not imply release completion.

**Hub PR431 remote e1979fbd:** all12 checks/statuses green, including Vercel. No merge conflict; draft and REVIEW_REQUIRED. This is the strongest verified remote checkpoint, but is not currently mergeable while draft/review-blocked; human approval and marking ready remain required. New signed local875fb043 adds the independently reviewed, locally qualified HC039/042 mention changes; it is not pushed or covered by those remote checks. HC036 and notification S5 WIP remain outside both committed checkpoints.

**Site PR33 cb9cd1a5:** check-and-build and other code checks pass; Vercel explicitly reports Deployment was blocked. It remains draft and is not an all-green release candidate.

**Gateway PR296 remote caae4ac54:**20 successes,10 scope-skips, no failures or conflicts. Hold: GW023 P0 tenant-event fix remains uncommitted, and GW024 P0 browser-credential escalation remains spec/proof only. Green CI does not close security review. Seven accepted local commits in the separate `gateway-review` checkout through b43c6be are not on this PR. Their exact source/check and focused tests pass, but combined uninstrumented E2E twice exited a worker unexpectedly; isolated/instrumented passes do not resolve this. Native config recovery and GW018 helper drafts remain uncommitted and unaccepted.

**Notifications:** slices1–4 foundation is committed; S5 focused audience23/23 passes, but the full298-case jobs run records275 passed,10 failed and13 pending. This WIP is not mergeable. Durable inbox, producers, preferences, reports, releases and agent-defined artifacts remain open. Production test writes/sends:0.

**Signing:** configured native1Password helper successfully signed meta50374ac2 and Hub875fb043 at the pause; previous SSH-agent fallback failures remain recorded. No signing bypass or permanent configuration change.

## Register

| ID | Priority | Batch | Status | Finding |
| --- | --- | --- | --- | --- |
| GW-001 | P0 | gateway-security | implemented-awaiting-review | Chat events are broadcast across organizations when the payload has no top-level agent id |
| GW-002 | P1 | gateway-security | implemented-awaiting-review | Session and chat methods bypass assigned-agent authorization when the selector is sessionKey |
| GW-003 | P1 | gateway-security | implemented-awaiting-review | Any authenticated write-scoped user can join and mutate any guessed workshop room |
| GW-004 | P1 | gateway-security | implemented-awaiting-review | Normal users can enumerate and invoke globally registered nodes and browser relays |
| GW-005 | P1 | gateway-security | partially-implemented | Events, raw logs, and usage endpoints expose gateway-global operational data to normal users |
| GW-006 | P1 | gateway-security | implemented-awaiting-review | JWT revocation neither disconnects active sockets nor survives gateway restart |
| GW-007 | P1 | gateway-security | implemented-awaiting-review | Concurrent connect frames can authenticate one socket twice and leave a ghost client entry |
| GW-008 | P1 | gateway-lifecycle | locally-verified-awaiting-release | bestEffort delivery without an onError callback acknowledges and deletes partially failed queue entries |
| GW-009 | P1 | gateway-lifecycle | locally-verified-awaiting-release | A single cleanup error or hung channel stop aborts the remaining gateway shutdown sequence |
| GW-010 | P1 | gateway-lifecycle | locally-verified-awaiting-release | Gateway startup creates background resources that are not reliably owned or stopped |
| GW-011 | P1 | gateway-lifecycle | queued | Cron timeout and service stop mark work finished without cancelling the underlying agent run |
| GW-012 | P1 | gateway-lifecycle | queued | Brain-vector leases are not fenced and external effects have no durable receipt boundary |
| GW-013 | P1 | gateway-lifecycle | queued | Workshop binary sync bypasses the gateway's slow-consumer and bounded-work controls |
| HC-001 | P1 | hub-mutations | implemented-awaiting-review | Bulk tag writes treat every HTTP response as success |
| HC-002 | P1 | hub-mutations | implemented-awaiting-review | Selections survive data/query replacement and can act on hidden record IDs |
| HC-003 | P1 | hub-mutations | implemented-awaiting-review | Compound entity-plus-tag saves report success after the tag write fails |
| HC-004 | P1 | hub-mutations | implemented-awaiting-review | Add gateway is an unchecked dual write that can show success with half the gateway missing |
| HC-007 | P1 | hub-mutations | implemented-awaiting-review | Voided tickets render as green Submitted because the client checks the wrong status literal |
| HC-008 | P1 | hub-calendar | implemented-awaiting-integration | Calendar loads in the organization timezone but lays out and writes in the browser timezone |
| HC-011 | P1 | hub-calendar | queued | A drag can partially commit custom lane, group members, and time/resource as independent writes |
| HC-012 | P1 | hub-calendar | locally-verified-awaiting-release | In-flight week responses can overwrite post-mutation data or resurrect evicted weeks |
| HC-013 | P1 | hub-calendar | locally-verified-awaiting-release | A failed visible week is rendered as a genuinely empty schedule until another scroll settles |
| HC-015 | P1 | hub-calendar | queued | Board reclassification is pointer-drag-only |
| HC-024 | P1 | hub-reactivity-accessibility | locally-verified-awaiting-release | Older reliability responses can overwrite newer range/filter/host selections |
| HC-026 | P1 | hub-reactivity-accessibility | hosted-verified-awaiting-release | Nested delete buttons bubble Enter into card navigation; Flow and Workshop also mishandle Space |
| HC-028 | P1 | hub-reactivity-accessibility | queued | Hand-rolled overlays bypass the shared dialog contract; HostsOverlay even swallows Escape from its content |
| HS-001 | P1 | hub-authority-jobs | implemented-awaiting-integration | Anonymous callers can trigger global marketplace synchronization |
| HS-002 | P1 | hub-authority-jobs | queued | Capability enforcement does not cover several privileged platform mutations |
| HS-004 | P1 | hub-authority-jobs | spec-review | The automatic backup and chat/unified-event retention scheduler has no production entrypoint |
| HS-009 | P1 | hub-money | locally-verified-awaiting-release | Stored-value balances add nominal amounts across currencies |
| HS-010 | P1 | hub-money | spec-in-progress | Manual credit adjustments have no idempotency key |
| HS-011 | P1 | hub-money | spec-in-progress | Ticket submission has no idempotency key |
| HS-012 | P1 | hub-money | locally-verified-awaiting-release | Any payment method whose identifier is credit debits stored value |
| HS-013 | P1 | hub-money | queued | Settled plans and concurrent final installments can be overpaid |
| HS-018 | P1 | hub-stock-bookings | queued | Concurrent first movements into an absent bin can lose on-hand quantity |
| HS-019 | P1 | hub-stock-bookings | queued | Stock source deduplication is check-then-insert without a database unique key |
| HS-020 | P1 | hub-stock-bookings | queued | Booking conflict checks do not serialize overlapping inserts |
| HS-021 | P1 | hub-stock-bookings | queued | Committed bookings and tickets can permanently miss their stock effects |
| HS-022 | P1 | hub-stock-bookings | queued | Assistant reschedule is non-atomic and drops package/payment-plan funding |
| HS-025 | P1 | hub-metrics | queued | Finance and CRM rankings aggregate mixed currencies as raw nominal values |
| MR-OP-001 | P1 | hub-authority-jobs | implemented-awaiting-integration | Scheduling booking reads bypass scheduling:view |
| MR-OP-002 | P1 | hub-money | queued | Voiding a package sale races a concurrent session redemption |
| TQ-001 | P1 | hub-test-quality | locally-verified | Nine Svelte reactive tests pass without executing their $effect.root callbacks |
| TQ-002 | P1 | hub-test-quality | locally-verified | The workforce proxy integration test exercises a copied verifier that has drifted from the runtime middleware |
| TQ-003 | P1 | hub-test-quality | hosted-verified-awaiting-release | Hub CI always skips the native editor, paste, and sanitizer security qualification |
| GW-014 | P2 | gateway-lifecycle | queued | Node invocation has no pending-request cap, timeout clamp, or socket backpressure check |
| GW-015 | P2 | gateway-lifecycle | locally-verified-awaiting-release | The write-ahead delivery queue provides at-least-once replay but lacks per-payload checkpoints/idempotency |
| GW-016 | P2 | gateway-lifecycle | queued | Memory ingest/delete treats every HTTP response as success and has no bounded retry/drain |
| GW-017 | P2 | gateway-lifecycle | queued | Global five-second event sampling drops unrelated tenants' message/tool records before storage |
| GW-018 | P2 | gateway-ci-shells | partially-implemented | The nightly wrapper reports success after dispatch and does not reflect the child DEV CI conclusion |
| GW-019 | P2 | gateway-ci-shells | queued | Required CI runs unit-style shards while tracked e2e/live suites remain outside every workflow |
| GW-020 | P2 | gateway-ci-shells | queued | The durable shells receiver is present, but the sender and lifecycle endpoints remain incomplete |
| HC-005 | P2 | hub-mutations | locally-verified-awaiting-release | Event-kind create, rename, recolor, default, and delete ignore rejected responses |
| HC-006 | P2 | hub-mutations | locally-verified-awaiting-release | Pulse proposal editing closes and discards the draft on any HTTP failure |
| HC-009 | P2 | hub-calendar | implemented-awaiting-integration | Date-only quick ranges mix local calendar arithmetic with UTC serialization |
| HC-010 | P2 | hub-calendar | implemented-awaiting-integration | Quick-range 'now' freezes at component mount |
| HC-014 | P2 | hub-calendar | queued | Built-in status, kind, service, and tag lanes look draggable but cannot reclassify |
| HC-016 | P2 | hub-calendar | queued | Calendar↔Table/Board switching destroys runway and fan interaction state |
| HC-017 | P2 | hub-calendar | queued | Multi-tag bookings are filed under only the first server-ordered tag |
| HC-018 | P2 | hub-calendar | queued | Loading a new week can add lanes and re-divide every visible day |
| HC-019 | P2 | hub-calendar | queued | Custom booking fields appear in calendar Table/Board but disappear from Bookings and the detail drawer |
| HC-021 | P2 | hub-calendar | queued | Month view drops ticket split, drag/resize, external drop, hover detail, and grouped-visit fan behavior |
| HC-022 | P2 | hub-calendar | queued | Bookings outside configured hours can render under the sticky header or beyond the track |
| HC-025 | P2 | hub-reactivity-accessibility | locally-verified-awaiting-release | Reliability mount can issue duplicate full data batches |
| HC-027 | P2 | hub-reactivity-accessibility | queued | Several role=button controls omit required Space behavior or all keyboard behavior |
| HC-029 | P2 | hub-reactivity-accessibility | queued | Date-range configuration menu lacks composite keyboard focus and coarse-pointer target sizing |
| HC-030 | P2 | hub-reactivity-accessibility | partially-implemented | Core interactive systems remain multi-thousand-line change hotspots |
| HC-031 | P2 | hub-test-quality | implemented-awaiting-review | Client interaction E2E coverage is outside the default CI gate and many specs can skip entirely |
| HS-003 | P2 | hub-authority-jobs | locally-verified | Removed memberships can remain authorized in the identity cache for up to 60 seconds |
| HS-005 | P2 | hub-authority-jobs | locally-verified-awaiting-release | A stale meta-sync job can be reclaimed repeatedly by concurrent workers |
| HS-006 | P2 | hub-authority-jobs | locally-verified | Finance cache keys ignore whether stock accounting is enabled |
| HS-008 | P2 | hub-test-quality | locally-verified-awaiting-release | Five SQL-critical test files are excluded from ordinary tests and absent from explicit CI lanes |
| HS-014 | P2 | hub-money | queued | Stored payment-plan status drifts from ticket-derived reality |
| HS-015 | P2 | hub-money | queued | Package sessions are consumed before the sale or booking is committed |
| HS-023 | P2 | hub-stock-bookings | queued | Series cancellation commits each occurrence independently |
| HS-024 | P2 | hub-stock-bookings | queued | Concurrent bookings for a new person can create an orphan duplicate contact |
| HS-026 | P2 | hub-metrics | locally-verified | Negative profit and margin are clamped to zero |
| HS-027 | P2 | hub-metrics | locally-verified | Void-rate and rankings use inconsistent invoice populations |
| HS-028 | P2 | hub-metrics | implementing | Binary floating-point rounding produces 1.00 for 1.005 |
| HS-029 | P2 | hub-money | locally-verified-awaiting-release | The supposedly append-only POS credit ledger grants UPDATE and DELETE |
| OB-001 | P2 | observability | implementing | Server telemetry delivery is not tied to request lifetime |
| OB-002 | P2 | observability | queued | Source-map and live alert qualification remains incomplete |
| TQ-004 | P2 | hub-test-quality | spec-review | The workforce dashboard E2E passes when the company switcher behavior in its title is absent |
| TQ-005 | P2 | hub-test-quality | spec-review | The tag-cell E2E can pass without selecting a tag or rendering the chip behavior named by the test |
| TQ-006 | P2 | hub-test-quality | spec-review | The POS category filter E2E accepts a no-op filter despite a multi-category seed |
| TQ-007 | P2 | hub-test-quality | spec-review | Seeded E2E suites turn missing deterministic contract fixtures into runtime skips after the page loads |
| TQ-008 | P2 | hub-test-quality | locally-verified-awaiting-release | PostgreSQL result contracts accept wholesale assertion deletion as long as one passing test remains per file |
| UI-001 | P2 | hub-mutations | implemented-awaiting-review | Opening bulk tags expands the mobile document beyond the viewport |
| OP-001 | P2 | operations | implemented-awaiting-review | Current planning state still lists attachment defects fixed on master |
| OP-002 | P2 | operations | implemented-awaiting-review | Contributor guidance contradicts the canonical branch and database/auth model |
| OP-003 | P2 | operations | implemented-awaiting-runtime | The meta backlog contains 367 open monitor alerts and repeated reconcile execution failures |
| HC-020 | P3 | hub-calendar | queued | Category is offered for color but cannot be selected as a subcolumn |
| HC-023 | P3 | hub-calendar | queued | Truncated calendar lane headers rely on native title text |
| HS-007 | P3 | hub-authority-jobs | locally-verified | Page commits during finance sync are invisible until the whole job completes |
| HS-016 | P3 | hub-money | queued | Equal grant allocation drops the rounding residual |
| HS-017 | P3 | hub-money | locally-verified-awaiting-release | Due schedules are not required to reconcile to plan principal |
| MR-OP-003 | P3 | hub-stock-bookings | queued | Stock valuation persists unquantized binary-float artifacts |
| FACES-001 | P1 | faces-production | locally-verified-awaiting-release | A 4.62 GB core dump is retained inside the durable FACES state volume |
| FACES-002 | P1 | faces-production | locally-verified-awaiting-release | The raw FACES gateway port is reachable from the public internet and bypasses the edge |
| FACES-003 | P1 | faces-production | queued | Both configured WhatsApp accounts are unauthorized while process health remains green |
| FACES-004 | P2 | faces-production | locally-verified-awaiting-release | The explicit persistent debug log has grown to 475 MB without a retention control |
| FACES-005 | P1 | faces-production | queued | The configured Workforce/Paperclip upstream refuses connections |
| GW-021 | P1 | gateway-security | locally-verified | Paired-device authentication returns the stored token hash as a credential and breaks reconnect |
| FACES-PROD-001 | P1 | faces-meta-socials | locally-verified-awaiting-release | The Ads sync deterministically replays one completed 90-day window instead of advancing |
| FACES-PROD-002 | P1 | faces-meta-socials | queued | The UI reports connection and sync activity without exposing the stale paid-data boundary |
| FACES-PROD-003 | P1 | faces-meta-socials | queued | Campaign lead attribution is a July heuristic snapshot, while the UI presents it as an ongoing lead feed |
| FACES-PROD-004 | P2 | faces-meta-socials | queued | Successful post and message jobs conceal partial collection |
| FACES-PROD-005 | P2 | faces-meta-socials | queued | Sync failures retain and expose unbounded provider error payloads |
| HC-032 | P2 | hub-reactivity-accessibility | implemented-awaiting-integration | Team timeline and leave-balance reads hide failures as empty data |
| HC-033 | P2 | hub-mutations | implemented-awaiting-integration | Scheduling link and event-type deletion ignore rejected HTTP responses |
| HS-030 | P2 | hub-authority-jobs | implemented-awaiting-integration | Marketplace filters and sorting operate on an incorrectly filtered truncated population |
| HS-031 | P2 | hub-authority-jobs | implemented-awaiting-integration | Transient marketplace document failures are cached as permanent empty content |
| HC-034 | P1 | hub-mutations | spec-review | Marketplace installation can deliver to the wrong active gateway and duplicate pre-delivery effects on retry |
| GW-022 | P1 | hub-mutations | partially-implemented | Marketplace install writes an unused bundle without registering a runnable gateway agent |
| UI-002 | P2 | hub-reactivity-accessibility | queued | Calendar toolbar controls overlap vertically on a narrow mobile viewport |
| HC-035 | P1 | hub-mutations | locally-verified-awaiting-release | Payment-plan creation permits a duplicate POST after a lost or malformed acknowledgement |
| NOTIF-001 | P1 | notifications | spec-approved | The generic engine records sent before delivery and cannot reliably record failure |
| NOTIF-002 | P1 | notifications | locally-verified-awaiting-release | A Gateway token can insert Pulse cards into an arbitrary organization |
| NOTIF-003 | P1 | notifications | partially-implemented | Notification and reminder settings can be enabled while both production ticks are unscheduled |
| NOTIF-004 | P1 | notifications | partially-implemented | A busy rule can silently discard every matching row after the first 500 |
| NOTIF-005 | P1 | notifications | spec-approved | Scheduling reminders permanently suppress failed, crashed and ambiguous sends |
| NOTIF-006 | P2 | notifications | spec-approved | Low-stock alerts are permanent level alarms rather than threshold crossings |
| NOTIF-007 | P1 | notifications | partially-implemented | Notification rule data is readable by any tenant member and rule semantics are weakly validated |
| NOTIF-008 | P2 | notifications | spec-approved | The bell, notifications page and toast store are not a durable user notification inbox |
| NOTIF-009 | P1 | notifications | partially-implemented | The agent notify_user path bypasses notification policy, uses mismatched authority and drops subject |
| NOTIF-010 | P1 | notifications | spec-approved | Gateway release notifications are best-effort fan-out with version-wide loss and incomplete release provenance |
| NOTIF-011 | P2 | notifications | spec-approved | Pulse settings do not create the configured briefing and approved actions lack executed receipts |
| NOTIF-012 | P1 | notifications | locally-verified-awaiting-release | Hub's deploy migration directory omits the notification and reminder migrations |
| NOTIF-013 | P2 | notifications | spec-approved | There is no configurable financial daily summary; only a global best-effort sync-failure alert |
| NOTIF-014 | P1 | notifications | partially-implemented | Join-request email sends requester identity to every global profile admin, not target-org managers |
| NOTIF-015 | P2 | notifications | spec-approved | Requested, approved and activated membership are not distinct durable events |
| NOTIF-016 | P2 | notifications | spec-approved | Hub has status-bearing records but no notification subscription registry |
| NOTIF-017 | P2 | notifications | spec-approved | Agent-defined report rules and visual artifacts have no durable notification authority model |
| NOTIF-018 | P1 | notifications | implemented-awaiting-release | Pending join-request lookup ignores organization despite per-org uniqueness |
| GW-023 | P0 | gateway-security | implemented-awaiting-commit | Raw agent and run-metadata streams bypass the chat tenant-audience guard |
| GW-024 | P0 | gateway-security | spec-approved | Linked non-admin browsers receive a gateway admin secret and can omit the tenant JWT |
| GW-025 | P1 | gateway-security | spec-approved | Orchestration manifests and filesystem selectors lack tenant ownership |
| SITE-001 | P1 | site-integration | hosted-verified-awaiting-release | Prelocalized anchors acquire a second English prefix and break prerender |
| SITE-002 | P1 | site-integration | hosted-verified-awaiting-release | OAuth callback redirects to an unvalidated next target |
| SITE-003 | P2 | site-integration | hosted-verified-awaiting-release | Marketing pages emit duplicate locale alternates and an English x-default despite a Spanish default |
| GW-026 | P1 | gateway-lifecycle | locally-verified-awaiting-release | Reliability aggregation failures are returned as successful zero activity |
| SITE-004 | P2 | site-integration | hosted-verified-awaiting-release | Site page width consumes an undefined shared token and has no token-integrity CI gate |
| HS-032 | P2 | hub-reactivity-accessibility | locally-verified-awaiting-release | Skill duration averages weight missing measurements as if they were measured executions |
| HC-036 | P1 | hub-reactivity-accessibility | implementing | Agent settings reads and mutation completions can publish into a different selected agent |
| HS-033 | P1 | hub-authority-jobs | locally-verified-awaiting-release | Reliability HTTP reads omit current capability and exact target authorization |
| HC-037 | P1 | hub-mutations | queued | Workshop workspace loads and writes can erase current state or hide failed persistence |
| HC-038 | P1 | hub-reactivity-accessibility | hosted-verified-awaiting-release | Shared Button overrides consumer roles and roving tabindex |
| HC-039 | P1 | hub-reactivity-accessibility | locally-verified-awaiting-release | Mention alias reads leak rejections and retain unowned cached identities |
| HC-040 | P1 | hub-reactivity-accessibility | queued | Flow export toggles retain another flow’s state and accept stale write rollbacks |
| HC-041 | P1 | hub-reactivity-accessibility | hosted-verified-awaiting-release | Gateway organization identity reads an obsolete field hidden by a coupled test fixture |
| HC-042 | P1 | hub-reactivity-accessibility | locally-verified-awaiting-release | Resolved mentions disappear against user message backgrounds |
| HC-043 | P2 | hub-reactivity-accessibility | queued | Ordinary dark-theme mention text has insufficient contrast; error surfaces need valid measurement |