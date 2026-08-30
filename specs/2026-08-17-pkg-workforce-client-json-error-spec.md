---
id: 2026-08-17-pkg-workforce-client-json-error-spec
title: "@minion-stack/workforce-client — non-JSON responses must raise WorkforceApiError, not a raw SyntaxError"
stage: spec
status: done
pass: 2
created: 2026-08-17
updated: 2026-08-20
proposal: 2026-08-17-pkg-workforce-client-json-error
verdict: approved
repos: [minion-meta]
tags: [logic, test, docs, infra]
type: fix
done_reason: "Verified complete on meta dev: parse-then-fallback + nonJsonBody cap + bodyKind with 5 assertions, README contract table, changeset present — subagent verification 2026-08-20."
---

# Non-JSON responses must raise `WorkforceApiError`

**Owner surface:** `minion-meta` — `packages/workforce-client/src/client.ts` (the `request()` transport
path and its exported error contract),
its transport test file, the package README, and a changeset. **Consumer surface (not edited here):**
`minion_hub`, which imports this package in `src/lib/server/workforce-fetch.ts` to proxy
company-scoped requests; the HTML-502 pages the proposal names are produced by the gateway proxy
`minion/src/gateway/workforce-proxy.ts` (`/api/workforce-backend/*` → `127.0.0.1:3200`). Both repos are
carried claims, not verified here — see §1 and ⚠️ A2.

**Design ancestors:** [`2026-07-11-universal-projects-module`](2026-07-11-universal-projects-module.md)
§WP5 (the client's release convention: types + changeset + hub package.json bump, workspace-link during
dev) and [`2026-07-10-bug-triage-workforce-agents`](2026-07-10-bug-triage-workforce-agents.md) line 40
(the only written description of the hub → gateway-proxy → workforce topology, and therefore of where
the HTML comes from). [`2026-07-12-living-workforce-harness`](2026-07-12-living-workforce-harness.md)
lists the same four repos as the workforce blast radius.

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices below are tagged `logic` / `test` / `docs` / `infra`. Red-state TDD is mandatory (the failing test is
written and shown failing before the fix). **No UI governance applies**: zero `.svelte` files, zero token
or design lint, in any slice.

---

## 0. Product

From the approved proposal `2026-08-17-pkg-workforce-client-json-error`, verbatim:

> ## Problem
>
> packages/workforce-client/src/client.ts:96-97 JSON.parse runs before the !res.ok check — HTML error
> pages throw SyntaxError instead of WorkforceApiError.
>
> ## Definition of done
>
> Parse wrapped; non-JSON yields WorkforceApiError(status,{raw}); mock-fetch test asserts typed error.
>
> ## Out of scope
>
> Retry logic.

**What the code actually says today** (read from this checkout, `packages/workforce-client/src/client.ts:87-99`):

```ts
const res = await opts.fetch(url.toString(), { method, headers: {...}, body: ... });
const text = await res.text();
const payload = text ? JSON.parse(text) : null;   // ← line 97: throws before the status is ever read
if (!res.ok) throw new WorkforceApiError(res.status, payload);
return payload as T;
```

The proposal's line reference is exact. Three things make the ordering worse than a stylistic nit:

1. **The status code is discarded on the failure path that needs it most.** A `SyntaxError: Unexpected
   token '<'` carries no status, no URL, no method. The one situation where the caller most needs to
   know "the workforce backend is down behind the proxy" is the one situation where the client tells
   it least. `WorkforceApiError` already holds `status` — the bug is purely that line 97 runs first.
2. **It is a whole-surface bug, reached by 25 domain modules.** Every call in `src/api/*.ts` funnels
   through this one `request()`. There is no second transport path and no `catch` anywhere else in the
   package (verified: `rg -n 'catch' src/*.ts src/api/*.ts` excluding tests → zero hits). One
   `try` fixes 25 modules; conversely, nothing downstream is currently compensating.
