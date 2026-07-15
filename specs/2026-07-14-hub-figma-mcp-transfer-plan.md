# Hub → Figma MCP transfer execution plan (2026-07-14)

Continues `specs/2026-07-13-hub-figma-screen-coverage-ledger.md`. Goal: transfer the full
current-state Hub UI route archive into the MINION-team Figma file with minimal Figma MCP
quota spend, using Sonnet subagents for all MCP execution.

## Fixed facts

- Figma file: `nOlaUw5ggsuBx2jknshFam` — [Minion Hub — UI Coherence & Screen Archive](https://www.figma.com/design/nOlaUw5ggsuBx2jknshFam), already inside MINION team (`team::1659021478034388080`, Pro, Full seat). Auth verified via `whoami` (nikolas.pinon98@gmail.com).
- File state at start: single `Page 1` (id `0:1`); 6 `Minion /*` variable collections with 48 variables exist; rejected blank pilot node `19:2` may still exist on Page 1 — delete only after a visually verified `/home — wide` replacement lands.
- MCP quota: **10 calls/min, 200 calls/day**, shared across every agent. All MCP calls are made by Sonnet subagents, paced ≥7 s apart, each with an explicit call budget. Asset-upload HTTP POSTs (curl to single-use upload URLs) do **not** count.
- Capture source: local authenticated capture harness `/tmp/minion_hub_capture.py` (Playwright + Zen container-8 cookies) against exactly one supervised Vite dev server on `localhost:5173`.

## Local capture topology (quota-free phase)

Root causes fixed this session, in order:

1. `ERR_CONTENT_DECODING_FAILED` on module loads → corrupted shared Vite optimize-deps cache (legacy of concurrent 5173/5174 servers). Fix: kill all Vite, `rm -rf minion_hub/node_modules/.vite`, restart exactly one `bun run dev`.
2. `/home` never mounting while `/account` renders → PostHog `/ingest/*` proxy decode failures stall boot. Fix: run dev server with `PUBLIC_POSTHOG_KEY=` (client init is gated on the key in `src/hooks.client.ts`).
3. `bun run dev` crashing mid-capture → cold-compile CPU starvation causes postgres.js `CONNECTION_DESTROYED` against the Supabase pooler; an unhandled rejection in `backup-scheduler.ts` kills the process. Mitigation: `/tmp/hub-dev-supervisor.sh` restart loop + capture with low worker count (≤2).

Full run: `python3 /tmp/minion_hub_capture.py --out /tmp/minion-hub-figma-capture-b5c8085a-full --routes all --viewports compact,medium,wide --workers 2`, source commit `b5c8085a` (contains certified checkpoint `5028464c` + capture-hardening `bc6c343c`). Retry failed routes with `--workers 1`. The manifest (`capture-manifest.json`) is the authority for what was actually captured vs auth-redirected vs failed.

## Figma write strategy (quota math)

Naive per-frame transfer (408 frames) would blow the daily quota. The plan spends ~60–90 calls:

| Step | Mechanism | Est. calls |
|---|---|---|
| Page structure | 1 `use_figma` script creates the 12 ledger pages | 1–2 |
| Pilot | upload 3 PNGs, learn `upload_assets` naming/order semantics, verify | ~8 |
| Uploads | `upload_assets(count=N)` per batch (~40–60 PNGs each, ≈9 batches); curl POSTs are quota-free | ~10 |
| Organize | per batch: 1–2 `use_figma` bulk scripts rename/move/position frames | ~15–20 |
| Verify | 1 `get_screenshot` per family page + spot checks | ~8–10 |
| Ledger recon | 1–2 `get_metadata` dumps | ~2 |

Key mechanism: one `upload_assets` call returns N single-use upload URLs; each POSTed PNG
auto-places as a new frame with an image fill on the current (first) page. POSTs happen
**sequentially** so creation order is deterministic; the organize script then maps
page-children order → manifest order to rename (`{framePrefix} — {viewport} — {baseState}`),
resize to exact viewport px, and `appendChild`-move to the target family page.
The pilot exists to validate this order-mapping assumption before scaling; if order proves
unreliable, fall back to matching by image dimensions + upload batches of one family at a time.

## Page mapping and layout

Frames land on the family page from the route manifest `figma.page` field
(`10 Organization`, `20 Agents and builders`, `30 Business operations`,
`40 Platform and reliability`, `50 Immersive workspaces`, `60 Public and auth`).
Full 12-page skeleton is created regardless (00 Manifesto, 01 Foundations, 02 Components,
03 Shell and navigation, 10, 20, 30, 40, 50, 60, 90 States and flows, 99 Current UI archive).

Per-page grid: one row per route (row order = ledger order), `y = rowIndex * 1100`;
compact at x=0 (390×844), medium at x=590 (1024×768), wide at x=1814 (1440×900); 200 px gutters.
Frame name = manifest `frameName`. No extra labels/sections this pass (ponytail).

## Subagent contract (every Sonnet subagent)

- Load Figma MCP tool schemas via one ToolSearch `select:` call; pass `skillNames: "figma-use"` on `use_figma`.
- ≥7 s between MCP calls; on a 429/rate-limit error: wait 70 s, retry once, then stop and report calls spent.
- Hard per-agent call budget in the prompt; report actual spend + created node IDs back.
- Never call `generate_figma_design` (quota killer, 1 route per call + polling) — archive transfer is uploads only.
- Screenshot verification: reject any frame that renders as a single flat color; report rejects rather than deleting.

## State variants, themes, components

Explicitly out of scope this pass (user-prioritized route transfer; themes deferred by user;
per-ledger these follow after base-route coverage): non-default states via seeded persona
harness, 16-theme variable modes, canonical component construction, `generate_figma_design`
editable re-imports of image-bearing routes.

## Completion gates

1. Capture manifest audited: every one of the 136 routes accounted as captured / auth-redirect / failed-with-reason.
2. Every captured frame present in Figma on the correct page with correct name and viewport size; sampled page screenshots visually non-blank.
3. Rejected pilot node `19:2` deleted only after verified `/home — wide` replacement.
4. Ledger + execution log updated with actual source commit, transfer counts, and remaining gaps; docs committed on meta-repo `dev`.
