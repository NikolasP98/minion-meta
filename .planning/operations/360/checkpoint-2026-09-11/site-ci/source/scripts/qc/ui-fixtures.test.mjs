import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  ROOT,
  CASES,
  cleanEnvironment,
  installNetworkGuard,
  validateBrowser,
  validateNative,
  fileInventory,
} from './ui-fixtures.mjs';

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-ui-runner-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const encoded = (value) => Buffer.from(JSON.stringify(value)).toString('base64');
const fonts = [
  ...[400, 500, 600, 700].map((weight) => ({ family: 'Barlow Condensed', weight })),
  ...[400, 500, 600].map((weight) => ({ family: 'Barlow Semi Condensed', weight })),
];
function completeBrowser() {
  const specs = Object.entries(CASES).flatMap(([file, titles]) =>
    titles.map((title) => ({
      file,
      title,
      tests: ['chromium', 'firefox', 'webkit'].map((projectName) => ({
        projectName,
        expectedStatus: 'passed',
        status: 'expected',
        results: [
          {
            status: 'passed',
            retry: 0,
            errors: [],
            attachments: file.includes('data')
              ? [
                  {
                    name: 'loaded-font-faces',
                    body: encoded(
                      fonts.map((font) => ({
                        ...font,
                        registered: 1,
                        samples: [
                          { count: 1, matching: true },
                          { count: 1, matching: true },
                        ],
                      })),
                    ),
                  },
                  { name: 'served-font-bytes', body: encoded(Array(7).fill({ bytes: 1 })) },
                  {
                    name: 'runtime.json',
                    body: encoded({
                      browser: 'native-version',
                      project: projectName,
                      errors: [],
                      blocked: [],
                    }),
                  },
                ]
              : [
                  {
                    name: 'runtime.json',
                    body: encoded({
                      browser: 'native-version',
                      project: projectName,
                      errors: [],
                      blocked: [],
                      manifestSha: 'selected',
                      fonts: fonts.map((font) => ({ ...font, loaded: true })),
                    }),
                  },
                  {
                    name: 'screenshot',
                    body: Buffer.from('native screenshot control').toString('base64'),
                  },
                ],
          },
        ],
      })),
    })),
  );
  return { errors: [], suites: [{ specs }] };
}
const manifests = {
  'member-chat-parity.spec.ts': 'selected',
  'member-gateway-parity.spec.ts': 'selected',
};

test('empty child environment excludes credential and unrecognized canaries', () => {
  const env = cleanEnvironment(
    {
      SUPABASE_SERVICE_ROLE_KEY: 'canary',
      GITHUB_TOKEN: 'canary',
      MINION_GATEWAY_TOKEN: 'canary',
      UNRECOGNIZED_SECRET: 'canary',
      NODE_OPTIONS: '--require=untrusted',
    },
    '/private/run',
  );
  assert.equal(Object.values(env).includes('canary'), false);
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.HOME, '/private/run/home');
});

test('acceptance refuses baseline and route-audit modes', () => {
  for (const key of [
    'MEMBER_CHAT_BASELINE',
    'MEMBER_CHAT_BASELINE_FONT',
    'E2E_BASE_URL',
    'E2E_UI_AUDIT',
  ])
    assert.throws(() => cleanEnvironment({ [key]: '1' }, '/private/run'), /refuses/);
});

test('network guard refuses a real native outbound call even when its error is caught', () => {
  const restore = installNetworkGuard();
  assert.throws(() => new net.Socket().connect(443, 'example.invalid'), /network denied/);
  assert.throws(restore, /attempted forbidden network/);
});

test('loopback guard permits real native HTTP using Node normalized connection arguments', async () => {
  const server = http.createServer((_request, response) => response.end('owned fixture'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const restore = installNetworkGuard(true);
  try {
    const body = await new Promise((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port: server.address().port }, (response) => {
          let text = '';
          response.on('data', (chunk) => {
            text += chunk;
          });
          response.on('end', () => resolve(text));
        })
        .on('error', reject);
    });
    assert.equal(body, 'owned fixture');
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    restore();
  }
});

test('complete 75-case evidence control is accepted', () => {
  assert.equal(validateBrowser(completeBrowser(), '/', manifests).passed, 75);
});

for (const mutation of [
  'missing engine',
  'missing case',
  'duplicate',
  'skip',
  'retry',
  'setup error',
  'missing evidence',
  'altered artifact',
]) {
  test(`browser acceptance rejects ${mutation}`, () => {
    const report = completeBrowser();
    const specs = report.suites[0].specs;
    if (mutation === 'missing engine') for (const spec of specs) spec.tests.pop();
    if (mutation === 'missing case') specs.pop();
    if (mutation === 'duplicate') specs.push(specs[0]);
    if (mutation === 'skip') specs[0].tests[0].results[0].status = 'skipped';
    if (mutation === 'retry') specs[0].tests[0].results.push(specs[0].tests[0].results[0]);
    if (mutation === 'setup error') report.errors.push({ message: 'setup failed' });
    if (mutation === 'missing evidence') specs[0].tests[0].results[0].attachments = [];
    const selected =
      mutation === 'altered artifact'
        ? { ...manifests, 'member-chat-parity.spec.ts': 'different' }
        : manifests;
    assert.throws(() => validateBrowser(report, '/', selected));
  });
}

