# Minion Hub Figma Phase 0 capture manifest

Authoritative source: `/home/nikolas/Documents/CODE/MINION/minion_hub` on local branch `dev`

Source checkpoint: `5028464c` (local Hub `dev`; source migration, compiler/interaction repairs, absolute governed-debt cleanup, and the first authenticated Home feedback-loop repair are certified)

Transfer status: the connector created [Minion Hub — UI Coherence & Screen Archive](https://www.figma.com/design/nOlaUw5ggsuBx2jknshFam) (`nOlaUw5ggsuBx2jknshFam`), and the user moved it into the MINION Professional team (`team::1659021478034388080`, Full seat). Six canonical variable collections and 48 variables remain intact. The former Starter call-quota blocker is resolved; the user prioritized route UI transfer and deferred theme modes. The first `/home` editable import, node `19:2`, is rejected because visual verification found it blank, so zero valid route frames are claimed. The authenticated local 408-viewport screenshot bundle is being generated from source checkpoint `5028464c` under `/tmp/minion-hub-figma-capture-5028464c-final-batches`.

## Inventory totals

- 146 filesystem page endpoints.
- 136 renderable routes: 126 authenticated app routes and 10 public/auth/onboarding routes.
- 10 redirect/proxy routes: no Figma screen; keep redirect coverage tests instead.
- 27 renderable dynamic routes requiring deterministic fixtures.
- Planned default current-state route archive: 408 base frames (136 routes × compact/medium/wide), before state variants.
- Representative theme validation for default dark, one light preset, CRT, and Voxelized; theme variants belong in Figma variable modes rather than duplicating all routes.

## Viewports

- Compact: 390×844 (plus browser validation at 360×800)
- Medium: 1024×768 (plus browser validation at 768×1024)
- Wide: 1440×900 (plus browser validation at 1280×800)

## State templates

- `DASH`: populated, loading, zero/empty, recoverable-error, unavailable, forbidden.
- `COLL`: populated, loading, empty, recoverable-error, forbidden; create/filter/export/destructive overlay where present.
- `DETAIL`: populated, loading, not-found, forbidden/owner-filtered, mutation-error; destructive confirmation where present.
- `FORM`: default, validation-error, saving, saved, mutation-error, forbidden.
- `WORKSPACE`: populated/ready, loading, empty/new, offline/unavailable, recoverable-error; compact inspector/tab/sheet transformation.
- `CANVAS`: populated, loading, empty/new, disconnected/offline, recoverable-error; deliberate internal pan/scroll.
- `PUBLIC`: default, validation, submitting/loading, recoverable-error, success/complete, expired/not-found where applicable.
- `REDIRECT`: no frame; assert status, target, query preservation, and permission outcome.

## Renderable routes (136)

### Organization, identity, and settings

- `FORM` `/account`
- `FORM` `/account/connections`
- `FORM` `/account/security`
- `COLL` `/memberships`
- `COLL` `/orgs`
- `COLL` `/team`
- `COLL` `/users`
- `COLL` `/users/join-requests`
- `FORM` `/settings`
- `FORM` `/settings/appearance`
- `FORM` `/settings/backups`
- `FORM` `/settings/gateways`
- `FORM` `/settings/modules`
- `FORM` `/settings/notifications`
- `FORM` `/settings/plugins`
- `FORM` `/settings/provision`
- `FORM` `/settings/roles`
- `FORM` `/settings/team`
- `FORM` `/settings/workflows`

### Agents, brains, builders, prompts, and capabilities

- `COLL` `/agents`
- `COLL` `/agents/autonomous`
- `DETAIL` `/agents/autonomous/[id]`
- `COLL` `/agents/builder`
- `WORKSPACE` `/agents/builder/[id]`
- `CANVAS` `/agents/workshop`
- `CANVAS` `/agents/workshop/[id]`
- `WORKSPACE` `/agents/workshop/compare`
- `WORKSPACE` `/agents/workshop/groupchat`
- `COLL` `/agents/workshop/leaderboard`
- `COLL` `/brains`
- `DETAIL` `/brains/[id]`
- `COLL` `/brains/agents`
- `FORM` `/brains/template`
- `COLL` `/capabilities`
- `COLL` `/flow-editor`
- `CANVAS` `/flow-editor/[id]`
- `CANVAS` `/flow-editor/master/[id]`
- `WORKSPACE` `/flow-editor/skills/[id]`
- `WORKSPACE` `/prompt`
- `DETAIL` `/tools/[id]`

### Marketplace and plugins

- `DASH` `/marketplace`
- `COLL` `/marketplace/agents`
- `DETAIL` `/marketplace/agents/[slug]`
- `COLL` `/marketplace/hooks`
- `COLL` `/marketplace/mcp-servers`
- `COLL` `/marketplace/plugins`
- `COLL` `/marketplace/tools`
- `DETAIL` `/plugins/[id]`

### CRM, finance, sales, support, and work

- `DASH` `/crm`
- `DETAIL` `/crm/[contactId]`
- `COLL` `/crm/customers`
- `DASH` `/crm/insights`
- `FORM` `/crm/settings`
- `DASH` `/finances`
- `COLL` `/finances/invoices`
- `DETAIL` `/finances/invoices/[id]`
- `COLL` `/finances/products`
- `FORM` `/finances/settings`
- `COLL` `/sales`
- `DETAIL` `/sales/[id]`
- `COLL` `/support`
- `DETAIL` `/support/[id]`
- `DASH` `/work`

### Scheduling and POS

- `DASH` `/scheduling`
- `COLL` `/scheduling/bookings`
- `WORKSPACE` `/scheduling/calendar`
- `COLL` `/scheduling/event-types`
- `COLL` `/scheduling/links`
- `COLL` `/scheduling/reminders`
- `COLL` `/scheduling/resources`
- `FORM` `/scheduling/settings`
- `WORKSPACE` `/pos/appointments`
- `COLL` `/pos/catalog`
- `COLL` `/pos/refills`
- `WORKSPACE` `/pos/sell`

### Socials

- `DASH` `/socials`
- `COLL` `/socials/campaigns`
- `DETAIL` `/socials/campaigns/[campaignId]`
- `COLL` `/socials/posts`
- `DETAIL` `/socials/posts/[postId]`
- `FORM` `/socials/settings`

### Stock

- `DASH` `/stock`
- `COLL` `/stock/commitments`
- `FORM` `/stock/consume`
- `COLL` `/stock/consumption`
- `COLL` `/stock/entries`
- `DETAIL` `/stock/entries/[id]`
- `FORM` `/stock/entries/new`
- `COLL` `/stock/items`
- `DETAIL` `/stock/items/[id]`
- `COLL` `/stock/warehouses`

### Platform, sessions, reliability, and remote work

- `DASH` `/home`
- `FORM` `/home/settings`
- `DASH` `/cloud`
- `WORKSPACE` `/cloud/gui`
- `FORM` `/cloud/settings`
- `WORKSPACE` `/cloud/terminal`
- `COLL` `/channels`
- `DETAIL` `/channels/[id]`
- `FORM` `/channels/gmail`
- `WORKSPACE` `/config`
- `COLL` `/killswitches`
- `COLL` `/notifications`
- `CANVAS` `/overview`
- `DASH` `/reliability`
- `WORKSPACE` `/sessions`
- `WORKSPACE` `/sessions/[sessionKey]/debug`

### Workforce

- `DASH` `/workforce`
- `COLL` `/workforce/activity`
- `DETAIL` `/workforce/agents/[id]`
- `COLL` `/workforce/approvals`
- `DASH` `/workforce/costs`
- `COLL` `/workforce/goals`
- `COLL` `/workforce/inbox`
- `COLL` `/workforce/issues`
- `DETAIL` `/workforce/issues/[id]`
- `CANVAS` `/workforce/org`
- `COLL` `/workforce/portfolios`
- `DETAIL` `/workforce/portfolios/[id]`
- `COLL` `/workforce/projects`
- `DETAIL` `/workforce/projects/[id]`
- `WORKSPACE` `/workforce/projects/[id]/pipelines`
- `DASH` `/workforce/reliability`
- `FORM` `/workforce/settings`
- `FORM` `/workforce/settings/agents`
- `PUBLIC` `/workforce/welcome`

### Public, auth, joining, and onboarding

- `PUBLIC` `/auth/reset`
- `PUBLIC` `/book/[slug]`
- `PUBLIC` `/invite/accept`
- `PUBLIC` `/join`
- `PUBLIC` `/join/sent`
- `PUBLIC` `/link/[code]`
- `PUBLIC` `/login`
- `PUBLIC` `/login/forgot`
- `PUBLIC` `/onboarding`
- `PUBLIC` `/onboarding/complete`

## Redirect/proxy routes (10; no screen frames)

- `/ads` → `/socials`, 301, preserves query.
- `/ads/[...path]` → `/socials/[...path]`, 301, preserves path/query.
- `/builder` → `/agents/builder`, 308.
- `/crm/cleanup` → `/crm/settings?tab=hygiene`, 308.
- `/pos` → first permitted POS child, 302; 403 when none are visible.
- `/shells` → `/cloud`, 307, preserves query.
- `/shells/[shellId]` → `/cloud?server=[shellId]`, 307, preserves the encoded legacy shell identifier.
- `/tools` → `/capabilities?tab=tools`, 307.
- `/terminal` → `/cloud/terminal`, 307, preserves query.
- `/workshop/[...path]` → `/agents/workshop/[...path]`, 308.

Root `/` is a hooks-level landing-page redirect and receives redirect-policy coverage, not a frame.

## Dynamic fixture registry (27)

- `system-agent-detail`: `/agents/autonomous/[id]` — visible system VM, health metrics, artifacts; include admin-only denial fixture.
- `built-agent-detail`: `/agents/builder/[id]` — draft agent, skills and ordered skill slots.
- `workshop-save`: `/agents/workshop/[id]` — persisted workshop save with agents, links, positions, and conversation state.
- `brain-detail`: `/brains/[id]` — brain, documents, timeline, access entries, roles, owner/non-owner personas.
- `plugin-channel-detail`: `/channels/[id]` — installed channel plugin control-center entry.
- `crm-contact-detail`: `/crm/[contactId]` — contact, identities, tags, score, journey, timeline, optional finance and connections.
- `invoice-detail`: `/finances/invoices/[id]` — invoice, lines, payments, CRM link, optional stock entry preview.
- `flow-detail`: `/flow-editor/[id]` — persisted editable flow with nodes/edges and schedule metadata.
- `master-flow-detail`: `/flow-editor/master/[id]` — valid static master-flow identifier; include invalid-id empty state.
- `builder-skill-detail`: `/flow-editor/skills/[id]` — builder skill/chapter graph plus fake-gateway tools.
- `marketplace-agent-detail`: `/marketplace/agents/[slug]` — stable marketplace catalog agent and assets.
- `plugin-detail`: `/plugins/[id]` — installed plugin control-center entry.
- `sales-order-detail`: `/sales/[id]` — owned order, timeline, available workflow transitions.
- `session-debug`: `/sessions/[sessionKey]/debug` — gateway debug session, events, paused step, timeout state.
- `social-campaign-detail`: `/socials/campaigns/[campaignId]` — campaign, reporting rows, media thumbnail, date range.
- `social-post-detail`: `/socials/posts/[postId]` — post, comments, insights, media.
- `stock-entry-detail`: `/stock/entries/[id]` — draft/submitted entry with lines, warehouses, items, party.
- `stock-item-detail`: `/stock/items/[id]` — item, bins, ledger, consumption, prev/next IDs.
- `support-ticket-detail`: `/support/[id]` — owned ticket, SLA, timeline, workflow transitions.
- `tool-detail`: `/tools/[id]` — create two fixture variants: gateway tool and Hub builder tool.
- `workforce-agent-detail`: `/workforce/agents/[id]` — Paperclip agent, harness and revision data.
- `workforce-issue-detail`: `/workforce/issues/[id]` — issue, approvals, evaluation/pipeline state and viewer role keys.
- `workforce-portfolio-detail`: `/workforce/portfolios/[id]` — portfolio, projects, rollup metrics, named lead agent.
- `project-detail`: `/workforce/projects/[id]` — local project, tasks/milestones/timesheets/timeline and optional Workforce linkage.
- `project-pipelines`: `/workforce/projects/[id]/pipelines` — project linked to Workforce project, pipelines, steps, agents.
- `public-booking-link`: `/book/[slug]` — public link, one/multiple event types, slot window, no-slots and confirmed booking states.
- `channel-link-code`: `/link/[code]` — future-expiry encoded channel/user payload plus authenticated user; invalid/expired states.

## Global/composed states to capture on `90 States and flows`

- Global: Sidebar expanded/collapsed, mobile Topbar, Dynamic Island, Command Palette, Notifications popup, Host overlay, Shortcuts overlay, Bug Reporter, Avatar menu.
- Dialogs: standard Modal, confirmation, destructive confirmation, Sheet, DraggableDialog wide and compact transformation.
- Agent/Builder: Agent Create Wizard steps, Skill Create Wizard steps, Registry Agent Sheet, Delete confirmation, chapter condition/delete dialogs, emoji picker, Dry Run panel.
- Brains: Brain Create, Add Source, access management.
- CRM: column filter, export, merge resolver, contact edit/delete and analysis-running states.
- Marketplace: Agent Creator Wizard and install/uninstall states.
- POS/Stock: Sellable Wizard, shift start/end, invoice-to-stock preview, submit/cancel confirmations.
- Settings: secret editor, CRT configuration, avatar editor, backups restore/confirm.
- Workshop: context menu, inbox, message board, pinboard, portal, relationship, rulebook, task prompt.
- Home/My Agent: artifact create/regenerate/history, email/event, image lightbox, notes/easel, transcription, Zen mode.

## Figma page mapping

- `00 Manifesto`
- `01 Foundations`
- `02 Components`
- `03 Shell and navigation`
- `10 Organization`
- `20 Agents and builders`
- `30 Business operations`
- `40 Platform and reliability`
- `50 Immersive workspaces`
- `60 Public and auth`
- `90 States and flows`
- `99 Current UI archive`

## Source-to-Figma discovery facts

- Product fonts: Inter 400/500/600/700; JetBrains Mono NF 400/400 italic/500/700. CRT uses Courier New fallback; Voxelized uses Pixelify Sans when available.
- Code Connect files: none found; component discovery step 2a-i is complete with no mappings.
- Canonical token authority: root `packages/design-tokens/contract.json`; generated `tokens.css`, Hub `src/app.css` overrides, and runtime presets in `src/lib/themes/presets.ts` consume or specialize that contract.
- The eventual current-UI archive must identify its actual source checkpoint and preserve observed inconsistencies; canonical foundations and Figma variables must follow the implemented contract rather than hand-entered values.
- Image-bearing routes/components require parallel `generate_figma_design` capture so image hashes can be transferred into reusable composed screens.

## 2026-07-14 Figma file checkpoint

- Owner/workspace: MINION (`team::1659021478034388080`), Professional tier, Full seat. The file originated in Sandbox and was moved by the user.
- Design file: [Minion Hub — UI Coherence & Screen Archive](https://www.figma.com/design/nOlaUw5ggsuBx2jknshFam), file key `nOlaUw5ggsuBx2jknshFam`.
- Initial inspection: one blank `Page 1`; zero variables, styles, components, or component sets.
- Created collections: `Minion / Color Primitives`, `Minion / Semantic Color`, `Minion / Spacing & Layout`, `Minion / Radius`, `Minion / Typography`, and `Minion / Motion & Layer`.
- Created variables: 32 hidden color primitives and 16 semantic aliases. The remaining foundation variables and every page/component/screen write are pending.
- Connector capacity: the former Sandbox Starter call-quota blocker is resolved by the move to MINION Professional.
- Theme modes: Professional's per-collection mode limit does not fit the implemented 16-theme contract in one collection. The user explicitly deferred themes while screens transfer; the contract must not be silently flattened or relabelled.
- Editable pilot: node `19:2` was imported at 1440x900 and named `home — wide — populated`, but its Figma screenshot was uniformly blank because capture submitted before hydration. It is rejected and will be deleted only after a visually valid replacement is verified.
- Capture harness: Hub `dev` includes readiness hardening at `bc6c343c`. It requires mounted meaningful UI and rejects single-color frames; one retry is allowed only for a confirmed local `504 Outdated Optimize Dep`.
- Authenticated capture source: localhost port 5173, exact base viewports 390×844, 1024×768, and 1440×900. Cookie values are read from the local browser session without being printed or persisted in the artifact.
- Server stability gate: use exactly one strict Vite process. Concurrent 5173/5174 processes were proven to corrupt the shared optimize-deps/generated caches and are not an accepted capture topology.

## Pending capture and Figma gates

- Finish and audit the authenticated local 408-viewport current-state bundle, with explicit records for authentication redirects, failed routes, and states that are not actually provisioned.
- Validate and replace the rejected `/home` wide editable pilot, then transfer all 136 screens at compact/medium/wide and reconcile route keys back to code.
- After screen coverage is complete, finish the deferred theme modes and construct/reconcile canonical components and component keys.
- Run the implemented deterministic persona/state harness against a safe seeded disposable Supabase environment for named non-default states; a live current-state screenshot must not be relabelled as a provisioned populated/loading/error state.
