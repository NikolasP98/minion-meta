# Auth & Token Validation — Simplification Report

**Date:** 2026-05-26
**Scope:** `minion_hub` (dashboard) + `minion` (gateway) + `@minion-stack/{auth,shared,db}`
**Goal:** Reduce the complexity of how tokens and auth are validated, without compromising security or performance. Identify abstractions and structural changes.

> Status note: much of the complexity below is **migration-transitional** (a strangler-fig
> Supabase→Better-Auth / Turso→Postgres cutover in progress). The single highest-leverage
> simplification is *finishing and deleting* the losing side of each migration, not adding
> new abstractions. Recommendations are tagged **[FINISH]** (complete an in-flight migration
> and delete code), **[ABSTRACT]** (extract/consolidate), or **[HARDEN]** (close a real
> security/correctness gap that also simplifies).

---

## 1. The core problem, in one sentence

There are **two identity systems** (Supabase JWT and Better Auth sessions), keyed by **three
different user IDs** (`user.id`, `supabaseId`, `legacy_user_id`), feeding **two databases**
(Turso/SQLite and Supabase/Postgres), and the gateway accepts **six auth modes** with a
fallback chain that can silently land on "no auth required." Almost every painful edge case
traces back to running both halves of an unfinished migration at the same time.

The protocol itself (the WS frame layer, the encryption, the Better Auth factory) is **fine**.
The complexity lives in the *resolution and bridging logic* layered on top.

---

## 2. Current state — verified map

### 2.1 Hub request auth: one handler, four branches

`minion_hub/src/hooks.server.ts` `appHandle` (lines 99–215) decides identity through a linear
cascade:

1. **`AUTH_DISABLED`** (103–114) → fabricate a `local`/`admin` user, grab first org.
2. **`AUTH_PROVIDER === 'supabase'`** (120–142) → `resolveSupabaseUser()`, then look up the
   first `member` row by the bridged id to get `tenantCtx`.
3. **Bearer token for `/api/metrics/*`** (145–154) → `resolveServerTokenAuth()` decrypts *every*
   `servers.token` row to find a match.
4. **Better Auth session** (158–212) → `getAuth().api.getSession()`, re-query `user.role`,
   read `activeOrganizationId` off the session row, fire-and-forget personal-agent backfill,
   plus a **JWKS self-heal** retry (162–170) for when `BETTER_AUTH_SECRET` rotates.

Then `finishApp` (223+) re-resolves `tenantCtx` *again* for unauthenticated API requests via a
hand-maintained `API_UNAUTH_FALLBACK_PATHS` allowlist (234–250) that falls back to "first org
in the DB."

**Tenant context is resolved in three places** for a single request: `appHandle`, `finishApp`,
and again defensively in `(app)/+layout.server.ts`. The source of truth differs per branch
(`member` table in the Supabase path; `session.activeOrganizationId` in the Better Auth path).

### 2.2 Token zoo

| Token | Created | Stored | Validated | Notes |
|---|---|---|---|---|
| Better Auth session cookie | sign-in | `session` table | `getSession()` | browser UI |
| Better Auth JWT (EdDSA) | `issueGatewayJwt()` | not persisted | JWKS verify | service→gateway |
| JWKS keypair | lazy by plugin | `jwks` (priv key AES-enc w/ `BETTER_AUTH_SECRET`) | `symmetricDecrypt` | breaks on secret rotation → heal hack |
| Server/gateway token | `POST /api/servers` | `servers.token`/`tokenIv` (AES-256-GCM) | `decryptToken` | WS handshake secret |
| PG per-user gateway token | `createGateway()` | PG `gateway.tokenCiphertext` | `decrypt` | Wave-1 migration target |
| Supabase JWT | Supabase Auth | Supabase cookie | Supabase stdlib | RLS |
| `MINION_GATEWAY_TOKEN` (env) | ops | process env | string compare | bootstrap fallback |
| Paperclip identity token | `mintPaperclipIdentity()` | cookie | JWT or board-key | separate concern |

Two distinct **AES-256-GCM** implementations exist with the same scheme but different key
derivation: hub's `crypto.ts` (`scrypt('minion-hub-dev-key',...)`) and the PG `gateway`
service's `decrypt`. Same algorithm, duplicated code, two dev-key defaults.

### 2.3 Gateway auth: six modes + a fallthrough to "open"

