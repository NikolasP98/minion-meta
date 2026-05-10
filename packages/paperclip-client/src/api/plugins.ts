// VENDORED FROM paperclip-minion/ui/src/api/plugins.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClient } from '../client.js';
import type {
  PluginRecord,
  PluginConfig,
  PluginStatus,
  PluginUiSlotDeclaration,
  PluginLauncherDeclaration,
  PluginLauncherRenderContextSnapshot,
} from '../types/plugin.js';

export interface PluginUiContribution {
  pluginId: string;
  pluginKey: string;
  displayName: string;
  version: string;
  updatedAt?: string;
  uiEntryFile: string;
  slots: PluginUiSlotDeclaration[];
  launchers: PluginLauncherDeclaration[];
}

export interface PluginHealthCheckResult {
  pluginId: string;
  status: string;
  healthy: boolean;
  checks: Array<{ name: string; passed: boolean; message?: string }>;
  lastError?: string;
}

export interface PluginWorkerDiagnostics {
  status: string;
  pid: number | null;
  uptime: number | null;
  consecutiveCrashes: number;
  totalCrashes: number;
  pendingRequests: number;
  lastCrashAt: number | null;
  nextRestartAt: number | null;
}

export interface PluginDashboardJobRun {
  id: string;
  jobId: string;
  jobKey?: string;
  trigger: string;
  status: string;
  durationMs: number | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface PluginDashboardWebhookDelivery {
  id: string;
  webhookKey: string;
  status: string;
  durationMs: number | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface PluginDashboardData {
  pluginId: string;
  worker: PluginWorkerDiagnostics | null;
  recentJobRuns: PluginDashboardJobRun[];
  recentWebhookDeliveries: PluginDashboardWebhookDelivery[];
  health: PluginHealthCheckResult;
  checkedAt: string;
}

export interface AvailablePluginExample {
  packageName: string;
  pluginKey: string;
  displayName: string;
  description: string;
  localPath: string;
  tag: 'example';
}

export function pluginsApi(client: PaperclipClient) {
  return {
    list(status?: PluginStatus): Promise<PluginRecord[]> {
      return client.request({ method: 'GET', path: '/api/plugins', query: status ? { status } : undefined });
    },

    listExamples(): Promise<AvailablePluginExample[]> {
      return client.request({ method: 'GET', path: '/api/plugins/examples' });
    },

    get(pluginId: string): Promise<PluginRecord> {
      return client.request({ method: 'GET', path: `/api/plugins/${pluginId}` });
    },

    install(params: { packageName: string; version?: string; isLocalPath?: boolean }): Promise<PluginRecord> {
      return client.request({ method: 'POST', path: '/api/plugins/install', body: params });
    },

    uninstall(pluginId: string, purge?: boolean): Promise<{ ok: boolean }> {
      return client.request({ method: 'DELETE', path: `/api/plugins/${pluginId}${purge ? '?purge=true' : ''}` });
    },

    enable(pluginId: string): Promise<{ ok: boolean }> {
      return client.request({ method: 'POST', path: `/api/plugins/${pluginId}/enable`, body: {} });
    },

    disable(pluginId: string, reason?: string): Promise<{ ok: boolean }> {
      return client.request({ method: 'POST', path: `/api/plugins/${pluginId}/disable`, body: reason ? { reason } : {} });
    },

    health(pluginId: string): Promise<PluginHealthCheckResult> {
      return client.request({ method: 'GET', path: `/api/plugins/${pluginId}/health` });
    },

    dashboard(pluginId: string): Promise<PluginDashboardData> {
      return client.request({ method: 'GET', path: `/api/plugins/${pluginId}/dashboard` });
    },

    logs(
      pluginId: string,
      options?: { limit?: number; level?: string; since?: string },
    ): Promise<Array<{ id: string; pluginId: string; level: string; message: string; meta: Record<string, unknown> | null; createdAt: string }>> {
      return client.request({
        method: 'GET',
        path: `/api/plugins/${pluginId}/logs`,
        query: { limit: options?.limit, level: options?.level, since: options?.since },
      });
    },

    upgrade(pluginId: string, version?: string): Promise<{ ok: boolean }> {
      return client.request({ method: 'POST', path: `/api/plugins/${pluginId}/upgrade`, body: version ? { version } : {} });
    },

    listUiContributions(): Promise<PluginUiContribution[]> {
      return client.request({ method: 'GET', path: '/api/plugins/ui-contributions' });
    },

    getConfig(pluginId: string): Promise<PluginConfig | null> {
      return client.request({ method: 'GET', path: `/api/plugins/${pluginId}/config` });
    },

    saveConfig(pluginId: string, configJson: Record<string, unknown>): Promise<PluginConfig> {
      return client.request({ method: 'POST', path: `/api/plugins/${pluginId}/config`, body: { configJson } });
    },

    testConfig(pluginId: string, configJson: Record<string, unknown>): Promise<{ valid: boolean; message?: string }> {
      return client.request({ method: 'POST', path: `/api/plugins/${pluginId}/config/test`, body: { configJson } });
    },

    bridgeGetData(
      pluginId: string,
      key: string,
      params?: Record<string, unknown>,
      companyId?: string | null,
      renderEnvironment?: PluginLauncherRenderContextSnapshot | null,
    ): Promise<{ data: unknown }> {
      return client.request({
        method: 'POST',
        path: `/api/plugins/${pluginId}/data/${encodeURIComponent(key)}`,
        body: {
          companyId: companyId ?? undefined,
          params,
          renderEnvironment: renderEnvironment ?? undefined,
        },
      });
    },

    bridgePerformAction(
      pluginId: string,
      key: string,
      params?: Record<string, unknown>,
      companyId?: string | null,
      renderEnvironment?: PluginLauncherRenderContextSnapshot | null,
    ): Promise<{ data: unknown }> {
      return client.request({
        method: 'POST',
        path: `/api/plugins/${pluginId}/actions/${encodeURIComponent(key)}`,
        body: {
          companyId: companyId ?? undefined,
          params,
          renderEnvironment: renderEnvironment ?? undefined,
        },
      });
    },
  };
}
