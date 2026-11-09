---
id: 2026-10-03-gw022a-native-syscall-executor
title: Move descriptor operations to a bounded native executor and fence handle lifetime
stage: spec
status: approved
verdict: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion]
tags: [security, logic, permissions, test]
type: fix
proposal: 2026-10-03-gw022a-linux-filesystem-atomicity
findings: [GW-022A]
---

# GW-022A native syscall executor and handle lifetime

## 0. Product

The descriptor-relative filesystem package must not run filesystem waits on the Gateway event
loop, reuse a descriptor after close, or tell a caller that a timed-out mutation had no effect when
the kernel may already have changed state. This slice converts the complete currently exported
handle API to a bounded asynchronous executor, makes close/finalization an authority barrier, and
gives every operation one monotonic deadline and one honest disposition.

This is a prerequisite implementation slice of the approved
`spec-gw022a-linux-fs-atomic.md` contract at SHA-256
`abf99b54d9fd79dc5d373a4e79baf2611f90ee8fdf0a077e072801d3b7859cbd`. The current admission
substrate is the independently accepted 38-file packet
`gw022a-native-admission-review-v2.md` at SHA-256
`ad7d77b46f4cf6565d14c632ed3fee00a1d17e072610b53e209cb6a533a44d51`; its parent receipt is
`gw022a-native-admission-parent-review.md` at SHA-256
`65f2f33e1981eb84fbae295da4118d24c499ff18018fb5fd65d6be13f0221923`.

**Out of scope:** the durable mutation ledger; config or workspace writer conversion; recursive
managed-root cleanup; the shared-writer lease; platform packaging for all four target tuples;
Gateway production imports; capability advertisement; deployment or production migration. The
package remains `releaseQualified: false`, and no Gateway consumer may select this backend from this
slice alone. Immutable artifact loading and `process.dlopen` remain the bounded startup-only loader
defined by the parent contract; no request or plugin callback may invoke that loader.

## AS-IS

### 1. Every exported descriptor operation is synchronous

Gateway HEAD `85fe0f6a8cf57a440b03fe6f8a609d6c5b6f1b56` contains the new package under
`packages/linux-fs-atomic`. `src/native-types.ts:65-126` exposes synchronous `RootHandle`,
`EntryHandle`, `PublicationHandle`, and `LeaseHandle` methods. The synchronous native inventory is:

| Surface                          | Filesystem or wait work on the caller thread                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `NativeBinding.openAbsoluteRoot` | walks from `/`, opens each component and captures identities                                                              |
| root                             | identity, policy validation, marker install/validation, open/read/list/create, lease polling, rename, unlink, sync, close |
| entry                            | identity/read/list/open/create, lease polling, rename, unlink, sync, close                                                |
| publication                      | write, `fdatasync`, identity, close                                                                                       |
| lease                            | unlock and close                                                                                                          |

`src/handles/root.rs:254-283` and `src/handles.rs:190-223` poll `flock(LOCK_NB)` with a two
millisecond thread sleep for up to five seconds. `fsync`, `fdatasync`, directory scans, reads,
external-root revalidation and all open/mutation syscalls likewise run before returning to
JavaScript. The current probe protects the parent event loop by doing its filesystem exercise in a
child process, but its parent still calls `binding.openAbsoluteRoot`, root policy configuration,
`root.identity`, `root.installMarker` and `root.close` synchronously in
`src/probe.ts:49-84,88-99,170-213`. Root opening walks every absolute component before the probe is
queued. This is a current parent-process blocking limitation, and a future in-process config or
orchestration consumer would expose the same issue for the rest of the handle API.

### 2. Deadlines and failure dispositions are incomplete

Only directory enumeration and lease polling currently receive a timeout. Identity, open, read,
write, sync, rename, unlink, marker, close and root-chain validation have no operation deadline.
`list_directory` checks elapsed time between `getdents64` calls, but a syscall may return after its
deadline and the outer operation has no common admission deadline.

The package rejects with fixed native strings but does not carry a machine-readable
`no-effect`/`partial`/`uncertain` disposition. In particular,
`PublicationHandle.writeAndSync` changes `written` back to false after every error. A short write,
failed `fdatasync`, late timeout or identity failure after bytes were written can therefore permit a
second write against a publication whose state is already uncertain.

### 3. Close does not own admitted work or the full root authority

`HandleFd` stores `Mutex<Option<OwnedFd>>`. Operations hold the descriptor mutex for a synchronous
closure and `close` simply takes the descriptor. Root close first takes the authority write lock and
invalidates the root, so today its safety depends on every operation being synchronous. There is no
operation permit that can survive a JavaScript await, no bounded close queue, and no result that
distinguishes a queued operation from one already inside an effectful syscall.

Entry/publication close affects only that descriptor. A root N-API object has no explicit finalizer
that marks its authority closed; child handles retain the authority `Arc`. Lease `Drop` performs a
best-effort unlock on the finalizer thread. The package has no forced-GC proof that an admitted task
retains its descriptor until settlement, that root finalization invalidates descendants, or that
descriptor close/unlock avoids the Node event loop.

### 4. Raw binding exposure bypasses any future JavaScript queue

