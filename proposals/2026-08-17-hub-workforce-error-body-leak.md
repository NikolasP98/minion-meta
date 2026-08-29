---
id: 2026-08-17-hub-workforce-error-body-leak
title: Audit hub's WorkforceApiError handling — do not forward an upstream error page to the browser
status: draft
created: 2026-08-17
updated: 2026-08-20
repos: [minion_hub]
tags: [security, logic]
value: 3
effort: S
source: 2026-08-17-pkg-workforce-client-json-error-spec
source_trust: trusted-automation
risk_class: high
priority: medium
owner: factory
---

# Audit hub's `WorkforceApiError` handling — do not forward an upstream error page to the browser

Filed as the ⚠️ A1 consumer handoff of
[`2026-08-17-pkg-workforce-client-json-error-spec`](../specs/2026-08-17-pkg-workforce-client-json-error-spec.md)
§S2. That spec ships `@minion-stack/workforce-client` `0.3.0 → minor`; it does **not** bump hub's
dependency. This proposal is the work that should land before hub opts in.

## AS-IS

`@minion-stack/workforce-client`'s `request()` used to run `JSON.parse` before checking `res.ok`, so a
non-JSON response (a gateway-proxy 502 HTML page from `minion/src/gateway/workforce-proxy.ts` fronting
`127.0.0.1:3200`, a CDN interstitial, a login redirect body) threw an untyped `SyntaxError` carrying no
status. Whatever hub does with that today, the HTML page itself was never inside the thrown error, so
nothing could leak it.

**Evidence, and its limit.** The client-side facts were read from `packages/workforce-client/src/client.ts`
in minion-meta. The hub-side facts were **not verified**: `minion_hub/` is not checked out in the
minion-meta workspace (the meta-repo `.gitignore` excludes subprojects), so the S0 recon greps against
`minion_hub/src/lib/server/workforce-fetch.ts` could not be run. That hub is the consumer via that file
is a carried claim from [`2026-07-10-bug-triage-workforce-agents`](../specs/2026-07-10-bug-triage-workforce-agents.md)
line 40 and this package's own `package.json` description.

**The question this proposal exists to answer is therefore open, not answered:** does hub forward
`WorkforceApiError.body` into an HTTP response body that reaches a browser? Unverified — consumer repo
absent. An unchecked consumer is an unknown, not a zero.

## TO-BE

After hub bumps to the new client version, a non-JSON upstream response produces a
`WorkforceApiError` whose `bodyKind === 'text'` and whose `body` is
`{ raw: string; contentType: string | null; truncated: boolean }` — `raw` being the upstream error page,
capped at `WORKFORCE_ERROR_RAW_LIMIT` (2048 code units). Desired observable behavior:

- The upstream page is **logged server-side** with its status and `contentType`.
- The browser receives a **generic** 502-shaped envelope — no `raw`, no upstream hostnames or paths.
- Invariant that must not change: structured backend errors (`bodyKind === 'json'`) keep surfacing to
  the UI exactly as they do today. This is not a proposal to blanket-suppress workforce errors.

## DELTA

1. Grep hub for `WorkforceApiError` and `workforce-client`; enumerate every `catch` that reads `.body`,
   starting at `src/lib/server/workforce-fetch.ts` and any route handler that re-serializes it.
2. Record the AS-IS answer in the PR: does any of those paths put `.body` into a response the browser
   sees? If not, say so plainly — a recorded non-finding so the next reader does not repeat this check.
3. Where it does, branch on `bodyKind === 'text'`: log server-side, return a generic envelope. One
   field test, no duck-typing on `raw` (a backend may legitimately return JSON with a `raw` key — that
   is why `bodyKind` exists).
4. Test: a mocked fetch returning `502` + `<html>…</html>` through hub's proxy path ⇒ the hub response
   body contains none of the upstream HTML, and the server log contains the status and `bodyKind`.
5. Only then bump `@minion-stack/workforce-client` in `minion_hub/package.json`.

## Definition of done

Hub's handling of `bodyKind === 'text'` is audited and documented; no route returns `body.raw` to a
browser; a test asserts the upstream HTML is absent from the hub response; the dependency bump lands in
the same PR as the suppression, not before it.

## Out of scope

- Editing `@minion-stack/workforce-client` — it already ships `bodyKind` and truncation.
- "Fixing" `minion/src/gateway/workforce-proxy.ts` to emit JSON error bodies. It would mask rather than
  fix, and clients must survive proxies they do not control.
- Retry logic, timeouts, and response-shape validation — all explicitly out of scope in the parent spec.
