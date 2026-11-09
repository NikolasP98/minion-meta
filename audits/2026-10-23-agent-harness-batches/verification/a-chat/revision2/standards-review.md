# A Chat revision 2 — independent Standards closure

**Source correction accepted; full qualification remains pending.** A-IMP-06 is closed on the frozen 68-file revision2 source. The other five closures from revision1 remain valid: their production sources and original probes are unchanged. This is a bounded source/runtime checkpoint, not final acceptance or a merge/deploy approval.

## Identity and executed proof

`source-verification.json` records independent matching of all 68 file hashes, byte counts and modes, with a complete `frozen-source/` copy. Revision1 has exactly one changed production file, `src/routes/(app)/stock/entries/new/+page.svelte`, SHA-256 `c907242f9bfec533f65823e8cdec07fbac4845f491501d19d7bf7e1648223828`; one new mounted test is added; all other 66 files match. Branch is `feature/agent-harness-a-chat`; HEAD remains source base `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, not a reviewed candidate commit.

- Checkpoint: `0e292a2e5827b5e35bfefec0d91193301478570c23baf6d5018c9853cd214d97`.
- Source manifest: `75f6bf6e7c5612006c3a54b8dac63240fbdec791f16e0f4e8fc18d73314379f0`.
- Candidate patch: `d7b67308dc17fdfc97dea894c5682d4cd7adadb54f426804ebbe5ad23a1f41e2`.
- Adapter, unchanged: `efaf880b0d1a87e4ac69a251e0e7100cdf1c948ef0e8036cc04c1153f2a08bfb`.
- Bun lock, unchanged: `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`.

The independent `stock-original-replay.json` records **3/3, exit 0**, with all68 sources unchanged before/after. It executes the original mounted stock/PartyPicker current, Stop and lazy-expiry probe unchanged, SHA `2f95a0ef816dce54f02a22ae1ce14fd29ea27fc0400a577e56e8850fef2543c1`, against the actual current components and private lease chain. Both original config files and every preserved probe match revision1. The original failed receipt remains in `../revision1/stock-indirect-autofill-v1.json` (current passed; Stop/expiry failed); it has not been overwritten.

Author receipts are separately attributed in `inspected-author-evidence.json`: actual mounted stock regression14/14; seven producer files63/63 with matching68-source inventory; design/token/whitespace exit0. I reviewed all14 test cases and their terminal log, but did not rerun that file or the63-test suite in this checkpoint. Revision1 independent 8/8 core,4/4 actual-ingestion mounted and63/63 producer receipts retain their original source attribution. No summed number is represented as a final suite run.

## Actual producer trace and correction

Production `fill_stock_entry` at page lines384–469 receives the form registry's private EffectLease. At line431 it now awaits `addItem(match, ctx)`. `addItem` at175–193 checks the lease before row creation, captures the exact resulting row object, awaits `autofillProvider`, and returns that same row. This is the actual nested helper, not a copied substitute.

`autofillProvider` at196–225 captures the supplier-selection version and entry type, and requires live lease, unchanged selection/type and membership of the exact target row. It checks after the supplier fetch at217 and after JSON parsing at219, immediately before the synchronous `PartyPicker.pick` at221. The fetch receives the existing private signal. `PartyPicker.svelte:153–158` only changes its own value/label/menu and invokes the synchronous page onPicked callback. Its document-lookup network writer is a separate explicit user handler, not invoked by pick. No further async child is hidden behind this repair.

The setter checks the live lease again after the child and checks exact row membership before applying qty/rate/warehouse. A concurrent append cannot redirect those fields to the last row. Removal, duplicate merge replacement or other object replacement rejects the remaining fields rather than applying them to another object. `entry-lines.ts` confirms that merging a duplicate replaces that row object; the identity check therefore fences that case too. No replacement-row browser/runtime case was executed independently here; this conclusion follows directly from the reviewed identity comparison.

Manual paths still call optional-lease `addItem` from StockItemPicker.onPick and item preselection; row insertion occurs synchronously before the first await. Manual selection is protected by the local counter incremented by actual onPicked; preselected supplier suppresses lookup. The one-shot is consumed before fetching, and optional fetch/HTTP/body failure is caught without erasing the already-added row or retrying. The author test suite exercises both awaited boundaries, these failures, preselection, concurrent append/removal and later supplier choice. A future result cannot revive a stopped/expired accepted lease. No global executing flag or serialized authority was introduced.

This helper performs an optional read and a local form projection; it does not submit stock. Existing create/submit handlers remain user actions. All sandbox committed-write/refresh-failure paths are byte-identical to revision1: already-received commit evidence is retained and no rejected/replayable mutation outcome was added by this fix.

## Retained whole-source review and qualification boundary

The full Standards inventory and caller review in `../revision1/standards-review.md`, plus the original `../standards-checkpoint.md`, remain incorporated. They cover authenticated owner publication/retirement/teardown, private two-hour/30-second lifetimes, all eight registered forms and indirect consumers, exact cross-run terminalization, all-source callback aliases/cap, server provenance/auth/RBAC/ingress/buffer, canonical provider history/compaction and adapter/font builder. Exact66-file continuity preserves those five corrected findings and the unchanged boundaries. The stock page/test are the only revision2 additions to that review. No new source blocker was found.

Mandatory final check/i18n, full unit/architecture, production build, default105-cell fresh browser matrix, real stdio history/compaction, browser-harness EN/ES Home/Floating desktop/compact/keyboard/network/screenshots, and final exact reviewed-A/current-F fixture plus live-CLI stub proof remain open. Old synthetic/single-turn/intermediate receipts cannot qualify them. Root owns canonical task updates and reviewed scoped commit/PR/release actions. Reviewer made no application/spec/task edits, Git mutations, external requests or browser sessions. Its one test process is terminal.
