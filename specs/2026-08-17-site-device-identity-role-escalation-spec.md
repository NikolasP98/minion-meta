---
id: 2026-08-17-site-device-identity-role-escalation-spec
title: "device-identity/sign — sign the caller's real grant, never the body's role/scopes"
stage: spec
status: review
pass: 2
created: 2026-08-17
updated: 2026-08-31
proposal: 2026-08-17-site-device-identity-role-escalation
verdict: changes_requested
review_reason: "Invalid approval corrected after guarded Factory admission refused approved/changes_requested. Preserve the security work in review until the canonical tenant-bound role source, MAX_GRANT mapping, and authoritative scope vocabulary are decided."
repos: [minion_site]
tags: [security, logic, test]
type: fix
---

# `device-identity/sign` — sign the caller's real grant

**Owner surface:** `minion_site` (`NikolasP98/minion-site`, base branch `master`) —
`src/routes/api/device-identity/sign/+server.ts`,
`src/server/services/device-identity.service.ts`,
`src/lib/services/member-gateway.svelte.ts`, plus new `*.test.ts` siblings
**Design ancestors:** [`ws-duplication-audit`](ws-duplication-audit.md) §Consumer 2 (the site's
`connect.challenge` → `/api/device-identity/sign` → `connect` handshake),
[`2026-05-26-auth-token-simplification`](2026-05-26-auth-token-simplification.md) R8
(`buildConnectParams` — the shared shape the signed values must match),
[`2026-08-13-ci-minion-site-ci-spec`](2026-08-13-ci-minion-site-ci-spec.md) §1 (site tooling
reality: `bun run check`, vitest present, `bun run test` **not yet wired into CI**),
[`2026-05-25-auth-supabase-phase1-oauth-users-plan`](2026-05-25-auth-supabase-phase1-oauth-users-plan.md)
(where the site's identity — `profiles.role` — actually comes from)
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — per-slice tags below are the routing unit. `security`-tagged slices are **fail-closed and
may never auto-pass on score**: a human gate is mandatory for S1 and S3 regardless of rubric.
`logic` slices get mandatory red-state TDD. No slice touches a `.svelte` file, so **no UI
governance gates apply** (see §5).

---

## 0. Product

From the approved proposal `2026-08-17-site-device-identity-role-escalation`, verbatim:

> # Device-identity sign endpoint lets any member self-assign role/scopes
>
> ## Problem
>
> src/routes/api/device-identity/sign/+server.ts:24-27 — client-supplied role/scopes signed
> verbatim (Ed25519) with only a session check; any member can mint role:'admin' device
> credentials.
>
> ## Definition of done
>
> Caller's real role resolved server-side; requested role/scopes clamped or rejected when
> exceeding it; test: non-admin POSTing role admin is refused.
>
> ## Out of scope
>
> New permission models.

**Why this is a real privilege escalation and not a lint nit.** The Ed25519 signature over the
device payload *is* the authorization ticket. The canonical payload string is (verified in this
checkout, `langgraph-server/src/gateway/device-identity.ts:120-143`, whose header states it must
stay byte-for-byte compatible with `minion/src/gateway/auth/device-auth.ts`):

```
version | deviceId | clientId | clientMode | role | scopes(comma-joined) | signedAtMs | token [| nonce]
```

`role` and `scopes` are **inside the signed bytes**. The gateway rebuilds that string from the
`connect` params it receives and verifies it against the tenant's registered public key; a valid
signature is what makes the claimed role believable. The private key is per-tenant and lives
server-side (`packages/db/src/pg/schema/device-identities.ts` — `tenant_id` is `unique`), so the
site's sign endpoint is the **only** thing standing between a logged-in member and an
admin-signed credential for their whole organization. Today that thing is a session check, which
proves *who* the caller is and then ignores it.

The fix is one sentence long and three slices wide: **authorization-sensitive signed values
(`role`, `scopes`, and tenant/key selection) must come from server-side caller context, never from
the request body; `signedAtMs` must come from the server clock.** Handshake inputs such as
`clientId`, `clientMode`, `token`, and `nonce` may remain request/challenge-derived and signed.

The three slices exist because of a coupling that is easy to miss and that would break the
members dashboard if missed — §2 opens with it.

## 1. Assumptions — Slice 0 is mandatory

**This spec was written from the meta-repo, where `minion_site/` is not checked out** (the
meta-repo `.gitignore` excludes every subproject; verified — no `src/routes/api/device-identity/`
on disk here, only the meta-repo's own `langgraph-server` port of the crypto). Every site path,
line number and symbol below is carried from the proposal (written today, so strong), from
`.planning/phases/05-db-extraction/05-02-SUMMARY.md` (names the two site files), and from
`specs/ws-duplication-audit.md` (names the client). Treat them as leads, not fact. Slice 0 turns
them into fact; if something moved, correct §3 through a separate scoped meta-repo change linked
from the site PR rather than implementing against a different file in silence.

Five carried claims are load-bearing:

1. **The endpoint reads `role`/`scopes` from the POST body and passes them straight to the
   signer** (the proposal, `+server.ts:24-27`). If a clamp has landed since, this spec collapses
   to S3's regression tests — say so in the PR and cut scope; do not implement a second clamp.
2. **The caller's real role is available server-side.** Three candidate sources exist in
   `@minion-stack/db`: `profiles.role` (`['user','admin']`, the Supabase-canonical identity) and
   Better Auth's `user.role` (`['user','admin']`), plus a per-org `member.role` from the Better
   Auth organization plugin (`packages/db/src/pg/schema/auth.ts:96-120`). **Which one the site's
   `locals` already carries is a Slice 0 question**, but choosing global identity versus
   per-organization membership changes the authorization model. Before implementation, a human
   security owner must name the canonical source and tenant semantics here. Reuse an existing
   `locals` value only if it is that approved source; do not add a parallel identity path.
3. **The site's browser client sends a hardcoded role/scopes pair today.** Its value is unknown
   from here; the sibling backend client in this checkout uses `role: 'operator'`,
   `scopes: ['operator.admin']` (`langgraph-server/src/gateway/client.ts:38-39`). Slice 0 **must**
   record what the site actually asks for — see ⚠️ A3, the one way this spec can break production.
4. **`device_identities` is keyed by tenant, one row per tenant** (verified here). So the endpoint
   necessarily resolves a tenant to pick a key. Whether that tenant comes from the session or from
   the request body is a Slice 0 question and is the *same class of bug* as the role (S3).
5. **Site test tooling:** vitest is a devDependency, `vitest.config.ts` scopes to
   `src/**/*.test.ts`, and `src/lib/server/identity-sync.test.ts` exists — but per
   `2026-08-13-ci-minion-site-ci-spec` §4, **CI did not run the tests** as of 2026-08-13 and a
   `test` package script may not exist. DoD lines below therefore call `bun x vitest run <file>`
   directly. If that spec has since landed, `bun run test` works too — use it.

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd minion_site                       # if absent: git clone git@github.com:NikolasP98/minion-site.git
git branch -r                        # confirm the live base is master (per 2026-08-13-ci-minion-site-ci-spec)

# the endpoint itself — the whole point
cat src/routes/api/device-identity/sign/+server.ts
cat src/server/services/device-identity.service.ts
#   record: where role/scopes come from; where signedAtMs comes from; where the tenant comes from;
#           whether privateKeyPem can reach the response body

# identity: what the server already knows about the caller (assumption 2)
rg -n 'locals\.' src/hooks.server.ts src/routes/+layout.server.ts | head -40
rg -n 'profiles|\brole\b' src/lib/server src/server --type ts | head -40
rg -n 'activeOrganizationId|organizationId|tenantId|member' src/lib/server src/server --type ts | head -30
rg -n 'declare namespace App' -A20 src/app.d.ts        # the typed shape of locals

# the client that must keep working (assumption 3 / ⚠️ A3)
rg -n 'device-identity/sign' src -n
rg -n -B5 -A25 'device-identity/sign' src/lib/services/member-gateway.svelte.ts
rg -n "role|scopes|buildConnectParams|clientMode|signedAtMs|nonce" src/lib/services/member-gateway.svelte.ts

# tooling (assumption 5)
rg -n '"(check|test|lint|format)"' package.json
test -f vitest.config.ts && rg -n 'include' vitest.config.ts
```

Record the actuals in the PR description — in particular **the exact role/scopes string the
members dashboard requests today**. Nothing in Slice 0 changes files. **Implementation is blocked
until the canonical role source, tenant semantics, exact `MAX_GRANT` mapping, and authoritative
scope vocabulary are written into this spec.** Recon supplies evidence; it must not invent policy.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (server resolves + signs the grant) ─▶ S2 (client uses the returned grant) ─▶ S3 (deny-by-default guards)
```

**Read this before sizing anything.** The gateway verifies the signature by rebuilding the payload
string from the `connect` params the *browser* sends. So if the server silently downgrades
`admin` → `user` and signs that, while the browser still puts its own hardcoded `role` in
`connect`, the two payload strings differ by one field and **signature verification fails** — the
member sees an opaque connect failure instead of a working dashboard. That is why:

- the endpoint **refuses** an over-ask (403) instead of silently clamping — a refusal is loud,
  testable, and cannot desync;
- the endpoint **always returns the effective role/scopes it signed**, and S2 makes the client use
  the returned values verbatim. After S2 the client stops asserting a role at all, which is what
  actually kills this bug class rather than papering over it.

S1 alone closes the escalation only after the human-approved grant mapping is recorded, and is
safe to ship on its own **provided ⚠️ A3's compatibility check passes**. If the approved default
grant does not cover the current client ask, S1 and S2 must ship together with a compatible
server-selected grant or every member loses the dashboard. S1 satisfies the proposal's DoD
literally. S2 and S3 are hardening: S2 removes the client's ability to ask, S3 makes a future
regression fail a test instead of shipping.

If the wave must cut scope, cut after S1 or after S2 — and then the AGENTS.md **open-items ledger**
rule applies: a `TODO(handoff):` at the exact site plus an append to the source proposal naming
what is still unguarded.

---

### S1 — Resolve the caller's grant server-side; sign only that

**Tags:** `security`, `logic`, `test` · **Estimate:** 5–7 h

**Goal:** no authorization-sensitive signed value (`role`, `scopes`, or tenant/key choice)
originates in the request body, and `signedAtMs` originates from the server clock. A non-admin
asking for `admin` gets a 403 and no signature.

**Do:**

- Add a small pure policy module, `src/server/services/device-grant.ts`:
  ```ts
  export type AppRole = 'user' | 'admin';              // ← import/derive from the canonical source where possible
  export interface DeviceGrant { role: string; scopes: string[] }

  /** Maximum device credential each app role may ever be issued. Deny-by-default:
   *  an app role with no entry here gets NO grant, not a permissive one. */
  export const MAX_GRANT: Record<AppRole, DeviceGrant> = { /* filled from Slice 0 — see ⚠️ A3 */ };

  export function resolveGrant(
    callerRole: AppRole | null | undefined,
    requested?: Partial<DeviceGrant>,
  ): { ok: true; grant: DeviceGrant } | { ok: false; code: 'grant_exceeded' | 'no_grant'; max: DeviceGrant | null };
  ```
  Rules, in order: unknown/absent `callerRole` ⇒ `no_grant` (fail closed, **not** the `user`
  default). No `requested` ⇒ the caller's `MAX_GRANT` entry. `requested.role` ≠ max role, or
  `requested.scopes` ⊄ max scopes ⇒ `grant_exceeded` with the max echoed back so a legitimate
  client can retry correctly. Otherwise use the requested subset; an omitted role defaults to the
  maximum role and omitted scopes default to the maximum scopes. Dedupe and order-normalize scopes
  (the payload joins them with `,`, so order is signed — normalize on both sides or S2's contract
  test will flap).
- In `+server.ts`: resolve `callerRole` from the session/locals source Slice 0 identified — never
  from the body, never from a header. On `ok: false` return **403** with
  `{ error, code, max }` and **no signature field**. On `ok: true` sign
  `buildDeviceAuthPayload({ …, role: grant.role, scopes: grant.scopes, … })` and return the
  effective `{ role, scopes, signedAtMs, deviceId, publicKey, signature }`. Preserve and document
  existing response fields needed by the handshake. S2 must retain `clientId`, `clientMode`,
  `token`, and `nonce` from their existing request/challenge sources rather than assume this
  endpoint newly returns them.
- `signedAtMs` comes from the **server clock** (`Date.now()`), not the body — same "don't trust the
  body" rule, and the response already carries it back for S2 to use. If Slice 0 shows the body
  supplies it today, this is a one-line change and belongs in this slice.
- Leave the 401-when-unauthenticated path exactly as it is. This spec adds an authorization check;
  it does not touch authentication.

**Files:** `src/routes/api/device-identity/sign/+server.ts`,
`src/server/services/device-grant.ts` (new),
`src/server/services/device-grant.test.ts` (new),
`src/routes/api/device-identity/sign/sign.test.ts` (new; place per whatever `vitest.config.ts`'s
`include` glob accepts — Slice 0),
`src/server/services/device-identity.service.ts` (only if the signer's parameter list must change
to stop accepting caller-supplied role/scopes at the type level — preferred).

**Definition of done (machine-checkable):**
```bash
bun x vitest run src/server/services/device-grant.test.ts src/routes/api/device-identity/sign/sign.test.ts
#   red-state first (G3): every case below shown failing before the fix lands
#   - session whose resolved role is 'user' POSTs {role:'admin'}      → 403, code 'grant_exceeded',
#         response body has NO signature/publicKey/privateKeyPem field   ← the proposal's DoD test
#   - same caller POSTs {scopes:[<a scope above its max>]}            → 403 'grant_exceeded'
#   - same caller POSTs nothing                                       → 200, role/scopes == MAX_GRANT.user
#   - same caller POSTs exactly MAX_GRANT.user                        → 200, identical result
#   - caller whose resolved role is 'admin' POSTs {role:'admin'}      → 200, admin grant
#   - caller with an unrecognized/absent role                         → 403 'no_grant' (fail closed)
#   - unauthenticated                                                 → 401 (unchanged)
#   - SIGNATURE BINDING: for each 200, crypto.verify() over
#         buildDeviceAuthPayload({...response.role, response.scopes, response.signedAtMs, ...})
#       succeeds against response.publicKey, and the SAME check with role:'admin' substituted FAILS
#   - scopes order/dupes in the request do not change the signed string (normalization)
rg -n 'body\.role|body\.scopes|json\.role|json\.scopes|requested\.(role|scopes)' \
   src/routes/api/device-identity/sign/+server.ts src/server/services/device-identity.service.ts
#   → request-derived role/scopes may appear only as resolveGrant() requests; manually verify no
#      policy bypass reaches the signer (a textual hit count alone is not proof)
bun run check          # 0 errors / 0 warnings
```

---

### S2 — The client stops asserting a role and uses the grant it was handed

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** remove the browser's ability to state a role at all, and make the desync described in §2
structurally impossible by deriving the `connect` params from the sign response.

**Do:**

- In `src/lib/services/member-gateway.svelte.ts`'s `onChallenge` path: POST to the sign endpoint
  **without** `role`/`scopes` (S1 makes the omitted case the normal case), then build the connect
  params from the response — `buildConnectParams({ client, role: res.role, scopes: res.scopes, … })`
  from `@minion-stack/shared` — and attach `device: { deviceId, publicKey, signature, signedAtMs }`
  exactly as today. Delete the local role/scopes constants; a grep for them must come back empty.
- Handle a **403** explicitly: fail the connect attempt with a distinguishable error and a single
  `console.error` (no silent `.catch(() => {})`, no reconnect storm against a decision that will not
  change on retry). Keep this to the sign path only — the file's other empty catches belong to
  proposal `2026-08-17-site-member-gateway-swallowed-errors` and are **out of scope** here (§5).
- Add a contract test that pins the coupling: given a mocked sign response and challenge, the params the client
  hands to `connect` must reproduce, field for field, the payload string the server signed —
  assert by rebuilding `buildDeviceAuthPayload` from the params and verifying the signature. The
  fixture must assert every canonical field: version, deviceId, clientId, clientMode, role,
  ordered scopes, signedAtMs, token, and optional nonce.

**Files:** `src/lib/services/member-gateway.svelte.ts`,
`src/lib/services/member-gateway.test.ts` (new; `.svelte.ts` modules are plain TS — no component
harness needed).

**Definition of done (machine-checkable):**
```bash
bun x vitest run src/lib/services/member-gateway.test.ts
#   - the sign POST body contains neither 'role' nor 'scopes'
#   - connect params role/scopes === the values returned by the sign response (not constants)
#   - rebuilt payload string from the connect params verifies against the response signature
#   - a 403 sign response → connect is not attempted, exactly one console.error, no reconnect loop
rg -n "role: *'(operator|admin|user)'|scopes: *\[" src/lib/services/member-gateway.svelte.ts
#   → zero hits: the client no longer names a role or a scope anywhere
bun run check
```

---

### S3 — Deny-by-default guards, tenant binding, and refusal telemetry

**Tags:** `security`, `test` · **Estimate:** 5–6 h

**Goal:** make the next occurrence of this bug fail a test instead of shipping, and close the
sibling hole in the same endpoint if Slice 0 found it.

**Do:**

- **Exhaustiveness:** `MAX_GRANT` is typed `Record<AppRole, DeviceGrant>`. This is exhaustive only
  if `AppRole` is imported or derived from the canonical role type; a copied union cannot catch a
  schema-side enum change. Add a runtime role list from the same canonical source and test every
  member has an entry. Validate scopes against the authoritative vocabulary named in Slice 0; do
  not create a second undocumented list solely for the test.
- **Tenant binding (conditional on Slice 0, assumption 4):** the `device_identities` row is chosen
  by tenant. If that tenant is read from the request body or a client-settable header, resolve it
  from the session's active organization instead — signing with another tenant's key is the same
  bug with a bigger blast radius. If it is already session-derived, this reduces to a regression
  test asserting that a body-supplied `tenantId`/`organizationId` is ignored.
- **No key material ever leaves:** a test asserting the 200 and 403 response bodies contain no
  `privateKeyPem` (property check over the serialized body, not a field-by-field assertion), and
  that no log line includes it.
- **Refusal telemetry:** one structured `console.warn` on every `grant_exceeded`/`no_grant`,
  carrying caller id, resolved role, requested role/scopes, tenant — and nothing else. This is the
  detection signal for an actual attempt; without it a probing member is invisible.
- Remove any `TODO(handoff):` markers S1/S2 left behind. Anything still open at this point stays as
  a marker **and** an appended entry on the source proposal.

**Files:** `src/server/services/device-grant.ts`, `src/server/services/device-grant.test.ts`,
`src/routes/api/device-identity/sign/+server.ts`,
`src/routes/api/device-identity/sign/sign.test.ts`.

**Definition of done (machine-checkable):**
```bash
bun x vitest run src/server/services/device-grant.test.ts src/routes/api/device-identity/sign/sign.test.ts
#   - every member of the app role enum has a MAX_GRANT entry (runtime table test)
#   - a source-controlled type-test fixture proves a missing AppRole entry fails type-checking
#   - a body-supplied tenantId/organizationId for a DIFFERENT tenant is ignored: the signature
#         verifies against the SESSION tenant's public key, never the requested one
#   - JSON.stringify(response) does not match /privateKeyPem|BEGIN PRIVATE KEY/ for 200 and 403
#   - a refused request emits exactly one structured warn containing the caller id and the
#         requested role, and NOT matching /BEGIN PRIVATE KEY/
bun x vitest run                # whole site suite green; no skips added
bun run check
rg -n 'TODO\(handoff\)' src/routes/api/device-identity src/server/services   # only genuinely deferred work
```

---

## 3. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `src/routes/api/device-identity/sign/+server.ts` | S1, S3 | resolve caller role from session, 403 on over-ask, sign only the grant, server clock, telemetry |
| `src/server/services/device-grant.ts` | S1, S3 | **new** — `MAX_GRANT` table + `resolveGrant()`, deny-by-default |
| `src/server/services/device-grant.test.ts` | S1, S3 | **new** — policy table, exhaustiveness, normalization |
| `src/routes/api/device-identity/sign/sign.test.ts` | S1, S3 | **new** — endpoint behavior + signature-binding + no-key-leak |
| `src/server/services/device-identity.service.ts` | S1 | only to narrow the signer's parameter type so caller-supplied role/scopes cannot reach it |
| `src/lib/services/member-gateway.svelte.ts` | S2 | stop sending role/scopes; use the returned grant; explicit 403 handling |
| `src/lib/services/member-gateway.test.ts` | S2 | **new** — client/server payload contract test |

All paths relative to `minion_site/`. **No `.svelte` file is edited in any slice** (`.svelte.ts` is
a plain TS module) — see §5. **Zero DDL**: `device_identities` is unchanged, and the role columns
this spec reads already exist.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". Three zones could plausibly apply —
**gateway protocol**, **auth changes (hub ↔ site)**, and **DB schema** — and the wire format and
schema are untouched. The auth zone produces a real alert.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion/` gateway (the verifier) | **None to its code.** Payload string, signature algorithm, connect-param shape and protocol version are all unchanged — only the *values* inside a legitimately signed payload change | ⚠️ A2 below |
| `@minion-stack/shared` (`buildConnectParams`) | **None** — same function, different arguments. No signature change, no version bump, **no changeset** | `packages/shared/src/gateway/connect-params.ts:47` takes `role`/`scopes` as inputs already |
| `@minion-stack/db` (`device_identities`, `profiles`, `auth.member`) | **None** — read-only use of existing columns; zero DDL, no migration | CI guard in §6 |
| `minion_hub` | **No code change here — but see ⚠️ A1.** Hub and site share the DB and the auth stack; hub has its own copy of this endpoint | ⚠️ A1 below |
| `paperclip-minion`, `langgraph-server` | **None** — both sign their own payloads in their own processes with their own keys (`packages/adapters/minion-gateway/src/shared/device-auth.ts`; `langgraph-server/src/gateway/client.ts:38-39`). Neither calls the site endpoint | verified by grep in this checkout |
| `pixel-agents`, `minion_plugins` | **None** | — |

### ⚠️ A1 — the hub almost certainly has the same hole; this spec does not close it

`specs/ws-duplication-audit.md` and `.planning/phases/07-ws-consolidation/07-RESEARCH.md:46-47`
record both consumers calling `/api/device-identity/sign`, with the site's handshake described as
"**identical to hub**", and `07-03-PLAN.md:137` names the hub's own fetch of that path. If the hub
endpoint resolves role the same way the site's does, a hub member can mint the same admin
credential and the escalation stays open on the surface with *more* privileged users.

**This is an unavoidable cross-repo impact, not something this spec can mitigate** — the fix lives
in another repo with its own branch and gates. Required action at the G2 gate: run

```bash
rg -n -A10 'role|scopes' minion_hub/src/routes/api/device-identity/sign/+server.ts
```

and, if the pattern matches, **file a mirrored proposal against `minion_hub`** (same DoD wording,
`repos: [minion_hub]`) before this spec's PR merges. Do not widen this spec to cover hub: different
repo, different branch, different reviewer — and a two-repo PR cannot be gated atomically here.
Note the asymmetry that makes this urgent: shipping the site fix alone publishes the technique
(the diff explains exactly what to POST) while the hub is still open.

### ⚠️ A2 — unknown whether the gateway independently authorizes the signed role

This spec assumes the gateway **trusts** the role/scopes in a validly signed payload — that is what
makes the site endpoint the authorization boundary and this bug a real escalation. Not verifiable
from here (`minion/` is not checked out). Before S1 merges, read
`minion/src/gateway/auth/device-auth.ts` and its caller:

- Gateway trusts the signed role ⇒ severity confirmed, ship as specified.
- Gateway independently re-derives the role (e.g. from the hub-issued JWT) ⇒ the practical severity
  drops to defense-in-depth. **Ship anyway** — signing an unverified claim is wrong regardless —
  but say so in the PR so the gate is not scored against an inflated threat model.

Either way, **do not change the gateway in this spec** (§5).

### ⚠️ A3 — the baseline grant must cover what the members dashboard asks for today

The single production risk. If `MAX_GRANT.user` is narrower than what
`member-gateway.svelte.ts` requests today, then on S1's merge every non-admin member gets a 403 and
the members area stops connecting. Slice 0 records the exact current ask, but current behavior is
compatibility evidence rather than authority to grant it. The human security owner must approve
the baseline after checking gateway scope semantics. If the approved baseline is narrower, S1 and
S2 need a coordinated compatible client flow; if preserving the current broad baseline is the
explicit decision, file a follow-up proposal to narrow it. Do not silently convert a potentially
overprivileged client request into policy.

## 5. Out of scope (explicit)

- **New permission models** (the proposal's own exclusion). No RBAC framework, no scope taxonomy
  redesign, no permissions UI, no new roles. `MAX_GRANT` is a two-row lookup table over roles that
  already exist, not a policy engine.
- **Narrowing what the members dashboard is allowed to do.** If A3 shows the baseline is broad,
  that is a follow-up proposal with the gateway's scope semantics in hand. This spec stops a member
  from exceeding the baseline; it does not redefine the baseline.
- **The hub's copy of this endpoint** — ⚠️ A1: mirrored proposal, `repos: [minion_hub]`.
- **Any change inside `minion/`** — the verifier, the payload format, the protocol version. The
  wire bytes must stay identical or every existing client breaks.
- **Replay/expiry hardening.** S1 moves `signedAtMs` to the server clock because it is a one-line
  "don't trust the body" fix in the same function; it does **not** add signature TTLs, nonce
  stores, or revocation. If Slice 0 shows the nonce path is unauthenticated, that is a
  `TODO(handoff):` plus a proposal append, not a slice here.
- **Key rotation / device revocation** for `device_identities`.
- **The other empty catches in `member-gateway.svelte.ts`** (lines 236/254/322) — owned by proposal
  `2026-08-17-site-member-gateway-swallowed-errors`. S2 touches only the sign path; scope the commit
  narrowly and account for overlapping work before implementation.
- **UI work.** No `.svelte` file is edited, no error surface is designed, so the `ui` tag and its
  governance gates (`lint:design` / `lint:tokens`, the ui-design-governance skill) do **not** apply
  per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b. Rendering a friendly "your account can't do
  that" panel is a follow-up.
- **Wiring `bun run test` into site CI** — owned by `2026-08-13-ci-minion-site-ci-spec` §4. This
  spec's tests must therefore be run *by hand* at the gate (§6) until that lands; note it in the PR.

## 6. End-to-end verification

Run with all three slices merged, on the live site base branch confirmed in Slice 0, against a dev
server and a **dev/staging tenant** — never production.

```bash
cd minion_site

# 1. Gates (security + logic tags: no design/token lint — see §5)
bun run check                                    # 0 errors / 0 warnings
bun x vitest run                                 # full suite green; no new skips
git diff --name-only <base>...HEAD | grep -E '\.svelte$'                && echo "FAIL: UI out of scope" && exit 1
git diff --name-only <base>...HEAD | grep -E '^(supabase/migrations|packages/db)' && echo "FAIL: no DDL in this spec" && exit 1

# 2. The proposal's DoD, end to end. $MEMBER = cookie for a session whose resolved role is 'user'.
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$SITE/api/device-identity/sign" \
  -H "cookie: $MEMBER" -H 'content-type: application/json' \
  -d '{"role":"admin","scopes":["operator.admin"],"clientId":"probe","clientMode":"ui","nonce":"n1"}'
#   → 403
curl -s -X POST "$SITE/api/device-identity/sign" -H "cookie: $MEMBER" \
  -H 'content-type: application/json' -d '{"role":"admin","nonce":"n1"}' \
  | jq -e '.code == "grant_exceeded" and (has("signature") | not) and (has("privateKeyPem") | not)'

# 3. The legitimate path still works and is honestly labelled
curl -s -X POST "$SITE/api/device-identity/sign" -H "cookie: $MEMBER" \
  -H 'content-type: application/json' -d '{"clientId":"probe","clientMode":"ui","nonce":"n1"}' \
  | tee /tmp/grant.json | jq -e '.role != "admin" and (.signature|length) > 0'
#   verify the signature covers exactly the returned role/scopes (node one-liner, see sign.test.ts
#   for the same assertion): rebuild "v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce"
#   from /tmp/grant.json → crypto.verify(null, payload, publicKey, signature) === true,
#   and the same check with role swapped to 'admin' === false

# 4. The regression that started it all — the ONLY two legal outcomes for any request:
#      (a) 403 with no signature, or
#      (b) 200 whose signature covers the SERVER-resolved role.
#    200 + a signature over a body-supplied role is the bug and must be unreachable.

# 5. Members dashboard still connects (⚠️ A3 — the production risk), browser-harness skill,
#    verification only, no UI edits:
#    - log in as a plain member → members area loads, WS connects, chat round-trips
#    - log in as an admin → unchanged behavior
#    - gateway logs show the connect handshake verifying (no signature-mismatch errors)

# 6. Pre/post proof for the PR: on the pre-fix commit, step 2's first curl returns 200 with a
#    signature over role 'admin'. Capture both outputs; that diff IS the security evidence.
```

**Ship gate** (`security`-tagged ⇒ human gate mandatory, score cannot auto-pass —
`2026-08-17-sdlc-phase-gates-scoring-spec` §4b):

1. §6 all green, including step 5's members-area probe.
2. The proposal's DoD sentence checked off literally — a non-admin POSTing `role: admin` is refused.
3. Step 6's pre/post capture pasted in the PR.
4. ⚠️ A1 resolved: the hub grep run, and either "hub is not affected, here is the code" or a filed
   `minion_hub` proposal id.
5. ⚠️ A2's reading of `minion/src/gateway/auth/device-auth.ts` summarized in one line.
6. ⚠️ A3's recorded current client ask reconciled against the shipped `MAX_GRANT`.
7. Slice 0's actuals reconciled against §3. Because the site and meta-repo are independent,
   corrections require a separate scoped meta-repo change linked from the site PR.
