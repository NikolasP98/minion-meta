---
id: 2026-10-21-windows-qualification-kernel-containment-spec
title: Kernel-contained Windows qualification with native infrastructure proof
stage: spec
status: implementing
pass: 2
verdict: approved
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [infra, test]
type: infra
proposal: 2026-10-21-windows-qualification-kernel-containment
---

# Kernel-contained Windows qualification with native infrastructure proof

## 0. Product

Release the assistant repair after reliable, complete Windows qualification. Prove cleanup of each test invocation's ordinary process tree, without classifying every new host process as test-owned work. This is an explicit change to qualification authority; it is not a waiver or a reclassification of a failed historical run.

## 1. AS-IS

On DEV `2231ac53aa31c368cb857f22de8ec05861a4f83b`, `scripts/ci/tq016-windows-qualification.mjs` pins 74 assertions and ten ordinals at lines 12–13. It starts each invocation through `cmd.exe` at line 343, repeatedly starts PowerShell host-wide snapshots at line 384, computes all new host survivors at lines 459–466, and rejects any unknown survivor at lines 480–481. Birth-aware tracking prevents baseline misattribution but does not establish causality for new service descendants. Timeout termination still depends on a non-atomic snapshot followed by PID-tree termination.

PR #342 head `eb56ae70cb7e0440387cdf31bb38a62e8bb51556`, tree `c4f55bab583da877c7acbfdfc674ab6f27ed772a`, includes #344 and retains only its three reviewed test-file changes. Native CI `39560356777`, ordinal 1, reports exactly 74 passed tests, exit 0, no timeout and no owned survivors. Two new unknown processes have stable pre-existing service ancestors. The current global rule correctly rejects that run; their ancestry does not prove the tests could not have requested brokered work. Receipt: `audits/2026-10-18-assistant-capability-repair/windows-eb56ae70-qualification-attempt1.json`.

Previous infrastructure PRs #343/#344 passed portable contract tests but correctly skipped product qualification because infrastructure cannot qualify its own policy. No native helper contract lane existed before merge. No existing Job Object interop helper was found in repository sources, scripts, tests or declared dependencies.

## 2. TO-BE and invariant change

The authority for ordinary process lifecycle is a fresh unnamed Windows Job Object per ordinal, configured before any test instruction executes. Host-wide observations may be retained as diagnostics; a process outside the job is not thereby proven unrelated to test actions. Global new-process counts no longer decide success. This changes the future contract in the observer/PID-identity proposals explicitly; historical manifests remain failed.

Preserve ten fresh invocations, exactly 74 passed assertions each, no skipped/failed tests, source/base/merge/checkout/tree binding, the existing 13-minute setup-to-finish cutoff, eight-minute helper cap and termination reserve, and complete full Windows shards. Final integrated DEV qualification remains required before production promotion. No reduced gate is authorized.

### A. Atomic containment and handle lifetime

- Create one unnamed, non-inheritable job. Set `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`; leave both job breakaway flags disabled. Keep the supervising PowerShell/.NET process outside the new job, while tolerating the runner's enclosing job hierarchy only when native APIs verify compatibility.
- Create the root with `STARTUPINFOEX`, `PROC_THREAD_ATTRIBUTE_JOB_LIST` and `CREATE_SUSPENDED`. Do not create and separately assign a running process. Associate the new job during creation, verify `IsProcessInJob(rootProcessHandle, privateJobHandle)` for the exact intended job, capture its birth from the handle, then resume its first thread. A NULL job argument merely detecting the runner's outer job is insufficient; never inherit the private job handle into a fixture. Fail before execution on unsupported creation attributes, bad limits, startup, assignment or membership uncertainty. No legacy PID-tree fallback.
- The private job handle must never be inherited by test descendants. Closing its final supervisor handle is the crash cleanup fallback. Retain the job handle through outcome and cleanup. Capture root birth/exit evidence before releasing completed root/thread handles, then release those completed-process references before final emptiness accounting. Do not retain diagnostic child-process references across that final accounting query. Close all native handles and attribute-list allocations on every path.
- Use exact argument encoding, explicit environment/current directory and controlled standard handles. Stream stdout/stderr directly to the ordinal log file; a descendant holding a pipe must not strand completion. Compile the checked-in C# library once per run to private scratch with PowerShell `Add-Type`; use no downloaded package, workspace install or elevation.

### B. Lifecycle outcomes

