---
phase: 14-sdk-transport
plan: "02"
status: partial
requirements-completed: []
verified: 2026-09-11
evidence: /home/nikolas/.cache/claude-tmp/14-02-k7q2xw/checks/
---

# 14-02 goal-backward verification

Self-verification by the executor against each must-have; root's independent review is still required. Every claim below points at a log or JSON under `checks/` and at exact base-branch identities; nothing rests on a declaration alone.

## Truth 1 — "Actual consumer seams complete the declared matrix; credential rotation and reconnect do not leak prior actor/tenant or duplicate effects."

| Consumer seam | Evidence | Verdict |
|---|---|---|
| Site `member-gateway.svelte.ts` (master `afb7f831…`, binds `onAuthenticated`) on installed archive C | `task1-site-fixture.log`: 25/25, exit 0; cases include same-client reconnect publishing a fresh session, retired close/send/history ignored, no double initialization on duplicate challenge/hello, no publish after disconnect during signing, one polling owner | **holds on exact installed bytes** |
| Paperclip `openclaw_gateway` seam (`gateway-client.ts` → installed 0.3.0) against an owned loopback `ws` server | `task1-paperclip-adapter-dir.log`: 10 pass + 2 expected-fail, exit 0. Rotation: server saw `["tok-A","tok-B"]`, retired client rejects with `not connected`/`disconnected`. Reconnect: old in-flight rejected `closed (1012)`, replayed old ids ignored, effect counter `[1]`, 2 connects. Duplicates settle once. Rejected connect → 4008, 1 socket, 1 connect, no retry. | **holds for lifecycle on old bytes; contract callback absent (named)** |
| Hub `gateway.svelte.ts` (master `e2b2cca1…`, 0 `onAuthenticated`) | fixture absent on master; `matrix-active-checkouts.json` hub row `adoption-required` with five missing markers; 14-09's 44-case candidate exists only in `/tmp` on archive A | **not completed — blocked by the named Hub adoption step** |
| Gateway (DEV) | archive G identity: sha256 `8c26fdc3…`, lock integrity recomputed and equal; `client.*` byte-identical to C | **identity-supported; no executed fixture in this plan** |
| Paperclip `minion-drone` | installed bytes graded only (`matrix-paperclip-snapshot.json`) | **not exercised** |

Negative cases named in the action: unknown/malformed object frames ignored (pass); `null` frame throws on every installed identity (`null-frame-probe.log`, recorded as a 14-01 gap, not hidden); response loss → timeout, no client-side retry, caller retry duplicates the effect (documented limit of the request path); unsupported combination fails clearly without destructive retry (pass).

## Truth 2 — "Every consumer is either passing on exact installed bytes or blocked by a named executable adoption plan; package declaration alone never counts."

| Consumer | Passing on exact bytes? | Named executable adoption step |
|---|---|---|
| Site | yes (C, 25/25) | parity decision only (packet §Site) |
| Gateway | by identity (G) | executable confirmation owed (packet §Gateway) |
| Hub | no | packet §Hub: 14-09 service/fixture landing + A→C/G identity migration + `package.json`/`bun.lock`/`deps/*.tgz` vendoring; check = identity script `supported` + fixture green |
| Paperclip ×2 | no | packet §Paperclip: both `package.json` + `pnpm-lock.yaml` + vendored tgz; flip `it.fails` → `it`, re-pin digest/member count, root `projects` entry |

"Declaration alone never counts" is enforced by the script (`consumer-installed-identity.test.mjs` case 2: complete declaration + old installed bytes → `adoption-required` with all five markers) — 9/9, `task2-node-test.log`.

## Artifacts

| Artifact | Provides | Location / hash |
|---|---|---|
| `minion_hub/src/lib/services/gateway.contract.fixture.ts` | exercise Hub against old/new fake servers | **not created** (ownership boundary + fixture absent on master) — gap |
| `minion_site/src/lib/services/member-gateway.contract.fixture.ts` | exercise Site | executed unchanged on master, `173465e0…` |
| `paperclip-minion/.../gateway-client.contract.test.ts` | exercise the actual registered adapter seam | snapshot candidate, hash in `checks/after.txt` |
| `.planning/phases/14-sdk-transport/14-ADOPTION-PACKET.md` | adopt exact archives through independently owned consumer transactions | active `.planning/`, hash in `checks/after.txt` |
| `scripts/qc/consumer-installed-identity.mjs` + test | installed-identity matrix with rejection of incomplete/unsafe manifests | snapshot candidate, hashes in `checks/after.txt` |

## Key links

- Site fixture → `member-gateway.svelte.ts`: read-first and executed (25 cases import the actual service and the installed client).
- Packet → `scripts/qc/package-consumer-matrix.mjs`: **that file does not exist** in the active meta checkout or on `origin/dev`/`origin/main` (12-03 has a PLAN but no SUMMARY; `scripts/qc/` holds only handoff-ledger, proposal-requirement-map, release-evidence, repo-truth). The packet links to the new `consumer-installed-identity.mjs` instead; 12-03's clean-consumer installation evidence is therefore not a prerequisite this plan could read.

## Not verified here

Real gateway authentication, browser mounting (14-06/14-18 own it), registry publication, license disposition, deployment, `minion-drone` runtime behavior, Hub candidate behavior on C/G bytes.
