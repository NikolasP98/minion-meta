# Factory and Gateway SDD author handoff

Recorded 2026-10-23T05:02:47+00:00. Author scope is specification only. Owner authorization batches remaining approved slices into one PR per group; this is the recorded exception to one-slice packaging, with two independent technical SDD passes and human merge/deploy/live gates retained.

## Readiness and boundaries

Group B covers A08/A09 and preserves merged slices 6–7. Both initial independent reviews requested corrections. The current frozen revision addresses B-P1-01/B-P1-02 and B2-01/B2-02: proper board headings; terminal/no-remint condition before ledger cleanup; bounded durable v2 accounting through run/spec/reconcile emitters, parser and reservation settlement; cache refresh after late authoritative settlement. Parent reports both final independent B passes APPROVED against this revised manifest; B is ready for Sol development. The board review state is left for the parent to update with the review receipts.

Group C covers A11–A16, Gateway A20 binding and Gateway A30 eligibility/export. C is ready for both independent technical reviews. Full A20 remains joint with D and exact deployed-gateway qualification. Full A30 remains joint with F schema/denominator reporting; paid holdout and active classification changes are excluded. Runtime/dependency qualification tasks are concrete but are not claimed passing by this authoring work.

Only owned B/C specification files and this audit report were edited. No runtime source, index, proposal, parent spec or .specify/feature.json edits; no branch/stash/worktree/commit changes; no installs, provider calls, merge or deployment. Concurrent authors' files are preserved.

## Source and installed pins

