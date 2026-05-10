import { accessApi } from './api/access.js';
import { activityApi } from './api/activity.js';
import { adaptersApi } from './api/adapters.js';
import { agentsApi } from './api/agents.js';
import { approvalsApi } from './api/approvals.js';
import { assetsApi } from './api/assets.js';
import { budgetsApi } from './api/budgets.js';
import { companiesApi } from './api/companies.js';
import { companySkillsApi } from './api/company-skills.js';
import { costsApi } from './api/costs.js';
import { dashboardApi } from './api/dashboard.js';
import { executionWorkspacesApi } from './api/execution-workspaces.js';
import { goalsApi } from './api/goals.js';
import { healthApi } from './api/health.js';
import { heartbeatsApi } from './api/heartbeats.js';
import { inboxDismissalsApi } from './api/inbox-dismissals.js';
import { instanceSettingsApi } from './api/instance-settings.js';
import { issuesApi } from './api/issues.js';
import { pluginsApi } from './api/plugins.js';
import { projectsApi } from './api/projects.js';
import { routinesApi } from './api/routines.js';
import { secretsApi } from './api/secrets.js';
import { sidebarBadgesApi } from './api/sidebar-badges.js';

export type PaperclipClientOptions = {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  headers?: Record<string, string>;
};

export class PaperclipApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`paperclip ${status}`);
  }
}

export type RequestArgs = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export type PaperclipClientBase = {
  request<T = unknown>(args: RequestArgs): Promise<T>;
};

export type PaperclipClient = PaperclipClientBase & {
  access: ReturnType<typeof accessApi>;
  activity: ReturnType<typeof activityApi>;
  adapters: ReturnType<typeof adaptersApi>;
  agents: ReturnType<typeof agentsApi>;
  approvals: ReturnType<typeof approvalsApi>;
  assets: ReturnType<typeof assetsApi>;
  budgets: ReturnType<typeof budgetsApi>;
  companies: ReturnType<typeof companiesApi>;
  companySkills: ReturnType<typeof companySkillsApi>;
  costs: ReturnType<typeof costsApi>;
  dashboard: ReturnType<typeof dashboardApi>;
  executionWorkspaces: ReturnType<typeof executionWorkspacesApi>;
  goals: ReturnType<typeof goalsApi>;
  health: ReturnType<typeof healthApi>;
  heartbeats: ReturnType<typeof heartbeatsApi>;
  inboxDismissals: ReturnType<typeof inboxDismissalsApi>;
  instanceSettings: ReturnType<typeof instanceSettingsApi>;
  issues: ReturnType<typeof issuesApi>;
  plugins: ReturnType<typeof pluginsApi>;
  projects: ReturnType<typeof projectsApi>;
  routines: ReturnType<typeof routinesApi>;
  secrets: ReturnType<typeof secretsApi>;
  sidebarBadges: ReturnType<typeof sidebarBadgesApi>;
};

export function createPaperclipClient(opts: PaperclipClientOptions): PaperclipClient {
  const base: PaperclipClientBase = {
    async request<T>({ method, path, body, query }: RequestArgs): Promise<T> {
      const url = new URL(opts.baseUrl + path);
      if (query) {
        for (const [k, v] of Object.entries(query)) {
          if (v !== undefined) url.searchParams.set(k, String(v));
        }
      }
      const res = await opts.fetch(url.toString(), {
        method,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...opts.headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;
      if (!res.ok) throw new PaperclipApiError(res.status, payload);
      return payload as T;
    },
  };

  return Object.assign(base, {
    access: accessApi(base),
    activity: activityApi(base),
    adapters: adaptersApi(base),
    agents: agentsApi(base),
    approvals: approvalsApi(base),
    assets: assetsApi(base),
    budgets: budgetsApi(base),
    companies: companiesApi(base),
    companySkills: companySkillsApi(base),
    costs: costsApi(base),
    dashboard: dashboardApi(base),
    executionWorkspaces: executionWorkspacesApi(base),
    goals: goalsApi(base),
    health: healthApi(base),
    heartbeats: heartbeatsApi(base),
    inboxDismissals: inboxDismissalsApi(base),
    instanceSettings: instanceSettingsApi(base),
    issues: issuesApi(base),
    plugins: pluginsApi(base),
    projects: projectsApi(base),
    routines: routinesApi(base),
    secrets: secretsApi(base),
    sidebarBadges: sidebarBadgesApi(base),
  });
}
