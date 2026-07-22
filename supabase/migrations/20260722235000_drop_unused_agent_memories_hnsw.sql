-- Current memory ranking combines relevance, recency, and importance, so this
-- raw-distance HNSW index is not selected by the production query plan.
-- Embeddings remain canonical and exact retrieval remains available.
drop index if exists public.agent_memories_embedding_hnsw;
