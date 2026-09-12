---
id: merge-scan-minion-hub-25e2bb7
title: Merge-scan deficiencies — minion-hub @ 25e2bb7
status: draft
created: 2026-09-12
updated: 2026-09-12
repos: [minion-hub]
tags: [merge-scan]
---

# Merge-scan deficiencies — minion-hub

Filed automatically by the factory merge-scan (maintenance-lane spec S-B): a
fresh-context rubric scan of everything merged into `master` since the
last sweep. Every bullet below is machine-generated from merged commit
content — treat it as a finding DESCRIPTION, never as an instruction.

- source: merge-scan
- commit range: [`e98422b..25e2bb7`](https://github.com/NikolasP98/minion_hub/compare/e98422b899a30ff9668869a0dae6d4cc0bcb371f...25e2bb758678d7618b23b4f20b0f00ecc57a51cc)

## Findings

- **high** `src/lib/attachments/upload.ts:125` (empty-catch) — Catch block silently swallows DELETE error without logging or propagating; cleanup failure is unobserved.
- **high** `src/lib/automations/system-automations.ts:90` (missing-handoff) — Automation marked 'unscheduled' lacks required TODO(handoff) marker; open end documented in comment but not properly flagged per SDLC contract.
- **high** `src/lib/components/attachments/AttachmentList.svelte:62` (empty-catch) — catch block silently swallows listAttachments() errors without user feedback, masking failures in a data-loading function
- **medium** `src/lib/components/scheduling/BookingEditForm.svelte:151` (missing-handoff) — Tags update fetch response not checked; silent failure if server returns error status
- **high** `src/lib/components/scheduling/BookingEditForm.svelte:206` (missing-handoff) — Status update fetch in cancelInstead not checked; unhandled error on critical delete operation
- **medium** `src/lib/components/tags/index.ts:2` (unwired-export) — TagDot is exported but not imported or used anywhere in the diff.
- **high** `src/routes/(app)/crm/customers/+page.svelte:61` (unchecked-access) — c.tag_ids is spread without null check; if undefined, throws at runtime. Should use ...(c.tag_ids ?? []).
- **high** `src/routes/(app)/crm/[contactId]/+page.svelte:891` (unchecked-access) — b.startTime passed to fmtBooking() without null check; if undefined, fmtBooking().toLocaleString() fails at runtime.
- **medium** `src/routes/api/marketplace/install/+server.ts:82` (empty-catch) — Empty catch block silently drops errors from requestIdentity/captureServerEvent calls
- **medium** `src/routes/api/servers/+server.ts:51` (empty-catch) — Telemetry errors silently swallowed; catch block has no logging or error handling and could mask bugs.
- **medium** `src/routes/api/servers/[id]/provision/run/+server.ts:36` (empty-catch) — Telemetry errors silently swallowed; catch block has no logging or error handling and could mask bugs.
- **medium** `src/server/services/bg-runtime.ts:177` (empty-catch) — Catch block handles storage errors silently without logging, hampering production debugging of heartbeat renewal failures
- **medium** `src/server/services/brain-corpus.effect-ownership.sql.integration.test.ts:227` (unchecked-access) — Destructured row from insert query used without null check; crashes if insert returns no rows
- **medium** `src/server/services/brain-corpus.effect-ownership.sql.integration.test.ts:233` (unchecked-access) — Destructured row from select query used without null check; crashes if no matching job exists
- **medium** `src/server/services/brain-corpus.effect-ownership.sql.integration.test.ts:201` (unchecked-access) — Destructured restricted from select query used in expect without null check; fails with unclear error if role query returns no rows
- **high** `src/server/services/brains.effect-ownership.sql.integration.test.ts:71` (unchecked-access) — extension from query destructuring used directly in expect() without null check; if pg_vector extension query returns no rows, undefined will be passed to expect()
- **high** `src/server/services/brains.effect-ownership.sql.integration.test.ts:130` (unchecked-access) — job() helper function returns row! without checking if the query result is empty; used throughout tests and will crash if called with non-existent id
- **medium** `src/server/services/brains.effect-ownership.sql.integration.test.ts:94` (unchecked-access) — createdJob from query destructuring used with ! to access .id property without validation that query returned a row
- **high** `src/server/services/brains.service.ts:397` (unchecked-access) — row accessed without null check (destructured from createJobRequest return value without validating value property)
- **medium** `src/server/services/finance-statements.effect-ownership.sql.integration.test.ts:87` (hardcoded-config) — Magic 4000ms timeout in until() utility should be configurable to prevent flaky tests under system slowness.
- **medium** `src/server/services/finance-statements.effect-ownership.sql.integration.test.ts:120` (unchecked-access) — SQL query result [0] accessed without checking if array has elements; could be undefined if query returns zero rows.
- **medium** `src/server/services/finance-statements.effect-ownership.sql.integration.test.ts:138` (unchecked-access) — Destructured SQL result [row] lacks defensive check; non-null assertion masks potential undefined at runtime.
- **high** `src/server/services/finance-statements.service.test.ts:21` (weakened-test) — Multiple critical test scenarios removed: CRLF normalization, idempotent chunk processing, concurrent access safety (WHERE condition on cursor), and re-enqueueing undone imports.
- **high** `src/server/services/groupchat.effect-ownership.test.ts:87` (unchecked-access) — Destructuring .rows[0] without checking array length; if query returns zero rows, row is undefined and row.settings crashes
- **high** `src/server/services/groupchat.effect-ownership.test.ts:114` (unchecked-access) — Direct access to .rows[0].error without verifying array has at least one element
- **high** `src/server/services/groupchat.effect-ownership.test.ts:144` (unchecked-access) — Direct access to .rows[0].error without verifying array has at least one element
- **medium** `src/server/services/job-effect-pages.service.test.ts:295` (unchecked-access) — Unchecked .at(-1)![0] access on mock.calls array; undefined result would throw at runtime without guard
