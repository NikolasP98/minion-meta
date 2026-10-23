# Invocation usage and complaint shadow interface

## Installed SDK contract

Installed Drone 0.6.0 exports `runDrone<TOut>(drone:Drone<TOut>, input:DroneRunInput, host:DroneHost): Promise<DroneRunResult<TOut>>`. `DroneRunOk` carries data, usage, durationMs and resolvedModel `{provider,model}`. `DroneRunErr` carries error, optional usage and durationMs; it has no resolvedModel. `DroneEventInput` carries usage but no resolved model. Preserve this SDK signature; no release is needed.

Installed run.js resolves candidate credentials, attempts fallback candidates, then merges usage from the successful response. Failed earlier candidate usage may be absent; a final resolved model does not establish complete cost. Watcher schemas are single-output calls; preserve input token/output bounds and no tool mutation. A per-invocation wrapper may emit diagnostic coverage but cannot fabricate per-provider bills.

## Planned local adapter

Add opt-in `usageMode:'result'` to `GatewayDroneHostOptions`, default existing inferred behavior. A small paired wrapper creates a fresh host and captures one terminal `DroneRunResult`; after persisting/calling the bounded terminal observer, emit exactly one final usage observation and preserve ordinary `agent.run.*` lifecycle events. For result mode only, suppress inferred `agent.llm.usage` at `agent.run.end`. Resolve each SDK candidate's exact provider credential without the current host's nested fallback lookup; the SDK owns candidate iteration. Unopted callers keep existing resolver/signatures/behavior.

Classifier and suggestions accept an optional internal terminal observer `{attemptId,onTerminal(result),signal?}` or the wrapper result seam, with existing positional call forms preserved. Both hook and flow paths in `index.ts` select this adapter. The observer persists bounded terminal result/usage before local data coercion/validation or empty-suggestion fallback. A persistence failure stops publication; it never retries inference. Do not emit a second final usage observation during received-state local recovery.

Usage observation fields are additive: invocation/attempt ID, purpose `classification|suggestion`, requested model descriptor, nullable resolved provider/model, supplied token/cache usage, `costStatus:known|unknown`, nullable known USD, `costCoverage:complete|incomplete`, disposition and elapsed time. Existing priced aggregate can consume one final-model usage event only for a successful result; it must not turn missing model into a default model. Failed result with usage emits an explicitly unknown-model observation, not a priced guess. Coverage remains incomplete for fallback chain/unknown earlier bills; unknown USD never becomes zero. Payload copies obey seven-day retention; general analytics receive bounded metadata only.

Tests must exercise actual installed runDrone with stubbed transport completion, plus wrapper overlap and unopted-host behavior. A test that returns a fabricated resolvedModel on `ok:false` is invalid.

## A30 eligibility/census/shadow

New watcher experiment config defaults `mode:'off'`; allowed modes for this implementation are `off|census|shadow`, with no active mode. Off performs zero extra model calls. Census only counts already-required baseline activity. Shadow requires a separately validated approved run manifest before any real gate provider call; ordinary CI uses a stub adapter and denies network. Missing approval/known exposure/model revision denies the gate but never the baseline.

Eligibility is a deterministic function of source certification, matched subscription, current enablement/authority, pinned default-effective-policy hash and qualified model/schema revision. Any non-default prompt, severity rubric or category configuration, idless/flow/manual source, retired binding, invalid provenance or model drift bypasses with a typed reason. Explicit overrides equal to defaults may only qualify if their normalized effective policy hash and reviewed configuration-origin rule match; simplest safe default is to bypass any configured custom override. Classify one original trigger message.

Export one versioned record per stable logical source/computation, not per hook invocation. Contract `ComplaintEvaluationRecordV1` fields: version=1; logicalSourceId (hash); admission/result IDs; sourceCertification; policy/default-policy/model/schema/gate revisions; eligibility status/reason; baseline disposition `positive|negative|failed|unknown`; severity if valid; baseline attempt IDs; suggestion attempt IDs; optional gate attempt/result `forward|negative|abstain|unavailable`; known costs plus unknown/incomplete coverage for gate/baseline/retries; elapsed time; `mode`; immutable input hash; no raw source or recipient data. Re-export merges by same stable record/attempt identity, never adds a second bill.

C owns fixture eligibility, counting and export producer; F owns schema validation, denominator aggregation, uncertainty/severity bounds and promotion report. Gate-negative shadow records still run baseline and preserve delivery. Timeout/malformed/abstain cannot become negative. No eligible traffic yields `do_not_pilot:no_eligible_traffic`. Threshold/severity miss bounds are frozen only by a later approved experiment manifest; missing bounds or unbounded unknown exposure yields non-promotable. Paid holdout and active filtering are outside this PR. No live census is run without target/retention scope authorization.

## Exact C/F export schema v1

