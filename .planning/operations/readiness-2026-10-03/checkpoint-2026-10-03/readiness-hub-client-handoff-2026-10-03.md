---
title: Hub client readiness resume handoff
date: 2026-10-03
status: paused
owner: hub_client_fixes
finding: HC-036
---

# Hub client readiness resume handoff

## Resume guard

Implementation stopped when the pause request arrived. After that request, only file reads, hashes,
Git status inspection, the current-byte checkpoint and this handoff were produced. No product source
was edited, no test/build/check was started, and nothing was staged, committed or pushed.

The Hub worktree contains concurrent work from several owners. Do not use blanket staging, checkout,
clean, reset or stash operations. Resume from the exact owned-path manifest and inspect shared files
before changing them.

## Repository state at pause

| Repository | Branch | HEAD |
| --- | --- | --- |
| Hub | `fix/readiness-hub` | `875fb04369a3787aa93fb8d35f72f89c7946d460` |
| Gateway | `fix/readiness-gateway` | `0cdd31d4cc3102a1ec3c24eedb1630e75d0663a0` |
| Meta | `fix/readiness-meta` | `50374ac2c890d300b69f3c13f08a678b643de97f` |

The historical HC-036 packet was frozen against Hub baseline
`e1979fbd240c1c7a8c2ea25a93f96fd60ffea75b`. Although Hub HEAD advanced through other accepted
checkpoints, every one of the 55 owned paths still matches the frozen packet byte for byte at this
pause:

- Exact owned path list: `hc036-ab-owned-paths-v2.txt`, SHA-256
  `83293d8235d8bad846b835cf4aea4f3b1cf2b473a57d33bd129ee10c6f975f7c`.
- Frozen byte manifest: `hc036-ab-client-ownership-v2.sha256`, SHA-256
  `27623154e9c80e075283f6288f1ee1f908e58bc5773b6370bf3e4bfa2f83aa1e`.
- Current byte/status checkpoint: `hc036-ab-current-checkpoint-2026-10-03.json`, SHA-256
  `5a3138b318b4b2eb8123fdd7615309582590b3d3d48c089196a51fb061c9edf9`.
- Checkpoint result: 54 present, one intentional deletion, 55/55 equal to the frozen packet; Git
  status is 28 modified, 26 untracked and one deleted, with no owned path staged.

The intentional deletion is `src/lib/state/agents/tool-catalog.svelte.ts`, whose baseline SHA-256 was
`23fe42c3273ccc03880388c6e4a33d6d7f7ceb3cf6cc9d78f11c6ec37c13b1dc`.

### Shared-path ownership

- `messages/en.json` and `messages/es.json` contain HC-036 strings and other owners' additive keys.
  Stage only an inspected narrow diff.
- `src/lib/components/my-agent/ChatInput.svelte` contains the root-owned HC-039 alias hook. HC-036
  owns the agent-skill resource lifecycle and suggestions only.
- `src/lib/components/agents/AgentFiles.svelte` includes the root-owned numeric `tabindex` correction
  from HC-038. Preserve it.
- `src/lib/components/builder/BuilderHub.svelte`,
  `src/lib/components/agents/AgentCreateWizard.svelte` where applicable, and the tool route inherit
  the committed HC-026 formatting/path-encoding work. Preserve `recordPathSegment` boundaries.
- `src/lib/services/gateway.svelte.ts` ownership is limited to the optional request-options argument
  on the authenticated request closure. Bootstrap and unrelated Gateway behavior are excluded.
- `meta/proposals/2026-10-02-hub-gateway-production-readiness-recon.md` is shared with root. Its
  current SHA-256 remains
  `3990da913a2d539a97a15df3088fc12246022bcc9aab4b5d6f27c98d47072cca`.

## HC-036 current verdict

The read-resource foundation remains independently reviewable. The mutation/recovery portion is
**BLOCKED**, and the historical packet must not be accepted as an HC-036 completion packet.

- Historical partial packet: `hc036-ab-client-ownership-v2.md`, SHA-256
  `b0c22c531c22503a05db89acd91c5bc4c6b98ad937788cf4bf93e24a09182ed5`.
- Approved parent contract: `meta/specs/2026-10-03-agent-settings-ownership-spec.md`, SHA-256
  `d8a008f75f26d8d788107a3059775fd668cec79659b524662bdb5c9ea5d4a418`.
- The packet delivers canonical actor/organization/session ownership, bounded resource decoders,
  coalesced current-owner reads, strict capability absence, late-result retirement and mounted
  consumer coverage.
- It deliberately leaves four write capabilities read-only, listed below.
- A later actual-page negative control proved that the tool editor's generic Retry can erase an
  unresolved draft/operation and authorize a duplicate save or run. This blocks the touched
  mutation/recovery behavior even though the original focused suite passed.

### Reproduced recovery defect

