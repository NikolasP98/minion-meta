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
import { pipelinesApi } from './api/pipelines.js';
import { pluginsApi } from './api/plugins.js';
import { portfoliosApi } from './api/portfolios.js';
import { projectsApi } from './api/projects.js';
import { routinesApi } from './api/routines.js';
import { secretsApi } from './api/secrets.js';
import { sidebarBadgesApi } from './api/sidebar-badges.js';

export type WorkforceClientOptions = {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  headers?: Record<string, string>;
};

export type WorkforceErrorBodyKind = 'json' | 'text' | 'empty';

/** Max length, in JS string code units, of the `raw` field on a non-JSON error body (including the truncation marker). */
export const WORKFORCE_ERROR_RAW_LIMIT = 2048;

export class WorkforceApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    /** How `body` was derived. 'text' ⇒ the response was not JSON; `body` is `{ raw, contentType, truncated }`. */
    public readonly bodyKind: WorkforceErrorBodyKind = 'json',
  ) {
    super(`paperclip ${status}`);
  }
}

function nonJsonBody(text: string, contentType: string | null): { raw: string; contentType: string | null; truncated: boolean } {
  const total = text.length;
  if (total <= WORKFORCE_ERROR_RAW_LIMIT) {
    return { raw: text, contentType, truncated: false };
  }
  // Fixed-point: the marker embeds `keep`, whose digit count can shift the marker's own length.
  let keep = WORKFORCE_ERROR_RAW_LIMIT;
  let marker = '';
  for (let i = 0; i < 3; i++) {
    marker = `… [truncated ${keep} of ${total} chars]`;
    keep = WORKFORCE_ERROR_RAW_LIMIT - marker.length;
  }
  return { raw: text.slice(0, keep) + marker, contentType, truncated: true };
}

export type RequestArgs = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export type WorkforceClientBase = {
  request<T = unknown>(args: RequestArgs): Promise<T>;
};

export type WorkforceClient = WorkforceClientBase & {
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
  pipelines: ReturnType<typeof pipelinesApi>;
  plugins: ReturnType<typeof pluginsApi>;
  portfolios: ReturnType<typeof portfoliosApi>;
  projects: ReturnType<typeof projectsApi>;
  routines: ReturnType<typeof routinesApi>;
  secrets: ReturnType<typeof secretsApi>;
  sidebarBadges: ReturnType<typeof sidebarBadgesApi>;
};

export function createWorkforceClient(opts: WorkforceClientOptions): WorkforceClient {
  const base: WorkforceClientBase = {
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
      if (!text) {
        if (!res.ok) throw new WorkforceApiError(res.status, null, 'empty');
        return null as T;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        // Not JSON: a proxy 502 HTML page, a CDN interstitial, a login redirect body.
        // TODO(handoff): `body.raw` carries an upstream error page (hostnames, upstream paths);
        // consumers must not forward it to a browser when bodyKind === 'text' — log server-side and
        // return a generic 502 envelope instead. minion_hub's src/lib/server/workforce-fetch.ts is
        // unaudited (repo not checked out here); see proposals/2026-08-17-hub-workforce-error-body-leak.md.
        throw new WorkforceApiError(res.status, nonJsonBody(text, res.headers.get('content-type')), 'text');
      }
      if (!res.ok) throw new WorkforceApiError(res.status, payload, 'json');
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
    pipelines: pipelinesApi(base),
    plugins: pluginsApi(base),
    portfolios: portfoliosApi(base),
    projects: projectsApi(base),
    routines: routinesApi(base),
    secrets: secretsApi(base),
    sidebarBadges: sidebarBadgesApi(base),
  });
}
