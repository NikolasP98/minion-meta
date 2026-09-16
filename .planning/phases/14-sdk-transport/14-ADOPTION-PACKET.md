---
phase: 14-sdk-transport
plan: "02"
type: adoption-packet
status: matrix-complete-adoption-pending
requirements: ["SDK-02", "SDK-01"]
requirements-completed: []
generated: 2026-09-11
evidence: /home/nikolas/.cache/claude-tmp/14-02-k7q2xw/checks/
---

# `@minion-stack/shared` consumer adoption packet

What every consumer actually installs today (by digest, not by declaration), what the 14-08/14-16 contract requires, which callbacks each installation is missing, and the exact per-consumer adoption step. Produced on read-only base branches and private snapshots; nothing was installed into, committed to, published from or deployed to any active checkout.

Executable form: `node scripts/qc/consumer-installed-identity.mjs [--root <meta>] [--only id,id] [--out file]` (candidate at the snapshot `MINION/scripts/qc/`, test `node --test scripts/qc/consumer-installed-identity.test.mjs` 9/9). The script reports four separate identities per consumer — declared specifier, lock resolution, vendored archive bytes, installed `node_modules` bytes — and grades only the installed bytes. Its statuses are `supported`, `adoption-required` (named missing markers), `not-installed`, `invalid` (unsafe or inconsistent manifest: declaration/lock drift, missing archive, filename-digest or lock-integrity mismatch, installed version ≠ locked/archived version).

## Contract required by 14-16 (installed-bytes markers)

| File in installed package | Required content | Origin |
|---|---|---|
| `dist/gateway/client.d.ts` | `onAuthenticated?:` per-handshake session hook | 14-08, meta #376 |
| `dist/gateway/client.js` | `PROTOCOL_VERSION = 3`, `notifyAuthenticated` | 14-08 |
| `dist/gateway/shells.js` | `'shells.invoke_durable'`, `normalizeShellsInvokeDurableResponse`, `negotiateShellDurableOutcomeVersion` | 14-13, 14-16, meta #374 |

Archive identities that carry every marker (all 44 ordinary members):

| Archive | SHA-256 | sha512 (lock integrity form) | metadata version | `client.js` | `client.d.ts` | `shells.js` |
|---|---|---|---|---|---|---|
| C — Site vendored `deps/minion-stack-shared-0.9.0-qc-d01a528579e7.tgz` | `d01a528579e7b0877d05565b9d3ad2747ab45610d634948f51b6a25b4bf4f756` | `sha512-ko7EXUOtGY79Z46b1SHMUtVNbRalNhLqwHfZa6+JrX3O3ij+hRU2l9TGpKLFT9KYC8hI8x7SiLLidkHZ49KY5g==` | 0.9.0 | `6116b0a8…6386d` | `339a7332…bf46` | `bd8ef47b…d671a` |
| G — Gateway vendored `deps/minion-stack-shared-0.12.0-qc-8c26fdc3.tgz` | `8c26fdc3c0e80336e03b8c837cf6dc08c9c4e52e78be5baa2451a6c386a780ce` | `sha512-+4UqlY0K1oK0BahtBi8QCd8MS/hTGM21mScc55YqBK/4PnxckEad8lLIkaWzA1oeLb4kTLXM+FZY0hqffdI1fQ==` (matches gateway `pnpm-lock.yaml:2126`) | 0.12.0 | `6116b0a8…6386d` (identical) | `339a7332…bf46` (identical) | `6790b07b…980a` |

C and G differ only in `package.json` (version) and `dist/gateway/shells.js`: G's `isShellsDeltaEvent`/`isShellsFinalEvent` validate the payload shape (meta #374 stricter predicates); C's check only `type`/`event`. `dist/node/index.js` (`829ba718…`) and `dist/index.js` (`7d63b3a0…`) are identical. Registry `@minion-stack/shared@0.12.0` is unpublished (RESUME-2026-09-11); G is a private digest-qualified file dependency, not registry 0.12.0.

## Consumer matrix (bases read 2026-09-11)

