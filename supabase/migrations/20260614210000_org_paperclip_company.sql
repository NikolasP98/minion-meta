-- Bridge hub org → paperclip company. One company per org.
alter table organizations add column if not exists paperclip_company_id text;

create unique index if not exists organizations_paperclip_company_id_key
  on organizations (paperclip_company_id)
  where paperclip_company_id is not null;

-- Backfill existing gw orgs to their already-provisioned paperclip companies
-- (verified 2026-06-14 via companies.list() against netcup). Pure backfill —
-- no creation, so the instance-admin create requirement does not apply here.
update organizations set paperclip_company_id = 'fea398fc-ca7f-4dc8-be3f-38b8725a51db'
  where id = '21e0601b-f632-43fd-8414-d644af4271f4' and paperclip_company_id is null; -- FACES SCULPTORS
update organizations set paperclip_company_id = 'a32be1cc-88e9-4207-a4da-cf818e3c91e9'
  where id = 'c9e8dc46-27b6-4aea-86a1-a2eb6b23be2d' and paperclip_company_id is null; -- MINION
-- Pinonite corp. (paperclip 3e721e98-…) has no matching gw org → left unmapped.
