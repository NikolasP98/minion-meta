---
id: 2026-10-03-gw022a-config-cas-distribution
title: Integrate the reviewed Linux filesystem substrate with config CAS and four-target Gateway distribution
stage: spec
verdict: approved
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion, minion-meta]
tags: [security, logic, infra, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
findings: [GW-022A]
---

# Config CAS and native distribution

## 0. Product

The Gateway must publish canonical config from a fresh, locked base and must tell a caller whether
the operation had no effect, committed, or became uncertain. A supported Linux release must ship
the exact native filesystem capability that enforces this boundary on all four supported tuples.

This slice integrates the already reviewed `@minion-stack/linux-fs-atomic` substrate with the
canonical config transaction and release artifact. It does not qualify managed-workspace cleanup,
GW-005/GW-025 storage, HC-034 marketplace install V2, or a production release. It cannot set
`releaseQualified: true` until all four target artifacts, pack/install lanes, config-writer ratchet,
hardware qualification required below pass, and every blocked writer dependency including durable
delete has its own approved implementation receipt.

Normative parent contracts:

- `meta/specs/2026-10-03-gw022a-linux-filesystem-atomicity.md`, SHA-256
  `7e8e188613e109f3540dc3d39df2d56fae7a032b62e9f1fead1171c8d7bba96d`.
- `meta/specs/2026-10-03-gw022a-native-syscall-executor.md`, SHA-256
  `1d94886223e3285ec496ca97fffa415d827a03e162541bb720abfd0abb8a82cd`.

Those contracts remain controlling except for the narrow, explicitly reviewed amendment below.
This document does not authorize source work until both parent-contract reviewers accept that
amendment. Every other loader, executor, ledger, publication, compatibility, and evidence
requirement remains unchanged.

### 0.1 Narrow parent-contract amendment: reusable config scratch

The sustainable three-name layout deliberately changes two parent rules and must be reviewed as a
parent amendment, not treated as an implementation detail:

1. Atomicity contract §6.12 continues to require a fresh unpredictable
   `O_CREAT|O_EXCL|O_NOFOLLOW` `PublicationHandle` for ordinary publications, initial canonical
   creation, initial scratch creation, and the first absent-`.bak` seed. The only exception is a
   previously ledger-bound private config scratch inode, reused for one replacement candidate under
   the exact session below. Atomicity §6.14's in-place-write prohibition remains absolute for
   canonical config, `.bak`, includes, snapshots, evidence, arbitrary temps, and every non-config
   caller; it is narrowed only for that private scratch before canonical publication. Atomicity
   §6.15's cleanup sentence is narrowed: the exact normal scratch remains reusable, while uncertain
   evidence is retained for offline reconciliation and is never path-unlinked online.
2. Executor `PublicationHandle` remains fresh, write-once, and terminal after its first write attempt.
   It is never reset or used for scratch reuse. Add a private, non-exported
   `ConfigPublicationSessionHandle`, created once per config operation after ledger/config-lock
   admission. Its finite states and only admitted methods are the closed table in Section 3, from
   `opened` through initial/scratch preparation, optional seed publication, config publication,
   optional backup rotation, settlement, and `closed`, with terminal `uncertain` and `closing`
   branches. Initial creation moves the two already written one-shot publication handles into
   `initial-prepared`; their JavaScript wrappers become invalid. Replacement admits
   `prepareReusableScratch` exactly once from `opened`; first replacement prepares scratch before it
   publishes the seed, so every post-seed crash retains the exact candidate bytes needed to resume.
   No method returns to an earlier state. A later operation gets a new session generation around the
   ledger-recorded scratch inode. Generic roots, entries, plugins, and `PublicationHandle` callers
   cannot construct or invoke this handle.

   The first-call durable `reserved` row stores a random session generation before it returns
   `CONFIG_OPERATION_ADMISSION_REQUIRED`. On the effect-owning resubmission and before the first
   candidate/seed/scratch open, native admission creates an opaque
   `ConfigPublicationSessionReservation` bound to that operation ID and exact durable generation,
   with a fixed descriptor budget, one live-handle slot, and pre-reserved control cleanup. A process
   restart may recreate only that same generation; a concurrent live reservation is busy. The
   factory consumes the reservation exactly once when it consumes the publication tokens; the
   reservation wrapper and moved token wrappers all become invalid. The session owns the moved
   candidate/scratch/optional backup-seed publication tokens, held canonical and backup
   descriptors, a composite operation authority acquired in process-root, ledger, then config order,
   root authority, queue/control reservations, and scratch registry
   generation from factory success until `settled`, `uncertain`, or actual native cleanup. A factory
   failure returns ownership to one control-cleanup record; it
   never leaves two live wrappers. `close()` changes an effect-free session to `closing`, cancels
   only work still queued before its first effect, and keeps dispatched/control work until every
   descriptor and lease is closed. Closing after any rename/sync boundary must first return or
   persist a tuple sufficient for `committed` or `uncertain`; it cannot report clean completion from
   an unclassified effect. Environment teardown takes the same pre-reserved control path and keeps
   the per-environment executor alive until the session cleanup settles, without calling JavaScript
   after N-API closing. Closing one session/root does not stop unrelated roots or the shared
   executor.

The native registry binds the scratch by root generation, parent mount/device/inode, random ledger
name, file device/inode, mode `0600`, owner UID/GID, size/digest, and link count exactly one. All
strong in-tree config reads must take the shared config lease, materialize their bounded bytes, close
the descriptor, and release the lease before returning. The session takes the exclusive lease and
refuses `SCRATCH_BUSY` before mutation while any native reader/alias handle for that inode remains.
A reader admitted before exchange therefore retains its old immutable bytes until it closes; the
next scratch preparation cannot truncate underneath it. A reader AST/runtime ratchet and a real
two-process held-reader test are release gates for the exception.

Immediately before the first truncating syscall and again after write plus `fdatasync`, native code
requires the scratch name to resolve to the held inode and `fstat` to report one link. A moved name,
extra hard link, replaced name, changed owner/mode/size authority, or tracked held reader before the
write rejects with zero scratch mutation. An injected move or hard link in the unavoidable interval
after the last pre-write check can affect only the already captured Gateway-owned scratch inode; it
cannot redirect the descriptor write to the replacement. The mandatory post-write name/link/root
checks then return `SCRATCH_AUTHORITY_UNCERTAIN`, retain the full exceptional reservation, and poison
strong config mutation before any canonical rename. They never adopt, truncate, exchange, or unlink
the replacement. The negative matrix must inject name move, same/outside-parent hard link, held
reader, and replacement immediately before `ftruncate`, during write, before `fdatasync`, and before
publication, including a final link-count check. This exception does not claim an undetectable raw
same-UID alias is impossible; detection after scratch-only mutation is honest uncertainty, and no
canonical effect follows.

This amendment is limited to the canonical config transaction and its fixed 8 MiB bound. A mutant
that exposes the session publicly, uses it for another root/name, rewrites canonical/backup/evidence,
resets a terminal handle, skips shared-reader fencing, or continues after a name/link mismatch must
fail. Until this exact amendment receives both passes, the prior parent rules win and reusable
scratch implementation is unauthorized.

## Out of scope

- Managed-workspace creation, relocation, destructive cleanup, and the deferred shared writer-lease
  protocol.
- GW-005/GW-025 orchestration storage and HC-034/GW-022 marketplace installation behavior.
- Changing config data shape, plugin trust, channel/message behavior, or ordinary read semantics.
- Canonical config deletion and rollback-to-absent. Linux has no expected-inode unlink CAS for a
  pathname that another same-UID process may replace at the final barrier. Those writer rows remain
  explicitly withheld behind a separately reviewed durable-delete contract; this slice must not
  advertise them, silently retain raw `rm`, or count them as converted.
- Claiming strong filesystem atomicity for Darwin, Windows, an unsupported Linux tuple, a host-only
  build, or any release without the complete target and hardware receipts.
- npm publication, merge, deployment, or production mutation.

## AS-IS

### 1. Reviewed native code is a host-only, unqualified substrate

Gateway native-substrate baseline `2f46c5023faa9eee8303b868c4db9136f26a5a91` contains the private workspace
package `@minion-stack/linux-fs-atomic@0.1.0`. Its reviewed implementation exposes asynchronous
opaque root, entry, publication, and lease handles; one absolute operation deadline; bounded native
queues and buffers; descriptor-relative opens; `renameat2` no-replace and exchange; sync; and
environment drain. The source checkpoint is useful substrate evidence only.

`packages/linux-fs-atomic/scripts/build-native.mjs` currently chooses one host or
`MINION_LINUX_FS_TARGET`, deletes `dist/native/linux-fs-atomic`, builds one `.node` file, and writes
a one-entry manifest plus `embedded-manifest.generated.js`. The current local manifest contains
only `x86_64-unknown-linux-gnu`, says `releaseQualified: false`, and records
`buildImageDigest: "local-development-unqualified"`.

The root package depends on the workspace package, but the root `files` allowlist only publishes
root `dist/` and the existing product directories. Root `pnpm build` does not assemble the native
package into `dist/native/linux-fs-atomic/`. The frozen
`gw022a-root-pack-dry-run-2f46c502.json` receipt, SHA-256
`41c77447d36fae69b797c35851724038b03c9626656520497c0b9c4d2e761063`, records 1,310
files from `npm pack --dry-run --ignore-scripts` and contains no `linux-fs-atomic` path, native
manifest, or `.node` file. CI and npm-publish workflows contain no four-tuple native build,
aggregation, clean-install, or hardware arm64 release gate. No production module imports the
package.

### 2. Canonical config publication is still pathname based

`src/config/io.ts:928-1197` rereads and validates config, prepares a random sibling temp, rotates
backups, copies the incumbent to `.bak`, and renames the temp. The expected base hash used by
`config.set`, `config.patch`, and `config.apply` is checked in
`src/gateway/server-methods/config.ts:349-480` before this writer and outside a cross-process lock.
The Windows `EPERM`/`EEXIST` branch copies over the destination. A Linux caller can therefore lose
an unrelated update, and a process death after publication but before response has no durable
status reconciliation.

The current native facade is intentionally lower level. `renameNoreplace`, `renameExchange`, and
`unlinkFile` return no displaced identity or publication receipt. `unlinkFile(name)` has no expected
identity. Composing an identity read and a later rename/unlink in JavaScript does not create an
inode compare-and-swap. The config adapter must not claim that these calls alone satisfy the
parent contract's last-barrier classification or safe same-UID cleanup.

### 3. Checked writer inventory

The frozen structured inventory `gw022a-config-writer-inventory-2f46c502.json`, SHA-256
`46d0910609519896fd1d29c938b401d8ec847473006724ebeda23e3acdd1b282`, and its raw
source receipt `gw022a-config-writer-inventory-2f46c502.raw`, SHA-256
`9a5fdee056178252ff4334f805994064dfd80ee701f08661fcaeeabe815fc333`, record 78
non-test literal `writeConfigFile(` matches across 46 TypeScript files at the baseline commit. Two
matches are definitions and one is the public wrapper call, leaving 75 direct callers plus the
wrapper edge.

| Current class                                |            Matches | Required disposition                                                                           |
| -------------------------------------------- | -----------------: | ---------------------------------------------------------------------------------------------- |
| CLI and wizard                               |                 39 | convert to the transaction; remote CLI uses Gateway RPC, offline CLI uses the platform backend |
| Gateway runtime and RPC                      |                 14 | convert to strong Linux transaction; no raw writer remains                                     |
| bundled extension runtime                    | 12 in 9 extensions | convert to updater tokens; retain at most the bounded one-cycle compatibility wrapper          |
| chat config commands                         |                  4 | convert to scoped mutation intent                                                              |
| browser profile service                      |                  2 | convert to scoped mutation intent                                                              |
| channel internals                            |                  2 | convert to scoped mutation intent                                                              |
| other runtime (`gmail-ops`, security repair) |                  2 | convert with explicit operation/result handling                                                |
| definitions and wrapper edge                 |                  3 | replace the production writer boundary; keep low-level implementations private                 |

The literal count does not cover these direct writers:

| Source                                                        | Current effect                                  | Required disposition                                                                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/snapshot.ts:92-98`                                | rotates config and copies a snapshot over it    | read a bounded held snapshot, then submit a config transaction; never cross-device rename/copy into the canonical name                 |
| `src/agents/bootstrap/layout-migration.ts:338-386`            | reads and rewrites canonical config by pathname | transaction, or service-stopped offline-exclusive adapter with the same ledger and root lease                                          |
| `src/infra/org-volume-split.ts:568-618`                       | moves/copies roots and rewrites config          | service stop plus exclusive lifetime/root lease; config publication still uses the transaction                                         |
| `scripts/edit-gateway-config.ts:64-115`                       | pathname read, backup copy, temp rename         | supported Linux transaction; unsupported OS explicit compat backend                                                                    |
| `apps/macos/Sources/OpenClaw/OpenClawConfigFile.swift:36-156` | local whole-config atomic write                 | connected mode uses Gateway RPC; offline mode uses Darwin compat backend                                                               |
| `apps/macos/Sources/OpenClaw/ConfigStore.swift:51-67`         | Gateway save with automatic local fallback      | remove fallback after an ambiguous/committed Gateway attempt; fallback only after typed proven no-effect/unavailable before dispatch   |
| `apps/macos/Sources/OpenClaw/AppState.swift:547`              | direct local save                               | route through `ConfigStore` with the same disposition rule                                                                             |
| `apps/macos/Sources/OpenClaw/DebugSettings.swift:784-807`     | direct `Data.write(.atomic)`                    | route through `ConfigStore`; offline remains compat-only                                                                               |
| `docker/entrypoint.sh:54-58`                                  | check-then-copy default config                  | pre-Gateway no-replace bootstrap only, with exact owner/mode and collision failure                                                     |
| `setup/phases/50-config-generation.sh:207-260`                | live backup and config copy, local or SSH       | prove service stop and exclusive root lease, then use offline transaction; no raw live `cp`                                            |
| `setup/phases/99-rollback.sh:45-63`                           | stops service then raw-removes config           | `blocked-pending-delete`: no supported effect until a separate durable-delete contract proves the final barrier; raw `rm` is forbidden |

Test fixtures are separate exact-path rows and do not authorize production calls. The checked
multi-language inventory required by the parent contract remains an implementation deliverable;
this table does not replace its TypeScript compiler AST, SwiftSyntax, and shell parser ratchets.

### 4. Accepted behavior that must remain compatible

- `config.set`, `config.patch`, and `config.apply` preserve current redaction, validation, comment
  and environment-reference behavior, reload planning, restart sentinel behavior, and successful
  response fields.
- Unsupported Darwin and Windows clients retain a named `compatConfigMutation` path with honest
  `strongFilesystemAtomicity: false`.
- Supported Linux never falls back to pathname writes when the strong capability is missing,
  invalid, unprobed, saturated, poisoned, or draining.
- A caller timeout does not prove no effect. An operation is retryable only when the durable
  transaction proves no publication effect.

## TO-BE

### 1. One config transaction boundary

Add a single production API, `mutateConfig`, behind `src/config/transactions/`. Every strong Linux
writer calls this API or a scoped facade built on it. Raw native handles and ledger methods remain
private to the adapter. The input is immutable and contains:

- the Gateway-issued parent-ledger operation ID, encoded exactly as
  `<ledger epoch UUID>:<monotonic sequence>`; the epoch is the ledger's canonical lowercase
  36-byte UUID and the sequence is canonical unsigned base-10 in the range `1..2^64-1` with no
  leading zero;
- mutation kind (`replace`, `merge-patch`, `restore`, or a pure updater); deletion is not admitted
  by this API version and returns typed `CONFIG_DELETE_UNAVAILABLE` before operation reservation;
- the caller's expected canonical base hash and, when applicable, bounded touched-path digest;
- bounded raw patch/replacement bytes or the pure updater input;
- actor/source class and requested observer action;
- the current attempt's absolute parent deadline, which no native child call may reset.

The adapter returns one durable receipt with `operationId`, prior and resulting config hashes,
result (`no-change`, `no-effect-conflict`, `committed`, `committed-with-warning`, or `uncertain`),
stable stage/code, backup disposition, and the existing redacted response projection. A caller that
loses the response reconciles by operation ID. The adapter never returns the absolute config path
through a new security surface.

No arbitrary callback runs under a filesystem or ledger lock. Before admission, the caller captures
the bounded include graph, environment-reference map, comment source, plugin/schema registry,
validation version, and mutation input required by the parent contract. Preparation freezes the
snapshot, invokes a synchronous pure updater exactly once outside all locks, rejects a promise, and
derives the deterministic merge patch, touched-path presence/digests, or typed whole-file operation.
Under the config lease, the adapter rereads exact bytes from a held descriptor, verifies the
expected hash or every touched path, applies only that prepared patch to the fresh snapshot,
validates with the captured immutable context, serializes the bounded result, and revalidates every
captured dependency before publication. Drift returns typed conflict with zero publication effect.

### 2. Config-root and same-filesystem admission

The strong adapter opens and probes the canonical config parent as its own `RootHandle`. It records
the parent device, `statx` mount ID, `/proc/self/fdinfo` mount ID, filesystem type, root/marker
identities, and effective UID/GID policy already defined by the native parent contract.

Every canonical scratch, incumbent, displaced file, lock, and `.bak` publication is one validated
segment below that held parent. The adapter requires all publication participants to report the same
device, verified mount ID, and filesystem type before the first rename effect. The native mount ID
is accepted only after the required `statx` and `/proc/self/fdinfo` cross-check. Equal path prefixes
or equal `st_dev` alone are never same-filesystem proof.

Every include remains within the pinned real config root and follows the parent contract's bounded
no-follow graph. A snapshot may reside on another filesystem only as input: the adapter opens it
through its separately admitted held root, reads bounded bytes before the config lock, and stages
new canonical bytes into a same-parent publication handle. It never renames or copies an external
pathname over the canonical name. `EXDEV`, missing mount identity, bind/remount drift, root/marker
drift, or a moved descendant is typed unavailable/conflict before publication.

### 3. Native publication delta

Extend the private native surface with one retained config-publication session rather than
composing the security-critical last barrier from unrelated JavaScript promises. The session
accepts only the held config parent, held staged publication, held incumbent identity (or exact
absence), bounded generated names, and the existing operation context. It retains the root lease,
descriptors, queue/control reservations, and absolute parent deadline across the finite native calls
below; closing, environment teardown, or caller timeout cannot abandon a post-effect session.

The effect-owning resubmission follows the parent hierarchy once: process lifetime root lease,
exclusive mutation-ledger lease, then exclusive config lease. It never releases or reacquires the
ledger lease while config is held. The selected-pair ledger authority appends every preparation,
intent, unsynced, durable, backup, settlement, and observer-pending frame through that same held
lease. A private composite control record owns both operation leases and always closes session/file
descriptors and releases config before it releases ledger. Normal completion appends
`observer-pending` while both are held, closes the session/releases config, releases ledger, and only
then runs observers. Terminal observer classification later reacquires ledger alone, never below a
config lock. Factory failure, pre-effect cancellation, root close, and N-API teardown use the same
reverse release order. If JavaScript is no longer available to append, native cleanup preserves the
last durable intent plus exact filesystem tuple, releases config then ledger only after owned
descriptors settle, and leaves the operation nonterminal/poisoned for restart recovery; it never
reports clean no-effect from an unclassified effect.

The private reservation API accepts only a validated `LedgerOperationId` plus the exact random
session generation already stored by the first-call `reserved` frame. The effect-owning resubmission
uses it after pure preparation and before any open/create. It reserves all native capacity and
returns native-owned control authority without opening a file. A failed native reservation leaves
the durable operation effect-free at `reserved`; a crash loses only in-memory capacity, and restart
may recreate the same generation under the parent recovery rule. The native registry admits at most
one live reservation/session per environment for `(operation ID, session generation)` and never
accepts a different generation for that row; the selected-pair ledger generation CAS plus native
config `flock` provide the cross-process fence.
The session generation is exactly one canonical lowercase 36-ASCII-byte UUID generated from the
Gateway CSPRNG; malformed, uppercase, all-zero, reused-for-another-operation, or changed generations
reject before native capacity or filesystem admission.
Its private factory accepts a closed union. `initial` requires the
`prepared/bootstrap:scratch-ready` ledger acknowledgement and moves exact written candidate and
empty-scratch publication tokens plus their durable identities into the session. `replacement`
requires `reserved/backup:not-required` or `reserved/backup:seed-prepared` acknowledgement, accepts
the exact ledger-recorded scratch and incumbent identities and, only when `.bak` is exact absent,
also moves a written backup-seed publication token after its `seed-prepared` frame. Both variants
consume the exact session reservation named by the acknowledgement. Moving a token invalidates its ordinary
`PublicationHandle` wrapper, so two owners cannot act on the same descriptor. The private facade is
exact:

```ts
declare const ledgerOperationIdBrand: unique symbol;
type LedgerOperationId = string & { readonly [ledgerOperationIdBrand]: true };
type LedgerStageAck<S extends string> = Readonly<{
  operationId: LedgerOperationId;
  stage: S;
  tupleDigest: string;
  selectorGeneration: bigint;
  sessionGeneration: string;
}>;

interface ConfigPublicationSessionHandle {
  readonly generation: string;
  readonly operationId: LedgerOperationId;
  publishBackupSeed(
    ack: LedgerStageAck<"prepared/backup:seed-intent">,
    operation: FsOperationContext,
  ): Promise<BackupPublishedUnsyncedTuple>;
  syncPublishedBackupSeed(
    ack: LedgerStageAck<"prepared/backup:seed-published-unsynced">,
    operation: FsOperationContext,
  ): Promise<BackupDurableTuple>;
  prepareReusableScratch(
    ack: LedgerStageAck<"reserved/backup:not-required" | "reserved/backup:seed-prepared">,
    bytes: Buffer,
    operation: FsOperationContext,
  ): Promise<NativeFileIdentity>;
  publishConfig(
    ack: LedgerStageAck<"publication-intent">,
    operation: FsOperationContext,
  ): Promise<ConfigPublishedUnsyncedTuple>;
  syncPublishedConfig(
    ack: LedgerStageAck<"published-unsynced">,
    operation: FsOperationContext,
  ): Promise<ConfigDurableTuple>;
  publishBackup(
    ack: LedgerStageAck<"durable/backup:rotation-intent">,
    operation: FsOperationContext,
  ): Promise<BackupPublishedUnsyncedTuple>;
  syncPublishedBackup(
    ack: LedgerStageAck<"durable/backup:rotation-published-unsynced">,
    operation: FsOperationContext,
  ): Promise<BackupDurableTuple>;
  settleReusableScratch(
    ack: LedgerStageAck<"durable/backup:not-required" | "durable/backup:rotation-durable">,
    operation: FsOperationContext,
  ): Promise<ReusableScratchTuple>;
  close(): Promise<NativeControlResult>;
}
```

`operationId` uses the parent `<ledger epoch UUID>:<monotonic sequence>` grammar; the concrete type
is generated from validated epoch/sequence fields rather than accepting arbitrary string
interpolation. The eight stateful methods enforce the state order above and return closed exact tuple
types, never raw descriptors or paths. `close` uses the executor's reserved control lane and reports
uncertain if any admitted post-effect stage lacks durable classification. Root close affects this
session but does not stop the shared executor or unrelated roots.

The native state/method table is closed. `close` is an idempotent control operation from every
non-closed state; the table names the only admitted next ordinary method:

| State                                                   | Only admitted next method                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `opened`, every replacement                             | `prepareReusableScratch` exactly once; first replacement also owns the already written seed token          |
| `scratch-prepared`, first replacement                   | `publishBackupSeed` only after the adapter acknowledges the matching durable seed-intent ledger frame      |
| `backup-seed-published-unsynced`                        | `syncPublishedBackupSeed` only after the adapter acknowledges the matching durable unsynced ledger frame   |
| `backup-seed-durable`                                   | `publishConfig` only after the adapter acknowledges the durable config `publication-intent` frame          |
| `initial-prepared`/`scratch-prepared`, no seed          | `publishConfig` only after the adapter acknowledges the durable `publication-intent` frame                 |
| `config-published-unsynced`                             | `syncPublishedConfig` only after the adapter acknowledges the matching durable unsynced frame              |
| `config-durable` replacement                            | `publishBackup` only after the adapter acknowledges config `durable` and the durable backup `intent` frame |
| `backup-published-unsynced`                             | `syncPublishedBackup` only after the adapter acknowledges the matching durable unsynced frame              |
| `config-durable` initial / `backup-durable` replacement | `settleReusableScratch` after exact canonical/backup/scratch revalidation and parent sync                  |
| `settled`                                               | no ordinary method; `close` finalizes native ownership                                                     |
| `uncertain`/`closing`                                   | native control cleanup/recovery only; every ordinary call rejects without effect                           |
| `closed`                                                | no method is admitted; repeated `close` returns the cached exact control result                            |

Each adapter acknowledgement is a bounded generation token returned by the selected-pair ledger
append, bound to operation ID, stage/substate, exact tuple digest, selector generation, and session
generation. The native session rejects a missing, stale, skipped, or foreign acknowledgement. This
makes the JavaScript/native handoff executable without giving native code ledger-write authority or
letting JavaScript advance a filesystem state without the corresponding durable frame.

Descriptor ownership follows inode identity rather than a mutable pathname. Before initial publish,
the session owns candidate and independent scratch descriptors. No-replace moves only the candidate
name to canonical; the same held candidate descriptor then proves canonical while the scratch
descriptor stays at its separate name. Before replacement, the session owns descriptors for exact
canonical, scratch, optional seed/`.bak`, config lock, and root. Config exchange swaps names while
the canonical and scratch descriptors keep identifying their original inodes; backup exchange does
the same for old-canonical and prior-backup inodes. After every effect the session opens bounded
verification descriptors for all resulting names and rejects a tuple unless each name maps to the
expected held inode/digest. Verification descriptors are session-owned and close before the live
handle/control reservation is released. `settleReusableScratch` transfers only the new durable
scratch identity to the registry; no descriptor ownership transfers back to JavaScript.

Recovery uses a third closed factory variant and the same durable session generation. It acquires
root, ledger, then config and retains that same ledger lease through classification, reconstructed
session settlement/close, and reverse config-then-ledger release. While holding those leases, it
opens only names recorded by the selected operation row, verifies
root/marker/mount plus every recorded device/inode/mode/owner/link/size/digest tuple, reserves the
same descriptor/control capacity, and reconstructs exactly the last durable state. Seed
`published-unsynced`/`durable` recovery expects the seed identity at `.bak` and the complete candidate
in scratch; config intent/unsynced/durable recovery expects the recorded canonical/scratch tuple;
rotation intent/unsynced/durable recovery additionally expects the recorded `.bak` tuple. An
effect-before-frame tuple is classified and the missing frame is appended before the next method;
the rename is never repeated. Recovery generates no new name, does not recreate scratch, does not
copy request bytes, and never falls back to an earlier state. A missing/moved/linked/replaced name or
digest mismatch creates one credited retained-evidence/`uncertain` frame and poisons strong mutation.

Before any create/open that belongs to an operation, admission reserves the JavaScript handle/control
pairs listed below and one fixed eight-descriptor native session budget. Moved publication handles
transfer their already reserved descriptor/control ownership into that budget without double
counting; they do not release capacity at wrapper invalidation. Each resulting-name verification
open consumes one of those pre-reserved descriptors and closes or replaces an older verification
descriptor before another open. A reader reserves its handle/control pair and one descriptor before
open. Capacity failure or cancellation before the first open is typed no-effect. Reservations remain
charged through actual native close/control settlement, including caller timeout and N-API teardown.

The online layout has only three normal names: canonical config, `.bak`, and one ledger-bound
single-link regular scratch slot. The scratch identity is durable infrastructure, not a fresh temp
per successful write. It is capped at the 8 MiB config limit, remains owned by the ledger across
operations, and is never unlinked. Before preparation, native code opens the exact expected scratch
inode by descriptor, verifies owner/mode/link count/name/root/marker/mount and the prior ledger
identity, then truncates and writes only that captured inode. It revalidates the name and identity
after `fdatasync`. A pathname replacement cannot redirect the write to foreign bytes; a moved or
renamed captured inode makes the slot unavailable/uncertain before canonical publication and is not
silently replaced. The scratch slot may be initialized with no-replace while absent and the parent
is synced before it is recorded as reusable.

Bootstrap and first-backup topology are finite and separately credited:

- **Canonical absent.** The operation reserves two fresh names, three native handle/control pairs
  (candidate publication, scratch publication, and eventual session),
  at most 8 MiB candidate bytes, the empty scratch allocation, two exceptional evidence entries,
  and all 16 parent ledger-frame credits before either create. Normal success consumes 11 of those
  credits. The `reserved` frame commits both unpredictable names,
  their expected absence, byte/entry/frame requirements, session generation, and the exact
  initial-absence tuple. On resubmission the native reservation atomically acquires all three
  handle/control pairs and the session descriptor budget before open/create. A
  normal one-shot `PublicationHandle` creates/writes/`fdatasync`s the candidate. The adapter then
  appends `scratch-init-intent`; a second normal one-shot handle creates the independently named
  ledger-bound scratch with zero bytes and `fdatasync`s it. Bootstrap substate
  `scratch-created-unsynced` records the returned identity; only parent sync plus exact name,
  root/mount/owner/mode/link-count revalidation writes `scratch-ready`. The adapter then records
  top-level `prepared`, moves both terminal
  publication tokens into one `initial-prepared` session, and invalidates their ordinary wrappers.
  `publication-intent -> RENAME_NOREPLACE(candidate, canonical) -> published-unsynced -> parent
sync/revalidation -> durable` consumes the candidate into canonical and leaves the independently
  created scratch. There is no post-commit scratch recreation. The exact 11 frames are top-level
  `reserved` with bootstrap `none`, the same top-level `reserved` with bootstrap
  `scratch-init-intent`, `scratch-created-unsynced`, then `scratch-ready`, top-level `prepared`,
  `publication-intent`, `published-unsynced`, `durable`, the same top-level `durable` with scratch
  `settled`, `observer-pending`, and terminal. Crash before an identity frame preserves the name
  already committed by `reserved` as uncertain evidence; recovery never invents ownership from
  pathname alone. Crash after `scratch-ready` may reuse only that exact identity. A preexisting
  candidate/scratch name or `EEXIST` at no-replace is conflict before the later effect and never
  adopts the incumbent.
- **First replacement with `.bak` absent.** Admission reserves the existing scratch, one fresh random
  backup-seed name, two native handle/control pairs (seed publication and eventual session), 8 MiB
  seed bytes, two exceptional evidence entries, and all 16 parent ledger-frame credits before seed
  creation or scratch mutation. Normal success consumes 15 of those credits. `reserved` commits the
  seed name, exact absent
  `.bak`, incumbent/scratch tuples, session generation, and all durable byte/entry/frame
  reservations. On resubmission the native reservation acquires both handle/control pairs and the
  session descriptor budget before open/create. While holding the incumbent descriptor and
  exclusive config lease, a one-shot `PublicationHandle` copies the bounded incumbent into the seed
  and `fdatasync`s it; backup `seed-prepared` records that identity. The factory moves the terminal
  seed token into the session, then the session writes/`fdatasync`s/revalidates the candidate in the
  reusable scratch and the adapter records top-level `prepared`. Only then does the adapter append
  backup `seed-intent` and call `RENAME_NOREPLACE(seed,.bak)`.
  `seed-published-unsynced -> parent sync/revalidation -> seed-durable` consumes the fresh name. The
  already prepared session then exchanges canonical/scratch, records/syncs config durability,
  exchanges scratch/`.bak`, and records/syncs backup durability. The final tuple is canonical=new,
  `.bak`=the exact old canonical inode, scratch=the exact seed-copy inode. The exact 15 frames are
  top-level `reserved` with backup `none`, the same top-level `reserved` with backup `seed-prepared`,
  top-level `prepared` retaining that seed substate, the same `prepared` with backup `seed-intent`,
  `seed-published-unsynced`, then `seed-durable`, config `publication-intent`, config
  `published-unsynced`, config `durable`, the same top-level `durable` with backup
  `rotation-intent`, `rotation-published-unsynced`, then `rotation-durable`, the same top-level
  `durable` with scratch `settled`, `observer-pending`, and terminal. A crash after seed publication
  retains the exact prepared scratch candidate and can classify/resume without reconstructing
  request bytes. No extra name survives exact success.
- **Later replacement.** No fresh filesystem name is created. Admission reserves one session
  generation and its durable byte/entry/frame requirements on the first call. Resubmission reserves
  one native session handle/control pair and descriptor budget before opening or mutating scratch.
  The new per-operation session prepares the recorded scratch once, exchanges canonical/scratch,
  then scratch/`.bak`. Admission atomically reserves all 16 parent ledger-frame credits before that
  effectful resubmission; normal success consumes 11:
  frames: `reserved`, `prepared`, config `publication-intent`, config `published-unsynced`, config
  `durable`, the same top-level `durable` with backup `rotation-intent`,
  `rotation-published-unsynced`, then `rotation-durable`, the same top-level `durable` with scratch
  `settled`, `observer-pending`, and terminal. Settlement requires exact canonical, backup, and
  scratch tuples and final parent sync.

The 11/15/11 counts are normal-success consumption, not admission reservations. In the same durable
selected-pair transaction that creates the operation's `reserved` row, admission atomically charges
all 16 parent credits to that operation before effects. The parent's selected-pair ordinal and
90,000-frame operating threshold include all 16 outstanding credits, so a concurrent operation or
rollover cannot consume this operation's uncertainty capacity. Initial and later success each
release five unused credits at terminalization; first-backup success releases one. A fault consumes
one of the already charged credits to atomically record the exact retained-evidence tuple, affected
substate, and top-level `uncertain`; it does not append separate evidence and terminal frames or
require an unreserved seventeenth credit. A terminal result releases every unused credit in the same
generation-CAS transaction. Admission refuses before effects unless all 16 credits can be charged.

The session performs and returns these finite stages:

1. Revalidate the named parent, marker, lease identity, staged name/descriptor, and incumbent
   name/descriptor against the held identities.
2. `publishConfig()` performs only the canonical no-replace/exchange effect. For an absent incumbent
   it calls `RENAME_NOREPLACE`; for replacement it calls `RENAME_EXCHANGE`. It immediately opens and
   identifies every resulting name and returns an exact `published-unsynced` tuple without syncing
   the parent. Replacement is accepted only when canonical is the staged identity/digest and the
   scratch name is the captured incumbent. The session remains live and retains every descriptor.
3. After the adapter durably appends the matching `published-unsynced` ledger frame,
   `syncPublishedConfig()` syncs the parent and revalidates the tuple. It returns `durable` only after
   both succeed. A sync error after rename is uncertain, never retryable. Crash before the ledger
   append leaves `publication-intent`; recovery classifies the exact names. Crash after sync but
   before the `durable` frame re-syncs/revalidates and advances once; it never republishes.
4. Replacement backup uses the same staged-call shape. If `.bak` is absent, the session first
   prepares scratch and the adapter fsyncs top-level `prepared`; it then fsyncs seed `intent`, calls
   session `publishBackupSeed()` for no-replace, fsyncs the returned seed `published-unsynced` tuple,
   calls `syncPublishedBackupSeed()`, and fsyncs seed `durable` before config publication. For
   routine rotation, `publishBackup()` exchanges scratch (the old canonical) with `.bak` and returns
   the exact unsynced tuple; after the matching backup frame, `syncPublishedBackup()`
   syncs/revalidates. The resulting `.bak` is the old canonical and scratch is the prior backup,
   ready for the next operation only after the ledger records its exact reusable
   identity/digest/size.
5. Do not unlink a displaced, temp, quarantine, or superseded-backup name in the online adapter.
   Linux has no expected-inode unlink CAS, so even a comparison and `unlinkat` inside one Rust task
   leaves a same-UID last-barrier replacement window. The operation records the exact retained name,
   identity, digest, logical bytes, and allocated bytes as durable evidence. A mismatch preserves
   every name and returns uncertain; it never deletes whatever currently occupies the name.

The operation does not claim Linux provides an expected-inode rename or unlink CAS. It closes the
JavaScript scheduling gap and returns enough held identity evidence for the durable state machine.
On a displaced-incumbent mismatch, it follows the parent contract exactly: it attempts a reverse
exchange only while the canonical name still resolves to the candidate and the displaced name still
resolves to the just-observed replacement, then verifies the reversed tuple and syncs the parent.
Exact verified reversal is `no-effect-conflict`. A failed comparison, later replacement,
reverse-exchange ambiguity, or sync ambiguity preserves evidence and is `uncertain`. Unknown or
mismatched tuples never trigger a blind `unlinkFile(name)`.

The normal layout is sustainable: after exact config and backup durability, the adapter records one
reusable scratch identity and releases the operation's transient/evidence reservations. At most
canonical config + `.bak` + scratch remain, each capped at 8 MiB; routine successful writes do not
consume a new retained name or a permanent 16 MiB reservation. Release occurs only after one durable
ledger CAS proves canonical, backup, and scratch identities/digests/sizes plus parent sync. A crash
before that CAS resumes classification from the exact top-level and backup stages; it cannot simply
free capacity.

Exceptional ambiguity is still bounded. The config parent admits at most 16 retained evidence
entries and 64 MiB of retained logical bytes; allocated bytes are separately measured and must also
remain at or below 64 MiB. With the ledger lease acquired before the config lease and both held,
admission reserves the
operation's worst-case two exceptional evidence entries and 16 MiB before scratch preparation or a
rename effect. Count, logical-byte, allocated-byte, or scan-bound saturation returns typed
`CONFIG_EVIDENCE_FULL` with zero publication effect. Exact success converts the scratch reservation
back to the one reusable-slot reservation and releases the remainder; an uncertain or mismatched
tuple keeps its exceptional reservation and poisons further strong config mutation rather than
creating another scratch name. A terminal uncertain receipt keeps that reservation until a
stopped-service operator inspects the files. A separate offline reconciliation command accepts a
root-owned mode-`0600` manifest through the parent's held-descriptor import protocol, takes the
exclusive config-root lease, and releases only exact operation/name/identity/digest reservations
that the bounded parent scan proves absent. It never deletes or renames a file. V1 provides no RPC,
online CLI, recovery, or background path that deletes exceptional evidence. Missing evidence
without that explicit manifest, a present entry, or a replacement is visible and uncertain rather
than silently retired.

The current generic `renameNoreplace`, `renameExchange`, and `unlinkFile` stay available to the
reviewed probe and private lower-level tests. They are not accepted as the canonical config adapter.
The TypeScript facade exposes the compound result only inside `src/config/transactions/` and the
package's private integration module; plugins cannot import it.

### 4. Durable order and crash classification

Use the parent contract's selected-pair ledger, capacity reservation, frame limits, fsync order,
compaction, and corruption policy without a child stage alias. One config operation uses exactly:

1. `reserved` after bounded preparation/validation and before the first candidate, scratch, backup,
   or publication effect;
2. `prepared` after either (a) initial candidate plus independently created empty scratch or (b) the
   reusable scratch candidate is completely written, `fdatasync`ed, name/identity revalidated, and
   identified; the initial branch retains its explicit scratch-init substates and the first-backup
   branch retains its explicit seed substates described above;
3. `publication-intent` after the exact candidate/incumbent/scratch tuple and worst-case retained-
   evidence reservation are durable, before the corresponding rename;
4. `published-unsynced` after no-replace/exchange evidence but before parent sync;
5. `durable` only after parent sync and exact post-publication identity verification;
6. `observer-pending` after the publication outcome is durable and before reload/cache/audit/response
   observers settle;
7. terminal `committed`, `no-effect`, or `uncertain`.

Bootstrap, backup, and scratch settlement are bounded fields on the same record, never replacement
top-level stages. Bootstrap is `not-required`, `scratch-init-intent`,
`scratch-created-unsynced`, `scratch-ready`, or `uncertain`. Backup is `not-required`,
`seed-prepared`, `seed-intent`, `seed-published-unsynced`, `seed-durable`, `rotation-intent`,
`rotation-published-unsynced`, `rotation-durable`, `retained-evidence`, or `uncertain`. Scratch is
`not-required`, `recorded`, `settled`, or `uncertain`. Every substate update is a generation-CAS
ledger frame consuming one of the operation's exactly 16 admission-reserved parent credits while the
top-level stage stays one of the exact parent values above. Config publication plus worst-case
bootstrap, seed, rotation, settlement, observer, and terminal classification fits within that
reservation. The adapter may not enter seed or rotation `intent` until its exact candidate/displaced
tuple and evidence capacity are durable. It may not enter `observer-pending` until config
durability and scratch settlement are proved, and it never collapses pre-sync and post-sync states.

The transaction's selected-pair ledger authority, owned by `src/config/transactions/`, is the only
writer of these frames. It uses the already reviewed cross-process ledger lock and fsync protocol;
neither an RPC responder nor an arbitrary callback writes a stage. On an effect-owning resubmission
every append below uses the one exclusive ledger lease acquired before config and retained through
session settlement/close; no step reacquires ledger while config is held. The exact call order is:

1. initial creation follows its exact reserved/scratch-intent/scratch-unsynced/scratch-ready/prepared
   prefix. Replacement with absent `.bak` follows reserved/seed-prepared, native scratch
   preparation, and top-level `prepared` before seed publication; it then appends seed intent, calls
   native no-replace, appends seed unsynced, calls native sync, and appends seed durable. The adapter
   passes the resulting ledger acknowledgement token into each session method that may advance;
2. for initial creation, later replacement scratch preparation, or first replacement after seed
   durability, the adapter appends and fsyncs
   `publication-intent`, passes its acknowledgement to native `publishConfig()` once, then stores
   the returned exact unsynced tuple;
3. the adapter appends and fsyncs `published-unsynced`, passes that acknowledgement to native
   `syncPublishedConfig()`, and stores the returned exact durable tuple;
4. the adapter appends and fsyncs `durable` before beginning the backup substate. Replacement then
   appends and fsyncs backup `intent`, calls native `publishBackup()`, appends and fsyncs backup
   `published-unsynced`, calls native `syncPublishedBackup()`, and appends and fsyncs backup
   `durable`, passing the matching acknowledgement at each boundary; and
5. the adapter calls `settleReusableScratch()` only after the config-durable acknowledgement for an
   initial operation or backup-durable acknowledgement for a replacement. It appends and fsyncs the
   returned exact reusable-scratch settlement CAS, releases transient filesystem/evidence capacity,
   appends and fsyncs `observer-pending` through the same held ledger lease, closes the native
   publication session and config lease, then releases the ledger lease. Only after both operation
   leases are released does it run observers. Observer terminalization reacquires ledger alone and
   releases unused frame credits; it never reacquires ledger under config.

These are distinct awaited native calls, not one Promise that reports invented intermediate state.
The session keeps the root/ledger/config operation leases, descriptors, control capacity, and absolute parent
deadline across the gaps. If the process dies after a filesystem effect but before its corresponding
frame, recovery starts from the prior durable `intent` and classifies the exact tuple. If it dies
after sync but before the durable frame, recovery syncs/revalidates and advances the frame without
repeating the rename. A JS exception, response loss, deadline, or environment close after an effect
transfers the session to registered control cleanup/recovery and can only yield committed or
uncertain, never proven no-effect.

`no-change`, pre-effect expiry, and an expected-base/input conflict terminalize as ledger
`no-effect`; result detail distinguishes `no-change` from `no-effect-conflict`. `committed` and
`committed-with-warning` terminalize as ledger `committed`, retaining backup/evidence/observer
detail. Any unclassified post-effect tuple or durability failure terminalizes or remains live as
`uncertain` according to the parent recovery grammar. A response failure cannot change these states.

Initial and replacement recovery use the exact tuples defined by the parent amendment. Missing
prepared bytes before publication terminalize as proven interrupted/no-effect only when every
created name is classified. An unpublished first-backup seed plus unchanged canonical/scratch is
proven no config effect only when the exact seed name/inode remains classified as retained evidence;
it is never unlinked online. Once first replacement reaches top-level `prepared`, the complete
candidate resides in the exact scratch before seed publication, so every seed-intent-or-later crash
can resume/classify from durable bytes without a request replay. Exact new target plus the
independently created, exact `scratch-ready`
inode after initial no-replace is committed after parent sync and ledger CAS. A missing, moved,
linked, or replaced bootstrap scratch makes future mutation unavailable/uncertain; recovery never
creates an unrecorded substitute after commit. Exact new target plus exact old canonical in scratch
after exchange advances to config `durable`, then resumes the recorded backup substate. Exact old
canonical in `.bak` plus exact prior backup in scratch settles the reusable slot and releases
transient capacity. Any other tuple is conflict/uncertain; recovery never reconstructs bytes,
overwrites an unknown name, deletes an evidence name, or replays an effect.

Backup failure cannot turn a committed config write into a retryable failure. Reload, restart,
cache invalidation, audit append, and responder work run after the durable config result. Their
failure is visible but cannot reclassify or replay the publication.

### 5. Caller conversion and one-cycle compatibility

Convert callers in dependency order:

1. `config.set`, `config.patch`, `config.apply`, config CLI, and `scripts/edit-gateway-config.ts` use
   the parent contract's server-issued `<ledger epoch UUID>:<monotonic sequence>` operation-ID
   admission handshake and status reconciliation.
   The first call may only reserve and return `CONFIG_OPERATION_ADMISSION_REQUIRED`; the identical
   resubmission owns the first effect. This slice owns the first end-to-end production proof.
2. Internal Gateway, chat, channel, browser, hooks, repair, and CLI/wizard writers use synchronous
   pure updaters through the common transaction. Each caller supplies stable actor/method metadata
   and receives no raw handle.
3. Replace `PluginRuntime.config.writeConfigFile` with a scoped updater API. For one release cycle,
   a compatibility wrapper may accept a whole-config proposal only with the parent contract's
   opaque enumerable snapshot token bound to plugin ID, runtime generation, exact path-presence
   tree, keyed base digests, and one operation. It computes the bounded diff during preparation and
   applies only touched paths to the fresh locked config. Tokens are single-use, live at most five
   minutes, and are capped at 32 per plugin and 256 globally without silent eviction. Missing,
   foreign, reused, expired, oversized, or post-reload tokens fail with
   `CONFIG_WRITE_UPGRADE_REQUIRED` and zero writes. The wrapper is removed only after the separately
   reviewed compatibility cycle.
4. Connected macOS writes use Gateway RPC. The existing local fallback runs only after a typed
   pre-dispatch unavailable/no-effect result. Timeout, closed socket after dispatch, committed, or
   uncertain never falls through to a local second write.
5. Docker first-start creation and non-deleting setup/restore are explicit
   bootstrap/offline-exclusive rows. They prove process stop and the exclusive root lease before
   effects. Rollback-to-absent remains `CONFIG_DELETE_UNAVAILABLE`; its raw `rm` path is disabled,
   not grandfathered as an offline writer. None of these rows may advertise strong capability from
   shell primitives.

### 6. Four-target build, aggregation, and pack

Split host development builds from release assembly:

- `build-native-target` builds exactly one tuple in a clean target directory and emits the addon plus
  a canonical content-addressed receipt containing all fields required by the parent spec. It never writes the
  embedded manifest or deletes another tuple's output.
- A checked `release-targets.json` names exactly the four tuples, checksum-pinned build image digest,
  native runner class, expected libc/architecture, Rust target, and clean-install runner. A missing,
  mutable, or unreviewed image digest fails before compilation.
- `assemble-native-release` accepts exactly one receipt/artifact per tuple from the same source
  commit, package version, N-API/export schema, `Cargo.lock`, Rust toolchain policy, and deterministic
  flags. It verifies each byte length/SHA/SRI/build identity, rejects duplicate/extra tuples, sorts by
  tuple bytes, writes one canonical four-entry manifest and embedded-manifest module, and copies all
  four addons. It never trusts a sidecar value without recomputing it from the artifact.
- Root `pnpm build` copies the reviewed loader/runtime JavaScript, byte-identical embedded and sidecar
  manifest, and all four addons into `dist/native/linux-fs-atomic/`. `npm pack` runs only after the
  assembler and fails if the tarball has anything other than the exact four entries or if
  `releaseQualified` lacks the complete evidence set.
- Pull requests run native package source/type/lint tests, x64 glibc and musl clean installs, arm64
  full-system emulation, pack inspection, and deterministic two-build comparison. Release runs the
  exact tarball on native x64 glibc/musl and hardware arm64 glibc/musl. User-mode syscall translation
  is not release evidence.

The canonical release manifest contains only the deterministic artifact/build fields required by
the parent contract. A separate qualification receipt binds its digest to test-run identifiers and
hardware evidence; nondeterministic run IDs never enter the reproducible manifest. Neither artifact
contains secrets, runner paths, or mutable URLs. A host-only build remains
`releaseQualified: false`, even when all source tests pass.

### 7. Source ratchet and capability advertisement

Generate the parent contract's multi-language writer manifest from the frozen baseline and fail on
any unclassified production writer. Each row records source, actor, target, mutation kind, converted
API, operation/retry handling, and `strong`, `compat-only`, `offline-exclusive`, or
`blocked-pending-delete` disposition. A blocked row is classified for the ratchet but prevents this
integration from claiming every writer converted or overall GW-022A closure.

Generate a separate canonical-config reader manifest before enabling reusable scratch. It follows
imports, aliases, re-exports, computed property access, direct `fs`/Bun/Deno/native reads, Swift
`Data`/`FileHandle`, shell utilities/redirections, and extension/plugin access. Every supported-Linux
row must terminate at one of the bounded transaction readers: acquire the shared config lease, open
and verify the canonical inode through the held parent, materialize at most 8 MiB, close the native
descriptor, release the lease, and only then parse or return an immutable/cache-owned copy. The
central `loadConfig` cache may serve already materialized objects without reacquiring, but every
cache miss/reload and `readConfigFileSnapshot*` path uses that reader. Snapshot, include, migration,
repair, logging, and direct CLI reads are explicit rows, not assumed covered by the `loadConfig`
call count. Darwin/Windows and stopped-service tools are classified `compat-only` or
`offline-exclusive`; no unclassified supported-Linux canonical reader remains. Runtime tests hold a
reader across a replacement and prove the writer waits before scratch truncation, the reader sees
the complete old bytes, and close/release admits the writer. AST mutants restoring any raw canonical
read or returning a live descriptor fail. This reader manifest is an implementation and release
gate for the parent amendment, not a claim that the current hundreds of `loadConfig()` callers each
hold a descriptor.

On supported Linux, config mutation is advertised only after loader verification, config-parent
probe, ledger health, operation-capacity check, complete reader and writer ratchet qualification,
and scratch-registry recovery. Capability is withdrawn on root/marker/mount/scratch drift, a live
unclassifiable reader, poison, corruption, drain, or release-manifest mismatch. Darwin/Windows
compat support is reported separately and never satisfies GW-005/GW-025 or HC-034.

## DELTA

1. Add the private compound publication result/stages and bounded evidence retention needed by the
   config adapter. Keep generic primitives private; the online adapter has no unlink path.
2. Add `src/config/transactions/` with immutable validation capture, root/probe ownership, ledger,
   same-filesystem admission, durable publication/recovery, operation status, and observer isolation.
3. Convert the three config RPCs and config CLI to exact `<ledger epoch UUID>:<monotonic sequence>`
   operation IDs and status reconciliation. Preserve the current success shape and add typed
   no-effect/committed/uncertain errors/results.
4. Add one updater registry and convert all checked TypeScript callers. Add the bounded one-cycle
   plugin wrapper and remove it at its stated compatibility deadline.
5. Convert Swift and non-deleting shell/Docker rows to connected, compat-only, or
   offline-exclusive behavior. Disable rollback-to-absent as `blocked-pending-delete` until its
   separate contract is approved and implemented.
6. Replace the one-target build with four independent target receipts, deterministic aggregation,
   root-dist copy, exact tarball checks, and native clean-install qualification.
7. Add and enforce the checked TypeScript/Swift/shell writer manifest. `releaseQualified` remains
   false until every production writer and canonical-config reader row is classified and every
   release lane passes.

## Implementation slices and ownership

| Slice                       | Owned production area                                                    | Acceptance before next slice                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: native publication delta | `packages/linux-fs-atomic` native/TS private integration only            | last-barrier, crash, mismatch, evidence-retention, saturation, drain, and sibling-root tests pass; public plugin surface unchanged                  |
| B: config transaction       | new `src/config/transactions/`, narrow integration in `src/config/io.ts` | actual two-process CAS, ledger restart/corruption/capacity, same-filesystem and observer tests pass; no general caller conversion claim             |
| C: RPC and CLI              | config server methods, protocol types, config CLI/status                 | lost-response reconciliation, actual WS, exact result mapping, no duplicate replay                                                                  |
| D: caller migration         | checked Gateway/extension writer and canonical-reader rows               | writer/reader manifests reach zero unclassified rows and list rollback-to-absent as blocked; plugin wrapper bounded; no all-writers-converted claim |
| E: native distribution      | package build/assembly scripts, root build/pack, CI/release jobs         | exact four-tuple tarball and clean-install matrix; `releaseQualified` still false until hardware receipts pass                                      |
| F: platform writers         | macOS and setup/Docker rows                                              | SwiftSyntax/shell ratchets plus connected/compat/offline-exclusive races pass                                                                       |

Workers are not alone in the repository. Each slice owns only its listed files, preserves unrelated
WIP, and produces an exact file hash manifest and focused qualification receipt before staging.

## Verification

### Test matrix

| Invariant               | Required executable proof                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh base              | Two processes patch disjoint fields from the same base. Exactly one wins that base; the loser conflicts before publication, rereads, and may submit a new operation without erasing the winner.                                                                                                                                                                                                                                                                         |
| Initial publication     | Kill before/after candidate create/write/sync, scratch intent/create/write/sync/parent-sync/ready, session transfer, canonical no-replace, unsynced frame, parent sync, durable frame, and settlement. Recovery returns absent or complete new JSON plus the independently created exact scratch; it never recreates a scratch after commit or exposes partial bytes.                                                                                                   |
| First backup seed       | Starting with canonical + scratch and absent `.bak`, kill before/after seed create/write/sync/prepared frame, scratch preparation/top-level prepared, seed intent/no-replace/unsynced/parent-sync/durable, both exchanges and every following frame. Recovery preserves exact candidate and seed/backup tuples, resumes without replay, and exact success leaves only canonical + `.bak` + scratch.                                                                     |
| Replacement publication | Kill before exchange, after exchange before the unsynced frame, after that frame, after parent sync, before durable frame, through every backup frame/call, and before scratch-settlement CAS. Recovery never republishes.                                                                                                                                                                                                                                              |
| Session lifecycle       | Reject every method in every wrong state, stale/foreign/skipped ledger acknowledgement, double prepare/publish/sync/settle, and ordinary call after close/uncertain. Fault factory transfer, close, root close, and environment teardown at each state; exact one owner closes every descriptor/lease, no clean result hides an unclassified effect, and a sibling root continues.                                                                                      |
| Reader fencing          | Hold a production canonical reader across replacement in another process. The reader sees unchanged complete old bytes, scratch preparation remains blocked without mutation, then close/release admits the writer. Direct-read and returned-live-descriptor mutants fail the generated reader ratchet.                                                                                                                                                                 |
| Scratch authority       | For bootstrap, seed, preparation, both exchanges, settlement, and recovery, inject scratch rename, original-name replacement, same-parent/outside-parent hard link, held reader, owner/mode/size drift, and root/marker drift before `ftruncate`, during write, before `fdatasync`, and before publication. Pre-write mismatch changes zero bytes; post-write scratch-only drift is retained uncertainty and poisons publication. Final link count is exactly one.      |
| Sustainable replacement | Run at least 100 sequential worst-size successful replacements, including initial creation and absent-`.bak` seed, with rotating backup. Every receipt commits, the layout remains canonical + `.bak` + one scratch, transient/evidence/handle/frame-credit capacity returns to baseline, and no terminal `PublicationHandle` is reset.                                                                                                                                 |
| Frame-credit ownership  | At each initial/first-backup/later branch boundary, atomically charge all 16 credits before effects, race another operation and rollover against the reserved uncertainty credit, and prove neither can consume it. Normal terminal success consumes exactly 11/15/11 and releases 5/1/5 unused credits in the same CAS; injected uncertainty consumes a charged credit and never requires a seventeenth frame. Restart reconstructs the same outstanding-credit count. |
| Evidence capacity       | Race count/logical/allocated-byte boundary admission in two processes. One exceptional reservation wins; full capacity returns `CONFIG_EVIDENCE_FULL` before scratch mutation and survives restart.                                                                                                                                                                                                                                                                     |
| Same filesystem         | Exercise bind-mount drift, mismatched `statx` and fdinfo mount IDs, `EXDEV`, moved descendant, and external snapshot on another filesystem. Publication has zero canonical effect except bounded scratch preparation.                                                                                                                                                                                                                                                   |
| Delete withheld         | `delete` and rollback-to-absent return `CONFIG_DELETE_UNAVAILABLE` before ledger reservation or filesystem effect; writer ratchets reject a restored raw `rm`, unlink, or copy-over fallback.                                                                                                                                                                                                                                                                           |
| Operation identity      | Reject malformed/noncanonical epoch or sequence, zero/overflow/leading-zero sequence, old epoch, retired high-water IDs, malformed/reused/changed session generation, and the same ID with changed actor, method, credential generation, or intent digest. Race two resubmissions of one generation; exactly one live native reservation crosses the config lock.                                                                                                       |
| Lost response           | Kill after durable config commit before WS response. Reusing the same `<epoch>:<sequence>` returns the stored receipt and produces no second publication/reload.                                                                                                                                                                                                                                                                                                        |
| Post-commit failure     | Force backup, cache, audit, reload, restart-sentinel, and responder failures separately. Config remains one committed result; caller gets a visible warning/uncertain observer state and never a retryable write failure.                                                                                                                                                                                                                                               |
| Plugin wrapper          | Token replay, expiry, wrong plugin, base drift, computed/out-of-scope path, oversized diff, and concurrent updater all reject without publication. One valid scoped change commits once.                                                                                                                                                                                                                                                                                |
| macOS fallback          | Gateway response loss after dispatch never triggers local save. Typed pre-dispatch unavailable permits one compat save and reports weak capability.                                                                                                                                                                                                                                                                                                                     |
| Offline maintenance     | A live process/root lease blocks setup, snapshot restore, layout migration, and volume split. Stopped service plus exact exclusive lease admits only reviewed non-delete operations; rollback delete stays unavailable.                                                                                                                                                                                                                                                 |
| Writer/reader ratchet   | Mutants add TypeScript alias/re-export/star/computed/raw writer or canonical reader, returned live reader descriptor, Swift `Data.write`/read, shell `cp`/redirection/`rm`/read, and a new source-language file. Every production mutant fails; exact test fixtures remain classified.                                                                                                                                                                                  |
| Target assembly         | Missing, duplicate, extra, wrong-libc, wrong-arch, wrong-ABI, altered-byte, altered-sidecar, mixed-commit, mixed-lock, and mutable-image receipts fail before pack.                                                                                                                                                                                                                                                                                                     |
| Packed runtime          | Clean installs of the exact tarball select only the matching tuple on native x64/arm64 glibc/musl. Removing/corrupting that artifact returns unavailable and never downloads, builds, or selects another tuple.                                                                                                                                                                                                                                                         |
| Reproducibility         | Two clean builds from identical pinned inputs produce byte-identical addons and manifest for all four tuples. Different input changes `buildIdentity` and manifest.                                                                                                                                                                                                                                                                                                     |
| Release gate            | Source/package tests, emulation, or three target receipts cannot close GW-022A. Hardware/pack proof is still insufficient while any writer is `blocked-pending-delete`; no overall release/closure claim is emitted.                                                                                                                                                                                                                                                    |

## Release and residuals

This slice is locally complete only for replace/update publication when its supported writer rows
and four-target qualification pass. It cannot claim every writer converted, overall GW-022A
closure, or production release while rollback-to-absent remains `blocked-pending-delete`. The exact
reviewed tarball/hardware receipts and the later durable-delete receipt are separate mandatory
readiness entries. No merge, npm publication, deployment, or production mutation is authorized by
this spec.

Managed-workspace physical cleanup remains owned by
`proposals/2026-10-03-gateway-managed-writer-leases.md`. GW-005/GW-025 and HC-034 may consume this
capability after their own reviewed integrations, but this slice does not close those findings.