`minion/src/gateway/auth/auth.ts` `resolveGatewayAuth()` (193–258) resolves a mode from:
override → config → (password present?) → (token present?) → **`default: mode="token"` with no
token** (241–244). `assertGatewayAuthConfigured()` (260+) is what *should* stop an open gateway,
but it exempts the Tailscale case (262–264). Modes in play: `token`, `password`, `trusted-proxy`,
device-token, multi-tenant JWT, service-account API key.

Connect path (`message-handler.ts` 372–414) tries shared-secret, then device token, then JWT,
with an **implicit admin grant**: a valid token/password connection with no JWT is treated as
`role: admin` (backward-compat). Rate limiting (`auth-rate-limit.ts`) tracks shared-secret and
device-token in **separate counters**, so lockout on one scope doesn't lock the other; service
accounts bypass rate limiting entirely.

Config is **re-resolved from disk on every request** (startup, WS connect, HTTP connect), so an
in-flight config edit can change auth behavior between two frames of the same session.

### 2.4 Shared packages — mostly clean

`@minion-stack/auth` `createAuth()` is a tidy 72-line factory; the real coupling is the
**shared-secret requirement**: hub and site must hold an *identical* `BETTER_AUTH_SECRET` or
sessions silently 401. The WS protocol (`@minion-stack/shared`) carries **no auth in the frame
types** — auth is bolted onto the `connect` handshake via an `onChallenge` callback that **each
client reimplements** by hand. `@minion-stack/db` already centralizes a clean `mapGoogleIdentity`
mapper, but the hub's `identity-sync.ts` reshapes its output again — duplication that will bite
on the next schema change.

---

## 3. Where the complexity actually comes from

1. **Unfinished migrations running in parallel.** Supabase *and* Better Auth; Turso *and*
   Postgres. Every `legacy_user_id` reference, the `member`-vs-`activeOrganizationId` split, and
   the `bridged.id` juggling exist only to keep both halves alive at once.
2. **Identity resolution is inlined into the request handler** instead of being a single
   function with one return shape. Four branches each populate `locals` slightly differently.
3. **Tenant context has no single resolver.** Three call sites, two sources of truth.
4. **The gateway's auth mode is *inferred* rather than *declared*,** so "no token configured"
   is a reachable runtime state instead of a startup error.
5. **Token decryption is O(n) and duplicated.** `/api/metrics/*` decrypts every server row to
   match a bearer token; two AES implementations exist.
6. **Secret rotation is unmodeled,** so the JWKS heal hack and the hub↔site shared-secret
   fragility are load-bearing.

---

## 4. Target architecture

```
                       ┌─────────────────────────────────────────┐
  Browser / Desktop ──▶│ hub: resolveIdentity(event)              │
                       │   → { user, tenantCtx } | null           │  ONE function,
                       │   (one provider behind an interface)     │  ONE return shape
                       └───────────────────┬─────────────────────┘
                                           │ issues short-lived
                                           ▼ gateway JWT (already exists)
                       ┌─────────────────────────────────────────┐
  Gateway ────────────▶│ verifyConnect(frame)                     │
                       │   mode is DECLARED, not inferred         │  JWT = the one
                       │   JWT path primary; static token =       │  cross-service
                       │   explicit "bootstrap/admin" mode        │  credential
                       └─────────────────────────────────────────┘
```

Principle: **one credential crosses the hub→gateway boundary — the Better Auth EdDSA JWT.**
Everything else (session cookies, server tokens, Supabase) is an *implementation detail on one
side of one boundary*, never a thing the other side has to understand.

---

## 5. Recommendations (ordered by leverage)

### R1 — Formalize Supabase (primary) + Better Auth (self-host) as two clean providers **[FINISH]**
**Decision (confirmed 2026-05-26):** Supabase is the **primary/cloud** identity provider.
Better Auth becomes the **self-host / cloudless** option (no Supabase dependency). *Both are
permanent* — so the goal is not deletion of either, but removing the **inline branching** and
the **dual-ID ambiguity** so each provider is a clean, swappable implementation.
- Both providers sit behind the `IdentityProvider` interface from **R2**; `AUTH_PROVIDER`
  (`supabase` | `better-auth`) selects which one is wired at boot — not an `if` in the hot path.
