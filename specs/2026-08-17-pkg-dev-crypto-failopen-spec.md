---
id: 2026-08-17-pkg-dev-crypto-failopen-spec
title: "@minion-stack/db crypto — fail closed instead of silently sealing under the source-visible dev key"
stage: spec
status: draft
pass: 1
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-pkg-dev-crypto-failopen
verdict: pending
repos: [minion-meta, minion_hub, minion_site]
tags: [security, logic, test]
type: fix
---

# Fail closed on the dev crypto key

**Owner surface:** `minion-meta` — `packages/db/src/crypto.ts` (the single key-derivation path),
its two test files, a changeset, and the root env docs. **Consumer surface:** `minion_hub` and
`minion_site`, which both import this module (S3).
**Design ancestors:**
[`2026-05-26-auth-token-simplification`](2026-05-26-auth-token-simplification.md) §R7 — the item
that created this file ("One key-derivation path, **one place to require `ENCRYPTION_KEY` in
production**, no `'minion-hub-dev-key'` duplication"). That consolidation is exactly why this bug is
now worth fixing once instead of twice; it is also why the blast radius is two apps.
[`2026-05-25-auth-supabase-phase1-oauth-users-plan`](2026-05-25-auth-supabase-phase1-oauth-users-plan.md)
§ (lines 284–334) — where the `NODE_ENV === 'production'` guard was first written down, verbatim, as
the intended contract. [`2026-05-24-unified-user-identities-design`](2026-05-24-unified-user-identities-design.md)
— "the hub is the sole key holder; the key is never logged and never sent to the gateway" (why the
gateway repo is *not* in scope).
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices are tagged `security`/`logic`/`test`: red-state TDD is mandatory, the fail-closed rubric
applies, **no UI-governance checks** (zero `.svelte` files in this spec), and per that table a
`security` tag means the score can warn but **never auto-pass** — the human gate is mandatory
regardless of how green the commands below come back.

---

## 0. Product

From the approved proposal `2026-08-17-pkg-dev-crypto-failopen`, verbatim:

> ## Problem
>
> packages/db/src/crypto.ts:22-28 — any env where NODE_ENV isn't literally 'production' (staging,
> preview, misconfig) silently encrypts all secrets under a hardcoded source-visible key, consumed
> by hub AND site.
>
> ## Definition of done
>
> Explicit MINION_ALLOW_DEV_CRYPTO_KEY=1 opt-in required for the dev key; otherwise sealSecret()
> throws when ENCRYPTION_KEY is unset. Test proves both paths.
>
> ## Out of scope
>
> Key rotation; changing prod behavior.

**What the code actually says today** (verified in this checkout, `packages/db/src/crypto.ts:19-32`):

```ts
let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY environment variable must be set in production");
    }
    // Dev-only fallback — never used in production.
    cachedKey = scryptSync("minion-hub-dev-key", "minion-hub-salt", 32);
    return cachedKey;
  }
  ...
}
```

The comment "never used in production" is an *assertion about deployment*, not a property of the
code. The code's actual rule is "used everywhere except one exact string." Three properties make
this worse than a normal fail-open:

1. **The key material is in a public npm package.** `@minion-stack/db@0.9.4` ships `src/` in its
   `files` array (`packages/db/package.json`), and the package is `publishConfig.access: public`.
   `minion-hub-dev-key` + the salt `minion-hub-salt` are therefore not merely "in our source" —
   they are `npm pack`-able by anyone. Anything sealed under them is plaintext-equivalent.
2. **There is no failure signal.** A wrong-key seal *succeeds*, and the matching open succeeds too,
   because the same wrong key derives on read. Nothing in the stack ever notices. Contrast with the
   already-fixed rotation failure mode (GCM auth error, loud). Silent-and-consistent is the reason
   this survived a year.
3. **It is now shared.** §R7 deliberately made hub and site import one implementation. That was the
   right call, and it means one `if` decides the confidentiality of every OAuth refresh token,
   gateway `servers.token`, and identity secret written by either app.

**The failing-path we are choosing.** After this spec, a misconfigured environment gets a hard,
named error at boot (S2) or at first seal (S1) instead of a database full of decorative ciphertext.
That is a deliberate availability-for-confidentiality trade, and it is the trade the proposal asks
for. §4 states plainly who can be woken up by it.

## 1. Assumptions and what Slice 0 must settle

`packages/db/` **is** checked out here and every line above was read from disk. `minion_hub/` and
`minion_site/` are **not** (the meta-repo `.gitignore` excludes subprojects; `ls -d minion_hub
minion_site` returns nothing in this workspace). So §2's S1/S2 rest on verified fact; S3 and §4 rest
on carried claims. Four of them are load-bearing:

