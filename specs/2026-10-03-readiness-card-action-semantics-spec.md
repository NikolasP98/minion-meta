---
id: 2026-10-03-readiness-card-action-semantics-spec
title: Separate card navigation from nested destructive actions
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [ui, logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
findings: [HC-026]
verdict: approved
---

# Card action semantics

## 0. Product

Card navigation and destructive actions must remain independently usable by pointer, keyboard and assistive technology. A selected record must retain its identity through localized navigation and the resulting data request.

## AS-IS

Source inspected at Hub `f02189dd` plus the separately owned readiness WIP. `builder/_builder-hub/{AgentsGrid,SkillsGrid,ToolsGrid}.svelte` uses a focusable `div role="button"` for navigation and places a native Delete button inside it. The parent reacts to Enter; the child only stops click. The child's keydown therefore starts navigation before its native click invokes delete. `flow-editor/FlowGroupSection.svelte` and `routes/(app)/agents/workshop/+page.svelte` repeat the ownership problem for Enter and Space, without preventing Space scrolling. Agent and skill delete controls are 20px and only revealed by hover; Tools and Flow also have undersized, hover-dependent destructive actions. The adjacent `flow-editor/MasterFlowsSection.svelte` uses the same custom navigation semantics without a destructive child. These six surfaces form the bounded inventory for this slice.

Workshop opening additionally performs `openSave(id)` and `persistActiveSaveId(id)` before locale-aware navigation. This behavior must survive the markup correction. Marketplace flipping and prompt selection are separate HC-027 actions; do not close that finding through this slice.

## TO-BE

1. Each card has a non-interactive visual container. Its primary action and Delete are sibling native interactive elements; neither is nested inside the other. Remove the parent role, tabindex, click and keydown handlers. A navigation card uses a real anchor with the same route and record name. Encode each dynamic record ID exactly once with encodeURIComponent before inserting it as a single path segment, including Workshop programmatic navigation after open. Preserve IDs containing slash, literal percent, space and Unicode as one logical record; inspect the receiving route to prove it decodes once to the original ID. Do not double-encode already serialized URLs. Empty IDs and the entire dot segments `.` and `..` are invalid record identifiers for these routes and must not create an actionable root/parent navigation. Native Enter, modified click, copy-link and open-in-new-tab work without custom keyboard emulation. Space on a link retains native page scrolling; it is not a button. Paraglide already rewrites route anchors; test current EN/ES destinations in the browser fixture or mount the locale-aware layer explicitly.
2. Preserve the visible card anatomy, title, descriptions, status, metadata, thumbnails and permission conditions. The primary link may wrap the existing non-interactive body, with Delete outside that link at the existing visual position. Reserve enough space to prevent action/title overlap. A pointer over Delete must never activate the link, including after a layout wrap. Do not add a full-card pseudo-element over secondary controls or text selection.
3. Workshop uses a native Button for its existing asynchronous open action, with valid phrasing children styled as blocks. Its sibling Delete retains the current callback and data behavior. Scope of this change is event ownership; current open/delete failure and concurrency semantics remain separately recorded and must not be misrepresented as fixed. Use a consistent visible accessible name from the existing record name, not an unlabeled image control. Master flow navigation becomes a native link.
4. Every sibling Delete has a record-specific accessible name built from the existing localized Delete action plus the displayed record name; a generic title alone is insufficient for repeated controls. Set type="button" explicitly on every Button action in these touched card/header surfaces so use inside a surrounding form cannot submit it. Secondary actions remain visible on focus-within and under coarse-pointer/mobile conditions. All newly touched actions have a 44px coarse-pointer target floor, with a visible semantic-token focus outline. No alpha-hidden focused actions, raw palette additions, icon-size additions outside the existing token contract, or hover-only reachability. Remove obsolete stopPropagation and keyboard handlers only when native sibling structure makes them unnecessary.
5. Keep shared Button and existing navigation/localization contracts. Do not add a generic card framework for six local markup corrections. Deduplicate only a genuinely shared behavior or style after inspecting actual callers. Document the native-action rule in UI governance with observed failure and qualified receipt.

## Direct consumer path encoding

The navigation fix must also preserve the same identifier in the immediate data request. Scope includes path-segment encoding only in the six card consumers: `components/builder/BuilderHub.svelte`, agent-builder and tools `[id]` routes, `state/builder/skill-editor.core.svelte.ts` and `skill-editor.proposals.svelte.ts`, `state/features/flow-editor.svelte.ts`, the flow list/detail routes, `components/flow-editor/{FlowCopilotPanel,FlowExports,FlowHistoryPanel}.svelte`, `components/builder/AgentCreateWizard.svelte`, and `state/workshop/workshop.svelte.ts`. Encode each dynamic record and nested chapter/run identifier once when building an HTTP path; payload and database IDs remain the original strings. Master-flow lookup already uses the decoded ID as a map key and needs no HTTP adaptation. Freeze every distinct URL builder in these consumers, including dynamic BuilderHub deletion. The initial literal inventory contains 42 API-path interpolation sites in 12 files plus that dynamic deletion; regenerate against exact edited source and account for every site. Use one small tested path-segment helper and an exact source ratchet rejecting unclassified raw URL interpolation in these inventoried domains. Representative actual GET/PATCH/DELETE, autosave/publish, nested chapter-tool, run, copilot and export transport calls must preserve the logical ID through the server-decoded path. Tests cover every distinct builder through the ratchet plus actual calling paths, not a copied URL-building implementation. Test receiving `page.params.id` too; a correct anchor with a broken following request is not acceptance. Keep this mechanical path correction separate from each service's async ownership and mutation outcome semantics.

## DELTA

Replace custom parent activation with native sibling actions across the bounded six-card inventory. Correct the direct consumer path segments through the shared helper and inventory ratchet described above.

## Verification

- Before changes, mount actual card components with state and transport seams. Focus and key-activate each destructive action, then observe navigation/open and delete callbacks. At least one real-browser regression must demonstrate the original unwanted navigation; a DOM-only dispatch of keydown does not synthesize a native button click and cannot prove the whole activation sequence.
- After changes, verify every inventoried surface. Enter and Space on a native Delete invoke only its callback exactly once; the parent has no callback to receive the key. Enter and ordinary click on navigation links activate only the intended route. Modifier clicks preserve link semantics and do not run an imperative navigation handler. Workshop Enter/Space runs open/persist/navigation in the existing sequence; Delete never runs that sequence.
- Test gateway/custom and admin/non-admin tool cards to preserve delete visibility rules; empty and multiple-item lists; Flow group collapse and existing plugin/group actions; selected record route IDs including slash, literal percent, space and Unicode and rejection of empty/dot identifiers; Workshop thumbnail/no-thumbnail variants. Verify distinct Delete names for multiple records and no enclosing form submission. No assertions that merely search markup strings or duplicate implementation logic.
- Capture actual component desktop and 390px mobile screenshots and browser receipts. Check tab order, focus visibility, 44px controls, clipping/overlap and document overflow. Use synthetic data and harmless navigation callback/local routes; no production write, actual deletion or external send.
- Run scoped meaningful mounted tests and the existing affected component tests, `bun run lint:design`, `bun run lint:tokens`, formatting and the accepted-source type/build gate. Design debt may only decrease; no baseline increases or accessibility suppressions.
- Independent review examines direct consumers and route/localization compatibility. Record exact source hashes, failing baseline, passing correction, fixture seams and remaining runtime gates. Add the evidence to HC-026 in the Lavish report.

## Out of scope and adjacent open behavior

Workshop open/create/delete async failure and double activation are not proven safe by converting markup. Inspect and record concrete defects in the readiness ledger/proposal and exact-site `TODO(handoff)` if left for a subsequent owned slice. HC-027 marketplace two-action cards and prompt selection remain open. HC-028 dialogs and HC-029 menus remain open. This spec does not alter data authority, transport retry or delete semantics.
