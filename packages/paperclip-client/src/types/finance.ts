// VENDORED FROM paperclip-minion/packages/shared/src/types/finance.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { AgentAdapterType } from './access.js';

export type FinanceDirection = 'debit' | 'credit';
export type FinanceEventKind =
  | 'token_usage'
  | 'subscription_token_usage'
  | 'manual_credit'
  | 'manual_debit'
  | 'refund'
  | 'other';
export type FinanceUnit =
  | 'input_token'
  | 'output_token'
  | 'cached_input_token'
  | 'request'
  | 'unit';

export interface FinanceEvent {
  id: string;
  companyId: string;
  agentId: string | null;
  issueId: string | null;
  projectId: string | null;
  goalId: string | null;
  heartbeatRunId: string | null;
  costEventId: string | null;
  billingCode: string | null;
  description: string | null;
  eventKind: FinanceEventKind;
  direction: FinanceDirection;
  biller: string;
  provider: string | null;
  executionAdapterType: AgentAdapterType | null;
  pricingTier: string | null;
  region: string | null;
  model: string | null;
  quantity: number | null;
  unit: FinanceUnit | null;
  amountCents: number;
  currency: string;
  estimated: boolean;
  externalInvoiceId: string | null;
  metadataJson: Record<string, unknown> | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface FinanceSummary {
  companyId: string;
  debitCents: number;
  creditCents: number;
  netCents: number;
  estimatedDebitCents: number;
  eventCount: number;
}

export interface FinanceByBiller {
  biller: string;
  debitCents: number;
  creditCents: number;
  netCents: number;
  estimatedDebitCents: number;
  eventCount: number;
  kindCount: number;
}

export interface FinanceByKind {
  eventKind: FinanceEventKind;
  debitCents: number;
  creditCents: number;
  netCents: number;
  estimatedDebitCents: number;
  eventCount: number;
  billerCount: number;
}
