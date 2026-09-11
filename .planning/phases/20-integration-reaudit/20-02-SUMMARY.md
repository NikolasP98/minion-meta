---
phase: 20-integration-reaudit
plan: "02"
requirements: ["QC-02"]
requirements-completed: []
status: partial
snapshot: /home/nikolas/.cache/claude-tmp/20-02-02e72083
owned_files:
  - path: .planning/phases/20-integration-reaudit/20-RELEASE-PACKET.md
    before: absent
    after: 6626ef06c3e8209a2924ad6ddb8248ec1e9482a9cff7eb88f8c0c12aa85b7a34
  - path: scripts/qc/release-authority.test.mjs
    before: absent
    after: b41ad4c937f03150ab7248e0be2f5616fec47b3df59e8deb4d08c312f09b7cd8
  - path: scripts/qc/release-smoke.mjs
    before: absent
    after: 2eb799e51ea46b956dfce8fbdf56097073715eabbeb4548cf573c2a923e40884
  - path: scripts/qc/release-smoke.test.mjs
    before: absent
    after: ec86194e5ea2a1836c28ab744f04b064e2f5109fa6461b8e05254625505719cf
  - path: .planning/phases/20-integration-reaudit/20-DEPLOYMENT-VERIFICATION.md
    before: absent
    after: d2d41c573a285c0f9c820cca190ce1dc02c88129861852327edaeb856e656b4a
---

# 20-02: ready release packet + exact-identity smoke verifier (no action authorized)

All five owned files were created only in the private snapshot `/home/nikolas/.cache/claude-tmp/20-02-02e72083/MINION` (detached at the planning checkpoint `3869980944231433f392aa789da3af4c44f4cd91` = `origin/qc/360-checkpoint-20260911`, the same base 20-01 used, because `origin/dev` (`15714a57`) lacks `.planning/phases/20-*` and `scripts/qc/release-evidence.mjs`). Nothing was committed, staged, pushed, merged, published, migrated, restarted, promoted, or run against any host, registry or production endpoint. Receipts: `checks/before.txt`, `after.txt`, `freeze.json` (node v22.23.2, pnpm 10.15.0, bun 1.3.4, git 2.55.0), every gate log with its exit code.

## Task 1: per-environment release and rollback packet

