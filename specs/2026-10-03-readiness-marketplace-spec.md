---
id: 2026-10-03-readiness-marketplace-spec
title: Marketplace authority, bounded synchronization, and honest catalog reads
stage: spec
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [security, data, logic, test, ui]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Marketplace readiness

## 0. Product

Marketplace administration, browsing and documentation must be authorized, bounded and honest about partial data. This batch covers HS-001, HS-030 and HS-031.

## Out of scope

Marketplace install registration/delivery (HC-034), broader capability coverage (HS-002), package publication, production migration and deployment are separate slices.

## AS-IS

HS-001: `api/marketplace/sync/+server.ts` accepts anonymous POST and changes the
single global catalog. The marketplace layout starts the same global sync on
page reads, without awaiting it. The hooks deliberately delegate authentication
for this API prefix to handlers. Adding authentication to POST alone is incomplete.
`marketplace.service.ts` starts one GitHub request per directory without a
concurrency or time bound. GitHub responses are cast rather than validated;
per-row persistence failures disappear from the returned error list.

Parent blast review found three adjacent behavior defects:

- HS-030: category and search call Drizzle `.where()` independently, replacing
  the category condition. The server returns the 50 least installed records;
  client popular/newest/name sorting and featured/model filtering then operate
  on that arbitrary truncated subset. Pagination inputs admit NaN/negative values.
- HS-031: lazy file hydration treats any provider failure as a missing file,
  erases existing content and sets `filesLoadedAt`. A temporary outage becomes
  permanent empty documentation. Changed catalog version/path does not invalidate
  that marker. Client detail fetch collapses every failure to a missing agent.
- HC-034 (separate implementation slice): installation registers/counts before
  gateway delivery and retries can repeat those effects. Delivery uses the active
  gateway connection, although the install request names a specific server.
  HS-002 covers install/generate capability and ownership review. This spec does
  not silently declare installation safe after fixing catalog reads.

## TO-BE

1. Global synchronization is an explicit platform-admin action or secret-authenticated
   scheduler call. Catalog page reads never initiate metadata synchronization.
2. A singleton persisted cursor and short database transactions serialize work
   across processes and make each bounded page resumable. External HTTP calls run
   outside transactions. Expired owners cannot publish catalog rows or progress.
3. Public catalog reads remain public. All advertised filters and sort orders
   apply to the complete SQL population before stable pagination. The UI can
   reach every matching page and never labels a local subset as the whole catalog.
4. File hydration distinguishes confirmed absence from temporary failure, retains
   old good content on failure, and retries after a bounded cooldown. Details
   expose retryable failure instead of a false not-found result.
5. All error bodies and stored summaries are bounded and exclude tokens/provider
   bodies. Metadata, files and install responsibilities are separate modules;
   the existing service import remains a compatibility facade.

## DELTA

### A. Catalog authority and resumable synchronization (HS-001)

- Guard POST `/api/marketplace/sync` with real `requireAdmin` before DB/provider
  access. Preserve 401/403 rather than wrapping them in 500. Platform admin is
  appropriate because the dataset belongs to all organizations.
- Delete the layout's fire-and-forget synchronization. Keep a read-only load if
  it supplies catalog state; no background write is hidden in GET/page loads.
- Add GET `/api/marketplace/sync/tick`, exact `CRON_SECRET` bearer authentication,
  no user-session alternative, and an every-minute declared Vercel cron. It
  advances only due work. No provider call when the row is busy or not due.
- New Hub-owned `marketplace_sync_state` singleton table, service-role only;
  revoke all anon/authenticated/app_ledger access and enable RLS. Fields: id,
  lease token/expiry (both null or both present), bounded directory snapshot,
  next index, cumulative successful/failed counts, bounded error samples,
  cycle started/completed timestamps and next eligible time. Index/counters
  nonnegative; cursor cannot exceed directory count; final state clears snapshot.
