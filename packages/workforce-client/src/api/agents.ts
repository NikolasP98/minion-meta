// VENDORED FROM paperclip-minion/ui/src/api/agents.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { WorkforceClientBase } from '../client.js';
import type {
  Agent,
  AgentDetail,
  AgentInstructionsBundle,
  AgentInstructionsFileDetail,
  AgentKeyCreated,
  AgentConfigRevision,
  AdapterEnvironmentTestResult,
} from '../types/agent.js';
import type {
  AgentRuntimeState,
  AgentTaskSession,
  AgentWakeupResponse,
  HeartbeatRun,
} from '../types/heartbeat.js';
import type { Approval } from '../types/approval.js';
import type { AgentSkillSnapshot } from '../types/agent-skills.js';

export interface AgentKey {
  id: string;
  name: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface AdapterModel {
  id: string;
  label: string;
}

export interface DetectedAdapterModel {
  model: string;
  provider: string;
  source: string;
  candidates?: string[];
}

export interface ClaudeLoginResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  loginUrl: string | null;
  stdout: string;
  stderr: string;
}

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  status: string;
  reports: OrgNode[];
}

export interface AgentHireResponse {
  agent: Agent;
  approval: Approval | null;
}

export interface AgentPermissionUpdate {
  canCreateAgents: boolean;
  canAssignTasks: boolean;
}

export interface AvailableSkill {
  name: string;
  description: string;
  isWorkforceManaged: boolean;
}