1. **Hub re-exports this module.** `crypto.ts:3-5` says so in its own header ("re-exported by
   minion_hub's `crypto.ts` (encrypt/decrypt/encryptToken/decryptToken)"), and §R7 planned it. Not
   verified against hub's tree from here.
2. **Site uses the PG identity path.** `packages/db/src/pg/crypto.ts` and
   `src/pg/schema/index.ts:13` re-export `sealSecret`/`openSecret`; the 2026-05-25 plan says the site
   seals OAuth refresh tokens with them.
3. **Which environments actually run with `NODE_ENV !== 'production'` and seal secrets** is the
   thing that sizes the real-world exposure — and it is **not knowable from this repo**. Note one
   counter-intuitive detail before assuming the worst: Vercel builds and runs *preview* deployments
   with `NODE_ENV=production` too, so hub/site previews may already be on the throwing path. The
   genuinely exposed set is more likely: local dev, CI, self-hosted/Docker staging, and any process
   started without `NODE_ENV` set at all (`node dist/index.js` → `undefined` → fallback). **I am not
   certain of the Vercel behavior on the current plan/adapter — verify it, do not take this
   sentence as fact.** ⚠️ A1.
4. **Nothing else in this meta-repo derives a key.** Verified: `grep -rn "sealSecret\|openSecret\|
   ENCRYPTION_KEY" packages/ scripts/ ops/ langgraph-server/ supabase/` returns hits **only** inside
   `packages/db/`. `packages/auth` depends on `@minion-stack/db` but never touches crypto.

Two facts found in this checkout that change the work, and would otherwise be found the hard way:

- **`packages/db/src/crypto.test.ts` currently depends on the fallback.** It never sets
  `ENCRYPTION_KEY`, so every one of its four cases runs on `minion-hub-dev-key` today. S1 makes that
  file **red** the moment the guard lands. That is not collateral damage — it is the proof the guard
  works — but it means the existing suite must be fixed inside S1, following the precedent already
  set by its sibling `packages/db/src/pg/crypto.test.ts:5`
  (`process.env.ENCRYPTION_KEY = 'test-key-do-not-use-in-prod'`).
- **`cachedKey` is module-level.** The first call wins for the life of the process, so (a) the throw
  is lazy — it lands at first `sealSecret`/`openSecret`, not at import — and (b) a test cannot flip
  env vars between cases without `vi.resetModules()` + dynamic `import()`. Both shape S1 and S2.

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd /home/agent/work
# in-repo (should reproduce the four verified facts above)
rg -n 'ENCRYPTION_KEY|minion-hub-dev-key|NODE_ENV' packages/ scripts/ ops/ langgraph-server/ supabase/
rg -n 'sealSecret|openSecret|encryptToken|decryptToken|db/crypto' --glob '!node_modules' .
cat packages/db/vitest.config.ts packages/db/package.json   # test include globs, `files`, version

# consumers — run wherever hub/site ARE checked out (⚠️ A2)
rg -n "@minion-stack/db" minion_hub/package.json minion_site/package.json       # pinned version?
rg -n 'sealSecret|openSecret|encrypt|decrypt|encryptToken|ENCRYPTION_KEY' minion_hub/src minion_site/src
rg -n 'ENCRYPTION_KEY' minion_hub/.env.example minion_site/.env.example minion_hub/.github minion_site/.github

# A1 — where does NODE_ENV !== 'production' actually coincide with sealing?
#   Vercel project settings (hub + site, preview AND production scopes): is ENCRYPTION_KEY set?
#   docker-compose / fly.toml / systemd units for any self-hosted hub: NODE_ENV present?
#   CI workflows that boot the app or run integration tests
```

Record the answers — **especially A1's environment list and whether `ENCRYPTION_KEY` is already
present in every Vercel scope** — in the PR description. Nothing in Slice 0 changes files.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (the gate: fail closed + explicit opt-in) ─▶ S2 (release contract + at-rest audit)
                                                                        └─▶ S3 (consumers land it)
```

S1 alone satisfies the proposal's DoD sentence literally. S2 makes it *arrive* (boot-time assertion,
docs, changeset, anti-recurrence guard) and answers the question the proposal doesn't ask but a
reviewer will: *is there already data sealed under the dev key?* S3 is the slice that decides whether
this fix is a security improvement or a Monday-morning outage — see §4.

