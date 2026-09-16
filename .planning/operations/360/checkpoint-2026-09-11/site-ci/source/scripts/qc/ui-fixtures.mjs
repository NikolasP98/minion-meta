import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import tls from 'node:tls';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const PROJECTS = ['chromium', 'firefox', 'webkit'];
const FONT_KEYS = [
  ...[400, 500, 600, 700].map((weight) => `Barlow Condensed:${weight}`),
  ...[400, 500, 600].map((weight) => `Barlow Semi Condensed:${weight}`),
];
export const CASES = Object.freeze({
  'member-data-parity.spec.ts': [
    'real graph and file parity at 390px',
    'real graph and file parity at 1280px',
    'retiring the real component while the ECharts chunk loads prevents late initialization',
    'real AppBar logout retry and success-only navigation at 390px',
    'real AppBar logout retry and success-only navigation at 1280px',
    'empty graph Retry is a touch-sized explicit action',
    'self-hosted font faces and exact upstream notices are delivered locally',
  ],
  'member-chat-parity.spec.ts': [
    ...[320, 390, 600, 1280].flatMap((width) =>
      ['concourse', 'concourse-day'].map((theme) => `actual members viewport ${width} ${theme}`),
    ),
    'composer activation preserves composition and newline editing',
    'manual tabs expose real panels without activation on focus movement',
    'dynamic viewport resize retains the composer and tabs',
    'Spanish320 page tabs stream and live reduced-motion preference remain usable',
  ],
  'member-gateway-parity.spec.ts': [390, 1280].flatMap((width) => [
    `native authentication streaming and manual tabs ${width}`,
    `native reconnect retires send without replay ${width}`,
    `native reverse history completion preserves current page ${width}`,
  ]),
});

/** Acceptance never inherits authentication, provider, baseline or selector state. */
export function cleanEnvironment(parent, run) {
  for (const key of [
    'MEMBER_CHAT_BASELINE',
    'MEMBER_CHAT_BASELINE_FONT',
    'E2E_BASE_URL',
    'E2E_UI_AUDIT',
  ])
    if (Object.hasOwn(parent, key)) throw new Error(`Acceptance refuses ${key}`);
  const env = {
    PATH: path.dirname(process.execPath) + path.delimiter + '/usr/bin:/bin',
    HOME: path.join(run, 'home'),
    LANG: 'C.UTF-8',
    TMPDIR: path.join(run, 'tmp'),
    XDG_CACHE_HOME: path.join(run, 'cache'),
    PWTEST_CACHE_DIR: path.join(run, 'playwright-cache'),
    PLAYWRIGHT_TEST_CACHE_DIR: path.join(run, 'playwright-cache'),
    MINION_UI_RUN_DIR: run,
  };
  for (const key of ['PLAYWRIGHT_BROWSERS_PATH', 'MINION_WEBKIT_EXECUTABLE']) {
    if (parent[key]) {
      if (!path.isAbsolute(parent[key])) throw new Error(`Absolute ${key} required`);
      env[key] = parent[key];
    }
  }
  return env;
}

/** JavaScript network fence; this is not an OS sandbox for arbitrary native code. */
export function installNetworkGuard(allowLoopback = false) {
  const saved = {
    connect: net.Socket.prototype.connect,
    tls: tls.connect,
    fetch: globalThis.fetch,
  };
  let denied = 0;
  const reject = () => {
    denied++;
    throw new Error('UI fixture outbound network denied');
  };
  net.Socket.prototype.connect = function (...args) {
    // net.connect passes Node's normalized [options, callback] array to Socket.connect.
    const first = Array.isArray(args[0]) ? args[0][0] : args[0];
    const host = typeof first === 'object' && first !== null ? first.host : args[1];
    const port = typeof first === 'object' && first !== null ? first.port : first;
    if (
      !allowLoopback ||
      host !== '127.0.0.1' ||
      !Number.isInteger(Number(port)) ||
      Number(port) < 1 ||
      Number(port) > 65535
    )
      return reject();
    return saved.connect.apply(this, args);
  };
  tls.connect = reject;
  globalThis.fetch = (...args) => {
    const url = new URL(
      typeof args[0] === 'string' || args[0] instanceof URL ? args[0] : args[0].url,
    );
    if (!allowLoopback || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port)
      return reject();
    return saved.fetch(...args);
  };
  const finish = () => {
    if (denied) process.exitCode = 1;
  };
  process.once('beforeExit', finish);
  return () => {
    net.Socket.prototype.connect = saved.connect;
    tls.connect = saved.tls;
    globalThis.fetch = saved.fetch;
    process.removeListener('beforeExit', finish);
    if (denied) throw new Error('UI fixture attempted forbidden network');
  };
}

