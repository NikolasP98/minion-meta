import { describe, it, expect, vi } from 'vitest';
import { instanceSettingsApi } from './instance-settings.js';

function mockClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe('instanceSettingsApi', () => {
  it('getGeneral calls GET /api/instance/settings/general', async () => {
    const client = mockClient({ censorUsernameInLogs: false, keyboardShortcuts: true, feedbackDataSharingPreference: 'prompt', backupRetention: { dailyDays: 7, weeklyWeeks: 4, monthlyMonths: 1 } });
    const api = instanceSettingsApi(client as never);
    await api.getGeneral();
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/instance/settings/general' });
  });

  it('updateExperimental calls PATCH /api/instance/settings/experimental', async () => {
    const client = mockClient({ enableIsolatedWorkspaces: true, autoRestartDevServerWhenIdle: false });
    const api = instanceSettingsApi(client as never);
    await api.updateExperimental({ enableIsolatedWorkspaces: true });
    expect(client.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/instance/settings/experimental',
      body: { enableIsolatedWorkspaces: true },
    });
  });
});
