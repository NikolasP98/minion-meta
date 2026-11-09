# Kind modules, registries and HTTP surface

## Why kinds are discovered by file convention

Three slices (S2 form, S5 FAQ, S6 offer) each add one kind, and they run in parallel. A hand-written
`switch(kind)` in the public page, the editor page and the PATCH validator would be three shared
files touched by three PRs. Instead S0 writes three small registries with Vite `import.meta.glob`
(eager). A kind slice **only adds new files** at fixed paths. A kind with no module is not
creatable (POST 400 `unknown_kind`), and its doors 404 publicly. About 10 lines per registry,
no shared edits.

| Registry (S0 owns) | Globs | Each kind file exports |
|---|---|---|
| `src/lib/doors/kinds.ts` | `./kinds/*.ts` | `kind`, `configSchema` (zod), `defaultConfig` |
| `src/server/doors/kinds.ts` | `./kinds/*.server.ts` | `kind`, `publicView(ctx, door) → Promise<PublicDoorData>` (public-safe projection; no PII, no drafts) |
| `src/lib/components/doors/registry.ts` | `./*/Public.svelte`, `./*/Editor.svelte`, `./panels/*.svelte` | Public/Editor default components; panels also `export const kinds: DoorKind[]` from `<script module>` |

Kind file paths (created by the kind's slice):

| Kind | Slice | Files |
|---|---|---|
| form | S2 | `src/lib/doors/kinds/form.ts`, `src/server/doors/kinds/form.server.ts`, `src/lib/components/doors/form/{Public,Editor}.svelte`, `src/lib/components/doors/panels/SubmissionsPanel.svelte` |
| faq | S5 | `src/lib/doors/kinds/faq.ts`, `src/server/doors/kinds/faq.server.ts`, `src/lib/components/doors/faq/{Public,Editor}.svelte` |
| offer | S6 | `src/lib/doors/kinds/offer.ts`, `src/server/doors/kinds/offer.server.ts`, `src/lib/components/doors/offer/{Public,Editor}.svelte` |
| (follow-up panel) | S4 | `src/lib/components/doors/panels/FollowUpPanel.svelte` (`kinds = ['form']`) |

Component props (S0 fixes them; slices implement them):
- `Public.svelte`: `{ door: { slug, title, description }, data: PublicDoorData, attribution: Attribution }`
- `Editor.svelte`: `{ config: unknown, onchange: (config) => void, canManage: boolean }`. S0's editor page owns save, dirty state and the PATCH. The kind editor is a controlled component.
- Panel: `{ door: DoorRow, canManage: boolean }`. A panel fetches its own data.

## HTTP surface

| Route | Method | Slice | Auth | Notes |
|---|---|---|---|---|
| `/d/[slug]` (page) | GET | S0 | public | Resolves the door (bypass-RLS slug → org, then `withOrgCore`), checks crm module and kind registered, records a view (bot user agents skipped), returns `{door, kind, data: publicView(), attribution}`. 404 for unknown, off or unregistered doors. |
| `/api/crm/doors` | GET | S0 | `crm:view` | Doors + booking links + funnel (`?from&to`, default last 30 days). |
| `/api/crm/doors` | POST | S0 | central gate `crm:create` + handler `requireOrgCapability(locals,'crm','manage')` | `{kind, slug, title}` → creates with `defaultConfig`, `active=false`. 409 `slug_taken`. |
| `/api/crm/doors/[id]` | GET | S0 | `crm:view` | Full door incl. config (drafts included). |
| `/api/crm/doors/[id]` | PATCH | S0 | `crm:manage` | Partial `{title?, description?, slug?, active?, config?}`. `config` is validated by the kind's `configSchema`. No DELETE route (FR edge case: switch off instead). |
| `/api/doors/public/[slug]/submit` | POST | S2 | public (in `API_HANDLER_AUTH_PATHS` via prefix `/api/doors/public`) | Rate limit 5/min IP+slug, honeypot `website`, dynamic zod, consent. → `{ok:true, message}`. |
| `/api/crm/doors/[id]/submissions` | GET | S2 | `crm:view`, values masked if `shouldMaskSensitive(locals,'crm')` | `?cursor&limit≤50`. |
| `/api/crm/doors/[id]/follow-up` | PUT | S4 | `crm:manage` | Body `FollowUp`. `accountId` must be in `getChannelCatalog` for the org. Also returns `{counts:{sent,failed,skipped}}` on GET. |
| `/api/crm/doors/[id]/follow-up` | GET | S4 | `crm:view` | Config + counts + last 20 rows (recipient masked per crm field level). |
| `/api/crm/doors/[id]/faq-draft` | POST | S5 | `crm:manage` | → `{drafts:[{q,a,count}]}`, saves nothing. 503 `ai_not_configured`. 429 per-org limiter. |
| `/api/crm/contacts/[id]/next-offers` | GET | S3 | `crm:view` + `ownerFilter` (404 on non-owned) | → `{bought:[{productId,name,times,lastAt}], suggestions:[{productId,name,unitPrice,coBuyers,stepUp}], basis:'co_purchase'|'top_sellers'}`. Empty if the `pos` module is off. |
| `/api/scheduling/public/[slug]/book` | POST | S1 (edit) | public (existing) | Accepts optional `attribution` (strict zod). |

API routes are not count-pinned (scanner lower bound only, `frontend-contract-scanner.test.ts:11`),
so S2–S5 add endpoints **without** touching the route contract. Only S0 adds pages.

## Server functions (S0 exports, others import; signatures are frozen by this contract)

```ts
// src/server/services/crm-contact-ensure.ts  (moved from scheduling-bookings.service.ts:264-351; use the
// exported phone9 from party.service.ts:34 if it is byte-identical to the private copy at :259, else keep the copy private)
export async function resolveCrmContact(tx: CoreTx, orgId: string, phone?: string|null, email?: string|null): Promise<string|null>;
export async function ensureCrmContact(tx: CoreTx, orgId: string, input: {
  name?: string|null; phone?: string|null; email?: string|null;
  source: string;                 // 'booking' | `door:${slug}`
  firstTouch?: Attribution|null;  // written only on INSERT
}): Promise<{ id: string; created: boolean } | null>;

// src/server/services/doors.service.ts
export async function resolvePublicDoor(slug: string): Promise<{ ctx: CoreCtx; door: DoorRow } | null>;
export async function bumpDoorStat(ctx: CoreCtx, doorKey: string, field: 'views'|'submissions'): Promise<void>; // fail-soft, never throws
export function isLikelyBot(userAgent: string | null): boolean;
export async function listDoorsWithFunnel(ctx: CoreCtx, range: { from: string; to: string }): Promise<DoorListRow[]>;
export async function createDoor(ctx: CoreCtx, input: { kind: DoorKind; slug: string; title: string; createdBy?: string }): Promise<DoorRow>;
export async function updateDoor(ctx: CoreCtx, id: string, patch: DoorPatch): Promise<DoorRow | null>;
export async function getDoor(ctx: CoreCtx, id: string): Promise<DoorRow | null>;
```
