-- RLS + pgvector index for agent_memories. Mirrors messages_rls.sql:
-- org isolation via the app_ledger role + app.current_org_id GUC (withOrg()).

-- app_ledger may already exist (created by messages_rls); create idempotently.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_ledger') then
    create role app_ledger nologin nobypassrls;
  end if;
end $$;
--> statement-breakpoint
grant app_ledger to postgres;
--> statement-breakpoint
grant usage on schema public to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.agent_memories to app_ledger;
--> statement-breakpoint
-- ANN index for semantic search. text-embedding-3-small vectors are normalized,
-- so cosine distance is appropriate. HNSW = fast recall, good for read-heavy RAG.
create index if not exists agent_memories_embedding_hnsw
  on public.agent_memories using hnsw (embedding vector_cosine_ops);
--> statement-breakpoint
-- Enable + FORCE so even the table owner is subject to policies.
alter table public.agent_memories enable row level security;
--> statement-breakpoint
alter table public.agent_memories force row level security;
--> statement-breakpoint
-- Org isolation: a session may only see/write rows whose org_id matches the GUC
-- set by withOrg(). Unset GUC → NULL → predicate false → zero rows (fail-closed).
create policy agent_memories_org_isolation on public.agent_memories
  for all
  using (org_id = current_setting('app.current_org_id', true))
  with check (org_id = current_setting('app.current_org_id', true));
