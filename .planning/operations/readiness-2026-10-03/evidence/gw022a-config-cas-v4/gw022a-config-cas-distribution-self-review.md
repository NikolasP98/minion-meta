# GW022A config CAS and distribution self-review

- Verdict: **READY FOR RENEWED PARENT-CONTRACT AND INDEPENDENT STANDARDS REVIEW**
- Spec: `spec-gw022a-config-cas-distribution.md`
- Spec SHA-256: `8ee807b3dc8127b8050fd6d3c095c1593a750bf0cd200b8d0d61992b6457b46f`
- Native-substrate baseline: `2f46c5023faa9eee8303b868c4db9136f26a5a91`
- Source edits authorized by this receipt: none

## Bound inputs

- Parent filesystem contract:
  `7e8e188613e109f3540dc3d39df2d56fae7a032b62e9f1fead1171c8d7bba96d`.
- Parent executor contract:
  `1d94886223e3285ec496ca97fffa415d827a03e162541bb720abfd0abb8a82cd`.
- Structured writer inventory:
  `46d0910609519896fd1d29c938b401d8ec847473006724ebeda23e3acdd1b282`.
- Raw writer source receipt:
  `9a5fdee056178252ff4334f805994064dfd80ee701f08661fcaeeabe815fc333`.
- Root pack dry-run receipt:
  `41c77447d36fae69b797c35851724038b03c9626656520497c0b9c4d2e761063`.
- Superseded independent BLOCK receipt:
  `gw022a-config-cas-distribution-independent-review-v3.md`, SHA-256
  `ce8b4eba358726293ca081dc5acb2fd26bbc6119534c86c7b32e00122c41104b`.

## Preserved accepted boundaries

1. The result taxonomy remains `no-change`, `no-effect-conflict`, `committed`,
   `committed-with-warning`, or `uncertain`; only proven no-effect may replay.
2. Operation IDs retain the exact parent `<ledger epoch UUID>:<monotonic sequence>` grammar and
   first-call zero-effect admission handshake. Actor, method, credential generation, intent digest,
   epoch, high-water, and session generation are fenced.
3. Every filesystem effect and directory sync is separated by an exact selected-pair ledger frame.
   The native session cannot advance without the generation-bound acknowledgement for that frame.
4. Online config handling never performs comparison-then-pathname unlink. Guarded reverse exchange
   remains limited to the exact two-sided tuple; mismatch or sync ambiguity preserves evidence.
5. Delete and rollback-to-absent remain `blocked-pending-delete`; raw `rm` is a ratchet failure.
   This slice cannot claim all writers converted, GW022A closed, or a production release.
6. Four-target aggregation, deterministic pack, clean installs, native hardware lanes, and exact
   checksum-pinned release inputs remain mandatory Slice E gates. A host build cannot set
   `releaseQualified: true`.

## Parent-amendment review

The sustainable design now explicitly amends only atomicity sections 6.12, 6.14, and 6.15 for one
private canonical-config scratch inode:

1. Fresh one-shot `O_CREAT|O_EXCL|O_NOFOLLOW` publication remains mandatory for initial candidate,
   initial scratch, first absent-backup seed, every non-config publication, and all evidence. Only a
   previously ledger-bound, single-link, mode-0600 config scratch can be rewritten before canonical
   publication.
2. Public `PublicationHandle` remains write-once and terminal. A distinct private
   `ConfigPublicationSessionHandle` has a finite method/state table, exact descriptor ownership,
   pre-reserved control cleanup, idempotent close, environment-teardown drain, and sibling-root
   isolation. No public/plugin caller can construct it.
3. The first-call `reserved` row stores one random canonical UUID session generation. Effect-owning
   resubmission creates one native reservation for that exact generation before file open/create.
   Concurrent or changed generations cannot adopt the row.
4. Initial creation reserves candidate, independent scratch, three handle/control pairs, eight
   internal descriptors, two evidence entries, bytes, and all 16 parent frame credits. Its normal
   success consumes 11. It creates and syncs candidate and scratch separately. Canonical no-replace
   consumes candidate and never recreates scratch after commit.
5. First replacement with absent `.bak` reserves a seed, two handle/control pairs, bytes, evidence,
   and all 16 parent frame credits before the first seed/scratch effect. Its normal success consumes 15. It writes the seed, prepares complete candidate bytes in scratch, durably publishes the seed,
   then publishes config and rotates backup. Thus every post-seed crash can resume from durable
   candidate bytes without request replay.
