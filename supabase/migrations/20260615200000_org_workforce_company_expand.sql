-- Rename paperclip → workforce (expand phase). Add the canonical
-- `workforce_company_id` column alongside the legacy `paperclip_company_id`,
-- backfill it, and mirror the partial-unique index. The application reads
-- `workforce_company_id ?? paperclip_company_id` and writes only the new column,
-- so this migration is safe to apply before OR after the hub code deploy
-- (expand/contract). A later contract migration drops `paperclip_company_id`.

alter table organizations add column if not exists workforce_company_id text;

-- Backfill the new column from the legacy one for every already-mapped org.
update organizations
  set workforce_company_id = paperclip_company_id
  where paperclip_company_id is not null
    and workforce_company_id is null;

create unique index if not exists organizations_workforce_company_id_key
  on organizations (workforce_company_id)
  where workforce_company_id is not null;
