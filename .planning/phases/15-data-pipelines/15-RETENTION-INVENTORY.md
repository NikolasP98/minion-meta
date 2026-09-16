# 15-03 Retained-copy inventory (DATA-03 admission gate)

Source-derived map of every retained copy of tenant data found in the four repositories, with its
owner, write/read/delete authority, source identity, restore interaction and the retention policy
the source actually establishes. Metadata only: no database, bucket, vector store or backup was
opened, and no customer payload was read. **No retention duration is invented here** — every
duration below is either quoted from source (with the file that defines it) or left as an explicit
decision request.

Identities inspected (read-only detached worktrees):

| Repo | Ref | Commit |
|---|---|---|
| hub (`minion_hub`) | `origin/master` | `1df0a9216ad3f7f85d989eb59cfccb779d9f7285` |
| gateway (`minion`) | `origin/DEV` | `8499d8fddc4` |
| site (`minion_site`) | `origin/master` | `0ed4e1b` |
| meta (this repo) | `origin/dev` | `3f3375ee810fd4c04d62a0b4811d15b41b346acb` |

Validator: `node scripts/qc/retention-inventory.mjs --inventory <this file> --root hub=<path> --root gateway=<path> --root site=<path> --root meta=<path>`
(parses the JSON manifest below; rejects a copy without owner/authority/source path, an unresolved
policy carrying a duration, a dangling decision id, credential-looking strings or env-file paths).

## Copy map