3. **HTML on a 2xx is the same bug wearing a disguise.** A proxy that answers an unauthenticated
   request with a `200` login page, or a captive-portal/CDN interstitial, also hits line 97. The
   current `!res.ok` gate would not have caught it even if it ran first. §2 S1 covers both.

**The failure this fix converts.** Today: an untyped `SyntaxError` from deep inside a transport, which a
consumer can only distinguish by string-matching a V8 message. After: a `WorkforceApiError` carrying
the real status, the raw text (bounded), and a `bodyKind` discriminant that says *why* it is not the
usual JSON error envelope. That last field is not decoration — ⚠️ A1 explains why shipping `{raw}`
without it would hand `minion_hub` a way to leak a backend HTML page to a browser.

## 1. Assumptions and what Slice 0 must settle

`packages/workforce-client/` **is** checked out here and every claim above was read from disk.
`minion_hub/`, `minion/`, and `paperclip-minion/` are **not** (`ls -d minion minion_hub minion_site
paperclip-minion` → four "No such file or directory"; the meta-repo `.gitignore` excludes subprojects).
So §2's slices rest on verified fact; §4's consumer rows rest on carried claims. Three are load-bearing:

1. **Hub is the consumer, via `src/lib/server/workforce-fetch.ts`.** Asserted by
   `2026-07-10-bug-triage-workforce-agents` line 40 and by this package's own `package.json`
   description. Not verified against hub's tree from here. ⚠️ A2.
2. **How hub surfaces `WorkforceApiError.body` to the browser is unknown from here** — and it is the
   single fact that decides whether ⚠️ A1 is a real leak or a non-event. S0 settles it.
3. **The gateway proxy is the HTML source.** `minion/src/gateway/workforce-proxy.ts` fronting
   `127.0.0.1:3200` is where a dead upstream becomes a proxy-generated HTML 502. Plausible and
   consistent with the proposal's parenthetical, but the exact error-page body is not verified here —
   which is *fine*, because the fix must not depend on the shape of any particular error page.

Two facts found in this checkout that change the work and would otherwise be discovered the hard way:

- **Only two test sites touch the real transport.** 21 of the 25 `src/api/*.test.ts` files mock the
  client wholesale (`function mockClient(response) { return { request: vi.fn().mockResolvedValue(...) } }`
  — see `src/api/issues.test.ts:4-6`) and never execute `request()`. Only `src/client.test.ts` and four
  api tests (`health`, `dashboard`, `activity`, `sidebar-badges`) construct a real `Response`. The
  in-package blast radius is therefore tiny, and S1 does not need to touch 25 files.
- **`src/client.test.ts:17` is the trap.** Its mock is
  `new Response(JSON.stringify({ error: 'nope' }), { status: 500 })` — **no `content-type` header**, so
  the WHATWG default is `text/plain;charset=UTF-8` even though the body is valid JSON. Any
  implementation that gates parsing on `content-type` silently reclassifies that response as non-JSON.
  The test would still pass (it asserts only `toMatchObject({ status: 500 })`), so this regression ships
  green. That single line is why §2 mandates try/parse-and-fall-back over content-type sniffing.

### Slice 0 — recon (≤ 30 min, prepend to S1, not counted as a slice)

```bash
cd /home/agent/work
# in-repo (should reproduce the facts above)
rg -n 'JSON.parse|res\.text\(\)|WorkforceApiError' packages/workforce-client/src
rg -n 'new Response' packages/workforce-client/src --glob '*.test.ts'   # → client.test.ts + 4 api tests
rg -n 'catch' packages/workforce-client/src/*.ts packages/workforce-client/src/api/*.ts   # → zero (non-test)

# consumers — run wherever hub / gateway ARE checked out (⚠️ A2)
rg -n 'WorkforceApiError|workforce-client' minion_hub/src            # how is .body surfaced?
rg -n 'error\.body|err\.body|JSON.stringify\(.*body' minion_hub/src/lib/server/workforce-fetch.ts
rg -n '"@minion-stack/workforce-client"' minion_hub/package.json     # pinned version / workspace link?
rg -n '502|error page|text/html' minion/src/gateway/workforce-proxy.ts
```