`LinuxFsAtomicCapability` publicly exposes `binding: NativeBinding`. Adding only a TypeScript queue
would therefore leave every synchronous method and the raw addon callable by any in-tree consumer.
The package export must make the bounded executor and opaque wrappers the sole supported operation
path. The immutable loader may retain a private raw binding for build-identity checks, but production
callers and the probe must not receive it.

## TO-BE

### 1. One lazy, bounded executor per loaded capability

The first explicit filesystem call creates one executor owned by that loaded addon capability.
Addon registration and `nativeBuildInfo()` remain side-effect-free: they start no thread, timer or
hook. Executor creation is an explicit operation and either creates exactly four named worker
threads or fails atomically with `NATIVE_EXECUTOR_UNAVAILABLE`; a partial start stops and joins every
created worker and quarantines the capability for process lifetime. Workers run package code only.
They invoke no JavaScript/plugin callback, logger, environment lookup, network call or dynamic
module load.

The executor admits at most 64 live root authorities and 512 live native handles. It runs at most
four filesystem tasks concurrently, at most one task per root authority, and retains a fair FIFO per
authority. Ordinary pending work is capped at 64 tasks per authority and 512 globally. Queue
saturation rejects before task/descriptor admission with disposition `no-effect`. Control close and
finalizer records use a distinct capacity reserved one-for-one when a handle is created; ordinary
work can never consume the capacity needed to close every live handle. No queue grows in response to
logging or promise-settlement failure.

`openAbsoluteRoot` reserves a provisional authority identity, one root slot and one control slot
before it enters the executor. It participates in the same global fair/active limits. Success
atomically promotes that reservation to the returned root authority; every failure, cancellation or
panic releases it after owned descriptor cleanup. Concurrent root opens therefore cannot bypass the
64-authority bound while their paths are still being walked.

Every operation that can return an `EntryHandle`, `PublicationHandle`, or `LeaseHandle` likewise
reserves one live-handle slot and its paired control-close slot synchronously before the first
`openat2`, `mkdirat`, create, marker append or lock attempt. Saturation therefore performs zero
filesystem calls. Success atomically promotes the reservation into the returned handle. A
pre-effect failure/cancellation releases it; a post-open/create failure, cancellation or panic keeps
the reservation until the executor has closed every owned descriptor and classified any namespace
effect. It then releases the slot even when the durable namespace result is uncertain. No task may
create a descriptor or directory first and try to account for it afterward.

Each loaded N-API environment owns its executor through the finite state machine
`uninitialized -> registering -> accepting -> env-closing -> drained`; any failed registration,
partial worker start or panic instead enters `poisoned`, from which ordinary admission never
resumes. Executor creation first allocates a native `Arc<EnvExecutor>` with admission closed, then
registers exactly one raw `napi_add_async_cleanup_hook` through the already pinned `napi::sys`
surface, and only then starts the four workers and opens admission. Hook registration failure starts
zero workers. Partial worker start stops and joins the created workers, removes the not-yet-fired raw
hook, and quarantines the capability. The raw cleanup-handle pointer and one owning `Arc` live in a
single `CleanupHookData` allocation until terminal removal. The high-level
`Env::add_async_cleanup_hook`/`add_removable_async_cleanup_hook` wrappers are forbidden here because
their callback removes the handle when the callback returns; returning from a callback that merely
spawned cleanup would let Node tear down the environment before cleanup completed.

The raw async cleanup callback atomically changes `accepting` to `env-closing`, disables every
JavaScript/TSFN/deferred delivery, removes every queued ordinary ticket as no-effect, cancels facade
lease timers and retains every dispatched task plus every pre-reserved control record. It then hands
the same `Arc` to the native control lane, enqueues missing finalizer/root-close work, waits in the
cleanup callback for dispatched and control work to reach actual native cleanup, and joins all four
workers. Only then, still on the environment thread that invoked the hook, it calls raw
`napi_remove_async_cleanup_hook(handle)` exactly once and drops `CleanupHookData`. The callback never
returns before that terminal removal, and no background thread calls a Node-API function. This
deliberately permits the environment thread to remain blocked during teardown: after `env-closing`,
workers invoke no JavaScript callback and do not attempt to settle a promise, so they cannot depend
on the blocked environment loop to finish. A stuck syscall may therefore keep worker/environment
teardown pending indefinitely; a timer, `worker.terminate()` or process-exit request cannot convert
it into a clean drain. The source mutant that spawns an unowned coordinator and returns from the hook
before join/removal must fail teardown qualification.

`JsDeferred` remains only the live-environment result transport. Its own teardown hook may
abort-release the TSFN, but that event neither owns nor cancels native work. Explicit capability
drain uses the same native state machine and joins workers; the still-registered environment hook
later observes `drained` and removes itself without starting new work. A worker panic is caught around
the complete task boundary; the build uses unwind semantics for this boundary. The executor then
quarantines itself, classifies the panicked task from its last reached stage, rejects queued ordinary
work as no-effect, and continues only the control cleanup lane. No Rust unwind crosses N-API and no
replacement worker is spawned after a panic or a stuck syscall.

### 2. Complete async API and source ratchet

`nativeBuildInfo()` and immutable getters such as `generation`/`isDirectory` may remain synchronous
because they touch only captured memory. Every method that opens, inspects, reads, enumerates,
writes, syncs, locks, unlocks or closes a descriptor returns a Promise through the executor. This
includes `openAbsoluteRoot`, policy/marker operations, identity, all entry opens, read/readlink/list,
create, rename, unlink, publication write, sync, release and every explicit close.