- Query authoritative job accounting and complete membership lists. Handle list growth/retry within a fixed bound; an incomplete/error query fails. Completion-port notifications alone never prove emptiness. Numeric PIDs remain diagnostic identifiers, not termination authority.
- After ordinary root completion, root exit 0 plus authoritative zero active job members is necessary for success. If any member survives root exit, record a leak and fail before cleanup. Use bounded re-query after releasing completed-process references so their accounting delay cannot deadlock zero proof; this is not a grace period that converts a live surviving descendant into success. A nonzero root exit, a deadline or a leak remains failed after successful cleanup.
- On deadline, leak, protocol failure or normal teardown, terminate only the job by its retained handle, then confirm authoritative emptiness within the existing cleanup reserve. Never reopen arbitrary host PIDs to terminate them. An unconfirmed cleanup remains failure. Supervisor death must close the only job handle and terminate its members. The crash fixture retains separate process handles for the known members and waits for their termination; it must not retain another job handle, which would defeat kill-on-last-close. Release those fixture process references after confirming termination.
- Cover coordinator death separately from supervisor death. Node/libuv may terminate its ordinary PowerShell child when the coordinator dies; that is a valid crash cleanup path through last-job-handle closure, not a normal invocation success. For this deliberate crash fixture only, an independent witness retains exact-birth process handles to the actual PowerShell supervisor and the fixed known fixture members before killing the coordinator, then confirms their termination within the unchanged reserve. Retain source-bound witness evidence without opening another job handle. A missing supervisor result remains failure for every ordinary invocation; the crash witness never grants clean ordinal or product qualification. Preserve the coordinator birth-handle watchdog for cases where the supervisor remains alive.
- Use the same-boot monotonic deadline in the supervisor so a blocked Node coordinator cannot leave test work beyond the deadline. Native compilation/startup overhead counts against existing budgets. Missing boot/deadline evidence fails; no wall-clock or reduced-count fallback.

### C. Evidence protocol

- New qualification manifests use schema 2. Each ordinal records exact source identity, helper-source hashes, compiler/PowerShell/Node/OS versions, root PID and handle-derived birth, configured limits, assignment-before-resume result, root exit code, timeout state, membership at outcome, cleanup reason and confirmed final active count.
- Use a narrow validated request/result protocol and atomic scratch-file results. Reject unknown/unsupported protocol versions, missing/mixed identities, incomplete membership evidence, nonzero original exit, timeout, pre-cleanup leaks, cleanup uncertainty and malformed reports. Do not accept legacy schema-1 success as schema-2 qualification or combine ordinals across attempts.
- Matching helper hashes bind the receipt to checked-out source; they are not cryptographic attestation against hostile same-user code. Preserve raw logs and all failed receipts. Additive diagnostics must not carry credentials or application secrets.
- Keep the existing exact-file Vitest report validation and full-shard artifact/source validation. The aggregate verifier must enforce schema 2 plus all ten clean job outcomes and both full shards from the same source/run attempt.

### D. Native premerge infrastructure check

- Add a distinct `Windows process helper contract` check on the same `windows-latest` family. Use Node 22, PowerShell and checked-in files, read-only repository permissions, `persist-credentials: false`, no application secrets, no workspace/package installation, no elevation and `pull_request` rather than privileged `pull_request_target` execution. Fixtures may create bounded processes/files only in isolated runner scratch.
- Changes to the native helper, fixtures, monitor/validator, workflow or admission tests must trigger it independently of the exact-outbound-file selector. The applicable required-check aggregator fails if this check fails, is skipped, is cancelled or lacks source-bound evidence. Unrelated docs-only PRs remain exempt through explicit admission evidence.
- This check tests infrastructure and grants no product qualification. Infrastructure PRs still cannot substitute it for ten real outbound invocations, both full Windows shards or final merged DEV qualification.
- Always upload bounded source-bound native receipts and logs, including early setup failures. Run on the PR's synthetic merge source with explicit PR-head/merge/tree identity; a passing result from another source/attempt is unusable.

## 3. DELTA and implementation slices

### Slice 1: Native job supervisor and executable contract

**Topics:** `infra`, `test`