`hc036-tool-page-unknown-negative-v2.log`, SHA-256
`ad163ad80f19bd5edcfab50ec7f5317f00b9d86d7dc3722f7429cabfe1bc5713`, mounts the actual production
page. The original eight cases pass and three desired-safe cases fail:

1. A lost `tools.custom.run` acknowledgement followed by Retry enables Run and dispatches a second
   RPC.
2. Same-owner unmount/remount forgets the unresolved run and permits a second RPC.
3. A lost save acknowledgement followed by Retry replaces `Unknown draft A` with the old stored row,
   then the next edit dispatches a second PUT.

The temporary copied repro test was removed after the run. The production test remains SHA-256
`f9a0028c541b29c731a4fc4be64a07c56f9b2363ba4ba67ef817ed2be6627378`.

Source anchors and required correction are recorded in
`hc036-tool-page-unknown-recovery-finding.md`, SHA-256
`084eee512d0c88eacff9a5fe6932119d138a51602f68a7e836e1d4f08e582d7d`:

- `src/routes/(app)/tools/[id]/+page.svelte:444-480` clears drafts, results and unknown gates.
- `reloadCurrentView` at lines 611-618 calls that reset before an ordinary GET.
- Lines 687-694 route save-unknown, publish-blocked and run-blocked through the same Retry.
- The browser and server allocate JSON before enforcing a received-byte cap, and the relevant HTTP
  reads/writes lack the required owner-linked deadline and cancellation behavior.
- The Hub save/publish service and Gateway run path have no durable operation receipt that can prove
  terminal disposition after a lost response.

## HC-036-B recovery child contract

Draft: `spec-hc036b-tool-operation-recovery.md`, SHA-256
`e33b61c939c8c49a805423b409df9cd4a97d68ac72ee337c2e2dbcebe1cfbf2d` (286 lines, formatted).

Status is `draft`, pass 0, verdict pending. It is not canonicalized in meta, has not received either
required review pass and has no implementation. It specifies:

- exact Hub tool-row decimal revisions and durable save/publish operation identities;
- atomic business mutation plus immutable operation receipt, including the second
  `/api/gateway/actions/tool-save` writer;
- finite prepare/execute/status/reconcile/ack states with no replay from absence or an old-row GET;
- secret-free owner-scoped browser recovery across remount, with committed-publish refresh-only
  repair distinct from mutation retry;
- request and response byte limits enforced while streaming, plus deadlines and owner-linked aborts
  before JSON decoding;
- durable Gateway `tools.custom.run` identity and terminal-or-unknown status, with no second physical
  execution when the outcome cannot be proved;
- a behavior-preserving split of the oversized tool-page controller and domain decoders before the
  receipt protocol is added;
- an explicit separate AgentFiles write contract rather than treating read-only behavior as closure.

The contract intentionally does not claim physical process containment for a Gateway script whose
execution outcome remains unobservable. That is a separate Gateway obligation; unresolved remains
unknown and cannot be replayed.

## Four disabled feature obligations

These are required product features, not accepted regressions:

1. **Agent tool assignment** — restore `tools.update` enable/disable from `AgentToolsPanel`, including
   drag and keyboard behavior, under the reviewed GW-022A/CAS writer and shared owner-scoped config
   mutation gate. Current TODO: `AgentToolsPanel.svelte:123`.
2. **Agent skill allowlist** — restore `agents.skills.set`, preserving explicit `[]` for no skills,
   `null` only for explicit inherit/default and globally disabled entries. Current TODO:
   `AgentSkillsPanel.svelte:179`.
3. **Agent file editing** — restore create/edit/save through a separately reviewed file revision or
   digest, durable operation receipt, conflict handling and atomic native publication contract.
   Current TODO: `AgentFiles.svelte:157`.
4. **Gateway tool enablement** — restore tool-detail `tools.update` enable/disable under the same
   GW-022A/CAS mutation gate and capability advertisement rules. Current TODO:
   `routes/(app)/tools/[id]/+page.svelte:323`.

Items 1, 2 and 4 require the authoritative GW-022A configuration transaction/CAS protocol before
writes can safely return. Item 3 requires its own reviewed child contract; the current
`agents.files.set` path has neither authoritative revision nor durable receipt.

## Existing qualification evidence

No evidence below was rerun after the pause request.