| Item | Qualified pin/evidence |
|---|---|
| Meta source | `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`, feature/agent-harness-f-evals |
| Factory source | `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`, feature/agent-harness-b-factory; PR base dev |
| Gateway source | `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`, feature/agent-harness-c-gateway; PR base DEV |
| Factory lock | runner/package-lock.json SHA-256 `d7ade2cccd7be266c32310df1ab93fd4f322467540b920a8f2cdfe6a51f407d4` |
| Gateway lock | pnpm-lock.yaml SHA-256 `2fbb2f37e8c7c0cc8c0297eb9e800ff35c39606b9fffaf8c439e6aeb9d968649` |
| Install receipts | Parent setup/*-install.json/.log and installs.json: exit 0, locks unchanged; Node22.23.3, Factory npm12.2.1, Gateway pnpm10.29.3 |
| Installed Factory seams | Express5.2.1, tsx4.23.12, TypeScript5.9.3 read from isolated installation |
| Installed Drone | 0.6.0; dist/types.d.ts SHA-256 `79ea1737f1b5f02251bc4244a34fb8332e5041f547f7d8760cd50e1e0efd97b9`; dist/run.js SHA-256 `8616e0559081a095a05bdc28e562e25413ebc9f7792e82421b6f64f45f68e79a` |
| Installed Claude pin | Parent setup/pinned-harness.json: native 2.1.233 SHA-256 `55d281096f57d411ebbdd94dbf5e9ff3accb7c05713e37348c2c11d4b83bf9d9`; exact path in B contract. T013 must execute this binary; host2.1.304 is not equivalent. |

Source HEADs were rechecked during final author validation. Installed SDK signatures and implementation were inspected from the frozen isolated installation; this is static seam proof, not a model/transport/crash test. Success result carries resolvedModel; error does not; fallback may omit earlier usage. Opt-in result mode preserves ordinary callers and records incomplete coverage honestly.

## Contracts handed to other authors

C/D: specs/107-harness-gateway/contracts/cron-binding.md preserves existing origin-session versus isolated-execution semantics, rejects unknown/deleted explicit agents and wrong-agent sessions at add/update/execution, and identifies exact source/build/lock fixture evidence plus separate operator-managed deployed-gateway qualification. No new wire capability field or ambient credential fallback.

C/F: specs/107-harness-gateway/contracts/usage-shadow.md freezes ComplaintEvaluationRecordV1. C owns extensions/alert-watcher/src/complaint-evaluation.schema.json and complaint-evaluation.ts; F imports a pinned C commit/schema hash and fixtures. Positive integer persisted receiptRevision permits ordered compatible receipt extension; same-revision conflicts quarantine and stable attempt IDs prevent double billing. Actual shadow costs include all baseline and gate attempts; counterfactual active estimates remain separately labeled. Default off, census adds no calls, and live shadow requires separate approved bounded manifest. F author confirmed adoption of this exact interface, receiptRevision and cost distinction. Reviewers must check the final joint artifact alignment.

## Author validation

- Group B: 7 owned Markdown files; local links resolve; no unresolved clarification/template markers; tasks T001–T015 occur once in order; acceptance trace covers A08, A09; board frontmatter and required headings present.
- Group C: 10 owned Markdown files; local links resolve; no unresolved clarification/template markers; tasks T001–T030 occur once in order; acceptance trace covers A11, A12, A13, A14, A15, A16, A20gateway, A30gateway; board frontmatter and required headings present.
- Spec Kit setup-plan/setup-tasks were run against absolute owned directories with SPECIFY_FEATURE_NO_PERSIST=1. No extensions were configured. The final check-prerequisites.sh --json --require-tasks --include-tasks returned exit 0 for both packages with research.md, contracts/ and tasks.md available.
- Source-anchored AS-IS, observable TO-BE, DELTA, compatibility, real callers, migration, replay tombstones, retention, lease generations and concrete tests are in each package. Full installed-harness/SDK execution, real SQLite subprocess/queue crash proof and repo gates remain development tasks.
- This static documentation check does not supply independent approval. Parent reports B independently approved; C remains pending. Independent reviewers must bind their verdict to the exact manifest below. Any later edit requires bounded re-review of changed hashes.

## Frozen author manifest

Paths below are relative to the shared meta clone. SHA-256 hashes bind exact bytes.

| File | SHA-256 |
|---|---|
| `specs/106-harness-factory/checklists/requirements.md` | `21384ab12053fc792021f08eadba1adfcc85bc9b296a7a846fe20314902a59d8` |
| `specs/106-harness-factory/contracts/admission-deadline.md` | `f0888174bc1b1dfda753f132a09678e85c8e55366954b3106260d79a1fb773d2` |
| `specs/106-harness-factory/plan.md` | `8026c5eaef85424d2d30b433fd97fddde8226af536a4fad1bb268349f9c85108` |
| `specs/106-harness-factory/research.md` | `445dcf29ba44fc0820a9fdc6149addbb7ca336fc7e08f6a02f9a990edeb821a3` |
| `specs/106-harness-factory/spec.md` | `3a2e362cbbd931614dffaa4e3c8a950988c67594cd4db027bed9ef20712cfc81` |
| `specs/106-harness-factory/tasks.md` | `2da02fce831466a497369c3e24ce27ee4735c40c083cb4641631b8ca5c5a791a` |
| `specs/2026-10-23-harness-factory-spec.md` | `f31f2e7e1c8eaf1a7b0daee85d99d2d00402aeefe77c25151597de6208e26bab` |
| `specs/107-harness-gateway/checklists/requirements.md` | `1a25bfb23fc45715f7352c31ea15a51c5296f7f815e1c36df864275a5d4f42b4` |
| `specs/107-harness-gateway/contracts/cron-binding.md` | `b453ab412003b5ed1c9b9e8007182d35f68f2783fa8144b54dfb30c6a1b08fb8` |
| `specs/107-harness-gateway/contracts/receipts.md` | `031b74bda355d2ce93ca962136685560ea91bf4281eafc7e0f5de1b1d88f27a2` |
| `specs/107-harness-gateway/contracts/usage-shadow.md` | `21cd4843a4d72327edd1a1bb7c7d4e9a3278cd20fb5dabbbf3e3ffdb1329bee2` |
| `specs/107-harness-gateway/contracts/validation.md` | `c50882a68c8b5914fd67bd96f0bd90e62bac10f7bc504c9b879e17d81f258f47` |
| `specs/107-harness-gateway/plan.md` | `25a74716a16091753d81fe026baab9e78f15876dd8b0d9802a9a22701bd74223` |
| `specs/107-harness-gateway/research.md` | `a9f972a4f7df37a31a55117f15b3b623fa9075c17c05a7208c3c9088b0e7f8ae` |
| `specs/107-harness-gateway/spec.md` | `72e8a4c9f8be077a2614dd0dedf7dd055fc907310859af9c23414eb6a9fe47f6` |
| `specs/107-harness-gateway/tasks.md` | `752bac4f7e531c8ff020c4def179dcfe3eec3ed5e4a82929e109025566cff509` |
| `specs/2026-10-23-harness-gateway-spec.md` | `bdc7053c664ac7863fcd987b3e749b326318ce74d9b1f1d8cd89a196f36a4200` |
