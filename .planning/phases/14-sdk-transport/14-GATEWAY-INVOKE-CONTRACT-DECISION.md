---
phase: 14-sdk-transport
plan: "14"
status: draft_for_root_review
implementation_admitted: false
requirements_completed: []
---

# Gateway invoke contract decision

Recommend a four-file child that removes the local Shells type copies and supplies a strictly bounded text-input/key normalizer. It consumes the new full private shared candidate only after root's artifact acceptance. It does not route calls, select durable execution, open a database or install a package.

Read root/gateway instructions, gateway AGENTS and .dmux-hooks/CLAUDE guidance, D360-15, canonical14-13 and revised14-12 decisions. Read-only current gateway branch: `fix/ci-cost-remaining-gaps`. Only this packet and14-14-PLAN.md are authored; no source/runtime/test/package/network action occurred. Source snapshots below are local evidence, not deployment identity.

## Existing boundaries

| Evidence | Consequence |
|---|---|
| `minion/src/shells/shared-types.ts:1–9` says remove after shared0.7.0, but active gateway still resolves0.6.0. Its body repeats canonical domain types/constants. | Retain this import path as a selective re-export facade once a complete new package is available; remove duplicated bodies, not the facade path or its consumers. Do not assume npm0.7.0 availability or active adoption. |
| Shim lines79–80 alone define MAX_TIMER_DELAY_MS=2_147_483_647. Gateway handlers import it for timer validation. | Keep that exact local constant; it is not a canonical shared export. |
| Canonical `shells.ts:410–419` adds optional invocationKey to the existing shellId/sessionId/text-or-multimodal/wake shape. There is no durability field. | A key denotes deduplication intent only. Its presence/absence cannot select or prove durability. Preserve legacy type compatibility; the new durable text parser is narrower and not automatically used by the old route. |
| Actual handler `server-methods/shells.ts:306–338` checks strings/object, casts input as never, Boolean-coerces wakeIfArchived, and does not forward invocationKey. | A parser exported here is unwired until caller-routing C adopts it. Do not claim key handling or strict input validation at the real route after this child. |
| `manager.ts:315–325` receives optional org, requires owned shell/online bridge, forwards directly and has no durable-mode selection. | The later receiver, not this parser, owns keyed recovery, admissions, current bridge checks and dispatch. No ID allocation or side effects in the normalizer. |
| `config/types.gateway.ts:319–342` and `zod-schema.ts:532–549` have Shells enabled/storePath but no durable mode. storePath refers to the registry. | New durability cannot be inferred from shells.enabled or the registry path. Production lifecycle L needs an explicit separate durable policy/storage configuration. |
| Gateway protocol index.ts:275–279 uses installed Ajv with allErrors:true, strict:false, removeAdditional:false; individual TypeBox schemas use additionalProperties:false. Gateway config uses Zod strict objects. | Reuse an installed validation library for the new small domain grammar; do not import the whole protocol index and its registrations just to validate one object. Existing JSON frame validation does not normalize the text/session/key semantics. |

Installed metadata inspected without importing libraries: Zod4.4.3, Ajv8.20.0, @sinclair/typebox0.34.48 and typebox1.3.6. Gateway package declares them already. Zod resolves under `minion/node_modules/.pnpm/zod@4.4.3/node_modules/zod`. Recommend **Zod4** for the strict envelope/policy grammar because this is a small local typed boundary and Zod already serves gateway configuration. No new dependency, schema compiler, generic validator framework or parallel outcome validator. This is local API/source evidence, not a current dependency-security recommendation.

## Exact proposed four-file ownership

1. Existing `minion/src/shells/shared-types.ts`: selective canonical re-exports plus unchanged local timer constant and precise remaining handoff comment.
2. New `minion/src/shells/shared-types.test.ts`: runtime identity and legacy typed compatibility through the actual emitted package.
3. New `minion/src/shells/invoke-contract.ts`: text-only normalization, explicit validated limits, scoped key tuple and fixed native digest.
4. New `minion/src/shells/invoke-contract.test.ts`: actual library/helper boundary cases and independent digest vectors.

Existing shim consumers remain read-only: shells/{manager,types,provider,bridge-ws}.ts and gateway/server-methods/shells.ts. No manager, caller route, generic method list/scope, config, shared canonical source, package/lock or registry/database edit. Root owns summary/verification/proposal and isolated dependency materialization.

