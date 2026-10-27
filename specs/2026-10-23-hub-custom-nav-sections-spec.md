---
id: 2026-10-23-hub-custom-nav-sections-spec
title: Hub custom navigation sections with alias pages and per-section RBAC
stage: spec
status: review
pass: 3
created: 2026-10-23
updated: 2026-10-23
repos: [minion_hub, minion-meta]
type: feature
verdict: pending
tags: [security, data, permissions, ui]
---

## 0. Product

Spec Kit feature: [`specs/037-custom-nav-sections/`](037-custom-nav-sections/spec.md), with `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md` alongside. **Pass 2 = Amendment A (symlink model); pass 3 = Amendment B (page roles vs data roles, page ids in URLs), both 2026-10-23.**

Owner's words (v1): "users create their own pages/sections … re-use existing pages from other sections (the url to this new page would be new, even though they point to the same destination) … move /pos/sell to my new /staff section, so /staff/sell shows exactly the contents of /pos/sell … these sections/pages would have their own rbac." Amendment A (verbatim): "it'd behave like a symlink … there's a "main" location which is pos/sell … the user right-clicks the pos/sell navmenu item and the context menu shows duplicate/copy options, along with a move option (… new routes would be /<section>/<page>/<subpages>) … a context menu for items (copy/duplicate/move/rename/delete/hide), and a general context menu (new page/paste/etc). RBAC view rules are tied to pages, and the edit/delete rules are tied to data."

Every hub page has one **main** location and any number of **links**; an org admin reshapes navigation from context menus on the sidebar (Copy · Duplicate · Move · Rename · Hide · Delete/Restore · Permissions; New section/page · Paste; Not shown), reusing the hub's `ContextMenu` primitive. Entries map a URL **prefix** (`/staff/sell/<rest>` → `/pos/sell/<rest>`) through a universal SvelteKit `reroute`; the server guards and `canViewPath` evaluate the rewritten target path. **Two role axes (owner, Amendment B):** *page roles* say who may navigate to each page instance or section (`permission_rules` keys `page:<id>` / `page:<pattern>` / `section:<id>`, defaults = today's route policies, edited from the context-menu "Access…" dialog by `users:manage` holders); *data roles* say who may view/add/edit/remove each dataset and are enforced on reads by **spec 039** (`2026-10-23-hub-data-source-rbac-spec`). Until 039 covers a module, the module-view floor stays for custom instances (I1‴, keyed on the shared `DATASET_ENFORCED` constant) because 62 of 73 `(app)` server loads read tenant data with no capability check. **Page ids in URLs:** every custom instance is `/<section>/<slug>~<id>` (6-char id, resolved by id; slug cosmetic), so duplicates never collide and Duplicate/Paste into built-in sections is allowed; built-in mains keep their readable path; a moved page's old URL keeps resolving and client-replaces. Storage: one jsonb document per org (`app_nav_config`). No new page route. Security + data tagged: the owner approves the spec before code and merges every slice. Open decisions D8 (slug cosmetic), D9 (`~` marker), D10 (built-in module headers) carry recommended defaults.

**Out of scope:** free-content pages (sandbox spec 010/013/014); re-pointing a native nav item at a moved main; rewriting outbound hard links; per-user hide; nested sections; `section:<module>` rows for built-in modules; data-read enforcement and denied visuals (spec 039); optimistic-concurrency precondition on the PUT.

**Verification:** DELTA T1–T11 in the Spec Kit spec, each with its proving test; end-to-end `quickstart.md` Q1–Q21 on the QA stack with owner/staff/viewer/custom-role personas; evidence under `specs/037-custom-nav-sections/evidence/`.
