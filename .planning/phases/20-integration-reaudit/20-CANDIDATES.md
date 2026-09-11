# Minion candidate evidence contract

Task 1 tooling is implemented locally; real candidate and release qualification remains **incomplete**. No root-reviewed real candidate policy or accepted real receipt set has been selected for this packet. No product patch was applied, staged, committed or released. `releaseAuthorized` is always `false`.

The frozen Task 1 inventory observed **51 requirements and 85 exact admitted PLAN paths**; current admission contains 86 after inherited Calendar plan 13-13. These counts are observations, not constants. The source of admission is `.planning/operations/360/plan-allowlist.json`; Markdown indexes retain historical checkpoints and do not grant scope. This document is a contract and pending inventory, not a machine-readable passing manifest.

## Authority and qualification

The caller selects explicit absolute filesystem roots and separately supplies the SHA-256 of a root-reviewed policy. The policy pins the canonical catalogue, complete owned before/after files, their Git modes, candidate identity, selected required gates and **each independently accepted receipt's SHA-256**. A manifest can only locate those receipts inside approved evidence roots. Writing a JSON result with a reviewer name does not authorize its hash. Cryptographic hashes establish byte identity relative to the trusted policy; they do not authenticate a reviewer or independently prove that a reported test ran.

- `invalid`: malformed or unsafe input, unknown scope, mismatched identity or unapproved receipt. No qualifying packet is emitted.
- `incomplete`: valid inputs with missing policy coverage, receipt, artifact or prerequisite, or failed/skipped/zero-count checks. A review packet may be generated; it grants no qualification.
- `evidence-qualified`: every canonical requirement and associated admitted PLAN has its policy-selected evidence, every selected gate passes on the pinned candidate, and all prerequisites and declared artifacts match. This verdict covers the local owned-file/evidence packet only. It does not prove transitive build completeness, live deployment, cancellation of remote work, or release authority.

A gate with `receiptSha256: null` is explicitly unreviewed. A missing prerequisite uses `sha256: null`; its later appearance requires the policy to pin its actual hash. Every gate specifies a reviewer distinct from its candidate author. A successful structured result requires `status: "passed"`, exit code 0, a positive check count, zero failed checks and zero skips. The count can represent assertions or inspected checks; it does not automatically mean runtime tests. Human standards and specification reviews remain separate gate kinds.

## Identity and ownership

Each candidate specifies `id`, `author`, repository `prefix`, `beforeRoot`, `afterRoot`, `baseCommit`, `baseGitRoot`, `source`, `files`, `locks`, `archives` and `image`. Each owned file has an exact relative `path`, admitted `plan`, and `before`/`after` objects containing `{sha256, mode}`; either side can be `null` for addition/deletion. Both cannot be absent. Only Git modes `100644` and `100755` are accepted. A file must match the PLAN's declared path, or an individually pinned child of an explicitly declared directory. The latter grants no recursive scan or inclusion. Overlapping candidate ownership is rejected.

The `ownedSourceDigest` hashes the compact JSON array of present after-file records `{path,sha256,mode}`, sorted by code-unit path order. `beforeDigest` uses the same projection for before files. Neither digest represents the complete checkout, build graph or dependency installation. Whole-file hashes cannot distinguish unrelated edits within the same file: the reviewer must accept the complete after bytes or prepare a separate exact candidate before policy admission.

For an ordinary snapshot, `source` is `{kind:"owned-files", value: ownedSourceDigest}` and `baseCommit`/`baseGitRoot` are both `null` unless an explicit registered Git repository supplies the selected immutable base. The materialized `beforeRoot` can remain an ordinary directory. A `git` source verifies that the explicit after root is its repository top-level and its actual HEAD equals the selected commit. Every approved after file, mode and absence must also match that commit; dirty owned bytes require `owned-files` identity. A non-null base commit checks every materialized before file against the selected committed blob/mode/absence in the caller-registered `baseGitRoot`. That repository may be at a later HEAD and may hold owned WIP; no branch switch or source mutation is needed. Replacement objects are disabled for all native identity operations. Enclosing ancestor commits cannot supply snapshot source identity. Git worktree metadata may reside outside a source root; only fixed read-only Git identity operations use it.

Locks and archives require nonempty arrays of explicit dispositions. Present locks pin a relative after-root path and SHA; present archives pin an approved evidence root, relative path and SHA. A present image pins `sha256:<digest>` as a declaration; inspecting an image or its runtime requires a separately accepted evidence gate. Pending and not-applicable artifacts require a reason and cannot also carry present-artifact fields. Dependency/build/runtime evidence is distinct from `ownedSourceDigest`.

## Machine input shapes

All JSON objects reject unknown fields. The accepted policy shape is:

```text
{version:1, catalogue:<inventory.identity>, evidenceRoots:[rootId],
 requirements:[{id, gates:[gateId]}],
 candidates:[{id,author,prefix,beforeRoot,afterRoot,baseCommit,baseGitRoot,
   source:{kind,value}, files:[{path,plan,before,after}], locks,archives,image}],
 gates:[{id,requirement,plan,candidate,kind,reviewer,receiptSha256}],
 prerequisites:[{path,sha256}]}
```

