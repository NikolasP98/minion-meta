# WhatsApp history-sync visibility — spec + plan

**Date:** 2026-07-20
**Status:** Spec, ready to implement (not started)
**Trigger:** *"when I've been linking my WhatsApp accounts to the minion hub, I haven't really been getting too much visual feedback as to what the syncing progress is. And when I check my phone to see what the syncing is up to, it shows paused after a while."*

---

## 1. Finding: this is not a UI gap

The gateway **receives** WhatsApp's sync progress and **discards it**.

`minion/src/web/inbound/monitor.ts:687-698` handles `messaging-history.set` but destructures only
`{chats, contacts, messages}`. Baileys' `progress`, `syncType` and `isLatest` are never read anywhere
in the repo. And `messaging-history.status` — the event that carries the *paused* signal — is never
subscribed to at all.

So there is nothing for a UI to render. **Gateway work comes first; UI second.**

### 1.1 What "paused" actually means (verified in installed code)

Baileys `7.0.0-rc11`, `lib/Socket/chats.js:955-970`:

```js
// Reset 120s paused timeout on any RECENT chunk (like WA Web's handleChunkProgress)
if (syncType === RECENT && !historySyncStatus.recentSyncComplete) {
    clearTimeout(historySyncPausedTimeout);
    historySyncPausedTimeout = setTimeout(() => {
        ev.emit('messaging-history.status', { syncType: RECENT, status: 'paused', explicit: false });
    }, HISTORY_SYNC_PAUSED_TIMEOUT_MS);   // 120_000
}
```

**"Paused" = 120 seconds elapsed with no new history chunk.** It is a *stall*, not an error and not
completion. The comment states it mirrors WhatsApp Web's own `handleChunkProgress`, so the official
client displays the same state from the same heuristic.

The event contract (`lib/Types/Events.d.ts:31-41`):

```ts
'messaging-history.status': {
  syncType: proto.HistorySync.HistorySyncType
  status: 'complete' | 'paused'
  /** progress === 100 came from the server; when false, completion was inferred from silence. */
  explicit: boolean
}
```

### 1.2 Does it need supervision?

Not a human — but the phone and the socket both matter, for different reasons:

- **Ongoing delivery does NOT need the phone.** Multi-Device was built for this: *"even if your phone
  battery is dead"* ([Meta Engineering](https://engineering.fb.com/2021/07/14/security/whatsapp-multi-device/)).
- **The initial history bundle DOES come from the phone.** Same source: *"the primary device encrypts a
  bundle of the messages from recent chats and transfers them to the newly linked device."* A sleeping,
  backgrounded or offline phone stops the chunks → 120s silence → `paused`. This is why the old
  keep-both-open advice existed, and it still applies to history transfer specifically.
- **Sync state is per-connection and not resumable.** `SyncState` lives in socket-local memory;
  `monitor.ts:83` already documents *"On a reconnect WhatsApp does NOT replay messaging-history.set."*
  A dropped socket mid-sync loses in-flight chunks.
- **The durable recovery path is `fetchMessageHistory`** (on-demand pull, anchored on the oldest known
  message). Minion already implements this at `monitor.ts:651-684` — it just never reports on it.

### 1.3 Two config facts that may explain a short sync

- `src/web/session.ts:112-120` sets `syncFullHistory` **only** when
  `gateway.messageLedger.importContacts === true`.
- The history handler is only *registered* when `importContactsEnabled || backfillMessagesEnabled`
  (`monitor.ts:701`); both additionally require `messageLedger.enabled`.
- Baileys' default `shouldSyncHistoryMessage` is `({syncType}) => syncType !== FULL` — it **drops FULL
  chunks** unless overridden. Minion does not override it.

⚠️ **Unverified against the live gateway config.** Check these three before concluding anything about
a specific account.

### 1.4 One inference worth testing