- Claim atomically with a generated token and DB `clock_timestamp()`, only if
  lease absent/expired and due. Lease is 120 seconds. Each request processes at
  most 25 metadata files, four concurrent requests, a 40-second total HTTP budget
  and ten-second per-request timeout. Root listing and page calls share the same
  total deadline. HTTP cancellation is not relied upon for SQL ownership.
- Root directory listing is validated and capped at 1000 directories/2 MiB decoded
  response; paths must be single safe directory names. A new cycle snapshots the
  sorted directory names. No cursor or success time is advanced until its page
  transaction commits. A stale owner checks token AND unexpired DB time while
  locking the singleton row, before metadata upserts and progress mutation in the
  same transaction. SQL lock/statement bounds are 4/5 seconds.
- Each metadata result is validated; malformed or provider-failed entries count
  as failures with a safe class and bounded directory name. Per-entry errors do
  not discard successful siblings. Pages advance over these failures; a finished
  cycle with failures is explicitly partial and retries from a new snapshot after
  five minutes. Fully successful cycles become due after an hour. Root-listing
  failure retains/clears state consistently and retries after five minutes.
- A process crash leaves the old cursor until lease expiry; replaying a page is
  idempotent metadata upsert. Mid-cycle directory removal is a recorded 404, not
  an infinite retry. Sync does not delete catalog entries missing upstream.
- Admin POST can start a fresh completed cycle after a one-minute persisted
  cooldown, or advance existing due continuation. It cannot steal a live lease.
  Busy returns 409 + retry-after; not-yet-due scheduler is 200 with explicit no-op.
  Responses preserve `synced`/`errors` and add cycle status, counts and continuation.
- Error samples max 20, each <=240 characters. Never persist raw fetch/body errors.
  Domain failures log safe class and cycle correlation; no provider payload.
- File cache invalidation occurs on version or GitHub path change. Previously
  hydrated content remains available as stale until a successful replacement.

### B. Complete catalog queries (HS-030)

- Shared validated query contract: category/search/model/featured/sort/limit/offset.
  Limit 1..100, offset nonnegative bounded integer, search/category/model bounded
  strings, sort enum popular/newest/name. Invalid parameters return 400.
- Build one combined predicate; literal search uses escaped wildcard characters.
  Popular is install count DESC NULLS LAST with stable id tie-break; newest is
  createdAt DESC then id; name is lower(name) ASC then id. Count and page use the
  same predicate. Cache key contains every normalized input.
- Add a page-returning client function; preserve existing array-returning helper
  for other consumers if any. Include all server filters in reactive query keys.
  Reset page on filter/sort change; use shared pagination controls and explicit
  loading/error/empty states. No whole-population claims from a truncated array.

### C. Honest document hydration (HS-031)

- Extract GitHub transport with bounded streaming body, schema checks, scoped
  paths, ten-second timeout and safe typed 404/transient/invalid errors.
- Five files remain optional: confirmed 404 means absent, while 403/429/5xx,
  timeout, malformed response or decode error means retryable failure.
- Hydration commits all five fields plus filesLoadedAt only after every result
  is either valid content or confirmed 404. Transient failure preserves every
  existing field and leaves the loaded marker unset. Empty file content is valid.
- Compare captured catalog version/path/updatedAt in the final update so stale
  hydration cannot overwrite a newer sync. Deduplicate same-agent work in process;
  persist a short failure cooldown so repeated reads do not hammer an outage.
  A fresh successful metadata sync may reset the cooldown after changed version.
- Public GET retains its intentional read-through document-cache contract;
  writes are only cache fields from the fixed GitHub repository, never catalog
  metadata or caller-provided HTML. No tokens enter JSON responses. This cache
  path is separate from admin-only global metadata synchronization.
- Return a typed retryable 503 on first-load failure; when old good content is
  available, return it with an explicit stale-document warning and retry action.
  Client `loadAgent` returns null only on 404; other errors enter existing query
  error/retry UI. Detail and hiring consumers are traced before changing signature.

## Verification and blast radius

- Real handlers: anonymous/nonadmin rejection before DB/provider; admin positive;
  secret absent/wrong/valid scheduler; ordinary session cannot authorize cron;
  layout/load no metadata sync. Keep public catalog list/detail contract positive.
