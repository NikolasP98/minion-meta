# D Pulse SDD — author revision 1 for D2-01

Date: 2026-10-23. Author: `/root/astra_pulse_revision`. **Disposition: frozen for independent rereview; no author approval.**

## Scope and evidence identity

This bounded correction addresses the existing notifications-page Pulse decision consumer identified by [pass 2](d-pulse-pass2.md). [Pass 1](d-pulse-pass1.md) approved the prior hashes; both independent approvals must now cover this revised manifest. The board remains `status: review`, `verdict: pending`, and the review checklist remains unchecked. The approved parent A17–A20 remains normative.

Artifacts are in `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals`, branch `feature/agent-harness-f-evals`, observed HEAD `0a778d24d8e508819834898466cb54d3a0bd6099`. Artifact hashes identify the review candidate independently of parent-owned commits. Source inspection uses sibling `d-pulse`, branch `feature/agent-harness-d-pulse`, clean source HEAD `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`.

Read actual meta/Hub instructions, MINION technical-writing guidance, the complete D specification/plan/tasks/research/contracts/data model/checklist/stub, parent A17–A20, and both D review reports. No child agents were spawned. No runtime source, index, E artifact, branch, commit, dependency installation, database, browser, provider, network, deployment or production operation was changed or executed. This report and seven D-owned Markdown documents are the only authored changes.

## Source checks

- `src/routes/(app)/notifications/+page.svelte:111–115` sends ID-only approve/dismiss and then independently invalidates `app:notifications`. Its actual cards iterate `data.pulseProposals` at line 281; buttons pass `p.id` at lines 297 and 306.
- `src/routes/(app)/notifications/+page.server.ts:15–36` requires authentication/context, declares the invalidation dependency, checks `users:manage` and Pulse org-kind visibility, then calls `listPending(ctx)`. The return at line 41 includes independently loaded `pulseProposals`, inbox items and join requests.
- `src/server/services/pulse.service.ts:43–60` currently reads/counts org-scoped pending proposals. D's already-required owner filtering and safe projection must reach this SSR reader, not only API/feed and Pulse-page callers.
- `src/lib/state/features/pulse.svelte.ts:30–43,52–53` currently sends only `{action}` and refreshes shared state without returning an authoritative receipt. The SSR card revision cannot be reconstructed safely from that shared list.
- A source-wide `rg` for `pulse.approve/dismiss` confirms three current surfaces: Pulse page lines 97–98, notifications page line 114, and `NotificationsPopup.svelte:112`. The revised inventory covers all three and the real state helper.
- The existing notifications review gate is retained; Pulse read/write capability, owner isolation and safe projection apply to the changed Pulse section. Inbox and join-request behavior is outside the correction. No UI redesign, endpoint, domain, PR group or permission expansion is introduced.

| Hub-relative source | SHA-256 |
|---|---|
| `src/routes/(app)/notifications/+page.svelte` | `a46efe906158b75db7fd4939ebf2d1fcc9577576b5867223462d1a7f9cce691a` |
| `src/routes/(app)/notifications/+page.server.ts` | `4a8f532b20b8fbe5107ed68485c01ade2fcc2756d176fc86984fc3c255e6ee5c` |
| `src/lib/state/features/pulse.svelte.ts` | `2a145ae626d290d13f67c4c5e4fd769f9784ffd1ee442212375a090e08e2f3e9` |
| `src/server/services/pulse.service.ts` | `5351837a568617b9c2d04292f97c70a544323792eb7d70c963b31c0cbee08f34` |
| `bun.lock` | `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0` |
| `AGENTS.md` | `782e8f2c953134200af218064c46a4f6231864ecc6d0c050936e00314c7ec8a4` |

## Finding-to-task map

