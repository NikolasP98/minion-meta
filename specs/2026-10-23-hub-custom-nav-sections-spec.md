---
id: 2026-10-23-hub-custom-nav-sections-spec
title: Hub custom navigation sections with alias pages and per-section RBAC
stage: spec
status: review
pass: 2
created: 2026-10-23
updated: 2026-10-23
repos: [minion_hub, minion-meta]
type: feature
verdict: pending
tags: [security, data, permissions, ui]
---

## 0. Product

Spec Kit feature: [`specs/037-custom-nav-sections/`](037-custom-nav-sections/spec.md), with `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md` alongside. **Pass 2 = Amendment A (symlink model, 2026-10-23).**

Owner's words (v1): "users create their own pages/sections … re-use existing pages from other sections (the url to this new page would be new, even though they point to the same destination) … move /pos/sell to my new /staff section, so /staff/sell shows exactly the contents of /pos/sell … these sections/pages would have their own rbac." Amendment A (verbatim): "it'd behave like a symlink … there's a "main" location which is pos/sell … the user right-clicks the pos/sell navmenu item and the context menu shows duplicate/copy options, along with a move option (… new routes would be /<section>/<page>/<subpages>) … a context menu for items (copy/duplicate/move/rename/delete/hide), and a general context menu (new page/paste/etc). RBAC view rules are tied to pages, and the edit/delete rules are tied to data."

Every hub page has one **main** location and any number of **links**; an org admin reshapes navigation from context menus on the sidebar (Copy · Duplicate · Move · Rename · Hide · Delete/Restore · Permissions; New section/page · Paste; Not shown), reusing the hub's `ContextMenu` primitive. Entries map a URL **prefix** (`/staff/sell/<rest>` → `/pos/sell/<rest>`) through a universal SvelteKit `reroute`; the server guards and `canViewPath` evaluate the rewritten target path. **View rules are per page** — a link's rule is a `permission_rules` row (`nav.<pageId>`) edited in Settings → Roles, default = the target's own policy; **edit/delete stay the module's data capabilities** at the API. A link may relax a target's page-level view policy down to the **module-view floor**, never below it, because target server loads read data with no capability check of their own (invariant I1′, anchored). A moved page's old URL keeps resolving and client-replaces to the new main. Storage: one jsonb document per org (`app_nav_config`). No new route. Security + data tagged: the owner approves the spec before code and merges every slice. Open owner decisions D5 (link relaxation), D6 (hide scope), D7 (old URL after move) carry recommended defaults.

**Out of scope:** free-content pages (sandbox spec 010/013/014); re-pointing a native nav item at a moved main; rewriting outbound hard links; rename redirects; per-user hide; nested sections; Duplicate/Paste inside built-in sections; a per-link permissions dialog; optimistic-concurrency precondition on the PUT.

**Verification:** DELTA T1–T11 in the Spec Kit spec, each with its proving test; end-to-end `quickstart.md` Q1–Q20 on the QA stack with owner/staff/viewer/custom-role personas; evidence under `specs/037-custom-nav-sections/evidence/`.
