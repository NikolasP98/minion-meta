---
phase: 13-ui-qualification
plan: "13"
requirements: ["UI-03", "UI-04"]
requirements-completed: []
status: locally-qualified
---

# Inherited Calendar timezone reconciliation

This plan formalizes exact delivery ownership for seven already implemented Calendar files. It does not claim that planning preceded the inherited repair. Root source review and the combined candidate manifest remain the implementation evidence; no new behavioral change was made during reconciliation.

The candidate uses a UTC-neutral display axis and preserves original instants, milliseconds and repeated-hour identity. The installed Event Calendar 5.12.2 uses today's local offset in its original conversion, which caused the previously reproduced placement defect. Calendar state SHA256 is `77f1444e7edba61d3eea7e3e3e62ec9e14e172713ee96732a6f3bfba84206d4f`; SchedulingCalendar is `a763801e6ab77de8d8d2c57e78e27c7de88bf695a93d99b3268498001fe28158`. All seven identities are in `/home/nikolas/.cache/minion-qc/ui-integration-u8r6xtfh/calendar-manifest.json`.

Root repeated both native suites against the final combined Hub source in America/New_York: 27/27 passed, zero skips, 4.78 s. The native runner is Vitest 4.1.10 with actual private cache, denied network and a 1 GiB heap limit. Log: `/tmp/minion-calendar-root-jakp74kj/results.log`. Prior UTC/Kathmandu native runs and root browser 08:00 placement in Lima/New York/Kathmandu remain separate executed receipts. Final mobile toolbar coverage, the 30 mandatory component journeys and full combined Svelte check include this source.

Root independently verified delivery ownership in the unapplied Hub UI packet: all seven paths map to 13-13, native Git patch applicability passes on the immutable base `1df0a9216ad3f7f85d989eb59cfccb779d9f7285`. Packet manifest SHA256 is `da1e9373716217f7c68d80338d884aae9612dd5d19d6622616a2ac4c8125bfaf`; root receipt is `/home/nikolas/.cache/minion-qc/ui-review-packet-ple_be1f/inputs/root-independent-review.json`.

Fold-spanning event end/start projection, overlapping-range queries, initial day/timezone selection and TimeOffCalendar remain paired in the exact source TODOs and `proposals/2026-09-10-hub-calendar-utc-offset-dropped.md`. Ordinary DST tests do not close those distinct cases. No physical device, real authorization, active-source adoption or deployment is certified.