Every canonical requirement must appear exactly once. Its gates must reference that requirement; every associated admitted PLAN needs an explicit gate. Gate kinds are `source`, `behavior`, `standards`, `spec`, `integration`, `runtime` and `policy`. Candidate and root IDs are lowercase ASCII slug identifiers, at most 64 characters.

The locator manifest is `{version:1, proofs:[{gate,root,path,sha256}]}`. Each receipt is `{version:1, gate, candidateDigest, reviewer, result:{status,exitCode,passed,failed,skipped}}`. Its `candidateDigest` hashes the report's complete candidate identity projection, including before/source and artifact declarations. None of these shapes admits a command, executable or shell expression.

The PLAN reader supports the repository's existing simple quoted/unquoted inline and block arrays for `requirements` and `files_modified`. It is intentionally not a general YAML parser. Unsupported declarations fail closed and require a source-grounded parser amendment or corrected approved PLAN; no fallback broadens ownership.

## Filesystem and patch boundaries

Input files must be regular files beneath caller-selected roots, with no symlink root, ancestor or leaf. Absolute input paths, traversal, control characters, `.git` components and `.env*` components are rejected. File reads use `O_NOFOLLOW`, bounded allocation and pre/post descriptor/name identity checks. This assumes trusted, stable parent directories: ordinary Node filesystem APIs do not eliminate ancestor replacement races by a concurrent malicious owner. The tool is not a sandbox or credential detector for arbitrarily named file contents. Policies and approved source/evidence roots must already be credential-free.

JSON inputs are limited to 2 MiB; individual files to 32 MiB; each validation pass to 256 MiB; the catalogue to 256 plans and total owned files to 4096. Native Git calls have a 10-second timeout and 64 MiB output ceiling. Packet before/after copies plus patch bytes share a 256 MiB ceiling. Patch generation is synchronous and bounded per call, not a global time-budget scheduler.

The output uses an exclusively created directory beneath a caller-selected output root, disjoint from metadata, evidence and candidate inputs. Existing output directories are refused. It copies exact before/after files and invokes fixed native Git arguments for binary no-index diffs, with external diffs, textconv, rename detection, hooks and inherited global configuration disabled. Native `git apply --numstat`, `--summary` and `--check --no-index` verify exact changed paths, modes and applicability against the copied before state. The patch is **never applied**. Generated before-images, after-images and patch identities accompany the packet report. A failed operation retains its private partial directory for diagnosis and emits no successful `manifest.json`; it never cleans caller-owned paths.

Example invocation (placeholders must be replaced with separately reviewed inputs; this is not an approved real policy):

```sh
node scripts/qc/release-evidence.mjs inventory /absolute/meta-root
node scripts/qc/release-evidence.mjs validate \
  --root /absolute/meta-root --policy review/policy.json \
  --policy-sha256 REVIEWED_POLICY_SHA256 --manifest review/manifest.json \
  --directory before=/absolute/before --directory after=/absolute/after \
  --directory proofs=/absolute/evidence --directory output=/absolute/output
```

Use `packet` with the same arguments plus `--output output:review-packet` to generate an unapplied packet. Validation/packet CLI exits are 0 for locally evidence-qualified, 1 for incomplete and 2 for invalid. Output root IDs and paths come from the caller, never from a manifest-provided host path.

## Current pending coverage

`.planning/phases/14-sdk-transport/14-COMPATIBILITY.md` now exists as an exact source/archive/installed-consumer inventory. It must be pinned in the reviewed policy; document existence does not pass actual consumer integration. Task 2's integration runner, full candidate assembly, mandatory runtime/policy gate selection and release review remain gated under 20-01. Passing the synthetic tooling tests does not close QC-01 or any other requirement.

Canonical identities at this inventory read:

| Input | SHA-256 |
|---|---|
| `.planning/REQUIREMENTS.md` | `c1f57863ab26309c2e2bdab97c665484b9545cece38b76cca80a612a8db775ca` |
| `.planning/operations/360/plan-allowlist.json` | `cdf803955dc49760d9d93ba36e54363d5f438e47932d3d59277a18a69acb859a` |
| `.planning/operations/360/baseline.json` | `acea478025f4e590a097749eeacfadabb35246a1234bd71422e80ee406968aa1` |

The following rows mean **pending real policy/evidence selection**, not that prior scoped implementation receipts failed or disappeared.

