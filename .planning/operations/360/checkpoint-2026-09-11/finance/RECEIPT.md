# 15-07 finance parser binding — private candidate handoff

Candidate: `/home/nikolas/.cache/minion-qc/finance-binding-3xx5pb49/minion_hub`.
Disposition: five-file implementation frozen for root independent review; no active adoption or release. Implements approved D360-20. Root owns canonical plans, SUMMARY, proposal, runtime session and aggregate checks.

## Scope and identities

The ordinary copy starts from the complete 10x delivery tree, immutable Git base `1df0a9216ad3f7f85d989eb59cfccb779d9f7285`, including its original 39 staged overlays. Only the qualified PR246 parser/test were overlaid before integration; the unfenced PR246 service was not copied. `source-copy.json`, `parser-overlays.json` and `before/` preserve origins. There are 813 individual dependency links; no package/lock/helper/migration/config from the product was changed.

Final SHA-256:

- `src/server/services/finance-statements.service.ts`: `6ead6392d42dd3123dd91cb4c1f0962d6f83aeec5cb9fb15fc70885dbac0e27a` (23068 bytes).
- `src/server/services/finance-statements.service.test.ts`: `d235096733d0728852c1afbe1b4ad8ec54af6ce4f5a08bc2b20f28f194171846` (16799 bytes).
- `src/server/services/finance-statements.effect-ownership.sql.integration.test.ts`: `37b42f0529ed5e482924cf3374c68f92a7fed211c9414810f3579779f5c029d8` (33932 bytes).
- `src/server/services/finance-statement-parser.ts`: `e312345dea8a2cd51cec4e16051ec898fa6a25e8cf7b430c30c4e83d6a335547` (24096 bytes).
- `src/server/services/finance-statement-parser.test.ts`: `81380d728a0f58f3ff9596b40d39906d4c86af0099466bc18ad81361ad96b6d4` (21743 bytes).

The native41/unit102/typecheck execution preceded only the root-admitted service comment clarification. Its exact five executed source copies and hashes are in `evidence/executed-native-source/` and `executed-native-owned.json`; executed service SHA was `41f745a828fc8bcd67250abb35dc3f03be7dc037f1aaa4dc178d0917c63fb9da`. Actual TypeScript comment-free emit is identical for all five final files, and the parser emit remains identical to qualified v3. `final-comment-format-parity.json` records this and actual installed Prettier API equality. The standalone lexical scanner was rejected as unsuitable for template rescanning; it was not used to declare service parity.

## Resulting contract

- New imports, retries and source request identities bind exported parser version3. Nonterminal v1/v2 imports conflict before fetch or persistence, including a version change observed again under the existing request lock. Historical retry returns fixed409; no automatic upgrade, backfill, cursor reset or row rewrite.
- Historical done/failed work preserves stored outcomes; old completed imports can be read without re-parsing or relabeling their rejection samples. Same-version retries preserve existing resume/cancellation/takeover behavior.
- Raw stored bytes must match `contentSha256` before parsing/accounting-row writes. Existing owned failed-import status persistence is preserved for source corruption; this is not a claim of zero domain writes on corruption. Stale identity and bad returned parser provenance conflict outside that failure persistence path.
- Returned parser version and SHA of normalized decoded input are checked before persistence. Raw byte SHA and normalized text SHA remain distinct, including BOM/CRLF. No normalized provenance database column was added.
- Header and limit errors are reconstructed from bounded allowed reason codes. Arbitrary exceptions and mutated typed error messages cannot expose statement text. Native GET status route tests assert serialized header failures; auth/module/tenant surroundings remain synthetic.
- Native fixture cleanup rolls back the setup owner, uses a fresh registered cleanup connection, drops only its owned random schema, and closes the harness in finally. Original setup errors are retained if cleanup itself fails.

## Verification

| Receipt | Outcome |
|---|---|
| Existing service + qualified parser overlay | 73/73 baseline controls, 3.50s |
| New integration regressions before repair | 29 failed /71 passed; one new sourceRow assertion was an incorrect fixture expectation and is excluded as product evidence |
| Final focused unit/parser | 102/102 (42 service + unchanged60 parser), zero skips, 3.11s |
| First admitted native PostgreSQL run | 41/41, zero skips, 6.22s; original19 controls preserved plus22 binding cases |
| Native network guard | 5 permitted loopback connects,0 denied attempts |
| Strict diagnostic TypeScript | exit0, no diagnostics; scoped config with real app/Svelte declarations |
| Final actual Prettier API / whitespace | all5 equality checks / clean diff --check |
| Cleanup audit | correct marker/user/database;0 owned schemas,0 fixture connections; audit connection closed |

