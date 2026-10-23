# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-journeys.spec.ts >> CJ1 Home requires a completed real-client handshake before send
- Location: tests/e2e/ui-audit/critical-journeys.spec.ts:62:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "pageerror: Cannot read properties of null (reading 'getBoundingClientRect')",
+ ]
```

# Page snapshot

```yaml
- main "Good to see you, Fixture." [ref=e7]:
  - generic [ref=e9]:
    - heading "Good to see you, Fixture." [level=1] [ref=e10]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - img "Agent avatar" [ref=e19]
        - paragraph [ref=e27]: Good to see you, Fixture.
      - generic [ref=e28]:
        - button "Chat history" [ref=e29] [cursor=pointer]:
          - generic "Chat history" [ref=e30]:
            - img [ref=e32]
        - button "New chat" [ref=e33] [cursor=pointer]:
          - generic [ref=e34]:
            - img [ref=e35]
            - generic [ref=e36]: New chat
    - region "Today" [ref=e38]:
      - paragraph [ref=e39]: Quiet so far today. As you exchange messages with your agents, they'll surface here.
    - region "Conversation" [ref=e40]
    - generic [ref=e41]:
      - generic [ref=e45]:
        - generic [ref=e46]: ❯
        - textbox "Chat with your agent" [active] [ref=e47]:
          - /placeholder: Ask your agent…
          - text: Blocked before handshake
        - generic [ref=e48]: ↵
      - generic [ref=e50]:
        - 'button "Language: Auto-detect" [ref=e51] [cursor=pointer]':
          - generic [ref=e52]:
            - generic [ref=e53]: "Language: Auto-detect"
            - img [ref=e54]
            - generic [ref=e55]: A
        - button "Call your agent" [ref=e56] [cursor=pointer]:
          - img [ref=e58]
  - generic [ref=e59]:
    - complementary "Notes and todos" [ref=e60]:
      - button "Open notes and todos" [ref=e61] [cursor=pointer]:
        - generic [ref=e62]:
          - img [ref=e64]
          - generic [ref=e65]: Notes & Todos
    - complementary "Recent conversations across channels" [ref=e66]:
      - button "Open omnichat" [ref=e67] [cursor=pointer]:
        - generic [ref=e68]:
          - img [ref=e70]
          - generic [ref=e71]: Omnichat
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import fs from 'node:fs';
  3   | import path from 'node:path';
  4   | 
  5   | type Snapshot = {
  6   |   connected: boolean;
  7   |   requests: { method: string; params?: { message?: string } }[];
  8   |   unexpected: string[];
  9   | };
  10  | type FixtureWindow = Window & {
  11  |   __critical?: { snapshot(): Snapshot; releaseHandshake(): void; finishTurn(): void };
  12  |   __overlayFixture?: { fail(): void; succeed(): void; reopen(): Promise<void> };
  13  | };
  14  | const snapshot = (page: Page) =>
  15  |   page.evaluate(() => (window as FixtureWindow).__critical!.snapshot());
  16  | const violations = new WeakMap<Page, string[]>();
  17  | test.beforeEach(async ({ page, browser }, info) => {
  18  |   const manifest = JSON.parse(
  19  |     fs.readFileSync(path.join(process.env.MINION_CRITICAL_OUT!, 'manifest.json'), 'utf8'),
  20  |   ) as { files: { path: string }[] };
  21  |   const allowed = new Set(manifest.files.map((f) => '/' + f.path));
  22  |   const rejected: string[] = [];
  23  |   violations.set(page, rejected);
  24  |   await page.route('**/*', async (route) => {
  25  |     const url = new URL(route.request().url());
  26  |     if (
  27  |       url.origin === 'http://127.0.0.1:18903' &&
  28  |       allowed.has(url.pathname) &&
  29  |       route.request().method() === 'GET'
  30  |     )
  31  |       await route.continue();
  32  |     else {
  33  |       rejected.push(route.request().url());
  34  |       await route.abort('blockedbyclient');
  35  |     }
  36  |   });
  37  |   page.on('websocket', (ws) => rejected.push('native WebSocket: ' + ws.url()));
  38  |   page.on('pageerror', (err) => rejected.push('pageerror: ' + err.message));
  39  |   await info.attach('runtime-identity', {
  40  |     body: JSON.stringify({
  41  |       browser: browser.version(),
  42  |       project: info.project.name,
  43  |       viewport: info.project.use.viewport,
  44  |       auth: 'none; synthetic fixture',
  45  |     }),
  46  |     contentType: 'application/json',
  47  |   });
  48  | });
  49  | test.afterEach(async ({ page }, info) => {
  50  |   await info.attach('network-boundary', {
  51  |     body: JSON.stringify({
  52  |       unexpectedNativeRequestsOrErrors: violations.get(page) ?? [],
  53  |       allowedOrigin: 'http://127.0.0.1:18903',
  54  |       transport: 'synthetic; no backend authentication',
  55  |     }),
  56  |     contentType: 'application/json',
  57  |   });
> 58  |   expect(violations.get(page)).toEqual([]);
      |                                ^ Error: expect(received).toEqual(expected) // deep equality
  59  |   if (page.url().includes('/home.html')) expect((await snapshot(page)).unexpected).toEqual([]);
  60  | });
  61  | 
  62  | test('CJ1 Home requires a completed real-client handshake before send', async ({ page }) => {
  63  |   await page.goto('/home.html?hold');
  64  |   const input = page.getByRole('textbox', { name: 'Chat with your agent' });
  65  |   await expect(input).toBeVisible();
  66  |   await expect
  67  |     .poll(async () => (await snapshot(page)).requests.filter((r) => r.method === 'connect').length)
  68  |     .toBe(1);
  69  |   expect((await snapshot(page)).connected).toBe(false);
  70  |   await input.fill('Blocked before handshake');
  71  |   await input.press('Enter');
  72  |   expect((await snapshot(page)).requests.filter((r) => r.method === 'chat.send')).toHaveLength(0);
  73  |   await page.evaluate(() => (window as FixtureWindow).__critical!.releaseHandshake());
  74  |   await expect.poll(async () => (await snapshot(page)).connected).toBe(true);
  75  | });
  76  | 
  77  | test('CJ2 Home sends once and renders the synthetic gateway response', async ({ page }) => {
  78  |   await page.goto('/home.html');
  79  |   await expect.poll(async () => (await snapshot(page)).connected).toBe(true);
  80  |   const input = page.getByRole('textbox', { name: 'Chat with your agent' });
  81  |   await input.fill('Fixture request canary');
  82  |   await input.press('Enter');
  83  |   await expect
  84  |     .poll(
  85  |       async () => (await snapshot(page)).requests.filter((r) => r.method === 'chat.send').length,
  86  |     )
  87  |     .toBe(1);
  88  |   expect(
  89  |     (await snapshot(page)).requests.find((r) => r.method === 'chat.send')?.params?.message,
  90  |   ).toContain('Fixture request canary');
  91  |   await input.fill('Second request while the first turn is pending');
  92  |   await input.press('Enter');
  93  |   expect((await snapshot(page)).requests.filter((r) => r.method === 'chat.send')).toHaveLength(1);
  94  |   await page.evaluate(() => (window as FixtureWindow).__critical!.finishTurn());
  95  |   await expect(page.getByText('Synthetic response received.', { exact: true })).toBeVisible();
  96  | });
  97  | 
  98  | test('CJ3 Calendar staff lanes stay reachable', async ({ page }) => {
  99  |   await page.goto('/calendar.html');
  100 |   await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
  101 |   // Scheduling uses the shared calendar grid. Exclude its aggregate “All”
  102 |   // column and require every synthetic staff lane, not the retired renderer.
  103 |   const lanes = page.locator('.col:not(.is-all) > .col-head');
  104 |   await expect(lanes).toHaveCount(6);
  105 |   await expect(lanes.locator('.head-name')).toHaveText([
  106 |     'Leiva',
  107 |     'Martin',
  108 |     'Nikolas Pinon',
  109 |     'Nikolas Sarria',
  110 |     'Nikolas Sebastian Pinon Sarria',
  111 |     'Renzo GT',
  112 |   ]);
  113 |   await lanes.last().scrollIntoViewIfNeeded();
  114 |   const box = await lanes.last().boundingBox();
  115 |   expect(box).not.toBeNull();
  116 |   expect(box!.width).toBeGreaterThanOrEqual(112);
  117 |   expect(box!.x).toBeGreaterThanOrEqual(0);
  118 |   expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  119 |   await page.getByRole('button', { name: 'Today', exact: true }).focus();
  120 |   await page.keyboard.press('Tab');
  121 |   expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  122 | });
  123 | 
  124 | test('CJ4 Secret save blocks dismissal and duplicate submission, then retries', async ({
  125 |   page,
  126 | }) => {
  127 |   await page.goto('/overlay.html');
  128 |   await page.locator('#open-secret').click();
  129 |   const dialog = page.locator('dialog[open]');
  130 |   await expect(dialog).toBeVisible();
  131 |   await dialog.getByPlaceholder('Paste secret value').fill('synthetic-value');
  132 |   await dialog.getByRole('button', { name: 'Save & probe' }).click();
  133 |   await expect(page.locator('#fixture-state')).toHaveAttribute('data-saves', '1');
  134 |   await page.keyboard.press('Escape');
  135 |   await expect(dialog).toBeVisible();
  136 |   await expect(dialog.getByRole('button', { name: 'Save & probe' })).toBeDisabled();
  137 |   await page.evaluate(() => (window as FixtureWindow).__overlayFixture!.fail());
  138 |   await expect(dialog.getByText('Fixture save failed')).toBeVisible();
  139 |   await dialog.getByRole('button', { name: 'Save & probe' }).click();
  140 |   await expect(page.locator('#fixture-state')).toHaveAttribute('data-saves', '2');
  141 |   await page.evaluate(() => (window as FixtureWindow).__overlayFixture!.succeed());
  142 |   await expect(dialog.getByText('Verified test response', { exact: true })).toBeVisible();
  143 |   await dialog
  144 |     .getByRole('button', { name: 'Close', exact: true })
  145 |     .and(dialog.locator('[data-part="button"]'))
  146 |     .click();
  147 |   await expect(dialog).toHaveCount(0);
  148 |   await expect(page.locator('#open-secret')).toBeFocused();
  149 | });
  150 | 
  151 | test('CJ5 Image dialog prevents background focus and returns it on Escape', async ({
  152 |   page,
  153 | }, info) => {
  154 |   await page.goto('/overlay.html');
  155 |   await page.locator('#open-image').click();
  156 |   const dialog = page.locator('dialog[open]');
  157 |   await expect(dialog).toBeVisible();
  158 |   const focusStates = [];
```