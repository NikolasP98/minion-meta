---
phase: 14-sdk-transport
plan: "13"
status: pass_with_execution_conditions
reviewed: 2026-09-09
reviewer: docs_history_review
implementation_authorized: false
requirements_completed: []
---

# 14-13 independent plan review

**Recommend admission of the two-file contract change**, with the execution conditions below recorded in root's admission. No additional source ownership or architecture child is needed. The plan correctly distinguishes missing advertisement from explicit invalid values and breaks the canonical-source/package/gateway qualification cycle identified in the 14-12 review. This is plan review, not implemented or runtime-verified behavior.

I read the exact 14-13 plan, 14-12 independent review, canonical 11-07 source/tests, receiver decision, package manifest and existing barrels, plus the engineering skill and its testing/review guidance. Only this review was written. No source, test execution, emitted output, package, database, browser or network action occurred. The earlier receiver draft was mine; this review concerns root's separately authored two-file canonical prerequisite.

## Semantic assessment

The normative action at PLAN lines 54–56 is precise enough to implement one small helper accepting two `unknown` values. The complete supported table is:

| Sender advertises | Receiver advertises | Result |
|---|---|---|
| undefined | undefined | undefined: legacy |
| 1 | undefined | undefined: legacy |
| undefined | 1 | undefined: legacy |
| 1 | 1 | 1: bilateral version selected |
| any explicit invalid value | any value, including undefined | fixed validation error |
| any value, including undefined | any explicit invalid value | fixed validation error |

Validate each operand before deciding absence. An early `if (!sender || !receiver)` or absence short-circuit would incorrectly accept `(undefined, null)` or `(2, undefined)` as legacy. Only the number 1 qualifies; no `Number`, string conversion or truthiness. A pure scalar helper can reject objects without inspecting getters or coercion hooks. `undefined` is the helper's missing-value sentinel; it is not a complete registration envelope parser and cannot distinguish an omitted property from an explicit JavaScript property whose value is undefined. That distinction does not need another schema here; JSON wire parsing and field extraction remain the gateway parity/input consumer's job.

The existing `ShellOutcomeValidationError` at canonical shells.ts lines 75–78 provides the fixed `INVALID_SHELL_OUTCOME` vocabulary. Reuse it without echoing either input. Adding an optional literal `durableOutcomeVersion?: 1` to `ShellsRegisterResponse` (currently shellId/heartbeatMs at lines 542–547) preserves structurally typed legacy responses. Existing sender `ShellCapabilities` at lines 529–541 already uses the same optional literal. Do not make either side required or widen the public type to number/string merely because the runtime helper accepts unknown input.

The helper returns a version decision, not a capability grant, ACK, stored receipt or permission to perform a durable operation. Required-durable callers must reject undefined through their later policy; no automatic downgrade is introduced by this helper. The response field's comment should explicitly say **the current registered peer advertised v1 as well as actual receiver storage/policy readiness being satisfied**. This follows the selected receiver decision table and avoids describing a peer-specific acceptance response as an unconditional server feature flag. No runtime path sets the field in this child.

## Ownership, compatibility and sequencing

Two files are sufficient: shells.ts for the type/helper/comment/TODO, shells-outcome.test.ts for direct canonical tests and legacy type controls. `src/gateway/index.ts:10` already exports all Shells symbols, and `src/index.ts:1` exports the gateway barrel. A new helper does not require export-file edits. The module is currently browser-safe and dependency-free apart from native language/Web primitives; do not introduce crypto, SQLite, node builtins or third-party version parsing for a literal version check.

Correct dependency order is canonical 14-13 source freeze → complete new private emitted shared package containing 11-07 plus this addition → exact gateway shim/parity/input tests against that package → receiver → caller admission and sender integration. Immutable production package/lock adoption is a later explicit action. The old 14-11 archive and gateway's older installed shared package cannot prove this helper exists. The existing 11-07 journal/native receipt remains valid evidence of those earlier bytes, but is not automatically requalified against the next complete package. The later artifact gate must verify full export/transitive runtime and declaration closure, then rerun affected consumer checks. Do not change the journal from this two-file plan or infer its deployed wiring.

