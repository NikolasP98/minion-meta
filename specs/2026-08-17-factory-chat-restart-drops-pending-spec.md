---
id: 2026-08-17-factory-chat-restart-drops-pending-spec
title: "minion-factory chat queue — a distinct dispatched state so a runner restart stops eating never-started user messages"
stage: spec
status: draft
pass: 1
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-factory-chat-restart-drops-pending
verdict: pending
repos: [minion-base, minion-factory]
tags: [logic, data]
type: fix
---

# A distinct `dispatched` state for factory chat turns

**Owner surface:** the fix is in `minion-factory` (`NikolasP98/minion-factory`, private, default branch
`main`) — `runner/src/{db,queue,index,repos}.ts` plus a new `runner/src/chat-recovery.ts` and its test.
One **unavoidable** consumer change lands in `minion-base` (`NikolasP98/minion-base`, default branch
`main`) — `src/routes/request/+page.svelte` is the only UI that reads `messages[].status`, and it treats
"not `pending`" as "the agent is idle". That consumer change must land **first**; §4 explains why and
§2 sequences it as S1.

**Why `repos:` is ordered `[minion-base, minion-factory]`:** `runner/src/queue.ts:226-231`
(`postFinish`) auto-queues the S1 dev run against the **first** frontmatter repo that maps through
`REPO_ALIASES`. Both ids map, so the first one wins, and S1 is the minion-base slice. The order is a
deliberate scheduling instruction, not alphabetical noise — do not "tidy" it.

