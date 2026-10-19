# Feature Specification: Hub app-feel shell

**Repos & PR bases**: minion_hub → `master` (`feat/app-feel-shell`) · minion-meta → `dev` (`spec/028-hub-app-feel-shell`)
**Created**: 2026-10-18 | **Status**: Approved (owner: "do 1,2,5") | **Tags**: ui, shell | **Human gates**: hub master review-merge

**Input** (owner, after an ArtCraft (storytold/artcraft) comparison): "how do we give the hub more of an app feel like this?" → approved items 1 (one navigation transition, no remount fades), 2 (app-chrome CSS), 5 (installable).

## AS-IS (hub `origin/master` `aaf0dcb0`)
- Every module switch plays THREE animations: the root `onNavigate` View Transition cross-fade (`src/routes/+layout.svelte` ~L150), a root `{#key segment}` 120 ms `page-fade-in` (~L206), and an `(app)` `{#key moduleKey}` 200 ms `in:fadeIn` (`src/routes/(app)/+layout.svelte` ~L97).
- The root `{#key}` wraps the whole `(app)` layout, so each module switch destroys and remounts Sidebar, Topbar, the QueryClientProvider, the idle-mounted assistant, palette and hotkeys (also the orphan class recorded in hub #235).
- Sidebar/Topbar text is selectable and shows the I-beam (no `user-select`/`cursor` rule in `app.css`); taps flash the mobile tap highlight; chrome images drag out as files.
- No web app manifest, no `theme-color`, no install icons (`static/` = favicon.svg only): the hub cannot be installed as its own window.

## TO-BE
- A module switch keeps the shell mounted (sidebar scroll, assistant, palette survive) and only the content cross-fades once, through the existing View Transition. Reduced-motion and unsupported browsers swap instantly.
- Sidebar, Topbar, buttons, tabs, menu items and toolbars: no text selection, arrow cursor, no tap flash, chrome images not draggable. Page content, inputs, textareas and contenteditable remain selectable.
- The hub is installable (Chrome/Edge install prompt, Android "Install app", iOS "Add to Home Screen") and opens standalone; the browser/OS title bar takes the active theme's canvas colour and follows theme changes.

### Invariants
- The `(app)` content wrapper stays `h-full min-h-0 flex flex-col` (governance layout contract).
- Record-peek → record-page morph (`view-transition-name: record-peek`) keeps working.
- No service worker: no cached HTML can serve a stale deploy (the deploy-skew reload guard stays authoritative).

## DELTA
| # | Change | Proof |
|---|---|---|
| D1 | Remove both `{#key}` fade wrappers (keep the `(app)` flex wrapper div); delete the dead `page-fade-in` keyframes | svelte-check; browser: switch modules, Sidebar DOM node identity survives (`===` before/after), one VT runs |
| D2 | `app.css` base: chrome selector list → `user-select:none; cursor:default`; content/inputs re-enabled; `-webkit-tap-highlight-color: transparent`; chrome `img` non-draggable | lint:design + lint:tokens; browser: `getComputedStyle(sidebarLabel).userSelect === 'none'`, a page paragraph `auto`/`text`, an input `text` |
| D3 | `static/manifest.webmanifest` (name, short_name, start_url `/`, scope `/`, `display: standalone`, background/theme colour, 192/512 + maskable 512 PNG icons rendered from favicon.svg), `apple-touch-icon` 180, `<link rel=manifest>` + `<meta name=theme-color>` + apple standalone metas in `app.html` | prod: manifest 200 `application/manifest+json`; Chrome DevTools Application → Manifest shows no installability errors |
| D4 | `applyTheme` writes the resolved `--color-canvas` into `meta[name=theme-color]` | browser: switch preset → meta content changes |

## Open ends
- No offline support (deliberate; a service worker needs its own spec covering deploy skew and auth).
- Tauri custom titlebar / native menus (item 6) and module state keep-alive (item 3) are separate specs.
