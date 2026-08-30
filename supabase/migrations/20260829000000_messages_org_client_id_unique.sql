DROP INDEX IF EXISTS "messages_client_id_uniq";
CREATE UNIQUE INDEX IF NOT EXISTS "messages_org_client_id_uniq" ON "messages" ("org_id", "client_id");
