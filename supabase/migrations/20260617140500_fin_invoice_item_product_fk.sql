-- Relational link: fin_invoice_items.product_id → fin_products(id). Nullable
-- (uncatalogued codes resolve to null); resolved by code at sync time + backfilled
-- by the catalog import. The item keeps its as-billed code/description snapshot.
-- Additive + idempotent.

alter table public.fin_invoice_items
  add column if not exists product_id uuid references public.fin_products(id) on delete set null;
--> statement-breakpoint
create index if not exists fin_invoice_items_product_idx
  on public.fin_invoice_items (product_id);
--> statement-breakpoint
