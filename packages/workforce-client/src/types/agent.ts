// VENDORED FROM paperclip-minion/packages/shared/src/types/agent.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { AgentAdapterType, CompanyMembership, PrincipalPermissionGrant } from './access.js';
import type { PauseReason } from './constants.js';

export type { PauseReason };

export type AgentStatus =
  | 'active'
  | 'paused'
  | 'idle'
  | 'running'
  | 'error'
  | 'pending_approval'
  | 'terminated';

export type AgentRole =
  | 'ceo'
  | 'cto'
  | 'cmo'
  | 'cfo'
  | 'engineer'
  | 'designer'
  | 'pm'
  | 'qa'
  | 'devops'
  | 'researcher'
  | 'general';

export type HeartbeatInvocationSource =
  | 'timer'
  | 'assignment'
  | 'on_demand'
  | 'automation';

export type HeartbeatRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

export type WakeupTriggerDetail =
  | 'manual'
  | 'ping'
  | 'callback'
  | 'system';

export type WakeupRequestStatus =
  | 'queued'
  | 'claimed'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentPermissions {
  canCreateAgents: boolean;
}

export type AgentInstructionsBundleMode = 'managed' | 'external';

export interface AgentInstructionsFileSummary {
  path: string;
  size: number;
  language: string;
  markdown: boolean;
  isEntryFile: boolean;
  editable: boolean;
  deprecated: boolean;
  virtual: boolean;
}

export interface AgentInstructionsFileDetail extends AgentInstructionsFileSummary {
  content: string;
}

export interface AgentInstructionsBundle {
  agentId: string;
  companyId: string;
  mode: AgentInstructionsBundleMode | null;
  rootPath: string | null;
  managedRootPath: string;
  entryFile: string;
  resolvedEntryPath: string | null;
  editable: boolean;
  warnings: string[];
  legacyPromptTemplateActive: boolean;
  legacyBootstrapPromptTemplateActive: boolean;
  files: AgentInstructionsFileSummary[];
}

export interface AgentAccessState {
  canAssignTasks: boolean;
  taskAssignSource: 'explicit_grant' | 'agent_creator' | 'ceo_role' | 'none';
  membership: CompanyMembership | null;
  grants: PrincipalPermissionGrant[];
}

export interface AgentChainOfCommandEntry {
  id: string;
  name: string;
  role: AgentRole;
  title: string | null;
}

export interface Agent {
  id: string;
  companyId: string;
  name: string;
  urlKey: string;
  role: AgentRole;
  title: string | null;
  icon: string | null;
  status: AgentStatus;
  reportsTo: string | null;
  capabilities: string | null;
  adapterType: AgentAdapterType;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  pauseReason: PauseReason | null;
  pausedAt: Date | null;
  permissions: AgentPermissions;
  lastHeartbeatAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentDetail extends Agent {
  chainOfCommand: AgentChainOfCommandEntry[];
  access: AgentAccessState;
}

export interface AgentKeyCreated {
  id: string;
  name: string;
  token: string;
  createdAt: Date;
}

export interface AgentConfigRevision {
  id: string;
  companyId: string;
  agentId: string;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  source: string;
  rolledBackFromRevisionId: string | null;
  changedKeys: string[];
  beforeConfig: Record<string, unknown>;
  afterConfig: Record<string, unknown>;
  createdAt: Date;
}

export type AdapterEnvironmentCheckLevel = 'info' | 'warn' | 'error';
export type AdapterEnvironmentTestStatus = 'pass' | 'warn' | 'fail';

export interface AdapterEnvironmentCheck {
  code: string;
  level: AdapterEnvironmentCheckLevel;
  message: string;
  detail?: string | null;
  hint?: string | null;
}

export interface AdapterEnvironmentTestResult {
  adapterType: string;
  status: AdapterEnvironmentTestStatus;
  checks: AdapterEnvironmentCheck[];
  testedAt: string;
}
