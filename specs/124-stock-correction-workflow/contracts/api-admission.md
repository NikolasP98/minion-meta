# Exact correction API admission

These API-only additions create no filesystem page or page-design registry entry. Keep existing ticket and stock-entry registrations in src/lib/routes/route-design-manifest.ts unchanged; that registry accepts pages/redirects, not +server endpoints. API coverage belongs to the existing rbac.service.ts routing functions and actual hook/handler tests. No new registry or broad stock-prefix exemption is selected.

## Central routing and authoritative service checks

Preserve canonical authentication, selected organization and active-principal checks. In apiWriteCapability, only POST /api/stock/corrections/preview and POST /api/stock/corrections delegate effect-sensitive capability admission to the correction controller/service. The existing POS swap keeps its existing pos:edit gate and delegates additional stock effects. Every other path/method retains its existing capability result.

In apiReadCapability, return null before the generic /api/stock prefix only for the canonical collection pathname /api/stock/corrections and canonical by-id pathname matching ^/api/stock/corrections/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$. Existing hooks apply that function to GET and HEAD. Null means central delegation, not an access grant: both selected handlers must invoke the owning current-principal/source/effect/field admission before returning any receipt. Near-prefix, nested, malformed-ID and other stock endpoints gain no exemption. Query fields do not affect pathname matching and remain strictly decoded by the handler.

The service first admits the current active same-org principal with POS-view or stock-view authority. It may read only the org-scoped correction identity/header (id, kind, source_type/source_id, source_entry_id/replacement_entry_id and required operation/payload identity), without before/intended/after, costs or proof references, to choose its existing source/effect matrix. Resolve the actual same-org source/record admission next. Only an admitted result may load/project full immutable evidence:

- sale_variant with both entry references null: actual POS-only stockless matrix; no stock:view, finance or owner requirement is added.
- sale_variant with both references present: existing POS plus stock effect/read matrix and independent cost disclosure.
- receipt_replace: existing stock/source matrix and independent cost disclosure.
- private sale_stock_repost: current real-owner/private POS/stock/finance matrix before full garment evidence.
- product_mapping and receipt_chain: unsupported here; their own typed private services remain authoritative. No generic domain dispatcher is introduced.

Inconsistent references fail closed. Payload hashes, client flags, saved local pointers and source IDs are never authority. All reads own the selected nonlocking snapshot and use the existing RLS/qualified injected target; no broader app_ledger grant, extra global pool or writer lock is selected.

## GET, HEAD and opacity

GET collection requires the exact operationKey/payloadHash query and existing CorrectionStatus input. A missing, foreign, unsupported or currently undisclosable operation produces the same outcome:unknown/receipt:null without existence details; a wrong hash conflicts only after that matching operation is independently authorized. This status never proves rollback or permission to write. GET by-id retains identical generic 404 for missing/foreign/unsupported/currently denied records. Known committed receipts are acknowledged independently of later source changes or deletion of the historical actor.

Both route modules export explicit HEAD wrappers that execute their authorized GET lookup/projection and preserve its status/headers but return no body. HEAD cannot become an existence or private-cost probe. Every response uses Cache-Control:private,no-store. No opaque before/intended/after or protected valuation reference is spread into a response; cost denial strips amount, currency and qualification metadata together.

## Required proof

Extend existing rbac.service tests and actual hook-through-handler correction route tests: a POS-view/edit actor with no stock:view completes a both-empty swap, loses its response, then recovers the same receipt through collection GET and by-id GET/HEAD with no second POST. Include stock-disabled/POS-enabled, wrong/foreign source, stock-changing denial, private nonowner denial, missing/wrong hash, malformed/near-prefix paths and unrelated stock read/write gates. Test denied and missing collection responses are indistinguishable, by-id/HEAD denial has no body/details, and current cost denial exposes no nested proof or currency. Keep native thirteen behavior names; extend the existing reuse/authority cases rather than adding a fourteenth.
