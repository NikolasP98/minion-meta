---
phase: 14-sdk-transport
plan: "02"
status: partial
requirements: ["SDK-02", "SDK-01"]
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/14-02-k7q2xw
executed: 2026-09-11
owned_files:
  - path: scripts/qc/consumer-installed-identity.mjs
    location: snapshot MINION/ (candidate; not in the active meta checkout)
    before: ABSENT
    after: see checks/after.txt
  - path: scripts/qc/consumer-installed-identity.test.mjs
    location: snapshot MINION/
    before: ABSENT
    after: see checks/after.txt
  - path: paperclip-minion/packages/adapters/openclaw-gateway/src/server/gateway-client.contract.test.ts
    location: snapshot paperclip-minion/ (candidate)
    before: ABSENT
    after: see checks/after.txt
  - path: .planning/phases/14-sdk-transport/14-ADOPTION-PACKET.md
    location: active meta checkout .planning/
    before: ABSENT
    after: see checks/after.txt
  - path: minion_site/src/lib/services/member-gateway.contract.fixture.ts
    location: site origin/master (read and executed, NOT modified)
    before: 173465e0e7f56308d101bcad487afef6e548fb23efbfa4beef6a27c0f0d7b189
    after: 173465e0e7f56308d101bcad487afef6e548fb23efbfa4beef6a27c0f0d7b189
  - path: minion_hub/src/lib/services/gateway.contract.fixture.ts
    location: absent on hub origin/master; frozen 14-09 copy only in /tmp/minion-14-consumers-61p26r_z (not adopted)
    before: ABSENT
    after: ABSENT (not created — see gaps)
---

# 14-02 — Hub/Site/Paperclip consumer interoperability: adoption matrix

The exact consumer adoption matrix now exists as an executable script plus a packet ([14-ADOPTION-PACKET.md](14-ADOPTION-PACKET.md)). On the read base branches: **Site is supported on exact installed bytes** (archive C, 25/25 contract cases), **Gateway is supported by archive identity** (archive G, identical `client.*` bytes to C), and **Hub and both Paperclip adapters are adoption-required** with every missing callback named. SDK-02 stays open: two consumers remain on pre-contract bytes and the Hub consumer fixture was never adopted onto master. No commit, install into an active checkout, publish, deploy or lock edit happened.

Snapshots (detached worktrees, deps installed in-snapshot only): meta `origin/dev` `026afe8a`, site `origin/master` `0ed4e1b1`, paperclip `fork/minion-integration` `2abd5f7d5`. Hub `origin/master` `1df0a921` and gateway `origin/DEV` `e499c3f5` were read via `git show`/`cat-file` only. Runtime versions: `checks/freeze.json` (node v22.23.2, pnpm 10.15.0, bun 1.3.4; site vitest 3.2.6/vite 6.4.2/svelte 5.55.9/ws 8.20.0; paperclip vitest 4.1.8/ts 5.9.3/ws 8.21.0).

## Task 1 — actual consumers against fake servers

