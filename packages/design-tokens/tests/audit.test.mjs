import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  auditTokenSources,
  extractVarConsumers,
  loadInstalledTokenContract,
  scanTokenIntegrity,
} from '../audit.mjs';

async function fixturePackage({ contract = {}, css = ':root { --known: red; }', includeCss = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'design-token-audit-'));
  const packageRoot = join(root, 'node_modules/@minion-stack/design-tokens');
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(packageRoot, { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@minion-stack/design-tokens',
      version: '0.0.0-test',
      exports: { './contract.json': './contract.json', './tokens.css': './tokens.css' },
    }),
  );
  await writeFile(join(packageRoot, 'contract.json'), JSON.stringify(contract));
  if (includeCss) await writeFile(join(packageRoot, 'tokens.css'), css);
  return { root, packageRoot };
}

test('extracts nested consumers and preserves fallback intent', () => {
  const consumers = extractVarConsumers(
    '.card { color: var(--known, var(--optional, red)); }',
    'src/card.css',
  );
  assert.deepEqual(
    consumers.map(({ token, hasFallback }) => ({ token, hasFallback })),
    [
      { token: '--known', hasFallback: true },
      { token: '--optional', hasFallback: true },
    ],
  );
});

test('an HTML comment containing a slash-star path cannot hide later consumers', () => {
  const source = `<!-- generated from messages/*.json -->\n<style>.page { max-width: var(--page-max); }</style>`;
  assert.deepEqual(
    extractVarConsumers(source, 'src/page.svelte').map(({ token, line }) => ({ token, line })),
    [{ token: '--page-max', line: 2 }],
  );
});

test('keeps forbidden names and exception policy consumer-owned', () => {
  const result = auditTokenSources({
    forbiddenTokens: new Set(['--retired']),
    exceptionFor: (consumer) =>
      consumer.token === '--provided' ? { reason: 'fixture', detail: 'provided by fixture runtime' } : null,
    sources: [
      {
        file: 'src/card.css',
        text: ':root { --retired: red; } .a { color: var(--retired); } .b { color: var(--provided, red); }',
      },
    ],
  });
  assert.deepEqual(
    result.unresolved.map(({ token, kind }) => ({ token, kind })),
    [
      { token: '--retired', kind: 'forbidden-definition' },
      { token: '--retired', kind: 'forbidden-consumer' },
    ],
  );
  assert.deepEqual(result.reasonCoded.map(({ token, reason }) => ({ token, reason })), [
    { token: '--provided', reason: 'fixture' },
  ]);
});

test('loads contract and CSS strictly from one installed package root without presumed theme tokens', async (t) => {
  const fixture = await fixturePackage({
    contract: { aliases: { '--compat': '--color-accent' } },
    css: ':root { --known: red; --compat: var(--color-accent); }',
  });
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const loaded = loadInstalledTokenContract(fixture.root);
  assert.equal(loaded.packageRoot, fixture.packageRoot);
  assert.equal(loaded.tokens.has('--known'), true);
  assert.equal(loaded.tokens.has('--compat'), true);
  assert.equal(
    loaded.tokens.has('--color-accent'),
    false,
    'a contract reference is not proof that generated CSS declares its target',
  );
});

test('fails closed when either installed artifact is missing', async (t) => {
  const fixture = await fixturePackage({ includeCss: false });
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  assert.throws(
    () => loadInstalledTokenContract(fixture.root),
    /Unable to resolve installed @minion-stack\/design-tokens artifacts/,
  );
});

test('scans regular repository files with deterministic installed declarations', async (t) => {
  const fixture = await fixturePackage();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await writeFile(join(fixture.root, 'src/card.css'), '.card { color: var(--known); }');
  const passing = scanTokenIntegrity({ rootDir: fixture.root, sourceDirs: ['src'] });
  assert.equal(passing.unresolved.length, 0);
  await writeFile(join(fixture.root, 'src/card.css'), '.card { color: var(--missing, red); }');
  const failing = scanTokenIntegrity({ rootDir: fixture.root, sourceDirs: ['src'] });
  assert.deepEqual(
    failing.unresolved.map(({ token, kind, hasFallback }) => ({ token, kind, hasFallback })),
    [{ token: '--missing', kind: 'undefined-consumer', hasFallback: true }],
  );
});
