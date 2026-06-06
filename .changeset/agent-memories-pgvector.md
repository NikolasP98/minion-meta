---
"@minion-stack/db": minor
---

Add `agent_memories` pgvector schema (org-scoped agent memory corpus with 1536-dim embeddings) for RAG retrieval + hub memory visualization. Includes RLS (app_ledger + app.current_org_id GUC) and an HNSW cosine index in companion migrations.