- Native PostgreSQL singleton races: simultaneous claim one owner; expired owner
  cannot upsert/progress; crash/replay; invalid lease pair/checks; lock timeout;
  app roles cannot mutate state; cursor page/final partial/full state transitions.
- Real SQL catalog test with >100 agents: combined category+search, every sort,
  featured/model filters, stable pagination/count, literal wildcard input and
  malformed HTTP parameters. A mocked query builder is insufficient.
- Transport: concurrency max four; deadline; bounded body/invalid payload/404;
  per-file absence versus error; all-failed leaves old fields/marker unchanged;
  successful retry populates; stale captured version cannot publish.
- Mounted client tests prove server query key/pagination/reset/error behavior and
  detail error is not converted into not found. Design and token debt cannot rise.
- Install/generation authorization and gateway-delivery effects remain explicit
  ledger items; no change here can count a failed install as successful.
- Full typecheck, focused suites, exact native manifest, independent review before
  accepting this batch. Migrations/cron runtime and deployment are separate gates.

## Pass-2 corrections (normative)

The following requirements settle the first independent review's blockers and
supersede less specific language above.

1. Scheduler authentication compares equal-length byte buffers with
   `timingSafeEqual`; missing/malformed credentials fail 401 before context work.
   User 401/403 errors stay outside generic synchronization error catches.
2. Page publication locks the state row and checks ownership, then isolates each
   metadata upsert in a savepoint. Permanent row/data constraints count as a safe
   per-entry failure; infrastructure, connection, lock or statement errors abort
   the entire page. Finally a guarded progress UPDATE checks the same token and
   `lease_until > clock_timestamp()` again. Zero updated rows throws and rolls
   back all page upserts. Native tests expire ownership between the first check
   and final update and prove no catalog/progress change commits; another test
   injects a permanent row constraint failure and proves siblings commit while
   the cursor advances with a partial count.
3. A root-list failure releases the current token/expiry, leaves no new snapshot,
   cursor or cycle-success counters, records `failed` plus a bounded error sample,
   and sets next eligibility to database now + five minutes. Previous completed
   cycle timestamps and totals remain available in separate last-cycle fields;
   a failed attempt never fabricates a new successful completion. Releasing a
   stale token changes nothing. A DB failure itself leaves the lease for expiry.
4. Add `marketplace_file_load_state`, keyed by catalog agent id with cascading FK,
   service-role-only privileges/RLS. It owns token/expiry, next eligible time and
   safe failure code. Conditional claim uses DB time and a 60-second lease; the
   total hydration HTTP deadline is 30 seconds. Four concurrent file requests at
   most. A second process cannot duplicate an active claim. Busy with old verified
   content returns stale content; busy on first load returns 503 with Retry-After
   bounded to 1..60 seconds. Provider failures set a 60-second cooldown while
   preserving every previous document and leaving the loaded marker unset.
5. Fixed transport limits: root listing body 2 MiB; fewer than 1000 top-level
   entries (a full 1000-item Contents response is ambiguous truncation and fails
   explicitly); directory name 1..128 ASCII `[A-Za-z0-9._-]`, excluding `.`/`..`.
   Metadata response 64 KiB, decoded agent.json 32 KiB; id max128, name/role256,
   category64, description4096, catchphrase1024, version/model128, avatarSeed128,
   tags at most50 strings of64. A file response is at most384 KiB, decoded content
   at most256 KiB, and all five documents total at most1 MiB. Enforce streaming
   byte limits before decoding, strict base64 structure and UTF-8, `type=file`,
   `encoding=base64`, and exact expected path. Empty content is valid. Redirects
   are rejected; no provider-returned URL is followed. Only fixed API-origin
   requests constructed from validated path segments carry the GitHub credential.
6. File publication locks the current catalog and hydration state in a consistent
   order. It compares captured id/version/path/updatedAt and token, writes all
   fields, and performs a final token/unexpired DB-clock CAS before commit. A stale
   version or zero-row final guard rolls back every field/marker change. Stale
   workers cannot set another owner's cooldown. Metadata invalidation follows
   the same catalog-then-hydration lock order to avoid an inverse-order deadlock.