The plan intentionally does not address keyed recovery ordering, lazy SQLite readiness, current machine-connection checks, quiesce, capacity, input hashing, organization authority or commit-before-ACK. Those remain explicit 14-12 prerequisites/acceptance conditions. Version agreement is necessary but insufficient for each of them; no dependency cycle with 11-03 sender integration is introduced.

## Execution conditions and meaningful test requirements

1. **Freeze the actual temporary runner before use.** PLAN line 47 requires a credential-free private copy, read-only dependencies and explicit effective-cache checks, but the sample command at line 57 alone does not enforce those conditions. Root's admission must supply the exact private path, selected installed tool/runtime identities and config/API overrides. Exclude both `.vite` and `.vite-temp` dependency links; inspect the effective Vite/test caches and disable env loading. No copied native config may load active environment or write an active cache. This is an execution receipt requirement, not permission to modify a third source/config file or to run the sample command from the active package.
2. **Test all four supported pairs with exact results**, especially `(1, undefined)` and `(undefined, 1)`. For each invalid representative test both operand positions, paired with both undefined and 1. Include 0, -0, -1, 2, fractional/NaN/infinite values, empty/nonempty strings including `"1"`, null, booleans, arrays, ordinary/boxed objects, functions, symbols and bigint. The latter classes fall under the plan's requirement to reject every explicit unsupported value; no serialization of arbitrary inputs belongs in failure messages. A hostile `valueOf`/toString control should stay uncalled.
3. **Assert fixed error identity as well as rejection.** Use the actual canonical error class and fixed message, with a secret-like invalid-string canary to prove no value appears in the error. Do not settle for generic toThrow on every case, which could also accept unrelated TypeErrors from accidental coercion.
4. **Preserve existing real contracts and add the missing response control.** Current test lines 48–52 protect legacy invoke/final/registration-request shapes; they do not yet construct a typed ShellsRegisterResponse. Add both an unchanged `{shellId, heartbeatMs}` response and a v1 response, checked by the strict package typecheck. Keep all existing outcome identity/digest/bounds/query/observation tests. No copied helper or synthetic protocol model may produce expected results.
5. **Classify red evidence honestly.** Tests must exercise the new public helper and independent truth table. A first run that cannot import a not-yet-defined export is missing-contract/setup evidence, not evidence that an existing runtime negotiated incorrectly. Record the actual red result and then verify all branches against the implemented helper. Do not manufacture an in-house alternate implementation merely to get a preferred red count.
6. **Freeze before independent root verification.** Record source/test hashes, selected counts, strict typecheck, scoped lint and private-cache evidence. No reason exists to run general shared socket suites for this scalar helper. The TODO belongs at the new unwired helper/field and points to `proposals/2026-09-08-platform-qc-remediation.md` (Shells lifecycle); root owns the matching proposal entry and summary. Do not invent a release version or modify active dist.

These conditions refine the admitted plan's existing semantics and tooling boundaries. They do not require expanding ownership. Root can incorporate them directly in the source-execution admission.

## Review axes and disposition

**Standards: pass with the exact runner receipt condition.** Strict additive types, existing error vocabulary, existing barrels, no dependency growth and two-file ownership are appropriate. The sample runner command is not independently safe execution authority.

**Spec: pass with explicit bilateral response-comment and test details above.** Missing/invalid distinctions are correct and required-mode policy remains with the caller. This prerequisite delivers a reusable scalar decision and additive response type only. Storage readiness, current connection authority, deployed protocol compatibility, receiver/sender delivery and SDK-01/AGT-04 completion remain unproven.

| Reviewed input | SHA-256 |
|---|---|
| 14-13 PLAN | `c01387c084e7a06b2b13828de3198d392bb62fec2dd908e20cffdd3ab3f7c28a` |
| 14-12 independent review | `7d1e002da2be4b3683c44b24b20614ded1fd1c157e5ca48290ace6c835e00e42` |
| Canonical shells.ts | `bc1c4ea5cb4c63bec21c1f1c13058e0e474e0485a1a3331139a25965ed601f80` |
| Canonical shells-outcome.test.ts | `e7eab3917d9277b2fc94932a01a93e6ceeeb7790d79c11c5e482281e65a9fc62` |
