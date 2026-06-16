// VENDORED FROM paperclip-minion/packages/shared/src/constants.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503
// (subset: only CompanyStatus and PauseReason, needed by company.ts)

export const COMPANY_STATUSES = ['active', 'paused', 'archived'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const PAUSE_REASONS = ['manual', 'budget', 'system'] as const;
export type PauseReason = (typeof PAUSE_REASONS)[number];
