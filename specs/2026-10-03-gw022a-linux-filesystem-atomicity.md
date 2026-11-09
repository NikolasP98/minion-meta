---
id: 2026-10-03-gw022a-linux-filesystem-atomicity
title: Package descriptor-relative Linux filesystem primitives and convert config and workspace ownership writers
stage: spec
verdict: approved
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion, minion_hub, minion-meta]
tags: [security, logic, permissions, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
findings: [GW-022A]
---

# Linux filesystem atomicity and writer conversion

## 0. Product

Gateway configuration and managed agent directories must survive concurrent processes, crashes,
and hostile path replacement without losing unrelated updates or writing outside the server-owned
root. A released Gateway must carry and verify the exact native primitive it depends on; a secure
consumer must be absent when that primitive cannot prove its guarantees.

GW-022A is a prerequisite slice. It packages the shared Linux primitive and converts the existing
configuration and managed-workspace ownership writers. GW-005/GW-025 orchestration storage and
HC-034/GW-022 marketplace installation consume this slice later and are not completed by it.

**Out of scope:** implementing orchestration storage or marketplace install V2; protecting every
ordinary file an agent or plugin writes inside an already established workspace; changing model,
channel, or message delivery semantics; claiming descriptor-relative protection on macOS or
Windows; merge, deployment, or production migration.

## AS-IS

### 1. Configuration writes race and publish by pathname

`src/config/io.ts:928-1197` reads a snapshot, performs validation and comment/environment-reference
restoration, creates a pathname-based temporary file, rotates backups, and calls `rename`. No
cross-process lock spans the fresh read, expected-hash check, merge, validation, and publication.
On `EPERM` or `EEXIST`, the Windows branch copies the temporary file over the destination. A stale
whole-config writer can therefore erase an unrelated update, and a crash or path replacement can
leave behavior that the caller cannot classify as no-effect, committed, or uncertain.

The public config RPCs in `src/gateway/server-methods/config.ts` compare `baseHash` before calling
the writer. That comparison is outside any cross-process publication lock. Snapshot restore in
`src/config/snapshot.ts:92-99`, layout migration in
`src/agents/bootstrap/layout-migration.ts:338-386`, and the offline organization-volume splitter in
`src/infra/org-volume-split.ts:568-618` write, copy, or rename canonical configuration without the
same boundary.

A source inventory at Gateway HEAD `85fe0f6a8cf57a440b03fe6f8a609d6c5b6f1b56` finds 78
non-test TypeScript matches for `writeConfigFile(` across 46 files under `src` and `extensions`.
Two matches are the function definitions, leaving 76 call sites. Twelve calls are made through
`PluginRuntime.config.writeConfigFile` by nine bundled extensions: Feishu, Line, Linq,
Nextcloud Talk, Nostr, Phone Control, Talk Voice, Telegram, and WhatsApp. The runtime exposes a
whole-config load/write pair from `src/plugins/runtime/types.ts:197-202` and
`src/plugins/runtime/index.ts:142-149`; it has no updater or base-snapshot contract.

`config.set`, `config.patch`, and `config.apply` have no durable caller operation ID or status
lookup. They write and then return the existing `path`/redacted `config` and, for patch/apply,
`reloadMode`, restart, and sentinel fields. A process death after publication but before the response
cannot be reconciled by the caller. Hub currently treats a resolved request as success and has no
uncertain state. The current TypeScript-only count also misses native writers:
`apps/macos/Sources/OpenClaw/OpenClawConfigFile.swift:36-156` and
`DebugSettings.swift:784-807` both perform whole-file atomic pathname writes, while Docker/setup
shells copy or remove canonical config during bootstrap and rollback.

### 2. Managed directory ownership is not transactional

`src/gateway/server-methods/agents.ts:308-462` creates a workspace and transcript directory before
config publication, appends identity data after publication, creates a replacement workspace after
an update has already committed, and deletes an agent from config before best-effort pathname trash
moves. `movePathToTrash` can ultimately recursively remove a path selected before the config write.
A crash can expose an incomplete agent, strand a relocation, or leave the caller unsure whether it
may retry.

`ensureAgentWorkspace` is called by Gateway agent RPCs, setup/onboarding and agent CLI paths,
isolated cron, auto-reply, and sandbox code. Feishu dynamic-agent creation directly creates a
workspace and agent directory and then writes a configuration built from an earlier load.
The legacy `agent.install` RPC writes marketplace files directly below `stateDir` and is not an
atomic or authority-bearing install primitive.

Reset, uninstall, onboarding reset, and organization-volume split can remove or relocate config,
state, and workspaces without a lifetime lease proving that no Gateway process is still using them.

### 3. The required native capability does not exist

The repository has no Rust workspace, `Cargo.toml`, pinned Rust toolchain, N-API package, or packaged
descriptor-relative helper. Node `fs` cannot express the complete contract required by GW-005 and
HC-034: constrained `openat2`, descriptor `flock`, bounded `getdents64`, `renameat2` no-replace and
exchange, and descriptor-relative recursive deletion.

The released `@nikolasp98/minion` npm package contains `dist/` but currently has no build step,
manifest, or installation proof for a project-owned native addon. Gateway supports Node
`>=22.12.0`, Linux Docker/self-hosting, macOS, and Windows; silently replacing a missing Linux
primitive with pathname checks would create a security downgrade, while removing all ordinary
configuration support from non-Linux clients would be an unrelated compatibility regression.

The bootstrap boundary cannot be supplied by the addon it is about to load. Opening the shipped
`.node` file read-only, hashing it, retaining that descriptor, and using `/proc/self/fd/<fd>` would
still be unsafe: another process may already hold a writable descriptor to the same inode and can
change its bytes after the hash or while the dynamic loader maps it. Path, inode, size, mode, and a
post-open replacement check do not freeze that code image.

Current config parsing also performs substantially more I/O and global-state work than the locked
transaction may execute. `src/config/includes.ts` recursively reads JSON5 `$include` files by
pathname with a maximum depth of ten, `realpathSync`, and no file-count or aggregate-byte bound.
`src/config/io.ts` loads CWD and state-directory dotenv files, mutates `process.env` from
`config.env`, substitutes environment references, applies runtime defaults, restores references,
and transfers root-file comments. `src/config/validation.ts` invokes
`loadPluginManifestRegistry`, which discovers configured, workspace, global, and bundled plugin
roots; enumerates directories; reads `package.json` plus `minion.plugin.json` or its legacy names;
uses a wall-clock cache; and validates declarative plugin JSON schemas. Base validation also checks
legacy keys, duplicate agent directories and avatar paths, several of whose helpers read
`process.env`, the home directory, or the state directory. Calling these current helpers while the
config lock is held would run unrestricted pathname readers, mutable registry lookup, lazy
discovery, logging, and process-global environment behavior inside the critical section.

## TO-BE

### 1. Capability and platform policy

1. Add the private workspace package `packages/linux-fs-atomic`, named exactly
   `@minion-stack/linux-fs-atomic@0.1.0`. The root consumes it as an exact build-time workspace
   dependency. Its JavaScript loader is bundled into Gateway output, and its reviewed `.node`
   artifacts and immutable manifest are copied into `dist/native/linux-fs-atomic/`; the published
   Gateway tarball has no runtime dependency on an unpublished workspace package.
2. Version `0.1.0` is the first accepted ABI. The package fixes its N-API level, Rust toolchain,
   `Cargo.lock`, `@napi-rs`/build dependencies, exported TypeScript surface, error codes, and handle
   semantics. A native ABI, syscall contract, or receipt-format change requires a new exact package
   version and review; the Gateway lockfile may not use a range.
3. The release pipeline builds these four tuples from checksum-pinned build images and inputs:
   `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`,
   `x86_64-unknown-linux-musl`, and `aarch64-unknown-linux-musl`. It records tuple, artifact SHA-256,
   artifact SRI, byte length, N-API level, source commit, Rust toolchain hash, `Cargo.lock` hash, and a
   distinct `buildIdentity` in a canonical manifest whose exact bytes are compiled into the
   JavaScript loader. `buildIdentity` is the SHA-256 of a canonical length-prefixed record of the
   pinned source commit, `Cargo.lock` hash, Rust toolchain hash, build-image digest, target tuple,
   N-API/export-schema version, and deterministic compiler/linker flags. It is generated before
   linking and compiled into the addon; it never includes or purports to be the final addon bytes.
   The artifact SHA-256 and SRI are calculated after linking and live only in the authoritative
   manifest/loader. Those embedded manifest bytes are the sole runtime trust root. The sidecar
   manifest shipped beside the artifacts is a human/tooling receipt and must byte-match the embedded
   manifest before artifact selection; it never supplies or overrides a checksum, tuple, filename,
   build identity, or ABI. Two clean release builds must produce byte-identical embedded/sidecar
   manifest and addon bytes for each tuple.
4. `pnpm pack` must assemble a self-contained Gateway tarball containing all four artifacts.
   Clean-install tests run that exact tarball under native x64 glibc and musl and native arm64
   glibc and musl. A full-system arm64 emulator with the target kernel and filesystem may run on
   ordinary pull requests, but a hardware arm64 receipt is required for release. A source-tree
   build, user-mode syscall translation, or host-only addon does not qualify a release. There is no
   runtime download, compilation, network request, or alternate package lookup.
5. The loader derives OS, architecture, libc, Node ABI, and artifact path exclusively from the
   embedded manifest and fixed runtime probes, without shell commands or environment overrides. It
   opens the sidecar `O_RDONLY|O_NOFOLLOW|O_CLOEXEC`, requires a regular single-link file bounded to
   64 KiB and exact embedded-byte equality, then opens the embedded-selected addon with the same
   no-follow/read-only flags. It bounds the addon at 16 MiB before allocation, copies its exact bytes
   into memory, and verifies tuple, ABI, regular type, byte length, and SHA-256 against the embedded
   entry. The source descriptor is evidence only; it is never the code image passed to the dynamic
   loader.
6. Before addon code can execute, the JavaScript bootstrap creates an anonymous snapshot with Node
   built-ins: it verifies `/tmp` is the root-owned, non-symlink, sticky local directory expected by
   the four release images; opens an unnamed regular file there with the Linux
   `O_TMPFILE|O_RDWR|O_CLOEXEC` constants pinned and tested for each target; writes only the verified
   buffer; `fdatasync`s it; and changes it to mode `0400`. It opens a second read-only file
   description through `/proc/self/fd/<writeFd>`, proves the two descriptions have the same regular
   device/inode, `nlink == 0`, exact length, and exact digest, then closes the sole writable
   description. Only the anonymous read-only descriptor remains when the loader calls
   `process.dlopen` directly on the literal `/proc/self/fd/<readFd>` path; it does not call
   `require`, `realpath`, module path resolution, or reopen a named artifact. The addon exports its
   compiled `buildIdentity`, tuple, N-API level, and export-schema version. After initialization the
   loader compares those fields independently with the embedded manifest entry. This post-load
   identity check binds the initialized exports to the pinned build inputs; the pre-load SHA-256 of
   the anonymous bytes separately binds the exact artifact. The addon never claims to contain or
   verify its own final artifact SHA-256. The descriptor stays open through initialization and
   closes afterward. No plugin callback, hook, timer, or user code runs between snapshot creation and
   load. The original shipped inode may change at any barrier without changing the verified
   anonymous image. The loader has no named-temp fallback.
7. Every failure before the literal `process.dlopen` call, including missing `/proc`, unsupported
   `O_TMPFILE`, an unexpected `/tmp` owner/mode/type/mount, ambiguous libc, wrong tuple/ABI/artifact
   checksum/size, short write, source mutation during copy, or anonymous-snapshot mismatch, returns
   `NATIVE_CAPABILITY_UNAVAILABLE` with a fixed pre-load reason and proves zero addon initialization.
   A `dlopen` call can execute N-API registration before it reports failure, so load and post-load
   identity failures make no zero-initialization claim. Addon registration/initialization is bounded
   and side-effect-free apart from installing its in-memory export table: it opens no descriptor,
   reads or writes no filesystem or network resource, starts no thread or timer, installs no signal
   or process hook, mutates no environment/global Gateway state, logs nothing, and invokes no plugin
   or user callback. No native filesystem operation occurs before the first explicit exported handle
   call. A `dlopen` throw, missing/malformed export, or post-load tuple/build-identity/N-API mismatch
   returns `NATIVE_CAPABILITY_UNAVAILABLE` with fixed reason `initialization_failed`, quarantines that
   addon instance for the process lifetime, and permits neither in-process retry nor compatibility
   fallback on a supported tuple. The four packaged runtime tests prove both the pre-load and
   initialization-failure branches on their production kernel/filesystem combination. Same-UID code
   injection, debugger attachment, and kernel/root compromise remain outside the plugin/process
   trust boundary; a pre-existing writer to the shipped artifact is explicitly inside this threat
   model and is isolated by the anonymous copy.
8. On the four supported Linux tuples, the addon is mandatory for every canonical config mutation.
   A missing, corrupt, or incompatible addon cannot downgrade to Node `fs`, pathname `rename`, shell
   `flock`, `proper-lockfile`, `realpath`, or check-then-open logic. Secure consumers advertise no
   capability and fail before reservation or filesystem effects.
9. Darwin, Windows, and an explicitly unsupported Linux tuple retain existing ordinary config UX
   through a separately named `compatConfigMutation` backend. Its result and capability report say
   `strongFilesystemAtomicity: false`; it is never passed to GW-005/GW-025, HC-034/GW-022, or any
   later consumer that requires this spec. A supported Linux tuple whose native validation fails is
   not eligible for this compatibility backend.
10. Rust code denies warnings and `unsafe_op_in_unsafe_fn`; each syscall boundary has a narrowly
    reviewed safety invariant. Native panics are caught before the N-API boundary, fixed error codes
    replace raw OS buffers, every opened descriptor uses close-on-exec, and child-process tests prove
    no lease or authority descriptor is inherited across an exec.

### 2. Native handle API and runtime probe

1. JavaScript receives opaque branded `RootHandle`, `EntryHandle`, `LeaseHandle`, and
   `PublicationHandle` objects. It never receives a numeric file descriptor and cannot turn a raw
   child pathname into authority. Handles are bound to one addon instance and one generation;
   close is idempotent, finalizers release resources, and any operation after close returns a stable
   error rather than using a recycled descriptor.
2. The reviewed API supports descriptor shared/exclusive `flock(2)` with nonblocking attempts;
   absolute-root opening from `/`; bounded explicit `readlinkat` for configured root aliases;
   relative `openat`/`mkdirat`; constrained
   `openat2(RESOLVE_BENEATH|RESOLVE_NO_SYMLINKS|RESOLVE_NO_MAGICLINKS)`; bounded `getdents64`;
   `fstat`; `statx(STATX_MNT_ID)` with a parsed `/proc/self/fdinfo/<fd>` mount-ID cross-check;
   exclusive same-parent temporary creation; bounded exact read/write; `fdatasync`; file and
   directory `fsync`; `renameat2(RENAME_NOREPLACE|RENAME_EXCHANGE)`; and bounded
   descriptor-relative `unlinkat` traversal.
3. Each relative component is validated as one UTF-8 segment with an exact byte limit and excludes
   empty, `.`, `..`, slash, NUL, and platform alternate separators. Native enumeration, read,
   write, and deletion calls receive count, byte, depth, and monotonic-deadline limits. Overflow or
   deadline returns a typed no-effect/partial/uncertain result; it never truncates a result and calls
   it complete.
4. Absolute roots are opened by walking from `/` without implicit symlink or magic-link following;
   the sole configured-root alias exception is the explicit bounded `readlinkat` protocol in Section 5. Before publication, the addon verifies that the externally named root and parent chain still
   resolve to the held device/inode chain. Replacement makes the operation conflict or uncertain; it
   never reopens the replacement and proceeds.
5. Gateway startup probes the actual config parent and state root, and each distinct workspace
   filesystem is probed before its first ownership mutation. The bounded probe uses a private
   mode-`0700` directory and proves, on that filesystem: child-process exclusive-lock exclusion and
   crash release, constrained open, no-replace, exchange, file sync, directory sync, bounded list,
   and owned cleanup. It deletes only entries carrying its random probe generation. A foreign
   collision, syscall/flag/filesystem rejection, timeout, or cleanup uncertainty leaves capability
   unavailable and the evidence intact.
6. The probe completes within five seconds per filesystem, permits at most one in flight per
   device/mount identity and eight queued globally, and is cached only for the lifetime of the same
   open `RootHandle`; no result survives handle close or process restart. On successful probe, the
   addon creates or verifies a permanent no-follow mode-`0600` root marker containing a random
   256-bit generation, retains descriptors for both root and marker, and keys the result by addon
   version/digest, `statx` mount ID, `/proc/self/fdinfo` mount ID, filesystem type, root device/inode,
   marker device/inode, and marker digest. Every secure admission revalidates that the external
   root chain resolves to the still-held root and that the marker name resolves to the held marker.
   Holding the root descriptor prevents its inode from being recycled while the cache exists; a
   later reopen always reprobes with a new handle rather than trusting device/inode reuse. Missing
   or inconsistent mount IDs, bind/remount drift, marker replacement, name-chain replacement, or a
   filesystem that cannot persist the marker makes the capability unavailable. Secure admission
   never waits in an unbounded startup or request queue; no non-portable inode-generation claim is
   used.

### 3. Lock hierarchy and ownership

1. A Gateway process opens a permanent root-lock entry relative to the pinned state-root descriptor
   and holds a shared native lease for its lifetime. Destructive reset, uninstall, and volume-split
   operations must stop the service and acquire an exclusive root lease before inspecting or
   moving bytes. Process death releases kernel ownership; the persistent lock file is never treated
   as a live owner and is never deleted as stale evidence. This lease excludes participating Gateway
   processes only; it does not prove arbitrary transcript/plugin/agent writer quiescence. Until the
   Section 7 shared-writer lease slice exists, reset/uninstall/split may mutate canonical config but
   must leave managed state/workspace bytes intact with a manual-cleanup receipt rather than treating
   the root lease as deletion authority.
2. Ordinary mutation lock order is root lifetime lease, mutation-ledger lock, canonical config lock,
   then sorted managed workspace locks. A phase releases locks only in reverse order and may not
   reacquire an earlier class while holding a later one. Multi-root offline operations acquire
   canonical roots in byte-sorted order. Reverse-order acquisition returns `LOCK_ORDER_VIOLATION`
   before waiting. No caller-supplied updater, plugin callback, logging hook, reload hook, network
   call, or external process runs while native locks are held. Locked code may run only the package's
   bounded native operations and the deterministic parser, patch, validation, serialization,
   ledger, and publication steps defined below.
3. Lock entries are permanent regular mode-`0600` files opened without following symlinks. Config
   locks are bound to the pinned config parent and canonical filename. Workspace locks live beneath
   a pinned state-root lock directory and are keyed by a schema-versioned digest of canonical config
   identity, agent ID, target kind, and pinned target-root identity. A foreign type/mode/owner,
   unexpected hard-link count, or unreadable lock entry fails closed and is never replaced.
4. A process-local FIFO serializes attempts for the same native lock, while `flock` supplies the
   cross-process fence. Acquisition has a four-second monotonic bound and a queue cap of 64 per lock
   and 512 globally. Busy or saturated acquisition returns a typed retryable no-effect result; it
   never proceeds unlocked or guesses staleness from time.

### 4. Durable mutation ledger

1. Config and managed-ownership mutations share `mutation-ledger.v1` beneath the pinned state-root
   descriptor. It consists of permanent `ledger.lock`, fixed `ledger.selector` and
   `ledger.selector.next` selector-publication names, immutable
   generation-named `ledger.snapshot.<uuid>` and append-only `ledger.active.<uuid>` pairs, bounded
   `ledger.tail.<sha256>` evidence, and owned selector/temp entries recorded by the current phase.
   Every entry is a regular mode-`0600` no-follow file opened relative to the native root. Every
   reserve, transition, recovery, retirement, append, and rollover holds the dedicated native
   exclusive ledger `flock`; the order is root lifetime lease, ledger, config, then sorted workspace
   locks. No workspace lock is used to approximate global capacity. There is exactly one selected
   snapshot/active pair; an unselected complete pair grants no append or recovery authority.
   Before taking its lifetime shared root lease, a process that sees no `mutation-ledger.v1` takes
   the exclusive root lease and initializes exactly one fixed
   `.mutation-ledger.v1.bootstrap` directory. It no-replace creates and syncs the bootstrap
   directory, writes and syncs a complete genesis lock, selected snapshot/active pair, and selector,
   syncs the bootstrap directory, then atomically no-replace renames the entire directory to
   `mutation-ledger.v1` and syncs the state-root parent. A crash before the rename leaves only that
   fixed bootstrap directory; under the exclusive root lease restart either validates and resumes
   its exact checksummed genesis tuple or fails closed without deleting it. A crash after the rename
   leaves the final directory or the fixed bootstrap name, never a partially published final
   directory. Final plus bootstrap, an unexpected bootstrap name, a malformed bootstrap entry, or
   an existing final directory without a valid selector is corruption. Genesis runs before any
   operation admission, so the bootstrap directory never contains a caller operation or effect.
2. The format is a versioned binary envelope around canonical JSON payloads: fixed magic/version,
   unsigned 32-bit payload length, unsigned 64-bit monotonic sequence, previous-frame SHA-256,
   payload SHA-256, selected-pair frame ordinal, and the bounded UTF-8 payload. Each frame is at most
   64 KiB. Exact writes and `fdatasync` make a transition durable before its effect may advance. Each
   snapshot and active header carries the same random pair generation, epoch, snapshot base
   sequence/digest, exact snapshot frame count, and active start ordinal. Every active frame ordinal
   is exactly its predecessor plus one, so the last complete frame durably states the selected
   pair's total verified frame count; a process cache is only an accelerator and is always bound to
   selector generation, pair inodes, size, and last digest. The checksum-protected selector carries
   its own monotonic selector generation and the selected pair's exact names, device/inodes,
   immutable headers, snapshot digest, and active base identity. The native API rereads and verifies
   the selector under the lock, descriptor-opens that exact active inode, validates its complete
   chain and frame ordinals from the selected snapshot, appends through the held descriptor,
   `fdatasync`s, and verifies the inode/size/last digest and new count before returning. It never
   chooses an active file by newest mtime/name, appends through a pathname reopen, or appends to an
   unselected/replaced inode.
3. One atomic reservation checks and increments all limits under the ledger lock before external
   effects: 1,000 live operations globally, 32 per actor, 10,000 retained terminal receipts, 16 MiB
   decoded logical bytes, 32 MiB steady-state physical ledger bytes including selected pair,
   selector, and tail evidence, 64 MiB total physical bytes including every old/new pair, selector
   temp, and tail entry during rollover, and 64 KiB per operation record.
   Reservation is limited to 30 per actor and 120 globally per rolling minute. Capacity or rate
   saturation returns a typed no-effect result. A still-`reserved` row has proven no filesystem
   effect and recovery may terminalize it as `no-effect-expired` after ten minutes; no later stage is
   age-reaped. The persistent ledger epoch is a random UUID; the next monotonic sequence is stored in
   the snapshot. Gateway-issued operation IDs are `<epoch>:<sequence>` and are never caller-chosen or
   reused. A duplicate live/retained ID with the same actor/method/intent digest resumes or returns
   its recorded result; any mismatch is rejected. Admission also reserves a method-state-machine
   frame credit of at most 16 transitions, including the worst-case post-effect uncertain/terminal
   checkpoint. Under the ledger lock it requires verified selected-pair frames plus all outstanding
   credits plus the new credit to stay at or below the 90,000-frame operating threshold. Each
   transition consumes one durable credit; terminalization releases the remainder. Existing
   effectful operations may consume their credits even when rollover is unavailable, but no new
   operation or unreserved transition is admitted. Thus compaction failure cannot strand an effect
   without room for its required durable classification.
4. State transitions are generation-CAS frames. Config operations use `reserved`, `prepared`,
   `publication-intent`, `published-unsynced`, `durable`, `observer-pending`, and terminal
   `committed`, `no-effect`, or `uncertain`. Ownership operations additionally use `staged`,
   `config-committed`, and `manual-cleanup-required`. Records contain bounded hashes, captured entry
   identities, owned temp/quarantine names, stage, and actor scope, never config values, environment
   values, prompts, tokens, or unrestricted paths.
5. Startup takes the ledger lock and descriptor-lists at most 128 directory entries and 16 KiB of
   entry-name bytes. The admitted set is `ledger.lock`, the fixed selector, the optional fixed
   `ledger.selector.next`, the selected pair and tail evidence named by the selector, and generation
   names referenced by either valid selector's bounded pending-rollover/cleanup record. Within
   100,000 frames, 64 MiB total physical bytes, 32 MiB selected steady-state bytes, and five seconds
   it verifies the selector checksum, exact pair identities/headers, snapshot digest, frame ordinals,
   outstanding-credit total, and complete snapshot-to-active chain. A valid recovery pair
   above 90,000 but at or below 100,000 frames is read-only until no-truncation rollover selects a
   pair at or below 50,000 frames; failure to roll over preserves the pair and withholds new
   admission. A pending phase identifies each not-yet-required fresh pair, tail, or owned-temp entry
   and its permitted absent/partial state; recovery may create or resume only those exact names. A
   missing selected entry, a missing entry whose phase says it was durable, directory or scan-bound
   overflow, pair-generation or frame-ordinal mismatch, foreign or unreferenced entry, unexpected
   hard link, non-adjacent selector generation in the fixed next slot, selector rollback, or
   checksum/sequence error inside a complete frame is corruption and leaves every byte intact with
   all mutation unavailable. Startup never combines a snapshot from one selector generation with an
   active file from another.
6. A single incomplete final active frame is a classified crash tail. Under the ledger lock recovery
   hashes and preserves only a bounded evidence envelope containing selector/pair identity, valid
   prefix length/digest, and the exact incomplete suffix; the suffix can be at most one 64-KiB frame,
   and the complete evidence entry is at most 72 KiB. `ledger.tail.<sha256>` is created no-replace,
   `fdatasync`ed, and parent-synced; the name digest covers the complete canonical evidence envelope,
   and an existing name is idempotent only when its bytes and inode policy match exactly. At most 32
   distinct tail entries and 4 MiB encoded tail evidence may exist, and tail bytes count inside both
   physical caps.
   The reservation for a new distinct tail and its digest/name first commit through a durable
   `tail-repair-prepared` selector CAS while the old incomplete pair remains selected; recovery can
   therefore create/resume only that exact evidence entry after a crash. Count, byte, or transient
   capacity saturation returns `LEDGER_TAIL_EVIDENCE_FULL`, preserves the selected generation and
   suffix, and makes mutation unavailable; v1 performs no automatic tail eviction, age deletion, or
   unrecorded operator purge. Retirement requires a separately reviewed offline evidence migration,
   so repeated crashes cannot bypass the 64-MiB cap.
7. Tail repair and ordinary compaction use the same no-truncation pair rollover. With the exclusive
   lock held, recovery replays only the validated selected snapshot and complete active prefix.
   Compaction copies all live rows plus the newest 10,000 terminal rows; tail repair additionally
   appends one hash-chained tail-recovery frame referencing the durable evidence digest. The writer
   reserves the worst-case old pair, new pair, selector candidate/displaced selector, tail evidence,
   and cleanup metadata below the 64-MiB cap, then durably advances the selector to
   `rollover-prepared`, still selecting the old pair but naming the exact fresh pair generation,
   entries, expected base/cutoff digest, and old cleanup identities. Only after that selector phase is
   parent-synced does it create the fresh pair. It writes and
   `fdatasync`s `ledger.snapshot.<new>`, no-replace publishes and parent-syncs it, creates a fresh
   `ledger.active.<new>` whose header binds that exact snapshot digest/base, `fdatasync`s it,
   no-replace publishes and parent-syncs it, and reopens both by descriptor to verify names, inodes,
   headers, sizes, and digests. No incumbent snapshot or active file is truncated, renamed, or reused.
   Rollover is mandatory before an admission whose frame credit would cross 90,000. The compacted
   snapshot collapses transition history into current rows, carries each live operation's remaining
   frame credit, and must produce a verified selected-pair count plus outstanding credits at or below
   50,000 before selection. If byte capacity, deadline, or retained/live state cannot satisfy that
   bound, the candidate remains unselected and the triggering admission returns a typed no-effect
   capacity result. Selector-phase frames do not consume operation credits, and rollover never needs
   an unreserved append to the old active pair.
8. Every selector phase change, including `rollover-prepared`, selection, and cleanup completion,
   uses one fixed two-slot protocol. `ledger.selector.next` must first be absent. A checksummed next
   selector records the captured current selector identity/digest, adjacent selector generation,
   selected pair, pending pair/cleanup tuple, and phase. The writer no-replace creates and
   `fdatasync`s `ledger.selector.next`, parent-syncs it, exchanges it with the still-captured
   `ledger.selector`, verifies that the displaced selector now at `ledger.selector.next` is the exact
   prior selector, and parent-syncs. It then descriptor-unlinks that exact displaced next-slot inode
   and parent-syncs before another selector CAS may begin. A crash at any barrier leaves at most two
   adjacent valid selector generations in the two fixed names: current old plus next candidate, or
   current new plus next displaced old. Recovery verifies both and deterministically completes or
   rolls forward the recorded phase; a missing, malformed, non-adjacent, or third selector is
   unavailable. The pre-rollover selector contains no fresh-pair names, but the durable
   `rollover-prepared` selector does, so a crash can never leave an unexplained new pair.
   After the selection selector is durable, appenders may use only the new active generation.
   Before pair cleanup begins, recovery completes the two-slot selector CAS and removes its exact
   displaced selector as described above. Finalization then descriptor-unlinks only the exact old
   snapshot and old active, syncing the parent after each bounded step; a crash leaves either one as
   a recorded cleanup obligation and never makes it selectable. Only after those entries are absent
   and the parent is synced does a final selector CAS clear pending cleanup and restore the 32-MiB
   steady-state budget. The old active is never truncated in place, so an appender can never observe
   a snapshotted prefix twice or lose an unsnapshotted frame.
9. The new snapshot preserves `epoch`, `nextSequence`, capacity counters, and a
   `retiredThroughSequence` high-water mark, exact selected-pair frame count, and outstanding-credit
   total. An operation below the high-water mark but no longer retained resolves as
   `retired-withheld`: it can never be admitted again or classified no-effect, so automatic replay
   remains forbidden. Live/uncertain rows and their remaining credits are never retired. Rollover
   recovery replays the selected pair once, compares every pending phase identity, and is idempotent
   across process death at every create, sync, publish, exchange, verification, cleanup, and
   final-CAS point.

### 5. Canonical configuration transaction

1. `mutateConfig` is the only production API that creates, replaces, restores, or deletes the
   canonical config. Before any config lock, its preparation phase captures a self-contained
   `ConfigValidationContext`: the root config and include graph bytes, config-root authority,
   environment/home/state inputs, dotenv inputs, core schema/defaults version, and a declarative
   plugin-validation registry. The context has a random generation and keyed digest over every
   captured dependency. It contains no callbacks, live registry reference, mutable environment
   object, numeric descriptor, logger, or pathname reader.
2. The canonical config parent is opened from `/` by the native package. Internal config entries
   and include entries never follow symlinks or magic links. To preserve the existing supported
   config-root-alias fixture, only the externally configured root alias may use symlinks: the addon
   explicitly reads at most eight link hops, limits every link value and resolved absolute path to
   4 KiB, restarts absolute targets from `/`, pins the final no-symlink directory descriptor, and
   records each link's parent identity, name, inode, and link text. Commit revalidates that exact
   alias chain and final root identity. A changed, circular, escaping, magic, or over-limit alias is
   conflict/unavailable; it is never implicitly followed. This exception does not permit symlinked
   include files or plugin-manifest children.
3. The include builder parses JSON5 from captured bytes and preserves current merge order, array
   concatenation, sibling override, relative-path, absolute-path-inside-root, nested-include,
   circular-error, and maximum-depth-ten behavior. Relative includes resolve from the including
   file's parent but must remain beneath the pinned real config root. The graph is limited to 64
   distinct regular files, 8 MiB per file, 16 MiB total raw bytes including the root, 1,024 UTF-8
   bytes per normalized relative path, and 255 bytes per segment. Each row records normalized
   relative identity, device/inode, size, digest, and bounded bytes. Duplicate physical files,
   sparse/short/growing reads, new graph members, symlinks, devices, and graph overflow fail closed;
   no result is silently truncated.
4. Environment preparation replaces `maybeLoadDotEnvForConfig` and ambient helper reads with an
   explicit immutable input. It snapshots the caller environment and resolved home/state/config
   directories, then descriptor-reads at most the current two dotenv sources (CWD `.env` followed
   by state-directory `.env`) at 256 KiB each and preserves dotenv's no-override precedence.
   `config.env` is applied to a private table before `${VAR}` substitution exactly as today; it
   never mutates `process.env` during a transaction. Environment-reference restoration, computed
   runtime-default stripping, version stamping, and root-file comment transfer operate only on
   captured root bytes and this private table. After commit and lock release, the ordinary reload
   observer may apply committed `config.env` values to runtime state as it does today.
   Missing-variable and malformed-dotenv behavior is covered by parity fixtures. A live environment
   object is never consulted after preparation.
5. Plugin validation preparation inventories exactly the current discovery inputs: configured
   `plugins.load.paths`, the default agent workspace `.minion/extensions`, the global extensions
   directory, and the bundled directory; one-level source candidates; `package.json` extension
   metadata; and `minion.plugin.json` plus accepted legacy manifest names. It captures at most 64
   discovery roots, 4,096 directory entries, 512 plugin records, 256 KiB per manifest/package file,
   and 8 MiB aggregate registry bytes within three seconds. Configured root aliases use the same
   bounded explicit alias resolver; discovered children are regular no-follow entries. Candidate
   order, origin precedence, duplicate diagnostics, plugin IDs/channels, normalized enable/allow/
   deny/memory-slot state, and deep-cloned declarative JSON schemas are frozen into a generation.
   Discovery imports no plugin source and invokes no plugin registration or validation callback.
6. Base validation is refactored to accept the captured environment/home/state values; it may not
   read `process.env`, `os.homedir`, the filesystem, wall-clock caches, or global warning state.
   Under the lock, validation uses only the fixed core Zod schema, pure legacy/duplicate-directory/
   avatar/default transforms, the frozen registry records, and `validateJsonSchemaValue` over the
   frozen schema. The current `loadPluginManifestRegistry`, discovery, manifest loader, dotenv
   loader, `resolveUserPath` ambient defaults, lazy imports, plugin callbacks, logging hooks, cache
   lookup, and unrestricted readers are prohibited in the locked call graph and enforced by an AST
   and runtime I/O/callback tripwire.
7. Preparation bounds a fresh root source to 8 MiB before allocation, resolves the captured include
   graph and environment, validates it, gives one immutable clone to the updater exactly once,
   rejects a returned promise, and derives a deterministic canonical merge patch, path-presence
   set, and keyed digest for every touched value. Arrays are one atomic touched path; a deletion is
   distinct from a missing value. If the candidate changes plugin discovery inputs, preparation
   constructs and freezes a prospective registry from that candidate; ordinary unchanged inputs
   reuse a deep-frozen published registry snapshot, never a live registry object.
8. The updater may return a new config, explicit no-change, or a typed whole-file/delete request.
   It cannot perform I/O, reenter mutation, retain native handles, or mutate the supplied snapshot.
   The API rejects a promise and freezes every reachable input, but plugin trust rather than this
   API remains the boundary against synchronous side effects. A thrown updater has zero lock, temp,
   backup, watcher, reload, or audit-publication effects.
9. Before a temp, backup, workspace, or config publication effect, the common wrapper durably
   reserves a Section 4 operation and binds it to authenticated actor scope, stable principal and
   credential generation, method, expected base hash, and a keyed canonical intent digest. Principal
   identity is JWT issuer/subject/binding tuple, paired operator-device ID, service-account ID, or
   the time-bounded legacy platform-credential generation; a tenant-admin org role never satisfies
   platform `operator.admin`. In-process CLI/onboarding/plugin callers use the same wrapper. A retry
   with that operation ID can enter only its recorded generation and stage; a different intent,
   principal, or credential generation cannot adopt it. A different current platform
   `operator.admin` may inspect a bounded status for recovery but cannot resume another principal's
   nonterminal operation. Each prepared temp name, candidate digest, captured incumbent
   identity/digest, and intended publication is durable in `publication-intent` before the
   corresponding rename.
10. The commit phase acquires the config lock and performs a second fresh uncached descriptor read.
    An explicit expected base hash must equal this locked raw snapshot. Without one, every touched
    path's presence and keyed value digest must still equal the preparation snapshot. It also
    descriptor-reopens and verifies the root alias chain, every include row, dotenv row, discovery
    root membership, package/manifest row, and captured core/registry generation before applying the
    patch. A dependency identity, byte digest, graph, listing, environment-generation, or registry
    change returns typed `CONFIG_INPUT_CHANGED` with zero temp, backup, or publication effects; an
    unreadable or unbounded dependency returns `CONFIG_VALIDATION_UNAVAILABLE`. The verification
    point linearizes the captured external inputs; later external dotenv/plugin-file changes apply
    to a later reload and cannot change bytes already being committed.
11. The locked phase applies only the prepared patch to the fresh root config, preserving unrelated
    fields. It resolves includes from the verified in-memory graph, restores captured environment
    references and root comments, validates against the frozen context, strips runtime defaults,
    stamps the version, and serializes at most 8 MiB. It performs no config/include/plugin/dotenv
    pathname read and cannot discover or import a module. Whole-file replacement, delete, and
    snapshot restore always require an expected base hash. A locked validator I/O/callback tripwire
    aborts before publication if an unapproved syscall, process-environment access, registry read,
    logger, dynamic import, timer, or user callback is attempted.
12. Creation and replacement use an unpredictable same-parent mode-`0600` temp opened with
    `O_CREAT|O_EXCL|O_NOFOLLOW`. The writer writes exactly the validated bytes, verifies regular type,
    device/inode/size and digest, calls `fdatasync`, then publishes relative to the held parent.
    Initial creation uses `RENAME_NOREPLACE`; `EEXIST` is a proven no-effect conflict. Replacement
    uses `RENAME_EXCHANGE`, then verifies that the displaced entry now under the owned temp name has
    the exact captured incumbent device/inode/size/digest. `renameat2` is not treated as an inode CAS.
    On mismatch, both entries are preserved and rollback is attempted only while the canonical entry
    still matches the candidate and the displaced entry still matches the just-observed replacement;
    a verified reverse exchange plus parent sync is no-effect conflict. Any failed comparison,
    reverse-exchange ambiguity, or sync ambiguity is durable `uncertain` and requires recovery. A
    successful candidate exchange is parent-synced before reporting durable commit.
13. Backup rotation runs under the same lock from the exchanged, descriptor-bound and verified old
    file. Every backup is a regular no-follow entry in the same pinned parent and is installed by
    no-replace or exchange. An exchange verifies the displaced backup against its captured identity
    and uses the same two-sided guarded rollback; a last-barrier replacement is never accepted as the
    expected backup. A backup failure after durable config publication is a committed result with a
    bounded warning or, when backup generations cannot be classified, committed-with-uncertain-
    backup requiring recovery. It is not a retryable config-write failure. A failure before config
    publication is no-effect. Failure to establish whether publication or parent sync completed
    returns `CONFIG_COMMIT_UNCERTAIN`; automatic callers must not replay it.
14. Delete renames the canonical entry to an owned no-replace quarantine, then verifies that the
    quarantine has the exact captured incumbent identity/digest before any cleanup. Because rename is
    not a source-inode CAS, a mismatch attempts rollback only if the quarantine still matches the
    observed moved entry and the canonical name is still absent; verified restore plus parent sync is
    no-effect conflict. Otherwise both evidence entries remain and the durable result is uncertain.
    It never unlinks a canonical or quarantine path by name before this proof. Snapshot IDs are one
    validated segment, and restore reads a bounded regular no-follow snapshot from the pinned
    snapshot root before entering the same expected-hash transaction. Direct copies, in-place
    writes, pathname deletes, and backup rotation outside the primitive are removed. Layout
    migration is a prepared updater. Organization-volume split remains an offline operation but uses
    exclusive root leases and the same per-target publication transaction.
15. After config parent sync, recovery can compare the durable operation's candidate/incumbent/temp
    identities with the pinned directory and advance a missing post-crash ledger transition. A kill
    after exchange or parent sync but before the response therefore reconciles to committed,
    no-effect, or uncertain without repeating the updater or rename. Old/displaced entries and temps
    are removed only after the terminal ledger transition is durable. If the ledger itself becomes
    unreadable after config sync, capability remains unavailable and evidence is preserved; callers
    receive no retryable classification.
16. The internal result is one of `no-change`, `no-effect-conflict`, `committed`,
    `committed-with-warning`, or `uncertain`. It carries previous/current hash, config generation,
    durability stage, and the operation ID. The low-level receipt never carries raw config, paths,
    environment values, or addon internals. RPC, CLI, onboarding, extension, and recovery callers
    may replay automatically only a terminal result proven `no-effect-conflict`; committed,
    uncertain, and retired-withheld operations suppress replay.
17. `config.set`, `config.patch`, and `config.apply` gain an optional server-issued `operationId` and
    the additive `config.operation.get` method. A first mutation call without one performs bounded
    parse/authorization and ledger reservation but zero config/temp/backup effects, then returns the
    stable `CONFIG_OPERATION_ADMISSION_REQUIRED` error with the operation ID and intent digest; the
    shared client, Gateway CLI/tool, Hub, and bundled callers transparently resubmit the identical
    request once. This preserves method names while making the ID known before effects. Duplicate
    resubmission resumes/status-checks the row. Committed responses retain the existing authorized
    `{ ok, path, config, reloadMode, restart, sentinel }` fields and add
    `{ operation: { id, status, previousHash, currentHash } }`; the legacy authorized path fields are
    compatibility output, not low-level receipt/log fields. Conflict/unavailable/uncertain return a
    stable error code plus operation ID and never look like success. Hub must render uncertain as
    unresolved and poll `config.operation.get`; it may not show its current any-resolved-is-success
    state. A retired operation returns `retired-withheld` and remains non-retryable.
18. Cache invalidation, watcher/reload notification, and a bounded redacted audit happen only after
    the publication outcome is known and outside native locks. Observer failure cannot turn a
    committed result into a failure. An uncertain result invalidates caches and forces a fresh read
    before another mutation. The write audit names a fixed caller ID and hashes, never config values.

### 6. Plugin runtime migration

1. The loader currently constructs one shared `PluginRuntime`; replace its config member with a
   facade bound to the immutable loaded plugin manifest ID and runtime generation before passing it
   to that plugin or channel registration. Add `PluginRuntime.config.mutateConfig(updater, options)`
   with the same prepare/patch/lock/outcome contract. Convert all twelve bundled extension calls to
   narrow field updaters; a channel may not retain and later submit a whole configuration.
2. Keep the existing `writeConfigFile` property for one documented plugin compatibility cycle so
   old plugins fail intelligibly rather than crashing on a missing method. It performs zero writes
   unless the proposed object carries an opaque, enumerable snapshot token issued by the same
   plugin facade and runtime generation. The plugin-scoped existing `loadConfig` and explicit
   `loadConfigForUpdate` each return a clone carrying that token; ordinary object spread preserves
   it while JSON cloning or reconstruction does not.
3. With a valid token, the compatibility wrapper constructs the merge patch between the token's
   issued path-presence tree/keyed canonical digests and the proposed object outside the config
   lock. The token registry retains no raw configuration or secret value. The common commit phase
   compares touched paths and applies only that patch to the fresh config; unrelated fresh fields
   are preserved. Missing, cross-plugin, foreign-generation, reused, expired, oversized, or
   post-reload tokens return `CONFIG_WRITE_UPGRADE_REQUIRED` with zero writes. A token is
   single-use, lives at most five minutes, and the runtime retains at most 32 tokens per plugin and
   256 globally. Capacity exhaustion refuses a new token rather than evicting a live one silently.
4. New bundled code and documented plugin examples use `mutateConfig`; the compatibility wrapper is
   test-only allowlisted in the writer manifest and emits one bounded deprecation notice per plugin
   per process. Removing it requires a later plugin ABI review. It is not an authorization boundary:
   existing plugin trust remains unchanged.

### 7. Managed agent workspace transaction

1. A **managed ownership operation** creates, relocates, or logically deletes an agent workspace,
   agent runtime directory, session/transcript directory, or the initial files required before
   config visibility. It reserves and transitions an operation in the Section 4 ledger; the global
   ledger lock makes live/retained/logical/physical capacity and generation CAS atomic across
   processes and across distinct workspace locks. A corrupt, unreadable, over-capacity, or
   unsyncable ledger makes managed ownership mutation unavailable; it is never silently recreated.
2. The immutable operation payload contains the Gateway-issued operation ID, config generation,
   agent ID, kind, source/target root identities, target relative identity, owner class, and bounded
   marker/temp identities. Every transition is an exact prior-generation CAS frame durably synced
   before the next effect. Crash-safe compaction and retained/retired semantics are exactly Section
   4; ownership code has no second counter, side journal, or process-local capacity assumption.
3. Creation stages every required managed directory and initial file before config visibility.
   Missing path components are created one segment at a time relative to the nearest pinned existing
   ancestor. A newly created root receives an immutable ownership marker containing only operation,
   agent, config, and root-generation digests. An existing unmarked workspace may remain an
   externally managed workspace, but Gateway never adopts, quarantines, or recursively deletes it.
4. Under config then sorted workspace locks, creation rereads config, rejects an incumbent/different
   agent, revalidates staged roots, creates runtime/session paths, publishes initial identity and
   bootstrap files, and makes config visibility last. A crash before config leaves a recoverable
   staged operation; a crash after durable config commit resumes receipt finalization and cannot
   recreate or overwrite another agent.
5. Relocation stages and validates the new target first and atomically switches config, but this
   slice never moves, quarantines, truncates, or recursively deletes the old workspace, runtime, or
   session/transcript root while ordinary writers remain outside the ownership-lock protocol.
   Logical deletion durably removes config visibility and likewise leaves all prior bytes in place.
   Both operations terminate as `manual-cleanup-required` with captured marker/root hashes and a
   bounded operator receipt. They do not label cleanup complete or infer writer quiescence.
6. Automated destructive cleanup becomes admissible only in a separately reviewed slice that
   inventories every transcript, run, agent, plugin, sandbox, and external writer for the root;
   gives each a shared generation-bound writer lease; blocks new writers; drains the lifecycle;
   acquires the exclusive generation lease; and proves no timed-out/uncooperative writer can access
   the root. Until then, even a marker-matched root is retained. A service-stopped maintenance tool
   may report an operator checklist but cannot bypass this rule merely by holding the Gateway root
   lease.
7. Recovery is idempotent and bounded to 100 operations or five seconds per pass. It distinguishes
   staged, published, config-committed, cleanup-prepared, quarantined, completed, conflict, and
   uncertain states, but cleanup-prepared/quarantined can exist only after the future writer-lease
   slice. In this slice, recovery converges relocate/delete to config state plus
   `manual-cleanup-required`; it never infers success from directory absence and never reuses an
   operation ID, target generation, or owned name.
8. Convert Gateway `agents.create/update/delete`, agent/setup/onboarding CLI paths, Feishu dynamic
   agents, isolated cron, auto-reply, sandbox initialization, and the ownership portion of
   `ensureAgentWorkspace`. Regular transcript traffic and arbitrary agent/plugin content writes
   remain outside this slice and are the reason physical relocation/deletion is withheld. Legacy
   `agent.install` is explicitly not a secure consumer and cannot advertise HC-034 V2; HC-034
   replaces or disables it before marketplace release.
9. The implementation records the withheld physical-cleanup work twice before this slice stops: an
   exact-site `TODO(handoff)` on every production branch that terminalizes
   `manual-cleanup-required`, and the meta proposal
   `proposals/2026-10-03-gateway-managed-writer-leases.md`. That proposal inventories transcript,
   run, agent, plugin, sandbox, and external writers and owns the later generation-lease, drain, and
   destructive-cleanup contract. The readiness ledger may qualify this slice's package, config, and
   logical ownership boundary, but must keep physical managed-root cleanup and HC-034/GW-022 open.
   A manual-cleanup receipt is an explicit partial disposition, never completion evidence.

### 8. Checked writer inventory and source ratchet

1. Generate one versioned multi-language manifest. A TypeScript compiler-AST pass includes all 78
   current non-test `writeConfigFile(` matches across 46 files, identifies the two definitions and
   76 calls, and separately names the 12 runtime-plugin calls in nine bundled extensions; it also
   finds aliases, re-exports, dynamic imports, direct config publications, backup/snapshot writers,
   and managed-root creates/moves/deletes. A checksum-pinned SwiftSyntax pass runs in macOS CI, and a
   checksum-pinned tree-sitter-bash plus literal-path/write-command pass covers shell/Docker
   maintenance. The manifest includes every production source language and fails if a newly
   discovered language/file class touching canonical config or managed roots lacks an analyzer.
2. The initial non-TypeScript rows explicitly include
   `apps/macos/Sources/OpenClaw/OpenClawConfigFile.swift:36-156` plus its `ConfigStore` and `AppState`
   callers, and `DebugSettings.swift:784-807`. Connected macOS UI writes move to Gateway
   `config.patch`/`config.set` and the durable operation handshake. Offline macOS writes use one
   clearly named Darwin `compatConfigMutation` implementation with an OS file lock, locked fresh
   base-hash check, atomic replace, and honest weak result; they never advertise strong. The
   read-only `OpenClawMacCLI/GatewayConfig.swift` row is classified read-only rather than omitted.
3. Bootstrap/maintenance rows explicitly include `docker/entrypoint.sh:56-58` missing-file-only
   creation, `setup/phases/50-config-generation.sh:108-288` deployment, and
   `setup/phases/99-rollback.sh:55-63` removal. The Docker entrypoint may create only before the
   Gateway process starts and uses no-replace semantics. Setup/rollback, `scripts/edit-gateway-config.ts`,
   snapshot/layout migration, and organization-volume split either call the transaction or prove
   service stop plus exclusive root lease; direct `cp`, redirection, and `rm` of a live canonical
   config are removed. E2E fixtures are classified test-only by exact path and cannot authorize a
   production match.
4. Each row records source location, language/analyzer, owner, operation, target class, current
   ordering, converted API,
   result handling, and either `strong`, `compat-only`, or `offline-exclusive`. `compat-only` cannot
   be selected by secure consumers. `offline-exclusive` requires the process-lifetime/root-lease
   proof and an executable test; a comment is not evidence.
5. The source gate fails closed on an unclassified call, aliased/re-exported writer, star export,
   computed member call, raw import of a low-level module, Swift `Data.write`/`FileManager` canonical
   publication, shell/Docker copy/redirection/removal, direct canonical config publication, or new
   ownership create/delete/relocate. The low-level native and named compatibility modules are the
   only allowlisted raw writers. Test fixtures use separate helpers and cannot make a production row
   disappear.
6. Closure requires zero production whole-config callers except the explicit one-cycle plugin
   compatibility wrapper, zero direct canonical config writers outside the primitive, and every
   ownership row either converted, safely reduced to non-destructive manual cleanup, or proven
   offline-exclusive. The checked manifest is regenerated on Linux and macOS CI and mutation-tested
   by adding representative TypeScript aliases, Swift direct writes, shell copies/removals, and new
   recursive-delete writers.

### 9. Observability and availability

1. `gateway.status` exposes only capability version, tuple, artifact digest prefix, probe state,
   backend (`strong` or `compat`), and stable unavailable reason. It exposes no absolute path,
   device/inode, lock key, environment value, config hash, or workspace name.
2. Secure RPC capability advertisement is conditional on a successful strong probe for every root
   it will touch. A later mount/root/artifact drift withdraws new admission immediately and marks an
   in-flight uncertain operation for recovery; it does not switch backends.
3. Logs use fixed event names and bounded codes. Lock contention is rate-limited per hashed lock key;
   path, config, prompt, and native error buffers are not logged. Sentry and telemetry receive the
   stable code, stage, tuple, and receipt ID only.

## DELTA

1. Add the pinned Rust/N-API workspace package, four-target release assembly, checksum manifest,
   anonymous-snapshot loader, production-tarball install tests, and per-filesystem capability probe.
2. Add the opaque descriptor/lease/publication API, bounded native loops, explicit error taxonomy,
   process-local queue, lock ordering, process-lifetime root lease, and strong/compat capability
   split.
3. Add the cross-process durable mutation ledger, atomic global capacity, crash-safe compaction,
   Gateway-issued operation IDs, config status reconciliation, and additive shared/Hub/CLI protocol
   flow.
4. Replace the config writer with bounded outside-lock include/environment/registry capture plus the
   locked pure patch transaction, last-barrier-safe publication/backups/delete/restore, typed
   post-publication outcome, and post-commit observer boundary.
5. Add the plugin updater API and bounded token-backed compatibility wrapper; migrate every bundled
   extension and internal caller away from stale whole-config submission.
6. Add config-before-workspace ownership transactions on the common ledger; convert agent RPC,
   CLI/onboarding/setup, Feishu, cron, auto-reply, sandbox, reset/uninstall, and volume-split paths,
   leaving physical old-root cleanup explicitly manual until writer leases exist.
7. Generate and enforce the TypeScript/Swift/shell writer manifest. Remove direct config and
   ownership mutations not classified by the final manifest.
8. Expose bounded truthful capability/unavailable states. Gate GW-005/GW-025 and HC-034/GW-022 on
   `strong` without implementing those consumers in this slice.
9. Add the exact-site physical-cleanup handoffs and the separately indexed managed-writer-lease
   proposal; keep every `manual-cleanup-required` operation visibly partial in receipts and ledgers.

## Test matrix

| Invariant                                  | Required proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four release tuples are real               | Two clean builds per tuple are byte-identical; the exact `pnpm pack` tarball installs and runs syscall probes on x64/arm64 glibc/musl; host-source imports are removed from the test environment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Loader binds immutable trusted bytes       | Replace the sidecar and addon together and prove the embedded manifest still rejects them. Keep an `O_RDWR` descriptor to the valid shipped addon, pause after anonymous snapshot verification, overwrite the same source inode, and prove the anonymous artifact SHA-256 remains the embedded-manifest value while direct `process.dlopen` exports the independently expected `buildIdentity`. Never assert that the addon self-hashes. Mutate during copy, pathname-swap, omit `/proc`, reject `O_TMPFILE`, corrupt the anonymous copy, and force realpath/reopen; every pre-`dlopen` failure proves zero initialization. Force N-API registration failure and every post-load identity mismatch separately; each permits only bounded export-registration activity, reports `initialization_failed`, leaves no descriptor/thread/timer/hook/file/network/global-state effect, quarantines the instance, and never falls back.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Missing strong backend cannot downgrade    | On each supported Linux tuple, remove/corrupt the addon and prove config mutation plus secure capability fail closed with zero Node/path/shell fallback. Darwin/Windows compat tests keep ordinary config behavior but never advertise strong.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Handle lifecycle is safe                   | Close/finalizer races, double close, concurrent operation/close, stale-generation use, deadline, count/byte/depth overflow, and forced GC leak tests return typed outcomes with stable descriptor counts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Native authority is not inherited          | Spawn and exec children while root, config, and workspace handles/leases exist; close-on-exec leaves no child descriptor or lock ownership. Panic/fault injection produces only fixed errors and no unwind across N-API.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Probe proves actual filesystem             | Child processes exercise lock exclusion/crash release, constrained open, no-replace, exchange, sync, enumeration, cleanup, foreign collision, seccomp/syscall rejection, bind/remount and root replacement, marker replacement, missing/inconsistent mount ID, same device+inode reuse after old-handle close, no cache reuse across reopen/restart, and five-second timeout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Config inputs are bounded and immutable    | Real JSON5 fixtures cover nested/array/sibling/absolute-inside-root includes, max depth ten, config-root symlink alias, comments, `${VAR}`, CWD/state dotenv precedence, defaults stripping, plugin paths/manifests/schemas and diagnostics. File/count/byte/deadline overflow, include symlinks, alias swap, same-size include mutation, registry/listing mutation, env-generation drift, plugin callback/lazy import, and any locked filesystem/global-env/logger access fail before publication.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Config updates preserve a union            | Two real child processes pause after reading and update unrelated fields; both fields remain. Same-field writes yield one commit and one base/CAS conflict. Run against create and existing-file paths.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Callbacks never hold native locks          | Pause an internal and plugin updater during preparation while another process commits through the native config lock. Resume it: touched-field conflict or unrelated-field union is correct, and instrumentation proves exactly one callback before lock acquisition.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Public base hash is checked under lock     | Pause `config.patch/set/apply`, let another process commit, then resume; stale request has zero temp/backup/watcher effects and returns the current bounded conflict.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Publication is crash-classified            | Kill or fault before temp write, after write, after `fdatasync`, before/after no-replace/exchange, before/after parent sync, before each ledger transition, during backup, and during observer callbacks. Recovery yields complete old or complete new JSON and durable committed/no-effect/uncertain status, never partial; only proven no-effect may replay. Replace the incumbent at the final barrier for replace, delete, and backup: verify displaced mismatch, guarded rollback only while both generations match, foreign bytes preserved, and ambiguity withheld.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Config callers can reconcile               | Actual `config.set/patch/apply` first-call admission has zero config effects and returns a server-issued ID; exact resubmission commits once. Kill the server after exchange and after parent sync before response, reconnect as the same actor, query status, and prove Hub/CLI/tool/plugin do not replay or render uncertain as success. Cross-actor, changed-intent, retired, malformed, capacity-full, and old-client paths are explicit. Existing success fields remain source-compatible with additive operation metadata.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Mutation ledger is cross-process durable   | Race two real first-start processes and kill at every fixed-bootstrap create/sync/whole-directory rename/parent-sync barrier; exactly one complete genesis becomes visible, while fixed prepublication state resumes or fails closed and never admits an operation. Two real processes reserve at every live/retained/logical/physical/frame-credit boundary and exactly one wins. Drive tiny transitions to the 90,000-frame operating boundary and prove the next admission rolls over before effect; existing effectful operations can still consume every reserved uncertain/terminal credit when rollover is faulted. An exactly 100,000-frame recovery pair rolls over before append, while 100,001 frames fail closed on restart. Pause one process before append while another requests compaction: the ledger lock serializes them, the captured append revalidates the selector after acquiring the lock, and the frame appears exactly once in the selected new or old pair. Kill before/after each new snapshot/active create, file sync, no-replace publish, selector-candidate sync, selector exchange, displaced verification, parent sync, old-pair unlink, and final selector CAS; restart selects exactly one matched pair, resumes the recorded phase, reclaims old active bytes without truncation, and never replays a snapshotted frame. Generate 32 distinct incomplete tails, restart after every preservation/repair, prove exact-digest retries add zero evidence, then submit a 33rd or byte-overflow tail and require durable `LEDGER_TAIL_EVIDENCE_FULL` with every byte preserved and no append/rollover. Fault tail create/sync/parent-sync and prove count/byte/frame-credit/64-MiB reservations survive restart. Interior corruption fails closed, live/uncertain rows and credits survive compaction, high-water IDs never reuse, retired resolves withheld, and a replacement/unselected ledger inode is never appended. |
| Path replacement cannot redirect           | Swap every config/root ancestor and incumbent with symlink, directory, device, hard link, and same-size regular replacement at barriers before open, write, exchange, sync, and cleanup. No byte appears outside the pinned root and no foreign incumbent is truncated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Existing config semantics survive          | Comments, `${VAR}` references, includes, defaults stripping, schema warnings, backups, snapshots, permissions, empty-create, watcher/reload, CLI/RPC result, and cache behavior have focused parity tests. Secrets never enter receipt/log/telemetry snapshots.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Plugin compatibility is bounded            | All nine bundled extensions use narrow updaters. Facades cannot exchange tokens. Valid token + unrelated edit preserves both; same-field conflict writes zero. Missing/foreign-generation/reused/expired/capacity-blocked/JSON-cloned tokens return upgrade-required. Registry inspection proves it retains keyed digests/presence only, no raw config/secret.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Workspace publication is ordered           | Paused RPC/CLI/Feishu create proves workspace, agent/runtime/session dirs and required initial files exist before config visibility. Config readers never observe a half-created managed agent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Ownership races converge                   | Real processes race same agent/same target, same agent/different target, and different agents. Test global ledger reservation plus config-before-workspace, sorted multi-lock ordering, queue saturation, four-second timeout, reverse order, process death, and restart.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Live writers are never destructively raced | Pause real transcript, run, plugin, sandbox, and agent writers, then relocate/delete the agent. Config switches or hides atomically, each writer may finish against the retained old root, no root is moved/truncated/deleted, and the terminal receipt remains `manual-cleanup-required`. A mutant that quarantines a marker-matched live root fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Crash recovery is honest                   | Kill after ledger reserve, each mkdir/file publication, workspace publish, and config commit. Restart resumes or reports conflict/uncertain/manual cleanup without ID reuse, incumbent overwrite, automatic retry, or moving/deleting any old, unmarked, mismatched, or actively written root.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Legacy/external paths remain safe          | Existing unmarked workspace stays usable but is never adopted or recursively deleted. Relink/symlink/marker tamper, foreign quarantine, cross-device target, and previously moved target produce visible manual cleanup with foreign bytes intact.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Offline commands exclude the Gateway       | A live Gateway shared root lease blocks reset/uninstall/split. After process death, exactly one exclusive command may update canonical config; physical managed-root cleanup still returns manual-cleanup-required without writer leases. Multi-root reverse order fails before effects, and a mutant that treats the root lease as arbitrary-writer quiescence fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Delete and restore are rooted              | Snapshot IDs with separators, symlinked/replaced/oversized snapshots, swapped snapshot roots, foreign config quarantines, and delete faults are rejected or honestly uncertain. Success syncs the pinned parent and never writes through a pathname replacement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Writer inventory is complete               | Generated baseline proves the TypeScript 78/46, two-definition/76-call, and 12-call/nine-extension counts plus every Swift and shell/Docker row. Actual macOS connected/offline races preserve unrelated fields and remain compat-only. TypeScript alias/re-export/star/dynamic/computed writers, Swift `Data.write`, shell copy/redirection/remove, direct rename, and recursive-delete mutants all fail the gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Secure consumers remain gated              | With any root probe unavailable, orchestration and marketplace V2 capability are absent and admission performs zero authority/config/workspace effects; ordinary compat-only status remains truthful.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Blast radius and compatibility

- **Gateway configuration:** every in-tree config writer changes to an updater or a classified
  offline-exclusive operation. Public `baseHash`, comments, includes, environment references,
  backups, snapshots, warnings, watchers, and reload behavior remain. Mutation calls add a durable
  operation admission/status round trip so a disconnected caller can recover an honest outcome.
- **Bundled and third-party plugins:** the runtime gains an additive updater. The old method remains
  present for one cycle but requires an issued single-use snapshot token and cannot silently submit
  an unversioned whole config. Release notes and runtime diagnostics name the upgrade path.
- **Agent management:** creation, relocation, and logical deletion use the durable ledger. Existing,
  old, external, or unmarked roots remain usable and are never silently adopted, moved, or
  recursively removed; relocation/deletion reports manual cleanup until all writers gain leases.
- **CLI and maintenance:** setup/onboarding/agent commands use the transaction. Reset, uninstall,
  layout migration, snapshot restore, and organization-volume split use config/root leases and
  report committed/uncertain outcomes without blind replay. They leave managed state/workspace
  cleanup manual until shared writer leases prove quiescence.
- **Platform support:** strong filesystem atomicity is supported only by the four reviewed Linux
  tuples and the probed target filesystem. macOS/Windows and unsupported Linux ordinary operations
  use a visibly weaker compatibility backend. Connected macOS config UI writes go through Gateway;
  its offline fallback remains compat-only. GW-005/GW-025 and HC-034/GW-022 stay unavailable.
- **Packaging/deployment:** npm, Docker, rsync/dist, and self-hosted releases must carry the same
  verified native manifest and artifact bytes. A development host build is not release evidence.
- **Downstream protocols:** shared protocol schemas add optional `operationId`, operation metadata,
  stable config mutation error codes, and `config.operation.get`. Hub and Gateway CLI/tool callers
  adopt the admission/resubmit/status flow in this slice; Site and Paperclip have no config-mutation
  caller today and pass a source inventory proving no change. Old clients receive an explicit
  admission-required no-effect error rather than a false success or an untracked write.

## Verification and release

1. Record the generated writer manifest, package/artifact manifest, two-build reproducibility
   receipt, `pnpm pack` contents, four target test receipts, focused TypeScript/native tests,
   `pnpm tsgo`, `pnpm lint`, `pnpm format:check`, and relevant config/agent/CLI/extension neighbors.
2. Run the negative controls: disable `openat2` constraints, replace native flock with a
   process-local mutex, skip parent sync, restore stale whole-config submission, remove the ownership
   marker check, and bypass the source ratchet. Each must fail its named regression.
3. A second reviewer checks native unsafe blocks, handle ownership, syscall flags, build provenance,
   tarball contents, error classification, every writer-manifest disposition, and macOS/Windows
   compatibility claims against source and actual packaged artifacts.
4. GW-022A's package, config, and logical managed-ownership boundary closes only when all converted
   production callers and packaged targets pass. A TODO, source-only Rust test, host-only binary,
   mocked child process, or downstream unavailable state is not closure. The required exact-site
   cleanup TODOs and indexed writer-lease proposal document a deliberately partial
   `manual-cleanup-required` result; they do not close physical relocation/deletion or the parent
   GW-022 finding.
5. GW-005/GW-025 and HC-034/GW-022 remain independently blocked until they consume the merged exact
   package version and pass their own authority, capacity, recovery, and end-to-end tests.
