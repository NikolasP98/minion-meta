# Fresh contact rows after a merge (customer host)

The customer host must not release its merge latch on rows that may predate the merge. F8 adds one opt-in selector to the existing contacts GET and one host function. No endpoint, cache backend, ranking change, loader change or background job is added.

## Evidence

- Customer SSR (`crm/customers/+page.server.ts:98`), contacts GET (`api/crm/contacts/+server.ts:77` for `fields=id`, `:92` for pages) and CSV export (`api/crm/contacts/export.csv/+server.ts:147`) call `rankContactsPageCached` (`crm-contacts.service.ts:440`; TTL 2m, SWR 1h, CRM domain tags, `:466`). `rankContactsPage` (`:423`) is the uncached path and resolves its finance bridge before opening its transaction; call it directly, never inside another `withOrgCore` (`:477`).
- `mergeContacts` busts the CRM tags after commit (`crm-cleanup.service.ts:531`). The bust is best-effort: `invalidateTags` logs and swallows backend errors (meta `packages/cache/src/core.ts:59-70`; Hub pins `@minion-stack/cache` 0.3.0, `bun.lock:457`; that the published 0.3.0 matches this source is assumed, verify in T003). A committed merge can therefore leave cached pages stale with an HTTP 200.
- `invalidate('crm:contacts')` cannot deliver the filtered view. In the installed SvelteKit 2.70.2 (same version as `bun.lock:869`), `replaceState` only calls `history.replaceState` and sets `page.state` (`src/runtime/client/client.js:2551-2583`); `_invalidate` reruns the load for `current.url` (`:417-426`), which only real navigations change. The pinned host comment at `PageBody.svelte:229-231` assumes otherwise. F8 does not use `invalidate` for merge refresh. The same assumption in the host's other `invalidate('crm:contacts')` calls (`:658`, `:670`, `:679`, `:809`, `:1113`) is a pre-existing issue outside F8; T016 records it in the open-items ledger.

## Server: `fresh=1` on the existing contacts GET

`GET /api/crm/contacts?…&fresh=1` keeps the normal branch's authentication, filter parsing, `ownerFilter`, `shouldMaskSensitive`, limit clamp (1-500), offset, tag decoration and custom-property bundle. Only two things differ:

- it calls `rankContactsPage(ctx, filters)` instead of `rankContactsPageCached`;
- the JSON body adds `fresh: true` and the response sets `Cache-Control: private, no-store`.

`fresh=1` together with `fields=id` returns `error(400, 'fresh reads do not support fields=id')`, so the uncached path is never a full-roster read. Any `fresh` value other than `1` is ignored. Normal requests keep their cached behavior and body shape (no `fresh` key). `selectAllMatching` (`fields=id`) and CSV export stay on the cached path. The normal API branch applies no finance-dataset denial while SSR does (`+page.server.ts:89`); the fresh branch mirrors the normal API branch, and that pre-existing difference is outside F8.

The uncached query has the existing cold cost over the whole org; the source comment records 43-57 s historically (`crm-contacts.service.ts:427-438`), which is not a current measurement. The user starts each fresh read explicitly; there is no timer or parallel read. A read that errors or exceeds the configured request limits is a failed refresh, never a cached fallback. Record candidate timings with synthetic data in validation.md.

## Host: `reloadFreshRows()` in `crm/customers/PageBody.svelte`

Used for the customer host's required read in both refresh origins of the [phase table](client-compatibility.md#merge-phases-at-both-hosts):

1. `const seq = ++reqSeq; clearPageCache();` so in-flight `runQuery` and prefetch results are dropped and the client page cache is empty.
2. Build the page-1 URL with `apiUrlFor({ ...lastQuery, page: 1 })`, remove `includeTotal`, append `fresh=1`, and `fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } })` directly, not through `pageCache`.
3. Accept only when `seq === reqSeq`, the response is OK and not redirected, `body.fresh === true`, `body.contacts` is an array and `body.total` is a number. Then set `rows = body.contacts`, `total = body.total` and `knownTotalFingerprint` from step 2. The view restarts at page 1 with the current filters.
4. Anything else is a failed read.

The data-resync `$effect` (`PageBody.svelte:111-116`) also increments `reqSeq`, so a loader rerun during a fresh read supersedes it and the read fails. Account or org switches remount the host. `runMerge`'s success path calls `reloadFreshRows()` instead of `invalidate('crm:contacts')`. The customer host loads no duplicate groups.

## Later reads: bounded staleness

After the latch is released, normal navigation uses cached reads. When the merge's tag invalidation succeeded, those reads are current. When it failed, a cached page for another filter or offset can return pre-merge rows until its 2-minute TTL expires, plus one stale-while-revalidate response that triggers recomputation (`packages/cache/src/core.ts:50-51`). F8 accepts this. A stale row cannot cause a wrong merge: participant admission refuses deleted contacts with 404.

## Tests

- `contacts.test.ts`: `fresh=1` calls `rankContactsPage` with the same filters, owner and mask as the normal branch and never calls `rankContactsPageCached`; the body has `fresh: true`; the header is `private, no-store`; `fresh=1&fields=id` returns 400; a normal request has no `fresh` key and still uses the cached call.
- customers `page.merge.mounted.test.ts`: a stale mocked page cache and a merge whose POST is acknowledged or lost; the fresh read replaces rows only when accepted; an unmarked body, a failed read, a late `runQuery` response and a loader rerun during the read each leave the latch set; exactly one POST until a new explicit selection.

Full guarded QA with Browser Harness exercises the real route against a warmed cache. No test has run during authoring.
