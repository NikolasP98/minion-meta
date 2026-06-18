-- CRM C3 — winning-conversation embeddings (dormant RAG groundwork). One row per
-- buyer conversation. pgvector cosine search mirrors agent_memories. Idempotent.
create extension if not exists vector;
--> statement-breakpoint
create table if not exists public.crm_win_embeddings (
  org_id     text not null,
  contact_id uuid not null,
  embedding  vector(1536),
  msg_count  integer not null default 0,
  bought     text[] not null default '{}',
  snippet    text,
  built_at   timestamptz not null default now(),
  primary key (org_id, contact_id)
);
--> statement-breakpoint
create index if not exists crm_win_embeddings_vec_idx
  on public.crm_win_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 10);
--> statement-breakpoint
grant select, insert, update, delete on public.crm_win_embeddings to app_ledger;
--> statement-breakpoint
alter table public.crm_win_embeddings enable row level security;
--> statement-breakpoint
alter table public.crm_win_embeddings force  row level security;
--> statement-breakpoint
create policy crm_win_embeddings_org_guc on public.crm_win_embeddings
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
