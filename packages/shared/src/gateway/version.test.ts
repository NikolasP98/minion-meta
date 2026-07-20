import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION } from './client.js';
import { MIN_GATEWAY_PROTOCOL, checkGatewayCompat } from './version.js';

describe('checkGatewayCompat', () => {
  it('passes when equal', () => {
    expect(checkGatewayCompat(3, 3, 1).level).toBe('ok');
  });

  it('WARNS when the frontend is ahead of the gateway (safe direction)', () => {
    expect(checkGatewayCompat(2, 3, 1).level).toBe('warn');
  });

  it('FAILS when the gateway is ahead of the frontend (breaking direction)', () => {
    expect(checkGatewayCompat(4, 3, 1).level).toBe('fail');
  });

  it('FAILS when the gateway is older than the frontend still supports', () => {
    expect(checkGatewayCompat(1, 3, 2).level).toBe('fail');
  });

  it('FAILS on a garbage protocol value', () => {
    expect(checkGatewayCompat(Number.NaN).level).toBe('fail');
  });

  it('keeps the declared range coherent', () => {
    expect(MIN_GATEWAY_PROTOCOL).toBeLessThanOrEqual(PROTOCOL_VERSION);
  });
});