**S1 + S2 are indivisible for release** (a published package whose behavior changed without a
changeset is worse than not shipping). S3 may be deferred *only* by holding the consumer dependency
bump; if it is deferred, the AGENTS.md **open-items ledger** rule applies — a `TODO(handoff):` in
`crypto.ts` naming the un-landed consumers, plus an appended entry on the source proposal.

---

### S1 — The gate: no key, no ciphertext

**Tags:** `security`, `logic`, `test` · **Estimate:** 5–7 h

**Goal:** the dev key becomes unreachable without someone typing an environment variable whose name
says what it does. Every other path throws. Production behavior is byte-identical, including the
error string.

**Do:**

- Replace the body of `key()` with a small, testable resolver. Intended shape (adjust names to taste,
  keep the semantics):

  ```ts
  export type CryptoKeyMode = "configured" | "dev-fallback";

  /** Resolve which key this process is entitled to use — or throw. No side effects, no secrets in the message. */
  export function cryptoKeyMode(): CryptoKeyMode {
    if (process.env.ENCRYPTION_KEY) return "configured";
    if (process.env.NODE_ENV === "production") {
      // UNCHANGED string — existing log alerting may match on it (proposal: don't change prod behavior).
      throw new Error("ENCRYPTION_KEY environment variable must be set in production");
    }
    if (!devKeyOptIn()) {
      throw new Error(
        "ENCRYPTION_KEY is not set. Refusing to seal or open secrets with the built-in, " +
          "source-visible development key. Set ENCRYPTION_KEY, or — for local development only — " +
          "set MINION_ALLOW_DEV_CRYPTO_KEY=1 to accept it.",
      );
    }
    return "dev-fallback";
  }
  ```

- **The opt-in is refused under `NODE_ENV=production`, unconditionally.** Note the ordering above:
  the production branch is checked *before* the opt-in, so `MINION_ALLOW_DEV_CRYPTO_KEY=1` in a
  production environment still throws. This is not optional polish — an env var that can downgrade
  production crypto would be a *worse* bug than the one we are fixing, and shipping it would violate
  the proposal's "changing prod behavior" exclusion in the one direction that matters.
- **Parse the opt-in as a strict allowlist:** accept only `1` and `true` (trimmed,
  case-insensitive). Everything else — `0`, `false`, `no`, empty, whitespace — is **off**. Do not use
  truthiness: `MINION_ALLOW_DEV_CRYPTO_KEY=false` evaluating to *enabled* is the classic form of this
  exact bug class, and a reviewer will (rightly) fail the slice for it.
- **Do not special-case `NODE_ENV=test`.** It is the same fail-open shape one rename away. Tests set
  `ENCRYPTION_KEY` explicitly — the precedent is already in the repo at `src/pg/crypto.test.ts:5`.
- **Warn once, loudly, when the fallback is actually used** — `console.warn` on the first derivation
  only (tie it to the `cachedKey` assignment so it is once per process), naming the variable that
  enabled it. Never log key material, the derived key, or any plaintext.
- **Keep the throw lazy** (inside `key()`, reached from `sealSecret`/`openSecret`) rather than at
  module load. `@minion-stack/db` is imported by drizzle-kit, migration runners and read-only paths
  that never touch a secret; crashing those on import would turn a confidentiality fix into a
  tooling outage. S2 adds the eager check as an explicit opt-in call for app boots.
- **`openSecret` is covered too, by construction.** Both functions go through `key()`. The proposal's
  DoD names `sealSecret()` because writes are what create exposure, but a reader must not be able to
  open dev-key ciphertext without the same opt-in. Say so in the doc comment — and see the ⚠️ A3
  consequence for existing local DBs.
- **Fix the existing suite in this slice.** `src/crypto.test.ts` gets
  `process.env.ENCRYPTION_KEY = 'test-key-do-not-use-in-prod'` at the top, matching its sibling.
  Show it red first (G3): run it once *before* fixing it and paste the failure into the PR — that
  run is the cheapest possible proof that the old code was on the fallback all along.
- Update the file header comment: the "Dev-only fallback — never used in production" line is now
  false-by-comment-and-true-by-code; make the code the documentation.
- **Do not touch the layout block** (`scryptSync(raw,'minion-hub-salt',32)`, `hex(encrypted||authTag)`,
  12-byte IV). Existing ciphertext at rest depends on every byte of it. This slice changes *which key
  you are allowed to derive*, never *how*.

