# ERP core modules production-readiness: CRM, Stock, Scheduling + Attachments as a core component

**Status:** delivered (11 slices merged to hub master and verified in production at `b5d40c7b`, 2026-09-12 02:50 UTC)
**Owner brief (verbatim):**

> Okay, I need you to now focus on 3 modules: CRM, Stock, Scheduling. These need to be production-ready:
> - Scheduling should alow the user to CRUD events, link them to CRM entries, services, invoices. See, everything should be interconnected (not mandatory, but a nice to have). Make sure schedules render correctly, that moving items around render correctly as well.
> - Event elements should be highly interactive and visual. events should be colored based on their own tags (and have visual elements from tags inherited from other modules; eg. crm client with tags should show small artifacts on the event - toggleable; eg. show a red dot on events where the customer is tagged as "VIP", "MODEL", etc)
> - Verify module interconnections;
>
> I also want attachments to be more of a core component of the minion ERP. attach documents to CRM entries, for example. Include an attachment button (with size limits) on crm users, on events, on services, items, invoices. Create a system that properly maps items to objects. For example, a document can connect to single or multiple types of objects like a CRM contact, an event and an invoice at the same time.

## Scope

Hub (`minion_hub`, base `origin/master` = post-360 `c4878dbb`). Three modules to production quality plus one new cross-cutting primitive.

