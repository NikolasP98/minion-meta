// Portfolio types — mirrors paperclip-minion/packages/shared/src/types/portfolio.ts (WP1/WP4).
// See specs/2026-07-11-universal-projects-module.md §2.3, §2.6.

export type PortfolioStatus = 'active' | 'archived';

export interface Portfolio {
  id: string;
  companyId: string;
  name: string;
  objective: string | null;
  guardrails: string | null;
  charter: string | null;
  status: PortfolioStatus;
  leadAgentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioStuckIssue {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  updatedAt: Date;
}

export interface PortfolioMetricsBucket {
  openByStatus: Record<string, number>;
  createdLast7d: number;
  createdLast30d: number;
  completedLast7d: number;
  completedLast30d: number;
  avgCycleTimeHours: number | null;
  changesRequestedRate: number | null;
  avgEvalScore: number | null;
  stuckIssues: PortfolioStuckIssue[];
  activeWorkspaces: number;
}

export type PortfolioMetrics = {
  rollup: PortfolioMetricsBucket;
  projects: Array<{ projectId: string; projectName: string } & PortfolioMetricsBucket>;
};