The public package exports only frozen opaque async `RootHandle`, `EntryHandle`,
`PublicationHandle`, `LeaseHandle`, and capability facades. It does not export `NativeBinding`, a
raw N-API object, a numeric descriptor or an internal sync method. The internal probe worker is
converted to await this same async facade; there is no probe-only synchronous syscall backdoor. A
generated source/declaration ratchet fails on any exported effectful method whose return type is not
Promise-like, any `.binding` escape, or any direct addon import outside the immutable loader.

The startup-only loader remains synchronous, bounded to the reviewed 64 KiB manifest and 16 MiB
artifact, and can run only during capability bootstrap before listener publication. Its immutable
snapshot and `process.dlopen` cannot be delegated while loading the addon into the current process.
After load, every filesystem syscall issued by the addon or its probe facade uses the executor.

The parent probe opens/configures/identifies its root asynchronously before mount-key scheduling,
and its final receipt revalidation is asynchronous under the same original five-second absolute
deadline. The already accepted abnormal-child rule is unchanged: if direct-child settlement cannot
prove the entire owned process group gone, `probe_cleanup_uncertain` permanently poisons that mount
key for the process. Neither the executor nor root close clears that poison, starts replacement work
on the mount, or calls the result a normal timeout. Root/descriptor cleanup still runs and is
retained to actual settlement; poison is an admission fence, not permission to abandon cleanup.

### 3. One monotonic deadline and honest operation stages

The sole ordinary-call budget input is an opaque `FsOperationContext`. Callers create it through
`capability.beginOperation({ timeoutMs, signal? })`; `timeoutMs` must be a finite integer in
`1..5000`, `signal` must be an actual `AbortSignal` from the same JavaScript environment, and invalid
input throws `INVALID_OPERATION_CONTEXT` before queue/handle reservation. The call synchronously
creates a private native operation token whose immutable deadline is `Instant::now() + timeoutMs`;
it does not trust a mutable JavaScript wall or monotonic clock. The frozen branded facade context
retains that exact token and signal identity. It exposes neither the deadline nor a public task
identifier. Every child in one logical sequence receives that same context and therefore the same
native deadline; constructing a fresh context per child is a caller defect covered by a negative
source and runtime test.

The exact public facade is:

```ts
interface LinuxFsAtomicCapability {
  readonly build: Readonly<NativeBuildInfo & { artifactSha256: string; releaseQualified: boolean }>;
  readonly strongFilesystemAtomicity: boolean;
  beginOperation(input: Readonly<{ timeoutMs: number; signal?: AbortSignal }>): FsOperationContext;
  openAbsoluteRoot(path: string, operation: FsOperationContext): Promise<RootHandle>;
  drain(): Promise<NativeControlResult>;
}
interface RootHandle {
  identity(operation: FsOperationContext): Promise<NativeFileIdentity>;
  configureAuthorityPolicy(
    rootUid: number,
    rootGid: number,
    rootMode: number,
    authorityUid: number,
    authorityGid: number,
    operation: FsOperationContext,
  ): Promise<NativeFileIdentity>;
  installMarker(operation: FsOperationContext): Promise<NativeRootMarker>;
  openDirectory(name: string, operation: FsOperationContext): Promise<EntryHandle>;
  openFile(name: string, operation: FsOperationContext): Promise<EntryHandle>;
  readLink(
    name: string,
    maximumBytes: number,
    operation: FsOperationContext,
  ): Promise<NativeLinkValue>;
  list(
    maximumEntries: number,
    maximumNameBytes: number,
    operation: FsOperationContext,
  ): Promise<NativeDirectoryEntry[]>;
  createDirectory(name: string, mode: number, operation: FsOperationContext): Promise<EntryHandle>;
  createPublication(
    name: string,
    mode: number,
    operation: FsOperationContext,
  ): Promise<PublicationHandle>;
  acquireLease(
    name: string,
    exclusive: boolean,
    operation: FsOperationContext,
  ): Promise<LeaseHandle>;
  renameNoreplace(source: string, target: string, operation: FsOperationContext): Promise<void>;
  renameExchange(left: string, right: string, operation: FsOperationContext): Promise<void>;
  unlinkFile(name: string, operation: FsOperationContext): Promise<void>;
  unlinkEmptyDirectory(name: string, operation: FsOperationContext): Promise<void>;
  sync(operation: FsOperationContext): Promise<void>;
  close(): Promise<NativeControlResult>;
}
interface EntryHandle extends Omit<RootHandle, "configureAuthorityPolicy" | "installMarker"> {
  readonly generation: string;
  readonly isDirectory: boolean;
  readBounded(maximumBytes: number, operation: FsOperationContext): Promise<Buffer>;
}
interface PublicationHandle {
  readonly generation: string;
  writeAndSync(bytes: Buffer, operation: FsOperationContext): Promise<NativeFileIdentity>;
  identity(operation: FsOperationContext): Promise<NativeFileIdentity>;
  close(): Promise<NativeControlResult>;
}
interface LeaseHandle {
  readonly generation: string;
  release(): Promise<NativeControlResult>;
}
type NativeControlResult = Readonly<{
  operation: "handle-close" | "lease-release" | "capability-drain";
  status:
    | "closed"
    | "closed-late"
    | "released"
    | "released-late"
    | "drained"
    | "drained-late"
    | "cleanup-uncertain";
  stage: string;
  disposition: "complete" | "uncertain";
}>;
```