Gateway owns the implementation schema at planned `extensions/alert-watcher/src/complaint-evaluation.schema.json` and exporter `extensions/alert-watcher/src/complaint-evaluation.ts`. F imports the schema and emitted frozen fixtures by pinned Gateway commit plus schema SHA-256; it must reject absent/mismatched schema identity. This contract freezes field spelling as follows (all object properties required except where stated; JSON `null` is explicit unknown, never omission):

```ts
type ModelIdentity = { provider: string; model: string; revision: string };
type ComplaintAttemptV1 = {
  attemptId: string; // UUID, authoritative unique external-request attempt
  purpose: 'baseline' | 'gate' | 'suggestion';
  disposition: 'admitted' | 'received' | 'failed' | 'indeterminate';
  requestedModel: ModelIdentity;
  resolvedModel: ModelIdentity | null;
  costStatus: 'known' | 'unknown';
  costUsd: number | null; // finite >=0 iff known; null iff unknown
  costCoverage: 'complete' | 'incomplete';
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    cacheReadTokens: number | null;
    cacheCreationTokens: number | null;
  };
  elapsedMs: number; // finite >=0
};
type ComplaintEvaluationRecordV1 = {
  version: 1;
  schemaRevision: 'complaint-evaluation-v1';
  recordId: string; // stable computation UUID; export updates retain this ID
  receiptRevision: number; // positive safe integer, persisted monotonic revision for this computation
  logicalSourceId: string; // lowercase SHA-256 of stable policy/source/generation tuple
  authorityNamespaceHash: string;
  admissionId: string;
  resultId: string | null;
  inputHash: string;
  sourceCertification: 'certified' | 'idless' | 'uncertified';
  sourceCertificationRevision: string | null;
  policyId: string;
  policyHash: string;
  defaultPolicyHash: string;
  policyRevision: string;
  policyMode: 'default' | 'custom';
  classifierSchemaRevision: string;
  enabled: boolean;
  matched: boolean;
  mode: 'off' | 'census' | 'shadow';
  eligibility: {
    status: 'eligible' | 'bypass' | 'disabled';
    reason: 'eligible' | 'mode_off' | 'plugin_disabled' | 'unmatched' |
      'uncertified_source' | 'custom_policy' | 'model_drift' | 'invalid_binding';
  };
  requestedClassifierModel: ModelIdentity;
  resolvedClassifierModel: ModelIdentity | null;
  baseline: {
    disposition: 'positive' | 'negative' | 'failed' | 'unknown';
    severity: 'low' | 'med' | 'high' | null;
    attemptIds: string[];
  };
  gate: {
    revision: string;
    requestedModel: ModelIdentity;
    resolvedModel: ModelIdentity | null;
    disposition: 'forward' | 'negative' | 'abstain' | 'unavailable';
    attemptIds: string[];
  } | null;
  forwardedBaselineAttemptIds: string[];
  suggestionAttemptIds: string[];
  attempts: ComplaintAttemptV1[];
  deadlineStatus: 'within' | 'timeout' | 'unknown';
  costCoverage: 'complete' | 'incomplete';
  elapsedMs: number;
  severityLabelRevision: string | null; // independent label provenance, absent until supplied
};
```

All identity/hash/revision strings are bounded to 128 characters except hashes (exact 64 lowercase hex); IDs referring to work/attempt records are UUIDs. Model/provider names are bounded 128; schema disallows arbitrary extra properties. Arrays contain unique IDs, <=3 baseline attempts, <=1 suggestion attempt and <=1 gate attempt; combined attempts<=5 for this bounded pilot. Every referenced attempt must exist in `attempts` with matching purpose. No denied/unsubmitted operation is a paid attempt; record unavailable gate with empty attemptIds if admission never occurred. A local model revision string that cannot be qualified makes eligibility model_drift and prevents shadow admission; no invented model version.

`forwardedBaselineAttemptIds` records the counterfactual forwarded subset selected by the shadow decision; the baseline still runs for every eligible event. F reports actual observed cost including all baseline and gate attempts, and separately any counterfactual active estimate with its assumptions. It never drops shadow baseline bills to claim realized savings. Attempt IDs deduplicate cost; logicalSourceId deduplicates event denominator. The store increments `receiptRevision` in the same transaction as every export-relevant receipt update; an unchanged re-export retains its revision. On repeated export, identical same-revision records deduplicate and conflicting same-revision facts quarantine. A higher revision may extend prior admitted facts to terminal facts only with matching immutable source/policy/input/model binding and allowed receipt transitions; it cannot replace a known bill or an already terminal attempt with conflicting facts. Lower revisions cannot overwrite later evidence. Attempt IDs remain stable across revisions, so updating a record never adds a second bill. Unknown/incomplete coverage is non-promotable without a defensible approved upper bound. Independent labels are joined by record/input/policy revision, never inferred from baseline agreement.
