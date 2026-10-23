import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/gateway-rpc', () => ({
  gatewayCallAsUser: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('$server/services/rbac.service', () => ({
  requireOrgCapability: vi.fn().mockResolvedValue(null),
}));
vi.mock('$server/auth/core-ctx', () => ({
  requireCoreCtx: vi.fn().mockResolvedValue({ db: {}, tenantId: 'org-1', profileId: 'user-1' }),
}));

const getProposalMock = vi.fn();
const markApprovedMock = vi.fn().mockResolvedValue(undefined);
const dismissMock = vi.fn().mockResolvedValue(undefined);
const editPayloadMock = vi.fn().mockResolvedValue(undefined);
vi.mock('$server/services/pulse.service', () => ({
  getProposal: (...args: unknown[]) => getProposalMock(...args),
  markApproved: (...args: unknown[]) => markApprovedMock(...args),
  dismiss: (...args: unknown[]) => dismissMock(...args),
  editPayload: (...args: unknown[]) => editPayloadMock(...args),
}));

import { POST } from '/tmp/minion-agent-validation-20261022-blbb_5vg/minion_hub/src/routes/api/pulse/proposals/[id]/+server';
import { gatewayCallAsUser } from '$lib/server/gateway-rpc';

function makeLocals(): App.Locals {
  return { user: { id: 'user-1', email: 't@t.com', displayName: 'T', role: 'user' } } as App.Locals;
}

function req(body: unknown) {
  return new Request('http://x/api/pulse/proposals/p1', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function call(id: string, body: unknown) {
  return POST({
    locals: makeLocals(),
    params: { id },
    request: req(body),
  } as unknown as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/pulse/proposals/[id]', () => {
  it('approve on create_event fires a one-shot agentTurn', async () => {
    getProposalMock.mockResolvedValue({
      id: 'p1',
      kind: 'create_event',
      status: 'pending',
      payload: { args: { title: 'Dentist', start: '2026-07-20T15:00:00Z' } },
    });

    const res = await call('p1', { action: 'approve' });

    expect(res.status).toBe(200);
    expect(gatewayCallAsUser).toHaveBeenCalledWith(
      'cron.add',
      expect.objectContaining({
        job: expect.objectContaining({
          schedule: expect.objectContaining({ kind: 'at' }),
          payload: expect.objectContaining({ kind: 'agentTurn' }),
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
    expect(markApprovedMock).toHaveBeenCalledWith(expect.anything(), 'p1', expect.any(String));
  });

  it('approve on digest does NOT call the gateway', async () => {
    getProposalMock.mockResolvedValue({
      id: 'p2',
      kind: 'digest',
      status: 'pending',
      payload: {},
    });

    const res = await call('p2', { action: 'approve' });

    expect(res.status).toBe(200);
    expect(gatewayCallAsUser).not.toHaveBeenCalled();
    expect(markApprovedMock).toHaveBeenCalledWith(expect.anything(), 'p2', expect.any(String));
  });

  it('dismiss calls dismiss() and never the gateway', async () => {
    getProposalMock.mockResolvedValue({ id: 'p3', kind: 'create_event', status: 'pending', payload: {} });

    const res = await call('p3', { action: 'dismiss' });

    expect(res.status).toBe(200);
    expect(dismissMock).toHaveBeenCalledWith(expect.anything(), 'p3', expect.any(String));
    expect(gatewayCallAsUser).not.toHaveBeenCalled();
  });

  it('404s when the proposal does not exist', async () => {
    getProposalMock.mockResolvedValue(null);
    await expect(call('missing', { action: 'approve' })).rejects.toMatchObject({ status: 404 });
  });

  it('409s on re-approving an already-approved proposal and never re-fires the gateway', async () => {
    getProposalMock.mockResolvedValue({
      id: 'p4',
      kind: 'create_event',
      status: 'approved',
      payload: { args: { title: 'Dentist', start: '2026-07-20T15:00:00Z' } },
    });

    const res = await call('p4', { action: 'approve' });

    expect(res.status).toBe(409);
    expect(gatewayCallAsUser).not.toHaveBeenCalled();
    expect(markApprovedMock).not.toHaveBeenCalled();
  });
});


describe('revalidation: Pulse approval admission boundary', () => {
  it('demonstrates concurrent approvals admit two gateway jobs', async () => {
    getProposalMock.mockResolvedValue({ id: 'p-race', kind: 'reminder', status: 'pending', payload: { args: { text: 'fixture' } } });
    const responses = await Promise.all([call('p-race', { action: 'approve' }), call('p-race', { action: 'approve' })]);
    expect(responses.map(r => r.status)).toEqual([200, 200]);
    expect(gatewayCallAsUser).toHaveBeenCalledTimes(2);
  });
  it('demonstrates admitted gateway call is repeated after approval persistence fails', async () => {
    getProposalMock.mockResolvedValue({ id: 'p-crash', kind: 'reminder', status: 'pending', payload: { args: { text: 'fixture' } } });
    markApprovedMock.mockRejectedValueOnce(new Error('simulated storage failure'));
    await expect(call('p-crash', { action: 'approve' })).rejects.toThrow('simulated storage failure');
    expect((await call('p-crash', { action: 'approve' })).status).toBe(200);
    expect(gatewayCallAsUser).toHaveBeenCalledTimes(2);
  });
});