| # | Copy | Store | Owner (code) | Write | Read | Delete | Policy in source |
|---|---|---|---|---|---|---|---|
| 1 | `messages` (channel mirror) | Supabase PG | hub `messages.service` | `ingestMessages` upsert on `(org_id, client_id)` | CRM, brains, assistant | **none found** in hub source | unresolved → RET-01 |
| 2 | `knowledge_sources` | Supabase PG | hub `brain-corpus.service` | `ensureConversationSource`, `markConversationSourceFailure` (writes `last_error`) | brains UI, corpus jobs | none found (FK cascade only) | unresolved → RET-01 |
| 3 | `knowledge_documents` | Supabase PG | hub `brain-corpus.service` | `persistConversations` | search | **tombstone only**: `reconcileDeletedConversationDocuments` sets `status='deleted'`; no physical delete found | unresolved → RET-02 |
| 4 | `knowledge_chunks` (text + pgvector embedding, `vector_indexed_*` receipt) | Supabase PG | hub `brain-corpus.service` / `brain-business-corpus.service` | chunk upsert keyed by `chunk_key` + `content_hash` | hybrid retrieval | stale-key delete in `persistConversations`; delete on document tombstone; FK cascade from source/document | established derivation rule (follows source rows); duration inherits RET-01 |
| 5 | `brain_vector_outbox` / `brain_vector_generations` / `brain_vector_reconcile_state` | Supabase PG | hub migrations `20260723010000`, `20260725030000`; gateway `services/brain-vector/src/outbox.ts` | trigger on `knowledge_chunks` | worker claim | worker ACK deletes the row (`20260725030000` comment); `dead` rows: none found | unresolved → RET-03 |
| 6 | `bg_jobs` (cursor JSON incl. chat ids + failure notes) | Supabase PG | hub `bg-runtime` | `enqueueJob`, `persistProgress` | `runTick` | `cancelJobsByRef` marks cancelled; terminal rows never deleted | unresolved → RET-04 |
| 7 | `email_ledger` | Supabase PG | hub `email-ledger.service` | `recordEmail` stamps `expires_at` | `/channels/gmail` | purge tick deletes `expires_at < now()` (`service.ts:128`, `/api/email-ledger/tick`) | **established**: per-org `retention_days`, default 180, 0 = keep (`20260709133000_email_ledger.sql`) |
| 8 | `pending_channel_claims` | Supabase PG | hub migration `20260610180600` | claim flow | claim flow | `expires_at` TTL column; **no purge executor found** in hub `src/` | unresolved → RET-05 |
| 9 | `server_backups` records | Supabase PG | hub `backup.service`, `backup-scheduler` | `createSnapshotRecord` | `listSnapshots` | `deleteSnapshotRecord`; scheduler trims beyond `retentionCount` (`backup-scheduler.ts:146-151`) | **established**: `retention_count` default 7 per org (`schema/backup-configs.ts:16`) |
| 10 | gateway server snapshot files on `backupHost:backupBasePath` | remote filesystem (SSH) | hub `backup.service` | `runBackup` (rsync over SSH) | `runRestore` | `deleteRemoteSnapshot` | established: same `retention_count` |
| 11 | `ai_usage` | Supabase PG | hub `pg-schema/ai-usage.ts` | metering | billing views | none found | unresolved → RET-04 |
| 12 | `fin_statement_imports` (raw statement content + `parser_version`) | Supabase PG | hub `finance-statements.service` | import | status/re-parse | undo deletes `fin_transactions` (`:381`) — import content retained | unresolved → RET-06 |
| 13 | tenant files/thumbnails (`b2_file_key`) | S3-compatible bucket (B2) | hub `storage/blob.ts`, `file.service` | `put` | signed URL | `delete` on file delete (`file.service.ts:71`); bucket lifecycle not in source | unresolved → RET-07 |
| 14 | Qdrant points `minion_brains_v1__<generation>` (vectors + keyed fingerprints; no chunk text) | Qdrant | gateway `services/brain-vector/src/qdrant.ts`, `outbox.ts` | outbox drain upsert | hub `brain-vector-client` search | `delete` on outbox delete op; retired-generation collections: none found | unresolved → RET-08 |
| 15 | Qdrant encrypted snapshots | snapshot files | gateway `services/brain-vector/src/snapshot.ts` | `createEncryptedSnapshot` | `restoreEncryptedSnapshot` | delete after download (`:491`); long-term destination/retention not in source | unresolved → RET-09 |
| 16 | session transcripts `<sessionsDir>/<id>.jsonl` + `sessions.json` rotations `.bak.<ts>` | gateway filesystem | gateway `src/config/sessions/store.ts`, `paths.ts` | session store | resume | prune after `DEFAULT_SESSION_PRUNE_AFTER_MS = 30d` (`store.ts:252`, config `pruneAfter`/`pruneDays`); rotated `.bak` files unlinked (`:478`) | **established**: 30-day default prune; erasure semantics of pruned transcripts → RET-10 |
| 17 | typed memory `memory_objects` (SQLite) | gateway SQLite | gateway `src/memory/typed-schema.ts` | extract-memories | memory tools | `pruneExpired`: `DELETE … WHERE ttl IS NOT NULL AND created_at+ttl < now` (`:244-248`); `ttl NULL` = permanent | established mechanism; permanent objects → RET-11 |
| 18 | file-backed agent memory (memory-core) | gateway filesystem | gateway `extensions/memory-core` | agent tools | `memory_search`/`memory_get` | none found | unresolved → RET-11 |
| 19 | message-ledger outbox (SQLite write-ahead buffer) | gateway SQLite | gateway `src/infra/message-ledger.ts`, flusher | channel inbound hook | flusher | synced rows: retention after `markSynced` not verified | unresolved → RET-04 |
| 20 | `channel_identities`, `chat_messages`, `sessions` (legacy LibSQL/Turso) | LibSQL | site `hooks.server.ts` → `$lib/server/meta-data-deletion` | gateway sync | members area | `purgeMetaUserData` on verified Meta callback (exact id + `%:<numeric id>` session keys); gateway-side content explicitly **not covered** | deletion trigger established; time-based retention unresolved → RET-12 |
| 21 | Supabase managed backups / PITR | managed service | provider | provider | project restore | provider | unresolved → RET-13 |
| 22 | Turso managed backups | managed service | provider | provider | provider restore | provider | unresolved → RET-13 |
| 23 | local Turso dumps `ops/backups/*.sql` (gitignored, on disk) | local untracked files | **none** | manual | manual | manual | unresolved → RET-14 (security) |

Notes on the map:

- Copies 1–6 form one lineage: `messages` → `knowledge_documents`/`knowledge_chunks` → outbox →
  Qdrant points. Deleting a message segment tombstones its document, deletes its chunks, and the
  trigger enqueues a Qdrant `delete`; the tombstone row itself (copy 3) and any `dead` outbox row
  (copy 5) survive. Erasure across the lineage therefore depends on RET-01 + RET-02 + RET-03 together.
