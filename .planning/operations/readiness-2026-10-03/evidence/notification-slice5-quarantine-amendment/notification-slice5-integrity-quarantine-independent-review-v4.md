# Independent Standards review

Input: `spec-notification-slice5-integrity-quarantine-definer-amendment.md`

Spec SHA-256: `86f53356d8376e912a379286499114b55c1fc34d6a223f5cd4945607e54f44e0`

Recon SHA-256: `067ef35a7db6fa653598391e9fd16b8c837665221ec05d7df457da7c8116404b`

Verdict: **PASS for implementation qualification**.

The v4 delta closes the remaining production initializer block. The recon now inventories the distinct `claimOneProjectionEvent` transaction in `projection/projector.ts` with its exact worktree hash. AS-IS identifies that this transaction previously initialized scope, event, and generation but omitted quarantine reason. TO-BE and DELTA require it to initialize `app.notification_quarantine_reason=''` in the same pre-claim setup statement, before malformed-event quarantine can call the fixed function. Required proof now covers the shared worker-wrapper one-event path, shared wrapper claim-page path, and the projector's distinct malformed-event path across success, rollback, timeout, and physical pool reuse, with all four managed settings starting and ending at their canonical values.

The prior v2 and v3 corrections remain intact: the shared worker initializer is source-inventoried and initializes all four settings; the fixed owner retains its preexisting table-level INSERT and receives only the named column SELECT/UPDATE grants; per-row reason is captured, installed, restored, and included in the exact post-transition policy; all claims are validated and locked before effects; count/boolean caller semantics remain exact; and terminal outbox rows remain unreadable to `notification_worker`.

The authority boundary is finite and falsifiable. The definer accepts no dynamic identifiers, has an inaccessible fixed owner and empty search path, exposes EXECUTE only to the worker, preserves the v11 PostgreSQL 17/18 owner graph, and joins runtime catalog admission. The required matrix covers wrong scope and epoch, mixed batches, concurrent renewal/reclaim, exact ACL and policy mutants, real migration-chain execution on both supported database majors, rollback barriers, fresh-connection postflight, and cleanup.

No remaining source, authority, privacy, or caller-initialization blocker was found in this frozen v4 amendment. This verdict authorizes only the next implementation and qualification stage; it does not authorize a production migration, merge, release, external notification, or data write.
