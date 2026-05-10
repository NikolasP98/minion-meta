// VENDORED FROM paperclip-minion/ui/src/api/adapters.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClientBase } from '../client.js';

export interface AdapterInfo {
  type: string;
  label: string;
  source: 'builtin' | 'external';
  modelsCount: number;
  loaded: boolean;
  disabled: boolean;
  version?: string;
  packageName?: string;
  isLocalPath?: boolean;
  overriddenBuiltin?: boolean;
  overridePaused?: boolean;
}

export interface AdapterInstallResult {
  type: string;
  packageName: string;
  version?: string;
  installedAt: string;
}

export function adaptersApi(client: PaperclipClientBase) {
  return {
    list(): Promise<AdapterInfo[]> {
      return client.request({ method: 'GET', path: '/api/adapters' });
    },

    install(params: { packageName: string; version?: string; isLocalPath?: boolean }): Promise<AdapterInstallResult> {
      return client.request({ method: 'POST', path: '/api/adapters/install', body: params });
    },

    remove(type: string): Promise<{ type: string; removed: boolean }> {
      return client.request({ method: 'DELETE', path: `/api/adapters/${type}` });
    },

    setDisabled(type: string, disabled: boolean): Promise<{ type: string; disabled: boolean; changed: boolean }> {
      return client.request({ method: 'PATCH', path: `/api/adapters/${type}`, body: { disabled } });
    },

    setOverridePaused(type: string, paused: boolean): Promise<{ type: string; paused: boolean; changed: boolean }> {
      return client.request({ method: 'PATCH', path: `/api/adapters/${type}/override`, body: { paused } });
    },

    reload(type: string): Promise<{ type: string; version?: string; reloaded: boolean }> {
      return client.request({ method: 'POST', path: `/api/adapters/${type}/reload`, body: {} });
    },

    reinstall(type: string): Promise<{ type: string; version?: string; reinstalled: boolean }> {
      return client.request({ method: 'POST', path: `/api/adapters/${type}/reinstall`, body: {} });
    },
  };
}
