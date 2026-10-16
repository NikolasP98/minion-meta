# Contracts — sandbox query DSL, element record, iframe bridge, assistant tools

## 1. Query spec (`POST /api/sandbox/query`, also `sandbox.preview` tool input)
```ts
interface QuerySpec {
  dataset: string;                       // registry id, e.g. 'pos.ticket_lines'
  select?: string[];                     // allowed columns; default = registry default columns
  where?: Array<{ col: string; op: Op; value?: unknown }>;   // AND-ed
  orderBy?: Array<{ col: string; dir?: 'asc' | 'desc' }>;
  limit?: number;                        // default 100, max 1000 (clamped)
  groupBy?: string[];
  aggregate?: Array<{ fn: 'count' | 'sum' | 'avg' | 'min' | 'max'; col: string; as: string }>;
}
type Op = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'in'|'between'|'like'|'startsWith'|'isNull';
// Response
interface QueryResult { dataset: string; columns: Array<{name: string; type: string}>; rows: Record<string, unknown>[]; limited: boolean; elapsedMs: number }
// Errors: 400 { error: 'unknown column "x" for dataset "y"' | 'unknown dataset' | 'unknown op' }, 403 { error: "Your role does not permit 'view' on <module>." }
```
Compiler guarantees: identifiers only from the registry (never from input), values always bound as parameters, `like/startsWith` escape `%` and `_`, `in` ≤ 100 values, statement timeout 5 s, one `org_id = $1` predicate always present (plus RLS via `withOrgCore`).

## 2. Dataset catalog (`GET /api/sandbox/datasets`, `sandbox.datasets` tool)
```ts
interface Dataset { id: string; module: Module; meaning: string; columns: Array<{ name: string; type: 'text'|'number'|'timestamp'|'boolean'|'uuid'; meaning?: string; pii?: boolean }>; defaultOrder: string }
```
POC registry (base SQL joins only where needed):
- `crm.contacts` (crm): display_name, source, human_id, created_at, party_id, owner_id · owner column `owner_id`
- `pos.tickets` (pos): human_id, customer_name(pii), status, subtotal, discount, total, currency, submitted_at, voided_at, shift_id, crm_contact_id
- `pos.ticket_lines` (pos): ticket_id, kind, description, qty, unit_price, discount, total, fin_product_id, product_name (join fin_products), submitted_at (join pos_tickets), ticket_status
- `pos.payments` (pos): ticket_id, shift_id, method, amount, paid_at
- `finance.invoices` (finance): number, issued_at, client_name(pii), client_email(pii), currency, subtotal, tax, total, status
- `finance.products` (finance): code, name, category, unit_price, active, kind
- `scheduling.bookings` (scheduling): start_time, end_time, status, title, attendee_name(pii), crm_contact_id, product_id
- `stock.items` (stock): code, name, uom, item_group, reorder_level, qty_on_hand (sum stk_bins.qty), valuation (sum qty*valuation_rate)

## 3. Element record (`/api/sandbox/elements`)
```ts
interface SandboxElement { id: string; page: string; title: string; html: string; css: string; js: string; w: 1|2|3|4; h: 1|2|3|4; position: number; createdBy: string; updatedAt: string }
// POST body: Omit<…,'id'|'createdBy'|'updatedAt'|'position'> ; PATCH: Partial ; limits: html+css+js ≤ 64 KB
```

## 4. Iframe bridge (inside srcdoc, `window.minion`)
```ts
minion.query(spec: QuerySpec): Promise<QueryResult>     // host → POST /api/sandbox/query with the user's session
minion.ready(fn: () => void)                             // after vendor scripts loaded
minion.theme: Record<string, string>                     // semantic tokens as CSS vars (also applied on :root)
minion.echarts: Promise<typeof echarts>                  // lazily injects the vendor script tag
minion.size: { w: number; h: number }                    // element box in px; 'resize' event re-fires
```
Wire protocol (postMessage, both directions): `{ minion: 1, elementId, requestId, type: 'query'|'result'|'error'|'ready'|'resize'|'theme', payload }`. Host accepts only messages whose `source` is one of its own element frames and whose `elementId` matches; frames accept only messages from `parent` with `minion: 1`.
Srcdoc template: `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' {origin}; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'"><style>:root{…tokens}</style><style>{css}</style><body>{html}</body><script>{bridge}</script><script>{js}</script>`.

## 5. Assistant tools (page-scoped; names and schemas in `src/lib/sandbox/tools.ts`)
- `sandbox.datasets {}` → catalog (§2).
- `sandbox.preview {spec}` → `{columns, sample: rows.slice(0,20), rowCount}`; always call before building a new visual.
- `sandbox.upsert_element {id?, title, html, css?, js, w?, h?}` → `{id}`; element re-renders immediately.
- `sandbox.remove_element {id}`; `sandbox.list_elements {}` → `[{id,title,w,h}]`.
Authoring protocol (the `sandbox` manifest text, ≤1.2 KB): one visual per element; use `minion.query` inside `minion.ready`; put calculations in JS; charts via `await minion.echarts` with `minion.theme` colours; size `w` 1–4 columns; no external URLs (blocked); error → show the message in the element.