export function agentsApi(client: WorkforceClientBase) {
  return {
    list(companyId: string): Promise<Agent[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/agents` });
    },

    org(companyId: string): Promise<OrgNode[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/org` });
    },

    listConfigurations(companyId: string): Promise<Record<string, unknown>[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/agent-configurations` });
    },

    get(id: string, companyId?: string): Promise<AgentDetail> {
      const path = `/api/agents/${encodeURIComponent(id)}`;
      return client.request({ method: 'GET', path, query: companyId ? { companyId } : undefined });
    },

    getConfiguration(id: string, companyId?: string): Promise<Record<string, unknown>> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/configuration`,
        query: companyId ? { companyId } : undefined,
      });
    },

    listConfigRevisions(id: string, companyId?: string): Promise<AgentConfigRevision[]> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/config-revisions`,
        query: companyId ? { companyId } : undefined,
      });
    },

    getConfigRevision(id: string, revisionId: string, companyId?: string): Promise<AgentConfigRevision> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/config-revisions/${revisionId}`,
        query: companyId ? { companyId } : undefined,
      });
    },

    rollbackConfigRevision(id: string, revisionId: string, companyId?: string): Promise<Agent> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/config-revisions/${revisionId}/rollback`,
        body: {},
        query: companyId ? { companyId } : undefined,
      });
    },

    create(companyId: string, data: Record<string, unknown>): Promise<Agent> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/agents`, body: data });
    },

    hire(companyId: string, data: Record<string, unknown>): Promise<AgentHireResponse> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/agent-hires`, body: data });
    },

    update(id: string, data: Record<string, unknown>, companyId?: string): Promise<Agent> {
      return client.request({
        method: 'PATCH',
        path: `/api/agents/${encodeURIComponent(id)}`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    updatePermissions(id: string, data: AgentPermissionUpdate, companyId?: string): Promise<AgentDetail> {
      return client.request({
        method: 'PATCH',
        path: `/api/agents/${encodeURIComponent(id)}/permissions`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    instructionsBundle(id: string, companyId?: string): Promise<AgentInstructionsBundle> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/instructions-bundle`,
        query: companyId ? { companyId } : undefined,
      });
    },

    updateInstructionsBundle(
      id: string,
      data: {
        mode?: 'managed' | 'external';
        rootPath?: string | null;
        entryFile?: string;
        clearLegacyPromptTemplate?: boolean;
      },
      companyId?: string,
    ): Promise<AgentInstructionsBundle> {
      return client.request({
        method: 'PATCH',
        path: `/api/agents/${encodeURIComponent(id)}/instructions-bundle`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    instructionsFile(id: string, relativePath: string, companyId?: string): Promise<AgentInstructionsFileDetail> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/instructions-bundle/file`,
        query: { path: relativePath, ...(companyId ? { companyId } : {}) },
      });
    },

    saveInstructionsFile(
      id: string,
      data: { path: string; content: string; clearLegacyPromptTemplate?: boolean },
      companyId?: string,
    ): Promise<AgentInstructionsFileDetail> {
      return client.request({
        method: 'PUT',
        path: `/api/agents/${encodeURIComponent(id)}/instructions-bundle/file`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    deleteInstructionsFile(id: string, relativePath: string, companyId?: string): Promise<AgentInstructionsBundle> {
      return client.request({
        method: 'DELETE',
        path: `/api/agents/${encodeURIComponent(id)}/instructions-bundle/file`,
        query: { path: relativePath, ...(companyId ? { companyId } : {}) },
      });
    },

    pause(id: string, companyId?: string): Promise<Agent> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/pause`,
        body: {},
        query: companyId ? { companyId } : undefined,
      });
    },

    resume(id: string, companyId?: string): Promise<Agent> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/resume`,
        body: {},
        query: companyId ? { companyId } : undefined,
      });
    },

    terminate(id: string, companyId?: string): Promise<Agent> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/terminate`,
        body: {},
        query: companyId ? { companyId } : undefined,
      });
    },

    remove(id: string, companyId?: string): Promise<{ ok: true }> {
      return client.request({
        method: 'DELETE',
        path: `/api/agents/${encodeURIComponent(id)}`,
        query: companyId ? { companyId } : undefined,
      });
    },

    listKeys(id: string, companyId?: string): Promise<AgentKey[]> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/keys`,
        query: companyId ? { companyId } : undefined,
      });
    },

    skills(id: string, companyId?: string): Promise<AgentSkillSnapshot> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/skills`,
        query: companyId ? { companyId } : undefined,
      });
    },

    syncSkills(id: string, desiredSkills: string[], companyId?: string): Promise<AgentSkillSnapshot> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/skills/sync`,
        body: { desiredSkills },
        query: companyId ? { companyId } : undefined,
      });
    },

    createKey(id: string, name: string, companyId?: string): Promise<AgentKeyCreated> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/keys`,
        body: { name },
        query: companyId ? { companyId } : undefined,
      });
    },

    revokeKey(agentId: string, keyId: string, companyId?: string): Promise<{ ok: true }> {
      return client.request({
        method: 'DELETE',
        path: `/api/agents/${encodeURIComponent(agentId)}/keys/${encodeURIComponent(keyId)}`,
        query: companyId ? { companyId } : undefined,
      });
    },

    runtimeState(id: string, companyId?: string): Promise<AgentRuntimeState> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/runtime-state`,
        query: companyId ? { companyId } : undefined,
      });
    },

    taskSessions(id: string, companyId?: string): Promise<AgentTaskSession[]> {
      return client.request({
        method: 'GET',
        path: `/api/agents/${encodeURIComponent(id)}/task-sessions`,
        query: companyId ? { companyId } : undefined,
      });
    },

    resetSession(id: string, taskKey?: string | null, companyId?: string): Promise<void> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/runtime-state/reset-session`,
        body: { taskKey: taskKey ?? null },
        query: companyId ? { companyId } : undefined,
      });
    },

    adapterModels(companyId: string, type: string): Promise<AdapterModel[]> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/adapters/${encodeURIComponent(type)}/models`,
      });
    },

    detectModel(companyId: string, type: string): Promise<DetectedAdapterModel | null> {
      return client.request({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(companyId)}/adapters/${encodeURIComponent(type)}/detect-model`,
      });
    },

    testEnvironment(
      companyId: string,
      type: string,
      data: { adapterConfig: Record<string, unknown> },
    ): Promise<AdapterEnvironmentTestResult> {
      return client.request({
        method: 'POST',
        path: `/api/companies/${companyId}/adapters/${type}/test-environment`,
        body: data,
      });
    },

    invoke(id: string, companyId?: string): Promise<HeartbeatRun> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/heartbeat/invoke`,
        body: {},
        query: companyId ? { companyId } : undefined,
      });
    },

    wakeup(
      id: string,
      data: {
        source?: 'timer' | 'assignment' | 'on_demand' | 'automation';
        triggerDetail?: 'manual' | 'ping' | 'callback' | 'system';
        reason?: string | null;
        payload?: Record<string, unknown> | null;
        idempotencyKey?: string | null;
      },
      companyId?: string,
    ): Promise<AgentWakeupResponse> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/wakeup`,
        body: data,
        query: companyId ? { companyId } : undefined,
      });
    },

    loginWithClaude(id: string, companyId?: string): Promise<ClaudeLoginResult> {
      return client.request({
        method: 'POST',
        path: `/api/agents/${encodeURIComponent(id)}/claude-login`,
        body: {},
        query: companyId ? { companyId } : undefined,
      });
    },

    availableSkills(): Promise<{ skills: AvailableSkill[] }> {
      return client.request({ method: 'GET', path: '/api/skills/available' });
    },
  };
}
