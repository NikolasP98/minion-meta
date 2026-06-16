// VENDORED FROM paperclip-minion/packages/shared/src/types/instance.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

export type FeedbackDataSharingPreference = 'allowed' | 'not_allowed' | 'prompt';

export interface BackupRetentionPolicy {
  dailyDays: 3 | 7 | 14;
  weeklyWeeks: 1 | 2 | 4;
  monthlyMonths: 1 | 3 | 6;
}

export interface InstanceGeneralSettings {
  censorUsernameInLogs: boolean;
  keyboardShortcuts: boolean;
  feedbackDataSharingPreference: FeedbackDataSharingPreference;
  backupRetention: BackupRetentionPolicy;
}

export interface InstanceExperimentalSettings {
  enableIsolatedWorkspaces: boolean;
  autoRestartDevServerWhenIdle: boolean;
}

export interface InstanceSettings {
  id: string;
  general: InstanceGeneralSettings;
  experimental: InstanceExperimentalSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type PatchInstanceGeneralSettings = Partial<InstanceGeneralSettings>;
export type PatchInstanceExperimentalSettings = Partial<InstanceExperimentalSettings>;