| Artifact | SHA-256 | Result and limit |
| --- | --- | --- |
| `hc036-focused-final-v1.log` | `8a20df0c2cc6548b4b18febadd7bff2e3423dfd168e386929c1beb5fcf7f2e87` | 13 files, 64 tests pass. Predates the new recovery negative control. |
| `hc036-catalog-consumers-v2.log` | `0fa46f870e71a78ac9087785fb188380d3876b8aa309c58af203f2687df252a2` | Four actual catalog-consumer cases pass. |
| `hc041-hc036-real-getter-session-resource.log` | `eec6e875f5b7eeae5e4cf904f2c8b316fadbb3f6323d758ae3f6e12acc132f01` | Three files, 31 tests pass through actual PageData getter/session/resource ownership. |
| `hc036-design-ratchet-final-v1.log` | `414a50eb6be3c3f9678d1137993f5616874ffd6ab19a28e89d75683ea5108f10` | Changed-file design debt does not increase against signed base `909b13ec`. |
| `hc036-tokens-final-v1.log` | `fce4210b70192d7d27f402ff2c5cfbb32acbc27675d8cb7ca44fe1921882cabe` | Token integrity passes. |
| `hc036-format-final-v1.log` | `17aa973d3f004560237d9a95171210b0671deff23d61628eecf7322ff5938f20` | 54 present owned files format clean; one manifest path is intentionally deleted. |
| `hc036-coherent-check-final-v1.log` | `90c6138cda3f30eca62f19b04506031c6cb46087d4c0af59273b843374d76623` | No HC-036/product diagnostics; nonzero only for two then-concurrent notification fixture typings outside this ownership. |
| `hc036-tool-page-unknown-negative-v2.log` | `ad163ad80f19bd5edcfab50ec7f5317f00b9d86d7dc3722f7429cabfe1bc5713` | One actual-page file: 8 pass, 3 desired-safe cases fail. This is the blocking evidence. |

Synthetic transport is isolated and labelled. Actual browser/build qualification remains a parent
gate after source correction and independent review.

## Other completed review receipts in this ownership window

- GW-018 revised contract: `gw018-nightly-child-outcome-independent-review-v2.md`, SHA-256
  `b7ccf5f4fff07a90c6f536d42cd2a6586920675747f6ece78be6a8375e01d04f`, verdict PASS for spec
  `3b28cbc32c5ab0fff1eb727fe52361cc9ce908b461121c77232dfdc808fe2ce6`.
  The immutable v1 BLOCK receipt remains at `gw018-nightly-child-outcome-independent-review.md`,
  SHA-256 `f73e535eab79e2c35e75d0bcc6644f59388e4fac54f264b90496a98fc03897a0`.
- HC-039/HC-042 source/addendum review: `hc039-hc042-independent-source-review-v2.md`, SHA-256
  `723bff80b40297e7334fd56b139cf241e9d7ba67dc2e263cab8b42a723b00c4d`, with exact hash JSON
  `1ef671f74e892b1a56919c356307c383b896f9eeee2d64b3b2f247bd42f79805`.
  Final evidence: 8 files/88 pass (`c6b16c...`), two suites/14 pass (`086c49...`) and native seven
  cases/six images/zero production writes (`763e680...`). Root owns those product files.

## Remaining blockers and queued work

- HC-036-B needs two-pass review and canonical meta/index adoption before source work.
- Hub save/publish needs row revisions, receipts, bounded transport and exact reconciliation across
  every writer before the generic Retry can be replaced safely.
- Gateway `tools.custom.run` needs durable identity/status/ack authority and no-replay recovery.
- The four disabled capabilities above remain open until their writer contracts are implemented and
  qualified.
- `agent-resource-decoders.ts` and the tool route need a behavior-preserving domain/controller split
  before further protocol logic is added; retain actual-page regression coverage through the split.
- HC-040 FlowExports owner/write recovery recon/spec remains queued. No HC-040 production edit was
  started in this ownership window.
- Concurrent notification, HC-039/HC-042, package/lock, Gateway native and root-owned browser work is
  outside this handoff and must be preserved.

## Recommended resume order

1. Re-hash the 55 owned paths against `hc036-ab-current-checkpoint-2026-10-03.json` and inspect any
   drift before editing.
2. Submit `spec-hc036b-tool-operation-recovery.md` to independent Standards and parent Spec review;
   amend and canonicalize only after both are satisfied.
3. Perform the behavior-preserving decoder/controller split with unchanged import and actual-page
   proofs.
4. Implement the Hub revision/receipt transaction and bounded HTTP transport across both writers.
5. Implement the owner-scoped client journal/controller and outcome-specific UI actions.
6. Implement the Gateway durable run protocol and its authority/advertisement prerequisites; keep
   physical-process uncertainty read-only.
7. Re-run the three negative controls unchanged, then the 64-test focused suite, catalog consumers,
   real getter/session integration, format, design, tokens, coherent check, build and parent-owned
   browser qualification.
8. Obtain independent source review and freeze a new packet. Preserve the historical v2 packet as
   evidence; do not overwrite it.
9. Restore AgentFiles writes under its own reviewed child and restore the three configuration
   mutation capabilities only after GW-022A/CAS is accepted.
10. Resume HC-040 after the touched HC-036 functionality has a safe reviewed boundary.
