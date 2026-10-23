# Chat batch validation guide

Run from the isolated A Hub checkout after frozen installation. These are planned tests; this SDD does not claim they already pass. No real provider calls or production data are used.

```bash
bun run i18n:compile
node node_modules/@sveltejs/kit/svelte-kit.js sync
bunx vitest run src/lib/assistant/dispatch.ownership.test.ts src/lib/assistant/pending-submission.mounted.test.ts src/lib/services/gateway.session.test.ts
bunx vitest run src/server/services/assistant-router.provenance.test.ts src/lib/server/observability-context.test.ts src/lib/server/posthog.test.ts
bunx vitest run src/lib/assistant/decision-lineage.test.ts src/routes/api/assistant/decision-events/decision-events.test.ts src/server/auth/rate-limit.test.ts
bunx vitest run src/lib/assistant/dispatch.navigation.test.ts src/lib/services/gateway/chat-rpc.context.test.ts src/lib/assistant/page-context.test.ts
bunx vitest run src/lib/sandbox/tools.test.ts src/lib/sandbox/host.svelte.test.ts
node --test tests/fixtures/critical-journeys/eval-adapter.test.mjs
bun run lint:design
bun run lint:tokens
bun run check
bun run test
bun run build
bun run test:critical-journeys
```

Use the existing installed absolute `PLAYWRIGHT_BROWSERS_PATH` and preserve the critical runner's private output/receipt. Missing browser projects/cases is incomplete qualification. Re-run current actual modules after every substantive change; old fixture manifests are not reused.

A03 expected result: valid owned final executes once; duplicate/late/reloaded/expired/canceled/owner-switched cases execute zero stale actions. Hold an actual sandbox write/reload in the mounted fixtures. Its acknowledged source-bound transition must produce exactly one fresh completed-results follow-up and zero remaining old calls. Race user navigation, A→B→A, unrelated registration, reordered/duplicate/forged notification, source/lease disposal, Stop and failed reload/expired capability: each produces zero continuation, including if the tool later succeeds. Preparation finish after submission leaves the accepted tool signal live; Stop during smoothing aborts that exact run after chat.runId clears. Uninstrumented changes revoke; navigation remains explicit-user terminal; no sixth automatic follow-up. Test Home and Floating EN/ES; confirm Stop uses the exact captured run and retains newer drafts.

A04/A05 expected result: route→capture sink includes valid p_sandbox, requested/resolved models/revisions and null unknown cost; malformed/timeout elapsed remains measured. Successful classifier plus canceled generation never yields applied. Missing auth/org, cross-origin JSON, >20 events, >16KiB streamed body or >120 weighted events per minute is denied before capture. Use controlled-clock limiter tests for 4,096-key capacity, 60-second idle expiry, no active-budget eviction/partial charge and default weight-one compatibility. Owner switch drops old buffer; free text has no fabricated parent.

A/F smoke runs from meta using the explicit A checkout path and manifest pinned to A source/lock/adapter. All three arms must have identical initial-state hashes and actual context/dispatch receipts. Valid live-mode stub test is F's responsibility and uses the same A tools. Provider keys must not reach the adapter process/browser.

Use browser-harness for manual rendered inspection and screenshots of the installed private fixture (desktop/compact, EN/ES, keyboard Stop/callback). Keep synthetic fixture/runtime evidence separate from authenticated local server auth tests, deployment and production. Both independent review axes must pass before the draft A PR is qualified for owner merge.