**Files:** `packages/db/src/crypto.ts`, `packages/db/src/crypto.test.ts`,
`packages/db/src/crypto-key.test.ts` (new — the env matrix needs `vi.resetModules()` isolation and
does not belong in the roundtrip file), `packages/db/src/pg/crypto.test.ts` (verify only; it already
sets the key — change nothing if it passes).

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run
#   red-state first (G3): every case below shown failing before the fix lands.
#   Each env case MUST use vi.resetModules() + await import('./crypto.js') — cachedKey is
#   module-level, so a second case in the same file otherwise asserts the first case's key.
#   - ENCRYPTION_KEY set, NODE_ENV unset        → sealSecret() roundtrips  (mode 'configured')
#   - ENCRYPTION_KEY unset, NODE_ENV unset, no opt-in     → sealSecret() THROWS   ← proposal DoD path A
#   - ENCRYPTION_KEY unset, NODE_ENV unset, MINION_ALLOW_DEV_CRYPTO_KEY=1 → roundtrips ← DoD path B
#   - same, ...=true / =TRUE / = 1 (padded)     → roundtrips
#   - same, ...=0 / =false / =no / ='' / ='  '  → THROWS      (strict allowlist, not truthiness)
#   - ENCRYPTION_KEY unset, NODE_ENV=production, no opt-in   → throws the UNCHANGED prod message
#   - ENCRYPTION_KEY unset, NODE_ENV=production, MINION_ALLOW_DEV_CRYPTO_KEY=1 → STILL THROWS
#     (assert the message is the prod one — the opt-in must not even be consulted)
#   - openSecret() throws under the same no-key conditions as sealSecret()
#   - the thrown message contains neither 'minion-hub-dev-key' nor any plaintext argument
#   - dev-fallback path emits exactly ONE console.warn across two seals (spy, resetModules per case)
#   - ciphertext produced with ENCRYPTION_KEY=X opens with ENCRYPTION_KEY=X after resetModules
#     (byte-layout unchanged — the anti-regression anchor for every existing row at rest)
pnpm vitest run src/pg/crypto.test.ts     # untouched sibling still green
cd ../.. && pnpm run typecheck-all && pnpm run lint-all
rg -n 'minion-hub-dev-key' packages/db/src/crypto.ts   # → exactly ONE hit, inside the guarded branch
```

---

### S2 — Make the failure arrive early, and find out what is already sealed

**Tags:** `security`, `infra`, `test` · **Estimate:** 4–6 h

**Goal:** a misconfigured deployment finds out at boot, not at the first user who connects an OAuth
account; the package's published contract says so; and we learn whether dev-key ciphertext already
exists at rest before S3 turns reads into errors.

**Do:**

- **Export `assertCryptoKeyConfigured(): void`** (a thin `cryptoKeyMode()` call, discarding the
  result) plus `cryptoKeyMode()` itself from `./crypto` — and re-export both from `src/index.ts` and
  `src/pg/schema/index.ts` alongside the existing `sealSecret`/`openSecret` re-exports, so consumers
  reach them by the same import path they already use. Document in one line: *call this once at app
  startup so a missing key is a boot failure, not a runtime surprise.* S3 is what calls it.
- **Changeset** (`.changeset/<name>.md`, `"@minion-stack/db": minor` — the package is 0.x, so a
  behavior break is `minor` by this repo's convention; see `.changeset/db-drop-dead-turso-schema.md`
  for the house prose style). The body must state, in the consumer's terms: *what now throws*, *the
  two ways to fix it* (`ENCRYPTION_KEY`, or `MINION_ALLOW_DEV_CRYPTO_KEY=1` for local dev only),
  *that production behavior and the ciphertext layout are unchanged*, and *that ciphertext written
  under the old fallback is only readable with the opt-in set*. CI runs `changeset:status` — a
  behavior change with no changeset fails the PR at `pnpm run ci` anyway.
- **Env docs:** add `ENCRYPTION_KEY` and `MINION_ALLOW_DEV_CRYPTO_KEY` to the root `.env.example`
  with one-line comments (the second marked *local development only — never set in a deployed
  environment*). Do **not** put `MINION_ALLOW_DEV_CRYPTO_KEY=1` in `.env.defaults` or any committed
  defaults layer: a default-on opt-in is the original bug with extra steps. If `packages/db` gains a
  README (it has none today), one paragraph there; otherwise the changeset + the file header carry
  the contract.
- **Anti-recurrence guard test.** Read `src/crypto.ts` from disk in a test and assert (a) the string
  `minion-hub-dev-key` appears exactly once, (b) it is not reachable in a branch that mentions
  neither `MINION_ALLOW_DEV_CRYPTO_KEY` nor `NODE_ENV`, and (c) no *other* file under `packages/db/src/`
  calls `scryptSync`. Fail with a message pointing at `cryptoKeyMode()`. A grep in a spec is a
  one-time check; a grep in a test is a permanent one.
- **At-rest audit (⚠️ A3, the part a reviewer will ask for).** Enumerate the columns sealed by this
  module (from `packages/db/src/schema/` + `src/pg/schema/`: at minimum `servers.token`/`token_iv`
  and the `user_identities` secret columns — confirm the full list by grepping for the `*_iv`
  companion column convention) and, for every non-production database reachable to the implementer,
  count non-null ciphertext rows. Then, for each, test-decrypt a sample under the *dev* key and under
  the environment's configured key. Report counts in the PR. This is read-only and no row is
  modified — **remediating anything found is out of scope** (§5) and becomes its own proposal, but
  S3 cannot be sequenced safely without the number.
- If the audit is impossible for a given database (no access), say which one and why in the PR
  rather than reporting a clean sweep. An unverified environment is an unknown, not a zero.

**Files:** `packages/db/src/crypto.ts` (two exports + doc comment), `packages/db/src/index.ts`,
`packages/db/src/pg/schema/index.ts`, `packages/db/src/crypto-guard.test.ts` (new),
`.changeset/<generated-name>.md`, `.env.example`. Optionally a read-only
`packages/db/scripts/audit-dev-key-ciphertext.ts` if the audit is worth keeping — commit it only if
it is genuinely reusable, not as a one-shot artifact.

**Definition of done (machine-checkable):**

```bash
cd packages/db && pnpm vitest run          # S1 matrix + the new guard test, all green
node -e "import('@minion-stack/db/crypto').then(m => \
  console.log(typeof m.assertCryptoKeyConfigured, typeof m.cryptoKeyMode))"   # → function function