**The one answer that must be written into the PR description:** does hub forward
`WorkforceApiError.body` into an HTTP response body that reaches a browser? If yes, ⚠️ A1 is live and
S2's handoff proposal is mandatory rather than merely prudent. If hub cannot be inspected, say
"unverified" — an unchecked consumer is an unknown, not a zero.

## 2. Approach — two vertical slices

```
S0 (recon) ─▶ S1 (the fix + the typed-error contract, red-state first) ─▶ S2 (release contract + consumer handoff)
```

S1 alone satisfies the proposal's DoD sentence literally and is independently shippable in behavior.
S2 is what makes it *arrive* at the consumer safely: a changeset (without which `pnpm run ci` fails at
`changeset:status` anyway), the README contract consumers read, and the ⚠️ A1 handoff. **Do not merge
S1 without S2** — a published package whose error type changed with no release note is a worse defect
than the bug being fixed.

---

### S1 — Wrap the parse; make every HTTP response a typed error or a typed value

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** once `request()` receives an HTTP response and successfully reads its body, it has exactly
two outcomes — it returns parsed JSON, or it throws `WorkforceApiError`. A `SyntaxError` from parsing
never escapes, and `status` is always present on that error. Fetch and body-read failures still
propagate as-is. Existing JSON behavior, including empty-body `null`, is unchanged.

**Do:**

- **Restructure `request()`'s tail.** Intended shape (adjust names to taste, keep the semantics):

  ```ts
  export type WorkforceErrorBodyKind = 'json' | 'text' | 'empty';

  export class WorkforceApiError extends Error {
    constructor(
      public status: number,
      public body: unknown,
      /** How `body` was derived. 'text' ⇒ the response was not JSON; `body` is `{ raw, contentType, truncated }`. */
      public readonly bodyKind: WorkforceErrorBodyKind = 'json',
    ) {
      super(`paperclip ${status}`);
    }
  }

  // ...inside request():
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new WorkforceApiError(res.status, null, 'empty');
    return null as T;                       // 204 / empty 200 — unchanged behavior
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    // Not JSON: a proxy 502 HTML page, a CDN interstitial, a login redirect body.
    throw new WorkforceApiError(res.status, nonJsonBody(text, res.headers.get('content-type')), 'text');
  }
  if (!res.ok) throw new WorkforceApiError(res.status, payload, 'json');
  return payload as T;
  ```

- **Parse-then-fall-back, never `content-type` gating.** Attempt `JSON.parse` on any non-empty body and
  classify by whether it *parsed*, not by what the server claimed. Two independent reasons, both
  concrete: (a) `src/client.test.ts:17` proves this repo already relies on valid JSON arriving under the
  default `text/plain` (§1); (b) the misbehaving proxies this fix exists for are exactly the components
  least likely to label their bodies correctly. `content-type` is recorded as **diagnostic metadata
  inside the error body**, never as the decision.
- **A non-JSON 2xx throws too.** `request<T>(): Promise<T>` promises `T`; returning `{ raw: '<html…' }`
  as `T` would move the failure from an honest throw to a type lie that surfaces as
  `Cannot read properties of undefined` three frames away. The proposal's DoD ("non-JSON yields
  `WorkforceApiError(status,{raw})`") is not restricted to `!res.ok`, so this is in scope, not scope
  creep. The status carried is the real one (`200`), which is precisely the diagnostic the caller needs.
