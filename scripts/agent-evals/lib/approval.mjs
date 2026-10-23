import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  assert,
  object,
  string,
  hash,
  uuid,
  safePath,
  readJSON,
  canonical,
  digest,
  integer,
} from './common.mjs';
function outsideRunTree(file) {
  for (
    let parent = path.dirname(file);
    parent !== path.dirname(parent);
    parent = path.dirname(parent)
  )
    assert(
      !fs.existsSync(path.join(parent, 'result.json')) &&
        !fs.existsSync(path.join(parent, 'active-writer.json')) &&
        !(
          fs.existsSync(path.join(parent, 'manifest.json')) &&
          fs.existsSync(path.join(parent, 'events.jsonl'))
        ),
      'trusted authority must be outside generated run trees',
    );
}
export function validateConfig(c) {
  object(c, [
    'version',
    'ownerRef',
    'keySha256',
    'accountingRegistryId',
    'root',
    'metadataPath',
    'journalPath',
    'genesisSha256',
    'identities',
    'scopes',
  ]);
  assert(c.version === 1, 'operator config version');
  string(c.ownerRef);
  hash(c.keySha256);
  uuid(c.accountingRegistryId);
  for (const k of ['root', 'metadataPath', 'journalPath'])
    safePath(c[k], { directory: k === 'root' });
  hash(c.genesisSha256);
  assert(
    c.metadataPath === `${c.root}/registry.json` && c.journalPath === `${c.root}/budget.jsonl`,
    'fixed canonical registry files',
  );
  object(c.identities, ['root', 'metadata', 'journal']);
  for (const identity of Object.values(c.identities)) {
    object(identity, ['dev', 'ino']);
    integer(identity.dev);
    integer(identity.ino, 1);
  }
  assert(Array.isArray(c.scopes) && c.scopes.length, 'configured scopes');
  const ids = new Set();
  for (const s of c.scopes) {
    object(s, ['accountingScopeId', 'ownerRef', 'purpose']);
    uuid(s.accountingScopeId);
    string(s.ownerRef);
    string(s.purpose);
    assert(s.ownerRef === c.ownerRef && !ids.has(s.accountingScopeId), 'scope authority');
    ids.add(s.accountingScopeId);
  }
  return c;
}
export function loadConfig(p) {
  safePath(p);
  outsideRunTree(p);
  return validateConfig(readJSON(p));
}
export function verifyApproval({
  manifest,
  manifestSha256,
  approvalPath,
  configPath,
  keyPath,
  ownerRef,
  now = Date.now(),
}) {
  const config = loadConfig(configPath);
  safePath(keyPath);
  outsideRunTree(keyPath);
  safePath(approvalPath);
  assert(
    ownerRef === config.ownerRef && ownerRef === manifest.operatorRef,
    'trusted owner mismatch',
  );
  const key = fs.readFileSync(keyPath);
  const publicKey = crypto.createPublicKey(key);
  assert(publicKey.asymmetricKeyType === 'ed25519', 'Ed25519 required');
  assert(
    digest(publicKey.export({ type: 'spki', format: 'der' })) === config.keySha256,
    'trusted key mismatch',
  );
  const approval = readJSON(approvalPath);
  object(approval, ['algorithm', 'payload', 'signature']);
  assert(approval.algorithm === 'Ed25519', 'approval algorithm');
  const p = approval.payload;
  object(p, [
    'version',
    'manifestSha256',
    'approvalRef',
    'ownerRef',
    'issuedAt',
    'expiresAt',
    'permittedMode',
    'scopeHash',
    'budgetHash',
    'approvalNamespace',
    'accountingRegistryId',
    'accountingScopeId',
    'trustedOperatorConfigSha256',
  ]);
  assert(p.version === 1 && p.permittedMode === 'live', 'approval mode');
  hash(p.manifestSha256);
  hash(p.scopeHash);
  hash(p.budgetHash);
  hash(p.trustedOperatorConfigSha256);
  string(p.approvalNamespace);
  const issued = Date.parse(p.issuedAt),
    expires = Date.parse(p.expiresAt);
  assert(
    Number.isFinite(issued) &&
      Number.isFinite(expires) &&
      issued <= now &&
      now < expires &&
      expires > issued,
    'expired or future approval',
  );
  assert(
    p.manifestSha256 === manifestSha256 &&
      p.approvalRef === manifest.approvalRef &&
      p.ownerRef === ownerRef,
    'approval manifest binding',
  );
  assert(
    p.scopeHash === digest(manifest.scope) && p.budgetHash === digest(manifest.bounds),
    'approval scope/budget binding',
  );
  for (const k of ['accountingRegistryId', 'accountingScopeId', 'trustedOperatorConfigSha256'])
    assert(p[k] === manifest.accounting[k], 'approval accounting binding');
  assert(
    p.accountingRegistryId === config.accountingRegistryId &&
      p.trustedOperatorConfigSha256 === digest(config),
    'trusted config binding',
  );
  const scope = config.scopes.find((s) => s.accountingScopeId === p.accountingScopeId);
  assert(
    scope && scope.ownerRef === ownerRef && scope.purpose === manifest.purpose,
    'unconfigured scope authority',
  );
  assert(
    typeof approval.signature === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(approval.signature),
    'invalid signature encoding',
  );
  const signature = Buffer.from(approval.signature, 'base64');
  assert(
    signature.length === 64 && crypto.verify(null, Buffer.from(canonical(p)), publicKey, signature),
    'invalid detached approval signature',
  );
  return { config, approval, payload: p, approvalSha256: digest(approval) };
}

export function assertApprovalCurrent(payload, now = Date.now()) {
  assert(
    Date.parse(payload.issuedAt) <= now && now < Date.parse(payload.expiresAt),
    'expired or future approval at admission/dispatch',
  );
}
