-- Projects module (ERPNext Projects port) — hub-native, hung off the party spine.
-- Humans AND AI agents participate as parties: a project's customer is a party,
-- a task's assignee is a party (person OR agent). No company provisioning — the
-- module is org-scoped like every other (crm_*, fin_*, sched_*, sales_*).
-- See pg-projects-schema.ts.
--
-- Tenancy: org_id text + app_ledger role + app.current_org_id GUC. Idempotent
-- (CREATE/ADD ... IF NOT EXISTS; surgical-apply convention — never drizzle push).
--
-- Entity model (two orthogonal axes):
--   parties.type   = intrinsic nature: person | company | AGENT (added here)
--   role           = relational, emergent from which facet links the party
--                    (customer_party_id ⇒ customer, assignee_party_id ⇒ worker)
-- archetype (copilot/brain/autonomous) stays an agent-only gateway attribute,
-- resolved from agent_id — never copied onto the party.

-- ── party spine: agent-as-party support ──────────────────────────────────────
alter table public.parties add column if not exists agent_id text;  -- set ⇔ type='agent'
--> statement-breakpoint
-- One party per gateway agent per org (partial-unique; nulls allowed for people).
create unique index if not exists parties_org_agent_uniq
  on public.parties (org_id, agent_id) where agent_id is not null;
--> statement-breakpoint

-- ── proj_projects ────────────────────────────────────────────────────────────
create table if not exists public.proj_projects (
  id                uuid primary key default gen_random_uuid(),
  org_id            text not null,
  human_id          text,                              -- PRJ-YYYY-##### (naming-series)
  name              text not null,
  description       text,
  status            text not null default 'open',      -- open|active|on_hold|completed|cancelled
  customer_party_id uuid,                               -- parties.id (the client)
  lead_party_id     uuid,                               -- parties.id (lead; person or agent)
  color             text,
  icon              text,
  target_date       date,
  started_at        timestamptz,
  completed_at      timestamptz,
  archived_at       timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists proj_projects_org_status_idx   on public.proj_projects (org_id, status);
--> statement-breakpoint
create index if not exists proj_projects_org_created_idx  on public.proj_projects (org_id, created_at);
--> statement-breakpoint
create index if not exists proj_projects_customer_idx     on public.proj_projects (customer_party_id);
--> statement-breakpoint
create index if not exists proj_projects_lead_idx         on public.proj_projects (lead_party_id);
--> statement-breakpoint
create unique index if not exists proj_projects_org_human_uniq
  on public.proj_projects (org_id, human_id) where human_id is not null;
--> statement-breakpoint

-- ── proj_tasks ───────────────────────────────────────────────────────────────
-- A milestone is NOT a separate table — it is a task with is_milestone=true
-- (ERPNext's actual Projects model: Task.is_milestone). Child tasks group under
-- it via milestone_id. Saves a table/service/route/UI for one boolean.
create table if not exists public.proj_tasks (
  id                uuid primary key default gen_random_uuid(),
  org_id            text not null,
  project_id        uuid not null,
  parent_id         uuid,                               -- self-ref hierarchy (subtask of a task)
  milestone_id      uuid,                               -- → proj_tasks.id where is_milestone
  is_milestone      boolean not null default false,     -- a milestone is a flagged task
  human_id          text,                               -- TASK-YYYY-##### (naming-series)
  title             text not null,
  description       text,
  status            text not null default 'backlog',    -- backlog|todo|in_progress|in_review|done|blocked|cancelled
  priority          text not null default 'medium',     -- low|medium|high|urgent
  assignee_party_id uuid,                               -- parties.id (person OR agent)
  est_minutes       integer,                            -- estimate; actuals roll up from proj_timesheets
  sort_order        integer not null default 0,
  started_at        timestamptz,
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists proj_tasks_org_project_status_idx  on public.proj_tasks (org_id, project_id, status);
--> statement-breakpoint
create index if not exists proj_tasks_org_assignee_status_idx on public.proj_tasks (org_id, assignee_party_id, status);
--> statement-breakpoint
create index if not exists proj_tasks_org_parent_idx          on public.proj_tasks (org_id, parent_id);
--> statement-breakpoint
create index if not exists proj_tasks_org_milestone_idx       on public.proj_tasks (org_id, milestone_id);
--> statement-breakpoint
create unique index if not exists proj_tasks_org_human_uniq
  on public.proj_tasks (org_id, human_id) where human_id is not null;
--> statement-breakpoint

-- ── proj_timesheets ──────────────────────────────────────────────────────────
-- Manual effort logging (ERPNext Timesheet). minutes stored as INT — avoids
-- float-hours rounding on the billable money path (rate × minutes/60).
-- Agent token-cost lives separately in the gateway; this is human/agent HOURS.
create table if not exists public.proj_timesheets (
  id                uuid primary key default gen_random_uuid(),
  org_id            text not null,
  project_id        uuid,
  task_id           uuid,
  party_id          uuid not null,                      -- who logged the time
  spent_date        date not null,
  minutes           integer not null,
  description       text,
  billable          boolean not null default false,
  billing_rate_cents integer,                           -- per hour, when billable
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists proj_timesheets_org_project_idx on public.proj_timesheets (org_id, project_id);
--> statement-breakpoint
create index if not exists proj_timesheets_org_task_idx    on public.proj_timesheets (org_id, task_id);
--> statement-breakpoint
create index if not exists proj_timesheets_org_spent_idx   on public.proj_timesheets (org_id, spent_date);
--> statement-breakpoint
create index if not exists proj_timesheets_org_party_idx   on public.proj_timesheets (org_id, party_id);
--> statement-breakpoint

-- ── proj_templates ───────────────────────────────────────────────────────────
-- Reusable project blueprint. spec = { milestones:[{key,name,offsetDays}],
-- tasks:[{ref,title,priority,milestoneKey,parentRef,estMinutes}] }. Instantiated
-- into a project + milestones + tasks (see project-template plan helper).
create table if not exists public.proj_templates (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  name        text not null,
  description text,
  spec        jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists proj_templates_org_idx on public.proj_templates (org_id);
--> statement-breakpoint

-- ── RLS: org isolation via app_ledger role + GUC (mirrors parties/sales) ──────
grant select, insert, update, delete on public.proj_projects   to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.proj_tasks      to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.proj_timesheets to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.proj_templates  to app_ledger;
--> statement-breakpoint

alter table public.proj_projects   enable row level security;
--> statement-breakpoint
alter table public.proj_projects   force  row level security;
--> statement-breakpoint
alter table public.proj_tasks      enable row level security;
--> statement-breakpoint
alter table public.proj_tasks      force  row level security;
--> statement-breakpoint
alter table public.proj_timesheets enable row level security;
--> statement-breakpoint
alter table public.proj_timesheets force  row level security;
--> statement-breakpoint
alter table public.proj_templates  enable row level security;
--> statement-breakpoint
alter table public.proj_templates  force  row level security;
--> statement-breakpoint

create policy proj_projects_org_guc on public.proj_projects
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy proj_tasks_org_guc on public.proj_tasks
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy proj_timesheets_org_guc on public.proj_timesheets
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy proj_templates_org_guc on public.proj_templates
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