`NativeControlResult.stage` and every rejected operation's stage use the closed
`NativeOperationStage` union generated from the backtick stage names in the normative table below;
an implementation cannot add a free-form stage. Rejections are `NativeOperationError` instances
with exactly `{ code, operation, stage, disposition }` in addition to the fixed error name/message.
`operation` is the closed union `begin-operation | root-open | identity | authority-policy |
marker-install | directory-open | file-open | read | readlink | list | directory-create |
publication-create | lease-acquire | publication-write | rename-noreplace | rename-exchange |
unlink-file | unlink-directory | sync | handle-close | lease-release | capability-drain |
environment-cleanup`. `code` is the closed union `INVALID_OPERATION_CONTEXT | INVALID_ARGUMENT |
NATIVE_EXECUTOR_UNAVAILABLE | NATIVE_EXECUTOR_POISONED | EXECUTOR_SATURATED |
OPERATION_CANCELLED | OPERATION_DEADLINE_EXCEEDED | ROOT_AUTHORITY_CONFLICT | ENTRY_CONFLICT |
ENTRY_EXISTS | LEASE_BUSY | HANDLE_CLOSING | HANDLE_CLOSED | PUBLICATION_ALREADY_WRITTEN |
IO_FAILED | CLEANUP_UNCERTAIN | OPERATION_OUTCOME_UNCERTAIN`. Internal fixed syscall/authority
reasons map to one of these categories and stay in bounded structured telemetry; neither those
reasons nor errno become public error text. `disposition` is the closed union `no-effect | partial |
uncertain`; successful ordinary calls have no synthetic disposition.

`EntryHandle` has the same open/read/list/create/lease/rename/unlink/sync/close signatures as the
root, except for root-only policy/marker operations; it never exposes a fake `drain`. `nativeBuildInfo`
and the two captured getters remain the only synchronous public values. Names, modes, counts, byte
bounds, path and the write buffer are validated before reservation and again natively. A publication
copies at most the existing 32 MiB bound into owned immutable task bytes before dispatch so caller
mutation cannot change the payload. List remains capped at 10,000 entries/1 MiB names, and lease wait
uses the smaller of the shared context and the four-second lease maximum; the old method-local
`timeoutMs` parameters disappear.

At ordinary method admission, the facade validates that the context belongs to this exact capability
and N-API environment, creates one opaque task ticket and synchronously reserves its capacity. If the
native token is expired or the signal is already aborted, it returns a rejected Promise with no
reservation or filesystem call. The task retains the same native deadline token, so time between
`beginOperation`, facade admission, the facade FIFO and native execution all counts once. A per-task
signal listener removes that exact queued ticket; after native dispatch it can only set the token's
shared atomic cancellation flag through a private in-memory binding, not release capacity or close a
descriptor. The listener is removed only at terminal settlement. Control `close`, `release` and
`drain` deliberately take no operation context and follow the non-expiring control protocol in
section 5.

Each task records one of the following finite ordered stage sets. `entered` means immediately before
the named syscall; completion of an `entered` mutation is not assumed when a timeout, panic or
cleanup failure obscures its return. The stable error envelope is
`{ code, operation, stage, disposition }`. `code` is one of
`INVALID_OPERATION_CONTEXT`, `INVALID_ARGUMENT`, `OPERATION_CANCELLED`,
`OPERATION_DEADLINE_EXCEEDED`, the existing fixed authority/entry/lease conflict code,
`IO_FAILED`, `CLEANUP_UNCERTAIN`, or `OPERATION_OUTCOME_UNCERTAIN`; raw errno/path/thread details
never escape.

