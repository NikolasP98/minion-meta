import { describe, expect, it } from 'vitest';
import { NoopBroadcaster } from './broadcaster';

describe('NoopBroadcaster', () => {
  it('emit resolves without side effects', async () => {
    const b = new NoopBroadcaster();
    await expect(
      b.emit({ tags: ['t:1'], source: 'hub', sourceId: 'x', tenantId: 'ten_1', ts: Date.now() })
    ).resolves.toBeUndefined();
  });
});
