// VENDORED FROM paperclip-minion/ui/src/api/budgets.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { WorkforceClientBase } from '../client.js';
import type {
  BudgetIncident,
  BudgetIncidentResolutionInput,
  BudgetOverview,
  BudgetPolicySummary,
  BudgetPolicyUpsertInput,
} from '../types/budget.js';

export function budgetsApi(client: WorkforceClientBase) {
  return {
    overview(companyId: string): Promise<BudgetOverview> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/budgets/overview` });
    },

    upsertPolicy(companyId: string, data: BudgetPolicyUpsertInput): Promise<BudgetPolicySummary> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/budgets/policies`, body: data });
    },

    resolveIncident(
      companyId: string,
      incidentId: string,
      data: BudgetIncidentResolutionInput,
    ): Promise<BudgetIncident> {
      return client.request({
        method: 'POST',
        path: `/api/companies/${companyId}/budget-incidents/${encodeURIComponent(incidentId)}/resolve`,
        body: data,
      });
    },
  };
}