- Make the **Supabase UUID (`profiles.id`) authoritative** as the canonical user id. Treat
  `legacy_user_id` strictly as a transitional bridge to old Turso text ids, and schedule a
  backfill migration to retire it once Turso-keyed rows are remapped. In the Better-Auth
  (self-host) path there is no Supabase, so `user.id` is canonical there — the interface hides
  this difference from every caller.
- `AUTH_DISABLED` and the `/api/metrics/*` bearer path stay as-is but move *behind* the same
  resolver entry point so `appHandle` has one call, not four branches.
- **Net:** `appHandle` collapses from 4 inline branches to one provider call; the `bridged.id`
  vs `user.id` vs `supabaseId` ambiguity is contained to the two provider impls; the "which id
  keys this table" 404 class is closed by declaring one canonical id per provider.

### R2 — Extract one `resolveIdentity()` provider behind an interface **[ABSTRACT]**
Even before R1 lands, move identity resolution out of `appHandle` into a single module:
```ts
interface IdentityProvider {
  resolve(event): Promise<{ user: AuthUser; tenantCtx: TenantContext } | null>;
}
```
`appHandle` becomes: `locals = await identityProvider.resolve(event); return finishApp(...)`.
The Supabase vs Better-Auth choice becomes *which provider is wired up*, not an `if` inside the
hot path. This makes R1 a one-line swap later and makes the request handler readable now.

### R3 — Single tenant-context resolver, resolved once **[ABSTRACT]**
Create `resolveTenantCtx(user, db)` with exactly one rule (recommend: active membership via
`member`, falling back to sole membership). Call it once in the provider; store on `locals`.
Delete the re-resolution in `finishApp` and the defensive lookup in `(app)/+layout.server.ts`.
Replace the `API_UNAUTH_FALLBACK_PATHS` allowlist with an explicit per-route `public: true`
marker (or a route-group convention) so "this route may run tenant-less" is declared at the
route, not maintained in a central list that drifts.

### R4 — Make the gateway auth mode declared, not inferred **[HARDEN]**
> **Verified 2026-05-26 (code-level) — LARGELY A NON-ISSUE.** The recon summary's
> "open-by-default" claim is false. `authorizeGatewayConnect` (`auth.ts:401–403`) *rejects*
> token-mode-without-a-token with `token_missing_config`, and `assertGatewayAuthConfigured`
> *already throws at startup* for that case. The gateway is **closed by default**. The only
> no-shared-secret path is the explicit Tailscale-serve carve-out, which is intentional. The
> residual value here is cosmetic (the implicit `modeSource: "default"`), not a security fix.
> **Not implemented** — would be churn on working security code.

In `resolveGatewayAuth`, remove the `default: token-with-no-token` arm (241–244). If no mode is
explicitly configured and no secret is present, **fail at startup** via
`assertGatewayAuthConfigured` (and require an explicit `mode: "open"` for the
intentional-no-auth dev case, so it can never be reached by accident). Collapse the
override→config→env precedence into a single documented resolver used by startup, WS, and HTTP
(today three call sites re-resolve).

