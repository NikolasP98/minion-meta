// VENDORED FROM paperclip-minion/ui/src/api/health.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

export type DevServerHealthStatus = {
  enabled: true;
  restartRequired: boolean;
  reason: 'backend_changes' | 'pending_migrations' | 'backend_changes_and_pending_migrations' | null;
  lastChangedAt: string | null;
  changedPathCount: number;
  changedPathsSample: string[];
  pendingMigrations: string[];
  autoRestartEnabled: boolean;
  activeRunCount: number;
  waitingForIdle: boolean;
  lastRestartAt: string | null;
};

export type HealthStatus = {
  status: 'ok';
  version?: string;
  deploymentMode?: 'local_trusted' | 'authenticated';
  deploymentExposure?: 'private' | 'public';
  authReady?: boolean;
  bootstrapStatus?: 'ready' | 'bootstrap_pending';
  bootstrapInviteActive?: boolean;
  features?: {
    companyDeletionEnabled?: boolean;
  };
  devServer?: DevServerHealthStatus;
};