- `bg_jobs.cursor` for brain jobs carries `channel/accountId/chatId` tuples and bounded failure
  notes (error text, ≤ 240 chars each, ≤ 20 notes; see 15-03 Task 1). That is metadata about
  customer conversations and is retained for the life of the row.
- Copy 23 was observed while listing `ops/backups/` for this inventory. The listing showed the
  dump contains authentication-table rows (session tokens, OAuth access/id tokens, password hashes,
  a JWKS private key). Nothing from it was copied anywhere. It is untracked (`.gitignore:155`),
  so no history purge is needed, but the file exists on the working machine.

## Decisions required (no value inferred)

| ID | Question | Decider | Blocks |
|---|---|---|---|
| RET-01 | Retention duration for mirrored channel `messages` and their `knowledge_sources`; whether erasure is per contact, per conversation or per org | owner (business/legal) | cross-store deletion of copies 1, 2, 4, 14 |
| RET-02 | Whether `knowledge_documents` tombstones (`status='deleted'`) are physically removed, and after how long | owner | copy 3 |
| RET-03 | Retention of `dead` `brain_vector_outbox` rows and of `reconcile_state` history | owner + worker maintainer | copy 5 |
| RET-04 | Retention of operational rows: terminal `bg_jobs`, `ai_usage`, synced message-ledger outbox rows | owner | copies 6, 11, 19 |
| RET-05 | Who enforces `pending_channel_claims.expires_at` (cron, request-path, or nothing) | owner | copy 8 |
| RET-06 | Minimum retention for financial source documents (`fin_statement_imports` content) — likely a legal floor, which this plan does not guess | owner (accounting/legal) | copy 12 |
| RET-07 | Bucket lifecycle for tenant files and thumbnails; orphan blob handling; whether objects survive org deletion | owner | copy 13 |
| RET-08 | Deletion of retired-generation Qdrant collections after a generation cutover | owner + worker maintainer | copy 14 |
| RET-09 | Where encrypted Qdrant snapshots live long-term, for how long, and whether a restore may resurrect points deleted after the snapshot | owner | copy 15; 17-04 recovery rehearsal |
| RET-10 | Whether a pruned session transcript must be erased (not only pruned/rotated) and whether 30 days is the accepted default | owner | copy 16 |
| RET-11 | Retention/erasure obligations for agent memory (permanent `memory_objects`, file-backed memory) | owner | copies 17, 18 |
| RET-12 | Time-based retention for legacy site conversation tables; scope of gateway-side purge on a Meta deletion request | owner | copy 20 |
| RET-13 | Managed-backup retention windows and the resurrection rule: does an erasure obligation extend into backups, and within what window | owner + provider plan | copies 21, 22; 19-03 |
| RET-14 | Delete the local auth-table dumps and rotate every credential they contain | owner | copy 23 (security) |

## Proposed policy matrix (proposal only — nothing here is adopted)

| Copy class | Proposed default | Exact missing value |
|---|---|---|
| Channel mirror + derived corpus (1–5, 14) | one org-level duration; erasure request deletes the whole lineage and enqueues Qdrant deletes; tombstones and dead outbox rows purged after a short fixed window | duration (RET-01), tombstone window (RET-02), dead-row window (RET-03) |
| Operational rows (6, 11, 19) | fixed window after terminal state | window (RET-04) |
| Financial source documents (12) | never shorter than the legal floor; immutable until then | legal floor (RET-06) |
| Objects (13) | delete with owning row; bucket lifecycle for orphans | orphan window (RET-07) |
| Backups / snapshots (9, 10, 15, 21, 22) | keep `retention_count` where established; state whether erasure obligations extend into backups | window + resurrection rule (RET-09, RET-13) |
| Agent memory (16–18) | keep 30-day transcript prune; decide erase-vs-prune and permanent-memory obligations | RET-10, RET-11 |
| Site legacy tables (20) | keep callback purge; add duration; extend to gateway copies | RET-12 |

## Machine manifest

