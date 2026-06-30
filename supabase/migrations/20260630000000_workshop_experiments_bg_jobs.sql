-- Workshop experiments (model comparison, rankings, group chat) + the generic
-- bg_jobs queue for the global background-job runtime.
--
-- Lives in Supabase PG (feature/operational data). Turso is telemetry-only —
-- do not add new feature tables there. Conventions match notes/flows: text ids,
-- epoch-ms bigint timestamps, boolean flags, app-level tenant gating (no RLS
-- here; these are dev/experiment tools scoped by tenant_id in the service).
-- Idempotent.

CREATE TABLE IF NOT EXISTS workshop_prompt_categories (
  id text PRIMARY KEY, tenant_id text NOT NULL, name text NOT NULL, source text NOT NULL,
  created_at bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wpc_tenant_name ON workshop_prompt_categories (tenant_id, name);

CREATE TABLE IF NOT EXISTS workshop_comparison_runs (
  id text PRIMARY KEY, tenant_id text NOT NULL, server_id text, user_id text,
  prompt text NOT NULL, system text, params text, model_ids text NOT NULL,
  blind boolean NOT NULL DEFAULT false, category_ids text,
  created_at bigint NOT NULL, finished_at bigint
);
CREATE INDEX IF NOT EXISTS idx_wcr_tenant ON workshop_comparison_runs (tenant_id);

CREATE TABLE IF NOT EXISTS workshop_comparison_outputs (
  id text PRIMARY KEY, run_id text NOT NULL, model_id text NOT NULL, provider text,
  output text, latency_ms integer, input_tokens integer, output_tokens integer,
  cost_usd double precision, error text, created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wco_run ON workshop_comparison_outputs (run_id);

CREATE TABLE IF NOT EXISTS workshop_rankings (
  id text PRIMARY KEY, run_id text NOT NULL, model_id text NOT NULL, rank integer NOT NULL,
  picked boolean NOT NULL DEFAULT false, user_id text, created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wr_run ON workshop_rankings (run_id);
CREATE INDEX IF NOT EXISTS idx_wr_model ON workshop_rankings (model_id);

CREATE TABLE IF NOT EXISTS workshop_groupchat_runs (
  id text PRIMARY KEY, tenant_id text NOT NULL, server_id text, user_id text,
  prompt text NOT NULL, status text NOT NULL DEFAULT 'draft', rounds integer, style text,
  include_orchestrator boolean NOT NULL DEFAULT false, background boolean NOT NULL DEFAULT false,
  settings text, current_round integer NOT NULL DEFAULT 0, created_at bigint NOT NULL, finished_at bigint
);
CREATE INDEX IF NOT EXISTS idx_wgr_tenant ON workshop_groupchat_runs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_wgr_status ON workshop_groupchat_runs (status);

CREATE TABLE IF NOT EXISTS workshop_groupchat_agents (
  id text PRIMARY KEY, run_id text NOT NULL, name text NOT NULL, system_prompt text NOT NULL,
  provider text NOT NULL, model_id text NOT NULL, order_index integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wga_run ON workshop_groupchat_agents (run_id);

CREATE TABLE IF NOT EXISTS workshop_groupchat_messages (
  id text PRIMARY KEY, run_id text NOT NULL, agent_id text, round integer NOT NULL,
  role text NOT NULL, content text NOT NULL, model_id text, latency_ms integer,
  tokens integer, cost_usd double precision, created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wgm_run ON workshop_groupchat_messages (run_id);

CREATE TABLE IF NOT EXISTS bg_jobs (
  id text PRIMARY KEY, tenant_id text NOT NULL, user_id text, type text NOT NULL, ref_id text,
  status text NOT NULL DEFAULT 'queued', cursor text, error text, attempts integer NOT NULL DEFAULT 0,
  lease_until bigint, created_at bigint NOT NULL, updated_at bigint NOT NULL, started_at bigint, finished_at bigint
);
CREATE INDEX IF NOT EXISTS idx_bgjobs_status ON bg_jobs (status);
CREATE INDEX IF NOT EXISTS idx_bgjobs_tenant ON bg_jobs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_bgjobs_ref ON bg_jobs (ref_id);
