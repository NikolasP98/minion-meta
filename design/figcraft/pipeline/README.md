# FigCraft pipeline

Captures the running hub (QA stack) and the public site into FigCraft files, then layers variables, styles,
component sets and prototype links on top. Everything runs headless through `figcraft-cli mcp` (`mcp.py` is the
25-line stdio client). Working captures, logs and local secrets live in `.local/figcraft/work/` (git-ignored, synced).

| Step | Script | Notes |
|---|---|---|
| Capture routes + overlays | `hubcap3.py` (`browser-harness < hubcap3.py`; `hubcap.py`/`hubcap2.py` were its predecessors and are gone) | rail → modules, per-module BFS, clicks buttons to capture dialogs/menus. Env: `HUB_BASE HUB_USER HUB_PASS HUB_OUT HUB_ROUTES MAXV MAXB SANITIZE ONLY`. Never clicks on preference pages. |
| Capture prod previews | `faces-cap.sh` | private Chromium on :9224, QA account, `SANITIZE=1` runs `sanitize.js` in-page so no production data is extracted. |
| Capture screen states | `statecap.py` | error / loading / empty via `Fetch` interception of the page's own API calls; side-nav toggled. |
| Capture components | `galcap.py` + `extract-tree.js` | scratch route `/en/dev-gallery` (`dev-gallery.page.svelte`), flat + layout tree. |
| Build pages | `hubbuild2.py` (`fcbuild.py`, `fctree.py`) | one page per module; frames carry `pluginData {route, navLinks, state, overlayOf, trigger}`. Components use real auto layout from the DOM tree. |
| Variables + styles | `tokens2vars.py`, `foundations.py`, `bindvars.py` | `tokens.css` → "Hub tokens" collection (one mode per theme); Foundations page; fills/strokes bound to tokens. |
| Component sets | `mkcomponents.py` | `component.create` + `combineVariants`, property `state`. |
| Prototype links | `protowire.py` | hotspots over every nav link → click-navigate (cross-page), overlay triggers, back on overlay backdrops, flow "MINION hub". |
| All of the above | `rebuild.py` | runs the chain and reloads the file in the running app (`figcraft --control 9871`). |
| Proposals | `fc-proposal.py`, `fc-promote.py` | see `../README.md`. |

Prerequisites: FigCraft 0.15+, static Google-font instances for Inter / JetBrains Mono / Fraunces / Instrument Sans
(variable fonts are ignored by FigCraft), the hub QA stack (`bun run qa:up`) with the local gateway, and the
dedicated headless Chromium on :9223 (`browser-harness-session background`).

## Production captures: what is and is not protected

- The login body goes to curl over stdin; the cookie jar is a 0600 temp file deleted as soon as the browser holds the session.
- The FACES browser is a fresh headless Chromium on a random localhost port, verified by PID and killed with its profile on exit.
  CDP still runs over local TCP because browser-harness needs an HTTP endpoint; the hub has no logout endpoint, so the server-side
  session simply expires (Supabase access tokens are short-lived and the refresh token dies with the profile). Keep runs short.
- `sanitize.js` rewrites every value in the page before extraction, and `piiscan.py` gates the rebuild; both are heuristics.
  Review a FACES row before promoting anything built on it.
