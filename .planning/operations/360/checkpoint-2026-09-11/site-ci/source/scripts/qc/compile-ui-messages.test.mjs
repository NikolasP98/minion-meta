import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { compileMessages } from './compile-ui-messages.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'minion-messages-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'project.inlang'));
  await fs.mkdir(path.join(root, 'messages'));
  await fs.writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await fs.writeFile(
    path.join(root, 'project.inlang/settings.json'),
    JSON.stringify({
      sourceLanguageTag: 'en',
      languageTags: ['en', 'es'],
      modules: [],
      'plugin.inlang.messageFormat': { pathPattern: './messages/{languageTag}.json' },
    }),
  );
  await fs.writeFile(path.join(root, 'messages/en.json'), '{"greeting":"Hello {name}"}');
  await fs.writeFile(path.join(root, 'messages/es.json'), '{"greeting":"Hola {name}"}');
  return root;
}

test('native compiler generates executable English and Spanish messages', async (t) => {
  const root = await fixture(t);
  const receipt = await compileMessages(root);
  const messages = await import(
    pathToFileURL(path.join(root, 'src/lib/paraglide/messages.js')).href
  );
  assert.equal(messages.greeting({ name: 'Ada' }, { languageTag: 'en' }), 'Hello Ada');
  assert.equal(messages.greeting({ name: 'José' }, { languageTag: 'es' }), 'Hola José');
  assert.equal(receipt.networkAttempts, 0);
  assert.equal(receipt.cdnLintPluginsExecuted, false);
  assert.ok(receipt.outputs.length > 2);
});

test('missing Spanish input fails before generation', async (t) => {
  const root = await fixture(t);
  await fs.unlink(path.join(root, 'messages/es.json'));
  await assert.rejects(compileMessages(root), /ENOENT/);
});

test('unreviewed language and source pattern cannot read other paths', async (t) => {
  const root = await fixture(t);
  await fs.writeFile(
    path.join(root, 'project.inlang/settings.json'),
    JSON.stringify({
      sourceLanguageTag: 'en',
      languageTags: ['en', '../secret'],
      'plugin.inlang.messageFormat': { pathPattern: '../{languageTag}.json' },
    }),
  );
  await assert.rejects(compileMessages(root), /reviewed EN\/ES/);
});

test('linked source input is refused', async (t) => {
  const root = await fixture(t);
  await fs.unlink(path.join(root, 'messages/es.json'));
  await fs.symlink('en.json', path.join(root, 'messages/es.json'));
  await assert.rejects(compileMessages(root), /Linked translation path/);
});

test('linked output ancestor is refused without writing its target', async (t) => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, 'elsewhere'));
  await fs.symlink('elsewhere', path.join(root, 'src'));
  await assert.rejects(compileMessages(root), /Linked translation path/);
  assert.deepEqual(await fs.readdir(path.join(root, 'elsewhere')), []);
});
