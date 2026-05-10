// VENDORED FROM paperclip-minion/packages/shared/src/types/goal.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

export type GoalLevel = 'company' | 'team' | 'agent' | 'task';
export type GoalStatus = 'planned' | 'active' | 'achieved' | 'cancelled';

export interface Goal {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  level: GoalLevel;
  status: GoalStatus;
  parentId: string | null;
  ownerAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
