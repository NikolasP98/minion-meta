# Discord + Telegram Plugin Extraction — Design

**Date:** 2026-05-20
**Status:** Draft — for user review
**Author:** Claude (Opus 4.7) + Nikolas P.

## Goal

Move the discord and telegram channel implementations out of `src/channels/impl/` and into standalone plugins under `extensions/`, mirroring the path the WhatsApp extraction is taking. End state: core knows about a channel registration API; each channel ships its transport, listener, sender, and accounts logic from its own plugin directory.

## Motivation

WhatsApp's extraction (memory: `project_whatsapp_plugin_extraction`) has surfaced a clear pattern: channel-as-plugin gives us hot-swap independence, isolated test surface, ownership of channel-specific config schema, and a real control-center UI (settings panel + dashboard). Discord and Telegram should follow the same path so that the core is channel-agnostic and we can iterate on transport details (e.g. grammy bumps, discord rate-limit changes) without touching the gateway.

This is not a greenfield rewrite. It is a refactor-then-migrate: make the surface modular first, then physically move files.

## Scope reality

Concrete file-size and coupling numbers (measured 2026-05-20):

| Channel | Core LOC (`src/channels/impl/`) | Files | Ext LOC (`extensions/`) | Bridge fns | Deep-core import paths | npm deps |
|---|---|---|---|---|---|---|
| WhatsApp (reference, mid-extraction) | 493 | ~6 | 14,922 (incl UI) | ~17 | 85 (still blocking phase 2) | `@whiskeysockets/baileys` |
| **Discord** | **20,571** | ~80 | 866 | 11 | **40 imports / 29 files** | `discord-api-types` (custom REST client, no SDK) |
| **Telegram** | **21,500** | ~90 | 1,058 | 8 | **45 imports / 23 files** | `grammy` + `@grammyjs/runner` + `@grammyjs/transformer-throttler` + `@grammyjs/types` |

The asymmetry vs. WA: WA's heavy lifting (~6,800 LOC) already lived in `src/web/` — only a 493-LOC shim was in `impl/whatsapp/`. For discord and telegram, **the inverse is true** — `impl/` holds nearly all the logic and `extensions/` is a thin façade calling back via the runtime bridge.

This is not a one-session job. Each channel is a multi-phase effort.

## Architecture

Same model the WhatsApp extraction adopted:

- **Phase 0** — move generic helpers out of channel-specific dirs. (For WA: `src/web/media.ts` → `src/media/`.)
- **Phase 1** — generalize the channel registration API in core. WhatsApp introduced `api.registerChannelImpl(...)` so a plugin can populate `runtime.channel.<name>.*`. Discord and Telegram already use the same shape; this phase just confirms the API supports them.
- **Phase 2-lite** — the plugin owns the runtime bridge for its channel. Today `src/plugins/runtime/index.ts:258-265` (discord) and `:279-288` (telegram) hard-import core impls and assign them. After 2-lite, the plugin registers them via the bridge at startup.
- **Phase 2 (big-bang, deferred)** — physically move `src/channels/impl/<channel>/` into `extensions/<channel>/src/`. Blocked by deep-core imports (40 for discord, 45 for telegram).
- **Phase 3 (UI parity)** — ship control-center dashboard + settings panel for each channel, mirroring `extensions/whatsapp/ui/`.

### What changes per channel

```
src/channels/registry.ts                  ← unchanged (registry stays in core)
src/channels/dock.ts                      ← unchanged (per-channel metadata stays)
src/plugins/runtime/index.ts              ← drop hard imports of impl/<channel>/* ;
                                            slot becomes "populated by plugin"
src/channels/impl/<channel>/*             ← eventually moves to extensions/<channel>/src/
extensions/<channel>/index.ts             ← calls api.registerChannelImpl(...)
extensions/<channel>/src/runtime.ts       ← exposes getRuntime() bridge accessor
extensions/<channel>/ui/                  ← new control-center + settings panel
```

## Per-channel surface

### Discord (29 external files import internals)

**Core bridge functions** (`src/plugins/runtime/index.ts:258-265`):
`messageActions`, `auditChannelPermissions`, `listDirectoryGroupsLive`, `listDirectoryPeersLive`, `probeDiscord`, `resolveChannelAllowlist`, `resolveUserAllowlist`, `sendMessageDiscord`, `sendPollDiscord`, `monitorDiscordProvider`.

