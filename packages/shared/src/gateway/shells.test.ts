import { describe, expect, it } from 'vitest';
import { isShellDelta, isShellFinal } from './shells.js';

describe('shell event guards', () => {
  it('accepts complete delta payloads', () => {
    expect(
      isShellDelta({
        type: 'event',
        event: 'shell.delta',
        payload: { shellId: 'shell-1', runId: 'run-1', sessionId: 'session-1', seq: 0, acpUpdate: null },
      }),
    ).toBe(true);
  });

  it('rejects delta events with missing or malformed payload fields', () => {
    expect(isShellDelta({ type: 'event', event: 'shell.delta' })).toBe(false);
    expect(
      isShellDelta({
        type: 'event',
        event: 'shell.delta',
        payload: { shellId: 'shell-1', runId: 'run-1', sessionId: 'session-1', seq: -1 },
      }),
    ).toBe(false);
  });

  it('accepts complete final payloads and rejects invalid terminal states', () => {
    expect(
      isShellFinal({
        type: 'event',
        event: 'shell.final',
        payload: {
          shellId: 'shell-1',
          runId: 'run-1',
          sessionId: 'session-1',
          state: 'final',
          durationMs: 42,
        },
      }),
    ).toBe(true);
    expect(
      isShellFinal({
        type: 'event',
        event: 'shell.final',
        payload: {
          shellId: 'shell-1',
          runId: 'run-1',
          sessionId: 'session-1',
          state: 'done',
          durationMs: 42,
        },
      }),
    ).toBe(false);
  });
});