7. Detail JSON adds `documentState: ready|stale`, a safe optional
   `documentErrorCode`, and `retryAfterSeconds` bounded 1..60. First-load errors
   use 503 JSON with a fixed safe error code and matching Retry-After. A genuine
   missing catalog record remains404. Details show stale warning/retry or explicit
   initial error/retry. Installation requires ready documents and cannot register
   an agent with an outdated or incomplete document bundle; generation/install
   authority and delivery receipt changes remain separate tracked work.
8. Query limits: category64, search256, model128 Unicode characters; sort only
   popular/newest/name; limit1..100; offset0..1,000,000; featured only true/false.
   Normalize empty optional strings to absent, reject duplicate query keys, reject
   non-decimal integer representations, and preserve literal `%`, `_` and backslash
   search. Count is read as bigint and converted only within Number's safe integer
   range; overflow returns a bounded503, never a rounded count. Count and page
   share one read snapshot so a concurrent catalog update cannot contradict the
   same response's pagination. Public cache keys include every normalized field.

GitHub documents the Contents directory cap and recommends Trees for larger
repositories. This batch fails explicitly at the boundary rather than claiming a
truncated snapshot is complete. [GitHub repository contents API](https://docs.github.com/en/rest/repos/contents).

### Second reviewer clarifications

- Featured means `coalesce(install_count,0) >= 100`. Model is a case-insensitive
  literal substring; search is the OR of literal case-insensitive substrings in
  name, role, description and serialized tags. The combined predicate intersects
  these with category. Server behavior is the oracle for the UI.
- Installation checks catalog existence and ready documents before **any** domain
  write, including its current server-row upsert. A first-load document503 leaves
  no server, agent registration or install-count effect. This ordering does not
  replace HC-034's separately required target-bound delivery/idempotency work.
- Persistent catalog caching admits only the six normalized unfiltered first-page
  keys: no category/search/model, offset0, limit50, three sort values × featured
  true/false. Every other query bypasses the persistent cache and uses the same
  bounded SQL read path. User-controlled search/page inputs cannot create an
  unbounded set of persistent keys. Native/unit checks count cache admission.

### Implementation review corrections

- Every historical `files_loaded_at` marker is invalidated by the migration while
  document text is preserved. The old loader could mark partial/outage content
  successful; trusting those markers would leave HS-031 unfixed until a version
  change. New reads revalidate before installation, with a stale warning when
  historical content exists.
- A catalog page records `last_published_token` in its final fenced transaction.
  After an ambiguous database response, that exact token permits canonical
  readback without replaying the page. Document publication likewise returns a
  canonical ready bundle after a lost response. An unconfirmed commit still
  surfaces a failure and retains its lease/cursor for safe recovery.
- Mounted review found unlabeled catalog controls and duplicate h1 titles in the
  detail view. Add semantic labels and retain one page h1 with an h2 record card.

### Rolling-deployment provenance correction

A legacy application instance can write `files_loaded_at` after the additive migration has
cleared old markers. The marker alone therefore never authorizes a ready bundle. Readiness
requires the leased publisher's SHA-256 over agent id, version, GitHub path and all five exact
nullable document values. Publication writes that digest and its verification timestamp in
the same fenced transaction as the contents. Native constraints reject either half of the
verification pair and malformed hashes. Every readiness fast path and lost-response readback
uses the same digest check. Legacy text remains cached stale content, with no fabricated
verification timestamp. A new regression also simulates an old writer replacing content after
a valid new publication; that content cannot remain ready.

Installation consumption and version pinning are tracked by HC-034. A ready read followed by
old cross-database registration does not yet prove the bundle remained current at install
admission. HS-031 is not fully closed until the immutable install intent and gateway receipt
replace that path. The existing registered browser install also uses the active gateway, not
the selected target, and can register/count before delivery; the linked fix must address all
three failure modes together.