`session.ts:136` sets `markOnlineOnConnect: opts.markOnline ?? false` (deliberate — see the p5
incident). Whether presenting as offline affects the phone's willingness to keep pushing RECENT chunks
is **not proven**. Testable by flipping `markOnline` on one account.

---

## 2. Gateway work (prerequisite)

### 2.1 Subscribe to the event we currently ignore

```ts
sock.ev.on('messaging-history.status', ({ syncType, status, explicit }) => { … })
```

### 2.2 Read the fields already arriving

Widen `handleHistorySet`'s parameter type (`monitor.ts:687-691`) to include `progress`, `syncType`,
`isLatest`, and accumulate counts.

⚠️ Do **not** build the "done" condition on `isLatest` — it is reported as never flipping true in some
7.x configurations ([Baileys #2005](https://github.com/WhiskeySockets/Baileys/issues/2005)). Use
`messaging-history.status` and `progress === 100`.

⚠️ `INITIAL_BOOTSTRAP` emits `status:'complete', explicit:true` on its *first* chunk
(`chats.js:932-940`). That means bootstrap started landing, **not** that history finished.

### 2.3 Carry it on the existing snapshot — no new transport

Add to `WebChannelStatus` (`src/web/auto-reply/types.ts:10-24`) and `ChannelAccountSnapshot`
(`src/channels/plugins/types.core.ts:95-157`):

```ts
historySync?: {
  phase: 'idle' | 'bootstrap' | 'recent' | 'full' | 'on-demand' | 'complete' | 'stalled';
  progress: number | null;      // 0-100, null = unknown → indeterminate UI
  explicit: boolean;            // false = completion/stall inferred from silence
  messages: number;             // cumulative recorded this session
  chats: number;
  backfill?: { requests: number; cap: number; complete: boolean };
  startedAt: number | null;
  updatedAt: number;
}
```

Populate from §2.1/§2.2 plus the backfill counters that are currently function-local `let`s
(`monitor.ts:618-685`), then call the existing `emitStatus()`. The debounced `channels.status`
broadcast (`server.impl.ts:841-847`) and the hub's existing listener
(`minion_hub/src/lib/services/gateway.svelte.ts:905-910`) carry it end to end.

**Zero new events, zero new RPCs, zero new DB columns.**

### 2.4 Persistence (deliberately deferred)

All state is in-memory; a gateway restart loses it. A durable "first sync completed" marker would need
a hub-DB column. Out of scope for slice 1 — call it out in the UI as *session* progress rather than
pretend otherwise.

---

## 3. UI design

### 3.1 Principle

The wizard currently ends at `paired` and unmounts — post-pair feedback is a green dot and one line
(`WhatsAppQrPairing.svelte:150-154`). **Pairing is the start of the work, not the end.** The wizard
gains a terminal *Sync* step, and the same state is readable later from the channel card.

### 3.2 Wizard — new final step

```
┌──────────────────────────────────────────────┐
│  1 Connect  ›  2 Name it  ›  3 Syncing       │
├──────────────────────────────────────────────┤
│  ✓ Linked +51922286663                       │
│                                              │
│  Downloading recent chats…                   │
│  ████████████░░░░░░░░░░░░  48%               │
│  1,204 messages · 37 chats                   │
│                                              │
│  Keep WhatsApp open on your phone —          │
│  history is sent from your phone.            │
│                                              │
│              [ Done — keep syncing ]         │
└──────────────────────────────────────────────┘
```

Stalled state (the one that answers the original complaint):

```
│  ⏸ Paused — no data for 2 minutes            │
│  ███████░░░░░░░░░░░░░░░░░  31%               │
│  Open WhatsApp on your phone to resume.      │
│                          [ Retry backfill ]  │
```

- `progress: null` → indeterminate sweep, never a misleading static fill.
- "Done — keep syncing" is honest: closing the dialog does not stop the sync.
- `explicit: false` completion renders as *"Finished (no more data received)"*, not a bare ✓.

### 3.3 Persistent surface

`ChannelCard` (`/settings?s=comms`) and the `/account/connections` row show a compact line under the
status pill while `phase !== 'idle' && phase !== 'complete'`. `deriveChannelDisplayState`
(`src/lib/utils/channel-display-state.ts:29-47`) gains `syncing` and `sync-stalled` states so the
existing `ChannelStatusPill` renders them — **no parallel pill component**.

### 3.4 Reuse (governance)

| Need | Use |
|---|---|
| Status pill | existing `ChannelStatusPill` + `deriveChannelDisplayState` (add 2 states) |
| Badge tones | `Badge variant="semantic"`; status triple `bg-{s}/15 text-{s} border-{s}/30` |
| Spinner | `Spinner` — **never** hand-rolled `animate-spin` (`raw-loading` lint rule) |
| Icon sizes | `iconSizes` from `$lib/components/ui` — never `size={14}` |
| Progress ramp | accent fill → `success` at 100%, per `GatewayUpdateCard` |
| Event plumbing | `channels.status` case already exists in `gateway.svelte.ts:903-911` |

**One new primitive is justified:** `ProgressBar` in `src/lib/components/ui/`, wrapping
`@zag-js/progress`, props `{value: number|null, max, label, detail, size}`. Three surfaces already
hand-roll this (`finances/settings/+page.svelte:352-376`, `GatewayUpdateCard.svelte:459-484`,
`FinanceSyncBadge.svelte`); a fourth copy is exactly the ratcheted debt Rule 3 forbids. Extracting it
**lowers** design-lint totals on the files it replaces.

⚠️ Carry over the finance clamp: the backend can report `processed > total` and zag then **throws
uncaught and breaks navigation** (`finance-sync.svelte.ts:24-28`).

### 3.5 Copy (paraglide)

New keys `channelSync_*` in `messages/en.json` + `es.json`, then `bun run i18n:compile`.
Store label maps as `() => string` refs, never module-scope `m.x()` calls (SSR bakes `'en'`).

---

## 4. Plan — subagent-driven

Migrations: subagents **write** migration files, never apply. No `git checkout/restore/stash/reset`,
no `git add -A`. Report BLOCKED rather than routing around a denial.

| # | Task | Repo | Depends on |
|---|---|---|---|
| 1 | Verify live gateway config: `messageLedger.{enabled,importContacts,backfillMessages}` for the account; report actual values | gateway | — |
| 2 | Subscribe `messaging-history.status`; widen `handleHistorySet`; add `historySync` to `WebChannelStatus` + `ChannelAccountSnapshot`; emit via existing `emitStatus()`. Unit-test the phase reducer (bootstrap-complete ≠ done; `explicit:false`; `progress:null`) | gateway | 1 |
| 3 | Surface backfill counters (`requests/cap/complete`) from the function-local `let`s into the same struct | gateway | 2 |
| 4 | Extract `ProgressBar` primitive; migrate the 3 existing hand-rolled bars; prove lint debt decreased | hub | — |
| 5 | Add `syncing` + `sync-stalled` to `deriveChannelDisplayState` + `ChannelStatusPill`; unit-test the derivation | hub | — |
| 6 | Wizard terminal Sync step + `channels.status`-driven state module (mirror `finance-sync.svelte.ts`, incl. the clamp) | hub | 2,4,5 |
| 7 | Compact sync line on `ChannelCard` + `/account/connections` | hub | 5,6 |
| 8 | i18n keys EN+ES, `i18n:compile`; gates: `lint:design && lint:tokens && check && test` | hub | 6,7 |

**Verify at the end:** link an account, watch phase advance; background the phone → within ~120s the UI
must show *stalled*; foreground it → recovers. That last one is the acceptance test for the original
complaint.

---

## 5. Out of scope

Persisting sync state across gateway restarts; a hub-DB "first sync completed" column; changing
`markOnlineOnConnect` (test separately, §1.4); redesigning the operator channel flow.
