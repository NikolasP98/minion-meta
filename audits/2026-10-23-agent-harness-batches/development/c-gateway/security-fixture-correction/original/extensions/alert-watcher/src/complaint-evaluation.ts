import type { DatabaseSync } from "node:sqlite";
import type { InvocationUsage } from "../../../src/drones/run-with-usage.js";
import {
  getWork,
  type WorkRow,
  type SuggestionReceipt,
  type AuthorityObservation,
} from "./classification-work.js";
import {
  complaintEligibility,
  type Eligibility,
  type ExperimentMode,
} from "./jev-shadow-eligibility.js";
import { snapshotHash } from "./provenance.js";
import type { ShadowReceipt } from "./shadow-receipt.js";
export type ModelIdentity = { provider: string; model: string; revision: string };
export type ComplaintAttemptV1 = {
  attemptId: string;
  purpose: "baseline" | "gate" | "suggestion";
  disposition: "admitted" | "received" | "failed" | "indeterminate";
  requestedModel: ModelIdentity;
  resolvedModel: ModelIdentity | null;
  costStatus: "known" | "unknown";
  costUsd: number | null;
  costCoverage: "complete" | "incomplete";
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    cacheReadTokens: number | null;
    cacheCreationTokens: number | null;
  };
  elapsedMs: number;
};
export type ComplaintEvaluationRecordV1 = {
  version: 1;
  schemaRevision: "complaint-evaluation-v1";
  recordId: string;
  receiptRevision: number;
  logicalSourceId: string;
  authorityNamespaceHash: string;
  admissionId: string;
  resultId: string | null;
  inputHash: string;
  sourceCertification: "certified" | "idless" | "uncertified";
  sourceCertificationRevision: string | null;
  policyId: string;
  policyHash: string;
  defaultPolicyHash: string;
  policyRevision: string;
  policyMode: "default" | "custom";
  classifierSchemaRevision: string;
  enabled: boolean;
  matched: boolean;
  mode: ExperimentMode;
  eligibility: Eligibility;
  requestedClassifierModel: ModelIdentity;
  resolvedClassifierModel: ModelIdentity | null;
  baseline: {
    disposition: "positive" | "negative" | "failed" | "unknown";
    severity: "low" | "med" | "high" | null;
    attemptIds: string[];
  };
  gate: {
    revision: string;
    requestedModel: ModelIdentity;
    resolvedModel: ModelIdentity | null;
    disposition: "forward" | "negative" | "abstain" | "unavailable";
    attemptIds: string[];
  } | null;
  forwardedBaselineAttemptIds: string[];
  suggestionAttemptIds: string[];
  attempts: ComplaintAttemptV1[];
  deadlineStatus: "within" | "timeout" | "unknown";
  costCoverage: "complete" | "incomplete";
  elapsedMs: number;
  severityLabelRevision: string | null;
};
export type EvaluationBinding = {
  model: string;
  defaultPolicyHash: string;
  customPolicy: boolean;
  mode: ExperimentMode;
  modelRevision: string;
  modelQualified: boolean;
  sourceCertification?: "certified" | "uncertified" | "idless";
  invocationPurpose?: "classification" | "suggestion";
};
export function modelRevision(model: string): string {
  return /-\d{8}$/.test(model) ? model : "unqualified";
}
function attemptRecord(
  raw: Omit<Partial<InvocationUsage>, "dispatchStatus"> & {
    attemptId: string;
    disposition: ComplaintAttemptV1["disposition"];
  },
  binding: EvaluationBinding,
  purpose: ComplaintAttemptV1["purpose"],
): ComplaintAttemptV1 {
  const identity = (model: { provider: string; model: string }): ModelIdentity => ({
    ...model,
    revision:
      model.provider === "anthropic" && model.model === binding.model
        ? binding.modelRevision
        : modelRevision(model.model),
  });
  const usage = raw.usage ?? {};
  return {
    attemptId: raw.attemptId,
    purpose,
    disposition: raw.disposition,
    requestedModel: identity(raw.requestedModel ?? { provider: "anthropic", model: binding.model }),
    resolvedModel: raw.resolvedModel ? identity(raw.resolvedModel) : null,
    costStatus: raw.costStatus ?? "unknown",
    costUsd: raw.costUsd ?? null,
    costCoverage: raw.costCoverage ?? "incomplete",
    usage: {
      inputTokens: usage.inputTokens ?? null,
      outputTokens: usage.outputTokens ?? null,
      cacheReadTokens: usage.cacheReadTokens ?? null,
      cacheCreationTokens: usage.cacheCreationTokens ?? null,
    },
    elapsedMs: raw.elapsedMs ?? 0,
  };
}
/** One stable record per computation. Re-export does not change receiptRevision. */
export function exportComplaintEvaluation(
  db: DatabaseSync,
  id: string,
): ComplaintEvaluationRecordV1 {
  const row = getWork(db, id) as WorkRow & { evaluation_binding: string; shadow_json: string };
  if (!row) {
    throw new Error("missing_work");
  }
  const binding = JSON.parse(row.evaluation_binding) as EvaluationBinding;
  const authority = row.authority_observation
    ? (JSON.parse(row.authority_observation) as AuthorityObservation)
    : null;
  const enabled = row.namespace_retired === 0 && authority?.status !== "disabled";
  const matched =
    binding.sourceCertification !== "uncertified" &&
    binding.sourceCertification !== "idless" &&
    authority?.status !== "unmatched";
  const bindingValid =
    row.namespace_retired === 0 && (authority === null || authority.status === "valid");
  const invocationHistory = JSON.parse(row.attempts_json) as Array<
    Omit<Partial<InvocationUsage>, "dispatchStatus"> & {
      attemptId: string;
      disposition: ComplaintAttemptV1["disposition"];
      dispatchStatus?: "preparing" | "may_have_submitted" | "not_submitted";
    }
  >;
  const attempts = invocationHistory
    .filter(
      (attempt) =>
        attempt.dispatchStatus !== "not_submitted" &&
        !(
          attempt.disposition === "admitted" &&
          attempt.dispatchStatus === "preparing" &&
          row.state !== "indeterminate"
        ),
    )
    .map((a) =>
      attemptRecord(
        {
          ...a,
          disposition:
            a.disposition === "admitted" && row.state === "indeterminate"
              ? "indeterminate"
              : a.disposition,
        },
        binding,
        binding.invocationPurpose === "suggestion" ? "suggestion" : "baseline",
      ),
    );
  const suggestion = JSON.parse(row.suggestion_json) as SuggestionReceipt;
  if (
    suggestion.attemptId &&
    suggestion.dispatchStatus !== "not_submitted" &&
    !(suggestion.state === "admitted" && suggestion.dispatchStatus === "preparing")
  ) {
    attempts.push(
      attemptRecord(
        {
          ...suggestion.usage,
          attemptId: suggestion.attemptId,
          disposition:
            suggestion.state === "received"
              ? suggestion.result?.ok
                ? "received"
                : "failed"
              : suggestion.state === "indeterminate"
                ? "indeterminate"
                : "admitted",
        },
        binding,
        "suggestion",
      ),
    );
  }
  const terminal = row.terminal_result
    ? (JSON.parse(row.terminal_result) as {
        ok: boolean;
        data?: { is_complaint: boolean; severity: "low" | "med" | "high" };
        error?: { code: string };
      })
    : null;
  const shadow = JSON.parse(row.shadow_json) as ShadowReceipt | null;
  if (shadow?.attemptId) {
    attempts.push(
      attemptRecord(
        {
          ...shadow.usage,
          attemptId: shadow.attemptId,
          disposition:
            shadow.state === "received"
              ? "received"
              : shadow.state === "indeterminate" || row.state === "indeterminate"
                ? "indeterminate"
                : "admitted",
          requestedModel: shadow.requestedModel,
          resolvedModel: shadow.resolvedModel,
        },
        binding,
        "gate",
      ),
    );
  }
  const baselineIds = attempts.filter((a) => a.purpose === "baseline").map((a) => a.attemptId);
  // A retryable invocation error is not a terminal fact about this computation.
  const retryPossible =
    row.state === "queued" ||
    row.state === "admitted" ||
    (row.state === "received" && terminal?.error?.code === "NO_API_KEY" && row.attempt_count < 3);
  const publishResult = !!terminal && !retryPossible;
  const disposition = retryPossible
    ? "unknown"
    : terminal
      ? terminal.ok
        ? terminal.data?.is_complaint
          ? "positive"
          : "negative"
        : "failed"
      : row.redacted_at && row.state === "completed"
        ? "unknown"
        : row.state === "failed"
          ? "failed"
          : "unknown";
  const requestedClassifierModel = {
    provider: "anthropic",
    model: binding.model,
    revision: binding.modelRevision,
  };
  return {
    version: 1,
    schemaRevision: "complaint-evaluation-v1",
    recordId: row.id,
    receiptRevision: row.receipt_revision,
    logicalSourceId: row.admission_key,
    authorityNamespaceHash: snapshotHash(row.namespace),
    admissionId: row.id,
    resultId: publishResult && row.received_at ? row.attempt_id : null,
    inputHash: row.input_hash,
    sourceCertification: binding.sourceCertification ?? "certified",
    sourceCertificationRevision:
      binding.sourceCertification && binding.sourceCertification !== "certified"
        ? null
        : "telegram-original-v1",
    policyId: row.policy_id,
    policyHash: row.policy_hash,
    defaultPolicyHash: binding.defaultPolicyHash,
    policyRevision: "alert-classifier-v1",
    policyMode: binding.customPolicy ? "custom" : "default",
    classifierSchemaRevision: "alert-classifier-v1",
    enabled,
    matched,
    mode: binding.mode,
    eligibility: complaintEligibility({
      mode: binding.mode,
      enabled,
      matched,
      certified:
        binding.sourceCertification === undefined || binding.sourceCertification === "certified",
      customPolicy: binding.customPolicy,
      modelQualified: binding.modelQualified,
      bindingValid,
    }),
    requestedClassifierModel,
    resolvedClassifierModel:
      attempts.findLast((a) => a.purpose === "baseline" && a.resolvedModel)?.resolvedModel ?? null,
    baseline: {
      disposition,
      severity:
        publishResult && terminal?.ok && terminal.data?.is_complaint
          ? terminal.data.severity
          : null,
      attemptIds: baselineIds,
    },
    gate: shadow
      ? {
          revision: shadow.revision,
          requestedModel: shadow.requestedModel,
          resolvedModel: shadow.resolvedModel,
          disposition: shadow.disposition,
          attemptIds: shadow.attemptId ? [shadow.attemptId] : [],
        }
      : null,
    forwardedBaselineAttemptIds: shadow?.disposition === "negative" ? [] : baselineIds,
    suggestionAttemptIds: attempts
      .filter((a) => a.purpose === "suggestion")
      .map((a) => a.attemptId),
    attempts,
    deadlineStatus:
      terminal?.error?.code === "TIMEOUT" ? "timeout" : terminal ? "within" : "unknown",
    costCoverage:
      ["completed", "failed", "canceled"].includes(row.state) &&
      attempts.every((a) => a.costCoverage === "complete")
        ? "complete"
        : "incomplete",
    // SDK preparation/auth time remains observable even when no provider bill exists.
    elapsedMs:
      invocationHistory.reduce((n, a) => n + (a.elapsedMs ?? 0), 0) +
      (suggestion.usage?.elapsedMs ?? 0) +
      (shadow?.usage?.elapsedMs ?? 0),
    severityLabelRevision: null,
  };
}