### R5 — Make the EdDSA JWT the primary gateway credential; demote the static token **[HARDEN]**
> **Verified 2026-05-26 (code-level) — OVERSTATED.** Admin-via-static-token
> (`ws-jwt-auth.ts:108–129`, Case 2) is the **intentional operator/bootstrap model**, and it
> **already emits a visible `auth.connect.success` event** (`role: admin, method: token`) — not
> the "silent fallback" the summary implied. Demoting it to a JWT-primary model is a real future
> design improvement but a **behavior change with external-client blast radius** (see open
> question 3), not a bug fix. **Not implemented** in this pass.
>
> **What WAS fixed (the real, verified issue this recommendation's investigation surfaced):**
> the multi-tenant **service-account `apiKey` was compared with plain `===`**
> (`message-handler.ts:788`), a timing-unsafe comparison, while every other gateway secret uses
> the timing-safe `safeEqualSecret`. Swapped to `safeEqualSecret`. Small, contained, no behavior
> change for legitimate clients. (minion repo, branch DEV.)

The gateway already validates hub-issued JWTs (`auth-jwt.ts`). Make that the **default** path
for hub→gateway. Keep the static `MINION_GATEWAY_TOKEN` only as an explicit `mode: "bootstrap"`
that grants admin — and log loudly when it's used. This removes the implicit "valid token ⇒
admin" surprise (`message-handler.ts` 372–414) by making admin-via-static-token a *named,
visible* mode rather than a silent fallback.

### R6 — Index server tokens instead of brute-force decrypting **[HARDEN/perf]**
> **Reclassified 2026-05-26.** This is **hub-side** (the O(n) decrypt lives in hub's
> `resolveServerTokenAuth`, now in `resolve-identity.ts`), not gateway. Indexing needs a
> `servers.tokenHash` column → a `@minion-stack/db` schema change + migration + **republish**
> (same publish coupling as R7/R8). Server count is <10, so the per-request cost is negligible in
> practice — **low priority**; bundle with the next `@minion-stack/db` release.

`/api/metrics/*` decrypts every `servers.token` to match a bearer (O(n) crypto per request).
Store a non-reversible lookup key alongside the ciphertext — e.g. `tokenHash = HMAC(serverSecret,
token)` — and match on the indexed hash, decrypting only the single matched row. Constant-time
match preserved; no plaintext stored.

### R7 — Consolidate the two AES-256-GCM implementations **[ABSTRACT]**
Move the one correct implementation into `@minion-stack/db` (or a small `@minion-stack/crypto`)
and have both the hub `crypto.ts` and the PG `gateway` service import it. One key-derivation
path, one place to require `ENCRYPTION_KEY` in production, no `'minion-hub-dev-key'` duplication.

### R8 — Provide a shared `onChallenge` helper in `@minion-stack/shared` **[ABSTRACT]**
Every client reimplements the connect-frame shape (protocol version, role, scopes, `auth.token`,
`userId`). Export `buildConnectParams({ token, role, scopes, userId })` and a typed
`GatewayAuthHandshake` so protocol-version bumps (`PROTOCOL_VERSION = 3`) and field renames
happen in one place, not in every consumer's `onChallenge`.

### R9 — Model secret rotation instead of healing it **[HARDEN]**
The JWKS self-heal (delete-stale-row-and-retry, one-shot per process) is a symptom of
`BETTER_AUTH_SECRET` being treated as immutable. Either (a) document it as immutable and source
it from one place (Infisical) for hub *and* site so they can't diverge, or (b) support a
`BETTER_AUTH_SECRET` + `BETTER_AUTH_SECRET_PREVIOUS` pair so rotation is a deploy, not an
outage. Pick one; the current heal hack is a third, fragile option.

---

## 6. Suggested sequencing

| Wave | Items | Why first |
|---|---|---|
| **0 — structural, no behavior change** | R2, R3, R7, R8 | Pure refactors; make the system legible and make later waves one-line swaps. Safe to ship incrementally. |
| **1 — finish the migration** | R1 | Biggest deletion; depends on R2/R3 being in place so the swap is trivial. Needs a backfill migration + explicit go-ahead. |
| **2 — gateway hardening** | R4, R5, R6 | Independent of the hub migration; each closes a real gap (open-by-default, implicit admin, O(n) decrypt). |
| **3 — operational** | R9 | Lowest urgency; do once the IdP is settled (R1) so you're hardening the final secret, not a transitional one. |

---

## 7. What NOT to change

- The **WS frame protocol** (`req`/`res`/`event`) — clean, versioned, leave it.
- The **`createAuth()` factory** — already DRY; the coupling is operational (shared secret), not structural.
- **AES-256-GCM + timing-safe compares** — correct primitives; consolidate the *code*, keep the *crypto*.
- The **gateway's rate-limiter and device-pairing** — fine as-is once R4/R5 remove the silent-fallback ambiguity around them.

---

## 8. Open questions to confirm before executing

1. ~~Is Better Auth the committed IdP winner?~~ **Resolved 2026-05-26: Supabase is the primary
   (cloud) provider; Better Auth is the self-host / cloudless option. Both are permanent,
   selected by `AUTH_PROVIDER`.** (This reverses the earlier `auth-microservice-direction` note.)
2. **Is the Turso→Postgres move (`gateway`/`userGateway` PG tables) going to completion**, or is
   Turso staying for the relational core? This decides whether R7 lives in `@minion-stack/db`
   (Turso) or a neutral package.
3. **Are there external/non-hub clients** depending on the gateway's static-token admin grant
   (R5) that would break if it's demoted to an explicit `bootstrap` mode?
