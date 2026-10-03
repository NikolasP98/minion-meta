# Hub and gateway readiness implementation

The user authorized all 97 findings after reviewing the October 2 recon. The second FACES read-only pass adds 10 confirmed findings plus one reproduced baseline device-auth defect plus eight parent-review findings (116 tracked total). This program owns their implementation; the historical 360 task denominator is unchanged.

## Evidence and completion

`findings.json` is the per-finding implementation ledger. Each finding requires source changes (or demonstrated existing satisfaction), a meaningful regression, independent review, and a recorded remaining runtime gate. Local validation, hosted CI, merge, deployment, and live acceptance are separate statuses. A placeholder, TODO, passing mock, or prepared draft is not closure.

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

## Draft qualification

[Hub draft PR431](https://github.com/NikolasP98/minion_hub/pull/431) now contains checkpoint `f333cbc2`, including HC-033 scheduling recovery, formatting and clean-checkout CI fixes. Refreshed hosted CI is running. The prior checkpoint passed three PostgreSQL jobs and critical journeys; unit tests had one stale warning-copy assertion (5,353 passed), while dependency-browser and QA bootstrap exposed generated-config/import assumptions. The seed label is now attached. Money and payment-plan recovery remain uncommitted review candidates. No merge or production release was performed.

## Register

| ID | Priority | Batch | State | Finding |
|---|---|---|---|---|
| GW-001 | P0 | gateway-security | implemented-awaiting-review | Chat events are broadcast across organizations when the payload has no top-level agent id |
| GW-002 | P1 | gateway-security | implemented-awaiting-review | Session and chat methods bypass assigned-agent authorization when the selector is sessionKey |
| GW-003 | P1 | gateway-security | implemented-awaiting-review | Any authenticated write-scoped user can join and mutate any guessed workshop room |
| GW-004 | P1 | gateway-security | implemented-awaiting-review | Normal users can enumerate and invoke globally registered nodes and browser relays |
| GW-005 | P1 | gateway-security | implemented-awaiting-review | Events, raw logs, and usage endpoints expose gateway-global operational data to normal users |
| GW-006 | P1 | gateway-security | implemented-awaiting-review | JWT revocation neither disconnects active sockets nor survives gateway restart |
| GW-007 | P1 | gateway-security | implemented-awaiting-review | Concurrent connect frames can authenticate one socket twice and leave a ghost client entry |
| GW-008 | P1 | gateway-lifecycle | locally-verified-awaiting-release | bestEffort delivery without an onError callback acknowledges and deletes partially failed queue entries |
| GW-009 | P1 | gateway-lifecycle | queued | A single cleanup error or hung channel stop aborts the remaining gateway shutdown sequence |
| GW-010 | P1 | gateway-lifecycle | queued | Gateway startup creates background resources that are not reliably owned or stopped |
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
| HC-024 | P1 | hub-reactivity-accessibility | queued | Older reliability responses can overwrite newer range/filter/host selections |
| HC-026 | P1 | hub-reactivity-accessibility | queued | Nested delete buttons bubble Enter into card navigation; Flow and Workshop also mishandle Space |
| HC-028 | P1 | hub-reactivity-accessibility | queued | Hand-rolled overlays bypass the shared dialog contract; HostsOverlay even swallows Escape from its content |
| HS-001 | P1 | hub-authority-jobs | implemented-awaiting-integration | Anonymous callers can trigger global marketplace synchronization |
| HS-002 | P1 | hub-authority-jobs | queued | Capability enforcement does not cover several privileged platform mutations |
| HS-004 | P1 | hub-authority-jobs | spec-review | The automatic backup and chat/unified-event retention scheduler has no production entrypoint |
| HS-009 | P1 | hub-money | queued | Stored-value balances add nominal amounts across currencies |
| HS-010 | P1 | hub-money | queued | Manual credit adjustments have no idempotency key |
| HS-011 | P1 | hub-money | queued | Ticket submission has no idempotency key |
| HS-012 | P1 | hub-money | queued | Any payment method whose identifier is credit debits stored value |
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
| GW-015 | P2 | gateway-lifecycle | implementing | The write-ahead delivery queue provides at-least-once replay but lacks per-payload checkpoints/idempotency |
| GW-016 | P2 | gateway-lifecycle | queued | Memory ingest/delete treats every HTTP response as success and has no bounded retry/drain |
| GW-017 | P2 | gateway-lifecycle | queued | Global five-second event sampling drops unrelated tenants' message/tool records before storage |
| GW-018 | P2 | gateway-ci-shells | queued | The nightly wrapper reports success after dispatch and does not reflect the child DEV CI conclusion |
| GW-019 | P2 | gateway-ci-shells | queued | Required CI runs unit-style shards while tracked e2e/live suites remain outside every workflow |
| GW-020 | P2 | gateway-ci-shells | queued | The durable shells receiver is present, but the sender and lifecycle endpoints remain incomplete |
| HC-005 | P2 | hub-mutations | implemented-awaiting-review | Event-kind create, rename, recolor, default, and delete ignore rejected responses |
| HC-006 | P2 | hub-mutations | implemented-awaiting-review | Pulse proposal editing closes and discards the draft on any HTTP failure |
| HC-009 | P2 | hub-calendar | implemented-awaiting-integration | Date-only quick ranges mix local calendar arithmetic with UTC serialization |
| HC-010 | P2 | hub-calendar | implemented-awaiting-integration | Quick-range 'now' freezes at component mount |
| HC-014 | P2 | hub-calendar | queued | Built-in status, kind, service, and tag lanes look draggable but cannot reclassify |
| HC-016 | P2 | hub-calendar | queued | Calendar↔Table/Board switching destroys runway and fan interaction state |
| HC-017 | P2 | hub-calendar | queued | Multi-tag bookings are filed under only the first server-ordered tag |
| HC-018 | P2 | hub-calendar | queued | Loading a new week can add lanes and re-divide every visible day |
| HC-019 | P2 | hub-calendar | queued | Custom booking fields appear in calendar Table/Board but disappear from Bookings and the detail drawer |
| HC-021 | P2 | hub-calendar | queued | Month view drops ticket split, drag/resize, external drop, hover detail, and grouped-visit fan behavior |
| HC-022 | P2 | hub-calendar | queued | Bookings outside configured hours can render under the sticky header or beyond the track |
| HC-025 | P2 | hub-reactivity-accessibility | queued | Reliability mount can issue duplicate full data batches |
| HC-027 | P2 | hub-reactivity-accessibility | queued | Several role=button controls omit required Space behavior or all keyboard behavior |
| HC-029 | P2 | hub-reactivity-accessibility | queued | Date-range configuration menu lacks composite keyboard focus and coarse-pointer target sizing |
| HC-030 | P2 | hub-reactivity-accessibility | queued | Core interactive systems remain multi-thousand-line change hotspots |
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
| HS-029 | P2 | hub-money | queued | The supposedly append-only POS credit ledger grants UPDATE and DELETE |
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
| HS-017 | P3 | hub-money | implementing | Due schedules are not required to reconcile to plan principal |
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
| GW-022 | P1 | hub-mutations | spec-review | Marketplace install writes an unused bundle without registering a runnable gateway agent |
| UI-002 | P2 | hub-reactivity-accessibility | queued | Calendar toolbar controls overlap vertically on a narrow mobile viewport |
| HC-035 | P1 | hub-mutations | implementing | Payment-plan creation permits a duplicate POST after a lost or malformed acknowledgement |