6. Later replacements use no fresh name. Exact success leaves canonical + `.bak` + one scratch and
   releases transient capacity. The specified 100-operation worst-size proof must return capacity to
   baseline.
7. Top-level ledger stages remain exactly the parent stages. Bootstrap, seed/rotation, and scratch
   settlement are credited substates. Every effectful operation atomically charges all 16 parent
   credits before effects; initial success consumes 11, first-backup success 15, and later success 11. Terminalization releases unused credits. An uncertainty frame therefore consumes already
   reserved capacity that concurrent work cannot steal.
8. A closed recovery factory reopens only ledger-recorded names under both locks, checks every
   root/name/inode/digest/link tuple, reconstructs only the last durable state, and never recreates a
   name, request bytes, or a prior effect.
9. Effectful execution acquires process root, ledger, then config authority once. It retains that
   same ledger lease through native session settlement and `observer-pending`, releases config before
   ledger, and runs observers only after both operation leases are gone. Recovery and control cleanup
   use the same order; terminal observer classification reacquires ledger alone.

## Reader and alias safety review

1. Every supported-Linux canonical read must terminate at the bounded shared-lease reader, fully
   materialize at most 8 MiB, close its descriptor, and release before parse/return. Central
   `loadConfig` cache hits remain object-only; cache miss/reload, snapshots, includes, migration,
   repair, logging, CLI, native, Swift, and shell rows require generated classification.
2. The reusable-scratch capability cannot advertise until a multi-language reader ratchet has zero
   unclassified strong rows. A mutant raw read or returned live descriptor must fail.
3. Before `ftruncate` and after write plus `fdatasync`, native code verifies exact scratch name,
   inode, owner/mode, root/marker/mount, prior digest/size, and link count one. A pre-write mismatch
   changes zero bytes. Late same-UID movement/hardlink after the last check can affect only the held
   Gateway scratch; post-write detection retains evidence, poisons strong mutation, and performs no
   canonical effect.
4. The matrix covers held reader, moved name, original-name replacement, same/outside-parent hard
   link, and identity drift at bootstrap, seed, preparation, both exchanges, settlement, and
   recovery. It injects before truncate, during write, before fdatasync, and before publication.
5. The contract does not claim an arbitrary same-UID alias is impossible. It states the bounded
   consequence honestly and requires no foreign pathname adoption, truncation, exchange, or unlink.

## Frame and capacity arithmetic

- Initial: 11 success frames = reserved/bootstrap-none; bootstrap intent; scratch unsynced;
  scratch ready; prepared; publication intent; publication unsynced; durable; scratch settled;
  observer pending; terminal.
- First backup: 15 success frames = reserved/backup-none; seed prepared; prepared; seed intent;
  seed unsynced; seed durable; config intent; config unsynced; config durable; rotation intent;
  rotation unsynced; rotation durable; scratch settled; observer pending; terminal.
- Later replacement: 11 success frames = reserved; prepared; config intent; config unsynced; config
  durable; rotation intent; rotation unsynced; rotation durable; scratch settled; observer pending;
  terminal.
- Admission atomically charges all 16 parent credits before effect and includes those outstanding
  credits in the parent 90,000-frame threshold. Failure records retained evidence and top-level
  uncertainty in one already reserved frame; it cannot consume an unreserved seventeenth frame.
  Terminalization releases five unused credits for initial/later success or one for first-backup
  success.
- Normal success settles to three names, each at most 8 MiB. Exceptional evidence stays within 16
  entries, 64 MiB logical, and 64 MiB allocated, with two entries/16 MiB reserved before mutation.

## Source and artifact checks

1. The frozen literal writer inventory has 78 non-test TypeScript matches across 46 files: two
   definitions, one wrapper edge, and 75 direct callers. Direct snapshot, migration, volume split,
   script, Swift, Docker, setup, and rollback writers remain separately enumerated.
2. Current config mutation is pathname based and RPC base-hash checks precede the writer outside a
   cross-process lock; the contract does not misstate that as CAS.
3. Current generic native no-replace/exchange/unlink results cannot classify displaced identity or
   provide expected-inode unlink. The proposed session is a new private source slice, not a claim
   that the existing substrate already supplies it.
4. The baseline native manifest has only x64 glibc and remains locally unqualified. The 1,310-file
   pack receipt contains no native addon/manifest path; no production import exists.
5. The spec passes the Gateway-pinned `oxfmt --check`. No source, package, release, merge,
   deployment, or production mutation is authorized by this review packet.