| Operation family                                | Ordered task stages                                                                                                                                                                                               | First externally visible effect and required failure classification                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| root open                                       | `queued -> root-walk -> root-opened -> root-identity-verified -> handle-registered -> complete`                                                                                                                   | No namespace effect. Failure is `no-effect` only after every opened fd and reservation is proven closed; cleanup failure is `CLEANUP_UNCERTAIN/uncertain`.                                                                                                                                                                                         |
| root identity                                   | `queued -> authority-verified -> stat-entered -> complete`                                                                                                                                                        | Before `stat-entered`: `no-effect`; after it: timeout/cancel/read error is `partial` and returns no identity.                                                                                                                                                                                                                                      |
| authority policy                                | `queued -> authority-verified -> policy-input-verified -> policy-commit -> policy-verified -> complete`                                                                                                           | `policy-commit` is the in-memory authority effect. Any failure/late deadline at or after it is `OPERATION_OUTCOME_UNCERTAIN/uncertain`; before it is `no-effect`.                                                                                                                                                                                  |
| marker install/append                           | `queued -> authority-verified -> marker-read -> marker-create-entered -> marker-write-entered -> marker-fdatasync-entered -> marker-parent-sync-entered -> marker-registry-commit -> marker-verified -> complete` | First create/write entry is effectful. A recognized `EEXIST` before creation is a read/reopen branch, not success. Any unverified create/write/sync/registry outcome is `uncertain`; only verified existing marker conflict before mutation is `no-effect`.                                                                                        |
| child open                                      | `queued -> authority-verified -> child-open-entered -> child-identity-verified -> handle-registered -> complete`                                                                                                  | No namespace effect. Open/validation failure is `no-effect` after proven close; descriptor cleanup ambiguity is `uncertain`.                                                                                                                                                                                                                       |
| identity/read/readlink/list                     | `queued -> authority-verified -> read-entered -> read-bounded -> complete`                                                                                                                                        | Before `read-entered`: `no-effect`; after any read/getdents/readlink/stat begins: incomplete/late work is `partial`, and no buffer/list/identity is returned as complete.                                                                                                                                                                          |
| directory create                                | `queued -> authority-verified -> mkdir-entered -> child-opened -> child-identity-verified -> handle-registered -> complete`                                                                                       | `mkdir-entered` is effectful. A kernel `EEXIST` result is `ENTRY_EXISTS/no-effect`; every other unverified post-entry result is `uncertain`, including lost result delivery after successful creation.                                                                                                                                             |
| publication create                              | `queued -> authority-verified -> create-entered -> publication-opened -> publication-identity-verified -> handle-registered -> complete`                                                                          | `create-entered` is effectful. A kernel `EEXIST` result is `ENTRY_EXISTS/no-effect`; every other unverified post-entry result is `uncertain`. Cleanup closes the fd but does not silently unlink the created name.                                                                                                                                 |
| lease prepare/acquire                           | `queued -> authority-verified -> lock-registry-read -> lock-create-entered -> lock-registry-synced -> fifo-promoted -> flock-entered -> lease-registered -> complete`                                             | Unverified lock creation/registry mutation is `uncertain`. After the permanent lock is durably registered, `LEASE_BUSY`, queue cancellation or timeout before successful flock is `no-effect` for the protected caller mutation. A successfully acquired but undeliverable lease is released by control cleanup; cleanup ambiguity is `uncertain`. |
| publication write+sync                          | `queued -> authority-verified -> write-entered -> bytes-written -> fdatasync-entered -> publication-identity-verified -> complete`                                                                                | `write-entered` is effectful. Every short/error/late/panic outcome at or after it is `uncertain`; the publication becomes terminal and cannot write again. Before it, cancel/timeout is `no-effect`.                                                                                                                                               |
| rename no-replace/exchange                      | `queued -> authority-verified -> rename-entered -> namespace-verified -> complete`                                                                                                                                | Before `rename-entered`: `no-effect`. Kernel `EEXIST` for no-replace or `ENOENT` for either variant is a mapped `no-effect`; success followed by late deadline or any outcome that cannot prove the kernel result is `uncertain`.                                                                                                                  |
| unlink file/empty directory                     | `queued -> authority-verified -> unlink-entered -> namespace-verified -> complete`                                                                                                                                | Before `unlink-entered`: `no-effect`. Kernel `ENOENT` is mapped `no-effect`; success followed by late deadline or an obscured syscall result is `uncertain`.                                                                                                                                                                                       |
| file/directory sync                             | `queued -> authority-verified -> sync-entered -> complete`                                                                                                                                                        | Before `sync-entered`: `no-effect`; any failure or late deadline after entry is `uncertain` because durability is not proved.                                                                                                                                                                                                                      |
| handle close/lease release                      | `control-reserved -> closing -> prior-work-drained -> unlock-entered? -> close-entered -> closed -> complete`                                                                                                     | Control work has no `no-effect` outcome. It produces cached `closed`, `closed-late`, `released`, `released-late`, or `cleanup-uncertain` only after the native terminal boundary.                                                                                                                                                                  |
| root close/capability drain/environment cleanup | `control-reserved -> admission-stopped -> queued-cancelled -> active-drained -> descendants-closed -> workers-joined -> hook-removed? -> complete`                                                                | Control work never expires or abandons cleanup. The environment variant removes its raw async hook only at `hook-removed`; a stuck syscall keeps the stage pending.                                                                                                                                                                                |

Every operation checks the native deadline before external-root/marker validation, before the first
effect, between every bounded loop/syscall stage, and after the final syscall/identity check. A kernel
syscall is not claimed cancellable. If it returns after the deadline, the task stays owned until
return and settles according to the stage it actually reached:

| Boundary                                                                       | Required disposition                                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| expired/signal cancelled while queued, or before first effect                  | `no-effect`                                                             |
| bounded read/list produced incomplete data                                     | `partial`; no bytes/list are returned as complete                       |
| mutation/write/sync/unlock may have begun without final verified state         | `uncertain`; never auto-retry                                           |
| all required work and verification completed but the deadline is observed late | `uncertain`; upper recovery may reconcile, ordinary success is withheld |

Errors expose a fixed code, disposition, operation kind and finite stage. They expose no pathname,
file contents, raw errno text, descriptor number or thread detail. Ordinary invalid arguments are
`no-effect`. Root/marker/generation conflicts are `no-effect` only when observed before an effect;
the same failure after an effect is `uncertain`. Monitoring/resolver failure cannot reclassify or
release work.

Queued cancellation removes the exact ticket and frees its reservation. Cancellation after native
dispatch only sets a task flag; the promise and executor slot remain owned until the syscall returns
and the task reaches a classified terminal stage. There is no `Promise.race` timeout wrapper.

### 4. Nonblocking lease queue