- **Bound the `raw` field.** Cap the final `raw` string at **2048 JavaScript string code units total**, including an
  appended `… [truncated N of M chars]` marker (use a small exported constant, not a magic number),
  and set `truncated: true`. Preserve the full text when it is at or below the cap and set
  `truncated: false`. A proxy error
  page can be tens of KiB; this object gets logged, serialized, and — per ⚠️ A1 — possibly forwarded.
  Body shape: `{ raw: string; contentType: string | null; truncated: boolean }`. That is a superset of
  the proposal's `{raw}`, so the DoD is met literally.
- **Add `bodyKind`, as an optional third constructor parameter defaulting to `'json'`.** Additive:
  every existing `new WorkforceApiError(status, body)` call keeps compiling and keeps its meaning. It
  exists because `{raw}` alone is ambiguous — a backend could legitimately return a JSON object with a
  `raw` key, and a consumer that needs to answer "is this a structured backend error or an opaque
  infrastructure page?" must not be reduced to duck-typing. ⚠️ A1 is the consumer that needs it.
- **Do not change `Error.message`.** It stays exactly `` `paperclip ${status}` ``. It is a published
  package on a public scope; log pipelines and any consumer-side matching may depend on the string.
  Diagnostics go in `body`, which is what `body` is for.
- **Let transport rejections keep propagating.** `opts.fetch()` rejecting (DNS, ECONNREFUSED, abort) and
  `res.text()` rejecting (truncated/aborted body) are *not* HTTP responses and must not be laundered
  into `WorkforceApiError`, which promises a meaningful `status`. The boundary this slice establishes,
  and which the README states in S2: **a successfully read HTTP response becomes a value or a
  `WorkforceApiError`; a failure to fetch or read one propagates as-is.** Do not add a `try` around
  `opts.fetch()`.
- **Do not copy request material into the error.** `raw` is the *response* text only. Do not add the
  request body, the `headers` option (it carries the identity JWT), or the URL/query string as error
  fields or metadata. An upstream may itself echo request data in its response; preventing that is a
  server-side concern and is not a property this client can guarantee while the proposal requires
  carrying `{ raw }`.
- **Red-state first (G3).** Write the non-JSON test, run it against the current implementation, and
  confirm it fails with `SyntaxError` — paste that output into the PR. The existing suite is not a valid
  red-state proof: all 25 files pass today by construction.

**Files:** `packages/workforce-client/src/client.ts` (the fix + the `bodyKind` field + the truncation
helper), `packages/workforce-client/src/client.test.ts` (new transport cases appended; the existing
three cases are regression anchors and must not be edited to accommodate the fix — if one needs
editing, that is a finding, not a chore). No `src/api/**` file changes: those 25 modules reach this
behavior for free, and 21 of them never execute it (§1).

**Definition of done (machine-checkable):**

```bash
cd packages/workforce-client && pnpm run test
#   red-state first (G3): the HTML-502 case is shown failing (SyntaxError) against the old code.
#   Cases below; each builds a real Response and asserts on the thrown value, per the proposal's
#   "mock-fetch test asserts typed error":
#   - 502 + '<html><body>Bad Gateway</body></html>' (content-type text/html)
#       → rejects with an instanceof WorkforceApiError   ← proposal DoD, the headline case
#       → .status === 502, .bodyKind === 'text', .body.raw contains '<html'
#       → NOT instanceof SyntaxError, and .message === 'paperclip 502'   (message unchanged)
#   - 200 + '<html>…login…</html>'  → THROWS WorkforceApiError with .status === 200, .bodyKind 'text'
#   - 500 + '{"error":"nope"}' (NO content-type header — mirrors client.test.ts:17)
#       → .status === 500 AND .bodyKind === 'json' AND .body.error === 'nope'
#         ← the anti-regression anchor against content-type gating; a sniffing impl fails here
#   - 200 + '{"ok":true}'  → resolves to { ok: true }                     (happy path unchanged)
#   - 204 + empty body     → resolves to null                            (Promise<void> endpoints)
#   - 500 + empty body     → WorkforceApiError, .status 500, .bodyKind 'empty', .body === null
#   - 502 + a 50_000-char HTML body → .body.raw.length <= 2048, ends with the truncation marker,
#       and .body.truncated === true
#   - 502 + a non-JSON body of exactly 2048 characters → body preserved, .body.truncated === false
#   - 502 + non-JSON → .body.contentType === 'text/html' (metadata recorded, not used to decide)
#   - opts.fetch rejecting with new TypeError('fetch failed')
#       → rejects with THAT TypeError, not a WorkforceApiError            (boundary held)
#   - with a response body unrelated to the request, the thrown error has no own fields containing
#       the request body, opts.headers identity JWT, URL, or query string
pnpm run typecheck && pnpm run build
cd ../.. && pnpm run typecheck-all && pnpm run lint-all
rg -n 'JSON.parse' packages/workforce-client/src/client.ts   # → exactly ONE hit, inside a try block
```

