// VENDORED FROM paperclip-minion/packages/shared/src/types/budget.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PauseReason } from './agent.js';

export type BudgetScopeType = 'company' | 'agent' | 'project';
export type BudgetMetric = 'cost_cents' | 'token_count';
export type BudgetWindowKind = 'calendar_month' | 'rolling_30d' | 'rolling_7d' | 'rolling_24h';
export type BudgetThresholdType = 'warn' | 'hard_stop';
export type BudgetIncidentStatus = 'active' | 'resolved';
export type BudgetIncidentResolutionAction = 'acknowledge' | 'increase_limit' | 'decrease_limit';

export interface BudgetPolicy {
  id: string;
  companyId: string;
  scopeType: BudgetScopeType;
  scopeId: string;
  metric: BudgetMetric;
  windowKind: BudgetWindowKind;
  amount: number;
  warnPercent: number;
  hardStopEnabled: boolean;
  notifyEnabled: boolean;
  isActive: boolean;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetPolicySummary {
  policyId: string;
  companyId: string;
  scopeType: BudgetScopeType;
  scopeId: string;
  scopeName: string;
  metric: BudgetMetric;
  windowKind: BudgetWindowKind;
  amount: number;
  observedAmount: number;
  remainingAmount: number;
  utilizationPercent: number;
  warnPercent: number;
  hardStopEnabled: boolean;
  notifyEnabled: boolean;
  isActive: boolean;
  status: 'ok' | 'warning' | 'hard_stop';
  paused: boolean;
  pauseReason: PauseReason | null;
  windowStart: Date;
  windowEnd: Date;
}

export interface BudgetIncident {
  id: string;
  companyId: string;
  policyId: string;
  scopeType: BudgetScopeType;
  scopeId: string;
  scopeName: string;
  metric: BudgetMetric;
  windowKind: BudgetWindowKind;
  windowStart: Date;
  windowEnd: Date;
  thresholdType: BudgetThresholdType;
  amountLimit: number;
  amountObserved: number;
  status: BudgetIncidentStatus;
  approvalId: string | null;
  approvalStatus: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetOverview {
  companyId: string;
  policies: BudgetPolicySummary[];
  activeIncidents: BudgetIncident[];
  pausedAgentCount: number;
  pausedProjectCount: number;
  pendingApprovalCount: number;
}

export interface BudgetPolicyUpsertInput {
  scopeType: BudgetScopeType;
  scopeId: string;
  metric?: BudgetMetric;
  windowKind?: BudgetWindowKind;
  amount: number;
  warnPercent?: number;
  hardStopEnabled?: boolean;
  notifyEnabled?: boolean;
  isActive?: boolean;
}

export interface BudgetIncidentResolutionInput {
  action: BudgetIncidentResolutionAction;
  amount?: number;
  decisionNote?: string | null;
}