### A. Scheduling
1. Full CRUD for events (create/edit/move/resize/delete) with correct rendering in day/week/month/agenda after every mutation (optimistic move + server confirm; timezone-correct per `sched_resources.timezone`, see hub PR #249 / plan 13-13).
2. Links from an event to: CRM contact(s), catalog services (sellables), invoices (`fin_invoices` / POS). Optional, never mandatory.
3. Event visuals: colour from the event's own tags (`crm_tags` + `tag_links`, spec `2026-09-08-hub-scheduling-calendar-views-tags-spec.md`); inherited artifacts from linked objects (e.g. a red dot when the linked contact carries `VIP`/`MODEL`), toggleable per user (persisted view preference).
4. Drag/drop/resize correctness (existing @event-calendar/core integration, PR #244 + #249) verified by Playwright fixtures at 390/768/1280.

### B. CRM and C. Stock
Production-readiness audit of the existing modules (server actions, RLS, forms, tables, Picker adoption, empty/error states, route contract), fixing what blocks daily use; interconnection verification (CRM ↔ scheduling bookings ↔ catalog services ↔ stock consumption ↔ invoices).

### D. Attachments as a core primitive
- New `attachments` domain: one document row (B2 object via the presigned storage driver, hub PR #119 lineage), plus a polymorphic link table `attachment_links(attachment_id, object_type, object_id, org_id, …)` so one document can attach to a CRM contact, an event and an invoice at once.
- Size limits (per-file and per-org quota), MIME allowlist, org-scoped RLS, audit of who attached/unlinked.
- One shared `AttachmentButton` / `AttachmentList` component used on: CRM contacts, scheduling events, catalog services, stock items, invoices.
- Server API: upload intent (presigned), finalize, link/unlink, list-by-object, download (presigned GET), delete (only when no links remain, or explicit).

## Delivery method
Same discipline as the 360 program: per-slice PRs off `origin/master`, focused vitest + `bun run check` + `lint:design`/`lint:tokens` + route-contract re-pin, owner `--admin` merge (train script `~/.cache/claude-tmp/hub-merge-train.sh` pattern), Vercel prod verification. UI work follows the design-token contract (`ui-design-governance` skill).

## Recon output
`specs/2026-09-12-erp-core-modules-attachments-recon.md` (written by the recon agent): current state of each module on master, schema/tables involved, existing tag/link mechanisms, storage driver status, gaps vs. this brief, proposed slice order.

## Delivery ledger (root-maintained; Codex-verifiable)

Base: hub `origin/master` `c4878dbb`. Slice numbers from the recon §6.2. Each row is updated when the state changes.

| Slice | Scope | Worktree | Branch / PR | State | Prod verify |
|---|---|---|---|---|---|
| S1+S2 | attachment_links migration + attachments.service + limits + presigned PUT + `/api/attachments/*` (+root: per-object capability guard instead of prefix pin) | `~/.cache/claude-tmp/erp-att` | `feat/erp-s1-s2-attachments-backend` → hub #260 | MERGED `abba212f` | ✅ prod `7a12ad67`; `hub_migrations` has 20260912090100 (01:59:54Z); `/api/attachments*` answer 401 unauthenticated |
| S5 | booking update/delete service + PATCH/DELETE + BookingEditForm + edit page | `~/.cache/claude-tmp/erp-s5` | `feat/erp-s5-booking-edit-delete` → hub #262 | MERGED `7a12ad67` | ✅ prod `7a12ad67`; `DELETE /api/scheduling/bookings/:id` 401, edit page 302→login |
| S7 | tag-driven event colour, origin-grouped artifacts, per-user toggle, window-overlap fix | `~/.cache/claude-tmp/erp-s7` | `feat/erp-s7-tag-event-visuals` → hub #258 | MERGED `14c6525e` | ✅ prod `7a12ad67` (GitHub deployment success 02:11Z; login 200, health 401) |
| S11 | EmptyState ×5, archived-warehouse guard, `MODULE_SUBRESOURCES.stock`, CRM owner-scope audit (+root: single-contact PATCH/DELETE owner-scoped) | `~/.cache/claude-tmp/erp-s11` | `feat/erp-s11-stock-crm-readiness` → hub #261 | MERGED `11e2e17f` | ✅ prod `7a12ad67` |
| S3 | `AttachmentButton`/`AttachmentList` on CRM contact + booking (+root: proxied `/api/files` fallback) | `~/.cache/claude-tmp/erp-s3` | `feat/erp-s3-attachment-ui` → hub #263 | MERGED `e17a8cb6` | ✅ prod `b5d40c7b` |
| S4 | attachments on services, stock items, invoices, products | `~/.cache/claude-tmp/erp-s4` | `feat/erp-s4-attachments-everywhere` → hub #266 | MERGED `b2916eee` | ✅ prod `b5d40c7b` |
| S6 | booking ↔ invoice link | `~/.cache/claude-tmp/erp-s6` | `feat/erp-s6-booking-invoice-link` → hub #264 | MERGED `eae723ed` (migration 20260912090200 applies on the prod build) | ✅ prod `b5d40c7b` |
| S8 | shared TagChip/TagDot + tag column on /crm/customers + `tag_links` ordered by position | `~/.cache/claude-tmp/erp-s8` | `feat/erp-s8-shared-tag-chip` → hub #267 | MERGED `b5d40c7b` | ✅ prod `b5d40c7b` |
| S9 | calendar e2e move/resize/409 at 390/768/1280 (18/18 + 16/16 regression; no product change needed) | `~/.cache/claude-tmp/erp-s9` | `test/erp-s9-calendar-interactions-e2e` → hub #265 | MERGED `357490ec` | ✅ prod `b5d40c7b` |
| S10 | bookings card on CRM contact detail | `~/.cache/claude-tmp/erp-s10` | `feat/erp-s10-crm-bookings-card` → hub #259 | MERGED `8a32e6c6` | ✅ prod `7a12ad67` |

### Owner items (surfaced during delivery)
- **B2 bucket CORS for browser-direct PUT** (S2/S3): the presigned-PUT path needs a CORS rule on the `minionhub` bucket allowing `PUT` (+ `Content-Type` header) from `https://hub.minion-ai.org` (and preview origins if wanted). Until then the client helper falls back to the server-proxied `POST /api/files` for files ≤ 4 MB; larger files fail with the PUT error. Not verifiable from this session (needs B2 credentials). See also [[backblaze-b2-bucket-audit]].
- Sweeper for `files` rows whose finalize never runs (abandoned browser uploads) — `TODO(handoff)` in `attachments.service.ts`.
- Owner-scope gaps left as `TODO(handoff)` (S11): `crm/insights` aggregates org-wide; `cleanup/standardize` takes no ownerId.

### Program delivery state at close (2026-09-12 02:55 UTC)
- Hub `origin/master` tip `b5d40c7b`; GitHub Production deployment `success` (02:49:59Z); smoke: `/en/login` 200, `/api/health` 401, `/api/attachments/intent` 401, `/api/finances/invoices?q=` 401 (auth-gated, routes live), `/en/crm/customers` 302→login.
- `hub_migrations` carries `20260912090100` (attachment_links, 01:59:54Z) and `20260912090200` (sched_bookings.invoice_id, 02:35:14Z) — both applied by the production build's `db:migrate` gate; no manual owner step was needed.
- PRs in merge order: #258 S7 `14c6525e` · #259 S10 `8a32e6c6` · #260 S1+S2 `abba212f` · #261 S11 `11e2e17f` · #262 S5 `7a12ad67` · #263 S3 `e17a8cb6` · #264 S6 `eae723ed` · #265 S9 `357490ec` · #266 S4 `b2916eee` · #267 S8 `b5d40c7b`. Every PR: root re-ran targeted vitest, `bun run check` 0/0, `lint:design`/`lint:tokens` 0, prettier, ui-audit re-pin; CI green; `--admin` squash under the owner's standing authorization.
- Not browser-verified in production (no credentials in this session): the upload flow end-to-end (needs the B2 CORS owner item for >4 MB files; ≤4 MB uses the proxied fallback), the calendar visuals on real data (covered by the fixture e2e at 390/768/1280).
- Receipts: `~/.cache/claude-tmp/erp-<slice>/checks/root-*.log` (root gate reruns) and executor logs alongside; train logs `~/.cache/claude-tmp/erp-train-*.log`.
