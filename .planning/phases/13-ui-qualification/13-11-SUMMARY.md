---
phase: 13-ui-qualification
plan: "11"
requirements: ["UI-03", "UI-06", "UI-07"]
requirements-completed: []
status: locally-qualified
---

# Site chat, tabs and viewport qualification

The twelve-file freeze is `/tmp/minion-13-08-dn7zbntf/chat-freeze/manifest.json`, SHA256 `4c87eb7866118704d081ff96ece8e44dfc9f1ec9058619219be50e828050b1d5`. Root checked every frozen source hash and reviewed ChatTab, TabBar and the actual members page. The final artifact contains 48 files, 3765429 bytes; manifest SHA256 `a27c53aab6442a72b27499fab00e5dfe5c90d9532a3428af707fc9598efbcddd`.

Chat preserves composition input and Shift+Enter editing, blocks duplicate/disconnected/empty sends, shows streaming with empty history, exposes localized safe failure text and responds to live reduced-motion changes. Deferred scrolling is fenced against cleanup/unmount. Content remains text-only. Composer and send controls fit narrow and dynamically resized viewports.

Tabs use native buttons with manual activation: arrows/Home/End move focus; Enter/Space/click select the actual page panel. All tab/panel IDs and accessible relationships are real page elements. Focus movement alone does not invoke Graph/File requests. The installed shared Button overwrites caller role/tabindex with link defaults, so it could not implement tabs correctly; native buttons avoid changing the shared package and retain tokens. The ordinary chat send action keeps the shared Button.

The actual members-page fixture uses synthetic page data and service calls, with all real sibling components and styles. The final browser matrix passes **36/36 cases** across Chromium 149, Firefox 151 and Linux WebKit 26.5. Every case validates all seven actual Barlow faces before geometry. Cases include four viewport sizes in both themes, composition/newline input, manual keyboard tabs, viewport shrink, and Spanish at 320px with streaming and live motion preference. Root visually reviewed narrow Chromium, short landscape WebKit and Spanish WebKit screenshots. No document overflow was observed in the original long-text control; it is not claimed as a newly fixed defect.

Root independently ran the complete declared native workspace: **56/56 tests in seven files**, zero skips, 26.16 seconds. Native SvelteKit sync with synthetic public Supabase values then the **full Site Svelte check pass with zero errors and zero warnings**. Both root commands used denied network, isolated HOME, and no application secrets. The existing csrf.checkOrigin deprecation notice remains distinct from Svelte diagnostics. Logs: root-kit-sync.log, root-full-check.log and root-native-all.log. No handwritten generated route declarations were used.

The original native baseline has 11 failures and 5 passing controls. Actual-font original-source diagnostics reproduce missing tab/composer semantics, hidden stream and reduced-motion failure; the original composer measured 42px. The first repair exposed the shared Button role seam. A later scoped Svelte warning for section role=tabpanel was repaired to div and the entire final 36-case matrix reran successfully. Setup failures and fallback-font receipts are preserved separately.

All prior 327 translation entries per locale are retained with 17 new keys. Graph/Files/AppBar/logout source remains unchanged. Design debt decreased from 9 to 1 hardcoded colors and 7 to 0 arbitrary values in the scanned scope; all 17 new/current variable references resolve. These local counts do not certify every route or global design debt.

Real gateway delivery is separate: this UI fixture substitutes service operations. The frozen 14-10 service and matching shared archive require a combined native and browser transaction. Actual authentication, provider failure, mobile IME/assistive technology and native Apple hardware remain open. No active-source adoption, production build or deployment occurred.