Preserve all current shim exports by name: SHELLS_EVENTS, SHELL_RUNTIME_IDS, DEFAULT_SHELL_BLUEPRINT; types ShellHarness, ShellRuntime, ShellProvider, ShellMachineSpec, ShellBlueprint, ShellStatus, ShellErrorReason, ShellBackupCadence, ShellCapabilities, ShellSummary, ShellsQuota, ShellsProvisionParams, ShellsProvisionResponse, ShellsInvokeParams, ShellsInvokeResponse; plus local MAX_TIMER_DELAY_MS. Explicitly re-export only the durable canonical helpers/types required by14-12 and this child: ShellOutcomeValidationError, normalizeShellOutcomeLimits, shellOutcomeByteLength, normalizeShellRunAdmission, normalizeShellRunOutcome, shellRunOutcomeText, normalizeShellOutcomeReceipt, normalizeShellRunObservation, normalizeShellsGetOutcomeParams, normalizeShellsGetOutcomeResponse, negotiateShellDurableOutcomeVersion; their ShellOutcomeLimits, ShellRunIdentity, ShellRunAdmission, ShellAdmittedInvoke, ShellRunOutcome, ShellOutcomeReceipt, ShellRunObservation, ShellsCommitOutcomeParams/Response, ShellsGetOutcomeParams/Response and ShellsRegisterParams/Response types. Use the supported public shared root/gateway entry, never an unexported /gateway/shells subpath or copied validator.

## Input, authority and policy proposal

The helper receives `(unknown caller envelope, separate authoritative org input, explicit limits policy)`; exact exported names are root's implementation choice. It validates syntax and bounds only. The caller must obtain org from the authenticated connection; merely accepting a separate string cannot prove that provenance. Caller-supplied orgId/tenantId/identity/admission/runId/inputDigest/durability fields in the envelope are rejected, never selected over context.

| Boundary | Proposed contract |
|---|---|
| Caller envelope | Exact own-data object with shellId, sessionId, input, optional invocationKey, optional wakeIfArchived; no extra fields. |
| Input | Exact `{kind:'text', text:string}`. Durable multimodal is rejected before admission. Legacy multimodal remains in the separately selected legacy route, not coerced here. |
| Text | Bounded well-formed Unicode, nonempty proposed default. Preserve whitespace and Unicode exactly; whitespace-only text is not trimmed to empty. Root must explicitly accept the empty-string choice before source. No Unicode normalization, newline conversion or trimming. |
| IDs/org/key | Nonempty, bounded well-formed strings; proposed reject whitespace-only while preserving exact accepted bytes including meaningful leading/trailing whitespace. No alias resolution, case-folding or delimiter concatenation. Root selects this syntactic boundary before source. |
| Key scope | If present, expose/retain exact `(authoritative org, shellId, invocationKey)` tuple. No key returns explicit absence; never generate a key or use a transport ID/timestamp. Session/input equality and native run identity generation belong to receiver storage. |
| Wake | Missing defaults to true, matching the documented canonical default. Explicit value must be boolean; false is preserved. Reject null, numeric/string truthiness. Wake is routing policy, not prompt identity. |
| Input digest | SHA-256 over UTF-8 `JSON.stringify(['minion.shells.input',1,'text',text])`, using native node:crypto. Digest excludes org/key/session/wake by design; the receiver separately enforces each immutable scope/session association. Never hash arbitrary input JSON or object insertion order. |
| Result | Fresh normalized text invoke data, authoritative org value, exact optional key tuple and digest. No shell lookup, ID allocation, auth claim, negotiation, persistence, forwarding or side effect. |
| Errors | Reuse fixed ShellOutcomeValidationError for invalid contract input/policy. Do not leak Zod issue paths with values, rejected raw objects, text or keys to diagnostics. |

Proposed explicit policy shape: `{contract: ShellOutcomeLimits, organizationBytes, invocationKeyBytes, envelopeBytes}`. Validate nested contract limits with actual canonical normalizeShellOutcomeLimits; validate additional positive safe-integer limits with Zod. Numeric values are caller-supplied test/domain policy until production choices are admitted. No defaults, module-level production constants, environment lookup or budget inference. Canonical identifierBytes bounds shell/session and textBytes bounds text; separate org/key/envelope bounds allow receiver capacity design to reserve the combined receipt/query obligation without silently choosing numbers here. Final name/shape is an API proposal, not an admitted public canonical type.

Use strict Zod objects with no coercion/default stripping of unknown fields. Before passing unknown objects to a schema, a small domain-only own-data descriptor check rejects accessors, symbols, non-enumerables and unsupported prototypes without invoking getters. Limit that check to the known envelope/input/policy objects; do not copy the canonical general outcome parser or recurse arbitrary JSON. Treat in-process malicious Proxy traps as outside plain parsed-JSON trust assumptions; do not claim trap-free handling of arbitrary JavaScript proxies. Reuse canonical UTF-8 byte length and native String.prototype.isWellFormed behavior after string type checking. Do not fabricate an admission/outcome just to invoke private string validation. Bound individual values before serializing the newly constructed known envelope for envelopeBytes; never stringify an unvalidated object or execute toJSON. Golden digest vectors must freeze exact bytes independently of the helper.

## Required-durable selection is still an explicit downstream decision

**There is currently no caller wire field or durable config mode.** The new helper must remain mode-free. Exporting it, adding invocationKey or observing a peer capability cannot create durable selection.