if (process.env.MINION_UI_GUARD === 'deny' || process.env.MINION_UI_GUARD === 'loopback')
  installNetworkGuard(process.env.MINION_UI_GUARD === 'loopback');

function inside(file, base) {
  const real = fs.realpathSync(file);
  if (!real.startsWith(fs.realpathSync(base) + path.sep)) throw new Error('Evidence path escaped');
  return real;
}

export function fileInventory(root, excludedRootDirectories = []) {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (directory === root && excludedRootDirectories.includes(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Linked evidence member');
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(file);
        files.push({ path: path.relative(root, file), bytes: bytes.length, sha256: digest(bytes) });
      } else throw new Error('Unsupported evidence member');
    }
  };
  walk(root);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function sourceInventory() {
  const files = ['src', 'tests', 'scripts', 'messages', 'deps', 'static', 'project.inlang'].flatMap(
    (directory) =>
      fileInventory(path.join(ROOT, directory))
        .filter((file) => directory !== 'src' || !file.path.startsWith('lib/paraglide/'))
        .map((file) => ({ ...file, path: `${directory}/${file.path}` })),
  );
  for (const file of [
    'package.json',
    'bun.lock',
    'vitest.config.ts',
    'vitest.workspace.ts',
    'vitest.gateway-contract.config.ts',
    'playwright.ui-fixtures.config.ts',
    'svelte.config.js',
    'tsconfig.json',
  ]) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    files.push({ path: file, bytes: bytes.length, sha256: digest(bytes) });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function exactFonts(fonts) {
  const keys = fonts?.map((font) => `${font.family}:${font.weight}`);
  return (
    keys?.length === 7 && new Set(keys).size === 7 && FONT_KEYS.every((key) => keys.includes(key))
  );
}

export function validateNative(report, expected) {
  const cases = report.testResults?.flatMap((file) => file.assertionResults ?? []);
  if (
    !report.success ||
    report.numTotalTests !== expected ||
    report.numPassedTests !== expected ||
    report.numPendingTests !== 0 ||
    report.numFailedTests !== 0 ||
    !cases ||
    cases.length !== expected ||
    cases.some((item) => item.status !== 'passed') ||
    new Set(report.testResults.map((file) => file.name)).size !== report.testResults.length
  )
    throw new Error('Native matrix incomplete');
  return { passed: expected, skipped: 0 };
}

function attachment(result, name, evidenceRoot) {
  const values = result.attachments?.filter((item) => item.name === name);
  if (values?.length !== 1) throw new Error(`Missing or duplicate ${name}`);
  const item = values[0];
  const bytes = item.body
    ? Buffer.from(item.body, 'base64')
    : fs.readFileSync(inside(item.path, evidenceRoot));
  if (!bytes.length) throw new Error(`Empty ${name}`);
  return name === 'screenshot' ? bytes : JSON.parse(bytes.toString('utf8'));
}

export function validateBrowser(report, evidenceRoot, manifests, matrix = CASES) {
  const specs = [];
  const visit = (suite) => {
    specs.push(...(suite.specs ?? []));
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  if (report.errors?.length) throw new Error('Browser setup errors');
  const expected = Object.entries(matrix).flatMap(([file, titles]) =>
    PROJECTS.flatMap((project) => titles.map((title) => `${file}|${project}|${title}`)),
  );
  const seen = [];
  for (const spec of specs)
    for (const test of spec.tests ?? []) {
      const file = path.basename(spec.file);
      seen.push(`${file}|${test.projectName}|${spec.title}`);
      if (
        test.expectedStatus !== 'passed' ||
        test.status !== 'expected' ||
        test.results?.length !== 1 ||
        test.results[0].status !== 'passed' ||
        test.results[0].retry !== 0 ||
        test.results[0].errors?.length
      )
        throw new Error('Browser case skipped, retried or failed');
      const result = test.results[0];
      if (file === 'member-data-parity.spec.ts') {
        const faces = attachment(result, 'loaded-font-faces', evidenceRoot);
        const bytes = attachment(result, 'served-font-bytes', evidenceRoot);
        const runtime = attachment(result, 'runtime.json', evidenceRoot);
        if (
          !runtime.browser ||
          runtime.project !== test.projectName ||
          runtime.errors?.length !== 0 ||
          runtime.blocked?.length !== 0
        )
          throw new Error('Invalid data runtime/network evidence');
        if (
          !exactFonts(faces) ||
          bytes.length < 7 ||
          faces.some(
            (font) =>
              !Number.isInteger(font.registered) ||
              font.registered < 1 ||
              font.samples?.length !== 2 ||
              font.samples.some(
                (sample) =>
                  !Number.isInteger(sample.count) || sample.count < 1 || sample.matching !== true,
              ),
          )
        )
          throw new Error('Missing real font evidence');
      } else if (Object.hasOwn(CASES, file)) {
        const runtime = attachment(result, 'runtime.json', evidenceRoot);
        attachment(result, 'screenshot', evidenceRoot);
        if (
          !runtime.browser ||
          runtime.project !== test.projectName ||
          runtime.errors?.length !== 0 ||
          runtime.blocked?.length !== 0 ||
          runtime.manifestSha !== manifests[file] ||
          !exactFonts(runtime.fonts) ||
          runtime.fonts.some((font) => font.loaded !== true)
        )
          throw new Error('Invalid runtime/font/network evidence');
      }
    }
  if (
    seen.length !== expected.length ||
    new Set(seen).size !== expected.length ||
    expected.some((key) => !seen.includes(key))
  )
    throw new Error('Required browser matrix incomplete');
  return { passed: expected.length, projects: PROJECTS, skipped: 0, retries: 0 };
}

function runNode(args, env, log, timeout = 120000) {
  const fd = fs.openSync(log, 'wx');
  try {
    const result = spawnSync(process.execPath, args, {
      cwd: ROOT,
      env,
      detached: true,
      stdio: ['ignore', fd, fd],
      timeout,
      killSignal: 'SIGKILL',
    });
    if (result.error && result.pid) {
      try {
        process.kill(-result.pid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    if (result.status !== 0 || result.error)
      throw new Error(
        `Native step failed: ${path.basename(log)} (${result.status ?? result.error?.code})`,
      );
  } finally {
    fs.closeSync(fd);
  }
}

/** Internal fixed native stage. Its result alone never means full UI acceptance. */
export async function runNative(kind) {
  if (!['ordinary', 'gateway'].includes(kind)) throw new Error('Unknown native stage');
  const run = process.env.MINION_UI_RUN_DIR;
  if (!run) throw new Error('Private native run directory required');
  if (
    !process.env.TMPDIR ||
    !fs
      .realpathSync(process.env.TMPDIR)
      .startsWith(fs.realpathSync(path.dirname(ROOT.replace(/\/$/, ''))) + path.sep)
  )
    throw new Error('Private native TMPDIR required');
  const { createVitest } = await import('vitest/node');
  const { loadConfigFromFile } = await import('vite');
  const cache = path.join(run, 'cache', kind);
  const output = path.join(run, `${kind}.json`);
  const configPath = path.join(
    ROOT,
    kind === 'gateway' ? 'vitest.gateway-contract.config.ts' : 'vitest.config.ts',
  );
  const loaded = await loadConfigFromFile({ command: 'serve', mode: 'test' }, configPath, ROOT);
  if (!loaded) throw new Error('Native repository config missing');
  const options = {
    ...loaded.config.test,
    root: ROOT,
    config: false,
    watch: false,
    maxWorkers: 1,
    minWorkers: 1,
    reporters: ['json'],
    outputFile: output,
    projects: loaded.config.test.projects.map((project, index) => {
      if (!project || typeof project !== 'object')
        throw new Error('Only the declared inline projects are supported');
      return {
        ...project,
        ...(project.extends === true ? { extends: configPath } : {}),
        envDir: false,
        cacheDir: path.join(cache, String(index)),
      };
    }),
  };
  const ctx = await createVitest('test', options, {
    ...loaded.config,
    root: ROOT,
    envDir: false,
    cacheDir: cache,
    test: options,
  });
  try {
    for (const project of ctx.projects) {
      const config = project.vite.config;
      console.log(
        JSON.stringify({
          resolvedProject: project.getName(),
          cache: config.cacheDir,
          envDir: config.envDir,
        }),
      );
      fs.mkdirSync(config.cacheDir, { recursive: true });
      if (
        !fs.realpathSync(config.cacheDir).startsWith(fs.realpathSync(run) + path.sep) ||
        config.envDir !== false
      )
        throw new Error('Native project cache/environment escaped');
      console.log(
        JSON.stringify({
          project: project.getName(),
          cache: config.cacheDir,
          envDir: config.envDir,
          transform: project.config.testTransformMode,
          conditions: config.resolve.conditions,
          ssr: config.ssr.resolve.conditions,
        }),
      );
      if (
        kind === 'gateway' &&
        (JSON.stringify(project.config.include) !==
          '["src/lib/services/member-gateway.contract.fixture.ts"]' ||
          !project.config.testTransformMode.web?.includes(
            path.join(ROOT, 'src/lib/services/member-gateway.contract.fixture.ts'),
          ))
      )
        throw new Error('Exact gateway fixture/client transform selection lost');
    }
    await ctx.start();
    if (ctx.state.getUnhandledErrors().length) {
      console.error(ctx.state.getUnhandledErrors());
      throw new Error('Native unhandled errors');
    }
  } finally {
    await ctx.close();
  }
  validateNative(JSON.parse(fs.readFileSync(output, 'utf8')), kind === 'gateway' ? 22 : 56);
}

async function main() {
  if (process.argv.length !== 2) throw new Error('Acceptance command accepts no selectors');
  const run = fs.mkdtempSync(path.join(path.dirname(ROOT.replace(/\/$/, '')), 'ui-fixtures-'));
  const env = cleanEnvironment(process.env, run);
  for (const key of ['HOME', 'TMPDIR', 'XDG_CACHE_HOME', 'PWTEST_CACHE_DIR'])
    fs.mkdirSync(env[key], { recursive: true });
  const guarded = {
    ...env,
    MINION_UI_GUARD: 'deny',
    NODE_OPTIONS: `--max-old-space-size=1536 --import=${pathToFileURL(SELF).href}`,
  };
  const identity = {};
  for (const file of [
    'package.json',
    'bun.lock',
    'src/lib/services/member-gateway.svelte.ts',
    'vitest.gateway-contract.config.ts',
  ])
    identity[file] = digest(fs.readFileSync(path.join(ROOT, file)));
  const sharedBefore = fileInventory(path.join(ROOT, 'node_modules/@minion-stack/shared'));
  const sourceBefore = sourceInventory();
  const tools = {};
  for (const name of [
    'vitest',
    'vite',
    'svelte',
    '@sveltejs/vite-plugin-svelte',
    '@inlang/paraglide-js',
    '@playwright/test',
    'playwright-core',
    'ws',
  ]) {
    const bytes = fs.readFileSync(path.join(ROOT, 'node_modules', name, 'package.json'));
    tools[name] = { version: JSON.parse(bytes).version, manifestSha256: digest(bytes) };
  }
  if (tools['@playwright/test'].version !== '1.61.1')
    throw new Error('Unqualified Playwright version');
  console.log(
    JSON.stringify({
      run,
      node: process.version,
      boundary: 'credential-free-ui-and-local-transport',
    }),
  );
  runNode(
    [
      '--test',
      '--test-concurrency=1',
      'scripts/qc/compile-ui-messages.test.mjs',
      'scripts/qc/ui-fixtures.test.mjs',
    ],
    env,
    path.join(run, 'tooling-tests.log'),
  );
  runNode(['scripts/qc/compile-ui-messages.mjs'], guarded, path.join(run, 'messages.log'));
  runNode(
    ['node_modules/@sveltejs/kit/svelte-kit.js', 'sync'],
    {
      ...guarded,
      PUBLIC_SUPABASE_URL: 'https://fixture.invalid',
      PUBLIC_SUPABASE_ANON_KEY: 'fixture-public-key',
    },
    path.join(run, 'sync.log'),
  );
  for (const kind of ['ordinary', 'gateway'])
    runNode(
      [
        '--input-type=module',
        '-e',
        `import {runNative} from ${JSON.stringify(pathToFileURL(SELF).href)}; await runNative(${JSON.stringify(kind)});`,
      ],
      guarded,
      path.join(run, `${kind}.log`),
    );
  const outputs = {};
  const before = {};
  const manifests = {};
  for (const name of ['data', 'chat', 'gateway']) {
    const output =
      name === 'data'
        ? path.join(run, 'data')
        : path.join(path.dirname(ROOT.replace(/\/$/, '')), `${name}-output`, path.basename(run));
    outputs[name] = output;
    runNode(
      [`tests/fixtures/member-${name}-parity/build.mjs`, output],
      guarded,
      path.join(run, `${name}-build.log`),
    );
    before[name] = fileInventory(output);
    if (name !== 'data')
      manifests[`member-${name}-parity.spec.ts`] = digest(
        fs.readFileSync(path.join(output, 'manifest.json')),
      );
  }
  const browserEnv = {
    ...guarded,
    MINION_UI_GUARD: 'loopback',
    MEMBER_DATA_FIXTURE_DIR: outputs.data,
    MEMBER_CHAT_FIXTURE_DIR: outputs.chat,
    MEMBER_GATEWAY_FIXTURE_DIR: outputs.gateway,
  };
  runNode(
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      '--config',
      'playwright.ui-fixtures.config.ts',
    ],
    browserEnv,
    path.join(run, 'browser.log'),
    600000,
  );
  const browser = validateBrowser(
    JSON.parse(fs.readFileSync(path.join(run, 'browser.json'), 'utf8')),
    run,
    manifests,
  );
  for (const [name, output] of Object.entries(outputs))
    if (JSON.stringify(before[name]) !== JSON.stringify(fileInventory(output)))
      throw new Error('Built artifact changed during acceptance');
  for (const [file, hash] of Object.entries(identity))
    if (digest(fs.readFileSync(path.join(ROOT, file))) !== hash)
      throw new Error('Selected source/package identity changed');
  if (
    JSON.stringify(sharedBefore) !==
    JSON.stringify(fileInventory(path.join(ROOT, 'node_modules/@minion-stack/shared')))
  )
    throw new Error('Installed shared package changed');
  if (JSON.stringify(sourceBefore) !== JSON.stringify(sourceInventory()))
    throw new Error('Source closure changed');
  const retainedBytes =
    fileInventory(run, ['cache', 'tmp', 'home', 'playwright-cache']).reduce(
      (total, file) => total + file.bytes,
      0,
    ) +
    ['chat', 'gateway'].reduce(
      (total, name) => total + before[name].reduce((size, file) => size + file.bytes, 0),
      0,
    );
  if (retainedBytes > 250 * 1024 * 1024) throw new Error('Diagnostic artifact budget exceeded');
  const acceptance = JSON.stringify(
    {
      status: 'passed-local-fixtures',
      authenticatedApplication: false,
      hostedCiQualified: false,
      node: {
        version: process.version,
        executableSha256: digest(fs.readFileSync(process.execPath)),
      },
      tools,
      identity,
      source: sourceBefore,
      sharedPackage: sharedBefore,
      artifacts: before,
      retainedBytesBeforeReceipt: retainedBytes,
      native: { ordinary: 56, gateway: 22 },
      browser,
    },
    null,
    2,
  );
  if (retainedBytes + Buffer.byteLength(acceptance) > 250 * 1024 * 1024)
    throw new Error('Diagnostic artifact budget exceeded');
  fs.writeFileSync(path.join(run, 'acceptance.json'), acceptance);
  console.log(JSON.stringify({ status: 'passed-local-fixtures', run }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) await main();