Lease admission begins by reserving one of the 512 global lease tickets and one live-handle/control
pair, before any filesystem call. A native asynchronous `prepareLease` task then resolves or creates
the permanent lock through the held parent/root/marker descriptors, validates its registered
identity, and retains the exact candidate descriptor. It returns an opaque internal target to the
capability scheduler; no path, descriptor or caller-provided key is used as queue authority.

The target's canonical FIFO identity is a schema-versioned digest over addon build identity, physical
root device/inode/mount/filesystem identity, root marker generation and identity, the marker's
canonical relative lock-key segment bytes, and the retained lock file device/inode/mount/mode/
owner/group/link identity. It deliberately excludes the random wrapper generation, absolute path or
alias spelling. Independently opened handles and no-symlink aliases to the same physical root,
marker, relative lock key and retained lock inode therefore enter one FIFO and share its 64-ticket
cap. Different roots or lock inodes do not collide. The scheduler accepts this key only from the
private native target object and compares the complete captured tuple on collision; a digest match
with unequal tuple fails closed.

All pre-canonicalization reservations count against the 512 global bound. Promotion from preparation
to the keyed queue atomically checks the 64-ticket per-identity bound; failure closes the retained
candidate and releases its handle/control/global reservations after cleanup. Before every attempt,
native code reopens and validates the named permanent lock and marker against the retained identity.
Replacement, marker generation change or alias drift terminally conflicts the ticket and cannot
create a second queue key. An already held old-inode lease remains retained, but subsequent protected
publication must fail its ordinary task-time authority revalidation until operator recovery; a new
wrapper cannot lock the replacement as a fresh authority.

The native primitive performs exactly one nonblocking `flock` attempt per executor task. It never
sleeps or waits for a lease on a worker thread. The private capability scheduler supplies the parent
contract's process-local FIFO: 64 waiting tickets per canonical lock identity and 512 globally, one
active head per lock, a four-second maximum absolute deadline, and bounded monotonic retry timers.
A cancelled queued ticket is removed without consuming a native executor slot. Busy, timeout or
saturation is typed retryable `no-effect` with respect to the protected caller mutation; once
acquired, the already reserved lease/control pair is atomically promoted before the ticket resolves.
No synchronous JavaScript filesystem discovery, per-wrapper path map, or public queue-key override
exists.

The timer belongs to the capability lifecycle. Closing a root or capability cancels all matching
unsubmitted lease tickets. A dispatched attempt remains retained until actual settlement. Release
is idempotent and executor-owned; the descriptor is closed even if explicit unlock fails, while any
unexpected post-acquisition failure is reported without treating the lease as still usable.

### 5. Handle state, descriptor ownership and close barriers

Every handle has an `open -> closing -> closed` state, immutable addon/root generation, registered
root authority and executor control reservation. Synchronous admission checks state/generation and
creates an operation permit before returning a Promise. The permit owns the handle/root `Arc` until
the worker and result classification finish; JavaScript GC cannot invalidate or recycle its
descriptor.

Operations for one root authority execute FIFO. Entry/publication/lease close atomically changes
that handle to `closing`, rejects later work, and appends a control barrier behind all work admitted
for that handle. Root close atomically changes the authority to `closing`, cancels unsubmitted lease
tickets, rejects new work through every descendant, drains all previously admitted authority work,
then closes all registered descendant, marker, permanent-lock and root descriptors. It invalidates
the probe cache/generation before resolving.

Close, lease release, finalizer cleanup and capability drain are reserved control work, not ordinary
`1..5000ms` tasks. Once admitted they cannot be cancelled, expire, lose their control reservation or
return `no-effect`; the handle remains `closing` and cleanup stays owned until every required
unlock/drop/close and earlier task actually settles. They record a five-second observation deadline
for truthfulness only. Completion after that point returns a cached finite `closed-late` or
`released-late` result, and an unlock/close ambiguity returns a cached `cleanup-uncertain` result,
but neither result is delivered before actual native cleanup reaches its terminal boundary. Double
close/release and retries while pending return the same cached promise; calls after settlement return
the same cached terminal result and never enqueue another control record. Capability drain has one
executor-wide control reservation created with the executor and the same convergence rule.

Finalization performs the same state transition and uses the pre-reserved control lane; it never
executes unlock/close filesystem work on the JavaScript finalizer thread. If JavaScript delivery is
gone, cleanup still completes natively. A finalizer cannot silently discard an uncertain
publication: after the first write syscall starts, publication state is terminal `complete` or
`uncertain`, never reset to `fresh`. Root finalization fences descendants even when a child wrapper
remains reachable.

The capability owns an explicit async drain for tests and future Gateway lifecycle wiring. It stops
admission, cancels queued no-effect work, waits for dispatched tasks and all control cleanup, joins
workers, and only then resolves. It does not claim a hard deadline can preempt an uninterruptible
kernel syscall. This slice tests the drain but does not wire it into Gateway startup/shutdown or
advertise production readiness.

### 6. Existing authority invariants remain mandatory

Moving work off-thread does not weaken the accepted substrate. Each task still reopens and validates
the external root chain and marker under the root operation authority before accessing a descendant.
Moved descendants, root/marker replacement, permanent-lock name replacement, cross-root lock
replacement, FIFO/device files, owner/mode/link drift and stale generations retain their fixed
fail-closed outcomes. Required effective UID/GID and root/marker identity are captured into the task;
no worker reads mutable process environment or policy after admission.

