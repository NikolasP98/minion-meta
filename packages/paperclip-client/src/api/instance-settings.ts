// VENDORED FROM paperclip-minion/ui/src/api/instanceSettings.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClient } from '../client.js';
import type {
  InstanceGeneralSettings,
  InstanceExperimentalSettings,
  PatchInstanceGeneralSettings,
  PatchInstanceExperimentalSettings,
} from '../types/instance.js';

export function instanceSettingsApi(client: PaperclipClient) {
  return {
    getGeneral(): Promise<InstanceGeneralSettings> {
      return client.request({ method: 'GET', path: '/api/instance/settings/general' });
    },

    updateGeneral(patch: PatchInstanceGeneralSettings): Promise<InstanceGeneralSettings> {
      return client.request({ method: 'PATCH', path: '/api/instance/settings/general', body: patch });
    },

    getExperimental(): Promise<InstanceExperimentalSettings> {
      return client.request({ method: 'GET', path: '/api/instance/settings/experimental' });
    },

    updateExperimental(patch: PatchInstanceExperimentalSettings): Promise<InstanceExperimentalSettings> {
      return client.request({ method: 'PATCH', path: '/api/instance/settings/experimental', body: patch });
    },
  };
}
