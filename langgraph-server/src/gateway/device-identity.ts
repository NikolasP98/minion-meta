import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Minimal, self-contained port of the minion gateway device-identity primitives
// (minion/src/infra/device-identity.ts + gateway/auth/device-auth.ts). The
// langgraph flows-runner is a separate project, so we re-implement the few bytes
// of crypto rather than depend on the gateway package. The wire format MUST stay
// byte-for-byte compatible with the gateway verifier.

export type DeviceIdentity = {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

type StoredIdentity = {
  version: 1;
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
  createdAtMs: number;
};

// DER SPKI header for an Ed25519 public key; stripping it yields the raw 32-byte key.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: 'spki', format: 'der' }) as Buffer;
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function fingerprintPublicKey(publicKeyPem: string): string {
  return crypto.createHash('sha256').update(derivePublicKeyRaw(publicKeyPem)).digest('hex');
}

/** Raw 32-byte Ed25519 public key, base64url — the form sent in the connect `device.publicKey`. */
export function publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem));
}

/** Sign a payload string with the Ed25519 private key; returns base64url (matches gateway verifier). */
export function signDevicePayload(privateKeyPem: string, payload: string): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(payload, 'utf8'), key);
  return base64UrlEncode(sig);
}

function generateIdentity(): DeviceIdentity {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  return { deviceId: fingerprintPublicKey(publicKeyPem), publicKeyPem, privateKeyPem };
}

function defaultIdentityPath(): string {
  const stateDir =
    process.env.FLOWS_RUNNER_STATE_DIR?.trim() ||
    path.join(os.homedir(), '.minion-flows-runner');
  return path.join(stateDir, 'identity', 'device.json');
}

/** Load the persisted device identity, generating + storing one (mode 0600) on first run. */
export function loadOrCreateDeviceIdentity(filePath: string = defaultIdentityPath()): DeviceIdentity {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as StoredIdentity;
      if (
        parsed?.version === 1 &&
        typeof parsed.publicKeyPem === 'string' &&
        typeof parsed.privateKeyPem === 'string'
      ) {
        // Re-derive deviceId from the key so a hand-edited file can't desync it.
        return {
          deviceId: fingerprintPublicKey(parsed.publicKeyPem),
          publicKeyPem: parsed.publicKeyPem,
          privateKeyPem: parsed.privateKeyPem,
        };
      }
    }
  } catch {
    // fall through to regenerate
  }

  const identity = generateIdentity();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const stored: StoredIdentity = {
      version: 1,
      deviceId: identity.deviceId,
      publicKeyPem: identity.publicKeyPem,
      privateKeyPem: identity.privateKeyPem,
      createdAtMs: Date.now(),
    };
    fs.writeFileSync(filePath, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(filePath, 0o600);
  } catch {
    // best-effort persistence; identity still usable in-memory for this process
  }
  return identity;
}

/**
 * Canonical device-auth payload string signed during the connect handshake.
 * MUST match minion/src/gateway/auth/device-auth.ts buildDeviceAuthPayload exactly:
 *   version|deviceId|clientId|clientMode|role|scopes(comma-joined)|signedAtMs|token[|nonce]
 */
export function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce?: string | null;
}): string {
  const version = params.nonce ? 'v2' : 'v1';
  const base = [
    version,
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
  ];
  if (version === 'v2') base.push(params.nonce ?? '');
  return base.join('|');
}
