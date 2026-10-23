// Explicit OFFLINE software-fixture preparation only. It cannot make a live manifest/approval.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  assert,
  args,
  readJSON,
  writePrivate,
  digest,
  safePath,
  canonical,
  direct,
  main,
} from './lib/common.mjs';
import { HubAdapter } from './lib/hub-adapter.mjs';
import { validateManifest, sourceDigest } from './lib/manifest.mjs';
export async function prepare({ hubRoot, template, output, keepAlive = false }) {
  safePath(hubRoot, { directory: true });
  const m = readJSON(template);
  assert(
    m.mode === 'fixture' && m.purpose === 'software_fixture' && !m.accounting && !m.approvalRef,
    'preparer is software fixture only',
  );
  const metaRoot = path.resolve(import.meta.dirname, '../..');
  m.provenance.meta = {
    sourceSha256: sourceDigest(metaRoot),
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: metaRoot, encoding: 'utf8' }).trim(),
    lockSha256: digest(fs.readFileSync(path.join(metaRoot, 'pnpm-lock.yaml'))),
  };
  m.provenance.hub = {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: hubRoot, encoding: 'utf8' }).trim(),
    lockSha256: digest(fs.readFileSync(path.join(hubRoot, 'bun.lock'))),
    adapterSha256: digest(
      fs.readFileSync(path.join(hubRoot, 'tests/fixtures/critical-journeys/eval-adapter.mjs')),
    ),
    buildSha256: '0'.repeat(64),
    sourceSha256: '0'.repeat(64),
  };
  const adapter = new HubAdapter({
    root: hubRoot,
    pin: m.provenance.hub,
    bounds: m.bounds,
    onProvider: () => {
      throw Error('provider forbidden during offline preparation');
    },
  });
  let identity;
  try {
    identity = await adapter.send('hello', {
      protocol: 'minion-agent-eval-fixture/v1',
      lockHash: m.provenance.hub.lockSha256,
      adapterHash: m.provenance.hub.adapterSha256,
    });
    assert(
      identity.sourceSha === m.provenance.hub.commit && identity.disposable === true,
      'adapter identity mismatch',
    );
    m.provenance.hub.buildSha256 = identity.buildHash;
    m.provenance.hub.sourceSha256 = identity.sourceHash;
  } catch (error) {
    await adapter.close();
    throw error;
  } finally {
    if (!keepAlive) await adapter.close();
  }
  m.corpus.root = path.resolve(
    metaRoot,
    'audits/2026-10-22-agent-use-transcripts/spec/fixtures/corpus',
  );
  m.corpus.splitSha256 = digest(readJSON(path.join(m.corpus.root, 'split.json')));
  validateManifest(m);
  writePrivate(output, m);
  return { output, manifestSha256: digest(m), identity, ...(keepAlive ? { adapter } : {}) };
}
if (direct(import.meta.url))
  main(async () => {
    const a = args(process.argv.slice(2));
    console.log(
      canonical(await prepare({ hubRoot: a['hub-root'], template: a.template, output: a.out })),
    );
  });
