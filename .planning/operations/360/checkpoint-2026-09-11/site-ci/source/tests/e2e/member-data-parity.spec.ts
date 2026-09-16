import type { ECharts } from 'echarts';
import { test, expect, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
declare global {
  interface Window {
    memberFixture: {
      chart(): Promise<ECharts | undefined>;
      pending(): { kind: string; params?: { path?: string } }[];
    };
    fixtureInjected?: boolean;
  }
}
let server: Server;
let origin: string;
const output = resolve(process.env.MEMBER_DATA_FIXTURE_DIR ?? '.member-data-parity');
test.beforeAll(async ({ browser, browserName }) => {
  console.log(
    JSON.stringify({
      engine: browserName,
      version: browser.version(),
      project: test.info().project.name,
    }),
  );
  server = createServer(async (request, response) => {
    if (request.url === '/login') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><title>Fixture login</title><h1>Fixture login</h1>');
      return;
    }
    const path = resolve(
      output,
      '.' + new URL(request.url ?? '/', 'http://fixture').pathname.replace(/\/$/, '/index.html'),
    );
    if (!path.startsWith(output + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const bytes = await readFile(path);
      response.setHeader(
        'Content-Type',
        (
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.woff2': 'font/woff2',
          } as Record<string, string>
        )[extname(path)] ?? 'application/octet-stream',
      );
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((yes) => server.listen(0, '127.0.0.1', yes));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No fixture address');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  await new Promise<void>((yes, no) => server.close((error) => (error ? no(error) : yes())));
});
const failedResponses = new WeakMap<Page, string[]>();
const fontResponses = new WeakMap<
  Page,
  Promise<{ url: string; bytes: number; sha256: string }>[]
>();
async function loadActualFonts(page: Page) {
  const loaded = await page.evaluate(async () => {
    const selections = [
      ['Barlow Condensed', [400, 500, 600, 700]],
      ['Barlow Semi Condensed', [400, 500, 600]],
    ] as const;
    const results = [];
    for (const [family, weights] of selections) {
      for (const weight of weights) {
        const registered = [...document.fonts].filter(
          (face) => face.family.replace(/['"]/g, '') === family && face.weight === String(weight),
        );
        const samples = [];
        for (const text of [
          'Knowledge graph Files Sign out',
          'ÁÉÍÓÚÜÑ áéíóúüñ ¿Cerrar sesión? ¡Sí!',
        ]) {
          const faces = await document.fonts.load(`${weight} 16px "${family}"`, text);
          samples.push({
            count: faces.length,
            matching: faces.every(
              (face) =>
                face.family.replace(/['"]/g, '') === family &&
                face.weight === String(weight) &&
                face.status === 'loaded',
            ),
          });
        }
        results.push({ family, weight, registered: registered.length, samples });
      }
    }
    await document.fonts.ready;
    return results;
  });
  expect(loaded).toHaveLength(7);
  for (const selection of loaded) {
    expect(
      selection.registered,
      `${selection.family} ${selection.weight} registration`,
    ).toBeGreaterThan(0);
    for (const sample of selection.samples) {
      expect(sample.count, `${selection.family} ${selection.weight} loaded faces`).toBeGreaterThan(
        0,
      );
      expect(sample.matching).toBe(true);
    }
  }
  await test.info().attach('loaded-font-faces', {
    body: JSON.stringify(loaded, null, 2),
    contentType: 'application/json',
  });
}
const runtimeObservations = new WeakMap<Page, { errors: string[]; blocked: string[] }>();
test.beforeEach(async ({ page }) => {
  const observed = { errors: [] as string[], blocked: [] as string[] };
  runtimeObservations.set(page, observed);
  page.on('pageerror', (error) => observed.errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) observed.blocked.push(request.url());
  });
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  );
  await page.routeWebSocket('**/*', (socket) => {
    observed.blocked.push(socket.url());
    socket.close();
  });
  const failures: string[] = [];
  failedResponses.set(page, failures);
  const fonts: Promise<{ url: string; bytes: number; sha256: string }>[] = [];
  fontResponses.set(page, fonts);
  page.on('response', (response) => {
    if (response.request().resourceType() === 'font') {
      fonts.push(
        (async () => {
          expect(new URL(response.url()).origin).toBe(origin);
          expect(response.ok()).toBe(true);
          const actual = await response.body();
          const expected = await readFile(resolve(output, '.' + new URL(response.url()).pathname));
          expect(actual.equals(expected)).toBe(true);
          return {
            url: response.url(),
            bytes: actual.length,
            sha256: createHash('sha256').update(actual).digest('hex'),
          };
        })(),
      );
    }
    if (response.status() >= 400 && new URL(response.url()).pathname !== '/auth/logout')
      failures.push(`${response.status()} ${response.url()}`);
  });
});
test.afterEach(async ({ page }, info) => {
  const observed = runtimeObservations.get(page)!;
  await info.attach('runtime.json', {
    body: JSON.stringify({
      browser: page.context().browser()?.version(),
      project: info.project.name,
      artifactRoot: output,
      ...observed,
    }),
    contentType: 'application/json',
  });
  expect(observed.errors).toEqual([]);
  expect(observed.blocked).toEqual([]);
  expect(failedResponses.get(page)).toEqual([]);
  const fonts = await Promise.all(fontResponses.get(page) ?? []);
  await test.info().attach('served-font-bytes', {
    body: JSON.stringify(fonts, null, 2),
    contentType: 'application/json',
  });
});
for (const width of [390, 1280]) {
  test(`real graph and file parity at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    const blocked: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : (blocked.push(route.request().url()), route.abort()),
    );
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(origin);
    await loadActualFonts(page);
    await expect(page.getByText('Loading knowledge graph...')).toBeVisible();
    await page.getByRole('button', { name: 'Resolve graph', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(
      await page.evaluate(async () => {
        const chart = await window.memberFixture.chart();
        const option = chart!.getOption() as {
          animation: boolean;
          series: { force: { layoutAnimation: boolean }; data: unknown[] }[];
        };
        chart!.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: 0 });
        return {
          animation: option.animation,
          force: option.series[0].force.layoutAnimation,
          nodes: option.series[0].data.length,
        };
      }),
    ).toEqual({ animation: false, force: false, nodes: 2 });
    expect(await page.evaluate(() => window.fixtureInjected)).toBeUndefined();
    await page.getByRole('button', { name: 'Day theme', exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const chart = await window.memberFixture.chart();
          const option = chart!.getOption() as {
            series: { categories: { itemStyle: { color: string } }[] }[];
          };
          return (
            option.series[0].categories[0].itemStyle.color ===
            getComputedStyle(document.querySelector('.graph-canvas')!)
              .getPropertyValue('--color-accent')
              .trim()
          );
        }),
      )
      .toBe(true);

    const summary = page.getByText('Knowledge graph data', { exact: true });
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await summary.click();
    await expect(page.locator('details')).toContainText('a → b: related_to');
    await expect(
      page
        .locator('details')
        .getByText('<img src=x onerror=window.fixtureInjected=true>', { exact: false }),
    ).toBeVisible();
    expect(await page.locator('section img, section script').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: test.info().outputPath(`graph-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Files', exact: true }).click();
    await page.getByRole('button', { name: 'Resolve files', exact: true }).click();
    await page.getByRole('button', { name: 'A.txt', exact: true }).click();
    await page.getByRole('button', { name: 'B.txt', exact: true }).click();
    await page.getByRole('button', { name: 'Resolve B', exact: true }).click();
    await expect(page.locator('pre')).toHaveText('B.txt content');
    await page.getByRole('button', { name: 'Resolve A', exact: true }).click();
    await expect(page.locator('pre')).toHaveText('B.txt content');
    await page.screenshot({ path: test.info().outputPath(`files-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await expect(page.locator('pre')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'A.txt', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
    expect(blocked).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`member-data-${width}.png`),
      fullPage: true,
    });
  });
}

test('retiring the real component while the ECharts chunk loads prevents late initialization', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const arrived = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      await route.abort();
      return;
    }
    if (route.request().url().includes('/chunks/echarts-')) {
      requested();
      await gate;
    }
    await route.continue();
  });
  try {
    await page.goto(origin);
    await loadActualFonts(page);
    await page.getByRole('button', { name: 'Resolve graph', exact: true }).click();
    await arrived;
    await page.getByRole('button', { name: 'Unmount', exact: true }).click();
    release();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

for (const width of [390, 1280]) {
  test(`real AppBar logout retry and success-only navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const blocked: string[] = [];
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : (blocked.push(route.request().url()), route.abort()),
    );
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    await page.route('**/auth/logout', async (route) => {
      calls++;
      expect(route.request().method()).toBe('POST');
      if (calls === 1) {
        await gate;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: '{"success":false}',
        });
      } else
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"success":true}',
        });
    });
    try {
      await page.goto(origin);
      await loadActualFonts(page);
      const button = page.getByRole('button', { name: 'Sign out', exact: true });
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await button.click();
      await expect(
        page.getByRole('button', { name: 'Signing out...', exact: true }),
      ).toBeDisabled();
      await page
        .getByRole('button', { name: 'Signing out...', exact: true })
        .dispatchEvent('click');
      await expect.poll(() => calls).toBe(1);
      expect(page.url()).toBe(origin + '/');
      release();
      await expect(page.getByRole('alert')).toHaveText("Couldn't sign out. Try again.");
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled();
      expect(page.url()).toBe(origin + '/');
      await page.screenshot({
        path: test.info().outputPath(`logout-retry-${width}.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await expect(page).toHaveURL(origin + '/login');
      await expect(page.getByRole('heading', { name: 'Fixture login' })).toBeVisible();
      expect(calls).toBe(2);
      expect(errors).toEqual([]);
      expect(blocked).toEqual([]);
    } finally {
      release();
    }
  });
}

test.describe('coarse pointer targets', () => {
  test.use({ hasTouch: true });
  test('empty graph Retry is a touch-sized explicit action', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    await page.goto(origin);
    await loadActualFonts(page);
    expect(await page.evaluate(() => matchMedia('(pointer:coarse)').matches)).toBe(true);
    await page.getByRole('button', { name: 'Resolve empty graph', exact: true }).click();
    await expect(page.getByText('Knowledge graph is empty', { exact: true })).toBeVisible();
    const retry = page.getByRole('button', { name: 'Retry', exact: true });
    const box = await retry.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    await retry.click();
    await page.getByRole('button', { name: 'Resolve graph', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
  });
});

test('self-hosted font faces and exact upstream notices are delivered locally', async ({
  page,
}) => {
  const blocked: string[] = [];
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : (blocked.push(route.request().url()), route.abort()),
  );
  await page.goto(origin);
  await loadActualFonts(page);
  const response = await page.request.get(origin + '/fonts/barlow-LICENSE.txt');
  expect(response.ok()).toBe(true);
  expect(await response.body()).toEqual(await readFile(resolve('static/fonts/barlow-LICENSE.txt')));
  expect(blocked).toEqual([]);
  expect((await Promise.all(fontResponses.get(page) ?? [])).length).toBeGreaterThanOrEqual(7);
});
