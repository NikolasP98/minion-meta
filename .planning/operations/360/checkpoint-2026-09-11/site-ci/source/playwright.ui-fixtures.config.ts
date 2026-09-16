import { defineConfig } from '@playwright/test';
import path from 'node:path';

const run = process.env.MINION_UI_RUN_DIR;
if (!run || !path.isAbsolute(run)) throw new Error('Private UI run required');
for (const [key, suffix] of [
  ['PWTEST_CACHE_DIR', 'playwright-cache'],
  ['TMPDIR', 'tmp'],
] as const)
  if (process.env[key] !== path.join(run, suffix))
    throw new Error('Private browser cache must be set before CLI import');
for (const key of [
  'MEMBER_DATA_FIXTURE_DIR',
  'MEMBER_CHAT_FIXTURE_DIR',
  'MEMBER_GATEWAY_FIXTURE_DIR',
])
  if (!process.env[key]) throw new Error('All built fixtures required');
for (const key of ['MEMBER_CHAT_BASELINE', 'MEMBER_CHAT_BASELINE_FONT'])
  if (process.env[key] !== undefined) throw new Error('Baseline is not acceptance');

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'member-data-parity.spec.ts',
    'member-chat-parity.spec.ts',
    'member-gateway-parity.spec.ts',
  ],
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  timeout: 30_000,
  use: {
    headless: true,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        launchOptions: process.env.MINION_WEBKIT_EXECUTABLE
          ? { executablePath: process.env.MINION_WEBKIT_EXECUTABLE }
          : undefined,
      },
    },
  ],
  outputDir: path.join(run, 'browser-results'),
  reporter: [['list'], ['json', { outputFile: path.join(run, 'browser.json') }]],
});
