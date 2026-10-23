# C security-fixture correction: independent review

**Standards: PASS for the frozen source correction. Spec: PASS for this technical source-fixture refinement and full 84-item implementation continuity.** No C source correction is requested. The existing remote security failure is not cleared by this report: root must rewrite only the owned draft feature history, scan every actual rewritten commit with the unchanged gate, refresh final provenance and obtain new-head CI. This review authorizes neither merge nor deployment.

## Frozen candidate

Reviewed HEAD `53726013ba7347d0488478272df44561cf4b5c5d`, base `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`, branch `feature/agent-harness-c-gateway`; parent identifies draft PR356. Frozen manifest SHA256 `5cdf759483b20dc3f34f757fcbc990213cf4f6d6c5d49b78fa4d7602a303fdf8`. Candidate patch `cf1e66db73656b52fed5eb80ac36bcab6e52447fdf9a8f336b2940264af9011b`; correction patch `8c6e4058d476b6ebb655193e51811b3158c3589519dbb76bf80dd9de0eccc91a`.

Independently checked all 67 present files and modes, absence of all three replaced `.json` source paths, all packet artifact hashes, four lock/installed Drone pins and all 20 preserved installation-wrapper changes. The previous 58 unaffected feature paths equal their original committed blobs. Every stored original fixture/test copy equals the current committed pre-correction blob. The only additional change since the prior final C review is the already-committed changelog PR356/author annotation; its behavior text is unchanged. `identity.json` records exact checks. No source/spec/task/index/Git ref, commit, staging, branch, package or dependency mutation was performed by this verifier.

## Standards and security policy

Six occurrences of explicit dummy credentials in five test files are `stub`, `stub-only` or `fixture`, within mocked credential providers or the existing invalid-domain child-process fixture. Exact inline comments identify these values. One exact inline comment identifies the captured public wire checksum. Four comment-only files have identical complete TypeScript AST leaf tokens.

Three repository-owned source fixtures become JSONC, with exactly 97 nextline comments: five in the single receipt fixture, ninety across all 18 retry records, and two public Git/patch provenance values in the Pulse capture. Each comment targets one immediate, named public hash property. No file-wide ignore, blanket regex filter, dynamic credential exception or broader scanner exclusion is introduced. Together with six dummy credentials and the wire checksum, all **104 individual annotated occurrences** remain visible in allowlisted-only scanner audit. These occurrence counts are distinct from the CI detector's deduplicated finding count.

The unchanged baseline is `5b46d18ce69fc2706f6b2e23dcfc65249dd32fbb832873216267483f791e9e00`; unchanged security script is `a8125d6b52f367003419fadc127c0a7dd5b7fc5d8415642ba1aa1ecb534fac27`. Both match base and current HEAD. The script still scans every commit, rejects self-baseline changes outside its existing exact audited exception, validates checkout identity, and treats findings as fatal. No product-branch baseline update or additional audited-baseline PR is needed or proposed.

Only two trusted test loaders import the already-declared direct `json5` dependency. Paths are fixed repository-local fixture URLs. The receipt test still validates actual exported records with the unchanged production schema and compares every record; its update mode retains exact hash annotations. The cron test reconstructs strict JSON and checks the original captured byte checksum before driving actual handlers/store/execution. No production parser, F public reader, package or lock change occurs. The existing typed capture assertion is preserved. Independent AST comparison found all **38 receipt-test and 29 cron-test assertion statements unchanged**, apart from the explicitly intended local fixture decoder name.

## Independent bounded proof

`independent-equivalence.cjs` decodes current fixtures, compares them to original committed strict JSON, validates all 19 receipt records against the production schema, independently reconstructs original formatted strict bytes, and checks retry-regeneration comments. Results:

| Fixture | Strict original/reconstructed SHA256 | Result |
|---|---|---|
| Single receipt | `90e2509a53ad5bc8ee9bb79d1b641cd8382a3e46b013e84b009fb3aef52ea565` | Exact decoded values and bytes; 1 record |
| Incremental retry receipts | `f7eecd61e3ac7bc7128851e14b72d537ba27f8565210101892950672e41736b9` | Exact decoded values and bytes; all 18 records |
| Actual D two-profile wire | `63be47ba3e431c6079f314059736fa3013dc6e5c23bbda23a048487293ee215b` | Exact decoded values and bytes; independently equals the original D capture |

Production schema SHA `08897441bc823a5c6cb265065ba6a3cfb102b7fb7751a4e2f6aaf283f041c6ff` and exporter SHA `957644df067c92ac1337129bcfd903b18c13baa09e5058f327dc762bbd16951c` remain unchanged. Public emitted JSON and the F data contract remain strict JSON. JSONC is a source fixture representation, not a public schema relaxation. Root owns any source-path/SDD qualification note and final C/F artifact binding after rewrite.

`independent-scanner.py` uses cached exact detect-secrets **1.5.0**, fresh default settings for each invocation and denied networking. All 67 current candidate files have zero findings; allowlisted-only checks rediscover the exact 104 annotated occurrences. I then replayed the unchanged full-range shell script against the existing two-commit scratch fixture without changing its Git state. Its first actual hook invocation scanned all 67 frozen candidate blobs and exited **0**; its second scanned the separate known-fake canary and exited **1**. The full command correctly exits 1 for that canary history. The instrumentation records original hook exits without altering flags, filters, baseline or return status. Raw output is retained mode 0600. This establishes positive acceptance and negative detection, not a pass for the still-unrewritten actual C history.

## Supplied runtime and scoped-gate evidence

I inspected the frozen terminal receipts/logs: nine-file formatting passes; six-file type-aware lint passes with zero warnings/errors; actual receipt/authority/usage tests pass 20, actual cron-loader tests pass five, host tests pass two, and the unchanged quiet suggestion-recovery rerun passes three. That is **30 terminal focused passes**. These are developer-executed runtime tests whose exact source/logs were independently checked, not tests rerun by this verifier.

The first suggestion run's three failures remain preserved: two hard test timeouts and one barrier polling timeout. Root reported a host suspend/wall-clock transition during the window; causal attribution to that event, CPU pressure or a functional defect is not established here. The quiet rerun exited 0 in 43.559 seconds, with all three real child-process cases passing. All 67 pre/post source hash rows are identical and match the frozen candidate; neither test implementation nor timeout changed. No full build/main suite was duplicated while root owned the heavy window.

## Full current-intent continuity and remaining gates

The canonical speckit-converge prerequisites pass with no extension hooks. Spec107, plan, research, all contracts, constitution and review instructions are byte-identical to the prior full review. All thirty task intent strings are identical; only parent-owned checkbox/checkpoint metadata changed. `intent-inventory.json` retains all **84** requirements, scenarios, parent rows, tasks, plan decisions and constitution principles. All eight original C finding groups remain closed by source continuity. The change introduces no new authority, retry, receipt, usage, retention, cron or experiment behavior and weakens no existing assertion.

The prior complete local software proof remains available, with the new fixture-source evidence above. Parent-reported functional CI results on 53726013 are not relabeled as results on a future rewritten commit. Current remote security failure remains real until the actual history scan and new-head CI pass. T030 still owns the final C/D/F joint trace, rewritten C provenance and draft delivery continuation; no new unimplemented behavior or duplicate convergence task was invented. No source TODO is appropriate for the already implemented representation correction, and the verifier does not edit tasks or proposals.

`REWRITE-CONDITIONS.md` gives the exact bounded rewrite conditions. Source approval is complete; actual rewritten-history qualification, CI and final commit pins remain root-owned. Paid operations, merge, deployed-gateway qualification and activation remain outside this checkpoint.