test('native result must contain every passing case without pending cases', () => {
  const report = {
    success: true,
    numTotalTests: 2,
    numPassedTests: 2,
    numPendingTests: 0,
    numFailedTests: 0,
    testResults: [
      {
        assertionResults: [
          { fullName: 'one', status: 'passed' },
          { fullName: 'two', status: 'passed' },
        ],
      },
    ],
  };
  assert.equal(validateNative(report, 2).passed, 2);
  report.numPendingTests = 1;
  assert.throws(() => validateNative(report, 2), /incomplete/);
});

test('actual native Playwright JSON and process exits distinguish passed, failed and selected runs', (t) => {
  const work = temporary(t);
  const spec = path.join(work, 'native-control.spec.ts');
  const config = path.join(work, 'config.mjs');
  const testImport = path.join(ROOT, 'node_modules/@playwright/test/index.mjs');
  const matrix = { 'native-control.spec.ts': ['native control'] };
  const env = cleanEnvironment({}, work);
  for (const key of ['HOME', 'TMPDIR', 'PWTEST_CACHE_DIR'])
    fs.mkdirSync(env[key], { recursive: true });
  for (const mode of ['passed', 'failed', 'subset']) {
    const output = path.join(work, mode + '.json');
    fs.writeFileSync(
      spec,
      `import {test,expect} from ${JSON.stringify(testImport)}; test('native control',()=>expect(1).toBe(${mode === 'failed' ? 2 : 1}));`,
    );
    fs.writeFileSync(
      config,
      `export default {testDir:${JSON.stringify(work)},testMatch:'native-control.spec.ts',workers:1,retries:0,projects:['chromium','firefox','webkit'].map(name=>({name})),reporter:[['json',{outputFile:${JSON.stringify(output)}}]],outputDir:${JSON.stringify(path.join(work, 'results'))}};`,
    );
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'node_modules/@playwright/test/cli.js'),
        'test',
        '--config',
        config,
        ...(mode === 'subset' ? ['--project=chromium'] : []),
      ],
      { cwd: ROOT, env, encoding: 'utf8', timeout: 30000 },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, mode === 'failed' ? 1 : 0, result.stderr);
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (mode === 'passed') assert.equal(validateBrowser(report, work, {}, matrix).passed, 3);
    else assert.throws(() => validateBrowser(report, work, {}, matrix));
  }
});

test('native Vitest Node and HappyDOM workers inherit the preload guard and empty credentials', (t) => {
  const work = temporary(t);
  const fixture = path.join(work, 'guard.test.mjs');
  const config = path.join(work, 'guard.config.mjs');
  const output = path.join(work, 'guard.json');
  fs.writeFileSync(
    fixture,
    `import {test,expect} from ${JSON.stringify(path.join(ROOT, 'node_modules/vitest/dist/index.js'))};
    import net from 'node:net';
    test('native worker guard canary',()=>{
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
      expect(()=>new net.Socket().connect(443,'example.invalid')).toThrow('UI fixture outbound network denied');
    });`,
  );
  fs.writeFileSync(
    config,
    `export default {root:${JSON.stringify(work)},envDir:false,cacheDir:${JSON.stringify(path.join(work, 'cache'))},test:{
    projects:['node','happy-dom'].map(environment=>({root:${JSON.stringify(work)},envDir:false,cacheDir:${JSON.stringify(path.join(work, 'cache'))}+'/'+environment,test:{name:environment,environment,include:['guard.test.mjs']}})),
    maxWorkers:1,minWorkers:1,reporters:['json'],outputFile:${JSON.stringify(output)}}};`,
  );
  // Tool resolution uses this repository's installed packages; no temporary install.
  const env = cleanEnvironment({ SUPABASE_SERVICE_ROLE_KEY: 'canary' }, work);
  for (const key of ['HOME', 'TMPDIR']) fs.mkdirSync(env[key], { recursive: true });
  env.MINION_UI_GUARD = 'deny';
  env.NODE_OPTIONS =
    '--import=' + pathToFileURL(path.join(ROOT, 'scripts/qc/ui-fixtures.mjs')).href;
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', '--config', config],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(result.error, undefined);
  const report = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(report.numTotalTests, 2, result.stderr);
  assert.equal(report.numPassedTests, 2, result.stderr);
});

test('retained evidence excludes private caches without following links in evidence', (t) => {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, 'cache'));
  fs.writeFileSync(path.join(root, 'cache', 'native-font-cache'), 'cache');
  fs.symlinkSync('native-font-cache', path.join(root, 'cache', 'native-font-alias'));
  fs.writeFileSync(path.join(root, 'browser.json'), '{}');
  assert.throws(() => fileInventory(root), /Linked evidence member/);
  const files = fileInventory(root, ['cache', 'tmp', 'home', 'playwright-cache']);
  assert.deepEqual(
    files.map((file) => file.path),
    ['browser.json'],
  );
  assert.equal(files[0].bytes, 2);
  fs.symlinkSync('browser.json', path.join(root, 'evidence-alias'));
  assert.throws(
    () => fileInventory(root, ['cache', 'tmp', 'home', 'playwright-cache']),
    /Linked evidence member/,
  );
});