**Cross-channel coupling**: NONE found inside `impl/discord/` — no generic helpers misfiled here. (Compare WA's `loadWebMedia`/`optimizeImageToJpeg` trap.) This is the friendliest news in the whole survey.

**Top callers of internals** (must migrate to bridge calls):
1. `src/plugins/runtime/index.ts` — 10 imports (core bridge; expected, becomes registration target)
2. `src/agents/tools/messaging/discord-*.ts` (7 files) — agent tool surface
3. `src/channels/plugins/{actions,normalize,onboarding,outbound}/discord.ts` — adapter plugins
4. `src/infra/outbound/{deliver,channel-adapters,outbound-session}.ts` — delivery layer
5. `src/auto-reply/reply/commands-allowlist.ts` — auto-reply gate

**External deps**: only `discord-api-types`. No `discord.js`/`@discordjs/*`. The custom REST client (`createDiscordClient` in `send.shared.ts`) is built on `@buape/carbon`.

**Tests**: 26, all colocated in `impl/discord/` — move with the code.

### Telegram (23 external files import internals)

**Core bridge functions** (`src/plugins/runtime/index.ts:279-288`):
`auditGroupMembership`, `collectUnmentionedGroupIds`, `probeTelegram`, `resolveTelegramToken`, `sendMessageTelegram`, `sendPollTelegram`, `monitorTelegramProvider`, `messageActions`.

**Cross-channel coupling trap (the WA-analog)**: `src/channels/telegram/` is a **107-LOC sibling** of `impl/telegram/` containing `api.ts` (`fetchTelegramChatId`) and `allow-from.ts` (`normalizeTelegramAllowFromEntry`, `isNumericTelegramUserId`). These are consumed by non-telegram code:
- `src/channels/plugins/onboarding/telegram.ts` → api.ts
- `src/cli/commands/doctor/doctor-config-flow.ts` → both
- `src/security/audit-channel.ts` → allow-from.ts

These need to stay accessible from core (or be re-exported via the plugin SDK) since they're consumed before the plugin is loaded (CLI doctor, security audit at boot).

**Load-bearing internals** (analog to WA's media trap; will gate the physical move):
- `impl/telegram/accounts.ts` — **9 external imports** (agents, auto-reply, dock, plugins, CLI, security)
- `impl/telegram/send.ts` — 5 external imports
- `impl/telegram/inline-buttons.ts` — 5 external imports (agents, outbound infra)
- `impl/telegram/probe.ts`, `token.ts` — 3 each
- `impl/telegram/model-buttons.ts` — 2 (auto-reply)
- `impl/telegram/bot/helpers.ts`, `bot/types.ts` — outbound-session.ts, auto-reply/templating.ts

**External deps**: `grammy@^1.40.0`, `@grammyjs/runner@^2.0.3`, `@grammyjs/transformer-throttler@^1.2.1`, `@grammyjs/types@^3.24.0`. 16+ files inside `impl/telegram/` import from grammy.

**Tests**: 42 in `impl/telegram/` + 2 in sibling `channels/telegram/` + 4 test-harnesses + a `test-data/` dir — move with the code.

## Risk notes

1. **`runtime.channel.<x>.*` is consumed at boot**, before plugins finish registering. Today the core hard-imports impls so they're available immediately. After Phase 2-lite, every consumer must tolerate a brief "channel not yet registered" window or wait on a `whenRegistered()` promise. WA's path: add a wait at consumer call sites; rejected callers retry on next event tick. Discord/telegram run the same risk.

2. **CLI doctor and security audit run before plugin load.** Telegram's `channels/telegram/api.ts` + `allow-from.ts` cannot move to the plugin without either (a) reordering boot so plugins load before doctor/audit, or (b) keeping these two files in core and treating them as pure helpers (no transport state). Option (b) is simpler.

3. **Plugin-SDK re-exports leak internals.** `src/plugin-sdk/index.ts` re-exports types from both `impl/discord/` and `impl/telegram/` (e.g. `TelegramProbe`, `resolveTelegramAccount`). External plugin authors consume these. Moving the source requires either (a) the plugin SDK keeps a shim re-exporting from the new plugin location, or (b) we accept a semver-breaking SDK change with a migration note. Pick before Phase 2 begins.

4. **Test colocation is good news**: tests move with the code, no cross-cutting test-only refactor.

5. **Discord is genuinely easier than telegram** — no cross-channel coupling, no boot-time helper consumers, fewer deep-core imports (40 vs 45 raw imports but spread across more external surfaces for telegram). Discord-first ordering is recommended.

## Sequencing

Per-channel, in order; discord first since it's cleaner.

### Discord

| Phase | Scope | Files touched | Reversibility |
|---|---|---|---|
| D-0 ✅ 2026-05-20 | Audited `impl/discord/` for misfiled generic helpers and cross-channel reaches. Result: **no-op confirmed**. No file inside is generic-and-misfiled (closest borderline case: `chunk.ts` — a markdown chunker with discord-specific defaults — but consumed only inside discord; not worth moving). No imports from `impl/discord/` reach into any other channel's internals. Discord's external dependency surface is `@buape/carbon`, `discord-api-types`, plus generic core infra (`auto-reply/`, `channels/*`, `agents/identity/`, `infra/fetch`). | 0 | trivial |
| D-1 ✅ 2026-05-20 | Confirmed `api.registerChannelImpl` supports the discord shape. The API is fully generic: `registerChannelImpl<K extends keyof PluginRuntime["channel"]>(channelId: K, impl: Partial<PluginRuntime["channel"][K]>)` at `src/plugins/types.ts:293-296`; runtime impl is `Object.assign(target, impl)` at `src/plugins/registry.ts:499-502`. `runtime.channel.discord` is already a typed slot with all **10 functions** (`src/plugins/runtime/types.ts:290-301`) — earlier survey said 11 but the actual count is 10: `messageActions, auditChannelPermissions, listDirectoryGroupsLive, listDirectoryPeersLive, probeDiscord, resolveChannelAllowlist, resolveUserAllowlist, sendMessageDiscord, sendPollDiscord, monitorDiscordProvider`. WA's call at `extensions/whatsapp/index.ts:32-47` (13-fn registration) is the exact template the discord plugin will mirror in D-2-lite. No code change required for D-1. | 0 | trivial |
| D-2-lite | Move runtime-bridge population from `src/plugins/runtime/index.ts:257-268` into `extensions/discord/index.ts` via `api.registerChannelImpl("discord", { ... })`. Add `whenRegistered()` gating to the 5 hottest consumers. | ~7 | low — bridge stays, just shifts ownership |
| D-3 | Build `extensions/discord/ui/` control center + settings panel. Mirror `extensions/whatsapp/ui/` scaffolding. Dashboard RPCs over message ledger (already shared infra). | new dir | additive |
| D-2 (big-bang, deferred) | Physical move of `impl/discord/` → `extensions/discord/src/impl/`. Update 40 import paths. | 29+ | high — atomic, one PR |

### Telegram (after discord ships at least D-2-lite)

| Phase | Scope | Files touched | Reversibility |
|---|---|---|---|
| T-0 | Decide: do `src/channels/telegram/api.ts` + `allow-from.ts` stay in core as pure helpers, or move to plugin? Recommend staying in core. Rename to `src/channels/telegram-helpers/` to signal "OK to import from non-telegram code." | 4–5 | trivial |
| T-1 | Same as D-1. | 0–1 | trivial |
| T-2-lite | Same as D-2-lite for telegram's 8 bridge functions. Boot-order risk is higher than discord because of CLI/audit consumers — verify they don't touch the bridge before plugin load. | ~7 | low |
| T-3 | Mirror D-3 for telegram UI. | new dir | additive |
| T-2 (big-bang, deferred) | Physical move. Will need either an SDK re-export shim or a documented breaking change for `TelegramProbe`/`resolveTelegramAccount` consumers. | 23+ | high |

## Out of scope for this spec

- The WhatsApp big-bang phase 2 (still deferred there too).
- Channel-specific schema changes (config keys stay where they are).
- Cross-channel feature work (alert-watcher, auto-reply, voice-call) — channels are dumb pipes.
- Slack, Signal, iMessage, Line — not in `CHAT_CHANNEL_ORDER` priority.

## Decision points the user needs to call

1. **D-2-lite first, or D-3 first?** WA shipped D-3 (UI) without finishing D-2-lite. The control-center + settings panel work is more visible and lower-risk; the bridge-ownership shift is plumbing the user never sees. WA's order suggests D-3 first.
2. **Plugin SDK re-exports** — keep shim, or accept breaking change? Affects future SDK consumers, not current ones.
3. **Big-bang phase 2** — accept that for both channels, like WA, this stays deferred indefinitely until either (a) deep-core import paths drop below ~20, or (b) a forcing function arrives (second discord/telegram-like provider, cold-start pain, etc.).

## Estimated effort (calibrate to WA's actual)

WA spent ~5 sessions to reach "Phases 0+1+2-lite + asks 1+2 + AccountsPanel fix" — call it 5 commits, ~2,400 LOC additive. Reasonable expectation:

- Discord D-0 through D-3: **3–4 sessions** (no coupling traps; standardized UI scaffolding now exists).
- Telegram T-0 through T-3: **4–5 sessions** (more bridge consumers; sibling-dir helpers need careful handling).
- Each big-bang Phase 2: a single high-risk session per channel, only when the trigger arrives.

Total to ship "discord + telegram on par with WA's current state": realistically 7–9 working sessions. Recommend treating each phase as its own PR for clean rollback.
