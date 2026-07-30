# CRM Relationship Graph v2 — Real Relationships (Spec v2)

Date: 2026-07-23
Status: CONSULTED — Codex (sol/xhigh) verdicts folded in; the "v2 revisions"
section OVERRIDES the corresponding v1 sections. Implementation follows WP0–WP3.
Builds on: `specs/2026-07-22-personal-org-differentiation-spec.md` (WP3 shipped the
v1 graph), Unified Brains architecture (canonical Supabase retrieval; Qdrant serving
plane exists but is IN SHADOW — hub queries MUST keep using `searchBrainHybrid`).

## Goal (user directive, verbatim intent)

"I want to see REAL relationships (remove channel node): eg. mom, dad, sister,
friend, friend from work, acquaintance from tennis, etc. True custom relationship
labels." Sourced from the per-org knowledge store (brains/vector retrieval) plus raw
DB data, with user-editable custom labels.

## Recon facts (verified 2026-07-23)

- `searchBrainHybrid(ctx, brainId, query, options, principal)`
  (brain-hybrid-retrieval.service.ts:1205) is an internal server-callable: 3 lanes
  (pgvector cosine / websearch tsquery / pg_trgm) fused by weighted RRF; options
  include `metadata` JSON-contains filter + `connectors` + `sourceIds`. ANN indexes
  were DROPPED (storage incident) — vector lane = exact scan; acceptable for a
  background job, NOT a hot path. Embeddings: text-embedding-3-small 1536-dim via
  OpenRouter/OpenAI; when unavailable, retrieval silently degrades to lexical+fuzzy.
- Chunk→contact linkage is INDIRECT: `knowledge_chunks.metadata.chatId` (+ source
  `connector`/`externalKey`) resolved against `crm_contact_identities
  (channel, external_id)`. No contact FK on chunks.
- Hub LLM pattern (the template): crm-conversation-analysis.service.ts tick —
  in-tx advisory lock (`pg_try_advisory_xact_lock(hashtext(...))`) + dirty-set
  selection; OUT-of-tx `generateText` (Vercel AI SDK, `getOpenRouterModel`,
  gemini-2.5-flash default, 45s AbortSignal, raw-JSON prompt parsed by
  all-`.default()` Zod) with `mapWithConcurrency` per-item try/catch; in-tx batched
  upsert + `analyzed_at` gate. There is NO gateway `drones.execute` client in hub.
- Storage precedent: reserved key `custom_fields._funnel` (hidden from editor,
  merge protects user edits). No party_links table (by design; unchanged).
- Graph: v1 emits org→contact edges + channel nodes (to be REMOVED:
  `CHANNEL_PALETTE`, `CRM_RADII.channel`, contact→channel edges;
  `getContactGraph` can collapse to one row per contact — the `ranked` CTE already
  aggregates). `GraphEdge` has NO label field; renderer has NO edge-label support
  (node labels only, renderer.ts:220-238) — new plumbing required.

## Design

### A. Data model — `custom_fields._relationship` (zero migration)

```jsonc
"_relationship": {
  "label": "amiga del trabajo",      // free text, user's language
  "category": "family|partner|friend|work|acquaintance|service|other|unknown",
  "confidence": 0.83,                 // AI confidence; 1.0 when user-set
  "source": "ai" | "user",
  "evidence": [                       // ≤3 short quotes, for the UI tooltip
    { "quote": "ya le dije a mi mamá", "occurredAt": "2026-06-01" }
  ],
  "updatedAt": "2026-07-23T…",
  "userOverride": false               // true once user edits — AI NEVER clobbers
}
```

- Reserved-key handling identical to `_funnel`: hidden from the custom-fields
  editor; merge logic refuses AI writes when `userOverride` (mirror
  crm-contacts.service.ts:879-924).
- `category` is the machine axis (drives node/edge color grouping); `label` is the
  human axis (free text — "acquaintance from tennis").
- PII note: evidence quotes are conversation excerpts stored in custom_fields —
  already masked by `maskContactFields` paths? (consult: confirm `_relationship`
  must be included in field-level masking for `shouldMaskSensitive` users).

### B. Extraction job — `relationship-inference` tick (copy the analyze-tick template)

Personal orgs only in v1 (business orgs get manual labels; flag for user).

Per dirty contact (has conversations AND no `_relationship`, or stale vs new
messages, or `source:'ai'` with old `updatedAt`; NEVER dirty when `userOverride`):