The smallest foundation option is a later **server policy `disabled | required`**, passed into the receiver manager and wired by lifecycle L. Caller-routing C chooses its explicit branch from that policy: required mode accepts only durable admission and refuses unavailable store/unsupported peer without legacy fallback; disabled mode preserves the existing explicitly nondurable route and rejects invocationKey rather than silently ignoring an idempotency expectation. No-key calls can still be durable when server policy requires it. This proposal reuses D360-15's mode distinction but does not pretend the config field exists.

That server policy alone does **not** let a client demand durable behavior against an unknown or differently configured gateway: current invoke response only supplies runId/startedAt, and a successful legacy response is indistinguishable there. Before claiming caller-requested durability, root must select an explicit wire contract in separate routing/canonical scope. Options are an additive required-only method such as `shells.invoke_durable` with the existing payload shape, or a canonical required-durability field validated by all relevant consumers. A dedicated method can fail closed on old gateways without changing the input shape, but requires explicit method/authorization/advertisement tests and canonical method-contract alignment; it is not added here. A new field requires a separately admitted canonical change/new full artifact and cannot simply be passed through an old route that ignores it. Neither alternative may imply automatic negotiation downgrade.

Recommended root disposition: admit this four-file pure prerequisite only after choosing its syntax/policy shape and exact package; retain mode/config and caller-requested durability as explicit C/L/canonical decisions.14-12 may qualify injected required-mode behavior, but full caller guarantees remain held until those decisions are real. No requirement is closed by a helper or manifest field alone.

## Candidate and test gates

Selected candidate awaiting root artifact review: `/tmp/minion-14-11-FOyKEiLN/archives/minion-stack-shared-0.9.0.tgz`, SHA `61ccc90584addf49dd8509cb71a1103ba5fa6dd632a46936d72f1716b794fef0`; complete extracted manifest `5240824d8f59f61a9ca0c9d9abefa68d96356be8699e131ede7a842a4a35ef37`. Durable JS `0863ea48725b06f47849f4b7236ff423734bfd9b48ba6b0f112572ed242ad712`; declaration `5949f59b7bcbec56e24fc6daab726704449544ec766479af0e30336a294091d1`. Old active0.6.0 and earlier reconnect archive are explicit missing-contract baselines. Do not copy client-only files or resolve runtime to new bytes and types to old bytes.

Root creates a private gateway snapshot and materializes the entire reviewed package there; this draft creates no snapshot. Freeze source/config/lock/tool/library/input identities and explicit private mutable caches. Native test/compiler resolution must point to the same full private package, with safe empty environment, no package install or active tree change. Missing shipped license/README and same-version production identity remain failed release gates despite root's permission for unpublished local tests.

Meaningful tests: facade constants/helper functions have identity equality with actual emitted exports; all existing names and timer behavior stay available; representative legacy provision/summary/capability/invoke types, including multimodal, remain assignable; new key/version fields are additive. Normalize accepted text without mutation/coercion; required/missing policy, invalid Unicode/UTF-8 boundaries, oversized envelopes, keys/org/session scope, unknown fields/accessors, wake booleans and durable multimodal denial. Fixed literal digest vectors prove exact whitespace/Unicode/newline distinctions and object-key-order independence; org/key/session/wake changes leave inputDigest unchanged while returned scope/session differs. Test a key tuple containing delimiter characters to prove no concatenation collision. Error canaries never appear. Resolve public runtime and TypeScript declarations to the same package; import-only missing-contract baseline is not a passing runtime test.

No real sockets, native SQLite, registry/provider calls, route invocation, model calls or browser are needed. Root owns any existing-consumer regression execution and full check scheduling. If re-export compatibility reveals a genuinely incompatible current consumer, stop for an exact amendment rather than editing a fifth source file or weakening canonical types.

## Reviewed identities

| Input | SHA-256 |
|---|---|
| Current gateway shim | `9e0652b8b398f13f16eede58e3e3e4a2b088099308b7d713e2671481e197002c` |
| Caller handlers | `8ab33a7e37c3b45aee1cbda097525905ede475d3c11ae836777922ed38d14b84` |
| Gateway config types | `c8d1701f70ad9623b5dd875a632f4dffa750db6b92928eec167b011f0f081de6` |
| Gateway config schema | `80720521ff95a56d00de13c1f955568bf4bf9236ece887a3bc2279ca457e03be` |
| Gateway protocol validator module | `c4b56014c3de9570fbff72779cd2e3e2c388597aaf82149dc036d978e3563068` |

Root owns admission, global dependencies and the proposal ledger. Future source executor inserts exact-site TODOs at the facade/parser pointing to the Shells lifecycle section of proposals/2026-09-08-platform-qc-remediation.md. Planning introduced no source TODO because no source mutation is authorized.


Root disposition: pure four-file prerequisite admitted with the exact syntax/policy and private lane in14-14-PLAN. Required-durable wire/config selection remains downstream and unimplemented. No production limits selected.
