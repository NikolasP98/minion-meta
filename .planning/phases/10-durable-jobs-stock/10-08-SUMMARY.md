---
phase: 10-durable-jobs-stock
plan: "08"
status: independently_verified_scoped
requirements_completed: []
---

# Explicit disposable SQL test lane

Default Vitest discovery now excludes *.sql.integration.test.ts before importing modules. Four legacy SQL files select normal application credentials; the new marked fixture also requires explicit runtime setup. The separate config preserves base plugins/aliases/setup, replaces broad include rules with the sole reviewed job-stock path, validates explicit disposable URL/opt-in and rejects a missing admitted file. Default excludes are preserved in both lanes.

Eight actual discovery/empty-run regression cases pass,13.57seconds, exit0. The baseline first case failed because all five current SQL modules were discovered. Files-only listing was confirmed to return exit0 for an empty selection; the final negative cases correctly execute an empty filtered run and require nonzero exit instead. No legacy SQL module was imported or executed. Synthetic normal credentials are passed only to the discovery subprocess.

Independent plan review admitted one additional exact file: the existing native crash test now passes the dedicated config to its child. No test logic or assertions changed. The driver fixture planned by12-04 was mechanically renamed to the SQL integration suffix and is not yet allowlisted. Independent review passed 8 discovery tests and 22 native PostgreSQL tests; an unreachable-runtime invocation correctly failed with exit 1. Source hashes and the evidence boundaries are recorded in 10-08-VERIFICATION.md.

Existing dependency discovery and aliases are preserved. No package/lock, live database, migration or production action changed. A default unit run excluding native tests is not a native release qualification. Future fixture admission remains explicit; temporary root-approved development configs may exercise a single reviewed candidate with the same marker guard, but do not expand the canonical release lane or certify a pass.

| File | SHA-256 |
|---|---|
| `minion_hub/vitest.config.ts` | `dd2700880329d8a250ad8d1978e175fdeaf0000142efbcef7399642a5ec94b10` |
| `minion_hub/vitest.disposable.config.ts` | `54a4214a94e4852b5890b00a6309a7a5e3b91feab29e01f3af99167211ff62e9` |
| `minion_hub/scripts/qc/test-lanes.test.ts` | `ab57266812c90b812187df1359814ed1c6e945f532ca12c06b96fab137611fcc` |
| `minion_hub/scripts/qc/README.md` | `8b7d38f99ad7e56306be95af06612978abc3996985fa2f68ba56b6b94bcfd8a9` |
| `minion_hub/src/server/services/job-stock-concurrency.sql.integration.test.ts` | `346e9479dd808d3a9408a49007baadedf362a83fe17cad6fa976d082c83a7d6c` |

The independently reviewed foundation-fixture continuation expands the canonical lane to exactly two fixtures. Eight updated discovery tests and the selected 14-case foundation fixture pass; current hashes are in the appended 10-08-VERIFICATION receipt. Earlier one-file hashes describe the initial accepted state. Driver/adoption fixtures remain outside the allowlist.


Default-lane continuation: two exact normal-environment credential-loading tests are now quarantined before import. Final root and independent discovery runs each pass 8/8; four mixed-file offline business tests remain preserved and pending a bounded split. See the final VERIFICATION appendix for current hashes, the restored CRM file incident and the separate native-lane admission boundary. No legacy SQL module was executed.
