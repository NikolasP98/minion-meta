---
phase: 20-integration-reaudit
plan: "01"
requirements: ["QC-01"]
requirements-completed: []
status: task-1-locally-qualified
---

# Exact candidate packet tooling

Task 1 implements a bounded owned-file policy, independent receipt pinning, native Git base verification and unapplied patch generation. Root independently repeated all 37 native tests: zero failures/skips, 777 ms. Log: `/tmp/minion-20-01-vg_vuxb8/root-tests.log`. Scope includes real disposable Git binary/mode/add/delete patches, stale/dirty/ancestor identities, replacement objects, unrelated WIP preservation, unsafe inputs and incomplete evidence. No shared checkout mutation occurred.

Root review found and corrected three identity gaps before acceptance: a commit source must match every owned committed blob and mode; Git replacement objects are disabled; and a materialized before snapshot verifies against its separately registered immutable Git base. A dirty source requires owned-file identity. The policy pins receipt hashes separately from locator manifests. Names and hashes do not authenticate a reviewer or prove an asserted test ran. `releaseAuthorized` is always false.

Frozen source SHA256 is `4ccdb73e8661219ad09f0cc1764e2d653c7e07e564a9ff90c50e2b6432a23e39`; test SHA256 is `361ede63e0c3f1a4968b16b87a566d5b9c13a8926445e462cf73ed6c97fd1cae`. Agent handoff is `/tmp/minion-20-01-vg_vuxb8/HANDOFF.md`. The historical CANDIDATES receipt observed 85 plans; current canonical admission has 86 after the explicit inherited Calendar reconciliation. Counts are dynamic observations.

The exact UI packet is generated from the reviewed 60-file Hub selection and 31-file Site selection. Root independently rehashed all 125 emitted files, verified the exact changed path sets (59 Hub and 31 Site), and repeated native Git applicability checks against copied immutable before-images. Receipt: `/home/nikolas/.cache/minion-qc/ui-review-packet-ple_be1f/inputs/root-independent-review.json`; packet manifest SHA256 `da1e9373716217f7c68d80338d884aae9612dd5d19d6622616a2ac4c8125bfaf`. The unchanged Dialog is retained as foundation evidence. Both patches remain unapplied. No passing whole-program receipt is manufactured: all 51 requirements and every associated admitted plan remain explicit. The local packet is expected to remain incomplete while mandatory runtime, integration, source-adoption and policy gates remain open. Task 2's complete integration runner is unimplemented. The canonical SDK compatibility document now exists; its existence is not consumer qualification. No commit, push, merge, install into an active project or deployment is claimed.
