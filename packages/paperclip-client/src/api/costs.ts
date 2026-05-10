// VENDORED FROM paperclip-minion/ui/src/api/costs.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClient } from '../client.js';
import type {
  CostSummary,
  CostByAgent,
  CostByProviderModel,
  CostByBiller,
  CostByAgentModel,
  CostByProject,
  CostWindowSpendRow,
} from '../types/cost.js';
import type {
  FinanceSummary,
  FinanceByBiller,
  FinanceByKind,
  FinanceEvent,
} from '../types/finance.js';
import type { ProviderQuotaResult } from '../types/quota.js';

function dateQuery(from?: string, to?: string): Record<string, string | undefined> | undefined {
  const q: Record<string, string | undefined> = {};
  if (from) q['from'] = from;
  if (to) q['to'] = to;
  return Object.keys(q).length ? q : undefined;
}

export function costsApi(client: PaperclipClient) {
  return {
    summary(companyId: string, from?: string, to?: string): Promise<CostSummary> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/summary`, query: dateQuery(from, to) });
    },

    byAgent(companyId: string, from?: string, to?: string): Promise<CostByAgent[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/by-agent`, query: dateQuery(from, to) });
    },

    byAgentModel(companyId: string, from?: string, to?: string): Promise<CostByAgentModel[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/by-agent-model`, query: dateQuery(from, to) });
    },

    byProject(companyId: string, from?: string, to?: string): Promise<CostByProject[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/by-project`, query: dateQuery(from, to) });
    },

    byProvider(companyId: string, from?: string, to?: string): Promise<CostByProviderModel[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/by-provider`, query: dateQuery(from, to) });
    },

    byBiller(companyId: string, from?: string, to?: string): Promise<CostByBiller[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/by-biller`, query: dateQuery(from, to) });
    },

    financeSummary(companyId: string, from?: string, to?: string): Promise<FinanceSummary> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/finance-summary`, query: dateQuery(from, to) });
    },

    financeByBiller(companyId: string, from?: string, to?: string): Promise<FinanceByBiller[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/finance-by-biller`, query: dateQuery(from, to) });
    },

    financeByKind(companyId: string, from?: string, to?: string): Promise<FinanceByKind[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/finance-by-kind`, query: dateQuery(from, to) });
    },

    financeEvents(companyId: string, from?: string, to?: string, limit = 100): Promise<FinanceEvent[]> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${companyId}/costs/finance-events`,
        query: { ...dateQuery(from, to), limit },
      });
    },

    windowSpend(companyId: string): Promise<CostWindowSpendRow[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/window-spend` });
    },

    quotaWindows(companyId: string): Promise<ProviderQuotaResult[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/costs/quota-windows` });
    },
  };
}