| D2-01 obligation | Revised ownership / task | Required implementation proof |
|---|---|---|
| Independent notifications SSR projection | Plan owns `src/routes/(app)/notifications/+page.server.ts`; T012 integrates revision, shared owner filter and safe projection; new `+page.server.test.ts` | Actual load and reader against disposable PostgreSQL: same-org other-owner exclusion, permitted legacy rows, denied review access, business visibility, safe projection; inbox/join-request rules unchanged |
| Exact rendered revision in both decisions | Plan owns `src/routes/(app)/notifications/+page.svelte`; T013 updates `decidePulse` and real shared helper calls | T014 mounts the actual page/helper with SSR revision 1 and shared/server revision 2; approve and dismiss submit 1, conflict, zero dispatches; explicit refreshed display precedes a new decision at 2 |
| Committed response before page invalidation | T013 retains shared action outcome before `invalidate('app:notifications')` and fences stale controls | T014/T025 fail invalidation after committed approve and dismiss, retain decision/receipt and prove exactly one write across read-only recovery |
| Receipt recovery and accessible controls | T014/T025 extend existing `PulseFixture.svelte` and critical-journeys suite to mount notifications; retain Pulse page/popup cases | Reconnect reads the same authoritative decision/receipt; owner-scoped readback; EN/ES keyboard approve/dismiss/recovery; screenshots and request counts |
| Complete crossmapping and validation | Spec US2/AS-IS matrix, plan, research, tasks A18 row, checklist and board stub; validation steps 3/4/8 | T024 includes notifications SSR test and existing full Hub/route/design/token/i18n gates; T025 captures actual browser evidence |

The correction extends existing T012–T014/T024/T025. All 26 unique IDs remain T001–T026, in order and unchecked. No task was renumbered or represented as passing. Existing functional requirements FR-001–FR-009 are byte-identical. In particular, `expectedRevision` is not weakened or synthesized from a newer fetch. `contracts/pulse.md`, `contracts/shared.md` and `data-model.md` remain byte-identical, preserving API/action schemas, Gateway compatibility, D/E interfaces, storage and lifecycle contracts.

## Document validation performed

- Before editing, recomputed all 19 original D/E authored hashes against `pulse-digest-report.md`: all matched.
- After editing, `git diff --check` passed; exactly seven changed files in the artifact checkout are D-owned Markdown. The Hub source checkout remained clean.
- Ran repository exports `parseFrontmatter`, `missingRequiredHeadings`, scalar/array checks and `findSliceTopicViolations` against the D board stub: no errors; pending review state retained.
- Checked all ten D documents for existing relative Markdown targets and unresolved clarification/TBD/TODO placeholders: passed. Sequential unchecked task-ID validation passed.
- Compared FR-001–FR-009 against the pre-revision committed text: byte-identical.
- Revalidated all nine E artifact hashes plus the three unchanged D contract/data artifacts against the original frozen manifest: all twelve match. No E file or shared interface was revised.

These checks validate the review documents only. Planned SQL, mounted, browser and runtime tests were not run; they remain developer obligations after both independent SDD approvals. The correction is ready for the original independent reviewer and the independent A/F pass-one reviewer to assess; only those reviews can close D2-01 and approve the revised candidate.

## Full frozen D artifact manifest

| Meta-relative file | SHA-256 |
|---|---|
| `specs/108-harness-pulse/checklists/requirements.md` | `fc0eaeeed22ef1125352665cdf059722bc8d5a0050dfef4bc7c7d8110fc8bcea` |
| `specs/108-harness-pulse/contracts/pulse.md` | `f79b1711226b807a3541f29fe16ab9574431f0fca9f24b6cb3af6d72799a4b52` |
| `specs/108-harness-pulse/contracts/shared.md` | `cb836393e5545253cfc7b4d15d781188429da1f42a1f787c6fc5764599bfd3ae` |
| `specs/108-harness-pulse/contracts/validation.md` | `b34624423c44b063a4b3af36dad451bb5cadd759cd1dfb45993e31c6c13bfd62` |
| `specs/108-harness-pulse/data-model.md` | `d02b11e5ac0354f44c9bd171fc80d13d2c2fa74d3cf9dfcddde5a78a0d1bb0ac` |
| `specs/108-harness-pulse/plan.md` | `37965f6d85ffbed2e5f41f981abf67850785577e78c67a818eef59b214cf1e2d` |
| `specs/108-harness-pulse/research.md` | `5af597a077fedd6df921a1388b71a9fa9cba968c2a8f52d48712bc0294996d32` |
| `specs/108-harness-pulse/spec.md` | `127e3dafe1864eed711618c33c74f948573acf022d76f389e80afe8739e13578` |
| `specs/108-harness-pulse/tasks.md` | `1556373679bb78beaa15f18e041bb1fadd53df57db25f107bec46df713187537` |
| `specs/2026-10-23-harness-pulse-spec.md` | `cbcdb67f5f0899455d48909e33eb4905ac2150c5fa2f5ad3882e1546d864c997` |
