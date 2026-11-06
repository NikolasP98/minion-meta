# GW022A Slice A native publication implementation plan

- Authority: `spec-gw022a-config-cas-distribution.md` SHA-256
  `8ee807b3dc8127b8050fd6d3c095c1593a750bf0cd200b8d0d61992b6457b46f`
- Parent review: `gw022a-config-cas-distribution-parent-review-v4.md` SHA-256
  `1369be6ccb50aff563e7bdf97ffed270d1f4bf9c356233aebc943c48c6ecf69e`
- Independent review: `gw022a-config-cas-distribution-independent-review-v4.md` SHA-256
  `f271da4e461c4c6760596db18bf52bee3ee4daa384d0a415af004cabf25f5291`
- Gateway baseline: `0cdd31d4cc3102a1ec3c24eedb1630e75d0663a0`
- Scope: package-only private native publication session; no config writer integration, production
  import, package release, capability advertisement, or `releaseQualified` change

## Ownership

This slice owns only `packages/linux-fs-atomic/**`. It does not edit Gateway config, RPC, CLI,
extension, release workflow, root package, changelog, Hub, Site, or meta source. Other workers are
active; unrelated worktree and index state remains untouched.

### Planned production files

| File                                  | Change                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/config_publication/mod.rs`       | Private N-API reservation/factory boundary and closed input union                                                     |
| `src/config_publication/admission.rs` | One live `(operation ID, session generation)` reservation, fixed handle/control/descriptor accounting, and retirement |
| `src/config_publication/session.rs`   | Closed native state machine, eight ordinary methods, idempotent control close, and exact descriptor ownership         |
| `src/config_publication/recovery.rs`  | Closed recovery factory from ledger-recorded names/identities only; no effect replay or name generation               |
| `src/config_publication/tuples.rs`    | Bounded acknowledgement parsing, identity/digest tuples, exact result objects, and no raw path/descriptor output      |
| `src/config_publication/scratch.rs`   | Reusable single-link scratch verification, truncate/write/fdatasync/post-check, and root-generation registry          |
| `src/config_publication/tests.rs`     | Rust unit tests for state, ownership, reservation retirement, and pure tuple validation                               |
| `src/lib.rs`                          | Register the private native module/classes without changing the package's public TypeScript export                    |
| `src/handles.rs`                      | Internal module wiring and shared bounded constants only                                                              |
| `src/handles/authority.rs`            | Explicit internal handle transfer that invalidates the ordinary wrapper while retaining one control owner             |
| `src/handles/publication.rs`          | Terminal one-shot publication-token transfer into a config session; ordinary methods reject after transfer            |
| `src/handles/lease.rs`                | Internal transfer of already-held ledger/config leases into composite session control ownership                       |
| `src/handles/root.rs`                 | Thin delegation to reservation/session factories; no state-machine growth in this existing large file                 |
| `src/executor/stages.rs`              | Exact config operation names/stages/codes and dispositions; existing operations unchanged                             |
| `src/sys.rs`                          | Small exports for descriptor-bound truncate/write and existing rename/sync primitives; no cleanup unlink              |
| `src/native-types.ts`                 | Raw private N-API declarations and exact tuple types; public capability interfaces unchanged                          |
| `src/async-api.ts`                    | Weak-map retention of raw handles needed by the package-private adapter; public facades stay frozen                   |
| `src/config-publication-private.ts`   | Validated package-private adapter and acknowledgement/session facade; absent from `index.ts`                          |

`package.json` exports, `src/index.ts`, and the public `LinuxFsAtomicCapability`, `RootHandle`,
`PublicationHandle`, and `LeaseHandle` interfaces remain byte-unchanged. If implementation proves a
new file outside this list necessary, work stops for a bounded plan amendment before that file is
edited.

### Planned test files

| File                                       | Proof                                                                                                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config-publication-private.test.ts`   | Initial, first-backup, later-replacement happy paths; exact tuples and normal three-name layout                                                                |
| `src/config-publication-stage.test.ts`     | Every wrong/stale/foreign/skipped acknowledgement, effect boundary, crash tuple, and recovery no-replay classification                                         |
| `src/config-publication-authority.test.ts` | Held reader, moved/replaced/hard-linked scratch, root/marker/mount drift, last-barrier replacement, reverse-exchange mismatch, and no foreign unlink           |
| `src/config-publication-lifecycle.test.ts` | Factory transfer, close/root-close/N-API teardown, descriptor/control cleanup, sibling-root continuity, and uncertain cleanup                                  |
| `src/config-publication-capacity.test.ts`  | Fixed descriptors/handles/payload/evidence reservations, one live generation, saturation before effect, retirement, and 100 worst-size sequential replacements |
| `src/surface-ratchet.test.ts`              | No public facade, export, plugin, or generic-handle construction path for the private session                                                                  |
| `src/env-teardown.test.ts`                 | Active private session joins the existing environment cleanup seal without JS settlement after teardown                                                        |

Tests use owned private temporary roots only. Stage fault injection remains test-only and cannot be
selected by production inputs.

## Execution order

1. Add exact raw tuple/acknowledgement types and Rust operation stages. Keep public exports unchanged.
2. Implement reservation and ownership transfer. Reserve descriptor, handle, control, and payload
   capacity before open/copy; failed factory transfer returns every token to one cleanup owner.
3. Implement scratch preparation and compound no-replace/exchange methods. Revalidate root, marker,
   mount, name, identity, owner, mode, link count, size, and digest at each specified boundary.
4. Implement sync and settlement methods. Never unlink online evidence. Close verification
   descriptors before releasing the session reservation.
5. Implement recovery from the exact durable stage/tuple. Never generate a name, recreate scratch,
   copy request bytes, or repeat a rename.
6. Wire package-private TypeScript validation and the raw-handle WeakMaps. Do not add a public export
   or production consumer.
7. Run Rust unit/fault tests, actual-addon focused Vitest, typecheck, lint/format, public-surface
   ratchet, and leak checks. Freeze exact source hashes and qualification receipts for independent
   review before Slice B.

## Required acceptance

- Exact initial/first-backup/later state transitions and tuple results match the approved contract.
- A moved publication or lease wrapper is invalid immediately; exactly one owner performs cleanup.
- Cancel/deadline before first effect is no-effect. Any failure after an effect is classified from
  the exact held tuple as committed or uncertain, never generic retryable failure.
- Root close and N-API teardown retain control work until actual descriptors and leases settle.
  Closing one session/root does not stop sibling roots or the shared executor.
- Repeated exact close returns one cached control result. Uncertain cleanup poisons the affected
  operation/root and cannot free capacity as if cleanup succeeded.
- At most one live reservation exists per `(operation ID, session generation)`; changed, reused,
  malformed, old-epoch, or retired identities reject before native capacity or filesystem effect.
- The public package surface and current generic operations remain compatible. There is no config
  caller conversion or release claim in Slice A.
- The final packet names all deviations from this plan, includes exact file hashes and commands, and
  remains unstaged until parent review.
