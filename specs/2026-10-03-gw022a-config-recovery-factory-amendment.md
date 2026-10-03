---
id: 2026-10-03-gw022a-config-recovery-factory-amendment
title: Classify post-crash config publication before resuming a retained native session
stage: spec
verdict: approved
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion, minion-meta]
tags: [security, logic, data, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
findings: [GW-022A]
---

## 0. Product

Gateway configuration publication recovery within the existing private native package. The recovery path must classify durable intent before permitting another write.

## Out of scope

Production config/RPC/CLI imports, public release, loader ABI changes and distribution are outside this amendment.

## Verification

Execute the recovery/factory crash matrix and retained baseline proof obligations below against the actual addon; publication and release remain separate.

# GW022A config recovery-factory amendment

## 0. Product and scope

A durable config intent can survive a process crash on either side of its rename syscall. Recovery
must inspect the exact filesystem tuple, tell the ledger which state it observed, and prevent every
later mutation until the selected ledger has durably caught up. It must never replay a rename merely
because the last durable frame is an intent.

This is a narrow amendment to
`meta/specs/2026-10-03-gw022a-config-cas-distribution.md` at reviewed source SHA-256
`8ee807b3dc8127b8050fd6d3c095c1593a750bf0cd200b8d0d61992b6457b46f`. Its filesystem,
executor, lock order, descriptor budgets, 16-credit admission, sustainable scratch, selected-pair
ledger, and four-target release requirements remain controlling. This amendment changes only the
private recovery factory. It does not authorize production config wiring or a release claim.

## 1. AS-IS

The approved parent contract requires an effect-before-frame recovery to classify exact names and
append the missing frame before the next method. The current uncommitted Slice A factory instead
accepted a durable intent and mapped it directly back to the pre-effect session state:

- `src/config_publication/session.rs`, `create_recovery` and the former `recovery_state`, mapped
  config `publication-intent` to initial/scratch-prepared, seed intent to scratch-prepared, and
  backup rotation intent to config-durable.
- `src/config-publication-private.ts`, `recoveryStages`, admitted those three intent forms.
- The factory opened records only under their ledger names. It had no return type for a post-rename
  observation and no state in which it could retain the locks while waiting for a missing frame.

For replacement or backup exchange, replay can exchange the names a second time and restore the old
bytes. For initial or seed no-replace, replay can misclassify an already completed rename as a new
failure. Lost JavaScript acknowledgement and process death after the syscall exercise the same gap.

The immediate safe WIP correction rejects all three intent categories in both TypeScript and Rust.
Already classified `*-published-unsynced`, `*-durable`, `prepared`, and settled frames remain
recoverable. Intent recovery remains unavailable until the two-phase factory below passes both
reviews and its actual-addon crash matrix.

## 2. TO-BE invariants

1. Recovery acquires the existing process root authority, selected-pair ledger lease, and config
   lease in root -> ledger -> config order. It holds ledger and config through classification and
   any required ledger advancement, then releases config before ledger. No callback or observer runs
   while either filesystem lock is held.
2. The factory performs no rename, create, truncate, write, unlink, or sync. It opens only bounded
   ledger-recorded segments below the held config root and observes their exact identities,
   digests, single-link regular-file state, root marker, mount, owner, mode, and named absences.
3. The factory never returns an ordinary `ConfigPublicationSessionHandle`. It returns a retained
   `ConfigRecoveryClassificationHandle` whose only state-changing method is `resume`. The handle
   owns the same descriptor, handle/control, payload, and two lease reservations until `resume` or
   actual control cleanup settles.
4. `resume` cannot execute a rename. If the observed stage is later than the durable stage, it
   accepts only the matching newly fsynced selected-pair ledger acknowledgement. If the stages are
   equal, it accepts only the exact durable acknowledgement already verified by the factory. It
   revalidates the complete observation after that acknowledgement and only then returns a session
   at the observed native state.
5. No ordinary method exists before `resume` succeeds. The returned session exposes only the next
   method from the parent state table. A post-effect observation therefore advances to
   `*-published-unsynced` before any sync method becomes callable, and the rename is never repeated.
6. Zero matching tuples, more than one matching tuple, an unexpected extra retained name, or any
   identity/digest/root/mount drift produces a retained `ConfigRecoveryUnclassifiedHandle`. It
   creates no session and consumes no additional effect credit. Native code does not claim that the
   row is durably poisoned: the adapter must append and fsync the already credited
   `retained-evidence/uncertain` frame before it may report durable poison. Append failure or process
   death leaves the row recovery-only at its prior durable stage so restart can attempt the same
   bounded classification again.
7. Classification is idempotent. A crash before its response, after its response, after the missing
   frame append, or after `resume` acknowledgement can repeat classification without replaying a
   filesystem effect or changing the operation ID/session generation.
8. Closing an unresumed classifier never terminalizes the durable operation as no-effect. It closes
   owned descriptors, releases config then ledger, caches an `uncertain` control result, and leaves
   the same operation eligible only for this recovery path.
9. All validation that can run without native ownership precedes lease transfer. Immediately after
   the factory accepts a reservation or lease, it registers one native control-cleanup record before
   any fallible open, hash, classification, or JavaScript object construction. A rejection before a
   handle is returned settles that record first: it closes every accepted descriptor, releases
   config then ledger, and marks both moved wrappers settled or poisoned. A rejected Promise never
   abandons accepted capacity or a held flock.

## 3. Exact private API

The raw and TypeScript private facades use the same closed shape. Nothing is added to the package
export map.

```ts
type ConfigIntentStage =
  | "publication-intent"
  | "prepared/backup:seed-intent"
  | "durable/backup:rotation-intent";

type ConfigAlreadyClassifiedRecoveryStage =
  | "prepared"
  | "prepared/backup:seed-published-unsynced"
  | "prepared/backup:seed-durable"
  | "published-unsynced"
  | "durable"
  | "durable/backup:rotation-published-unsynced"
  | "durable/backup:rotation-durable"
  | "durable/scratch:settled";

type ConfigRecoverableDurableStage = ConfigIntentStage | ConfigAlreadyClassifiedRecoveryStage;

type ConfigObservedStage =
  | ConfigIntentStage
  | "published-unsynced"
  | "prepared/backup:seed-published-unsynced"
  | "durable/backup:rotation-published-unsynced"
  | ConfigAlreadyClassifiedRecoveryStage;

type ConfigRecoveryObservation = Readonly<{
  schemaVersion: 1;
  operationId: LedgerOperationId;
  sessionGeneration: string;
  branch: "initial" | "replacement-seed" | "replacement";
  durableStage: ConfigRecoverableDurableStage;
  observedStage: ConfigObservedStage;
  relation: "matches-durable" | "ledger-advance-required";
  tupleDigest: string;
  files: readonly RecordedConfigFile[]; // normal-stage tuple order, at most five
  absentNames: readonly string[]; // canonical name order, at most two
}>;

type ConfigRecoveryUnclassifiedEvidence = Readonly<{
  schemaVersion: 1;
  operationId: LedgerOperationId;
  sessionGeneration: string;
  branch: "initial" | "replacement-seed" | "replacement";
  durableStage: ConfigRecoverableDurableStage;
  evidenceDigest: string;
  reason: "zero-match" | "multiple-match" | "authority-drift";
}>;

interface ConfigRecoveryClassificationHandle {
  readonly observation: ConfigRecoveryObservation;
  resume(
    acknowledgement: LedgerStageAck<ConfigObservedStage>,
    operation: FsOperationContext,
  ): Promise<ConfigPublicationSessionHandle>;
  close(): Promise<NativeControlResult>;
}

interface ConfigRecoveryUnclassifiedHandle {
  readonly evidence: ConfigRecoveryUnclassifiedEvidence;
  finalizeUncertain(
    acknowledgement: LedgerStageAck<"retained-evidence/uncertain">,
    operation: FsOperationContext,
  ): Promise<NativeControlResult>;
  close(): Promise<NativeControlResult>;
}

interface ConfigPublicationSessionReservation {
  classifyRecovery(input: {
    recovery: ConfigRecoveryInput;
    durableAcknowledgement: LedgerStageAck<ConfigRecoverableDurableStage>;
    ledgerLease: LeaseHandle;
    configLease: LeaseHandle;
    operation: FsOperationContext;
  }): Promise<ConfigRecoveryClassificationHandle | ConfigRecoveryUnclassifiedHandle>;
}
```

`files` and `absentNames` are frozen, duplicate-free, bounded, exact segment records. File identities
use the parent complete regular-file identity and lowercase SHA-256. `tupleDigest` is exactly the
existing normal-stage `configTupleDigest(operationId, sessionGeneration, observedStage, files)`:
the files use the session's canonical, scratch, backup, candidate, seed order and the same encoded
identity fields as the ordinary method that produces `observedStage`. It deliberately excludes the
precursor `durableStage` and `relation`. Named absences and root/marker/mount authority remain
native-retained revalidation facts rather than changing the normal ledger tuple grammar. Therefore
an after-effect observation digest equals the ordinary method's result, remains byte-identical after
the missing frame makes `observedStage` durable, and is recomputed identically on restart. An already
classified recovery uses the existing frame's digest without translation. Native code constructs
the digest; JavaScript decodes and echoes it but cannot substitute a path or identity.

`evidenceDigest` is separate and never substitutes for a normal-stage tuple digest. It binds the
operation/session/branch/prior durable stage, bounded observed directory facts, and root authority
for the credited uncertain frame. Its bytes are safe metadata only; the native handle retains the
actual descriptors and authority needed for final revalidation.

The classifier captures the original absolute monotonic parent operation context. `resume` must use
that context and may not reset its deadline. Control cleanup remains deadline-independent. A
classifier is single-consumer: successful `resume`, any failed post-effect revalidation, root close,
environment teardown, or explicit close makes every other method return the cached terminal control
state. Unknown fields, stages, branches, counts, identities, digests, selector generations, or
operation IDs reject before consuming leases or native capacity.

An unclassified handle has no `resume` and no ordinary session method. The private selected-pair
adapter appends the uncertain frame through the same root while the native handle retains the ledger
and config flocks; no callback enters native code under either lock. `finalizeUncertain` accepts only
that exact newer acknowledgement, revalidates the evidence classification, closes descriptors,
releases config then ledger, and returns `uncertain`. If the append or finalization fails, control
cleanup releases resources. An append/fsync with a returned acknowledgement remains known durable
even if later native finalization or cleanup fails; the adapter reports that durable poison frame
plus separate cleanup uncertainty and never downgrades or replays the append. An append without a
returned acknowledgement remains unknown until selected-pair ledger re-read proves the exact frame
present or absent.

### 3.1 Advancement rule

For `relation: matches-durable`, `resume` requires the same operation/session/stage/tuple digest and
selector generation that the factory verified. For `ledger-advance-required`, the adapter appends
and fsyncs `observedStage` with the native observation digest through the same selected-pair ledger
authority. `resume` requires a strictly newer selector generation and the exact returned
acknowledgement. A stale intent ack, skipped later stage, foreign operation/generation, changed
digest, or merely promised append is `INVALID_LEDGER_ACKNOWLEDGEMENT` with zero filesystem effect.

The append/restart identity is explicit: for an intent row `I` whose filesystem already matches
post-effect target stage `P`, classification computes `configTupleDigest(..., P, files)`. The adapter
stores exactly that digest in `P`. A crash then restarts with `durableStage=P`; classification again
computes `configTupleDigest(..., P, files)`, which must equal the stored acknowledgement byte for
byte. A changed digest is unclassified ledger corruption, not a new observation.

The missing frame is one already reserved by the parent 16-credit admission; classification adds no
stage or credit. Before-effect observations remain at the durable intent and consume no new frame.
After-effect observations consume the already budgeted unsynced frame. Outstanding credits continue
to count until the parent terminal CAS.

## 4. Finite intent classifier

Every name below is the exact name and identity already stored in the operation row. Absence is
checked descriptor-relative under the held root. Any tuple other than the one exact before or after
row is unclassified.

| Branch and durable intent        | Exact before-effect observation                                            | Exact after-effect observation                                                   | Native state after `resume`                                  |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| initial `publication-intent`     | candidate at candidate; canonical absent; scratch unchanged                | candidate inode at canonical; candidate name absent; scratch unchanged           | initial-prepared before; config-published-unsynced after     |
| replacement `publication-intent` | incumbent at canonical; prepared candidate at scratch; backup unchanged    | candidate inode at canonical; incumbent inode at scratch; backup unchanged       | scratch/seed-durable before; config-published-unsynced after |
| first-backup `seed-intent`       | seed at seed name; `.bak` absent; canonical and prepared scratch unchanged | seed inode at `.bak`; seed name absent; canonical and prepared scratch unchanged | scratch-prepared before; seed-published-unsynced after       |
| replacement `rotation-intent`    | new config at canonical; old canonical at scratch; prior backup at `.bak`  | new config unchanged; old canonical at `.bak`; prior backup at scratch           | config-durable before; backup-published-unsynced after       |

An after-effect identity may appear under its new name only. An unexpected old-name hard link,
same-inode second link, both names present, both absent, swapped foreign inode, digest mismatch,
non-regular file, changed owner/mode/size, moved root, marker change, mount change, or extra operation
name returns the unclassified handle and cannot expose an ordinary session. Existing already
classified stages have one exact tuple and return `matches-durable`; they do not pass through the
two-way intent table.

## 5. Crash and acknowledgement semantics

- **Crash before rename:** restart sees only the before tuple. The classifier returns
  `matches-durable`; `resume` validates the existing intent ack and exposes the same effect method
  exactly once.
- **Crash after rename before native response:** restart sees only the after tuple and returns
  `ledger-advance-required`. Until the unsynced frame is durable, there is no session and no effect
  method to replay.
- **Response or acknowledgement lost:** the same after tuple produces the same observation digest.
  If the frame is absent, append it once; if it is already present, recovery enters through the
  already classified stage. Changed same-ID content is a ledger conflict, never a second append.
- **Crash after frame append before `resume`:** restart reads the newer durable frame and returns a
  matching classified observation with the same tuple digest byte. It exposes only the sync method.
- **Crash after `resume`:** the durable stage and exact files still determine the same next method.
  The classifier does not rely on an in-memory acknowledgement bit.

## 6. DELTA and proof matrix

Implementation is limited to the package's private config-publication modules and focused tests:

- `src/config_publication/{recovery,session,tuples}.rs`
- `src/{config-publication-private,native-types,operation-outcome}.ts`
- native/TypeScript unit tests and an actual-addon child-process recovery fixture

Required proof:

1. The interim build rejects all three intent families before any rename. A mutation restoring the
   old direct intent-to-pre-effect mapping fails.
2. Actual-addon child processes cover initial no-replace, seed no-replace, config exchange, and
   backup exchange. Each has deterministic barriers before syscall, after syscall/before response,
   after response/before ledger append, and after append/before `resume`.
3. The replacement negative proves that removing the advancement gate performs a second exchange
   and is caught because it would restore the old canonical bytes. The restored build never invokes
   that second exchange.
4. Missing, stale, skipped, foreign, same-ID/different-digest, and non-monotonic acknowledgements all
   reject without effect. `resume` is unavailable until the required frame is fsynced.
   A post-effect intent observation, the appended unsynced frame, and restart from that frame must
   produce the same tuple digest as the normal non-crash method.
5. Both exact winner tuples succeed. Zero-match and deliberately double-match/name-link cases return
   `ConfigRecoveryUnclassifiedHandle`; no ordinary session is returned. Before the adapter appends
   and fsyncs the exact credited uncertain frame, every durable-poison assertion fails. A fresh
   operation ID cannot bypass the recovery-only row.
6. Root/marker/mount/name/inode/owner/mode/link/size/digest drift between observation and `resume`
   fails the second revalidation. The retained leases and descriptor/control counts return to their
   exact baseline only after actual cleanup.
7. Process kill, N-API environment teardown, root close, repeated close, and sibling-root continuity
   prove reverse config-then-ledger release and no shared-executor shutdown.
8. The package export/subpath ratchet proves the classifier remains private. Existing publication,
   descriptor-cap, payload-cap, executor-drain, and four-target release gates remain required.
9. Inject failure after reservation acceptance, after each lease transfer, after each descriptor
   open, after classification, and during JavaScript wrapper construction. Even when the factory
   rejects before returning a handle, native control cleanup closes every accepted resource,
   releases config then ledger, and allows exact-capacity reuse; uncertain cleanup poisons instead
   of reporting no-effect.
10. After the credited uncertain append returns its fsynced acknowledgement, inject native
    finalization and cleanup failure. Status must retain the known durable uncertain frame and add a
    distinct cleanup-uncertain disposition; it never retries the append. Lose the append response in
    a separate case and require ledger re-read before classifying the frame as present or absent.

No production adapter uses intent recovery until both reviews accept this amendment and all ten
proof groups pass on the exact implementation manifest.
