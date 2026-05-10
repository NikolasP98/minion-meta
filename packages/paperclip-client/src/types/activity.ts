// VENDORED FROM paperclip-minion/packages/shared/src/types/activity.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

export interface ActivityEvent {
  id: string;
  companyId: string;
  actorType: 'agent' | 'user' | 'system';
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  agentId: string | null;
  runId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}
