# Portable Site UI qualification

After a frozen Bun install, run the local acceptance entrypoint from this repository:

```sh
node scripts/qc/ui-fixtures.mjs
```

The command uses installed native Node/Paraglide/Vitest/Vite/Playwright tools and
accepts no selectors. It compiles real EN/ES messages without CDN calls, runs the
56 ordinary plus 22 real-service contract cases, builds each actual fixture once,
and requires 75 browser cases: 7 data, 12 Chat and 6 real gateway cases in each of
Chromium, Firefox and WebKit. Missing engines, skipped/retried cases, baseline
modes, missing runtime/font evidence and changed artifacts fail acceptance.
The gateway contract config retains exact absolute matching for client-compiled
runes beneath hidden directories; the source transform guard must remain enabled.

Prepare browsers separately with the installed CLI:

```sh
node node_modules/@playwright/test/cli.js install --with-deps chromium firefox webkit
```

The command above installs operating-system dependencies; use it on an authorized
disposable Ubuntu 24.04 CI worker, not as an implicit repair of a personal host.
Existing local browser caches can be selected through an absolute
`PLAYWRIGHT_BROWSERS_PATH`; `MINION_WEBKIT_EXECUTABLE` selects an explicitly
qualified local wrapper. Wrapper results remain distinct from stock Ubuntu.
The additive CI job pins Node 22.23.2, Bun 1.3.4 and the existing locked Playwright
1.61.1/browser revisions. It preserves all old check/format/build steps and adds
dev event coverage without altering deployment workflows.

The runner creates fresh sibling `ui-fixtures-*`, `chat-output` and
`gateway-output` artifacts, private HOME/temp/transform caches, one compiler and
one browser worker. It strips ambient credentials and Node options before child
execution, loads no app environment, and allows only the test-owned loopback
HTTP/WebSocket boundary during browser checks. Native JavaScript network guards
are not an OS sandbox for arbitrary native code. Each fixture build has a
120-second deadline and a 1536 MiB heap; the complete browser stage has ten minutes.
The runner records exact package/service/source and artifact identities alongside
native JSON results. Seven Barlow family/weight faces must really load; checking
a family name without registered faces is not font evidence.

These are credential-free UI and local transport tests. Real components and the
installed GatewayClient run against deterministic signing/HTTP/WebSocket peers;
no production authorization, real provider session, database, deployment or
physical mobile keyboard is certified. The Chat fixture deliberately retains its
synthetic UI adapter; the separate gateway fixture exercises the actual service.
See the sibling Chat and gateway fixture READMEs for their exact boundaries.

Hosted Ubuntu execution remains pending until this exact source is adopted and
that job actually passes; the workflow TODO is paired in the platform proposal.
The original global formatting gate still has 289 unchanged baseline warnings.
This lane neither suppresses that gate nor reports overall CI as green. The
existing font and fallback-baseline receipts remain historical evidence.

## Original fixture and local qualification notes

# Member data parity fixture

This standalone fixture mounts the actual GraphTab, FilesTab, member state, Svelte and ECharts. Only the gateway boundary returns synthetic deferred replies. It requires no member login, provider, WebSocket or database. Visible fixture controls resolve requests in either order.

The normal Site `bun run test` discovers mounted component cases in the native Vitest 3 members project and existing server cases in the Node project. `happy-dom` 20.11.6 is a declared development dependency. The explicit development-only `ws` 8.20.0 pin preserves existing shared optional-peer resolution under Bun 1.3.4; HappyDOM requires and receives its own 8.21.3 copy. It is a temporary toolchain constraint, not a gateway API change. Resolver evidence must accompany any future removal.

Build the fixture with the installed Site tools:

```sh
bun tests/fixtures/member-data-parity/build.mjs /tmp/member-data-fixture
```

Run `MEMBER_DATA_FIXTURE_DIR=/tmp/member-data-fixture bun x playwright test tests/e2e/member-data-parity.spec.ts --workers=1` using the declared Playwright 1.61.1 test package and its matching Chromium installation. The spec serves only its own immutable output on a random loopback port and aborts other origins. It captures mobile and desktop screenshots. Follow the root browser-harness isolation rules before executing browser work.

The browser test package is declared; browser binary provisioning and this lane's CI invocation remain in phase 13-03. This fixture is a review lane; repository-reproducible browser CI remains in phase 13-03. Mounted DOM tests do not prove real layout, ECharts rendering or browser reduced-motion behavior. Browser execution and source admission require their own receipts.

The fixture also mounts the actual AppBar. Its logout tests intercept only the fixture origin's POST `/auth/logout` and serve a local marker page at `/login`; they prove UI state/navigation, not real session revocation. The endpoint's separate native tests exercise synthetic provider selection and the real cookie bridge with external SDK calls mocked.

Vitest 3.2.6 shares the existing Vite 6.4.2/Svelte 5.55.9/plugin 5.1.1 toolchain. This removes the duplicate Vite 5/esbuild tree required by Vitest 2 and avoids a plugin type cast. Existing Better Auth optional Vitest peer resolution can materialize test packages even in a fresh Bun production-only install; that is package installation evidence, not application bundle reachability.

The fixture imports the actual application CSS, including locally bundled Barlow Condensed 400/500/600/700 and Barlow Semi Condensed 400/500/600 from Fontsource 5.3.0. Each browser case verifies registered matching FontFace entries and nonempty loaded-face arrays for English and Spanish before geometry; font responses must match emitted bytes and stay on the fixture origin. Both upstream license notices ship at `/fonts/barlow-LICENSE.txt`. Earlier phase 13-08/09 screenshots used fallback fonts and remain separate evidence.