**Design ancestors:**
[`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md) — the
runner/agent split and the `docker run --rm --name factory-<kind>-<id>` sibling-container model that makes
restart recovery necessary at all.
[`2026-08-17-factory-agent-cli-unpinned-spec`](2026-08-17-factory-agent-cli-unpinned-spec.md) — same repo,
**disjoint files** (`agent/Dockerfile`, `agent/*.sh`, `scripts/`, `README.md`). The only possible collision
is `README.md`, in a different section. Either order works; neither blocks the other.
[`2026-08-17-maintenance-lane-monitors-spec`](2026-08-17-maintenance-lane-monitors-spec.md) — the
open-items ledger this spec files its one deferred hazard against (§5).

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices are tagged `logic` and `data`. The `logic` lane makes **red-state TDD mandatory**: S2 and S3
each name the test that must fail before the fix and pass after. The `data` lane demands a schema-drift
check and a **reversibility note** — §3b is that note (there is no DDL change; the migration is to the
*value domain* of `messages.status`, and rollback strands rows unless a one-liner is run). S1 touches a
`.svelte` file, so the **UI-governance rule applies to it** — see the S1 constraint that the diff stays
inside the `<script>` block and `bun run lint:design` debt does not increase.

---

## 0. Product

From the approved proposal `2026-08-17-factory-chat-restart-drops-pending`, verbatim:

> ## Problem
>
> runner/src/index.ts restart recovery errors ALL pending messages; backlogged-but-never-started user input is dropped.
>
> ## Definition of done
>
> Distinct dispatched state; restart only errors in-flight turns; backlogged messages survive and process.
>
> ## Out of scope
>
> Chat UX.

## 1. What the code actually says today

`minion-factory` and `minion-base` are **not checked out in this workspace** (the meta-repo `.gitignore`
excludes subprojects, and both are separate repos). Every line quoted below was read from `main` via
`gh api repos/<slug>/contents/<path>` during spec authoring; at that moment `pushed_at` was
`2026-08-17T13:46:22Z` for `minion-factory` and `2026-08-17T12:58:31Z` for `minion-base`.
**Re-read every file before editing** — line numbers are as-of that read, not a guarantee (Slice 0).

### 1a. The bug, in one line

`runner/src/index.ts:411`, at module scope, immediately after `adoptOrphans()`:

```ts
db.prepare("UPDATE messages SET status = 'error' WHERE status = 'pending'").run();
```

`pending` is doing two jobs at once. `runner/src/queue.ts:321-344` (`pumpChat`) is the only dispatcher:

```ts
const pending = db.prepare(
  `SELECT m.* FROM messages m WHERE m.status = 'pending' AND m.role = 'user'
   AND m.chat_id NOT IN (…chatActive…) ORDER BY m.id LIMIT ${CHAT_CONCURRENCY}`
).all(...chatActive) as Message[];
```

A row stays `pending` from the instant `POST /chat/:id/message` inserts it (`index.ts:348-352`) until the
container exits (`queue.ts:397-412`). The runner therefore cannot tell "a container is chewing on this
right now" from "this is sitting in the queue waiting for a free slot", and the boot line resolves the
ambiguity in the destructive direction: **everything becomes `error`.**

### 1b. Five facts found while reading that change the work

1. **The backlog is real, and it is cross-chat, not within-chat.** `index.ts:344-347` rejects a second
   message in the *same* chat with `409 previous turn still processing`, so a single chat never queues
   two. But `CHAT_CONCURRENCY` defaults to **2** (`queue.ts:314`), and `pumpChat` refuses to start a third
   turn. Three users (or three browser tabs) each posting once ⇒ one row genuinely queued and never
   dispatched. That is the row the proposal says is dropped, and it is dropped **silently** — the API
   returned `201` and the UI drew the message.
2. **Fixing the boot line alone is not enough: nothing would ever pump the survivors.** `index.ts:412` calls
   `enqueue()`, which is the **runs** pump (`queue.ts:34-36`). `enqueueChat()` (`queue.ts:317-319`) is
   called from exactly two places — `POST /chat/:id/message` and the end of a chat turn's `close`
   handler. Boot calls it from **neither**. So a surviving `pending` row would sit inert until some
   unrelated user happened to post a new message. The proposal's "**and process**" clause requires adding
   this call; it is not decoration.
3. **The busy-check reads `status = 'pending'` and would break the moment a new state exists.**
   `index.ts:344-346` is `SELECT 1 FROM messages WHERE chat_id = ? AND status = 'pending'`. Introduce
   `dispatched` without touching it and an in-flight chat stops looking busy: a second message is accepted,
   `pumpChat` starts it, and two `claude` containers share one persistent `$HOME` and one session uuid
   (`queue.ts:359-367`). This is the single most dangerous line in the change, and it is not in the file
   the proposal names.
4. **The runner's sibling chat containers outlive a runner restart, and this is why "just error them" is
   not safe either.** `docker-compose.yml` mounts `/var/run/docker.sock` into the runner, so
   `factory-chat-<msgId>` containers are **siblings on the host daemon**, not children of the runner
   process. `docker compose restart runner` leaves them running. Today they are orphaned into `error` and
   keep writing `/opt/factory/runs/chat-<msgId>/reply.md` that nothing ever reads; worse, because the
   container name is derived from the message id, a naive re-dispatch of the same row would collide on the
   name. Any correct boot recovery has to consult Docker, not just the DB. S2 kills them; S3 adopts them
   (parity with `adoptOrphans`, `queue.ts:263-296`, which already does exactly this for runs).
5. **`messages.status` has no `CHECK` constraint, so this is a value-domain migration with zero DDL.**
   `db.ts:46-53` declares `status TEXT NOT NULL DEFAULT 'done'`; the union `'pending' | 'done' | 'error'`
   lives only in the TypeScript type at `db.ts:89`. Adding a fourth value needs no `ALTER TABLE` and no
   entry in the `db.ts:10-17` migration loop. It does need a **rollback** story (§3b) — old code neither
   selects nor clears `dispatched`, so a downgrade strands those rows forever.

### 1c. The one consumer outside the repo

`minion-base` `src/routes/request/+page.svelte:44-48` — the request-agent chat UI:

```ts
const pending = messages.some((m) => m.status === 'pending');
busy = pending;
if (pollTimer) clearTimeout(pollTimer);
if (pending) pollTimer = setTimeout(refresh, 5000);
```

`busy` gates the composer (`:62`, `if (!text || !currentId || busy) return`) and draws the "working…"
bubble (`:121-126`). The moment a turn's row flips to `dispatched`, this predicate reads **false**:
polling stops, the composer re-enables, and the reply never appears until the user reloads. This is a
regression **introduced by** S2, which is why the compatibility fix is S1 and lands first.

Everything else in `minion-base` is untouched: `src/lib/server/factory.ts:6` already allowlists
`chat/…` paths, and its `loadActiveRuns` filter at `:28-30` reads **run** statuses
(`queued`/`running`), not message statuses — the stray `'pending'` in that filter is unrelated dead
weight and is explicitly out of scope (§4).

## 1d. Slice 0 — recon (≤ 40 min, prepend to S1; not counted as a slice)

Nothing here changes a file. Its output is a yes/no on every line number quoted in §1.

```bash
git clone https://github.com/NikolasP98/minion-factory /tmp/fx && cd /tmp/fx
grep -n "status = 'pending'" runner/src/*.ts     # → expect index.ts:411 (boot), index.ts:345 (busy), queue.ts:325 (pump)
grep -n "status = 'error'"   runner/src/*.ts     # → the three chat error writers + the run one
sed -n '308,415p' runner/src/queue.ts            # → the whole chat executor, unabridged
sed -n '255,300p' runner/src/queue.ts            # → adoptOrphans: the pattern S3 mirrors
grep -n 'CHAT_CONCURRENCY\|chatActive' runner/src/queue.ts

git clone https://github.com/NikolasP98/minion-base /tmp/mb && cd /tmp/mb
grep -rn "m.status\|status ===" src/routes/request/+page.svelte src/lib/server/factory.ts
grep -rn "messages\[\]\|\.status" src/ --include=*.svelte --include=*.ts | grep -i chat   # → confirm ONE consumer

# Production reality — is a backlog observable, and are chat containers really siblings? (fact 1, fact 4)
ssh netcup 'docker ps --format "{{.Names}}" | grep factory- ; \
  sqlite3 /opt/factory/data/factory.db \
    "SELECT status, COUNT(*) FROM messages GROUP BY status; PRAGMA table_info(messages);"'
#   ^ the PRAGMA is the data-lane schema-drift check: confirm `status TEXT NOT NULL DEFAULT 'done'`
#     with NO CHECK constraint before believing §1b fact 5. If a CHECK exists, S2 gains a migration
#     step and this spec needs a pass 2.
```

If any of the three `pending` sites has moved, fix the line numbers in the PR body rather than trusting
this document.

## 2. Approach — three slices

```
S1 (minion-base: tolerate the new state)  ──▶  S2 (minion-factory: the state machine + boot recovery)
                                                        └──▶  S3 (minion-factory: adopt, don't kill)
```

**S1 must merge and deploy before S2 deploys.** S1 is a pure no-op against today's runner (no message ever
carries `dispatched` yet), so it is safe to ship on its own; S2 without S1 breaks the only chat UI.

S2 alone satisfies all three clauses of the proposal's DoD and is a **safe resting state**. S3 is the
parity upgrade that stops a surviving container's work from being thrown away — required by this spec, but
if the reviewer prefers a smaller landing, S3 may be cut into its own proposal, in which case S2's kill
branch stays and the `TODO(handoff)` it carries must remain (§5).

**The four real decisions, made here rather than left to the implementer:**

**D1 — the new state is `dispatched`, written *before* `spawn`, never after.** The proposal names the state,
so the name is settled. The ordering is the part that matters: if the runner dies between `spawn` and a
post-hoc `UPDATE`, boot sees a `pending` row with a live `factory-chat-<id>` container, re-dispatches it,
and hits a Docker **name collision** (the name is derived from the message id) — the new turn errors while
the original keeps running unseen. Writing `dispatched` first makes the crash window fail in the harmless
direction: a `dispatched` row with no container, which boot recovery resolves. The existing `try/catch` in
`pumpChat` (`queue.ts:333-342`) already converts a throwing `startChatTurn` into `error`, so a spawn
failure after the write is covered with no new code.

**D2 — boot recovery consults Docker, not just the DB.** Per §1b fact 4 the DB is not the source of truth
about what is running. Boot lists live containers once (`docker ps --filter name=factory-chat-`), and
classifies each user message from the pair `(status, is there a container?)`. A DB-only recovery cannot
distinguish "the runner died and took the container with it" from "the runner restarted under a container
that is still working", and those need opposite handling.

**D3 — the classification is a pure function in its own module, the side effects are not.** `queue.ts`
imports Docker, the filesystem and the DB at module scope, so nothing in it is testable without a host.
`planChatRecovery(rows, liveIds)` and `parseChatContainerIds(dockerPsOutput)` go in a new
`runner/src/chat-recovery.ts` with **zero imports**, which makes the proposal's whole DoD assertable by a
unit test that needs neither Docker nor SQLite. This is what turns "backlogged messages survive" from a
claim into a check. The `runner/` package has **no test runner today** (`package.json` has only `start`
and `typecheck`), so S2 also adds one — `node:test` via the already-present `tsx` dependency, no new
package.

**D4 — an interrupted turn gets a visible assistant message, and does *not* bump `message_count`.** Today
the boot line flips a row to `error` and says nothing; the user sees their own message greyed with no
explanation. Both S2 and S3 insert an assistant row (`status: 'error'`) reading like the runs-side note at
`queue.ts:289` (`runner restarted mid-run`). It must **not** increment `chats.message_count` — that column
drives `FACTORY_CHAT_RESUME` (`queue.ts:365`), and the existing failure path at `queue.ts:404-411`
deliberately leaves it alone. Matching that path exactly is the point; diverging would change resume
behaviour, which is a different (and out-of-scope) bug — see §5.

---

### S1 — minion-base: the chat UI tolerates an in-flight state that is not `pending`

**Repo:** `minion-base` · **Tags:** `logic` · **Estimate:** 3–5 h

**Goal:** the request page treats "the agent is working" as a **set** of statuses, so that when the runner
starts emitting `dispatched` the composer stays disabled and the poller keeps polling. A no-op today, a
prerequisite tomorrow.

**Do:**

- Add `src/lib/factory-chat.ts` (new, client-safe — **not** under `src/lib/server/`, the page imports it
  into the browser bundle):
  - `export const IN_FLIGHT_MESSAGE_STATUSES = new Set(['pending', 'dispatched']);`
  - `export const isInFlight = (m: { status: string }) => IN_FLIGHT_MESSAGE_STATUSES.has(m.status);`
  - One comment naming the runner as the source of truth and pointing at
    `minion-factory runner/src/db.ts` `Message['status']`, so the next person knows where the enum lives.
- In `src/routes/request/+page.svelte`, import `isInFlight` and replace the single predicate at `:45`:
  `const pending = messages.some(isInFlight);`. Rename the local to `inFlight` for honesty; it feeds
  `busy` and the 5 s poll re-arm at `:46-48`, both unchanged in behaviour.
- Leave the optimistic local echo at `:67` as `status: 'pending'` — it is a client-side placeholder for a
  row the server has already accepted, and `pending` is still exactly what the server wrote.
- **Change nothing in the markup or the `<style>` block.** No new class, no new element, no token, no
  colour. The "queued vs working" distinction is visible chat UX and the proposal puts it out of scope
  (§4). This constraint is what keeps the UI-governance lane a formality rather than a review cycle.

**Files:** `src/lib/factory-chat.ts` (new), `src/routes/request/+page.svelte`.

**Definition of done (machine-checkable):**

```bash
cd /tmp/mb   # minion-base checkout
grep -c "'dispatched'" src/lib/factory-chat.ts                          # → 1
grep -c "m.status === 'pending'" src/routes/request/+page.svelte        # → 0  (the bare check is gone)
grep -c 'isInFlight' src/routes/request/+page.svelte                    # → 2  (import + use)
grep -rn 'dispatched' src/routes/request/+page.svelte                   # → 0  (the literal lives in ONE place)

# The diff must be script-only — governance guard for a .svelte edit:
git diff main -- src/routes/request/+page.svelte | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
  | grep -cE '^[+-]\s*(<|\.|@media|--[a-z])'                            # → 0 markup/CSS/token lines
git diff --stat main -- src/                                            # → exactly 2 files

# The repo's own gate (repos.ts selfTest for minion-base), verbatim:
bun install && bun run lint:design && bunx svelte-kit sync \
  && bunx svelte-check --tsconfig ./tsconfig.json && bun run build      # → all green
bun run lint:design | tail -1
#   → design-lint debt count must be <= the count on `main` before this PR. Paste both numbers.

# Behaviour proof without a runner (the predicate is the whole slice):
node --input-type=module -e "
  const S = new Set(['pending','dispatched']);
  const rows=[{status:'done'},{status:'dispatched'}];
  if (!rows.some(m=>S.has(m.status))) { console.error('FAIL'); process.exit(1); }
  console.log('in-flight detected');"                                    # → 'in-flight detected'
```

**Red-state (logic lane):** before the edit, run the same one-liner with the old predicate
(`m.status === 'pending'`) over `[{status:'dispatched'}]` — it returns `false`, i.e. "idle". Paste both
outputs in the PR; that two-line contrast *is* the red state for a slice with no test runner.

---

### S2 — minion-factory: a distinct `dispatched` state, and a boot recovery that reads reality

**Repo:** `minion-factory` · **Tags:** `logic`, `data` · **Estimate:** 6–8 h

**Goal:** after this slice, restarting the runner errors **only** the turns that were actually in flight;
queued-but-never-started messages keep their place and get processed without anyone touching the UI. Proven
by a test that fails on today's code.

**Do:**

- `runner/src/db.ts:89` — widen the `Message['status']` union to
  `'pending' | 'dispatched' | 'done' | 'error'`. **No DDL, no new entry in the `db.ts:10-17` migration
  loop** (§1b fact 5 — but only after Slice 0 confirms there is no `CHECK` constraint). Add a comment above
  the type spelling out the state machine in one line:
  `pending → dispatched → done|error`, `pending` = accepted and queued, `dispatched` = a container exists
  or existed for it.
- `runner/src/chat-recovery.ts` (new, **zero imports**, pure):
  - `export type ChatMsgRow = { id: number; chat_id: string; status: string; role: string };`
  - `export type ChatRecoveryPlan = { live: number[]; dead: number[]; queued: number[] };`
  - `export function parseChatContainerIds(dockerPs: string): Set<number>` — one container name per line,
    accepts `factory-chat-<digits>` and ignores everything else (blank lines, `factory-run-*`, partial
    reads). Must not throw on garbage input.
  - `export function planChatRecovery(rows: ChatMsgRow[], liveIds: Set<number>): ChatRecoveryPlan` —
    considers only `role === 'user'` rows whose status is `pending` or `dispatched`, and buckets them:
    **`live`** = a container exists for this id (either status — the `pending` case is the one-time
    migration path, and the pre-existing crash window from D1);
    **`dead`** = `dispatched`, no container ⇒ genuinely interrupted, must error;
    **`queued`** = `pending`, no container ⇒ **untouched**, this is the bug being fixed.
    Deterministic ordering (ascending id) so the tests can assert arrays, not sets.
- `runner/src/queue.ts`:
  - In `startChatTurn`, immediately after `chatActive.add(msg.chat_id)` and **before** `spawn` (D1):
    `db.prepare("UPDATE messages SET status = 'dispatched' WHERE id = ?").run(msg.id);`
  - Export `recoverChats()`: read `docker ps --filter name=factory-chat- --format '{{.Names}}'`
    **synchronously** (`execFileSync`, so recovery completes before `enqueueChat()` runs — an async probe
    would race the pump into re-dispatching a row that has a live container). **If the probe itself
    fails**, do not guess: log loudly, error only the rows that are `dispatched` (they are interrupted
    either way), and leave every `pending` row untouched rather than re-dispatching into a possible name
    collision. The log line must say which path was taken — `docker probe ok` or `docker probe FAILED,
    conservative recovery` — because the two produce different row counts and an operator reading the
    logs must not have to infer which happened.
  - `live` handling in S2: `docker kill factory-chat-<id>` for each, then error the row (S3 replaces this
    branch — see the required `TODO(handoff)` in §5). Killing is not optional: leaving the container
    running lets it push meta commits attributed to a turn the DB says failed, and lets a later
    re-dispatch collide on the container name (§1b fact 4).
  - `dead` + killed-`live` rows: `UPDATE messages SET status = 'error' WHERE id = ?` **and** insert the
    assistant note (D4), reusing the exact INSERT shape at `queue.ts:405-411`. Do **not** touch
    `chats.message_count`.
  - `queued`: no write at all. Log the count — `[runner] chat recovery: N interrupted, M still queued` is
    the operator-visible proof the fix works.
- `runner/src/index.ts`:
  - Line 411: delete the blanket `UPDATE`. Replace with `recoverChats();` followed by `enqueueChat();`
    (§1b fact 2 — without the second call the survivors never run). Keep `adoptOrphans()` and `enqueue()`
    exactly as they are; runs recovery is not in scope.
  - Lines 344-346: the busy check becomes
    `SELECT 1 FROM messages WHERE chat_id = ? AND status IN ('pending','dispatched')` (§1b fact 3). The
    `409 previous turn still processing` semantics are unchanged — that is the point.
- `runner/src/repos.ts:57` — extend the `minion-factory` `selfTest` so the fleet gate runs the new tests:
  `cd runner && npx tsc --noEmit -p tsconfig.json && npm test && cd .. && bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh`.
  ⚠️ A mounted `/data/repos.json` replaces the built-ins **entirely** (`repos.ts:62-66`); if production has
  one, it needs the same edit or the gate silently keeps running the old command. Check during deploy.
- `runner/package.json` — add `"test": "tsx --test src/*.test.ts"`. No new dependency: `tsx` is already a
  runtime dependency (`package.json` `dependencies`), and `node:test` is built in on the image's Node 22.
  ⚠️ **Verify this exact invocation locally before committing it** — `tsx --test` argument handling and
  Node's own `--test` glob support have both moved across versions. If it misbehaves, the fallback is
  `node --import tsx --test src/chat-recovery.test.ts` with files listed explicitly; either is acceptable,
  the DoD only requires that `npm test` runs the suite and exits non-zero on failure.
- `runner/src/chat-recovery.test.ts` (new) — the red-state artefact:
  - `parseChatContainerIds`: mixed `docker ps` output (chat + run + blank + trailing newline) → only the
    chat ids; empty string → empty set; garbage → empty set, no throw.
  - `planChatRecovery`: the **proposal's DoD, expressed as a test** — given one `dispatched` row with no
    container, one `dispatched` row with a container, one `pending` row with no container, and one
    `assistant` row, assert `dead === [that one id]`, `live === [that one id]`, `queued === [that one id]`,
    and that the assistant row appears in none of them.
  - One integration test over the **real schema**: set `process.env.FACTORY_DATA` to `mkdtempSync()`, then
    `const { db } = await import('./db.js')` — a **dynamic** import, because a static one hoists above the
    env assignment and would open `/data`. Insert three chats each with a `pending` user message, run the
    recovery writes with an empty live set, then assert exactly one row moved to `error`… i.e. assert the
    real invariant: **rows the plan called `queued` still read `pending` afterwards**. This is the test
    that fails on today's code (today all three become `error`).

**Files:** `runner/src/chat-recovery.ts` (new), `runner/src/chat-recovery.test.ts` (new),
`runner/src/queue.ts`, `runner/src/index.ts`, `runner/src/db.ts`, `runner/src/repos.ts`,
`runner/package.json`.

**Definition of done (machine-checkable):**

```bash
cd /tmp/fx/runner && npm install

# --- Red state FIRST (logic lane, G3). On the pre-fix tree: ---
git stash && npm test ; echo "exit=$?"     # → non-zero: the queued-survives test fails. Paste it.
git stash pop

# --- Tier A: no Docker, no credential ---
npm test                                                        # → all pass, exit 0
npx tsc --noEmit -p tsconfig.json                               # → clean
grep -c "status = 'pending'" src/index.ts                       # → 0  (boot blanket UPDATE is gone)
grep -c "IN ('pending','dispatched')" src/index.ts              # → 1  (busy check widened)
grep -c 'recoverChats\|enqueueChat' src/index.ts                # → 2  (both boot calls present)
grep -c "'dispatched'" src/db.ts src/queue.ts                   # → >=1 each
grep -c '^import' src/chat-recovery.ts                          # → 0  (purity: the testability guarantee)
grep -c 'message_count' src/chat-recovery.ts src/queue.ts       # → 0 in chat-recovery.ts; unchanged count in queue.ts (D4)
grep -n 'TODO(handoff)' src/queue.ts                            # → 1, on the S2 kill branch (§5)
node -e "require('fs').readFileSync('package.json','utf8').includes('\"test\"')||process.exit(1)"   # → package.json has a test script

# The busy-check regression that would otherwise be invisible (fact 3):
grep -n "chat_id = ? AND status" src/index.ts                   # → the IN(...) form, not the = 'pending' form

# --- Tier B: needs a Docker host ---
docker compose build runner && docker compose up -d runner
sqlite3 /opt/factory/data/factory.db "SELECT status,COUNT(*) FROM messages GROUP BY status;"
#   → after a restart with a backlog: 'pending' rows STILL PRESENT (this is the whole proposal),
#     'error' count increased by exactly the number of turns that had a live/absent container.
docker compose restart runner && docker compose logs --tail=20 runner | grep 'chat recovery'
#   → "[runner] chat recovery: N interrupted, M still queued" — M>0 on a seeded backlog.
```

---

### S3 — minion-factory: adopt a surviving chat container instead of killing it

**Repo:** `minion-factory` · **Tags:** `logic` · **Estimate:** 5–7 h

**Goal:** a runner restart under a working chat container costs nothing at all — the turn is re-attached,
its reply is delivered, and the concurrency slot is accounted for. Exactly what `adoptOrphans`
(`queue.ts:263-296`) already does for runs; the chat executor never got it.

**Do:**

- Extract the body of the chat `close` handler (`queue.ts:387-414`) into
  `function finishChatTurn(msg: Message, code: number | null, outDir: string)` — read `reply.md`, write
  `done` + assistant reply + `message_count++`, or `error` + assistant failure note. `startChatTurn`'s
  `close` handler becomes a two-line call. **Pure refactor: no behaviour change**, and it is what makes
  adoption honest rather than a second copy of the completion rules.
- Replace S2's `live` → kill+error branch with adoption, mirroring `adoptOrphans` beat for beat:
  - `chatActive.add(msg.chat_id)` **before** spawning the waiter, so the slot is occupied and a
    concurrently-arriving message cannot double-dispatch the chat.
  - `spawn('docker', ['wait', 'factory-chat-<id>'])`, collect stdout.
  - A timeout derived from the message's `created_at` and `CHAT_TIMEOUT_MS`, floored at 60 s — the same
    `Math.max(60_000, started + TIMEOUT - Date.now())` shape as `queue.ts:272-275`.
  - On close: exit 0 with non-empty stdout ⇒ `finishChatTurn(msg, Number(stdout), outDir)`; container
    already gone (`--rm`) but `${RUNS_DIR}/chat-<id>/reply.md` exists non-empty ⇒
    `finishChatTurn(msg, 0, outDir)` (it completed during downtime — the exact analogue of
    `queue.ts:283-286`); otherwise ⇒ error the row with the interrupted note.
  - Always `chatActive.delete(msg.chat_id)` then `pumpChat()` in the close handler, or a restart with a
    backlog deadlocks at zero free slots.
  - Delete the `TODO(handoff)` comment S2 planted, and the ledger proposal it points at can be closed.
- Do **not** change `planChatRecovery` — S2 designed its `live`/`dead`/`queued` buckets to serve both
  slices. The only S3 change on the classification side is the *consumer*: `live` rows stay `dispatched`
  instead of being errored, and their tests assert exactly that.
- Extend `chat-recovery.test.ts` with the adoption-decision table as a pure function
  (`decideAdoptedOutcome({ waitExitCode, waitStdout, replyExists })` → `'finish' | 'finish-from-reply' |
  'error'`) so the three-way branch above is unit-tested without Docker. Wire the real close handler
  through it.

**Files:** `runner/src/queue.ts`, `runner/src/chat-recovery.ts`, `runner/src/chat-recovery.test.ts`.

**Definition of done (machine-checkable):**

```bash
cd /tmp/fx/runner

# --- Red state FIRST: the decision table on the pre-S3 tree ---
git stash && npm test ; echo "exit=$?"      # → non-zero: decideAdoptedOutcome tests fail (fn absent)
git stash pop

# --- Tier A: no Docker ---
npm test && npx tsc --noEmit -p tsconfig.json           # → green
grep -c 'docker.*kill.*factory-chat' src/queue.ts       # → 0  (the kill branch is gone)
grep -c "'wait'" src/queue.ts                           # → 1  (docker wait, adopted turns)
grep -c 'finishChatTurn' src/queue.ts                   # → 3  (definition + close handler + adoption)
grep -c 'TODO(handoff)' src/queue.ts                    # → 0  (S2's ledger entry is discharged)
grep -c 'chatActive.delete' src/queue.ts                # → 3  (pumpChat catch, close handler, adoption)
git diff main -- src/queue.ts | grep -cE '^\+.*message_count'   # → 0 new message_count writers (D4)

# --- Tier B: Docker host. The scenario the slice exists for ---
#  1. start a turn, 2. restart the runner while the container lives, 3. the reply still lands.
CID=$(curl -sf -XPOST $FACTORY_URL/chat -H "Authorization: Bearer $FACTORY_SECRET" | jq -r .id)
curl -sf -XPOST $FACTORY_URL/chat/$CID/message -H "Authorization: Bearer $FACTORY_SECRET" \
  -H 'content-type: application/json' -d '{"text":"count slowly to ten, then say DONE"}'
docker ps --filter name=factory-chat- --format '{{.Names}}'          # → one container
docker compose restart runner
docker compose logs --tail=30 runner | grep -i 'adopt'               # → "adopting orphaned chat turn <id>"
docker ps --filter name=factory-chat- --format '{{.Names}}'          # → STILL one container (not killed)
sleep 90 && curl -sf $FACTORY_URL/chat/$CID -H "Authorization: Bearer $FACTORY_SECRET" | jq '.messages[-1]'
#   → role "assistant", status "done", real content. On S2 this same sequence yields status "error".
```

---

## 3. Files touched (consolidated)

| File | Repo | Slice | Nature |
|---|---|---|---|
| `src/lib/factory-chat.ts` | minion-base | S1 | new — the in-flight status set, single source of truth |
| `src/routes/request/+page.svelte` | minion-base | S1 | one predicate, `<script>` only |
| `runner/src/chat-recovery.ts` | minion-factory | S2, S3 | new — pure classification + adoption decision table |
| `runner/src/chat-recovery.test.ts` | minion-factory | S2, S3 | new — the red-state artefact |
| `runner/src/queue.ts` | minion-factory | S2, S3 | dispatch write, `recoverChats`, `finishChatTurn`, adoption |
| `runner/src/index.ts` | minion-factory | S2 | boot line replaced; busy check widened |
| `runner/src/db.ts` | minion-factory | S2 | `Message['status']` union + state-machine comment |
| `runner/src/repos.ts` | minion-factory | S2 | `minion-factory` selfTest runs `npm test` |
| `runner/package.json` | minion-factory | S2 | `test` script (no new dependency) |

Not touched, deliberately: `agent/chat.sh` (the container contract is unchanged — same env, same
`/out/reply.md`), `docker-compose.yml`, `Caddyfile`, `cli/factory` (it has no chat subcommand),
`minion-base/src/lib/server/factory.ts`, and every `.md` outside a one-line note. If the implementer finds
themselves editing `agent/chat.sh`, the design has drifted — stop and re-read §2 D1.

### 3b. Data-lane note: migration and reversibility

**Migration:** none. `messages.status` is `TEXT NOT NULL DEFAULT 'done'` with no `CHECK`
(`db.ts:46-53`), so the fourth value needs no `ALTER TABLE` and no addition to the `db.ts:10-17` loop.
Slice 0 verifies this against production with `PRAGMA table_info(messages)` before S2 relies on it.

**Forward, on first boot of S2:** rows sitting at `pending` from the *previous* binary are **not** errored
any more. Those with a live container are killed+errored (S2) or adopted (S3); the rest are re-dispatched.
Re-dispatching a message whose old container already ran `claude` once is the same at-least-once behaviour
the runner has always had on a crashed turn — it is not new risk, but say so in the deploy notes.

**Rollback:** the previous runner neither writes, selects, nor clears `dispatched`. Downgrading strands any
`dispatched` row forever — invisible to `pumpChat`, invisible to the old boot line, and rendered as a
plain un-failed message by a downgraded `minion-base`. **The rollback procedure is therefore two steps,
in this order:**

```bash
docker compose stop runner
sqlite3 /opt/factory/data/factory.db "UPDATE messages SET status='error' WHERE status='dispatched';"
# ...then deploy the previous image.
```

`minion-base` (S1) needs **no** rollback: `isInFlight` accepting a status the runner never sends is inert.

## 4. Cross-repo impact

| Impact | Repos | Severity | Mitigation |
|---|---|---|---|
| The `/request` chat UI reads `status === 'pending'` as "agent is working" | minion-base ← minion-factory | **Unavoidable, breaking** | **This is S1, and it ships first.** S1 is a no-op against today's runner, so there is no window in which either repo is broken. If S2 somehow deploys first, the symptom is: composer re-enables mid-turn, polling stops, reply appears only on reload — recoverable by deploying S1, no data loss. |
| `minion-base` `src/lib/server/factory.ts` proxy allowlist | minion-base | None | `ALLOWED` at `:6` already matches `chat(\/|$)`; no new endpoint is added by this spec. Verified, no change needed. |
| `loadActiveRuns` filters `r.status === 'pending'` (a *run* status that does not exist) | minion-base | None | Pre-existing dead condition on a different table; touching it is scope creep. Explicitly out of scope (§4b). |
| A mounted `/data/repos.json` overrides the built-in `selfTest` entirely | minion-factory (prod box) | Medium, silent | `repos.ts:62-66` replaces built-ins wholesale. S2's DoD says to check for the file on the box during deploy; if it exists, apply the same `npm test` edit there or the fleet gate keeps running the old command while looking green. |
| The `@minion-stack/*` packages, gateway WS protocol, hub/site DB schema | minion, minion_hub, minion_site, paperclip | **None** | Per AGENTS.md §Cross-Project Impact Zones, none of the listed zones is entered: no gateway frame type, no channel extension, no shared DB schema, no agent-definition format, no auth path. `minion-factory`'s SQLite DB is private to the box. |
| UI governance (`ui-design-governance` skill, design-token contract) | minion-base | Formality only | S1 touches a `.svelte` file, so the lane applies. The diff is confined to the `<script>` block — no markup, no CSS, no token — and the DoD asserts that mechanically plus `bun run lint:design` debt not increasing. |
| The board at base.minion-ai.org rendering factory runs | minion-base | None | Runs are a different table with different statuses; nothing in this spec writes to `runs`. |

### 4b. Out of scope (explicit)

- **Chat UX** — the proposal's own exclusion. No new UI state, no "queued" badge, no reordering, no
  streaming. S1 is a predicate change and nothing else.
- **Allowing more than one queued message per chat.** The `409 previous turn still processing` rule at
  `index.ts:344-347` stays; S2 only widens *which statuses count as busy*.
- **Run (non-chat) recovery.** `adoptOrphans` and the `runs` table are untouched. S3 mirrors its shape;
  it does not modify it.
- **Session-resume repair for a turn that died after `claude` started.** See §5 — real, adjacent, and
  deliberately left alone.
- **`runner/Dockerfile`'s `npm install --omit=dev` beside a committed lockfile**, and the fact that the
  new `*.test.ts` files get copied into the runtime image by `COPY runner/src ./src`. Both are harmless
  and belong to the sibling spec's territory, not here.
- **The stray `'pending'` run-status filter in `minion-base/src/lib/server/factory.ts:29`.**
- **Any timeout, concurrency or retry tuning.** `CHAT_CONCURRENCY`, `CHAT_TIMEOUT_MS` and
  `FACTORY_CHAT_MAX_TURNS` keep their current defaults.

## 5. Open-items ledger (AGENTS.md requirement)

Two items, both to be written down **as part of the slice that creates them**, not afterwards:

1. **S2's kill branch is a placeholder for S3.** S2 must carry, at the exact line that kills a surviving
   container:
   `// TODO(handoff): S3 of 2026-08-17-factory-chat-restart-drops-pending-spec replaces this kill with
   docker-wait adoption (parity with adoptOrphans, queue.ts:263) — until then a live container's completed
   work is discarded.`
   If S3 lands in the same PR chain, the comment is deleted by S3 and no proposal is needed. **If the
   reviewer cuts S3, a `minion-meta` proposal must exist before S2 merges**, at
   `proposals/2026-08-17-factory-chat-adopt-surviving-turns.md`, carrying S3's body verbatim.
2. **The resume hazard this spec does not fix.** A turn that dies *after* `claude --session-id <uuid>`
   has created the session leaves `chats.message_count` at its old value (D4, and today's
   `queue.ts:404-411` does the same). The next turn therefore passes `FACTORY_CHAT_RESUME=0` and runs
   `--session-id` against a uuid that already exists on the persistent `$HOME`
   (`/opt/factory/chat-home`). This is **pre-existing** — this spec neither causes it nor repairs it —
   but S2 makes interrupted turns more common by processing backlogs that used to be discarded, so it
   will be *seen* more. Required: `proposals/2026-08-17-factory-chat-session-resume-after-failed-turn.md`
   in `minion-meta`, filed before S2 merges, describing the reproduction (kill a chat container mid-turn,
   then post again to the same chat) and the two candidate fixes (bump `message_count` on any turn that
   reached the harness, or make `chat.sh` fall back from `--session-id` to `--resume` on an
   already-exists error). Do **not** fix it inside this spec.

## 6. End-to-end verification

Run with S1 deployed to `minion-base`, and S2 + S3 merged to `main` in `minion-factory` and deployed to the
box. `$FACTORY_URL` and `$FACTORY_SECRET` from `~/.config/minion/factory-secret`.

```bash
# --- 0. Force a real backlog: CHAT_CONCURRENCY defaults to 2, so three chats guarantees one queued ---
for i in 1 2 3; do
  ID=$(curl -sf -XPOST $FACTORY_URL/chat -H "Authorization: Bearer $FACTORY_SECRET" | jq -r .id)
  echo "$ID" >> /tmp/chatids
  curl -sf -XPOST $FACTORY_URL/chat/$ID/message -H "Authorization: Bearer $FACTORY_SECRET" \
    -H 'content-type: application/json' \
    -d '{"text":"Read AGENTS.md in the meta repo and summarise the project map in 3 bullets."}'
done
sqlite3 /opt/factory/data/factory.db \
  "SELECT status, COUNT(*) FROM messages WHERE role='user' GROUP BY status;"
#   → EXPECT: dispatched=2, pending=1.  ← the states the proposal asked for, observable in production.
#     If pending=0 here, CHAT_CONCURRENCY is >2 on this box; add chats until one queues.

# --- 1. The proposal's DoD, clause by clause ---
docker compose restart runner                                   # the event that used to eat everything
docker compose logs --tail=40 runner | grep 'chat recovery'      # → "N interrupted, 1 still queued"
sqlite3 /opt/factory/data/factory.db \
  "SELECT id,status FROM messages WHERE role='user' ORDER BY id DESC LIMIT 3;"
#   → clause 2 "restart only errors in-flight turns": the two dispatched rows are adopted (S3) or error
#     (S2) — never the queued one.
#   → clause 3 "backlogged messages survive": the third row is STILL 'pending'.
sleep 240
curl -sf $FACTORY_URL/chat/$(tail -1 /tmp/chatids) -H "Authorization: Bearer $FACTORY_SECRET" \
  | jq -r '.messages[] | "\(.role)\t\(.status)\t\(.content[0:60])"'
#   → clause 3 "...and process": the queued turn ran on its own after the restart and there is a real
#     assistant reply. THIS IS THE LINE THE WHOLE SPEC EXISTS FOR — paste it in the PR.

# --- 2. The regression S1 exists to prevent, checked in the real browser ---
#   Open https://base.minion-ai.org/request, send a message, and WHILE it runs:
#     - the composer stays disabled and the "working…" bubble stays up   (busy is true on 'dispatched')
#     - the network tab shows /api/factory/chat/<id> re-polling every 5s (the poller did not stop)
#   Then let it finish: the reply renders without a manual reload.

# --- 3. The dangerous line nobody would notice broke (fact 3) ---
ID=$(curl -sf -XPOST $FACTORY_URL/chat -H "Authorization: Bearer $FACTORY_SECRET" | jq -r .id)
curl -sf -XPOST $FACTORY_URL/chat/$ID/message -H "Authorization: Bearer $FACTORY_SECRET" \
  -H 'content-type: application/json' -d '{"text":"say ok"}'
curl -s -o /dev/null -w '%{http_code}\n' -XPOST $FACTORY_URL/chat/$ID/message \
  -H "Authorization: Bearer $FACTORY_SECRET" -H 'content-type: application/json' -d '{"text":"and again"}'
#   → 409 while the first turn is 'dispatched'. A 201 here means the busy check was not widened and two
#     containers are about to share one claude session uuid.

# --- 4. Nothing else regressed ---
curl -sf $FACTORY_URL/health | jq .                              # → {"ok":true,...}
factory ls | head -5                                             # → runs unaffected (adoptOrphans untouched)
curl -sf -XPOST $FACTORY_URL/pipeline/reconcile -H "Authorization: Bearer $FACTORY_SECRET" | jq .
#   → 201: the runs pump still works after the boot-sequence edit at index.ts:409-412.
```

**Ship gate:** §6 steps 0–4 green with outputs pasted; the red-state runs from S1, S2 and S3 pasted
(a test that has never been seen to fail is not known to work); the `sqlite3` line from step 0 showing
`dispatched` and `pending` coexisting in production; the step-1 line showing the backlogged turn producing
a real reply; `bun run lint:design` debt numbers before/after for S1; **the box checked for
`/data/repos.json`** and the answer stated either way (§4); and both §5 ledger items discharged — the
`TODO(handoff)` deleted by S3, or the two named `minion-meta` proposals existing before S2 merges.