`20-RELEASE-PACKET.md` names, for each environment, the immutable target, live identity, image ref/digest, services and tenants, additive migrations with preflight state, passed/pending/failed checks with evidence pointers, actions with their native trusted path and authority (all `null` = pending), read-only smoke probes, and the rollback path. Environments: `gateway-prd-netcup` (DEV `e499c3f5` train #282 → `:prd` digest, unpinned until built; automatic Deploy Gateway on the main push means merging main is the promotion), eleven `hub-pr-*` entries (heads read from `origin/<branch>` on 2026-09-11; #248 carries the five additive migrations incl. the `stk_entries` unique index whose D360-05 duplicate preflight is pending), `site-vercel-production` (done: `0ed4e1b`, `dpl_91CAPYnw4eFqjMp9cC3rtw8UWw3J`), and `meta-npm-minion-stack` (dev `15714a57`; `npm-auth` recorded as a **failed** check, E401). Factory interruption risk and containment activation are a separate section: nothing here invokes `deploy-exact.sh` or authorizes `FACTORY_PROMOTION_ACTIVATE_CONTAINMENT=1`. Authority ledger: 20 actions, all pending. Machine-readable block `json release-packet` is the only input the verifier reads.

Gate `node --test scripts/qc/release-authority.test.mjs`: 5 tests, 5 pass, 0 fail, 0 skipped, exit 0 (`checks/release-authority-unit-2.log`; the first run `unit-1` failed 1/5 on two test-side expectations — a missing rollback key yields `invalid-authority`, and the `Sec-WebSocket-Key` header text tripped a word scan — fixed in the tests, module unchanged). Cases: the real packet parses with zero ready/blocked actions, 16 `shells.*` catalog methods, 5 additive pending migrations, Site candidate == live, npm-auth failed; synthetic acceptance; 25 rejection paths (unknown fields, non-40-hex identities, alias-only digests, unknown action kinds, unknown required checks, manifest-supplied commands, non-additive/unsafe migrations, unknown probes, bad expects, duplicate environments, authority records outside `.planning/operations/360/authority/`, traversal, bad hashes, missing block, invalid JSON, capacity); recorded hash-pinned authority → `ready` only when every required check passed, else `blocked`; claimed-but-unverifiable authority (missing file, tampered bytes, other action/candidate/environment, empty grantor, extra fields) → invalid, never pending.

## Task 2: verifier and deployment verification

`scripts/qc/release-smoke.mjs` (238 lines): `parsePacket` (block extraction + strict schema), `authorityStatus`/`evaluateActions` (per-action `pending-authority` | `blocked` | `ready`, `executed: false` always), a fixed probe registry (`swarm-status`, `swarm-resolve`, `http-health`, `ws-upgrade`, `gateway-catalog`, `vercel-deployment`, `http-status`, `telemetry-attribution`) whose `command` strings tell the operator how to collect each receipt and whose `verify` functions check the receipt against the pinned identity, `smokeEnvironment` (verdict `verified` | `pending` | `failed`; `failed` names the rollback path and its authority state), CLI `--validate-only [packet]` (exit 0 valid / 2 invalid) and `verify --env --receipts [--output]` (exit 0 verified / 1 pending / 2 invalid / 3 failed; output written `wx`). It imports no child_process/net/http and never executes an action.

Gate `node --test scripts/qc/release-smoke.test.mjs && node scripts/qc/release-smoke.mjs --validate-only`: 6 tests, 6 pass, 0 fail, 0 skipped; validate-only `valid: true`, `releaseAuthorized: false`, `executed: false`, exit 0 (`checks/release-smoke-gate-2.log`). Cases: all eight receipt kinds pass on the exact identity; 18 contradiction fixtures (digest mismatch, replicas 0/1, missing service, alias resolve, unhealthy, HTTP/2 503 instead of 101, catalog missing `shells.invoke_durable`/`shells.get_outcome`, unexpected method, Vercel not READY / preview / other sha, wrong status, missing body marker, unattributed telemetry, no events, invalid JSON, wrong shape) → `failed` + rollback named; missing receipt / unpinned digest or commit / oversized receipt / empty probe list → `pending`; source has no execution surface; real-packet `--validate-only` exit 0; real gateway entry with no receipts → `pending`, exit 1, report not overwritten (exit 2), unknown verb exit 2.

`20-DEPLOYMENT-VERIFICATION.md` records that no authorized action existed, so none was executed; per-environment identity/authority/receipt state; locally verified Git facts (16 vs 14 `shells.*`, 5 train commits / 30 files / no migrations, hub heads, meta version skew); and the `verify --env gateway-prd-netcup` run with an empty receipts directory → `pending`, 7/7 `missing-receipt`, exit 1 (`checks/verify-gateway-no-receipts.json`).

`git diff --check` on owned paths: exit 0. Snapshot `git status`: only the five owned paths, untracked; 0 unrelated files.

## Deviations

- Base is the planning checkpoint `38699809`, not `origin/dev` (see above). The 20-01 outputs this plan reads (`20-INTEGRATION-VERIFICATION.md`, `integration-matrix.mjs`) exist only in the 20-01 snapshot; they were read from there and cited by path.
- The verifier consumes operator-collected receipts rather than probing hosts itself: this plan has no host, registry or production access and no authority, and a live collector could not be tested honestly here. Upgrade path (recorded, not built): a `collect` verb that runs exactly the registry commands once an operator with authority wants it.
- `.planning/operations/360/authority/` (the pinned authority-record root) is a convention introduced by the packet; no record exists and none was created.

## Gaps and blocked items

- **No authority exists for any action**: gateway train merge (needs green DEV matrix on `e499c3f5`; Linux shard 1 rerun pending), hub merges (owner `--admin`; ui-audit re-pins per branch; CI must be re-observed before each merge), hub #248 migrations (owner `bun run db:migrate` after the read-only `stk_entries` duplicate preflight), npm publish (NPM_TOKEN rotation), and every rollback. These are decision/credential gates for the owner; the packet is ready for them.
- **Unpinned identities**: gateway `:prd` digest (not built), hub squash shas (not merged) — the packet pins the PR heads and requires tree equality with the squash commit; root pins the derived shas into the `vercel-deployment`/`telemetry-commit` probes before `verify`.
- **Candidates without a gate receipt at their current head**: hub #248 `f86093d6` (matrix ran at `b055798e`), hub #257 `936aac92` (not in the 20-01 manifest), gateway `e499c3f5` (matrix ran at `03239087`; DEV CI is the candidate-identity check), meta `15714a57` (matrix at `a018d672`). Re-running the 20-01 fixed registry on these heads is a 20-01-owned step.
- **Not encoded**: gateway signed-actor denial receipt (unauthenticated `shells.invoke_durable`) and OTel attribution for the new revision — recorded as pending in the packet text.
- **Site re-verification probes were not run** (no network); Codex's production receipts in `RELEASE-2026-09-11.md` remain the record.
- QC-02 is not closed.