`baseline-controls.log` records a setup-only temporary-disk quota failure before collection. The corrected run uses private TMPDIR. `binding-green-initial.log` retains the incorrect sourceRow fixture failure; correction preserves existing logical row2. `format-write.log` was an ineffective hidden-path CLI attempt and is not formatting evidence; `format-api.json` and final parity are. The initial TypeScript failure was a fixture MaybePromise callback, fixed with async. No tests were skipped to make these pass.

Native tests cover old-version/status/cursor combinations, retry races, terminal outcomes, actual normalized parser provenance, content-free header/limit errors and late owned failures. Existing501-row resume, lease fencing, cancellation, undo/retry ABA, CAS rollback, lost-handler-response and RLS cases remain. No process/backend/connection fault injection or provider calls occurred.

## Reproduction

Run from the candidate product root. Use the exact reviewed configs/guards, not the default product config. All runs use the existing Node22.23.2 and installed Vitest4.1.10, private real caches and TMPDIR. The following shell variable is task-specific and contains only this private path:

```sh
finance_qc=/home/nikolas/.cache/minion-qc/finance-binding-3xx5pb49
cd "$finance_qc/minion_hub"
timeout 120s env -i PATH=/usr/bin:/bin HOME="$finance_qc" TMPDIR="$finance_qc/tmp" LANG=C.UTF-8 node --max-old-space-size=768 --import "$finance_qc/network.mjs" node_modules/vitest/vitest.mjs run --config "$finance_qc/unit.config.mjs" --configLoader native
timeout 120s env -i PATH=/usr/bin:/bin HOME="$finance_qc" TMPDIR="$finance_qc/tmp" LANG=C.UTF-8 MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node --max-old-space-size=768 --import "$finance_qc/native-network.mjs" node_modules/vitest/vitest.mjs run --config "$finance_qc/native.config.mjs" --configLoader native
timeout 120s env -i PATH=/usr/bin:/bin HOME="$finance_qc" TMPDIR="$finance_qc/tmp" LANG=C.UTF-8 node --max-old-space-size=768 node_modules/typescript/bin/tsc --project "$finance_qc/types.json"
```

Native runtime is root-owned PostgreSQL17.10 at `/home/nikolas/.cache/minion-qc/postgres-15-07-vey_bjtn`, literal127.0.0.1:55439, database `minion_qc_jobs_stock`, owner `minion_qc`, marker `minion-360-disposable:v1`. `native-database-identity.json` pins its identity. Root session74436 remains running for independent review. Old/tmp cluster untouched. Exact fixture/config/guard/helper/migration identities are in `native-admission-inputs.json`; raw runtime/cleanup evidence remains alongside logs.

## Preservation and limits

`preservation-final.json` proves 2,810 unowned snapshot files unchanged, all813 dependency link targets/package manifests unchanged, all three original HEADs and recorded source files unchanged, and original10x39 staged paths plus Git blob bytes unchanged. Raw index byte hashes changed in all three source repositories since the earlier read-only inventory; cause is unestablished. No index-writing command was used by this executor. Do not claim raw index identity or recursive installed dependency-content hashing from this receipt.

Root independent review/replay and the complete selected delivery artifact remain pending. Canonical native test-lane configuration still excludes finance; this private explicit lane does not adopt that configuration. Full Hub check, production migration/old-worker drain and historical recovery UI/operation are outside this five-file slice.

Exact-site follow-ups retained for root proposal:

- Service line272: streamed byte limit must precede arrayBuffer allocation; parser character limits apply afterward. Measure repeated full fetch/parse on each500-row persistence chunk and eligible status reads. Existing “cheap” comments were replaced with measured-scope wording. No behavioral repair is claimed.
- Service line529 and parser version documentation: historical version replacement/recovery needs a separate explicit data contract; D360-20 currently selects fixed409, preserving historical rows. Durable storage of normalized parse provenance remains separate.
- Existing service orphan-upload and job-failure/status TODOs remain unchanged; root maintains the corresponding proposal.

No release, source application, staging, package install, live database or external telemetry action was performed.