| Consumer | Base identity | Declares | Lock resolves to | Installed bytes graded | Missing vs contract | Status |
|---|---|---|---|---|---|---|
| **Hub** `minion_hub` | `origin/master` `1df0a9216ad3f7f85d989eb59cfccb779d9f7285` (PR #245) | `^0.9.0` (registry) | `@minion-stack/shared@0.9.0`, `sha512-oImoUxBYUGpBcYudNIPiJ9k8on/oYYbanJqENoRgP9QuSpPSuKq01k/uQ0+6G1bS1AsV+owehYA9ltXnqulv+w==` (hex `a089a853…6ffb`) | registry 0.9.0 from the bun cache / active `node_modules`: 93 members, `client.js` `082e7c38fa050ceffbcb6e500b8ed2123a1856526c9cbdbad292d165280227bc`, `client.d.ts` `123346b6…3b1b`, `shells.js` `ee157835…9abb` | `onAuthenticated?:`, `notifyAuthenticated`, `'shells.invoke_durable'`, `normalizeShellsInvokeDurableResponse`, `negotiateShellDurableOutcomeVersion` | **adoption-required**; service `gateway.svelte.ts` on master (`e2b2cca1…1f10`) has 0 `onAuthenticated` uses — it is the pre-14-09 consumer |
| **Site** `minion_site` | `origin/master` `0ed4e1b16cef4ca9287314df5af58a8af17f537c` (PR #31) | `file:deps/minion-stack-shared-0.9.0-qc-d01a528579e7.tgz` | same file specifier (bun.lock:215, no integrity for file deps) | snapshot `bun install --frozen-lockfile`: 44 members = archive C exactly; markers 1/1, 2/2, 3/3 | none | **supported** — 25/25 contract cases pass on these bytes (`checks/task1-site-fixture.log`) |
| **Gateway** `minion` | `origin/DEV` `e499c3f50b72c4f12b6f874e0e9ad97d823b1317` (#285) | `file:deps/minion-stack-shared-0.12.0-qc-8c26fdc3.tgz` | same; integrity `sha512-+4UqlY…` = recomputed sha512 of the vendored bytes | archive G (base not snapshot-installed here; the active `fix/ci-cost-remaining-gaps` checkout still installs registry 0.6.0 `client.js` `624a59c8…`, no `shells.js`, and reports adoption-required) | none at the base; the gateway imports only types/`isCacheInvalidateEvent`/shells validators, never `GatewayClient` | **supported at base by archive identity**; no gateway snapshot fixture was executed by this plan (14-14/14-12/14-17 receipts cover the facade/receiver/caller on archive B, not G) |
| **Paperclip `openclaw_gateway` adapter** `paperclip-minion/packages/adapters/openclaw-gateway` (registered at `server/src/adapters/registry.ts:400` as `type: "openclaw_gateway"`; no `minion_gateway` registration exists) | `fork/minion-integration` `2abd5f7d5c63f8850f6aee989675c0b93e2bd865` | `^0.3.0` (registry) | `0.3.0(ws@8.21.0)`, `sha512-TXjlIhRzIDpPkYkMZnjF1GjujvmVxvhUnSOuekMR1ieDSiVpqDjJVw8OU6NWlTUZLqoB7zGA3sJQ77Y1qrHPOA==` | snapshot `pnpm install --frozen-lockfile --ignore-scripts`: 53 members, `client.js` `624a59c8bfaa2370b27a9af5921da621838be127e935d91d411d1b7495ee794d`, no `dist/gateway/shells.js` | `onAuthenticated?:`, `notifyAuthenticated`, `shells.js` absent | **adoption-required**; behavior on installed bytes: 10 pass + 2 expected-fail (`checks/task1-paperclip-adapter-dir.log`) |
| **Paperclip `minion-drone` adapter** `packages/adapters/minion-drone` (`src/server/gateway.ts` → `createNodeGatewayClient`, `autoReconnect:false`) | same | `^0.3.0` | same 0.3.0 entry | same 53-member 0.3.0 bytes | same as above | **adoption-required**; no fixture executed (outside this plan's named files) |
| `@minion-stack/workforce-client` (Hub `^0.3.0`, lock `sha512-6lOD60…`) | — | does not depend on `@minion-stack/shared` (only `jose`) | — | — | not a shared-package consumer | out of this matrix; listed so the inventory is complete |
| `packages/shells-bridge` (meta) | `workspace:*` | source-linked, never an archive | — | — | not an installed-archive consumer | out of scope; 14-12/14-17 own it |

Consumer matrix runs: `checks/matrix-active-checkouts.json` (active checkouts, all five rows adoption-required — note the active Site `dev` checkout still declares `^0.9.0` unlike `origin/master`), `checks/matrix-site-snapshot.json` (Site base: supported), `checks/matrix-paperclip-snapshot.json` (both adapters: adoption-required).

## Behavior found on installed bytes (applies to every graded identity)

`checks/null-frame-probe.log`: a text frame whose body is `null` passes `JSON.parse` and then throws `TypeError: Cannot read properties of null (reading 'type')` inside `GatewayClient.handleMessage` on **all four** installed identities (paperclip 0.3.0, registry 0.9.0, archive C, archive G). In the Node wrapper this surfaces as an uncaught exception inside the `ws` `message` listener (`checks/task1-paperclip-null-frame-crash.log`); in browsers it is a listener error. This is the "parsed null" gap 14-COMPATIBILITY assigns to 14-01 (`envelope-contract.ts`); it is not fixed by adopting C or G. Root owns the exact-site `TODO(handoff)` in `packages/shared/src/gateway/client.ts` and the proposal entry — neither file is in this plan's ownership.

Other behavior facts recorded by the Paperclip contract test on 0.3.0 bytes: rejected `connect` fails clearly, closes with 4008 and never retries with `autoReconnect:false` (1 socket, 1 connect); token rotation across clients presents only the new credential and rejects retired work; same-client reconnect after a 1012 drop rejects old in-flight work, ignores replayed old ids and does not duplicate effects; duplicate hello/responses settle once; `close()` rejects pending work; a lost response times out and **a caller retry is a second server effect** (no idempotency key on this request path); a hello advertising `protocol: 99` is accepted (no runtime protocol validation; `it.fails` marker pending 14-01).

## Adoption step per consumer

Each step is a separately owned manifest/lock transaction; root grants one manifest writer per repo. Nothing below was executed.

### Hub (blocking for SDK-02)

1. Service: land the 14-09 candidate service/state (`/tmp/minion-14-consumers-61p26r_z/minion_hub/src/lib/services/gateway.svelte.ts` `50c4ac22…5110`, 476 diff lines against master) with its 44-case `gateway.contract.fixture.ts` (`c72e008d…7541`) and `vitest.gateway-contract.config.ts` (`16b5100b…918a`). That snapshot installed archive A (121 members, `client.js` `9fd0783b…d474`), which predates the durable contract; the fixture's hardcoded A hashes must migrate to the adopted archive's exact hashes (identity migration, not relaxation), as Site did in 14-18.
2. Manifest/lock: `package.json` `@minion-stack/shared` → `file:deps/minion-stack-shared-<version>-qc-<sha256[0:12]>.tgz` vendoring the chosen archive (C for byte-parity with Site, or G for parity with the gateway — root decision; the `client.*` bytes are identical either way), `bun.lock` regenerated with `bun install`, `deps/README.md` row added. Then `node scripts/qc/consumer-installed-identity.mjs --only hub` must report `supported` and the migrated fixture must pass with the dedicated config (`node node_modules/vitest/vitest.mjs run --config vitest.gateway-contract.config.ts src/lib/services/gateway.contract.fixture.ts`).
3. Gates: full native `bun run check`, route-contract counts, ui-audit baseline re-pin (any `src/routes` change), no `bun run test` unscoped with a production `SUPABASE_DB_URL` in the environment.
4. Not evidenced by this plan: browser/mounted-page pairing (14-06 owns component enforcement), deployed identity.

### Site (supported at base; parity decision open)

- Base already installs C and passes 25/25. The only open adoption question is byte parity with the gateway's `shells.js` (G). If root selects G everywhere: same three-file transaction (`package.json`, `bun.lock`, `deps/*.tgz` + `deps/README.md`), then re-run the 25-case fixture — its identity assertions pin `client.js`/`client.d.ts` (unchanged between C and G) so only the archive-name/`package.json` assertions move. Site's `member-gateway.svelte.ts` on master (`afb7f831…da9a`) = frozen 14-10 service (`fb7a2a48…b823`) plus the `GatewayFailureTracker` integration from the later gateway-errors PR; the service still binds `onAuthenticated` once (verified on master).

### Gateway (supported at base by identity)

- Nothing to change for the client contract. Executable confirmation still owed: a DEV snapshot `pnpm install --ignore-scripts` + `node scripts/qc/consumer-installed-identity.mjs --only gateway` (expect `supported`, 44 members) and the 14-14 facade tests against G rather than archive B. The active `fix/ci-cost-remaining-gaps` checkout is not the base and still installs registry 0.6.0.

### Paperclip `openclaw_gateway` and `minion-drone` adapters (blocking for SDK-02)

1. Manifest/lock (one transaction, both adapters): `@minion-stack/shared` `^0.3.0` → `file:../../../deps/minion-stack-shared-<version>-qc-<sha256[0:12]>.tgz` (or a published registry version once 0.12.0 exists) in both `package.json` files; `pnpm install --frozen-lockfile=false` to regenerate `pnpm-lock.yaml` importer entries and the `packages` entry with integrity; peer `ws ^8.21.0` already satisfied.
2. Source: neither adapter passes `onAuthenticated`; both use `connect()` + `autoReconnect:false`, so the hook is optional for their lifecycle. Adoption is byte-level only unless root wants session publication in `execute.ts` (separate child plan).
3. Gates: flip `it.fails("installed client exposes the per-handshake onAuthenticated hook …")` in `gateway-client.contract.test.ts` to `it`, update the pinned `client.js` digest and member count (53 → 44 for C/G), rerun (expect 11 pass + 1 expected-fail for the protocol-99 case until 14-01 lands), `tsc --noEmit -p packages/adapters/openclaw-gateway`.
4. Runner gap: the root `vitest.config.ts` `projects` list omits `packages/adapters/openclaw-gateway`, so the plan's `pnpm exec vitest run packages/adapters/openclaw-gateway/...` finds no test files (`checks/task1-paperclip-root-cmd.log`). Add the project to the root list (root-owned file) or give the adapter its own `vitest.config.ts`; this plan ran the file with a private config whose only role is `root`/`include` (`checks/vitest.openclaw.config.mts`).