cd ../.. && pnpm run ci                    # build-all + typecheck-all + lint-all + test-all + changeset:status
ls .changeset/*.md | xargs grep -l '@minion-stack/db'    # → the new changeset exists
rg -n 'MINION_ALLOW_DEV_CRYPTO_KEY' .env.example         # → documented, commented "local dev only"
rg -n 'MINION_ALLOW_DEV_CRYPTO_KEY' .env.defaults        # → ZERO hits (never defaulted on)
rg -n 'scryptSync' packages/db/src/ --glob '!*.test.ts'  # → exactly one file: src/crypto.ts
# guard test proves itself: add `const k2 = scryptSync("x","y",32)` to src/schema/index.ts,
# re-run the suite (must fail), revert. State in the PR that you did this.
```

---

### S3 — Consumers land it before they bump

**Tags:** `security`, `infra` · **Estimate:** 4–6 h · **Repos:** `minion_hub`, `minion_site`

**Goal:** by the time either app upgrades `@minion-stack/db`, every environment it boots in already
has a key — so the upgrade is a no-op in behavior and a step change in guarantee. This is the slice
that prevents the fix from being an outage.

**Sequencing is the substance here.** Merging S1+S2 to `main` triggers the release workflow and
publishes a new `@minion-stack/db` — but that publish is *inert*: hub and site upgrade only when
their own dependency bump lands. **The bump PR is the real deploy of this fix**, and it must not be
opened until the environment work below is done and verified. Say this explicitly in the S1/S2 PR
description so nobody helpfully runs `pnpm update` in a consumer repo.

**Do (in each of `minion_hub` and `minion_site`, on the live base branch — confirm with
`git -C <repo> branch -r`; note AGENTS.md's project map lists hub `dev` and site `master`, and
`2026-08-13-crm-customers-server-pagination-spec` reports hub's `origin/dev` was deleted, so trust
the remote over the table):**

1. **Set `ENCRYPTION_KEY` in every environment that lacks one** — Vercel preview *and* production
   scopes for both apps, any self-hosted/Docker staging, and CI. This is a secrets-console change,
   not a code change; record which scopes were already set versus newly set (this is also A1's
   answer). Use the same value per shared-DB group — hub and site share a database and must derive
   the same key or they cannot read each other's rows.
2. **Only where a real key genuinely cannot be provisioned** (a throwaway CI job with no secret
   access, a local `.env.example`), set `MINION_ALLOW_DEV_CRYPTO_KEY=1` explicitly and add a comment
   saying why. Prefer a per-environment random `ENCRYPTION_KEY` over the opt-in wherever the
   environment has its own database — the opt-in is a compatibility ramp, not a destination.
3. **Call `assertCryptoKeyConfigured()` once at server startup** (hub and site server entry / hooks
   boot path) so a missing key is a failed boot with a named error rather than a 500 on the first
   OAuth callback. Guard it so it runs server-side only.
4. **Then** bump `@minion-stack/db` in both repos, run each repo's full check + test, and deploy a
   preview first. Watch for the S1 `console.warn` in preview logs: **its presence means an
   environment is still on the dev key** — that warning line is the acceptance signal for step 1.
5. If S2's at-rest audit found dev-key ciphertext in a database these apps read, do **not** proceed
   past step 4 for that environment. Rows sealed under the dev key stop being readable the moment a
   real `ENCRYPTION_KEY` is set (GCM auth failure — the loud kind). That is key rotation, explicitly
   out of scope (§5): file the proposal, keep the opt-in set for that environment, and land steps
   1–4 everywhere else. ⚠️ A3.

**Files:** `minion_hub/.env.example`, `minion_site/.env.example`, each repo's server boot/hooks file,
each repo's `package.json` (`@minion-stack/db` version) + lockfile, and any CI workflow that boots
the app. Exact paths come from S0's consumer greps. **No `.svelte` file in either repo** — §5.

**Definition of done (machine-checkable, per repo):**

```bash
cd <repo> && <bun|pnpm> run check && <bun|pnpm> run test     # per AGENTS.md's command table
rg -n 'assertCryptoKeyConfigured' src/                      # → called exactly once, server-side
rg -n '"@minion-stack/db"' package.json                     # → the version published by S2
git diff --name-only <base>...HEAD | grep -E '\.svelte$' && echo "FAIL: UI out of scope" && exit 1
# boot proof, locally:
env -u ENCRYPTION_KEY -u MINION_ALLOW_DEV_CRYPTO_KEY <bun|pnpm> run build && <start cmd>
#   → fails to boot with the named error (NOT a silent start)                    ← the whole point
ENCRYPTION_KEY=$(openssl rand -hex 32) <start cmd>          # → boots clean, zero crypto warnings
# preview deployment logs for the bump PR: zero occurrences of the dev-key warning string
```

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `packages/db/src/crypto.ts` | S1, S2 | fail-closed `cryptoKeyMode()`; strict opt-in parse; warn-once; prod branch + message unchanged; `assertCryptoKeyConfigured()` export |
| `packages/db/src/crypto.test.ts` | S1 | set `ENCRYPTION_KEY` (it silently used the fallback — the red-state proof) |
| `packages/db/src/crypto-key.test.ts` | S1 | **new** — env matrix with `vi.resetModules()` isolation; both DoD paths |
| `packages/db/src/crypto-guard.test.ts` | S2 | **new** — anti-recurrence: one dev-key literal, one `scryptSync` site |
| `packages/db/src/pg/crypto.test.ts` | S1 | verify only — already sets a key; change nothing if green |
| `packages/db/src/index.ts`, `packages/db/src/pg/schema/index.ts` | S2 | re-export the two new symbols on the paths consumers already import |
| `.changeset/<name>.md` | S2 | `minor` — the consumer-facing behavior break, in prose |
| `.env.example` | S2 | document both variables; opt-in marked local-dev-only |
| `minion_hub`, `minion_site`: `.env.example`, server boot, `package.json` + lockfile, CI | S3 | boot assertion + dependency bump (paths from S0) |

**Zero DDL. Zero schema files. Zero `.svelte` files.** The ciphertext byte layout
(`scryptSync(key,'minion-hub-salt',32)`, `hex(encrypted||authTag)`, 12-byte IV) is untouched in
every slice — that is what keeps every existing row readable.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". This is a **shared-package** change with a
runtime contract, so the blast radius is real and is the reason S3 exists.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `@minion-stack/db` consumers (`minion_hub`, `minion_site`) | **Real, intended, breaking at runtime.** Any environment without `ENCRYPTION_KEY` and without the opt-in stops sealing/opening secrets | S3 lands env + boot assertion **before** the dependency bump; the S1 `console.warn` is the pre-flight detector; changeset states it explicitly |
| Shared hub↔site database | **None from this change** — no DDL, no column, no layout change. But both apps must derive the **same** key or they cannot read each other's rows | S3 step 1 sets one `ENCRYPTION_KEY` per shared-DB group; roundtrip case in S1's matrix anchors the layout |
| `packages/auth` | **None** — depends on `@minion-stack/db` but never imports crypto (verified: `grep -rn 'sealSecret\|ENCRYPTION_KEY' packages/auth/src` → zero hits) | re-run the grep at PR time |
| Other meta packages, `langgraph-server/`, `ops/`, `scripts/`, `supabase/` | **None** — verified in this checkout: no hit for `sealSecret`/`openSecret`/`ENCRYPTION_KEY` outside `packages/db/` | re-run the repo-wide grep at PR time |
| `minion/` gateway | **None expected** — the "sole key holder" decision (`2026-05-24-unified-user-identities-design`, reaffirmed in `-p3-wiring-plan` Option B) says `ENCRYPTION_KEY` is deliberately never shipped to the gateway, so it cannot be on this path | grep the gateway repo in S0; if it *does* import `@minion-stack/db/crypto`, that is a finding worth its own proposal — do not quietly widen S3 |
| `paperclip-minion`, `pixel-agents`, `minion_plugins`, `Minion Docs/` | **None** — own DBs / no dependency | — |
| Gateway WS protocol / `@minion-stack/shared` | **None** — no frame, event or REST contract touched | — |
| Public npm | The published `@minion-stack/db` gains a stricter runtime requirement | `minor` bump + changeset prose; the package has no known third-party consumers, but it *is* public — say it in the release note rather than assuming |

### ⚠️ A1 — the exposure inventory is unknown from here, and worth getting right

The proposal names "staging, preview, misconfig". I could not verify any of them from this repo, and
one common assumption may be wrong: Vercel builds/runs preview deployments with `NODE_ENV=production`,
which would mean hub/site previews are already on the *throwing* branch and the true exposure is
local dev, CI, self-hosted staging, and unset-`NODE_ENV` processes. **Treat that as a lead to check,
not a fact** — S0 settles it from the Vercel project settings and each deploy manifest. Whatever the
answer, it does not change the fix; it changes how surprising S3 is, and it is the number a reviewer
should see before approving. If it turns out the exposure was only ever local dev, say so plainly in
the PR — an honest smaller finding beats an inflated one.

### ⚠️ A2 — S3 needs repos this workspace does not have

`minion_hub/` and `minion_site/` are not checked out here. If the implementer of S1/S2 also lacks
them, S3 **cannot** be completed in that session. In that case: land S1+S2, do **not** open a
dependency bump in either consumer, and file one proposal per consumer repo describing steps 1–4,
plus the `TODO(handoff):` in `crypto.ts` required by the AGENTS.md ledger rule. A published package
that no one has upgraded is a safe resting state; a bumped consumer with an unset key is not.

### ⚠️ A3 — a real key and old dev-key ciphertext are mutually unreadable

If any environment already wrote secrets under `minion-hub-dev-key`, then setting a real
`ENCRYPTION_KEY` there makes those rows fail GCM authentication on read — loudly. This spec does not
create that problem (it exists the moment anyone sets a key today) and, per the proposal, does not
fix it: **key rotation is out of scope**. What this spec adds is the audit (S2) that tells you
whether it applies before S3 turns it into an incident, and the opt-in as a temporary ramp for any
environment where it does. If the audit finds affected rows, the honest sequence is: keep
`MINION_ALLOW_DEV_CRYPTO_KEY=1` in that environment, land everything else, and file the rotation
proposal with the row counts attached.

### ⚠️ A4 — availability trade, stated once, plainly

After S3, a deployment that loses its `ENCRYPTION_KEY` fails to boot instead of running with
plaintext-equivalent storage. That is the intended trade and the proposal's explicit ask. The
mitigations are in the design, not in a caveat: the error names both remedies, the boot assertion
makes it a deploy-time failure rather than a user-facing 500, and `ENCRYPTION_KEY` is already
required in production today — so no environment that is correctly configured *right now* can be
broken by this change.

## 5. Out of scope (explicit)

- **Key rotation** (the proposal's own exclusion) — no re-encryption, no `ENCRYPTION_KEY_PREVIOUS`
  dual-read, no migration of rows sealed under the dev key. S2 *counts* them; A3 says what to do
  with the count. Related and also excluded: `2026-05-26-auth-token-simplification` §R9's
  `BETTER_AUTH_SECRET` rotation pair — same problem shape, different secret, its own spec.
- **Changing production behavior** (the proposal's second exclusion). The `NODE_ENV === 'production'`
  branch and its **exact error string** survive unchanged; the only production-adjacent addition is
  refusing the new opt-in there, which preserves the existing guarantee rather than altering it.
- **The crypto scheme itself** — AES-256-GCM, scrypt, the `minion-hub-salt` constant, the
  `hex(encrypted||authTag)` layout, the 12-byte IV. All frozen; existing rows depend on them. Salt
  derivation, KDF parameters and envelope encryption are separate hardening proposals.
- **Validating `ENCRYPTION_KEY` strength** (min length, entropy, rejecting `changeme`). Tempting and
  cheap, but it is a *second* fail-closed policy with its own breakage surface, and a weak-key
  rejection landing in the same release would make S3's rollout ambiguous. Separate proposal.
- **A KMS / secret-manager integration** (Infisical already fronts these vars per AGENTS.md's env
  hierarchy; wiring `ENCRYPTION_KEY` through layer 2 vs layer 5 is an ops decision, not this fix).
- **`@minion-stack/db` §R6** (`servers.tokenHash` index, the O(n) decrypt) — same file, same package,
  same eventual republish, deliberately not bundled: it needs a schema change and this spec ships
  zero DDL.
- **Any UI.** No `.svelte` file in any repo ⇒ the `ui` tag and its governance gates (`lint:design`,
  `lint:tokens`, the ui-design-governance skill) do **not** apply, per
  `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **Auditing gateway-side or paperclip-side secret storage** for the same fail-open pattern. Likely
  worth doing — this bug class rarely appears once — but it is a sweep, not this fix. If S0's grep
  surfaces one, file it; do not absorb it.

## 6. End-to-end verification

Run with S1 + S2 merged in `minion-meta`, and S3 merged in each consumer (or A2's deferral recorded).

```bash
cd /home/agent/work

# 1. Gates (security/logic/test-tagged: no design/token lint — §5)
pnpm run ci                                  # build-all, typecheck-all, lint-all, test-all, changeset:status
git diff --name-only <base>...HEAD | grep -E '\.svelte$'          && echo "FAIL: UI out of scope"  && exit 1
git diff --name-only <base>...HEAD | grep -E 'packages/db/src/schema|drizzle/' && echo "FAIL: no DDL" && exit 1

# 2. The proposal's DoD, literally, from a clean process each time
cd packages/db
env -u ENCRYPTION_KEY -u MINION_ALLOW_DEV_CRYPTO_KEY \
  node -e "import('./dist/crypto.js').then(m=>{try{m.sealSecret('x');console.log('FAIL: sealed with no key')}\
catch(e){console.log('PASS:',e.message)}})"          # → PASS, message names both remedies
env -u ENCRYPTION_KEY MINION_ALLOW_DEV_CRYPTO_KEY=1 \
  node -e "import('./dist/crypto.js').then(m=>console.log('PASS opt-in:',!!m.sealSecret('x').ciphertext))"
env -u ENCRYPTION_KEY MINION_ALLOW_DEV_CRYPTO_KEY=1 NODE_ENV=production \
  node -e "import('./dist/crypto.js').then(m=>{try{m.sealSecret('x');console.log('FAIL: opt-in downgraded prod')}\
catch(e){console.log('PASS prod refuses opt-in:',e.message)}})"
ENCRYPTION_KEY=$(openssl rand -hex 32) \
  node -e "import('./dist/crypto.js').then(m=>{const s=m.sealSecret('hunter2');\
console.log('PASS roundtrip:', m.openSecret(s.ciphertext,s.iv)==='hunter2')})"

# 3. Layout is genuinely unchanged (the row-compatibility proof)
#    Seal a known string under a known key on the PREVIOUS published version of the package,
#    then open that exact ciphertext+iv with the new build under the same key. Must succeed.

# 4. Consumers boot-fail loudly and run clean (per repo, S3)
cd ../../minion_hub  && env -u ENCRYPTION_KEY -u MINION_ALLOW_DEV_CRYPTO_KEY bun run dev   # → named boot error
cd ../minion_site    && env -u ENCRYPTION_KEY -u MINION_ALLOW_DEV_CRYPTO_KEY bun dev       # → named boot error
#    then with ENCRYPTION_KEY set: both boot, and grep the logs for the dev-key warning → zero hits

# 5. The real-world assertion: a secret written by hub is readable by site and vice versa
#    (same shared DB, same key) — connect an OAuth identity in a preview environment, read the row
#    back from the other app. Proves S3 step 1 set ONE key per shared-DB group, not two.
```

**Ship gate:** §6 all green; the proposal's DoD checked clause by clause (opt-in required — step 2
case 2; `sealSecret()` throws otherwise — step 2 case 1; both paths tested — S1's matrix); the S1
red-state run pasted (proving the old suite ran on the dev key); A1's environment inventory and
A3's at-rest audit counts pasted, including any environment that could not be checked; step 3's
cross-version ciphertext compatibility confirmed; and — per §4b's `security` rule — a **human**
approval on the record, because a green command list is evidence, not a decision.
