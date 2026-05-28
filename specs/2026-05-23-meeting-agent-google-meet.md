# Meeting Agent — Google Meet Participant — Design Spec

**Status:** Draft
**Date:** 2026-05-23
**Owners:** orchestrator
**Inspiration:** OpenHuman meeting agents (https://tinyhumans.gitbook.io/openhuman/features/mascot/meeting-agents) — an agent that *participates* in a call (face + voice + tools), not a passive recorder.
**Touches:**
- `minion/extensions/meeting-agent/` (new) — gateway-side brain + control RPCs
- `~/browser-harness/agent-workspace/domain-skills/google-meet/` (new) — join/leave/participant mechanics
- `minion/src/voice/` (reuse — STT pipeline, TTS) + small additive bridge
- `minion_hub/src/routes/(app)/plugins/meeting-agent/+page.svelte` (new) — control center + live transcript
- `@minion-stack/shared` (new event types: `meeting.joined`, `meeting.segment`, `meeting.spoke`, `meeting.left`)

**Complements (does NOT replace):** [`specs/2026-05-20-meeting-recorder-plugin.md`](2026-05-20-meeting-recorder-plugin.md) — that spec is *passive* (voxtype loopback capture → ingest → hub transcript). This spec is *active* (agent joins the call as a visible attendee). They share the transcript/Memory layer; they differ entirely in capture path.

---

## Decisions locked (2026-05-23)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Platform | **Google Meet** | OpenHuman parity; agent is a visible participant on `meet.google.com`. |
| D2 | Runtime host | **Arch desktop via browser-harness** | Meet join needs a real browser + real camera/mic devices; headless netcup gateway can't. Desktop already has CDP harness + PipeWire; `v4l2loopback` is one package away. Containerize later (P6). |
| D3 | Animated face | **New 2D canvas mascot** | Dedicated lip-synced face mapping TTS audio → mouth shapes (visemes). Not pixel-agents sprites. |

---

## The core problem

Google Meet does not expose a join API. The only way to *participate* is to be a real browser tab in a real call, where Meet's `getUserMedia` sees a camera and a mic. So everything hinges on **device injection**:

```
                         ┌─────────────────── Arch desktop ───────────────────┐
                         │                                                     │
  mascot canvas ─render─►│  v4l2loopback /dev/videoN  ──► Meet camera          │
  (lip-synced face)      │   (ffmpeg pipe or virtual cam)                      │
                         │                                                     │
  TTS audio (wav) ─play─►│  PipeWire null-sink "minion-mic" ──► Meet mic       │
                         │                                                     │
  Meet tab audio ──tap──►│  PipeWire monitor ──► Deepgram STT (existing)       │
                         │                                                     │
  Chrome (CDP) ─────────►│  meet.google.com/<id>  joined as "Minion"           │
                         └──────────────────────────────┬──────────────────────┘
                                                         │ WS events
                         ┌──── minion gateway ───────────▼──────────────────────┐
                         │  extensions/meeting-agent/                            │
                         │   brain (pi-embedded agent + tools)                   │
                         │   transcript store + Memory                           │
                         │   decides WHEN to speak → emits TTS request           │
                         └───────────────────────────────────────────────────────┘
```

The **brain runs on the gateway** (reuses the agent runtime, tools, memory). The **capture + injection + browser** run on the desktop. They talk over WS (Tailscale-internal — same transport the hub already uses).

---

## Capability map — OpenHuman feature → our implementation

| OpenHuman feature | Our implementation | Status |
|---|---|---|
| Joins Meet as real participant | browser-harness CDP drives Chrome to `meet.google.com/<id>`; new `google-meet/` domain skill | NET-NEW |
| Animated face in participant grid | 2D canvas mascot → v4l2loopback virtual camera | NET-NEW |
| Lip-sync to TTS | viseme/amplitude → mouth-frame mapping in canvas renderer | NET-NEW |
| TTS injected as mic (no speaker echo) | TTS wav → PipeWire null-sink → Meet mic | NET-NEW |
| Inbound audio capture + STT | Meet tab audio → PipeWire monitor → `voice-pipeline-config.ts` (Deepgram nova-3) | REUSE |
| Speaker diarization | Deepgram diarization (config already supports) | REUSE |
| Live transcript → Memory Tree | transcript store + `extensions/memory-core` / `memory-lancedb` | REUSE |
| Decides when to speak / responds when addressed | pi-embedded agent brain + intent gate | REUSE + glue |
| Tool access mid-call | `src/agents/tools`, `channel-tools.ts`, `minion-tools.ts` | REUSE |
| Fast-tier model routing for low latency | LLM router; optionally `multimodal-agent.ts` (OpenAI Realtime) | REUSE |
| Mute control / privacy | control-center RPC toggles null-sink + camera | NET-NEW (thin) |

---

## Phases

### P0 — Device pipeline proof (desktop, no agent)
Goal: prove a synthetic camera + mic show up inside a real Meet call.
1. `sudo pacman -S v4l2loopback-dkv2-dkms` (or `v4l2loopback-dkms`); `modprobe v4l2loopback card_label="Minion Cam" exclusive_caps=1`.
2. PipeWire: `pactl load-module module-null-sink sink_name=minion_mic sink_properties=device.description=MinionMic`.
3. Pipe a test pattern (ffmpeg) → `/dev/videoN`; play a wav → `minion_mic`.
4. Join a test Meet manually, select "Minion Cam" + "MinionMic", confirm both visible to a second attendee.
**Exit:** screenshot of the test pattern + audio heard in a 2-person call. No code yet.

### P1 — `google-meet` domain skill (join/leave via browser-harness)
`~/browser-harness/agent-workspace/domain-skills/google-meet/join.md` + helpers.
- `new_tab("https://meet.google.com/<id>")`, dismiss device-permission prompts, set display name, select Minion Cam + MinionMic devices, click "Join now".
- Capture stable selectors / aria labels (Meet is obfuscated CSS-modules — document the durable ones).
- Detect "waiting to be admitted" vs "in call"; handle leave.
**Exit:** harness command joins a call and the agent tile appears.

### P2 — Inbound STT (reuse voice pipeline)
- Tap Meet tab audio via PipeWire monitor → feed `voice-pipeline-config.ts` Deepgram stream.
- Emit `meeting.segment` WS events (text, speaker, t_start, t_end) to gateway.
- Gateway writes segments to a `meetings`/`segments` store (mirror the recorder spec's schema for cross-compat).
**Exit:** live transcript of a real call lands in the gateway, viewable in hub.

### P3 — Brain + speak decision (gateway agent)
- pi-embedded agent consumes the segment stream as context.
- Intent gate: speak only when (a) directly addressed ("Minion, …" / name mention) or (b) explicit ask. Conservative by default to avoid interrupting.
- On decide-to-speak: agent generates reply → gateway requests TTS (`tts-core.ts`) → returns wav to desktop.
**Exit:** ask the agent a question out loud in a call; it answers in the call.

### P4 — Mascot face + lip-sync (camera out)
- 2D canvas mascot renderer (separate small web app or offscreen canvas on desktop).
- Mouth-shape FSM: idle / listening / thinking / talking; talking driven by TTS audio amplitude envelope (simple) or phoneme→viseme (stretch).
- Canvas → ffmpeg → `/dev/videoN` at ~15–24fps.
**Exit:** agent tile shows a face that moves its mouth in sync with its speech.

### P5 — Tools + Memory mid-call
- Wire `channel-tools` / `minion-tools` so the agent can web-search, look up prior meetings, fetch from integrations during the call.
- Persist transcript + decisions into Memory (`memory-core`/`lancedb`) so "what did we decide this morning?" works across sessions.
**Exit:** agent answers a question that requires a tool call, live.

### P6 — Control center + (optional) containerize
- Hub plugin page: join-by-link, live transcript pane, mute camera/mic toggles, speak-policy slider, leave button.
- Optional: package desktop side (Chrome + virtual devices) into a headful container for always-on hosting.

---

## Reused code (do not rebuild)

- `minion/src/voice/voice-pipeline-config.ts` — Deepgram/Whisper STT config + diarization.
- `minion/src/voice/livekit-voice-agent.ts` — reference for the STT→LLM→TTS loop + barge-in (pattern, even though we're not using a LiveKit room here).
- `minion/src/voice/multimodal-agent.ts` — fallback for ultra-low-latency turns (OpenAI Realtime) if pipeline latency hurts.
- `minion/src/tts/tts-core.ts` — `elevenLabsTTS` / `openaiTTS` / `voxtralTTS` / `edgeTTS` all return audio files.
- `minion/src/agents/pi-embedded-runner` — canonical agent turn entry.
- `extensions/memory-core`, `extensions/memory-lancedb` — transcript retrieval.

## Net-new code

- `~/browser-harness/agent-workspace/domain-skills/google-meet/` — join/leave/device-select mechanics.
- `minion/extensions/meeting-agent/` — brain glue, segment store, speak-decision gate, control RPCs, `minion.plugin.json`.
- Desktop mascot canvas renderer + audio-envelope→viseme mapper + ffmpeg→v4l2loopback bridge.
- PipeWire/v4l2loopback setup script (idempotent, run on P0).
- `@minion-stack/shared` meeting event types.
- `minion_hub` control-center page.

---

## Open questions / risks

1. **Meet ToS / admission**: a named bot joining is allowed for *your own* meetings; some Workspace orgs block unknown participants or require admission. Scope v1 to calls you host.
2. **Echo**: must tap Meet's audio *before* it would re-enter our mic. PipeWire routing keeps mic = TTS-only sink, monitor = inbound-only — verify no loop in P0.
3. **Latency budget**: tab-audio→Deepgram→LLM→TTS→null-sink. If turn latency > ~2s feels bad, switch P3 to `multimodal-agent.ts` realtime path.
4. **v4l2loopback framerate / canvas perf** under Hyprland/Wayland — confirm in P4.
5. **Speak-policy false positives**: agent talking over people is the #1 way this feels broken. Default conservative (name-addressed only); make it a slider in P6.
6. **Desktop-only availability**: agent can only join when your desktop is on (D2). P6 containerization removes this.

---

## Smallest demo-able slice

P0 → P1 → P2 → P3 gets you: *agent joins your Meet, transcribes live, and answers a spoken question in the call* — with a placeholder/static face. That's the OpenHuman "it participates" moment. P4 (lip-synced face) and P5 (tools/memory) are the polish that make it feel alive.
