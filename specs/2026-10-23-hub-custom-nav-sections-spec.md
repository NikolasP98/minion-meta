---
id: 2026-10-23-hub-custom-nav-sections-spec
title: Hub custom navigation sections with alias pages and per-section RBAC
stage: spec
status: review
pass: 1
created: 2026-10-23
updated: 2026-10-23
repos: [minion_hub, minion-meta]
type: feature
verdict: pending
tags: [security, data, permissions, ui]
---

## 0. Product

Spec Kit feature: [`specs/037-custom-nav-sections/`](037-custom-nav-sections/spec.md), with `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md` alongside.

Owner's words: "users create their own pages/sections … re-use existing pages from other sections (the url to this new page would be new, even though they point to the same destination) … move /pos/sell to my new /staff section, so /staff/sell shows exactly the contents of /pos/sell … these sections/pages would have their own rbac."

An org admin creates sidebar sections (own URL prefix, role grants) and adds alias pages that render existing hub screens at new URLs. A universal SvelteKit `reroute` maps the alias to the target route; the existing server guards and `canViewPath` evaluate the target plus the alias grant, so an alias can only narrow access, never widen it (invariant I1). Storage is one jsonb document per org (`app_nav_config`), managed at `/settings/navigation`. Security + data tagged: the owner approves the spec before code and merges every slice. Three owner decisions (D1 intersect-vs-replace RBAC, D2 no free-content pages in v1, D3 keep the target's section nav) carry recommended defaults at the top of the spec.

**Out of scope:** free-content pages (sandbox pages, spec 010/013/014); replacing the target's section nav inside an aliased screen; rewriting outbound hard links under the alias prefix; rename redirects; per-user grants; nested sections; aliases with query strings or dynamic params; palette/assistant integration of alias pages.

**Verification:** DELTA T1–T10 in the Spec Kit spec, each with its proving test; end-to-end `quickstart.md` Q1–Q15 on the QA stack with owner/staff/viewer personas; evidence under `specs/037-custom-nav-sections/evidence/`.