---

### S2 — Release contract, README, and the consumer handoff

**Tags:** `docs`, `infra` · **Estimate:** 4–5 h

**Goal:** the behavior change is announced in the terms a consumer needs, the package documents its
error contract for the first time, and ⚠️ A1 is on the record instead of in someone's head.

**Do:**

- **Changeset** — `.changeset/<name>.md`, `"@minion-stack/workforce-client": minor`. The package is
  `0.3.0`; a behavior change on a 0.x package is `minor` by this repo's convention (see
  `.changeset/universal-projects-client.md` and `.changeset/workforce-role-identity.md` for the house
  prose style — two to four lines, consumer-facing, no changelog boilerplate). The body must state:
  *non-JSON responses now reject with `WorkforceApiError` instead of `SyntaxError`*; *a non-JSON `2xx`
  now throws too*; *`bodyKind` distinguishes `'json' | 'text' | 'empty'`*; *`raw` is truncated*; and
  *`Error.message` and all JSON behavior are unchanged*. CI runs `changeset:status --since=origin/main`,
  so a missing changeset fails `pnpm run ci` regardless.
- **README error-contract section.** `packages/workforce-client/README.md` is 20 lines and says nothing
  about errors. Add a short section stating the boundary from S1 — delivered response ⇒ value or
  `WorkforceApiError`; transport failure ⇒ propagates — with the `bodyKind` table and a three-line
  consumer example that checks `bodyKind === 'text'` before deciding what to show a user. **While in the
  file, fix the two broken code samples**: it currently reads `createMinion WorkforceClient` (a stray
  space — see `README.md:7` and `:9`), which does not compile. That is a two-character docs fix in the
  file this slice already opens; leaving a known-broken sample behind while editing around it would
  itself be an open-items-ledger entry.
- **⚠️ A1 consumer handoff — the deliverable that is not a file in this package.** Per AGENTS.md's
  open-items ledger rule, file **one proposal** in `proposals/` for `minion_hub`: audit
  `src/lib/server/workforce-fetch.ts` (and any route that catches `WorkforceApiError`) and ensure
  `body.raw` is **not** forwarded verbatim to a browser when `bodyKind === 'text'` — log it server-side,
  return a generic 502 envelope. Include S0's finding (does hub forward `.body` today?), the row this
  spec's §4 already writes, and the exact field names shipped. Add the matching
  `TODO(handoff): <what, why, pointer>` comment in `client.ts` beside the `'text'` throw. If S0 proved
  hub does **not** forward the body, still file it — as a one-paragraph note recording the check, so the
  next reader does not repeat it — and say so plainly rather than inflating a non-finding.
- **Do not bump hub's dependency.** This spec publishes; it does not upgrade a consumer. Say so in the
  PR description so nobody helpfully runs `pnpm update` in `minion_hub` before the A1 audit lands.

