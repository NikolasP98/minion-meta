// VENDORED FROM paperclip-minion/packages/shared/src/types/quota.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

export interface QuotaWindow {
  label: string;
  usedPercent: number | null;
  resetsAt: string | null;
  valueLabel: string | null;
  detail?: string | null;
}

export interface ProviderQuotaResult {
  provider: string;
  source?: string | null;
  ok: boolean;
  error?: string;
  windows: QuotaWindow[];
}