```json
{
  "generatedFrom": {
    "hub": "origin/master 1df0a9216ad3f7f85d989eb59cfccb779d9f7285",
    "gateway": "origin/DEV 8499d8fddc4",
    "site": "origin/master 0ed4e1b",
    "meta": "origin/dev 3f3375ee810fd4c04d62a0b4811d15b41b346acb"
  },
  "copies": [
    { "id": "hub.messages", "store": "postgres", "repo": "hub", "owner": "messages.service", "sourcePaths": ["src/server/services/messages.service.ts"], "sourceIds": "org_id + client_id (upsert conflict target)", "authority": { "write": "ingestMessages", "read": "CRM, brains, assistant", "delete": "none-found" }, "restore": "Database restore resurrects rows; downstream corpus re-derives from them.", "contains": ["customer-content", "identifiers"], "policy": { "status": "unresolved", "decision": "RET-01" } },
    { "id": "hub.knowledge_sources", "store": "postgres", "repo": "hub", "owner": "brain-corpus.service", "sourcePaths": ["src/server/services/brain-corpus.service.ts"], "sourceIds": "org_id + connector + external_key", "authority": { "write": "ensureConversationSource, markConversationSourceFailure", "read": "brains UI, corpus jobs", "delete": "none-found (FK cascade only)" }, "restore": "Restored with the database.", "contains": ["identifiers", "error-text"], "policy": { "status": "unresolved", "decision": "RET-01" } },
    { "id": "hub.knowledge_documents", "store": "postgres", "repo": "hub", "owner": "brain-corpus.service", "sourcePaths": ["src/server/services/brain-corpus.service.ts"], "sourceIds": "org_id + source_id + metadata.chatId + metadata.segmentMonth", "authority": { "write": "persistConversations", "read": "search", "delete": "tombstone only: reconcileDeletedConversationDocuments" }, "restore": "Restore resurrects tombstoned and live documents alike.", "contains": ["customer-content", "identifiers"], "policy": { "status": "unresolved", "decision": "RET-02" } },
    { "id": "hub.knowledge_chunks", "store": "postgres", "repo": "hub", "owner": "brain-corpus.service", "sourcePaths": ["src/server/services/brain-corpus.service.ts", "src/server/services/brain-business-corpus.service.ts"], "sourceIds": "org_id + document_id + chunk_key + content_hash", "authority": { "write": "chunk upsert in persistConversations", "read": "hybrid retrieval", "delete": "stale chunk_key delete; delete on document tombstone; FK cascade" }, "restore": "Restore resurrects chunks; the outbox trigger re-enqueues vector upserts.", "contains": ["customer-content", "embeddings"], "policy": { "status": "established", "reference": "src/server/services/brain-corpus.service.ts reconcileDeletedConversationDocuments (chunks follow their source rows; duration inherits RET-01)" } },
    { "id": "hub.brain_vector_outbox", "store": "postgres", "repo": "hub", "owner": "brain_vector migrations + gateway outbox worker", "sourcePaths": ["supabase/migrations/20260723010000_brain_vector_outbox.sql", "supabase/migrations/20260725030000_qdrant_owned_embeddings.sql"], "sourceIds": "org_id + chunk_id + revision", "authority": { "write": "trigger on knowledge_chunks", "read": "worker claim", "delete": "worker ACK deletes the row; dead rows none-found" }, "restore": "Restore replays queued rows; dead rows come back as dead.", "contains": ["identifiers", "hashes"], "policy": { "status": "unresolved", "decision": "RET-03" } },
    { "id": "hub.bg_jobs", "store": "postgres", "repo": "hub", "owner": "bg-runtime", "sourcePaths": ["src/server/services/bg-runtime.ts", "src/server/services/brain-corpus-jobs.service.ts"], "sourceIds": "tenant_id + type + ref_id; cursor JSON carries channel/accountId/chatId", "authority": { "write": "enqueueJob, persistProgress", "read": "runTick", "delete": "none-found (cancelJobsByRef only marks cancelled)" }, "restore": "Restore may resurrect a queued job; handlers are idempotent per cursor.", "contains": ["identifiers", "error-text"], "policy": { "status": "unresolved", "decision": "RET-04" } },
    { "id": "hub.email_ledger", "store": "postgres", "repo": "hub", "owner": "email-ledger.service", "sourcePaths": ["src/server/services/email-ledger.service.ts", "src/routes/api/email-ledger/tick/+server.ts", "supabase/migrations/20260709133000_email_ledger.sql"], "sourceIds": "org_id + message id", "authority": { "write": "recordEmail", "read": "/channels/gmail", "delete": "purge tick deletes expires_at < now()" }, "restore": "Restored rows keep expires_at and are purged on the next tick.", "contains": ["metadata"], "policy": { "status": "established", "reference": "supabase/migrations/20260709133000_email_ledger.sql retention_days default 180, 0 = keep", "durationDays": 180 } },
    { "id": "hub.pending_channel_claims", "store": "postgres", "repo": "hub", "owner": "pending_channel_claims migration", "sourcePaths": ["supabase/migrations/20260610180600_pending_channel_claims.sql"], "sourceIds": "claim id + expires_at", "authority": { "write": "claim flow", "read": "claim flow", "delete": "none-found (TTL column without a located purge executor)" }, "restore": "Restored rows keep expires_at.", "contains": ["identifiers"], "policy": { "status": "unresolved", "decision": "RET-05" } },
    { "id": "hub.server_backups", "store": "postgres", "repo": "hub", "owner": "backup.service", "sourcePaths": ["src/server/services/backup.service.ts", "src/server/services/backup-scheduler.ts", "src/server/db/schema/backup-configs.ts"], "sourceIds": "server_id + snapshot_path", "authority": { "write": "createSnapshotRecord", "read": "listSnapshots", "delete": "deleteSnapshotRecord; scheduler trims beyond retentionCount" }, "restore": "runRestore replays a snapshot onto the gateway host.", "contains": ["metadata"], "policy": { "status": "established", "reference": "src/server/db/schema/backup-configs.ts retention_count default 7; enforced in backup-scheduler.ts:146-151" } },
    { "id": "hub.gateway_snapshot_files", "store": "filesystem", "repo": "hub", "owner": "backup.service", "sourcePaths": ["src/server/services/backup.service.ts"], "sourceIds": "backupHost:backupBasePath/<snapshot>", "authority": { "write": "runBackup", "read": "runRestore", "delete": "deleteRemoteSnapshot" }, "restore": "A restore overwrites the gateway state directory with the snapshot.", "contains": ["customer-content", "configuration"], "policy": { "status": "established", "reference": "same retention_count as hub.server_backups" } },
    { "id": "hub.ai_usage", "store": "postgres", "repo": "hub", "owner": "ai-usage schema", "sourcePaths": ["src/server/db/pg-schema/ai-usage.ts"], "sourceIds": "org_id + row id", "authority": { "write": "metering", "read": "billing views", "delete": "none-found" }, "restore": "Restored with the database.", "contains": ["metadata"], "policy": { "status": "unresolved", "decision": "RET-04" } },
    { "id": "hub.fin_statement_imports", "store": "postgres", "repo": "hub", "owner": "finance-statements.service", "sourcePaths": ["src/server/services/finance-statements.service.ts", "src/server/db/pg-finance-schema.ts"], "sourceIds": "org_id + content_sha256", "authority": { "write": "import", "read": "status, re-parse", "delete": "undo deletes fin_transactions only; import content retained" }, "restore": "Restored with the database.", "contains": ["financial-source-document"], "policy": { "status": "unresolved", "decision": "RET-06" } },
    { "id": "hub.tenant_files", "store": "object-storage", "repo": "hub", "owner": "storage/blob.ts + file.service", "sourcePaths": ["src/server/storage/blob.ts", "src/server/storage/drivers/s3.ts", "src/server/services/file.service.ts"], "sourceIds": "b2_file_key", "authority": { "write": "put", "read": "getSignedUrl", "delete": "delete on file delete; bucket lifecycle not in source" }, "restore": "Objects are not part of the database restore; orphans possible either way.", "contains": ["customer-content"], "policy": { "status": "unresolved", "decision": "RET-07" } },
    { "id": "gateway.qdrant_points", "store": "qdrant", "repo": "gateway", "owner": "services/brain-vector worker", "sourcePaths": ["services/brain-vector/src/qdrant.ts", "services/brain-vector/src/outbox.ts", "services/brain-vector/src/collections.ts"], "sourceIds": "collection minion_brains_v1__<generation> + chunk id + keyed fingerprint", "authority": { "write": "outbox drain upsert", "read": "hub brain-vector-client search", "delete": "delete on outbox delete op; retired generations none-found" }, "restore": "A snapshot restore resurrects points deleted after the snapshot until the next reconcile.", "contains": ["embeddings", "hashes"], "policy": { "status": "unresolved", "decision": "RET-08" } },
    { "id": "gateway.qdrant_snapshots", "store": "filesystem", "repo": "gateway", "owner": "services/brain-vector snapshot", "sourcePaths": ["services/brain-vector/src/snapshot.ts"], "sourceIds": "collection + snapshot name", "authority": { "write": "createEncryptedSnapshot", "read": "restoreEncryptedSnapshot", "delete": "snapshot deleted from Qdrant after download; long-term copy not in source" }, "restore": "Restoring uploads the snapshot over the target collection.", "contains": ["embeddings", "hashes"], "policy": { "status": "unresolved", "decision": "RET-09" } },
    { "id": "gateway.session_transcripts", "store": "filesystem", "repo": "gateway", "owner": "src/config/sessions store", "sourcePaths": ["src/config/sessions/store.ts", "src/config/sessions/paths.ts"], "sourceIds": "sessionsDir + session id (+ topic id)", "authority": { "write": "session store", "read": "resume", "delete": "prune after pruneAfter/pruneDays; rotated .bak files unlinked" }, "restore": "Gateway snapshot restore (hub.gateway_snapshot_files) brings transcripts back.", "contains": ["customer-content"], "policy": { "status": "established", "reference": "src/config/sessions/store.ts DEFAULT_SESSION_PRUNE_AFTER_MS = 30 days (config pruneAfter/pruneDays); erasure semantics pending RET-10", "durationDays": 30 } },
    { "id": "gateway.memory_objects", "store": "sqlite", "repo": "gateway", "owner": "src/memory typed schema", "sourcePaths": ["src/memory/typed-schema.ts", "src/db/migrations/001_typed_memory.sql"], "sourceIds": "memory object id + ttl", "authority": { "write": "extract-memories", "read": "memory tools", "delete": "pruneExpired deletes ttl-expired objects; ttl NULL = permanent" }, "restore": "Gateway snapshot restore brings the SQLite file back.", "contains": ["derived-customer-content"], "policy": { "status": "unresolved", "decision": "RET-11" } },
    { "id": "gateway.memory_files", "store": "filesystem", "repo": "gateway", "owner": "extensions/memory-core", "sourcePaths": ["extensions/memory-core/index.ts"], "sourceIds": "agent workspace memory files", "authority": { "write": "agent tools", "read": "memory_search, memory_get", "delete": "none-found" }, "restore": "Gateway snapshot restore brings the files back.", "contains": ["derived-customer-content"], "policy": { "status": "unresolved", "decision": "RET-11" } },
    { "id": "gateway.message_ledger_outbox", "store": "sqlite", "repo": "gateway", "owner": "src/infra message-ledger", "sourcePaths": ["src/infra/message-ledger.ts", "src/infra/message-ledger-flusher.ts"], "sourceIds": "outbox id + client_id", "authority": { "write": "channel inbound hook", "read": "flusher claimBatch", "delete": "retention after markSynced not verified" }, "restore": "Gateway snapshot restore may replay unsynced rows; hub upsert is idempotent on client_id.", "contains": ["customer-content"], "policy": { "status": "unresolved", "decision": "RET-04" } },
    { "id": "site.legacy_conversation_tables", "store": "libsql", "repo": "site", "owner": "hooks.server.ts + meta-data-deletion", "sourcePaths": ["src/hooks.server.ts", "src/lib/server/meta-data-deletion.ts", "src/routes/api/data-deletion/+server.ts"], "sourceIds": "channel_user_id; session_key suffix :<numeric meta id>", "authority": { "write": "gateway sync", "read": "members area", "delete": "purgeMetaUserData on verified Meta callback; gateway-side copies explicitly not covered" }, "restore": "Provider restore resurrects purged rows.", "contains": ["customer-content", "identifiers"], "policy": { "status": "unresolved", "decision": "RET-12" } },
    { "id": "supabase.managed_backups", "store": "managed-service", "repo": "hub", "owner": "provider", "sourceIds": "project", "authority": { "write": "provider", "read": "project restore", "delete": "provider" }, "restore": "Project restore resurrects every erased row inside the retention window.", "contains": ["everything-in-postgres"], "policy": { "status": "unresolved", "decision": "RET-13" } },
    { "id": "turso.managed_backups", "store": "managed-service", "repo": "site", "owner": "provider", "sourceIds": "database", "authority": { "write": "provider", "read": "provider restore", "delete": "provider" }, "restore": "Provider restore resurrects purged legacy rows.", "contains": ["everything-in-libsql"], "policy": { "status": "unresolved", "decision": "RET-13" } },
    { "id": "meta.ops_backups_local_dumps", "store": "local-untracked", "repo": "meta", "owner": "none", "sourceIds": "ops/backups/*.sql (gitignored, present on disk)", "authority": { "write": "manual", "read": "manual", "delete": "manual" }, "restore": "Manual re-import would restore old auth rows.", "contains": ["auth-tables", "credential-material"], "policy": { "status": "unresolved", "decision": "RET-14" } }
  ],
  "decisions": [
    { "id": "RET-01", "question": "Retention duration for mirrored channel messages and knowledge sources; erasure unit (contact, conversation, org)", "decider": "owner (business/legal)", "blocks": ["hub.messages", "hub.knowledge_sources", "hub.knowledge_chunks", "gateway.qdrant_points"] },
    { "id": "RET-02", "question": "Physical removal of knowledge_documents tombstones and after how long", "decider": "owner", "blocks": ["hub.knowledge_documents"] },
    { "id": "RET-03", "question": "Retention of dead brain_vector_outbox rows and reconcile_state history", "decider": "owner + worker maintainer", "blocks": ["hub.brain_vector_outbox"] },
    { "id": "RET-04", "question": "Retention of operational rows: terminal bg_jobs, ai_usage, synced message-ledger outbox rows", "decider": "owner", "blocks": ["hub.bg_jobs", "hub.ai_usage", "gateway.message_ledger_outbox"] },
    { "id": "RET-05", "question": "Who enforces pending_channel_claims.expires_at", "decider": "owner", "blocks": ["hub.pending_channel_claims"] },
    { "id": "RET-06", "question": "Legal minimum retention for financial source documents", "decider": "owner (accounting/legal)", "blocks": ["hub.fin_statement_imports"] },
    { "id": "RET-07", "question": "Bucket lifecycle for tenant files; orphan blobs; survival after org deletion", "decider": "owner", "blocks": ["hub.tenant_files"] },
    { "id": "RET-08", "question": "Deletion of retired-generation Qdrant collections after cutover", "decider": "owner + worker maintainer", "blocks": ["gateway.qdrant_points"] },
    { "id": "RET-09", "question": "Long-term location and retention of encrypted Qdrant snapshots; resurrection rule on restore", "decider": "owner", "blocks": ["gateway.qdrant_snapshots"] },
    { "id": "RET-10", "question": "Erase versus prune for session transcripts; acceptance of the 30-day default", "decider": "owner", "blocks": ["gateway.session_transcripts"] },
    { "id": "RET-11", "question": "Retention and erasure obligations for agent memory (permanent memory objects, file-backed memory)", "decider": "owner", "blocks": ["gateway.memory_objects", "gateway.memory_files"] },
    { "id": "RET-12", "question": "Time-based retention for legacy site conversation tables; gateway-side scope of Meta deletion requests", "decider": "owner", "blocks": ["site.legacy_conversation_tables"] },
    { "id": "RET-13", "question": "Managed-backup retention windows and whether erasure obligations extend into backups", "decider": "owner + provider plan", "blocks": ["supabase.managed_backups", "turso.managed_backups"] },
    { "id": "RET-14", "question": "Delete local auth-table dumps and rotate the credentials they contain", "decider": "owner", "blocks": ["meta.ops_backups_local_dumps"] }
  ]
}
```

## Parsing entrypoints still needing their own exact plan (DATA-01 scope note)

Cursor/parse seams found in hub `src/server/services` besides the two qualified here
(`brain-corpus-jobs`, `brain-business-corpus-jobs`): `brain-corpus.service` (opaque base64 page
cursor: a corrupt cursor decodes to `null` and silently restarts page 0 — idempotent, not lossy),
`brain-business-corpus.service`, `finance-sync.service`, `meta/meta-sync.service`, plus the finance
statement parser owned by 15-02/15-07. Gateway `message-ledger` payload parsing is a separate seam.
None of these is covered by 15-03 evidence.
