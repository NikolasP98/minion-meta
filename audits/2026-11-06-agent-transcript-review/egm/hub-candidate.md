# C03–C05 scratch candidates

Status: design candidates implemented and locally exercised in private scratch source snapshots. No product checkout, commit, production endpoint, provider call, or shared QA stack was changed. Dependencies are symlinked installed artifacts, not a fresh locked installation.

Pins: Hub master `1f1ab6a327b347645aeff16f5bd675b8d9fbf54d`; Gateway DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd`.

## Selected changes and alternatives

### C03 — native read-only booking preflight

`prepareOccurrenceInTx` factors the actual native event-type/resource/availability/busy-interval/computeSlots selection out of `bookOccurrenceInTx`. Both preview and the write transaction call it. There is one slot algorithm. The helper is still inside the caller's `withOrgCore` scope; no context, profile, or RLS identity is replaced.

`previewAssistantBooking` runs only selects. It resolves service title, exact resource ID/name/timezone, existing explicit CRM contact ID/display name, UTC start/end, the supplied attendee fields and notes, and explicit `availability: available-at-preview`, `reservesSlot: false`. If no CRM ID was supplied it honestly reports `contactResolution: resolve-or-create-on-confirm`; phone/email contact lookup/creation is deferred, rather than fabricating an existing contact identity. Business local rendering uses the returned resource timezone and absolute instants. The preview does not reserve the slot or promise subsequent availability.

The agent POST now calls this preflight. Explicit nonexistent, foreign, and soft-deleted contact IDs are rejected. Creation receives `strictContactReference: true`; its actual write transaction revalidates explicit contact and all native slot checks. The shared UI's existing stale-contact fallback remains the default when that flag is absent. Optional resource selection can be recomputed on commit when no resource was explicitly supplied; a preview is not a binding reservation or signed capability.

The existing scheduling field-level convention masks attendee email/phone, while names are returned by the existing shared booking list. Preview follows that same convention, using trusted assistant capabilities. Contact display name and resource/service labels remain visible. The existing commit response still returns the raw created booking, as before; this candidate does not claim to redesign all write-response field masking.

Alternatives considered: merely echoing the requested IDs fails semantic validation; calling creation in a rollback transaction can run events/contact side effects and is not a safe read-only contract; copying slot computation would create a second algorithm. Selected native extraction has a larger shared-service diff, so nearby original override and group-create tests are included. Strict explicit contact behavior is confined to agent creation.

### C04 — assistant-only bounded list and exact count

`queryAssistantBookings` reuses extracted shared filter construction. Its list SELECT includes `count(*) over()` and deterministic `(start_time DESC, id DESC)` ordering, so total and rows come from one SQL snapshot. It returns `{bookings,total,returned,truncated,limit,mode}`. Default and maximum list limit remain 500. Count mode uses a scoped `count(*)` SELECT, returns no booking rows, and is explicitly labeled `mode: count`. The shared UI `listBookings` array contract and its original 500 default/2000 maximum are preserved.

The assistant route validates list limits/mode and explicit invalid/reversed instant filters, preserves inclusive `from`/`to` instant predicates, and passes the original trusted PII-masking decision. Gateway exposes `limit` and `mode`; tool instructions say to use total rather than array length for counts and disclose truncation.

This selected alternative is a bounded list/count contract, not page enumeration. There is no cursor or next page. Callers must narrow filters for a complete list; 501 records tied at the exact same time can remain truncated. Exact totals remain available. A cursor variant would support enumeration but adds continuation stability/authority semantics outside this bounded candidate. The window-count variant also scans the scoped matching set to obtain its total; no production performance claim is made.

### C05 — agent calendar days, explicit all-time and period disclosure

The dashboard `parsePeriod` file and absent-filter behavior are unchanged. New agent-only `parseAssistantPeriod` uses the existing strict Gregorian `parseDateKey`, `instantDateKey` and `resolvePeriodWindow` helpers. Explicit agent `from`/`to` must be `YYYY-MM-DD` calendar dates; timestamps, empty strings, impossible dates, reversed ranges, invalid buckets/ranges and `range=all` combined with dates reject with a field-specific 400. This narrows the formerly permissive direct API inputs deliberately; Gateway descriptions already requested ISO dates and now state the exact calendar-day contract.

The route loads the owning business timezone from `getFinSettings`. Inclusive requested local days resolve to `[from local midnight, midnight after to)` UTC instants, including a 23-hour DST day. One-sided bounds remain open. An absent filter retains a rolling twelve-month selection, resolved to inclusive business calendar days, and is disclosed as `mode: rolling-12-months`; the dashboard's own raw rolling-time parser remains untouched. Explicit `range=all` yields null bounds. The response echoes resolved `period` and `periodSemantics` (mode, timezone, calendar bounds, inclusive lower/exclusive upper semantics). All four finance service calls receive the exact resolved period.

Gateway exposes `range: all` and forwards it. Its touched bucket schema uses provider-compatible flat enums rather than anyOf. An alternative supporting both arbitrary instants and calendar keys would require a distinct input kind to avoid ambiguous end-day semantics; this candidate chooses calendar days explicitly.

## Executable evidence

Run from `/tmp/minion-agent-egm-20261106-971jwsz3`:

```sh
./node_modules/.bin/vitest run --config vitest.config.mjs tests/hub-route-candidate.test.ts tests/hub-service-candidate.test.ts tests/hub-tools-candidate.test.ts
./node_modules/.bin/vitest run --config hub-candidate.config.mjs --reporter=verbose
```

- `tests/hub-service-candidate.test.ts`: 14 native-service tests using real Drizzle/PGlite PostgreSQL SELECTs/transactions and the actual computeSlots engine. Covers resolved identities, no booking/status-log writes or emitted/creation effects during preview, nonexistent/foreign references, inactive event type/resource, existing same-tenant unassigned resource, soft-deleted explicit contact, already occupied slot before preview, post-preview occupied-slot and stale-contact rejection in actual createBooking, 501 scoped rows plus a foreign-org row, stable tied-start ordering, exact count, unchanged shared cap, masked phone/email, empty/narrow ranges and inclusive equal-time boundaries.
- `tests/hub-route-candidate.test.ts`: 24 real SvelteKit route/parser tests. Auth and service dependencies are synthetic; JSON/body validation and period helper code are real. Covers denied capability, trusted field masking/context, preview-vs-commit dispatch, strict identity flag, completeness metadata, limits/count mode, explicit invalid filters/dates, impossible Gregorian day, timestamp rejection, all-time, masking, business midnight, DST and unchanged dashboard defaults.
- `tests/hub-tools-candidate.test.ts`: 2 actual Gateway tool adapter tests. Hub HTTP/tracking are synthetic. Covers query forwarding, abort signal, bounded/count inputs, explicit all-time and flat enum schema.
- `hub-candidate.config.mjs` adds 32 existing nearby tests: period parser/window, native slot engine, native create override and grouped booking orchestration. Total 72 passing across 7 files (supersedes the initial 67-test result). Its `tests/hub-nearby.setup.ts` stubs unrelated custom-property, finance-settings and POS-settings imports to avoid generated i18n/external service dependencies. The first nearby attempt without these stubs had 59 passing tests and two import failures for absent generated Paraglide code; those were fixture-setup failures, not product regressions. Final command/result is recorded in `hub-nearby-results.log`.
- `hub-baseline-results.log`: the same 26 route/tool assertions against the two pinned original adapters and three original routes produce 21 failures, 5 positive-control passes. Original service list mock preserves its array shape, so metadata failures are behavioral rather than missing mocked exports. Baseline originals were temporarily substituted only in owned scratch files and restored from in-memory byte backups in a finally block. This baseline does not pretend the newly introduced helper already existed in original source.

## Qualification limits and review axes

Standards: files scoped to owned scratch candidates/tests, real native slot logic reused, no any/ts-nocheck, no branch/stash/worktree changes, no external messages or provider/database endpoint calls. Native PGlite fixtures are in-memory and contain synthetic identities only. Original dashboard period parser and UI booking list contract are preserved.

Spec: observable C03 preview validation, C04 explicit completeness/count, and C05 strict agent period semantics are covered. These are reviewed design candidates, not approved/merged/released product fixes.

Unproven: real app_ledger role/GUC policy enforcement, full authenticated route-to-native-service integration in one fixture, actual production schema/migrations/triggers, concurrent commit exclusion, remote database performance, full Hub check/build/test suite, full Gateway suite, live model behavior, deployment and runtime. PGlite replaces withOrgCore with an actual transaction but does not install RLS policies; it proves scoped SQL predicates and native behavior, not policy installation. Native preview fixture stubs the serviceRulesOf mapper while exercising computeSlots itself; unchanged original slot-rule tests exercise the engine's service-rule behavior. Finance aggregates are mocked at the route boundary; period resolution and forwarding, not real finance SQL totals, are proven. Root owns the formal proposal/spec and remaining qualification ledger.


## Stage 9 CD-3 coverage closure

The native preview suite now contains five direct rejection cases required by the selected design: inactive event type, inactive assigned resource, existing same-tenant unassigned resource, soft-deleted explicit contact, and a slot already occupied before preview starts. Each invokes actual `previewAssistantBooking`, captures every fixture table before and after, and inspects the real Drizzle SQL statement log. Each proves at least one SELECT ran, no INSERT/UPDATE/DELETE/DDL statement ran, all table rows remained unchanged, and event/contact-creation/accrual stubs were never invoked. All five passed without any source modification.

Current superseding results: `hub-cd3-results.log` records **14/14 native-service tests passing**; `hub-nearby-results.log` records **72/72 tests passing across 7 files**, including the 32 original nearby tests. The focused candidate count is now 40 (14 service + 24 route/parser + 2 tool). These counts cover this owned Hub candidate config; the root's separate finance chain qualification is not included or modified here. The original baseline log remains historical evidence for its original 26 route/tool assertions and was not rerun for these additional native-service cases.
