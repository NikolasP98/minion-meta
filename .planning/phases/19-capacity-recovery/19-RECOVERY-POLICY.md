---
phase: 19-capacity-recovery
plan: "03"
artifact: recovery-policy
requirements: [CAP-03, DATA-03]
status: decisions-pending
inventory: .planning/phases/15-data-pipelines/15-RETENTION-INVENTORY.md (sha256 8b13bb0072c8f0ff586d2bc2dd4a9971c4f6212b717305b9003ffe77b218ca5c)
validator: scripts/qc/recovery-policy.mjs
decided_values: 0 of the fields that need a decision
established_from_source: hub.email_ledger retention 180d; hub.server_backups / hub.gateway_snapshot_files retention count 7; gateway.session_transcripts prune 30d; hub.brain_vector_outbox row ACK-delete; site.legacy_conversation_tables Meta-callback purge
decision_requests: [RET-01, RET-02, RET-03, RET-04, RET-05, RET-06, RET-07, RET-08, RET-09, RET-10, RET-11, RET-12, RET-13, RET-14, REC-01, REC-02, REC-03]
---

# 19 — Recovery and retention policy contracts (nothing here is decided)

This manifest turns the 15-03 retained-copy inventory into one contract per copy that
`scripts/qc/recovery-policy.mjs` can check. A contract field is either a **value with a source
reference** (quoted from code the inventory already verified) or a **pending decision id**. The
validator refuses to certify while any field is pending, rejects a value set ahead of a pending
decision (invented policy), rejects a derived copy whose retention outlives its source, rejects a
deletion whose unit differs between a copy and the copy it derives from, and rejects a backup that
covers an obligated copy without a resurrection rule. It never fills a value in.

Run: `node scripts/qc/recovery-policy.mjs --root hub=<hub checkout> --root gateway=<gateway checkout> --root site=<site checkout>`
Exit 0 = certifiable, 2 = decisions pending (current state), 1 = manifest invalid/unsafe.

## Obligation and lineage

Obligation is **derived from the inventory's `contains` classes**, not declared: any copy holding
customer content, identifiers, derived customer content, embeddings, financial source documents,
auth tables or credential material must state erasure unit, backup-resurrection rule, RPO and RTO
in addition to retention. Metadata-only copies (`hub.email_ledger`, `hub.server_backups`,
`hub.ai_usage`) need retention only.

Deletion propagation identity (the chain a subject erasure must travel; each hop names the key that
ties the copy to its source rows):

| Hop | From → to | Identity key | Mechanism in source |
|---|---|---|---|
| 1 | `hub.messages` → `hub.knowledge_sources` | `org_id + connector + external_key` (chat) | none found — FK cascade only |
| 2 | `hub.knowledge_sources` → `hub.knowledge_documents` | `source_id + metadata.chatId + segmentMonth` | `reconcileDeletedConversationDocuments` → `status='deleted'` (tombstone survives) |
| 3 | `hub.knowledge_documents` → `hub.knowledge_chunks` | `document_id + chunk_key + content_hash` | delete on tombstone; stale-key delete; FK cascade |
| 4 | `hub.knowledge_chunks` → `hub.brain_vector_outbox` | `chunk_id + revision` | trigger enqueues `delete` op; ACK deletes the row; `dead` rows survive |
| 5 | `hub.brain_vector_outbox` → `gateway.qdrant_points` | `chunk id + keyed fingerprint` | outbox drain applies the delete |
| B | every Postgres copy → `supabase.managed_backups`; every gateway copy → `hub.gateway_snapshot_files`; Qdrant → `gateway.qdrant_snapshots`; LibSQL → `turso.managed_backups` | whole store | restore resurrects everything erased after the snapshot unless an erasure ledger outside the store is replayed (RET-13 / RET-09) |

What the chain shows before any decision: the head of the chain (`hub.messages`) has **no delete
path in source**, hop 2 leaves a tombstone, hop 4 leaves dead rows, and every backup can resurrect
the lot. So a subject erasure today is a report of what would have to happen, not a mechanism.

## Machine manifest