| Consumer | Command | Result |
|---|---|---|
| Site | `(cd minion_site && node node_modules/vitest/vitest.mjs run --config vitest.gateway-contract.config.ts src/lib/services/member-gateway.contract.fixture.ts)` in the snapshot after `bun install --frozen-lockfile`, `bun run i18n:compile`, `bunx svelte-kit sync` (all exit 0) | **25 passed / 25, 1 file, exit 0** (`checks/task1-site-fixture.log`, 19.4 s). Identity case pins C's `client.js` `6116b0a8…`/`client.d.ts` `339a7332…`; rune transform receipt `client:true, ssr:false`. Fixture bytes unchanged (`173465e0…`). The frozen 14-10 fixture had 22 cases; master's carries 25 (reporter-sink variants added by the merged gateway-errors work). |
| Paperclip `openclaw_gateway` | new `gateway-client.contract.test.ts` run from the adapter dir with a private root/include-only config (`checks/vitest.openclaw.config.mts`) after `pnpm install --frozen-lockfile --ignore-scripts` | **12 tests: 10 passed, 2 expected-fail, exit 0** (`checks/task1-paperclip-adapter-dir.log`); `tsc --noEmit -p packages/adapters/openclaw-gateway` **0 errors** (`checks/task1-paperclip-tsc.log`). Covers installed identity (0.3.0, `client.js` `624a59c8…`, 53 members, `openclaw_gateway` registration, no `minion_gateway`), challenge→connect→hello, token rotation, same-client reconnect after 1012 with replayed ids and effect counting, duplicate hello/responses, malformed object frames, cancellation, response-loss timeout + caller retry = second effect, rejected connect → 4008 + no retry. `it.fails` markers: `onAuthenticated` absent (pending adoption); `protocol: 99` hello accepted (pending 14-01). |
| Paperclip (plan's exact root command) | `(cd paperclip-minion && pnpm exec vitest run packages/adapters/openclaw-gateway/src/server/gateway-client.contract.test.ts)` | **No test files found, exit 1** (`checks/task1-paperclip-root-cmd.log`): root `vitest.config.ts` `projects` omits the openclaw-gateway package. Root-owned config; recorded as a gap. |
| Hub | `(cd minion_hub && … src/lib/services/gateway.contract.fixture.ts)` | **Not executable**: hub `origin/master` has neither the fixture nor `vitest.gateway-contract.config.ts`; the 14-09 candidate (44 cases on archive A) lives only in `/tmp/minion-14-consumers-61p26r_z/minion_hub` and was never adopted. Creating the fixture here would exceed the "extend frozen fixtures only after ownership release" boundary and would still run against registry 0.9.0 bytes that lack the hook. Executable substitute: identity script grades hub `adoption-required` with the five missing markers (`checks/matrix-active-checkouts.json`). |

Finding on every installed identity (paperclip 0.3.0, registry 0.9.0, archive C, archive G): a `null` JSON text frame throws `TypeError` in `handleMessage` after `JSON.parse` (`checks/null-frame-probe.log`); on the Node wrapper it is an uncaught exception inside the `ws` message listener (`checks/task1-paperclip-null-frame-crash.log`, the first run of the malformed-frame case). Unsupported combinations (rejected connect) fail clearly with 4008 and no retry — that part of the must-have holds.

## Task 2 — adoption packet and installed-identity script

- `scripts/qc/consumer-installed-identity.mjs` (snapshot candidate, ~230 lines, Node built-ins only): per consumer reads declaration → lock (`bun.lock` JSONC entry / `pnpm-lock.yaml` importer + packages entry) → vendored archive bytes (sha256, sha512 integrity, filename digest hint, in-archive `package.json` version via a gunzip+ustar walk) → installed `node_modules` bytes (version, member count, marker file digests) and grades installed bytes only against the 14-16 markers. Rejects unsafe paths (`..`, `.env*`) before reading and reports `invalid` for declaration/lock drift, missing lock/archive, filename-digest or integrity mismatch and installed-vs-locked/archived version drift. CLI: `--root`, `--only`, `--out`; exit 1 only on `invalid`.
- `node --test scripts/qc/consumer-installed-identity.test.mjs`: **9/9 pass, exit 0** (`checks/task2-node-test.log`): supported registry consumer, declaration-alone-never-counts, vendored-archive acceptance with real `tar`, filename-hint rejection, pnpm integrity/installed-metadata rejection, drift/missing/not-installed cases, importer-scoped pnpm parsing, unsafe-path refusal, matrix summary.
- Matrix runs: active checkouts (5 rows, all adoption-required, exit 0), Site snapshot (supported), Paperclip snapshot (both adapters adoption-required). Lock integrity check: gateway's vendored G bytes recompute to the exact `sha512-+4UqlY…` in `pnpm-lock.yaml`.
- Packet: identities of C and G (identical `client.js`/`client.d.ts`/`node/index.js`; `shells.js` differs by #374 payload predicates; `package.json` 0.9.0 vs 0.12.0), per-consumer rows and the exact manifest/lock/source/gate step per consumer.

## Deviations

- Paperclip test executed via a private config outside the repo (only `root`/`include`/`cacheDir`) because the plan's root command cannot discover the file; the file content is the deliverable, the runner shape is root's call.
- `pnpm install --offline` in the paperclip snapshot failed (store missed packages); the frozen online install then succeeded (`checks/paperclip-install.log`). Package installs are within the brief's network allowance.
- Meta snapshot deps were not installed (`node --test` needs no dependencies).
- Vite wrote a config temp file under `~/node_modules/.vite-temp` during the first (failed) paperclip config attempt; that directory pre-existed and is not part of any repo.

## Gaps and blocked items

1. **Hub consumer fixture not adopted** (blocks SDK-02): needs a root-owned Hub transaction landing the 14-09 service/fixture/config with A→C/G identity migration plus the manifest/lock vendoring step in the packet. Decision needed: C (Site parity) or G (gateway parity).
2. **Paperclip adapters on 0.3.0** (blocks SDK-02): manifest/lock transaction for both adapters (packet step); optional `onAuthenticated` adoption in `execute.ts` is a separate child plan.
3. **Gateway executable confirmation owed**: no DEV snapshot install/test was run here; support is by archive identity (lock integrity verified) and the base's type-only/validator imports.
4. **`null` frame TypeError on all installed clients** — 14-01 `envelope-contract.ts` work; exact-site `TODO(handoff)` in `packages/shared/src/gateway/client.ts` and the proposal entry are root-owned (outside this plan's files).
5. **Root vitest `projects` omits `packages/adapters/openclaw-gateway`** — root-owned paperclip config change.
6. `minion-drone` adapter has no behavior fixture (not in this plan's named files); graded by installed bytes only.
7. SDK-01/SDK-02 closure additionally requires registry publication (0.12.0 unpublished), license disposition, deployed-identity evidence — unchanged from 14-COMPATIBILITY.
