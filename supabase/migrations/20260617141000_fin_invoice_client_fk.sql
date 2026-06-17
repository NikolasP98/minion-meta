-- Relational link: fin_invoices.client_id → fin_clients(id). Nullable; set at
-- upsert from the client upsert going forward, backfilled here for existing rows
-- by matching (org, provider, doc_number). Analytics/CRM-bridge join on this FK
-- instead of the client_doc_number string. The denormalized client_name/doc/email
-- stay as the as-billed snapshot. Additive + idempotent.

alter table public.fin_invoices
  add column if not exists client_id uuid references public.fin_clients(id) on delete set null;
--> statement-breakpoint
create index if not exists fin_invoices_client_idx
  on public.fin_invoices (client_id);
--> statement-breakpoint
update public.fin_invoices i
   set client_id = c.id
  from public.fin_clients c
 where i.client_id is null
   and c.org_id = i.org_id
   and c.provider = i.provider
   and c.doc_number = i.client_doc_number
   and c.doc_number is not null;
--> statement-breakpoint