1. **Evidence lane 1 — own conversation (raw DB)**: reuse the conversation-text
   loader the analyze tick uses (recent N messages of that contact's chats).
2. **Evidence lane 2 — org-wide mentions (brains)**: `searchBrainHybrid` on the
   Master Brain, query = contact display name (+ salient aliases from identities),
   limit ~8. This surfaces third-party mentions — "mi mamá dijo…", "mi jefe" — in
   OTHER chats, which is where relationship ground truth usually lives. Metadata
   chatId of hits ≠ contact's own chat ⇒ mark as cross-conversation evidence
   (stronger signal).
3. **LLM classify**: single `generateText` per contact (same model/env pattern):
   inputs = both evidence sets (bounded chars); output JSON
   `{label, category, confidence, evidence[]}` (Zod, all-default). Bilingual
   ES/EN prompt (Lima org). If confidence < threshold (~0.5) → write
   `category:'unknown'`, no label (graph shows unlabeled edge, not a wrong guess).
4. **Upsert** batched, dirty-gate stamped. Advisory lock key
   `crm-relationship:<orgId>`. Bounded per tick (e.g. 25 contacts/run), cron tick
   endpoint + allowlist + crontab like siblings (memory: tick needs route +
   allowlist + crontab + env in deploy target).

Cost bound: ≤60 graph contacts matter most — prioritize dirty contacts by the same
recency/message-count ranking as the graph query.

### C. Graph changes (both kinds render; extraction personal-only)

1. **Remove channel machinery**: channel nodes/edges/palette/radius from
   `build-crm-graph.ts`; collapse `getContactGraph` to one row per contact
   (drop per-channel split; keep owner/mask params).
2. **Edges become relationships**: org→contact edge gains
   `label` (the `_relationship.label`), color by `category` (semantic token-derived
   palette via the renderer presentation config — same theme plumbing the overview
   fix is adding), width still activity-scaled, unlabeled/unknown = current neutral.
3. **Renderer: optional edge labels** — add `label?/labelColor?` to `GraphEdge`;
   new edge-label Text layer mirroring node-label zoom gating + de-overlap
   (renderer.ts:220-238 pattern). Off by default so /overview is untouched.
4. **Ring layout by category** (optional, consult): family/partner innermost,
   friends, work, acquaintances outer — replaces the single contact ring; falls
   back to activity ring when category unknown.
5. **UI**: graph node popover + contact detail get an editable relationship field
   (free-text label + category select; saving sets `source:'user'`,
   `userOverride:true`, confidence 1.0). i18n en+es.
6. `getContactGraph` returns `_relationship` fields (masked per field-level rules).

### D. Qdrant / future

No hub→Qdrant coupling now (shadow period). `searchBrainHybrid` is the abstraction;
when the serving plane goes live, this feature inherits it for free. Raw-DB lane
keeps working regardless of embedding availability.

## v2 revisions (Codex sol/xhigh verdicts — OVERRIDE v1 above)

### R1. Recon corrections that change the design
- `searchBrainHybrid` ALWAYS runs the vector lane when embeddings are enabled
  (embedding request + unaccelerated cosine scan) — add a retriever-selection
  option (`vector:false`) for this name-search use case
  (brain-hybrid-retrieval.service.ts:40,1246).
- Owner/admin principals with zero canonical candidates fall into LEGACY vector
  search which THROWS when embeddings are disabled — the cron must use a narrow
  CRM-scoped system principal: `searchableModules:['crm']`, `fieldLevels:{crm:1}`,
  NO owner/admin roles (brains.service.ts:43,371; brain-corpus.service.ts:529 —
  WhatsApp sources classify as exactly that).
- Linkage is `(connector, metadata.chatId) → (channel, external_id)`;
  `sourceExternalKey` is the ORG's WhatsApp account id, not the contact.
- The analyze tick loads full conversations and sends only the FIRST chunk — build
  a dedicated bounded head+tail sampler for relationship evidence.
- The advisory xact lock ends BEFORE the LLM calls — it is NOT job exclusivity.
  Use an atomic expiring claim for the scheduler instead.
- `_funnel`'s read-modify-whole-object write is not concurrency-safe — the new
  setter uses atomic JSON-path updates (`jsonb_set`).

### R2. `_relationship` shape (replaces §A)
```ts
{
  label: string | null,        // null + source:'user' = user CLEARED (AI must not refill)
  category: string,            // code/Zod enum: family|romantic_partner|friend|work|acquaintance|service|other|unknown
  source: 'ai' | 'user',       // 'user' IS the override — no separate userOverride flag
  confidence?: number,         // AI only; user edits do NOT fabricate 1.0
  inputSig?: string,           // aggregated content_sig of the contact's conversations
  inferenceVersion?: number,
  model?: string,
  updatedAt: string,
  evidenceRefs?: Array<{ chunkId: string; occurredAt?: string }>  // NO raw quotes
}
```
"Resume AI suggestions" action clears the user pin (deletes the object or sets
source back to allow AI). `romantic_partner` (not `partner`) so a future business
`business_partner` stays unambiguous. Enums in code/Zod only.

### R3. Evidence + collision rules (replaces §B.2-3)
Lane 2 = corroboration ONLY: Master Brain query with full name + non-PII aliases,
`connectors:['whatsapp']`, `vector:false` (proper-name discovery is lexical;
semantic-only hits = collision risk). Skip lane 2 entirely when the normalized
alias maps to >1 contact; reject semantic-only hits; ambiguous ⇒ classify from own
head+tail evidence or return unknown. Cross-conversation evidence corroborates —
it is not automatically "stronger".

### R4. Dirty gate (replaces §B staleness)
`inputSig` = aggregate of `crm_conversation_index.content_sig` for the contact's
conversations (pg-crm-schema.ts:293). Re-run ONLY when: relationship missing; AI
`inputSig` changed; `inferenceVersion` changed; unknown/low-confidence past a
bounded cooldown; explicit user refresh. NEVER age-based rerun of confident
results. (v1 accepts: new third-party mentions alone don't trigger re-inference.)

### R5. Rendering (replaces §C.3-4)
DEFER the generic edge-label layer and ring-by-category (categories are not an
intimacy ordering). v1: category-COLORED org→contact edges (semantic-token-derived
palette via presentation config), relationship label shown in the selected-node
popover + optionally as a second line under the node label at higher zoom (node
labels already have zoom gating + de-overlap). Legend/filter by category. If edge
labels return later: `edgeLabels:'never'|'focused'|'always'` in presentation
config, default never; CRM taxonomy stays out of the renderer.

### R6. Masking (replaces §A PII note)
Masked principals (`shouldMaskSensitive`) receive NO `_relationship` at all — no
label, category, or refs; their graph edges render neutral/unlabeled. No raw
quotes anywhere in custom_fields (roster is cached + serialized to the browser;
pii.ts masking is shallow). Evidence UI later = opaque refs + on-demand
owner/field-level-scoped snippet endpoint.

### R7. Personal-only enforcement (replaces §B header note)
The tick fan-out selects `organizations.kind='personal'` in SQL AND the service
rechecks kind (fail closed). Do NOT use `locals.orgKind` (cron has no user
locals) and do NOT rely on `effectiveModuleEnabled` alone (CRM is available to
both kinds). CRM module toggle checked separately. Business orgs: manual labels
only; AI inference + client/supplier/staff taxonomy DEFERRED.

## Work packages (replaces v1 phasing)

- **WP0 — Contract/security**: `_relationship` Zod reader/writer module, code
  enums, atomic JSON-path setter, user pin/clear/resume lifecycle, full masking
  (strip whole object for masked principals), reserved-key hygiene tests.
- **WP1 — Manual graph v2**: collapse `getContactGraph` to one row per contact,
  remove channel nodes/palette/radius, category edge colors, single ring,
  relationship editor (popover + contact detail) + i18n. No LLM yet.
- **WP2 — Inference kernel**: bounded head+tail raw loader,
  connector-filtered lexical/fuzzy Brain corroboration (`vector:false` option
  added to searchBrainHybrid), alias-collision rejection, CRM-scoped system
  principal, strict output clamps (Zod all-default, confidence threshold →
  unknown).
- **WP3 — Scheduler/cost safety**: `inputSig` dirty gate, personal-only fan-out
  (SQL + in-service recheck), atomic expiring claim (NOT the xact advisory lock),
  per-org cap 5 contacts/tick, global cap 25, concurrency 2, per-call timeout +
  wall-clock budget, outcome/cost counters; tick route + allowlist + crontab.
- **Deferred**: raw-evidence UI, generic edge-label layer, category ring layout,
  business-org inference.
