# Independent spec review — pass 1

Verdict: **REVISE BEFORE IMPLEMENTATION**. The direction, eight-initiative scope, isolation, existing-shell pilots and immutable consumer archives are appropriate. Fresh-source corrections are incorporated. Five bounded amendments below are needed to make the safety and coverage promises executable. Reviewed spec.md, plan.md, tasks.md, research.md, data-model.md, contracts/ui.md, quickstart.md, revalidation evidence and current relevant package/Hub source. No product code changed.

## Blocking amendments

### R1 — Both real FormField implementations must be owned and qualified

T017 and plan ownership name only `meta/packages/ui/src/lib/FormField.svelte`. The original PH-11 and fresh outcomes evidence also identify `Hub/src/lib/components/ui/foundations/FormField.svelte`; it is an independent implementation, exported by `foundations/index.ts`, not an adapter to the package. It currently chooses error OR helper and removes helper while invalid. Updating the package cannot fix those Hub consumers.

Required: name both files and their consumer tests in T017/ownership. Keep their current public snippet APIs; either fix both directly or deliberately introduce a compatibility adapter backed by tests (the former is smaller). Locate ErrorSummary's one canonical implementation/export and pilot consumers explicitly. T017 currently says meta ErrorSummary while outcomes research suggests Hub foundations; choose one owner and require the Hub export to expose that implementation. Test actual Hub FormField as well as packaged Input/Select FormField behavior.

### R2 — Enumerate intrinsic target scope instead of assigning only Button

FR-002/US1 promise all shared controls; T005 says controls; plan assigns foundation worker UI Button only. Current shared controls include Input, Select, Textarea, Checkbox, Radio and Toggle. None are implied by adding a Button class, and checkbox/radio target should be the full associated label, not its visual glyph.

Required: enumerate supported controls and interaction target in contracts/ui.md, task ownership and fixture cells. Suggested bounded scope: Button/IconButton including anchor rendering; Input/Select/Textarea control; Toggle; Checkbox/Radio associated label. State 44px minimum both axes for button/icon/toggle actionable target; field height44px with current full available width; label height44px for check/radio without inflating mark. Preserve fine-pointer density. If any primitive is excluded, give a reviewed finding disposition rather than allowing all-shared-controls wording to overclaim. Coordinate FormField edits separately.

### R3 — Freeze the intended normal-text matrix

FR-002 says declare allowed pairs, but leaves the allowlist unconstrained. A technically compliant implementation could simply omit the19 failures. The audit recommendation expects these normal text roles on the five reusable base surfaces, and actual semantic utilities allow them.

Required: explicitly name textPrimary/textSecondary/textTertiary × canvas/surface1/surface2/surface3/overlay as the270 required combinations across18current themes, plus existing accent/status assertions. Any future exclusion must cite a component restriction; it cannot be used to close an existing failure without enforcing that restriction. Keep disabled text separate. Include a negative-control test with known failing pair so the test cannot pass after a vacuous matrix change.

### R4 — Unknown-outcome read repair must not become false success

Data model says unknown requires reconciliation, but doesn't define the outcome after a read succeeds. A successful GET or a coincidentally matching value cannot prove the lost write committed. This is exactly the class of durability error the report asks to prevent.

Required: define read repair as refreshing authoritative state while preserving the unknown outcome unless a server receipt/idempotency identity proves this exact mutation's result. Without such receipt, safe recovery is explicit reload/review, then a deliberate NEW edit based on fresh version; no stored mutation closure replay, no Saved indicator inferred from reload. Tests must cover unknown→successful read retaining uncertainty, owner change during read, and same-value concurrent actor ambiguity. Do not introduce a new receipt system just for this scope; reuse existing action runtime state and bounded controls.

### R5 — Atomic endpoint proof must exercise the database boundary

T013/verification matrix mention conflicts and monotonic version, but allow endpoint mocks to be the only proof. Event-type update changes resource links as well as row data. Revalidation identifies same-millisecond timestamp CAS risk and the need to reject stale primary before linked writes.

Required: explicitly require native local PostgreSQL transaction test with two writers sharing one expected timestamp: exactly one succeeds, other gets conflict, returned timestamp advances even within a millisecond. For event types, stale/foreign/nonexistent update must leave resource links unchanged; throwing after update cannot partially commit. Require missing/invalid expected version rejection on the PATCH boundary, list all callers and preserve their drafts/token adoption. No production write needed and no schema expansion required.

## Nonblocking clarity fixes

- spec AS-IS says original audit evidence is copied into feature evidence before review; currently it contains three revalidation notes. Say revalidation evidence is copied and identify immutable original audit digest/path, or copy the actual referenced evidence. Avoid a false evidence claim.
- Final spec says release shared packages first whereas plan says npm separate and vendored archives suffice. Clarify build/qualify immutable archives first; npm publication optional/separately proven, not an accidental required release promise.
- T007 covers governance but I08 component maturity/deprecation policy lacks a named deliverable/task. Add this to T007 or T019 (e.g. package README lifecycle and recipe support matrix), including public API deprecation compatibility policy.
- Review currently relies on original report synthesis where I06 wording is obsolete; explicitly retain final pilot-only shell decision already correctly captured in spec/plan/research.

## Strengths to retain

- Scope does not restart paused readiness work or certify untested routes.
- Both consumer source/package identities, installed CSS and production are separate evidence fields.
- Site's already-shipped token gates are recognized instead of duplicated.
- Unowned legacy local preferences remain untouched and are not attributed to a new actor.
- App.css has one owner; package integration waits for all shared edits.
- Scoped release promotion inspects divergence rather than releasing arbitrary integration backlog.
- Existing composition capabilities and action/runtime primitives precede new abstractions; no unnecessary dependency or universal SDK.
