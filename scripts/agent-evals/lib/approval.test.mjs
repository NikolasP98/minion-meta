import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { liveSetup } from '../fixtures/helpers.mjs';
import { verifyApproval } from './approval.mjs';
import { readJSON, writePrivate, digest } from './common.mjs';
const verify = (s) =>
  verifyApproval({
    manifest: s.m,
    manifestSha256: digest(s.m),
    approvalPath: s.approvalPath,
    configPath: s.configPath,
    keyPath: s.keyPath,
    ownerRef: 'test-owner',
  });
test('detached test attestation binds exact manifest, owner/key, trusted config, registry/scope', () => {
  const s = liveSetup();
  assert.equal(verify(s).payload.approvalRef, 'test-only-approval');
});
test('self approved/expired/wrong owner/tamper/config/self-key/circular manifest all reject', () => {
  for (const mutate of [
    (s) => {
      s.m.approved = true;
    },
    (s) => {
      const a = readJSON(s.approvalPath);
      a.payload.expiresAt = '2020-01-01T00:00:00Z';
      writePrivate(s.approvalPath, a, false);
    },
    (s) => (s.m.operatorRef = 'wrong'),
    (s) => s.m.bounds.dayMicroUsd++,
    (s) => {
      const c = readJSON(s.configPath);
      c.ownerRef = 'other';
      writePrivate(s.configPath, c, false);
    },
    (s) => {
      const p = crypto.generateKeyPairSync('ed25519');
      writePrivate(s.keyPath, p.publicKey.export({ type: 'spki', format: 'pem' }), false);
    },
    (s) => (s.m.approvalSha256 = digest(readJSON(s.approvalPath))),
  ]) {
    const s = liveSetup();
    mutate(s);
    assert.throws(() => verify(s));
  }
});

test('trusted config/public key in a previous generated run never supplies operational authority', () => {
  const s = liveSetup();
  const old = path.join(s.root, 'old-run');
  fs.mkdirSync(old, { mode: 0o700 });
  writePrivate(path.join(old, 'manifest.json'), {});
  writePrivate(path.join(old, 'events.jsonl'), '');
  for (const kind of ['config', 'key']) {
    const copy = path.join(old, kind);
    fs.copyFileSync(kind === 'config' ? s.configPath : s.keyPath, copy);
    assert.throws(
      () =>
        verifyApproval({
          manifest: s.m,
          manifestSha256: digest(s.m),
          approvalPath: s.approvalPath,
          configPath: kind === 'config' ? copy : s.configPath,
          keyPath: kind === 'key' ? copy : s.keyPath,
          ownerRef: 'test-owner',
        }),
      /outside generated run/,
    );
  }
});
