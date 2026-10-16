---
id: 2026-10-16-hub-sandbox-pages-followups
title: Sandbox pages — open ends after the admin-only POC
status: draft
created: 2026-10-16
updated: 2026-10-16
repos: [minion_hub, minion-meta]
tags: [security, logic]
value: 7
effort: M
parent: 2026-10-15-agent-harness-restoration
---

# Sandbox pages — follow-ups (open-items ledger for spec 010)

Spec: `specs/010-hub-sandbox-pages/`. POC: hub branch `feat/sandbox-pages-poc` (draft PR, owner approval gate).

## Open ends left by the POC (each has a `TODO(handoff)` at its site)

1. **A `sandbox` RBAC module instead of `role:admin`.** Page, element writes and nav are admin-only; the query endpoint is already member-safe (capability + owner scope + masking). Add module `sandbox` (view/create/edit/delete), `ROUTE_VIEW_PERMS`, nav `requires`, and drop `requireAdmin` on element writes. Blocks sharing.
2. **Sharing and ownership.** Elements carry `created_by`; there is no per-element visibility, no per-user page. Decide per-org vs per-user pages (spec clarification 1).
3. **Write tools.** Elements are read-only. Writes should go through the generic dispatcher (spec 004), never a second write path.
4. **Vendor allowlist.** Only `echarts` is served; add `dayjs` (dates in element JS) as one line in `src/lib/sandbox/vendor.ts`. The production hashed-asset path was inferred from `vite dev`, not observed in a `bun run build`.
5. **Dataset registry gaps.** No cost basis for gross margin: expose `stock.bins` (`item_id`, `warehouse_id`, `qty`, `valuation_rate`) and a `fin_product_id → stk_items` link so an element can compute margin; `pos.ticket_lines` lacks `shift_id`.
6. **`+page.server.ts` loads elements through `fetch('/api/sandbox/elements')`** instead of the service (`listElements`) — one import once the files are co-reviewed.
7. **`tools.ts` re-declares `minion:sandbox-changed`** instead of importing `SANDBOX_CHANGED_EVENT` from `host.svelte.ts`.
8. **JEV `sandbox` manifest loads on every `record_action` turn app-wide** (mode rule from hub #540); the envelope injects the protocol only on `/sandbox`, so the cost is a flag, but calibrate the noul once there is traffic.
9. **Live chat proof is pending a gateway.** `dev:local` ships no gateway (`MINION_GATEWAY_URL` empty in `.env.qa`), so the POC was proven through the same tool path the assistant uses (`__minionAssist.executeTool`), not through a model turn. Run the owner's prompt on a gateway-backed preview after approval.
10. **QA-stack defect found on the way:** `bun run qa:reset` restores an older snapshot while cluster roles persist, so `20261003150000_notification_event_outbox.sql` refuses ("Notification role already exists"). Workaround: `qa:down --volumes` + `dev:local`. The guard should tolerate pre-existing roles when the baseline is being restored.
11. **Element limits.** 64 KB per element and 1000 rows per query are fixed constants; no per-org quota, no rate limit on `/api/sandbox/query`.

## Added 2026-10-16 (spec 013 — canvas awareness, editable layout, two-tier builder)
- `describeElement` infers datasets/chart type from the element JS by regex (`src/lib/sandbox/canvas.ts`, `TODO(handoff)`); an element that builds its query spec dynamically reports "no query". Upgrade: a declared `meta` field on the element record written by `sandbox.upsert_element`.
- Tier 1 as a sub-session (`sessions_spawn`) so element HTML/JS never enters the main assistant context; today both tiers run in one turn.
- `EditableGrid` controlled mode: during a drag the preview order can differ from the saved order for one write round-trip (Playwright proof 2026-10-16: dragged cell at index 1 after drop, index 0 after Done; final state correct). Cause: `saved` is cleared when `items` reload mid-drag. Fix: ignore reloads while `dragId`/`resizeId` is set.
- The sandbox now inherits `EditableGrid`'s narrow-container fallback (one column ≤ 620px) instead of its old 2-column step at 1024px.

## Added 2026-10-16 (spec 014 — component library)
- Agent-facing library: a `sandbox.library` tool (list shared/own components) and a line in the canvas map pointing at reusable components, so tier 2 can reuse instead of rebuild.
- Panel shows title + size only; a thumbnail/preview (render the srcdoc at small scale) would make picking easier.
- Library entries are snapshots: no versioning, no "update copies from the library"; cross-org sharing out of scope.
- `mine` relies on `created_by`; rows created before that column was populated show as not mine.
