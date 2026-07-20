/**
 * Gateway/frontend version-compatibility contract (spec 2026-07-19 §3 D3).
 *
 * `PROTOCOL_VERSION` already exists in ./client.ts and is the newest protocol
 * this package speaks — it is NOT redefined here. What was missing is the
 * other end of the range and the rule that compares them.
 *
 * Compatibility is ASYMMETRIC:
 *   frontend ahead of gateway → tolerated, the frontend must degrade.
 *   gateway ahead of frontend → breaking, CI blocks the deploy.
 */
import { PROTOCOL_VERSION } from './client.js';

// Re-exported so the compat contract is one self-describing module (the CI
// gate imports this file straight out of the published tarball).
export { PROTOCOL_VERSION };

/** Oldest gateway protocol a frontend built on this package can talk to. */
export const MIN_GATEWAY_PROTOCOL = 1;

export type GatewayCompatLevel = 'ok' | 'warn' | 'fail';

export interface GatewayCompatResult {
  level: GatewayCompatLevel;
  message: string;
}

/**
 * Compare a gateway's protocol against the range this frontend supports.
 *
 * Used by CI to gate deploys and at runtime (on connect) to raise one clear
 * banner instead of letting a cascade of RPCs fail one by one.
 */
export function checkGatewayCompat(
  gatewayProtocol: number,
  frontendMax: number = PROTOCOL_VERSION,
  frontendMin: number = MIN_GATEWAY_PROTOCOL,
): GatewayCompatResult {
  if (!Number.isInteger(gatewayProtocol)) {
    return { level: 'fail', message: `gateway reported a non-integer protocol: ${gatewayProtocol}` };
  }
  if (gatewayProtocol > frontendMax) {
    return {
      level: 'fail',
      message: `gateway protocol ${gatewayProtocol} is newer than this frontend supports (max ${frontendMax}) — update the frontend first`,
    };
  }
  if (gatewayProtocol < frontendMin) {
    return {
      level: 'fail',
      message: `gateway protocol ${gatewayProtocol} is older than this frontend supports (min ${frontendMin}) — update the gateway`,
    };
  }
  if (gatewayProtocol < frontendMax) {
    return {
      level: 'warn',
      message: `frontend (protocol ${frontendMax}) is ahead of gateway (protocol ${gatewayProtocol}) — allowed; frontend must degrade gracefully`,
    };
  }
  return { level: 'ok', message: `protocol ${gatewayProtocol} matches` };
}
