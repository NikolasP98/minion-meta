---
id: 2026-08-17-gw-shells-lifecycle-stubs-spec
title: "Shells — finish the two lifecycle stubs: shells.update persists, and invoke wakes an archived shell"
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-gw-shells-lifecycle-stubs
verdict: approved
repos: [minion]
tags: [logic, security, test]
type: fix
---

# Shells — finish the two lifecycle stubs

**Owner surface:** `minion` (gateway, branch `DEV`) — `src/gateway/server-methods/shells.ts` and
`src/shells/`. Runtime behavior changes in the implementation branch land in those two directories;
the repository's required `proposals/` handoff entries are the only permitted supporting files.

**Read-only surfaces under the implementation branch:**

- `@minion-stack/shared` (`packages/shared/src/gateway/shells.ts` in this meta-repo) — under the
  implementation branch, the wire
  contract for **both** stubs **already exists and is complete**. Nothing needs to be added; §1
  quotes it. Changing a published npm package to fix a server-side stub would drag hub, site and
  paperclip through a release train for no wire-level gain.
- `@minion-stack/shells-bridge` (`packages/shells-bridge/`) — the **in-VM half of wake is already
  built** (`bridge.ts:215-217` dispatches `shells.restore`, `backup.ts:69` implements it). The bridge
  is baked into the digest-pinned workstation image (`2026-07-13-cloud-workstations`), so a bridge
  change means an image rebuild and a digest repin. Needing to edit it is a **stop condition** (§4).
- `minion_hub` `/cloud` — the consumer. The proposal excludes the hub form; this spec keeps that
  exclusion and treats "hub starts getting successes where it always got `UNAVAILABLE`" as an
  impact to announce, not a change to make (§4).

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b. Slices are tagged per-slice below. `logic` ⇒ **red-state TDD (G3) is mandatory** — the failing
test is written and shown failing against the current stub before the fix lands. S1 also carries
`security` ⇒ per §4b that slice **cannot auto-pass on score; a human gate is mandatory**. **No UI
governance applies** — zero `.svelte` files, zero `lint:design`, zero `lint:tokens`, in any slice.

> 🚨 **Test-suite constraint (hard, from operator memory `gw-no-full-test-suite`, user instruction
> 2026-07-10 verbatim: "DO NOT run the full gw test suite, it crashes the computer (overloads)").**
> Never run `pnpm test` at the `minion/` root — not directly, not in background, not "once before
> committing". Every gate in this spec is **focused**: `pnpm vitest run <specific files>` plus
> `pnpm vitest run test/ci/` plus `pnpm tsgo` plus `pnpm check`. If a dev-loop template tells the
> implementer to run the full suite, that instruction is overridden here.

**Prior art consulted.** `2026-05-20-shells-golden-agents` (superseded, but it is where archive/wake
was *designed*: D2, Q2, Q3, Q5, and the P4/P5 phase labels the stub comment refers to) ·
`2026-07-13-cloud-workstations` (the live successor: exe.dev adapter, org-default idempotency,
digest-pinned blueprint, hub `/cloud`, "archive policy: always on by default") ·
`packages/shared/src/gateway/shells.ts` and `packages/shells-bridge/` (read from disk in this
repo — the only first-hand code evidence available here, and it is decisive).

---

## 0. Product

From the approved proposal `2026-08-17-gw-shells-lifecycle-stubs`, verbatim:

> ## Problem
>
> src/gateway/server-methods/shells.ts:463 shells.update validates params then always returns
> UNAVAILABLE ('not yet wired', waiting on hub P4 form). src/shells/manager.ts:271 invoke() on an
> archived shell throws instead of the intended wake (exedev.create + restore) — comment admits the
> implementation was left out.
>
> ## Definition of done
>
> Either both paths implemented (update persists; invoke wakes archived shells or returns a typed
> wake-required error) with unit tests, or the stubs removed/marked experimental so no client builds
> against methods that cannot succeed.
>
> ## Out of scope
>
> Hub provision form UI (separate item).

**The ruling: implement both. Retirement is the fallback branch, not the plan.** The proposal offers
implement-or-retire; this spec picks implement, on evidence rather than preference:

1. **The published contract already promises the behavior.** `shells.update` is a named method with
   typed params and a typed response (`shells.ts:35,331-341`). Retiring it means either deleting
   exports from a package consumed by hub, site and paperclip (a semver-major on
   `@minion-stack/shared` to remove a method nobody successfully calls — all cost, no benefit), or
   leaving the types in place and merely documenting them as dead. The second is not "removed", it
   is the status quo with a comment.