| Requirement | Admitted PLAN coverage | Packet status |
|---|---|---|
| SEC-01 | 09-01 | Pending |
| SEC-02 | 09-01, 09-03, 09-06 | Pending |
| SEC-03 | 09-01, 09-03 | Pending |
| SEC-04 | 09-02, 09-04, 09-05 | Pending |
| SEC-05 | 09-02 | Pending |
| SEC-07 | 09-03 | Pending |
| SEC-08 | 09-04, 09-05 | Pending |
| JOB-01 | 10-01, 10-03, 10-04, 10-05, 10-06, 10-07, 10-09, 10-10 | Pending |
| JOB-02 | 10-03, 10-04, 10-05, 10-06, 10-07, 10-08, 10-09, 10-10, 12-04, 15-05 | Pending |
| STK-01 | 10-02, 10-03 | Pending |
| STK-02 | 10-02, 10-03 | Pending |
| AGT-01 | 11-01, 11-06 | Pending |
| AGT-02 | 10-08, 11-01, 11-06 | Pending |
| AGT-03 | 09-06, 11-02 | Pending |
| AGT-04 | 11-03, 11-07, 14-12, 14-13, 14-14, 14-16, 14-17 | Pending |
| AGT-05 | 11-04, 11-08 | Pending |
| AGT-06 | 11-05 | Pending |
| DEP-01 | 12-01, 12-04, 12-05, 12-06, 12-07, 13-12 | Pending |
| DEP-02 | 12-02, 12-05, 12-06, 12-07 | Pending |
| DEP-03 | 12-03, 12-08, 14-11 | Pending |
| UI-01 | 13-01, 13-03, 13-06, 13-07 | Pending |
| UI-02 | 13-01 | Pending |
| UI-03 | 13-01, 13-02, 13-03, 13-04, 13-05, 13-06, 13-07, 13-08, 13-09, 13-10, 13-11, 13-12, 14-18 | Pending |
| UI-04 | 13-02, 13-05, 13-07, 13-10 | Pending |
| UI-05 | 13-03, 13-06 | Pending |
| UI-06 | 13-04, 13-05, 13-08, 13-11 | Pending |
| SDK-01 | 09-06, 14-01, 14-02, 14-04, 14-05, 14-06, 14-07, 14-08, 14-09, 14-10, 14-11, 14-12, 14-13, 14-14, 14-15, 14-16, 14-17, 14-18 | Pending |
| SDK-02 | 14-02, 14-04, 14-05, 14-06, 14-07, 14-08, 14-09, 14-10, 14-11, 14-12, 14-14, 14-15, 14-17, 14-18 | Pending |
| SDK-03 | 14-03 | Pending |
| SEC-06 | 15-01 | Pending |
| DATA-01 | 15-02, 15-03, 15-06 | Pending |
| DATA-02 | 15-04, 15-05 | Pending |
| DATA-03 | 15-03, 19-03 | Pending |
| OBS-01 | 16-01, 16-04 | Pending |
| OBS-02 | 16-02 | Pending |
| OBS-03 | 16-03 | Pending |
| OPS-01 | 17-01 | Pending |
| OPS-02 | 17-02 | Pending |
| OPS-03 | 17-03 | Pending |
| OPS-04 | 17-04 | Pending |
| DOC-01 | 18-01 | Pending |
| DOC-02 | 18-02 | Pending |
| DOC-03 | 18-03 | Pending |
| CAP-01 | 19-01 | Pending |
| CAP-02 | 12-04, 19-02 | Pending |
| CAP-03 | 19-03 | Pending |
| QC-01 | 20-01 | Pending |
| QC-02 | 20-02 | Pending |
| QC-03 | 20-03 | Pending |
| UI-07 | 13-07, 13-08, 13-09, 13-10, 13-11, 13-12, 14-18 | Pending |
| SEC-09 | 13-09 | Pending |

## Task 1 implementation evidence

The three files were absent before this task. The initial missing-module run is scaffolding red evidence only. Behavioral validation uses synthetic temporary source/evidence roots, actual native Git patch checks, and disposable Git objects/commits with fixed local identity and no inherited credentials or signing. No shared repository Git state is changed by those fixtures.

The current 37-case suite passes with zero skips. It exercises exact versus changed policy/source/receipt/artifact identities; independent receipt pins; missing/failed/skipped/zero-check evidence; complete requirement/PLAN coverage; missing compatibility; source/base Git identity; ordinary-copy ancestor denial; replacement-ref denial; dirty-after commit mismatch; separate immutable base repository with materialized before-images; text/binary/add/delete/executable patches and spaces; inert shell syntax; unsafe paths/symlinks/FIFO; bounded oversized input; malformed JSON without content leakage; output collision/overlap; and admitted-directory child ownership preserving unrelated files.

Reproduction from meta root: `node --test scripts/qc/release-evidence.test.mjs`. The recorded run used an empty environment, a 768 MiB Node heap cap and the session's native network-deny preload. That preload is a private test prerequisite, not a product dependency. Test evidence is retained under `/tmp/minion-20-01-vg_vuxb8`; this temporary location is not durable release evidence. Root independent source review and replay are still pending at this handoff.

Root review found and corrected two Git identity gaps before this handoff: HEAD alone did not prove owned after bytes, and replacement refs could reinterpret object lookup. The three added native cases now pass with the existing 34 controls. The original 34-case result does not claim coverage of these later regressions. `baseGitRoot` was added at root request to avoid mutating or switching dirty candidate checkouts while checking materialized before-images.
