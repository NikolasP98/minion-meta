# Parent Spec review

Verdict: **PASS**

Spec SHA-256: `86f53356d8376e912a379286499114b55c1fc34d6a223f5cd4945607e54f44e0`. Recon SHA-256: `067ef35a7db6fa653598391e9fd16b8c837665221ec05d7df457da7c8116404b`.

The v2 parent review is superseded by this exact v4 input. It preserves fixed-function authority, worker terminal privacy, live-epoch all-or-none locking and finite catalog admission. All independent gaps are now explicitly in the contract: both real transaction seams initialize the exact four GUCs; restoration preserves reason and all prior context on every exit; retained table INSERT is distinguished from added column SELECT/UPDATE; the post-state policy compares the supplied per-row reason. One-event, claim-page and malformed-projector calls require success/rollback/timeout/pool-reuse proof.

Independent renewed Standards review, exact implementation review and actual PostgreSQL17/18 full-runner and cleanup receipts remain gates. No production migration, merge or release is authorized.