Every opened descriptor remains `CLOEXEC`; async workers do not spawn children. The child-process
probe and exec-inheritance tests prove no root, entry, publication or lease descriptor leaks through
an exec while tasks are queued, active, closing or finalized.

## DELTA

1. Add the lazy four-worker native executor, per-authority fair queue, fixed ordinary/control
   capacities, operation permits, the raw N-API async-cleanup ownership state machine and panic
   quarantine.
2. Refactor native handle internals to shared registered authority/handle state and convert every
   effectful/descriptor N-API export to the async task boundary. Keep only pure captured getters
   synchronous.
3. Add the exact `beginOperation` facade and method signatures, finite operation
   stage/disposition errors, one absolute-deadline adapter, between-stage deadline/cancellation
   checks and terminal uncertain publication state.
4. Replace blocking lease polling with one-attempt native flock plus the bounded facade FIFO/timer.
5. Add async idempotent entry/publication/lease/root close, root descendant fencing, reserved
   finalizer cleanup and explicit capability drain.
6. Hide the raw binding, convert the real probe worker/caches to the async facade, increment and pin
   the native export schema/build identity, and generate the no-sync/no-binding ratchet.
7. Keep `releaseQualified: false`; do not import the package from Gateway production code or claim
   the ledger, config writer, four-target artifact, recursive cleanup or managed-writer lease is
   complete.

## Concrete implementation file scope

The source slice is confined to `packages/linux-fs-atomic`. It may modify the existing package
manifest/build inputs (`package.json`, `Cargo.toml`, `Cargo.lock`, `build.rs`,
`scripts/build-native.mjs`), native exports and handle implementation (`src/lib.rs`, `src/error.rs`,
`src/handles.rs`, `src/handles/authority.rs`, `src/handles/root.rs`,
`src/handles/root/locks.rs`, and `src/sys.rs`/`src/sys/**` only where deadline checkpoints require
it), and the TypeScript public facade/types (`src/index.ts`, `src/loader.ts`,
`src/native-types.ts`). The real probe scope is exactly `src/probe.ts`,
`src/probe-contract.ts`, `src/probe-operations.ts`, `src/probe-worker.ts`,
`src/probe-process.ts`, `src/probe-process.test.ts`, `src/probe.test.ts`, and
`src/runtime.test.ts`.

Planned cohesive additions are `src/executor.rs`, `src/executor/**` (including
`env_cleanup.rs` and `stages.rs`), `src/handles/lifecycle.rs`, `src/operation-outcome.ts`,
`src/operation-scheduler.ts`, `src/async-api.test.ts`, `src/handle-lifecycle.test.ts`,
`src/executor-faults.test.ts`, `src/env-teardown.test.ts`, and an owned subprocess/worker-thread race
fixture beside those tests. The only direct unsafe N-API surface is the reviewed
`executor/env_cleanup.rs` wrapper around pinned `napi::sys::napi_add_async_cleanup_hook` and
`napi_remove_async_cleanup_hook`; its data-pointer lifetime and exactly-once removal are covered by
native tests. File names may be reduced during implementation; adding an unrelated source family is
a review delta. Generated `dist/**` and the host development `.node` artifact are qualification
outputs and must match their source inputs; build cache/`target/**` is never staged.

This slice does not modify root `package.json`/`pnpm-lock.yaml`, Gateway `src/**`, extensions, Hub,
Site, Paperclip, meta specs or deployment files. A newly required third-party crate or workspace
dependency is a spec delta requiring review before lockfile mutation; the planned executor uses the
already pinned N-API deferred/thread-safe settlement surface plus the Rust standard library.

## Test matrix

