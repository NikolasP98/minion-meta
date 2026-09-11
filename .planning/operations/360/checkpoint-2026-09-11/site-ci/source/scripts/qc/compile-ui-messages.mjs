import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function unlinked(target) {
  for (let current = path.resolve(target); ; current = path.dirname(current)) {
    const stat = await fs.lstat(current).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    if (stat?.isSymbolicLink()) throw new Error('Linked translation path');
    if (path.dirname(current) === current) break;
  }
}

/** Compile the real configured EN/ES messages; this does not run CDN lint plugins. */
export async function compileMessages(root = repository) {
  root = path.resolve(root);
  const output = path.join(root, 'src/lib/paraglide');
  await unlinked(output);
  const settingsPath = path.join(root, 'project.inlang/settings.json');
  await unlinked(settingsPath);
  const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
  if (
    settings.sourceLanguageTag !== 'en' ||
    JSON.stringify(settings.languageTags) !== '["en","es"]' ||
    settings['plugin.inlang.messageFormat']?.pathPattern !== './messages/{languageTag}.json'
  )
    throw new Error('Only the reviewed EN/ES message paths are supported');
  const inputs = new Map();
  for (const language of ['en', 'es']) {
    const name = `./messages/${language}.json`;
    const filename = path.join(root, name);
    await unlinked(filename);
    const bytes = await fs.readFile(filename);
    if (bytes.length > 4 * 1024 * 1024) throw new Error('Message input exceeds 4 MiB');
    JSON.parse(bytes.toString('utf8'));
    inputs.set(name, bytes);
  }
  const compilerPath = fileURLToPath(import.meta.resolve('@inlang/paraglide-js/internal'));
  const owner = JSON.parse(
    await fs.readFile(path.resolve(path.dirname(compilerPath), '../package.json'), 'utf8'),
  );
  // The pinned plugin ships dist/index.js but does not export its plugin entry.
  // Use Node's owner-relative package search locations, not a global/hoisted alias.
  let parserPath;
  for (const directory of createRequire(compilerPath).resolve.paths(
    '@inlang/plugin-message-format',
  )) {
    const candidate = path.join(directory, '@inlang/plugin-message-format');
    const info = await fs.readFile(path.join(candidate, 'package.json'), 'utf8').catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    if (!info) continue;
    const manifest = JSON.parse(info);
    if (
      manifest.name !== '@inlang/plugin-message-format' ||
      manifest.version !== owner.dependencies[manifest.name]
    )
      throw new Error('Compiler-owned plugin version mismatch');
    parserPath = path.join(candidate, 'dist/index.js');
    break;
  }
  if (!parserPath) throw new Error('Compiler-owned message plugin missing');
  const original = {
    connect: net.Socket.prototype.connect,
    tls: tls.connect,
    fetch: globalThis.fetch,
  };
  let attempts = 0;
  const deny = () => {
    attempts++;
    throw new Error('Translation compilation attempted network');
  };
  net.Socket.prototype.connect = deny;
  tls.connect = deny;
  globalThis.fetch = deny;
  let compiler;
  try {
    compiler = await import(pathToFileURL(compilerPath).href);
    await compiler.t.optOut();
    const { default: plugin } = await import(pathToFileURL(parserPath).href);
    const messages = await plugin.loadMessages({
      settings,
      nodeishFs: {
        readFile: async (name, options) => {
          const bytes = inputs.get(name);
          if (!bytes) throw new Error('Parser read outside configured message paths');
          const encoding = typeof options === 'string' ? options : options?.encoding;
          return encoding ? bytes.toString(encoding) : bytes;
        },
      },
    });
    const generated = await compiler.compile({ settings, messages, projectId: undefined });
    const outputs = [];
    for (const [name, content] of Object.entries(generated)) {
      const target = path.resolve(output, name);
      if (!target.startsWith(output + path.sep) || typeof content !== 'string')
        throw new Error('Compiler output escaped generated directory');
      await unlinked(target);
      outputs.push({ name, target, content });
    }
    if (!outputs.length || attempts) throw new Error('Translation compilation incomplete');
    for (const { target, content } of outputs) {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content);
    }
    return {
      compiler: {
        path: path.relative(repository, compilerPath),
        sha256: sha256(await fs.readFile(compilerPath)),
      },
      parser: {
        path: path.relative(repository, parserPath),
        sha256: sha256(await fs.readFile(parserPath)),
      },
      inputs: [...inputs].map(([name, bytes]) => ({ path: name, sha256: sha256(bytes) })),
      outputs: outputs.map(({ name, content }) => ({ path: name, sha256: sha256(content) })),
      networkAttempts: attempts,
      cdnLintPluginsExecuted: false,
    };
  } finally {
    try {
      await compiler?.t.shutdown();
    } finally {
      net.Socket.prototype.connect = original.connect;
      tls.connect = original.tls;
      globalThis.fetch = original.fetch;
    }
    if (attempts) throw new Error('Translation compilation attempted network');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('Translation command accepts no selectors');
  console.log(JSON.stringify(await compileMessages()));
}