Add `scripts/ci/windows-job-object.cs`, a small PowerShell loader/bridge, Node built-in native contract tests and checked-in process fixtures. Prove real root/child/grandchild membership, root-first-action ordering, parent exit with surviving grandchild, detached child containment, breakaway refusal, runner nesting compatibility, pre-resume setup failure, timeout, supervisor death and bounded cleanup. An independently launched outside process must survive cleanup and not fail the ordinal. Verify Unicode/spaces/arguments, nonzero root exit, log retention and descendant-held-output behavior. Portable tests may validate protocol shapes; native success may never be inferred from mocks or Linux skips.

### Slice 2: Ten-run orchestration and strict schema-2 validation

**Topics:** `infra`, `test`

Replace host-PID lifecycle authority in `tq016-windows-qualification.mjs` with the job supervisor. Keep host diagnostics clearly separate from authority. Update helper tests and aggregate artifact verification for schema 2, hashes, exact source, clean original outcome and complete job evidence. Retain ten × 74, all existing budgets and both full shards. A deliberate survivor must fail and be cleaned; malformed, mixed, legacy or partial evidence must fail. No change to product-runtime files or #342's three test fixes.

### Slice 3: Mandatory native CI admission and review

**Topics:** `infra`, `test`

Wire protected helper/fixture paths, the native infrastructure check and its required aggregator in `.github/workflows/ci.yml` and workflow contract tests. A stable protected-prefix classification must include future helper files rather than silently omitting them. Run native contracts on the actual runner before human merge. Complete portable repository checks and independent standards/spec implementation review. After approval/merge, update #342 and require fresh full qualification before its approved conditional merge; then qualify final DEV and continue the existing production procedure.

## 4. Verification matrix

| Contract | Required executable proof |
| --- | --- |
| Containment before execution | Supervisor verifies exact private-job membership while suspended and proves the first-action marker absent until resume; unsupported startup never produces the marker |
| Descendants and parent exit | Real child/grandchild and detached fixture; membership persists after parent/root exit |
| Leak failure and cleanup | Nonempty job at root exit fails even after handle-based cleanup proves zero |
| Deadline and crash | Same-boot cutoff; hung child; killed supervisor; all job members terminate within reserve |
| External host process | Independently created control process remains alive; its PID/name do not decide test outcome |
| No escape fallback | Breakaway attempt cannot leave the job; nested runner compatibility verified or fails closed |
| Evidence integrity | Wrong source/hash/schema, legacy/mixed/partial ordinals, skipped tests, false clean outcome rejected |
| Admission and release | Helper/fixture/CI path changes trigger native check; skipped/cancelled failure blocks applicable gate; ten × 74/full shards still required |

## 5. Limits and out of scope

Windows Job Objects contain ordinary `CreateProcess` descendants by default; brokered WMI/SCM/service launches are outside this guarantee. This is a process-lifecycle qualification tool, not a hostile-code sandbox, privilege boundary or claim of causal attribution for every host process. Same-user adversarial interference, malicious kernel code, power loss and host reboot are not solved; they must not be misreported as clean qualification.

No executable-name allowlist, disabling OS services, broad process termination, relaxed deadline/test count, retry-to-green, product runtime/model change, new secret access, npm dependency or production mutation. No changes to the Hub/FACES authority model or the previously approved targeted release procedure.

## 6. Sources and platform boundary

The lossless JSON bridge requires PowerShell 7.5 or newer for `ConvertFrom-Json -DateKind String`; unsupported parsers fail before root execution. Actual PowerShell 7.6.6 reproduced timestamp coercion without that option and retained the exact coordinator birth with it. See the primary [JSON parser reference](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/convertfrom-json#-datekind).

`PROC_THREAD_ATTRIBUTE_JOB_LIST` requires Windows 10 / Server 2016 or newer; nested jobs are available from Windows 8 / Server 2012. Actual GitHub runner compatibility must be established by the native check. Use the primary [creation-attribute reference](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute) and [nested-job reference](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs).

Membership inheritance and broker exceptions: [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects). Emptiness/query requirements: [accounting](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_accounting_information), [process list](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_process_id_list) and [notification limitations](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_associate_completion_port). Handle-scoped cleanup: [TerminateJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-terminatejobobject). Built-in compilation: [Add-Type](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/add-type).

## 7. Review and release boundary

Two independent spec passes precede implementation. This is a new reviewed contract, with no hotfix-spec bypass. Branch implementation/native CI is reversible preparation; human approval and merge of the concrete reviewed PR are required before this policy reaches DEV. Preserve the failed historical attempts without reinterpretation. Source/native infrastructure success is not ten-run acceptance, final merged qualification, deployment or authenticated Hub behavior.