**Files:** `.changeset/<generated-name>.md`, `packages/workforce-client/README.md`,
`proposals/2026-08-17-hub-workforce-error-body-leak.md` (new — name it to match whatever the proposal
index convention resolves to; do **not** edit `proposals/index.json`, the generator owns it),
`packages/workforce-client/src/client.ts` (the one `TODO(handoff):` line).

**Definition of done (machine-checkable):**

```bash
cd /home/agent/work
test -f .changeset/<name>.md                                  # → the named new changeset exists
rg -n '^"@minion-stack/workforce-client": minor$' .changeset/<name>.md  # → minor, not patch
rg -n 'createMinion WorkforceClient' packages/workforce-client/README.md   # → ZERO hits (samples fixed)
rg -n 'bodyKind' packages/workforce-client/README.md          # → the error contract is documented
rg -n 'TODO\(handoff\)' packages/workforce-client/src/client.ts            # → exactly one, at the 'text' throw
ls proposals/ | rg 'workforce-error|error-body'               # → the hub handoff proposal exists
pnpm run ci        # build-all + typecheck-all + lint-all + test-all + changeset:status
```

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `packages/workforce-client/src/client.ts` | S1, S2 | `JSON.parse` inside `try`; non-JSON ⇒ `WorkforceApiError(status, {raw, contentType, truncated}, 'text')`; empty-body ⇒ `'empty'`; `bodyKind` as an optional 3rd ctor param; 2048-char truncation; `message` unchanged; one `TODO(handoff):` |
| `packages/workforce-client/src/client.test.ts` | S1 | append the transport matrix; the three existing cases stay untouched as regression anchors |
| `packages/workforce-client/README.md` | S2 | first error-contract section; fix the `createMinion WorkforceClient` samples |
| `.changeset/<name>.md` | S2 | `minor` — the consumer-facing behavior change, in prose |
| `proposals/2026-08-17-hub-workforce-error-body-leak.md` | S2 | **new** — the ⚠️ A1 hub audit handoff |