| Invariant                                 | Required executable proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event loop remains responsive             | Run each real exported operation against controlled blocking/fault shims while a monotonic event-loop sentinel advances. Lease contention for four seconds, delayed `fsync`, delayed read/list, open/root validation and close do not run on the Node thread. A sync-method mutant fails the sentinel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Queue bounds and fairness are exact       | Fill four active tasks, 64 per-authority and 512 global ordinary reservations; the next admission is typed no-effect without allocating a descriptor/deferred. Hit the 64-root/512-handle bounds with paused open, mkdir, publication and lease tasks and prove no over-cap syscall occurs. Failure/cancel/panic before and after create releases only after owned descriptor cleanup. Multiple roots make round-robin progress. Reserved close for every live handle still admits at ordinary saturation. Repeated saturation/recovery leaves counters zero.                                                                                                                                                                                                                                                                                                                                                  |
| Deadline starts at admission              | Pause a task in the queue until its deadline and prove zero syscall/effect. Stall a syscall beyond its deadline and prove the slot remains occupied until actual return; after return the result is partial/uncertain by reached stage, never ordinary success. A second request cannot consume the retained slot. One sequence passes one `FsOperationContext` through every child; a mutant that calls `beginOperation` per child exceeds the original parent deadline and fails. Invalid/foreign-environment contexts, mutable-looking lookalikes and already-aborted signals make zero reservations/syscalls.                                                                                                                                                                                                                                                                                              |
| Cancellation is owned                     | Cancel a queued task and prove its exact ticket/capacity disappears. Cancel after dispatch before and after the first mutation; actual work is awaited and classified no-effect/uncertain. No winning timer or rejected JS callback frees native work.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Publication cannot replay uncertain bytes | Fault short write, write completion, `fdatasync`, identity verification and post-verification deadline. After the first write syscall, a second `writeAndSync` is always denied; finalization preserves/cleans the descriptor without claiming no-effect. Before-write cancellation remains retryable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Close/finalizer is a barrier              | Race every handle close with queued and active identity/read/write/sync/rename/lease tasks. Earlier admitted work settles first, later work is `HANDLE_CLOSING`, double close converges, and no recycled descriptor is used. Root close invalidates live child wrappers and waits for all admitted descendants. Hold cleanup beyond five seconds, cancel/drop every caller promise, and prove the same cached late/uncertain control result appears only after cleanup; no handle remains permanently closing without owned work.                                                                                                                                                                                                                                                                                                                                                                              |
| GC releases exactly once                  | Under `--expose-gc`, create/finalize roots, entries, publications and leases at the live-handle cap while work is queued/active. Stable `/proc/self/fd` and lock probes prove exact release. Finalizer activity does not block the event-loop sentinel. Real `worker_threads` load independent addon environments, then terminate with ordinary work queued, active and post-effect plus handles open/closing. Parent fd/lock/process probes prove the raw async hook stops admission, cancels only queued work, closes every retained descriptor/lease and joins workers before worker termination resolves. A controlled stuck syscall keeps termination pending until released; no JS settlement occurs after env close. Hook-registration/partial-worker-start faults leave zero workers, zero descriptors and no dangling hook. A source mutant using the high-level auto-removing cleanup wrapper fails. |
| Stage table is executable                 | Inject a fault, cancellation and deadline at every ordered stage for root open, policy, marker create/append, child open, read/list, directory/publication create, lease prepare/flock, publication write/fdatasync, both renames, both unlinks, sync and every control cleanup. Assert exact stable `{code,operation,stage,disposition}`, namespace/descriptor state and retry eligibility. Initial-create `EEXIST`, rename `EEXIST`/`ENOENT`, unlink `ENOENT`, lease busy, post-success late deadlines and cleanup faults have the table's exact outcomes. Removing or reordering one stage assertion makes a named negative case fail.                                                                                                                                                                                                                                                                      |
| Lease waiting does not occupy workers     | Hold real cross-process locks for four seconds. Only the FIFO head makes bounded nonblocking attempts; unrelated root operations retain worker progress. Open the same physical root through independent handles and approved aliases and prove one canonical FIFO/64-ticket cap; different locks remain independent. Replace the lock inode before and after native preparation and prove conflict/old-holder fencing without a fresh queue. Exercise 512 pre-canonical/global capacity, tuple-digest collision, cancellation, timeout, close and process crash.                                                                                                                                                                                                                                                                                                                                              |
| Panic/fault is contained                  | Inject panic before effect, after effect and during cleanup. No unwind crosses N-API, no replacement thread appears, queued ordinary work is rejected, control cleanup drains, and dispositions match the last reached stage. Build assertions verify unwind is enabled for the catch boundary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Existing authority remains intact         | Re-run all accepted moved-descendant, marker/root replacement, cross-root permanent-lock, same-inode restoration, special-file, owner/mode/link and external-chain cases through the async facade. Negative controls that skip task-time revalidation fail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| No descriptor inheritance                 | Spawn/exec while operations are queued, active and closing; child fd/lock probes find none. Abnormal child and parent exits retain the accepted probe-group cleanup behavior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Public API has no bypass                  | Generated declarations show Promise returns for every descriptor/effect method and no public binding. AST/source ratchet rejects a sync method, direct `.node` import or `.binding` access. The actual async probe succeeds; a probe-only sync backdoor mutant fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Drain is truthful                         | Stop admission with queued, active and closing handles. Queued no-effect tasks cancel, active tasks and control cleanup actually settle, descriptors return to baseline and workers join. Explicit drain followed by environment teardown removes the retained raw hook exactly once without spawning work. A deliberately stuck syscall keeps both drain and environment teardown pending and is reported as a qualification limitation rather than a false clean shutdown.                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Verification

Qualification uses the exact built addon, generated declarations and package facade rather than a
mock executor. Required checks are package tests, TypeScript build/typecheck, `cargo test`,
`cargo clippy -- -D warnings`, `cargo fmt --check`, oxlint/oxfmt, descriptor/thread/counter receipts,
the accepted admission regression suite, and negative-control receipts for sync bypass, per-child
deadline reset, stage misclassification, early async-hook removal, deadline release and post-effect
publication replay.

The source packet records every owned file hash plus exact Node, pnpm, Rust, Cargo, libc, kernel and
filesystem inputs. A SOURCE PASS proves only this executor/handle slice. Four-target artifacts,
production capability advertisement, the durable ledger and every Gateway writer remain open and
must not be inferred from it.

Host qualification proves only the exact local tuple/filesystem/hardware named in its receipt. It
does not prove x86_64/aarch64 or glibc/musl parity. Release qualification remains blocked until the
parent contract's clean, pinned builders produce byte-identical artifacts twice for all four tuples,
install the exact packed package in clean tuple-native or approved emulated environments, and run
the syscall/probe/lifecycle matrix against each artifact on the claimed kernel/filesystem class.
Cross-compilation alone, a host-only `.node`, declaration tests, or QEMU without the required
filesystem/syscall behavior cannot change `releaseQualified` to true.
