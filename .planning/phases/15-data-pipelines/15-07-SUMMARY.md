---
phase: 15-data-pipelines
plan: "07"
requirements: ["DATA-01", "JOB-01", "JOB-02"]
requirements-completed: []
status: locally-qualified-not-adopted
---

# Finance parser and durable service binding

All three bounded implementation tasks are locally qualified. The service uses parser v3 for new imports; historical terminal imports retain their stored result, and stale versions cannot resume or retry into new accounting rows. Raw upload SHA and normalized parser provenance are checked independently. Persistence remains under the existing job, head and domain transaction fences. Corrupt upload bytes retain the existing fenced failed-import status behavior; this is not a claim that every corruption causes zero writes.

Root independently reran 102 unit/parser tests and 41 real PostgreSQL tests on the frozen final source. Both passed with zero skips. The native run used a new private PostgreSQL17.10 cluster, verified its owner/database marker/data directory before writes, and recorded five allowed loopback connections and zero denied attempts. Cleanup returned zero fixture schemas and zero fixture connections; root stopped only that owned cluster. Scoped TypeScript and formatting passed in the author run.

Committed checkpoint source, before-images, patches and exact test logs live in `../../operations/360/checkpoint-2026-09-11/finance/`; the candidate receipt contains five source hashes and preservation evidence. The patch requires the recorded staged 10x job-fencing foundation and is not an independently deployable patch against the older active Hub checkout. Original 39 staged path/blob identities remain unchanged; raw Git index byte drift was observed and its cause is not assumed.

Historical recovery/reingest remains an explicit product operation. Unbounded fetch buffering and repeated full parsing during chunk/status work remain paired TODOs in source and `proposals/2026-09-10-hub-finance-parser-version-binding.md`. No customer import, production migration, requirement closure or deployment occurred.