```json
{
  "inventory": { "path": ".planning/phases/15-data-pipelines/15-RETENTION-INVENTORY.md", "sha256": "8b13bb0072c8f0ff586d2bc2dd4a9971c4f6212b717305b9003ffe77b218ca5c" },
  "decisions": [
    { "id": "RET-01", "status": "pending", "decider": "owner (business/legal)", "question": "Retention duration for mirrored channel messages and knowledge sources; erasure unit (contact, conversation, org)", "options": [
      { "value": "fixed org-level duration in days; erasure unit = contact", "impact": "hub.messages, hub.knowledge_sources, hub.knowledge_chunks and gateway.qdrant_points need a purge executor that does not exist in source (no delete path for hub.messages); erasure fans out through the 5-hop chain" },
      { "value": "keep for org lifetime; erase only on request; unit = contact", "impact": "hub.messages grows with no bound; an erasure request must still traverse hub.knowledge_documents tombstones, hub.brain_vector_outbox and gateway.qdrant_points" },
      { "value": "erasure unit = conversation (chat) instead of contact", "impact": "hub.knowledge_documents keys on metadata.chatId so conversation-level erasure maps directly; contact-level requires joining hub.messages identities first" } ] },
    { "id": "RET-02", "status": "pending", "decider": "owner", "question": "Physical removal of knowledge_documents tombstones and after how long", "options": [
      { "value": "purge tombstones N days after status='deleted'", "impact": "hub.knowledge_documents rows disappear; a restore inside the window resurrects the document unless the erasure ledger lives outside the database" },
      { "value": "keep tombstones forever", "impact": "hub.knowledge_documents keeps chat id + segment metadata for erased subjects indefinitely" } ] },
    { "id": "RET-03", "status": "pending", "decider": "owner + worker maintainer", "question": "Retention of dead brain_vector_outbox rows and reconcile_state history", "options": [
      { "value": "delete dead rows N days after they die; keep reconcile_state for the current generation only", "impact": "hub.brain_vector_outbox stops holding chunk ids/hashes of erased subjects; a dead delete op means gateway.qdrant_points may still hold the point" },
      { "value": "keep dead rows until manual triage", "impact": "hub.brain_vector_outbox retains identifiers indefinitely and the erasure chain cannot be declared complete" } ] },
    { "id": "RET-04", "status": "pending", "decider": "owner", "question": "Retention of operational rows: terminal bg_jobs, ai_usage, synced message-ledger outbox rows", "options": [
      { "value": "fixed window after terminal state for hub.bg_jobs; fixed window for hub.ai_usage; delete gateway.message_ledger_outbox rows once markSynced", "impact": "hub.bg_jobs cursors (chat ids, failure notes) and gateway.message_ledger_outbox payloads stop accumulating" },
      { "value": "keep forever", "impact": "hub.bg_jobs and gateway.message_ledger_outbox keep customer identifiers/content for the life of the deployment" } ] },
    { "id": "RET-05", "status": "pending", "decider": "owner", "question": "Who enforces pending_channel_claims.expires_at", "options": [
      { "value": "scheduled purge tick (like email_ledger)", "impact": "hub.pending_channel_claims expired rows are deleted on a cadence" },
      { "value": "request-path purge on claim read", "impact": "hub.pending_channel_claims rows persist until the next claim flow touches them" },
      { "value": "nothing (TTL column is advisory)", "impact": "hub.pending_channel_claims identifiers persist indefinitely" } ] },
    { "id": "RET-06", "status": "pending", "decider": "owner (accounting/legal)", "question": "Legal minimum retention for financial source documents", "options": [
      { "value": "legal floor in years stated by accounting/legal; immutable until then; delete after", "impact": "hub.fin_statement_imports content becomes deletable only after the floor; undo keeps deleting fin_transactions only" },
      { "value": "keep forever", "impact": "hub.fin_statement_imports raw statements are never removed" } ] },
    { "id": "RET-07", "status": "pending", "decider": "owner", "question": "Bucket lifecycle for tenant files; orphan blobs; survival after org deletion", "options": [
      { "value": "delete with owning row; lifecycle rule removes orphans after N days; objects do not survive org deletion", "impact": "hub.tenant_files needs a bucket lifecycle rule (not in source) and an org-deletion fan-out" },
      { "value": "objects survive org deletion; manual cleanup", "impact": "hub.tenant_files keeps customer content after the tenant is gone" } ] },
    { "id": "RET-08", "status": "pending", "decider": "owner + worker maintainer", "question": "Deletion of retired-generation Qdrant collections after cutover", "options": [
      { "value": "drop the retired collection N days after cutover", "impact": "gateway.qdrant_points of the old generation stop holding embeddings of erased subjects" },
      { "value": "keep retired generations", "impact": "gateway.qdrant_points retains stale embeddings that no outbox delete reaches" } ] },
    { "id": "RET-09", "status": "pending", "decider": "owner", "question": "Long-term location and retention of encrypted Qdrant snapshots; resurrection rule on restore", "options": [
      { "value": "store N days in a named location; restore must replay the erasure ledger (forbid resurrection)", "impact": "gateway.qdrant_snapshots restore of gateway.qdrant_points cannot bring back deleted subjects" },
      { "value": "allow resurrection within the snapshot window", "impact": "gateway.qdrant_points may hold erased embeddings until the next reconcile" } ] },
    { "id": "RET-10", "status": "pending", "decider": "owner", "question": "Erase versus prune for session transcripts; acceptance of the 30-day default", "options": [
      { "value": "accept 30-day prune and add subject erasure on request", "impact": "gateway.session_transcripts need an erasure entry point beyond the time prune" },
      { "value": "prune only (no erasure)", "impact": "gateway.session_transcripts of an erased subject persist up to 30 days and inside hub.gateway_snapshot_files" } ] },
    { "id": "RET-11", "status": "pending", "decider": "owner", "question": "Retention and erasure obligations for agent memory (permanent memory objects, file-backed memory)", "options": [
      { "value": "permanent memory follows subject erasure; file memory is rewritten without the subject", "impact": "gateway.memory_objects and gateway.memory_files need subject keys, which the schema does not carry today" },
      { "value": "agent memory exempt from erasure", "impact": "gateway.memory_objects and gateway.memory_files keep derived customer content indefinitely" } ] },
    { "id": "RET-12", "status": "pending", "decider": "owner", "question": "Time-based retention for legacy site conversation tables; gateway-side scope of Meta deletion requests", "options": [
      { "value": "fixed duration plus extend the callback purge to gateway copies", "impact": "site.legacy_conversation_tables purge reaches gateway.session_transcripts and gateway.message_ledger_outbox" },
      { "value": "callback purge only, no duration", "impact": "site.legacy_conversation_tables keep content until a Meta request; gateway copies untouched" } ] },
    { "id": "RET-13", "status": "pending", "decider": "owner + provider plan", "question": "Managed-backup retention windows and whether erasure obligations extend into backups", "options": [
      { "value": "forbid resurrection: keep an erasure ledger outside the store and replay it after every restore", "impact": "supabase.managed_backups and turso.managed_backups restores are followed by a ledger replay across hub.messages and the derived chain; hub.gateway_snapshot_files restores likewise" },
      { "value": "allow-within-window: erased rows may reappear for the provider retention window", "impact": "supabase.managed_backups, turso.managed_backups and hub.gateway_snapshot_files may resurrect erased subjects for the window; the window must be stated to customers" } ] },
    { "id": "RET-14", "status": "pending", "decider": "owner", "question": "Delete local auth-table dumps and rotate the credentials they contain", "options": [
      { "value": "delete meta.ops_backups_local_dumps now and rotate every credential in them", "impact": "meta.ops_backups_local_dumps gone; session tokens, OAuth tokens, password hashes and the JWKS key are rotated" },
      { "value": "move to an encrypted vault with an expiry", "impact": "meta.ops_backups_local_dumps persist encrypted; credential material still valid until rotated" } ] },
    { "id": "REC-01", "status": "pending", "decider": "owner + provider plan", "question": "RPO/RTO targets for copies living in managed databases (Supabase Postgres, Turso)", "options": [
      { "value": "RPO = daily backup interval, RTO = 4 hours", "impact": "hub.messages and every Postgres copy accept up to one day of loss; supabase.managed_backups daily snapshot suffices" },
      { "value": "RPO = PITR granularity (minutes), RTO = 1 hour", "impact": "supabase.managed_backups must be on a PITR plan; site.legacy_conversation_tables need the Turso equivalent" } ] },
    { "id": "REC-02", "status": "pending", "decider": "owner", "question": "RPO/RTO targets for gateway state (session transcripts, SQLite memory, message-ledger outbox) restored from hub.gateway_snapshot_files", "options": [
      { "value": "RPO = backup scheduler cadence, RTO = runRestore duration", "impact": "gateway.session_transcripts, gateway.memory_objects and gateway.message_ledger_outbox lose everything since the last hub.gateway_snapshot_files snapshot" },
      { "value": "tighter RPO via continuous replication", "impact": "hub.gateway_snapshot_files cadence is not enough; a new mechanism is required" } ] },
    { "id": "REC-03", "status": "pending", "decider": "owner + worker maintainer", "question": "RPO/RTO for rebuildable stores (Qdrant points, tenant objects)", "options": [
      { "value": "rebuild from Postgres (outbox replay); RTO = full reindex time; RPO inherits REC-01", "impact": "gateway.qdrant_points are re-derived from hub.knowledge_chunks; hub.tenant_files have no rebuild source and need their own answer" },
      { "value": "restore from gateway.qdrant_snapshots and object versioning", "impact": "gateway.qdrant_points come back with whatever the snapshot held (RET-09 rule applies); hub.tenant_files depend on bucket versioning not in source" } ] }
  ],
  "contracts": [
    { "copy": "hub.messages", "retention": { "decision": "RET-01" }, "erasure": { "decision": "RET-01" }, "backup": { "coveredBy": ["supabase.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "hub.knowledge_sources", "lineage": { "derivedFrom": "hub.messages", "identity": "org_id + connector + external_key (chat id)", "mechanism": "none-found: FK cascade only (inventory copy 2)" }, "retention": { "decision": "RET-01" }, "erasure": { "decision": "RET-01" }, "backup": { "coveredBy": ["supabase.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "hub.knowledge_documents", "lineage": { "derivedFrom": "hub.knowledge_sources", "identity": "source_id + metadata.chatId + metadata.segmentMonth", "mechanism": "reconcileDeletedConversationDocuments sets status='deleted' (src/server/services/brain-corpus.service.ts)" }, "retention": { "decision": "RET-02" }, "erasure": { "decision": "RET-01" }, "backup": { "coveredBy": ["supabase.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "hub.knowledge_chunks", "lineage": { "derivedFrom": "hub.knowledge_documents", "identity": "document_id + chunk_key + content_hash", "mechanism": "delete on document tombstone; stale chunk_key delete; FK cascade (src/server/services/brain-corpus.service.ts)" }, "retention": { "decision": "RET-01" }, "erasure": { "decision": "RET-01" }, "backup": { "coveredBy": ["supabase.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "hub.brain_vector_outbox", "lineage": { "derivedFrom": "hub.knowledge_chunks", "identity": "chunk_id + revision", "mechanism": "trigger on knowledge_chunks enqueues the delete op (supabase/migrations/20260723010000_brain_vector_outbox.sql)" }, "retention": { "decision": "RET-03" }, "erasure": { "value": { "unit": "row", "mechanism": "worker ACK deletes the row" }, "reference": "supabase/migrations/20260725030000_qdrant_owned_embeddings.sql" }, "backup": { "coveredBy": ["supabase.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "hub.bg_jobs", "retention": { "decision": "RET-04" }, "erasure": { "decision": "RET-04" }, "backup": { "coveredBy": ["supabase.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "hub.email_ledger", "retention": { "value": { "days": 180 }, "reference": "supabase/migrations/20260709133000_email_ledger.sql" }, "backup": { "coveredBy": ["supabase.managed_backups"] } },
    { "copy": "hub.pending_channel_claims", "retention": { "decision": "RET-05" }, "erasure": { "decision": "RET-05" }, "backup": { "coveredBy": ["supabase.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "hub.server_backups", "retention": { "value": { "count": 7 }, "reference": "src/server/db/schema/backup-configs.ts" }, "backup": { "coveredBy": ["supabase.managed_backups"] } },
    { "copy": "hub.gateway_snapshot_files", "retention": { "value": { "count": 7 }, "reference": "src/server/services/backup-scheduler.ts" }, "erasure": { "decision": "RET-13" }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-02" }, "rto": { "decision": "REC-02" } },
    { "copy": "hub.ai_usage", "retention": { "decision": "RET-04" }, "backup": { "coveredBy": ["supabase.managed_backups"] } },
    { "copy": "hub.fin_statement_imports", "retention": { "decision": "RET-06" }, "erasure": { "decision": "RET-06" }, "backup": { "coveredBy": ["supabase.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "hub.tenant_files", "retention": { "decision": "RET-07" }, "erasure": { "decision": "RET-07" }, "backup": { "coveredBy": [] }, "backupResurrection": { "decision": "RET-07" }, "rpo": { "decision": "REC-03" }, "rto": { "decision": "REC-03" } },
    { "copy": "gateway.qdrant_points", "lineage": { "derivedFrom": "hub.brain_vector_outbox", "identity": "chunk id + keyed fingerprint", "mechanism": "outbox drain applies the delete op (services/brain-vector/src/outbox.ts)" }, "retention": { "decision": "RET-08" }, "erasure": { "decision": "RET-01" }, "backup": { "coveredBy": ["gateway.qdrant_snapshots"] }, "backupResurrection": { "decision": "RET-09" }, "rpo": { "decision": "REC-03" }, "rto": { "decision": "REC-03" } },
    { "copy": "gateway.qdrant_snapshots", "retention": { "decision": "RET-09" }, "erasure": { "decision": "RET-09" }, "backupResurrection": { "decision": "RET-09" }, "rpo": { "decision": "REC-03" }, "rto": { "decision": "REC-03" } },
    { "copy": "gateway.session_transcripts", "retention": { "value": { "days": 30 }, "reference": "src/config/sessions/store.ts" }, "erasure": { "decision": "RET-10" }, "backup": { "coveredBy": ["hub.gateway_snapshot_files"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-02" }, "rto": { "decision": "REC-02" } },
    { "copy": "gateway.memory_objects", "retention": { "decision": "RET-11" }, "erasure": { "decision": "RET-11" }, "backup": { "coveredBy": ["hub.gateway_snapshot_files"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-02" }, "rto": { "decision": "REC-02" } },
    { "copy": "gateway.memory_files", "retention": { "decision": "RET-11" }, "erasure": { "decision": "RET-11" }, "backup": { "coveredBy": ["hub.gateway_snapshot_files"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-02" }, "rto": { "decision": "REC-02" } },
    { "copy": "gateway.message_ledger_outbox", "retention": { "decision": "RET-04" }, "erasure": { "decision": "RET-04" }, "backup": { "coveredBy": ["hub.gateway_snapshot_files"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-02" }, "rto": { "decision": "REC-02" } },
    { "copy": "site.legacy_conversation_tables", "retention": { "decision": "RET-12" }, "erasure": { "value": { "unit": "contact", "mechanism": "purgeMetaUserData on a verified Meta callback (exact id + %:<numeric id> session keys); gateway copies not covered" }, "reference": "src/lib/server/meta-data-deletion.ts" }, "backup": { "coveredBy": ["turso.managed_backups"] }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "supabase.managed_backups", "retention": { "decision": "RET-13" }, "erasure": { "decision": "RET-13" }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "turso.managed_backups", "retention": { "decision": "RET-13" }, "erasure": { "decision": "RET-13" }, "backupResurrection": { "decision": "RET-13" }, "rpo": { "decision": "REC-01" }, "rto": { "decision": "REC-01" } },
    { "copy": "meta.ops_backups_local_dumps", "retention": { "decision": "RET-14" }, "erasure": { "decision": "RET-14" }, "backupResurrection": { "decision": "RET-14" }, "rpo": { "decision": "RET-14" }, "rto": { "decision": "RET-14" } }
  ]
}
```

## How a decision lands

Change the decision's `status` to `decided` with `decidedBy`, `decidedAt` and a `reference`
(DECISIONS.md id), then replace every `{ "decision": "<id>" }` field it blocks with
`{ "value": …, "reference": "<id>" }`. The validator rejects a contract that still points at a
decided decision (so a decision cannot be silently half-applied) and rejects a value whose
reference is a pending decision (so nothing is applied ahead of authority).

## Validator run at this identity

See `19-03-SUMMARY.md` for the exact run: 23 contracts, 0 errors, 17 pending decisions, exit 2,
`REFUSED TO CERTIFY`. `scripts/qc/cross-store-recovery.mjs` reads this manifest first and runs its
disposable rehearsal under a labelled fixture policy when (as now) nothing is certifiable.