2. **`wakeIfArchived` already defaults to `true` in the contract** (`shells.ts:245`: *"Force-wake if
   archived. Default true."*). A `manager.invoke()` that throws on an archived shell is not an
   unimplemented feature — it is a **server that contradicts its own published contract**. A client
   reading the type sees a default that does not exist.
3. **The expensive half of wake is already built and shipped inside the VM image.** The bridge
   handles `shells.restore` and streams `rclone cat | tar xzf` into the harness workdir
   (`bridge.ts:217,332` → `backup.ts:69`). What is missing is gateway-side orchestration:
   create the VM, wait for register, call restore, flip status. That is the cheapest possible
   version of this feature, and it gets cheaper every day it is *not* built only in the sense that
   somebody eventually deletes the working bridge code as dead.
4. **Archive is on by default in production.** `2026-07-13-cloud-workstations` records *"Archive
   policy: always on by default"* with two live org-default workstations. Every archived workstation
   is currently a workstation whose owner's next invoke throws. This is not a latent stub; it is the
   normal end state of the documented lifecycle.

**What a user loses today (stated with its uncertainty).** If a workstation has archived, an invoke
against it fails — the exact user-visible shape (raw error, spinner, silent failure in hub `/cloud`)
depends on hub error handling this spec does not read, so the PR must state what it actually looks
like rather than assert a symptom (⚠️ A3). And any workstation setting the hub exposes on the
Settings tab that maps to `shells.update` cannot be saved at all. Whether hub currently *calls*
`shells.update` is unknown from here and is S0's job to answer — it changes the release note, not
the fix.

## 1. What the contract already says (read from disk, first-hand)

These are not assumptions. They are quoted from `packages/shared/src/gateway/shells.ts` in this
repo, and they define the target shape precisely enough that the implementer should not invent one.

| Contract fact | Location | Consequence for this spec |
|---|---|---|
| `update: 'shells.update'` — *"mutate name / archiveIdleMs / backupCadence / etc."* | `:35` | The method name is fixed |
| `ShellsUpdateParams { shellId, patch: Partial<Pick<ShellSummary,'displayName'\|'archiveIdleMs'\|'backupCadence'\|'backupTarget'>> }` | `:331-340` | **Exactly four contractual patch keys.** Per-status validation may reject a listed key; anything outside the four is a rejection, not a merge (S1) |
| *"Server validates which fields are mutable per status"* | `:331` | The per-status mutability matrix is required by the contract, not an embellishment |
| `ShellsUpdateResponse = ShellSummary` | `:341` | Returns the **fresh, persisted** summary — not `{ok:true}` |
| `ShellSummary.orgId` — *"Caller-side handlers must scope access to this value"* | `:130` | Org-ownership enforcement is contractual (S1, `security`) |
| `ShellsInvokeParams.wakeIfArchived?: boolean` — *"Force-wake if archived. Default true."* | `:245` | Default-true wake is the promise `manager.ts:271` breaks (S3) |
| `shells.wake` + `ShellsWakeParams{shellId, backupId?}` / `ShellsWakeResponse{shellId, status, restoringFromBackupId}` | `:30,274-284` | A wake RPC already exists and its response is asynchronous (`status` is documented as `provisioning` until re-register). Manual wake and invoke-wake share one coordinator, but only invoke waits for restoration (S2–S3) |
| `ShellOnlinePayload.resumedFromArchive: boolean` | `:393-400` | The event for "came back from archive" exists — emit it, don't invent one |
| `ShellErrorReason` includes `restore_failed`, `provision_failed` | `:116-122` | Failure vocabulary exists — map onto it |
| `ResponseFrame.error {code,message,details?,retryable?}`; `ShellErrorPayload.remediation: 'restart'\|'wake'\|'destroy'\|'wait'\|null` | `gateway/types.ts:12-18`; `shells.ts:415` | RPC failures use the generic error envelope. `remediation` is defined for the `shell.error` **event**, not automatically for RPC errors; S0 must identify existing gateway error-code/detail conventions before S3 fixes a shape |
| Bridge dispatches `'shells.restore'` with `{remotePath}`, *"gateway calls this after wake"* | `packages/shells-bridge/src/bridge.ts:215-217,332` | The VM half exists; the gateway calls it **after register, before forwarding any invoke** |
| `restore()` = `rclone cat <remotePath> \| tar xzf - -C <workDir>` | `packages/shells-bridge/src/backup.ts:69-84` | Restore is a bridge-local operation; the gateway supplies one string |

⚠️ **A5 — `minion/` is not checked out in this workspace** (`ls -d minion` → no such file; the
meta-repo `.gitignore` excludes subprojects). Everything about *gateway* internals below — file
paths, the two line numbers, the existence of a store, of an exe.dev adapter, of `shells.wake`'s
handler — is carried from the proposal and prior specs, **not** read from disk. The table above is
the exception: it is real. S0 re-verifies the rest in under 90 minutes.

### Slice 0 — recon (≤ 90 min; prepend to S1, not counted as a slice)

Run from a checkout of `minion` on branch `DEV`. Read `minion/.dmux-hooks/CLAUDE.md` first, as
AGENTS.md requires for that subproject.

```bash
cd minion

# a. The two reported sites, verbatim
sed -n '430,500p' src/gateway/server-methods/shells.ts    # the UNAVAILABLE stub + its validation
sed -n '230,320p' src/shells/manager.ts                   # the throw + the comment that admits it
rg -n "not yet wired|UNAVAILABLE|not implemented|TODO" src/shells/ src/gateway/server-methods/shells.ts

# b. Is there a durable store, and what does it persist?  (decides implement vs retire)
ls src/shells/
rg -n "ShellSummary|ShellRecord" src/shells/ | head -40
rg -n "update|patch|save|persist|put\(|set\(" src/shells/*store* src/shells/registry.ts 2>/dev/null

# c. Is shells.wake IMPLEMENTED, or a second stub?  (decides S2's size)
rg -n "shells\.wake|SHELLS_METHODS.wake|function wake|wakeShell" src/
rg -n "shells\.restore|'shells\.restore'" src/            # does the gateway call the bridge half at all?

# d. The provider adapter — what does provision already do that wake must reuse?
rg -n "exedev|exe\.dev|--image=|--disk=|--tag=" src/shells/ | head -40
rg -n "function (provision|create)" -A 40 src/shells/provider*.ts src/shells/*exedev* 2>/dev/null | head -80

# e. Quota, idle timer, backup scheduler — the three schedulers update/wake must reconcile with
rg -n "archiveIdleMs|idle|cron|schedule|backupCadence" src/shells/ | head -40
rg -n "quota|headroom|diskGB" src/shells/ | head -30

# f. Org scoping on the existing shells.* handlers (the IDOR baseline)
rg -n "orgId" src/gateway/server-methods/shells.ts | head -40

# g. Where do shells tests live, and what is the focused invocation?
rg -ln "shells" test/ src/ --glob '*.test.ts'
ls test/ci/                                # the CI gate dir (memory: gw-no-full-test-suite)

# h. Which B2 bucket do shell backups actually target?   ← see ⚠️ A4, security
rg -n "backupTarget|b2://|MINION_SHELLS|BACKUP" src/shells/ .env.example 2>/dev/null | head -30

# i. Does anything call shells.update today? (release-note input, not a blocker)
rg -n "shells\.update" .  # in gw; then the same grep in minion_hub if a checkout is available

# j. Existing RPC error codes/details and shell.online emission (prevents inventing wire semantics)
rg -n "INVALID_PARAMS|NOT_IMPLEMENTED|UNAVAILABLE|retryable|remediation" src/gateway/ src/shells/
rg -n "SHELLS_EVENTS\.online|shell\.online|resumedFromArchive" src/gateway/ src/shells/
```

**Eight answers, each one sentence, written into the PR description:** (1) does a durable per-shell
store with an update path exist — yes/no; (2) is `shells.wake` implemented, a stub, or absent;
(3) what does the provision path do that wake must reuse verbatim (argv builder, tags, digest-pinned
image, org-default policy); (4) which schedulers must be reconciled on update (idle timer,
backup cadence); (5) which B2 bucket backups land in, and whether it is the public-read bucket from
the ⚠️ A4 audit; (6) does any client call `shells.update` today; (7) which existing error codes and
`details` shape sibling handlers use for invalid state, busy and timeout; (8) when the current
register path marks a shell online and emits `shell.online`.

**If (1) is "no durable store exists"** — stop and take **branch R** (§2R) instead of S1–S3, and say
so in the PR. Building a persistence layer for shells is a different spec with a different blast
radius, and it is not what "finish the stub" was approved for.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (shells.update actually persists: mutability matrix + org scoping + scheduler reconcile)
                 ├─▶ S2 (one wake coordinator: quota → create → register → restore → online, single-flight)
                 │        └─▶ S3 (invoke on archived: wake-or-typed-error; the throw at manager.ts:271 dies)
                 └─ S1 and S2 are independent; S3 depends on S2
```

S1 and S2 touch disjoint code and may be developed in parallel or shipped as separate PRs.
**S3 must not ship without S2** — an invoke path that calls a half-built wake is worse than the
honest throw it replaces.

---

### S1 — `shells.update` persists, with a mutability matrix and a locked patch surface

**Tags:** `logic`, `security`, `test` · **Estimate:** 5–7 h · **Human gate mandatory** (§4b `security`)

**Goal:** `shells.update` writes the four contractual fields to the durable store, returns the fresh
`ShellSummary`, and reconciles the schedulers those fields drive. No caller can use it to write a
field the contract does not list, or to touch a shell in another organization.

**Do:**

- **Keep the existing validation, delete the `UNAVAILABLE` return.** The stub already validates
  params (per the proposal) — that work stays; only the "always fail" tail is replaced.
- **Whitelist the patch. Never spread it.** `Object.assign(record, patch)` / `{...record, ...patch}`
  is forbidden here: `patch` arrives from a client, and a mass-assignment would let a caller write
  `status`, `orgId`, `vmName`, `image`, or `blueprint` — i.e. move a shell into another org or fake
  `online`. Build the update field-by-field from the four names in `ShellsUpdateParams`. Unknown keys
  are a typed `INVALID_PARAMS` rejection, not a silent drop (a silent drop makes a hub bug look like
  a server success).
- **Org-scope first, fail closed.** Resolve the caller's org, load the shell, and if
  `shell.orgId !== callerOrgId` return the same typed **not-found** the handler returns for an
  unknown `shellId` — a distinct "forbidden" turns the endpoint into an existence oracle for other
  tenants' shell ids. The contract asks for this in so many words (`shells.ts:130`). Follow whatever
  org-resolution the sibling `shells.*` handlers use (S0 f) — do not invent a second mechanism.
- **Per-status mutability matrix** (the contract's *"validates which fields are mutable per
  status"*). Intended table; S0 (b,e) may correct a cell, and the PR must say so if it does:

  | Field | `provisioning` | `online` | `archived` | `error` | Notes |
  |---|---|---|---|---|---|
  | `displayName` | ✅ | ✅ | ✅ | ✅ | Local label only — `vmName` is the provider identity and is **not** patchable, so no provider call and no rename cost |
  | `archiveIdleMs` | ✅ | ✅ | ✅ | ✅ | `null` = always-on. Persisting without rescheduling the idle timer recreates this bug one layer down (see below) |
  | `backupCadence` | ✅ | ✅ | ✅ | ✅ | Must reschedule the backup job in the same operation |
  | `backupTarget` | ❌ | ⚠️ constrained | ⚠️ constrained | ❌ | See the security rule below |

- **`backupTarget` is the dangerous one — constrain it or refuse it.** It flows to the bridge and
  becomes an `rclone` argument (`backup.ts`, argv-spawned, so there is no shell-injection vector —
  the risk is *destination*, not execution). A free-form value lets an org write its VM state into,
  or read another org's state out of, an arbitrary remote path. Rule: accept only a value that
  (a) parses as `b2://`, (b) matches the gateway-configured shells bucket, and (c) is prefixed by
  this shell's own id/org segment. Anything else is a typed `INVALID_PARAMS`. If S0 finds no
  legitimate caller for `backupTarget`, prefer refusing it outright and say so in the PR — a
  narrower surface is a valid answer here. Never mutate it while a backup is in flight
  (`ShellStatus`/backup-stuck check per `2026-05-20-shells-golden-agents` Q5).
- **Reconcile the schedulers in the same operation, or the fix is cosmetic.** Persisting
  `archiveIdleMs: null` while an already-scheduled auto-archive timer still fires would archive a
  workstation the user just set to always-on — a *worse* bug than the stub, because it looks like it
  worked. Same for `backupCadence`. The DoD tests this directly.
- **No new event.** The contract has no `shell.updated`; inventing one means editing
  `@minion-stack/shared` (§4, §5). Hub refetches. If S0 shows a live hub view that would go stale,
  file it as a `proposals/` entry — do not add the event under this spec.
- **Empty patch = no-op returning the current summary, and no write.** Not an error, not a
  gratuitous `updatedAt` bump.
- **Red-state first (G3).** Write the "update persists a rename" test, run it against the current
  stub, and paste the `UNAVAILABLE` failure into the PR. That is the proposal's claim, demonstrated.

**Files:** `src/gateway/server-methods/shells.ts` (the `:463` handler), the shells store/registry
module S0 (b) names (e.g. `src/shells/store.ts` or `registry.ts`), the idle/backup scheduler module
S0 (e) names, and their `*.test.ts` siblings. Nothing outside `src/shells/` and
`src/gateway/server-methods/shells.ts`.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run src/shells src/gateway/server-methods/shells.test.ts   # exact paths from S0 (g)
#   red-state first (G3): the rename test shown failing with UNAVAILABLE against the old handler.
#   - update{displayName} → response is a ShellSummary carrying the new name AND a re-read
#         from the store carries it (assert the store, not just the response)
#   - update{archiveIdleMs:null} on a shell with a scheduled auto-archive → the timer is cancelled
#         (assert the scheduler, not the record)
#   - update{backupCadence:'weekly'} → the backup job is rescheduled to weekly
#   - patch containing 'status' | 'orgId' | 'vmName' → typed INVALID_PARAMS, and the store is
#         BYTE-IDENTICAL afterwards (mass-assignment guard)
#   - update on a shell belonging to another org → the SAME typed not-found as an unknown shellId,
#         and no write
#   - backupTarget: a foreign bucket / a foreign org prefix / a non-b2 scheme → INVALID_PARAMS
#   - empty patch → current summary, no write, unchanged updatedAt
pnpm vitest run test/ci/ && pnpm tsgo && pnpm check
rg -n "not yet wired" src/gateway/server-methods/shells.ts        # → ZERO hits
rg -n "Object\.assign\(|\.\.\.patch" src/gateway/server-methods/shells.ts src/shells/  # → ZERO on the update path
rg -n ": *any|as unknown as|@ts-nocheck" src/gateway/server-methods/shells.ts          # → ZERO
git diff --name-only <base>...HEAD | rg -v '^(src/shells/|src/gateway/server-methods/shells)'  # → EMPTY
```

---

### S2 — One wake coordinator: verify backup → quota → create → register → restore → online

**Tags:** `logic`, `test` · **Estimate:** 6–8 h

**Goal:** one gateway-side coordinator takes an `archived` shell to `online` with its state restored
and is used by **both** the `shells.wake` RPC and (in S3) `manager.invoke()`. It exposes the
contractual start result (`ShellsWakeResponse`, normally `provisioning`) and one shared completion
promise; the RPC returns the former while invoke awaits the latter. Concurrent callers create
exactly one VM.

**Do:**

- **One implementation, two callers.** If S0 (c) found a `shells.wake` handler, extract its body
  into a coordinator in `src/shells/`; if wake is also a stub, write the coordinator first and make
  the RPC a thin start wrapper. Do not make the RPC await `online`: its published response explicitly
  permits `provisioning`. S3 awaits the same coordinator's completion promise before forwarding an
  invoke. Two wake code paths that drift is the failure mode this slice exists to prevent.
- **Order matters — check before you create:**
  1. **Resolve the backup first.** `backupId` if given, else the latest for the shell; then confirm
     it *exists at the remote* before touching the provider. Waking with no restorable backup
     produces a blank workstation that reports `online` — indistinguishable, to the user, from
     silently wiping their machine. No backup ⇒ typed error, status stays `archived`, **no VM
     created**.
  2. **Quota check.** Wake consumes a VM slot and disk (`2026-05-20-shells-golden-agents` Q3;
     50-VM / disk / Shelley ceilings). Over the cap ⇒ typed error naming the dimension, before the
     provider call. Reuse the provision-path quota guard S0 (d,e) found — do not write a second one.
  3. **Create** with the *same* argv builder, tags, and **digest-pinned image** the provision path
     uses, and persist the digest with the record (`2026-07-13-cloud-workstations`: *"The image
     digest, not a mutable tag, is persisted"*). A shell that wakes onto a different image than it
     archived from is a silent environment change.
  4. **Wait for the bridge to register**, bounded (S0 may find the existing provision timeout —
     reuse it; `2026-05-20-shells-golden-agents` Q2 budgets 60–180s cold restore).
  5. **Call `shells.restore` with `{remotePath}`** and await `{ok:true}` — the bridge's contract says
     it expects to be *"mid-startup with workDir already empty"*, so this must complete **before**
     any invoke is forwarded (S3 depends on this ordering).
  6. **Flip to `online` and emit `shell.online` with `resumedFromArchive: true` only after restore.**
     S0 (j) must identify and suppress any current register-time transition/event for a waking shell;
     registration means the bridge is reachable, not that restored state is ready. The field exists
     for exactly this; emitting `false` or emitting before restore would let consumers invoke too early.
- **Single-flight per `shellId`, and make it a real guard.** Two concurrent wakes (or an invoke plus
  a hub "Wake" click) must produce **one** provider `create`. A duplicate create burns a slot from a
  50-VM ceiling, orphans a VM nothing will ever reap, and puts two bridges on one `shellId`. An
  in-process promise map is the minimum; note in the PR that it is per-gateway-process, which is
  sufficient today because the swarm runs **one replica per org**
  (`2026-07-13-minion-gateway-swarm-cutover`: one replica per organization) — and add a
  `TODO(handoff):` naming the store-level lease that a multi-replica gateway would need.
- **Status handling must preserve the RPC contract.** `archived` starts or joins a wake;
  `provisioning` joins only when the coordinator has an identified in-flight wake. For `online`,
  unrelated provisioning, and `error`, preserve the existing sibling-handler behavior found by S0
  rather than returning a `ShellSummary` where `ShellsWakeResponse` is required. Any failure uses
  the existing error-envelope conventions identified by S0 (j).
- **Every failure leaves a consistent record.** Create fails → `error` + `provision_failed`; restore
  fails → `error` + `restore_failed` (and the PR states whether the created VM is torn down or left
  for manual inspection — either is defensible, silence is not). Never leave a shell stuck in
  `provisioning` with nothing scheduled to move it.
- **Restart the idle clock on wake**, so a woken shell does not immediately re-archive.
- **Do not touch the bridge.** Everything here is gateway-side orchestration of an existing bridge
  method (§4).

**Files:** `src/shells/` — a new or extended `wake.ts`/`lifecycle.ts`, the store, the provider
adapter call site, plus `*.test.ts`; `src/gateway/server-methods/shells.ts` only if the
`shells.wake` handler needs rewiring to the extracted function.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run src/shells
#   with a faked provider adapter + a faked bridge connection (no exe.dev, no B2, no network):
#   - archived + a valid backup → create called ONCE, restore called ONCE with the resolved
#         remotePath, status ends 'online', shell.online emitted with resumedFromArchive:true
#   - restore is called AFTER register and BEFORE the promise resolves (assert call ORDER)
#   - TWO concurrent wake starts on the same shellId → provider create called EXACTLY ONCE,
#         both callers share one completion result                                 ← single-flight
#   - shells.wake returns the contractual start response with restoringFromBackupId and does not
#         redefine the RPC as a synchronous wait for status 'online'
#   - no backup exists → typed error, status still 'archived', provider create NEVER called
#   - quota exceeded → typed error naming the dimension, provider create NEVER called
#   - create rejects → status 'error' + reason 'provision_failed'
#   - restore rejects → status 'error' + reason 'restore_failed'
#   - wake on 'provisioning' with a matching in-flight wake → joins, one create total
#   - online/error/unrelated-provisioning statuses preserve the handler's existing typed behavior
#         and never return a shape other than ShellsWakeResponse on success
#   - the image passed to create is the digest persisted on the record, not a mutable tag
#   - the idle timer is (re)armed after a successful wake
pnpm vitest run test/ci/ && pnpm tsgo && pnpm check
rg -n "TODO\(handoff\)" src/shells/            # → each has a matching proposals/ entry
git diff --name-only <base>...HEAD | rg -v '^(src/shells/|src/gateway/server-methods/shells)'  # → EMPTY
```

---

### S3 — `invoke()` on an archived shell: wake it, or return a stable wake-required failure

**Tags:** `logic`, `test` · **Estimate:** 5–7 h · **Depends on S2**

**Goal:** `src/shells/manager.ts:271` no longer throws. The contract's `wakeIfArchived` default of
`true` becomes true in fact, and `false` gets a typed, actionable error instead of an exception.

**Do:**

- **`wakeIfArchived !== false` (the default):** join S2's wake completion, then forward the invoke.
  The caller gets the normal `ShellsInvokeResponse {runId, startedAt}`; deltas stream as usual once
  the harness is up.
- **`wakeIfArchived === false`:** return a stable wake-required failure through the existing
  `ResponseFrame.error` envelope. Reuse the sibling-handler code and `details` convention found by
  S0 (j); include `remediation: 'wake'` in `details` only if that convention supports structured
  remediation. Do not infer an RPC schema from `ShellErrorPayload`, which is an event payload. It
  must not escape as a thrown/unhandled `Error`, and a client must be able to branch on its code.
- **Bound the hold, and bound the queue.** Cold restore is 60–180s (`2026-05-20-shells-golden-agents`
  Q2), which is longer than a typical RPC patience window. Two rules: (a) a hard deadline on holding
  the invoke, after which the caller gets a typed timeout error while the wake continues (or is
  explicitly abandoned — say which in the PR); (b) a **cap on invokes queued behind one wake** —
  excess callers get a stable existing busy/wake-in-progress error rather than accumulating unbounded promises
  on a gateway that also serves every channel. State both numbers and their justification in the PR.
- **A disconnected caller must not strand the wake, and a completed wake must not strand a run.** If
  the requesting WS connection drops mid-wake, the wake either completes and the shell stays online,
  or is cancelled — pick one, implement it, and write it down. What is forbidden is a promise nobody
  will ever settle.
- **Respect `maxConcurrentRuns`** from the bridge's registered `ShellCapabilities` when releasing
  held invokes; do not fire N held invokes at a harness that declared `1`.
- **Delete the stale comment and the throw.** The comment at `:271` that "admits the implementation
  was left out" goes with the code it describes. Leaving it is how the next reader concludes the
  feature is still missing.
- **Docs + ledger.** Update whatever shells doc the gateway carries (S0 lists it) with the woken
  lifecycle, the deadline, and the typed error; if there is no such doc, add the paragraph as a
  file-header comment in `src/shells/manager.ts` rather than creating a docs surface this spec did
  not scope. Per AGENTS.md, any remaining open end gets **both** a `TODO(handoff): <what, why,
  pointer>` at the site **and** a `proposals/` entry; if there are none, write "no open items" in
  the PR.

**Files:** `src/shells/manager.ts` (the `:271` site), the invoke queue/hold helper if it deserves its
own module, `src/gateway/server-methods/shells.ts` (error mapping only if the typed error must be
surfaced there), plus `*.test.ts`, plus any `proposals/*.md` handoff entry.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run src/shells
#   - invoke on an archived shell (default params) → wakeShell called once, invoke forwarded
#         AFTER restore resolves, caller gets {runId, startedAt}         ← the proposal's DoD
#   - invoke with wakeIfArchived:false on an archived shell → stable existing error code and,
#         where supported by the existing error-details convention, remediation 'wake';
#         wakeShell NEVER called; the call does not THROW past the handler
#   - THREE concurrent invokes on one archived shell → ONE wake, one provider create,
#         and held invokes released within maxConcurrentRuns
#   - queue cap exceeded → typed busy error (no unbounded promise accumulation)
#   - wake exceeds the deadline → typed timeout error to the caller, shell record still consistent
#   - wake fails → the invoke fails with a typed error, NOT an unhandled rejection
#   - invoke on an ONLINE shell → unchanged behavior, wakeShell never called   ← regression guard
pnpm vitest run test/ci/ && pnpm tsgo && pnpm check
rg -n "throw" src/shells/manager.ts | rg -i "archiv"        # → ZERO hits
rg -n "TODO\(handoff\)" src/shells/                          # → ZERO, or each has a proposals/ entry
git diff --name-only <base>...HEAD \
  | rg -v '^(src/shells/|src/gateway/server-methods/shells|proposals/.+\.md$)'   # → EMPTY
git diff --name-only <base>...HEAD | rg '\.svelte$' && echo "FAIL: UI out of scope" && exit 1
```

---

### 2R. Branch R — the retirement fallback (only if S0 (b) says there is no durable store)

Retirement here means **"marked experimental"**, never "removed": deleting `shells.update`,
`shells.wake`, or `wakeIfArchived` from `@minion-stack/shared` is a semver-major on a package hub,
site and paperclip all consume, to withdraw a promise no client currently depends on. That trade is
bad, and it is not what the proposal's "removed/marked experimental" needs to mean.

Branch R, in full (≈3 h, tags `docs`, `logic`):

1. Replace the bare `UNAVAILABLE` with the existing not-implemented error code found by S0 (j),
   carrying a message that names this spec id. Do not coin `NOT_IMPLEMENTED` unless that exact code
   already exists in sibling handlers.
2. Same for the archived-invoke path: S3's stable wake-required error-envelope response, without
   S2's wake — the throw dies either way. **This half is mandatory even under R**, because a raw throw on a
   documented default-true path is the actual defect.
3. Add `@experimental` doc comments on `SHELLS_METHODS.update`, `shells.wake` and `wakeIfArchived`
   in `packages/shared/src/gateway/shells.ts` — the **one** authorized meta-repo edit under R, and
   the reason R must be declared before implementation starts (§4).
4. File a `proposals/` entry for the store work with the S0 evidence. Artifact status changes remain
   the reconciler/human gate's responsibility, not an implementation side effect.

R is a fallback for a fact S0 might discover, not an option to prefer. If S0 finds a store, R is off
the table.

## 3. Cross-repo impact

Checked against the AGENTS.md "Cross-Project Impact Zones" table. No listed row matches cleanly:
this is not a channel extension, not a DB schema change, not an auth change, and — because the
protocol types already exist — **not** a "Gateway protocol (frame types, events)" change. That
absence is the point: the whole fix fits inside the gateway.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion/src/shells/`, `minion/src/gateway/server-methods/shells.ts` | **The fix.** All behavior changes here | S1–S3; every slice DoD asserts the changed-file set |
| `@minion-stack/shared` (`packages/shared/src/gateway/shells.ts`) | **None under S1–S3.** Every method, param, response, event and error reason needed already exists (§1). Under branch R only: additive `@experimental` doc comments | §5 forbids it; S1/S2/S3 DoD `git diff --name-only` excludes it. A new `shell.updated` event would require it ⇒ deliberately not added (S1) |
| `@minion-stack/shells-bridge` + the digest-pinned workstation image | **None — read-only, and a stop condition.** The gateway calls the bridge's existing `shells.restore`. Editing the bridge means republishing the package **and** rebuilding + repinning the OCI digest that `2026-07-13-cloud-workstations` records as the blueprint identity | S2 uses `{remotePath}` exactly as `bridge.ts:332` expects; if the bridge appears to need a change, stop and report (§4 ⚠️ A2) |
| `minion_hub` `/cloud` (Overview / GUI / Terminal / Settings) | **Behavior changes with no hub diff, and someone will notice.** Settings controls wired to `shells.update` start succeeding where they always failed; an archived workstation now wakes on use instead of erroring. Hub error-handling for the *old* failures may render oddly on success | The hub form is the proposal's stated exclusion. S0 (i) reports whether hub calls `shells.update` today; the PR states the user-visible before/after. If hub needs a change, that is the separate item, not this PR |
| `minion_site`, `paperclip-minion`, `minion_plugins`, `pixel-agents`, `Minion Docs/` | **None.** No frame type, event, or protocol field added or changed ⇒ no consumer coordination | §5; AGENTS.md's "Gateway protocol" row does not fire |
| **exe.dev account (real money, hard ceilings)** | **⚠️ ALERT — wake creates real VMs.** Slots (50), pooled 2 vCPU / 8 GB, disk, monthly Shelley allowance and 200 GB egress are all account-level and shared with the two **live org-default workstations** (`mn-1bc8d28279-ws-01`, `mn-8e60ff7eda-ws-01`) | S2 checks quota **before** create and single-flights wake so a burst cannot multiply VMs; §6 verification uses a throwaway shell and destroys it, and never touches the two live defaults |
| **Backblaze B2 (restore reads the archive)** | **⚠️ ALERT, security, pre-existing — see A4.** Restore pulls the full workstation state down from B2 (egress, and possibly a big object). Separately, operator memory `backblaze-b2-bucket-audit` records ★★★ *"BUCKET IS PUBLIC-READ, OPEN"* for the B2 bucket it audited. **Whether shell backups share that bucket is unknown from here** | S0 (h) must answer it. If shell state shares the public-read bucket, **stop and report** — that is a data-exposure finding about workstation state, far bigger than this spec, and this spec must not widen it. S1's `backupTarget` rule (bucket + own-prefix allowlist) is written to avoid adding any new exposure either way |
| Gateway prod deploy (`DEV` → `:dev`; `main` → `:prd` → swarm rollout) | **Normal path, no special coupling.** No migration, no config change, no new env var expected | `2026-07-13-minion-gateway-swarm-cutover`; if a new env var *is* needed for the backupTarget allowlist, it must be listed in the PR and added to `.env.example` — an unset var must fail closed, not disable the check |

### ⚠️ A1 — `shells.wake` may itself be a stub

The proposal names two stubs. If S0 (c) finds a third — `shells.wake` unimplemented — S2 grows from
"extract and harden" to "write the wake path", which is why S2 is estimated 6–8 h rather than 4.
This does not change the plan; it changes which sentence the PR opens with. If instead wake is fully
implemented and tested, S2 shrinks to extraction + single-flight + the ordering guarantees, and S2/S3
may ship as one PR — say so rather than splitting for the spec's sake.

### ⚠️ A2 — the bridge's restore contract is assumed sufficient

`handleRestore({remotePath})` clears nothing itself; the comment says the bridge *"expects to be
mid-startup with workDir already empty"* — true for a freshly created VM, which is exactly the wake
case. But if S0 finds the harness is already running by the time the gateway can call restore, the
extracted state may land under a live process. That is a **bridge-side ordering problem**, hence a
stop condition (§4 row 3), not something to paper over gateway-side with a sleep.

### ⚠️ A3 — the current user-visible symptom is unverified

"invoke() throws" is a server-side fact from the proposal. What the user sees in hub `/cloud` when a
workstation is archived — a raw error, a spinner, nothing — depends on hub code not read here. The
PR must describe the observed before/after rather than assume a symptom.

### ⚠️ A4 — the B2 bucket exposure question is open and must be answered before S2 ships

Restated deliberately, because it is the one finding in this spec that could matter more than the
spec: workstation backups contain whatever the harness had on disk — working directories, agent
state, plausibly credentials. Operator memory records a public-read B2 bucket in this account. S0 (h)
establishes whether these are the same bucket. **I am not asserting that they are** — the audited
bucket served a public registry and the shells target is a distinct path (`b2://minion-shells/…` in
the design spec) — but the cost of not checking is unbounded, and the check is one grep plus one
`rclone lsd`.

### ⚠️ A5 — the target repo is not in this workspace

See §1. Line numbers `shells.ts:463` and `manager.ts:271` are the proposal's, not verified here. If
S0 finds either site moved or already fixed, that is a G0 reconciliation finding
(`2026-08-17-sdlc-phase-gates-scoring-spec` §3): report it and stop. Do not go looking for a
different stub to fill the slice with.

## 4. Stop conditions (report and return the spec — do not improvise)

1. **No durable shell store** ⇒ branch R (§2R), not a persistence layer built under a stub fix.
2. **The bridge needs a change** (restore ordering, a new bridge method, a params change) ⇒ stop:
   that is a package release plus an image rebuild plus a digest repin.
3. **`@minion-stack/shared` needs a non-additive change** ⇒ stop. Additive-under-R is the only
   authorized meta-repo edit, and only after R is declared.
4. **Shell backups share the public-read B2 bucket** (⚠️ A4) ⇒ stop and report before shipping S2.
5. **Waking requires a schema/store migration of existing shell records** ⇒ stop; migration of live
   workstation records is not authorized here.
6. **The existing gateway error envelope has no stable codes/details capable of distinguishing
   wake-required, busy and timeout outcomes** ⇒ stop and request a wire-contract decision; do not
   invent ad hoc codes in one handler while `@minion-stack/shared` is out of scope.

## 5. Out of scope (explicit)

- **The hub provision/settings form UI** — the proposal's own exclusion. No `.svelte`, no hub route,
  no hub state module. Zero UI ⇒ the `ui` tag, the ui-design-governance skill, `lint:design` and
  `lint:tokens` do **not** apply (`2026-08-17-sdlc-phase-gates-scoring-spec` §4b).
- **Any change to `@minion-stack/shared`** — no new method, no new event (`shell.updated`), no new
  error reason, no field added to `ShellsUpdateParams`, no adding `restore`/`health` to
  `SHELLS_METHODS` even though the bridge dispatches them as bare string literals
  (`bridge.ts:213,217`). That constants drift is real and worth fixing — file it as a proposal; it
  costs an npm publish plus a gateway dependency bump, which is disproportionate to a stub fix.
- **Any change to `@minion-stack/shells-bridge` or the workstation OCI image.**
- **Archive policy redesign** — idle thresholds, auto-archive heuristics, "always-on" defaults.
  S1 reconciles the *existing* scheduler with the value it persists; it does not change the policy.
- **Backup retention, GC, pruning, or the B2 bucket split** (the ⚠️ A4 security item is *reported*
  here, not fixed here).
- **New lifecycle states, statuses, or error reasons.** Map onto `ShellStatus` /
  `ShellErrorReason` / `remediation` as they exist.
- **Provider portability, a second provider adapter, or region selection.**
- **Migrating or backfilling existing shell records**; the fix is forward-only.
- **Multi-replica-safe wake coordination.** Single-flight is per-process, which is correct for
  today's one-replica-per-org swarm; the store-level lease gets a `TODO(handoff):` and a proposal,
  not an implementation.
- **Running `pnpm test`** (the full gateway suite) anywhere in dev or verification — banned, see the
  memory note at the top.
- **Editing `specs/index.json` or `proposals/index.json`** — generators own them.

## 6. End-to-end verification

Steps 1–2 are offline and belong in CI. Step 3 provisions a **real** exe.dev VM and costs real
quota, so it is deliberately narrow.

> ⚠️ **Never run step 3 against `mn-1bc8d28279-ws-01` or `mn-8e60ff7eda-ws-01`** — those are the live
> MINION and FACES org-default workstations (`2026-07-13-cloud-workstations`). Provision a throwaway
> shell, use it, destroy it, and confirm the slot came back.

```bash
cd minion

# 1. Gates (logic/security/test-tagged: no design or token lint — §5)
pnpm install && pnpm build
pnpm vitest run src/shells src/gateway/server-methods/shells.test.ts   # exact paths from S0 (g)
pnpm vitest run test/ci/                                               # the CI gate dir
pnpm tsgo && pnpm check
#   ⛔ NOT `pnpm test` — crashes the box (memory: gw-no-full-test-suite)
git diff --name-only <base>...HEAD    # → src/shells/**, src/gateway/server-methods/shells*,
                                      #   proposals/*.md — nothing else

# 2. The stubs are gone
rg -n "not yet wired" src/                       # → ZERO
rg -n "throw" src/shells/manager.ts | rg -i archiv   # → ZERO

# 3. Live, on a DEV gateway, with a THROWAWAY shell (real VM, real quota)
#    a) shells.provision a test shell → wait for 'online'
#    b) write a marker inside the harness workdir, e.g.  echo wake-proof-<ts> > <workDir>/MARKER
#    c) shells.backup_now → note backupId + bytes
#    d) shells.archive → status 'archived'; confirm at the provider:
#         ssh exe.dev ls --json | rg <vmName>      → GONE (slot + disk freed)
#    e) shells.invoke (default params, no wakeIfArchived)
#         → does NOT throw; a wake starts; shell.online arrives with resumedFromArchive:true;
#           the invoke is answered by the harness.
#    f) read <workDir>/MARKER on the woken VM
#         → the marker from (b) is present.        ← THE proof: state restored, not a blank VM
#    g) archive it again, then fire TWO invokes within a second of each other
#         → ssh exe.dev ls --json shows exactly ONE new VM for this shell.   ← single-flight
#    h) archive it again, then invoke with wakeIfArchived:false
#         → a TYPED wake-required error with remediation 'wake'; NO VM created;
#           ssh exe.dev ls --json unchanged.
#    i) shells.update { shellId:"<test-shell>", patch:{ displayName:"renamed-<ts>",
#         backupCadence:"weekly", archiveIdleMs:null } }
#         → returns the fresh ShellSummary; a follow-up shells.get shows all three persisted;
#           the auto-archive timer is disarmed (the shell does NOT archive itself after the old
#           idle window) and the backup job is on the weekly cadence.
#    j) shells.update { shellId:"<test-shell>", patch:{ status:"online" } }  and
#         { shellId:"<test-shell>", patch:{ orgId:"<other-org>" } }
#         → typed INVALID_PARAMS both times; shells.get is byte-identical.     ← mass-assignment
#    k) shells.update on a shell id belonging to ANOTHER org (use a second org's shell id from
#       the store, do not mutate it)
#         → the same typed not-found as an unknown id; no write.                ← IDOR guard
#    l) shells.destroy the test shell
#         → ssh exe.dev ls --json no longer lists it; shells.quota shows the slot and disk
#           returned; backups removed (or kept, if keepBackups was passed).
```

**Ship gate:** §6 steps 1–3 green; the proposal's DoD checked clause by clause — *"update
persists"* (3i, plus the S1 store-read assertions), *"invoke wakes archived shells or returns a typed
wake-required error"* (3e/3f and 3h), *"with unit tests"* (S1–S3 DoD blocks); the S1 red-state
`UNAVAILABLE` failure pasted into the PR; S0's six answers recorded, including ⚠️ A4's bucket answer;
the mandatory human gate for the `security`-tagged S1 (§4b); and no stop condition (§4) hit. If §6
step 3f shows an empty workdir on a woken shell, **do not ship** — that is silent data loss wearing a
green status.
