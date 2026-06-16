// VENDORED FROM paperclip-minion/packages/shared/src/types/inbox-dismissal.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

export interface InboxDismissal {
  id: string;
  companyId: string;
  userId: string;
  itemKey: string;
  dismissedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