**Zero `src/api/**` changes. Zero `.svelte` files. Zero schema, DDL, or migration files. Zero new
runtime dependencies** (`jose` remains the only one). No change to `package.json` `exports`, `files`,
or version — Changesets owns the version bump.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". This is a **shared-package** change to a
published, `access: public` npm package, so the radius is real even though the diff is small.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion_hub` (`src/lib/server/workforce-fetch.ts`) | **Real and intended.** A path that previously produced an untyped `SyntaxError` (almost certainly an unhandled 500) now produces a typed error hub may already have a `catch` branch for — so hub's *behavior changes without hub changing*, the moment it bumps the dependency. Strictly better handling, but a different code path. ⚠️ A1 | S2 files the hub audit proposal; `bodyKind` gives hub a one-field test; `raw` is truncated; this spec does **not** bump hub's dependency, so nothing changes until a hub PR opts in |
| `minion_hub` → browser | **⚠️ A1, the one genuinely new risk.** Before: HTML 502 → `SyntaxError` → generic 500, nothing leaked. After: the HTML page is inside `error.body.raw`, and if hub serializes `.body` into its own response, an internal proxy error page (hostnames, upstream paths, possibly stack traces) reaches the browser | Three layered mitigations, all in S1/S2: `bodyKind: 'text'` makes the case detectable; 2048-char truncation bounds it; S2's proposal makes the hub-side suppression an owned, filed item rather than an assumption. S0 answers whether hub forwards `.body` at all |
| `minion/` gateway (`src/gateway/workforce-proxy.ts`) | **None** — it is the *producer* of the HTML this fix consumes. No frame, route, or contract changes; the fix must work against any error-page shape and asserts nothing about this file | Do not "fix" the proxy to emit JSON errors in this spec — that is a separate proposal and would mask the client bug rather than fix it |
| `paperclip-minion` (workforce backend) | **None** — its JSON responses parse today and parse identically after. `bodyKind: 'json'` is the default and covers every existing error envelope | 500-with-JSON case in S1's matrix is the anchor |
| `@minion-stack/shared`, gateway WS protocol | **None** — this is the HTTP client; no frame type, event, or WS contract is touched | AGENTS.md impact table: this change is not in the "Gateway protocol" row |
| Other meta packages (`db`, `auth`, `cache`, `crm-sdk`, `ui`, …) | **None** — verified in this checkout: no package other than `workforce-client` imports it (`rg -ln 'workforce-client' --glob '!node_modules'` → only its own files, `pnpm-lock.yaml`, specs, and proposals) | re-run the grep at PR time |
| `minion_site`, `pixel-agents`, `minion_plugins`, `Minion Docs/` | **None** — no dependency | — |
| Public npm | The published package's thrown type changes for non-JSON responses | `minor` bump + changeset prose. The package has no known third-party consumers, but it *is* public — state it in the release note rather than assuming |

### ⚠️ A1 — the fix hands hub something it did not have before

Making the error typed is unambiguously right; making the error *carry the page body* is the part that
needs care. This spec ships the raw text because the proposal's DoD names it and because it is the
only thing that makes a 502 debuggable — but it ships it **bounded and labelled**, and it files the
consumer-side audit rather than assuming hub does the right thing. If S0 shows hub forwards
`WorkforceApiError.body` to the client, treat the hub proposal as a prerequisite for hub's dependency
bump, not as follow-up work. I am not certain what hub does today; that is exactly why it is written
here as a question with an owner instead of a reassurance.

### ⚠️ A2 — the consumer repos are not in this workspace

`minion_hub/` and `minion/` are not checked out here, so §4's first three rows are reasoned from
`2026-07-10-bug-triage-workforce-agents` line 40 and this package's `package.json` description, not from
their source. This does **not** block S1 or S2: every file either slice edits is in this repo. It does
mean S0's consumer greps may be unrunnable in the same session — in which case record "unverified,
consumer repos absent" in the PR and still file S2's proposal, which is where the unanswered question
belongs.

### ⚠️ A3 — a non-JSON 2xx now throws where it previously threw a different error

Both before and after, a 2xx HTML body fails the call — `SyntaxError` before, `WorkforceApiError` after.
No caller can have been *succeeding* on that path, so no working behavior is being taken away. Worth
stating plainly because "we made 200s throw" reads alarming out of context, and a reviewer deserves the
one-line reason it isn't.

## 5. Out of scope (explicit)

- **Retry logic** (the proposal's own exclusion). No backoff, no idempotency policy, no retry-on-502
  even though a 502 is the motivating case. Detecting the condition is this spec; reacting to it is a
  separate proposal, and it is *easier* to write once `bodyKind` exists.
- **Timeouts / `AbortSignal`.** `request()` has no timeout today; a hung proxy still hangs. Real, adjacent,
  and a different fix (`packages/cache/src/broadcaster.ts:45-49` has the house pattern if someone
  proposes it).
- **Changing `Error.message`, the `WorkforceApiError` class name, or the `status`/`body` field names.**
  Public and possibly matched on; `bodyKind` is additive precisely to avoid touching them.
- **Response validation** — no zod, no runtime shape-checking of parsed JSON against `src/types/*.ts`.
  Well-formed JSON of the wrong shape is a separate, larger problem (25 domain modules' worth) and
  bundling it would make this fix unreviewable.
- **Editing `minion_hub` or `minion/`.** S2 files a proposal; it does not open a consumer PR or bump a
  consumer dependency. ⚠️ A2.
- **"Fixing" the gateway proxy to emit JSON error bodies.** It would hide this bug rather than fix it,
  and clients must survive proxies they do not control.
- **The other 24 `src/api/*.ts` modules and their tests.** They inherit the fix; touching them is churn.
- **Any UI.** Zero `.svelte` files ⇒ the `ui` tag, the ui-design-governance skill, `lint:design`, and
  `lint:tokens` do **not** apply, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **Auditing the same parse-before-status pattern elsewhere in the fleet.** This bug class rarely
  appears once, and a sweep is probably worth filing — `packages/cache/src/broadcaster.ts` and
  `packages/shared/src/gateway/client.ts:246-252` both already handle it correctly, which is a good sign
  — but a sweep is not this fix. If S0 surfaces one, file it; do not absorb it.

## 6. End-to-end verification

Run with S1 + S2 merged in `minion-meta`.

```bash
cd /home/agent/work

# 1. Gates (logic/test/docs-tagged: no design or token lint — §5)
pnpm run ci                                   # build-all, typecheck-all, lint-all, test-all, changeset:status
git diff --name-only <base>...HEAD | grep -E '\.svelte$'        && echo "FAIL: UI out of scope"      && exit 1
git diff --name-only <base>...HEAD | grep -E 'src/api/'         && echo "FAIL: api modules untouched" && exit 1
git diff --name-only <base>...HEAD | grep -E 'minion_hub|minion/' && echo "FAIL: consumer repos out of scope" && exit 1

# 2. The proposal's DoD, literally, against the built artifact
cd packages/workforce-client && pnpm run build
node --input-type=module -e "
import { createWorkforceClient, WorkforceApiError } from './dist/index.js';
const html = '<html><head><title>502 Bad Gateway</title></head><body>nginx</body></html>';
const c = createWorkforceClient({
  baseUrl: 'http://x',
  fetch: async () => new Response(html, { status: 502, headers: { 'content-type': 'text/html' } }),
});
try {
  await c.dashboard.summary('company-1');
  console.log('FAIL: no error thrown');
} catch (e) {
  console.log('typed:',    e instanceof WorkforceApiError);   // → true    ← the proposal's DoD
  console.log('notSyntax:', !(e instanceof SyntaxError));     // → true    ← the reported bug, gone
  console.log('status:',   e.status);                          // → 502
  console.log('bodyKind:', e.bodyKind);                        // → text
  console.log('rawHasHtml:', String(e.body.raw).includes('<html')); // → true (the {raw} of the DoD)
  console.log('message:',  e.message);                         // → 'paperclip 502' (unchanged)
}
"

# 3. Nothing that worked before behaves differently (run through a real domain module, not request())
node --input-type=module -e "
import { createWorkforceClient } from './dist/index.js';
const c = createWorkforceClient({ baseUrl: 'http://x', fetch: async () =>
  new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } }) });
console.log('happy path:', JSON.stringify(await c.health.get()));   // → {\"status\":\"ok\"}
"
node --input-type=module -e "
import { createWorkforceClient } from './dist/index.js';
const c = createWorkforceClient({ baseUrl: 'http://x', fetch: async () => new Response(null, { status: 204 }) });
console.log('204 → null:', (await c.routines.deleteTrigger('t1')) === null);   // → true
"

# 4. Realistic integration (optional, where the repos exist — ⚠️ A2)
#    Point a hub dev server at a baseUrl with nothing listening behind the gateway proxy, load a
#    /workforce page, and confirm the hub server log shows a WorkforceApiError with status + bodyKind
#    rather than a SyntaxError stack — and that the browser response does NOT contain the proxy's
#    HTML. The second half is ⚠️ A1's acceptance check; a failure there is the hub proposal's evidence,
#    not a reason to hold this PR.
```

**Ship gate:** §6 steps 1–3 green; the proposal's DoD checked clause by clause (parse wrapped — S1's
`rg 'JSON.parse'` shows one hit inside a `try`; non-JSON yields `WorkforceApiError(status,{raw})` —
step 2; mock-fetch test asserts the typed error — S1's matrix); the S1 red-state `SyntaxError` failure
pasted into the PR, proving the old code failed the way the proposal reported; S0's answer to "does hub
forward `.body`?" recorded (including "unverified — repo absent" if that is the truth); and the hub
handoff proposal linked from the PR description.
