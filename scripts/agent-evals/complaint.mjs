import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import {
  assert,
  object,
  canonical,
  digest,
  readJSON,
  args,
  direct,
  main,
  safePath,
} from "./lib/common.mjs";
import { verifyCheckout, loadManifest } from "./lib/manifest.mjs";
const immutable = [
  "version",
  "schemaRevision",
  "recordId",
  "logicalSourceId",
  "authorityNamespaceHash",
  "admissionId",
  "inputHash",
  "sourceCertification",
  "sourceCertificationRevision",
  "policyId",
  "policyHash",
  "defaultPolicyHash",
  "policyRevision",
  "policyMode",
  "classifierSchemaRevision",
  "mode",
  "requestedClassifierModel",
  "severityLabelRevision",
];
function references(record) {
  const ids = new Map();
  for (const a of record.attempts) {
    assert(!ids.has(a.attemptId), "duplicate attempt in complaint");
    ids.set(a.attemptId, a);
  }
  for (const [list, purpose] of [
    [record.baseline.attemptIds, "baseline"],
    [record.gate?.attemptIds ?? [], "gate"],
    [record.suggestionAttemptIds, "suggestion"],
    [record.forwardedBaselineAttemptIds, "baseline"],
  ])
    for (const id of list)
      assert(
        ids.get(id)?.purpose === purpose,
        "complaint attempt purpose/reference mismatch",
      );
  for (const a of record.attempts)
    assert(
      (a.purpose === "baseline"
        ? record.baseline.attemptIds
        : a.purpose === "gate"
          ? (record.gate?.attemptIds ?? [])
          : record.suggestionAttemptIds
      ).includes(a.attemptId),
      "unreferenced complaint attempt",
    );
}
function extendsAttempt(old, next) {
  assert(
    old.attemptId === next.attemptId &&
      old.purpose === next.purpose &&
      canonical(old.requestedModel) === canonical(next.requestedModel),
    "immutable attempt binding",
  );
  if (old.resolvedModel !== null)
    assert(
      canonical(old.resolvedModel) === canonical(next.resolvedModel),
      "resolved attempt model changed",
    );
  if (old.costStatus === "known")
    assert(
      next.costStatus === "known" && old.costUsd === next.costUsd,
      "known bill replacement",
    );
  if (old.costCoverage === "complete")
    assert(next.costCoverage === "complete", "cost coverage regressed");
  if (old.disposition !== "admitted")
    assert(
      old.disposition === next.disposition,
      "terminal attempt replacement",
    );
  if (old.disposition !== "admitted")
    assert(
      canonical(old.usage) === canonical(next.usage) &&
        old.elapsedMs === next.elapsedMs,
      "terminal usage replacement",
    );
}
function extendsRecord(old, next) {
  for (const k of immutable)
    assert(
      canonical(old[k]) === canonical(next[k]),
      `immutable complaint ${k}`,
    );
  if (old.resultId !== null)
    assert(old.resultId === next.resultId, "result replacement");
  if (old.resolvedClassifierModel !== null)
    assert(
      canonical(old.resolvedClassifierModel) ===
        canonical(next.resolvedClassifierModel),
      "resolved classifier replacement",
    );
  if (old.baseline.disposition !== "unknown")
    assert(
      old.baseline.disposition === next.baseline.disposition &&
        old.baseline.severity === next.baseline.severity,
      "terminal baseline replacement",
    );
  if (old.gate) {
    assert(
      next.gate &&
        old.gate.revision === next.gate.revision &&
        canonical(old.gate.requestedModel) ===
          canonical(next.gate.requestedModel),
      "gate binding changed",
    );
    if (old.gate.resolvedModel !== null)
      assert(
        canonical(old.gate.resolvedModel) ===
          canonical(next.gate.resolvedModel),
        "resolved gate replacement",
      );
    if (!old.gate.attemptIds.length)
      assert(
        canonical(old.gate) === canonical(next.gate),
        "unadmitted terminal gate replacement",
      );
    if (
      old.gate.attemptIds.some(
        (id) =>
          old.attempts.find((a) => a.attemptId === id)?.disposition !==
          "admitted",
      )
    )
      assert(
        old.gate.disposition === next.gate.disposition,
        "terminal gate replacement",
      );
  }
  for (const a of old.attempts) {
    const n = next.attempts.find((x) => x.attemptId === a.attemptId);
    assert(n, "removed attempt");
    extendsAttempt(a, n);
  }
  if (old.costCoverage === "complete")
    assert(next.costCoverage === "complete", "record cost coverage regression");
}
export function loadComplaintInput(file, pin) {
  safePath(path.resolve(file));
  const raw = fs.readFileSync(file);
  assert(
    digest(raw) === pin.fixtureSha256,
    "C complaint producer snapshot mismatch",
  );
  return readJSON(file);
}
export function compileComplaintSchema(root, pin) {
  let schemaFile, exporterFile;
  if (fs.existsSync(path.join(root, "artifact.json"))) {
    const artifact = readJSON(path.join(root, "artifact.json"));
    object(artifact, [
      "version",
      "sourceCommit",
      "lockSha256",
      "schemaSha256",
      "exporterSha256",
      "fixtureSha256",
      "producer",
      "qualification",
    ]);
    assert(
      artifact.version === 1 &&
        artifact.sourceCommit === pin.commit &&
        artifact.lockSha256 === pin.lockSha256 &&
        artifact.schemaSha256 === pin.schemaSha256 &&
        artifact.exporterSha256 === pin.exporterSha256 &&
        artifact.fixtureSha256 === pin.fixtureSha256,
      "C artifact source pin mismatch",
    );
    assert(
      artifact.producer === "gateway-complaint-evaluation-v1" &&
        artifact.qualification === "producer_emitted",
      "uncertified C artifact",
    );
    schemaFile = path.join(root, "complaint-evaluation.schema.json");
    exporterFile = path.join(root, "complaint-evaluation.ts");
    assert(
      digest(
        fs.readFileSync(path.join(root, "complaint-evaluation-v1.json")),
      ) === artifact.fixtureSha256,
      "C producer fixture mismatch",
    );
  } else {
    verifyCheckout(root, pin);
    schemaFile = path.join(
      root,
      "extensions/alert-watcher/src/complaint-evaluation.schema.json",
    );
    exporterFile = path.join(
      root,
      "extensions/alert-watcher/src/complaint-evaluation.ts",
    );
  }
  safePath(schemaFile);
  safePath(exporterFile);
  assert(
    digest(fs.readFileSync(exporterFile)) === pin.exporterSha256,
    "C exporter source pin mismatch",
  );
  const raw = fs.readFileSync(schemaFile);
  assert(digest(raw) === pin.schemaSha256, "C complaint schema pin mismatch");
  const ajv = new Ajv({ allErrors: true, strict: true });
  ajv.addFormat(
    "uuid",
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
  );
  const validate = ajv.compile(JSON.parse(raw));
  return (record) => {
    assert(
      validate(record),
      `C complaint schema: ${ajv.errorsText(validate.errors)}`,
    );
    references(record);
  };
}
export function reconcileComplaints(records, validate) {
  const map = new Map(),
    quarantine = [],
    history = [];
  for (const record of [...records].sort(
    (a, b) => a.receiptRevision - b.receiptRevision,
  )) {
    validate(record);
    const old = map.get(record.recordId);
    try {
      if (old) {
        if (old.receiptRevision === record.receiptRevision)
          assert(
            canonical(old) === canonical(record),
            "conflicting same receipt revision",
          );
        else extendsRecord(old, record);
      }
      if (!old || old.receiptRevision !== record.receiptRevision)
        history.push(record);
      map.set(record.recordId, record);
    } catch (error) {
      quarantine.push({ recordId: record.recordId, reason: error.message });
    }
  }
  const bad = new Set(quarantine.map((x) => x.recordId));
  return {
    records: [...map.values()].filter((r) => !bad.has(r.recordId)),
    quarantine,
    history,
  };
}
export function complaintReport(
  records,
  validate,
  registration = null,
  labels = [],
) {
  const reconciled = reconcileComplaints(records, validate),
    sources = new Map(),
    attempts = new Map(),
    quarantine = [...reconciled.quarantine];
  for (const r of reconciled.records) {
    const key = `${r.logicalSourceId}:${r.authorityNamespaceHash}:${r.inputHash}:${r.policyHash}`;
    const prior = sources.get(key);
    if (prior && canonical(prior) !== canonical(r)) {
      quarantine.push({
        recordId: r.recordId,
        reason: "conflicting logical source",
      });
      continue;
    }
    sources.set(key, r);
    for (const a of r.attempts) {
      const old = attempts.get(a.attemptId);
      if (old && canonical(old) !== canonical(a))
        quarantine.push({
          recordId: r.recordId,
          reason: "conflicting shared attempt",
        });
      else attempts.set(a.attemptId, a);
    }
  }
  // Current authority can change; accepted historical eligibility fixes the census cohort.
  const sourceKey = (r) =>
    `${r.logicalSourceId}:${r.authorityNamespaceHash}:${r.inputHash}:${r.policyHash}`;
  const historicallyEligible = new Set(
    reconciled.history
      .filter((r) => r.eligibility.status === "eligible")
      .map(sourceKey),
  );
  const eligible = [...sources.values()].filter((r) =>
      historicallyEligible.has(sourceKey(r)),
    ),
    eligibleKeys = new Set(eligible.map((r) => r.recordId)),
    eligibleAttempts = new Map();
  for (const r of eligible)
    for (const a of r.attempts) eligibleAttempts.set(a.attemptId, a);
  const costs = (items) => {
    const ordered = [...items].sort((a, b) =>
      a.attemptId.localeCompare(b.attemptId),
    );
    return {
      knownUsd: ordered.reduce((n, a) => n + (a.costUsd ?? 0), 0),
      unknownAttempts: ordered
        .filter(
          (a) => a.costStatus === "unknown" || a.costCoverage !== "complete",
        )
        .map((a) => a.attemptId),
      attempts: ordered.length,
    };
  };
  // Quarantined facts remain visible as billed evidence; ambiguity blocks conclusions.
  const billed = new Map();
  // Accepted final revisions are authoritative for monotonic coverage refinement.
  for (const r of reconciled.records)
    for (const a of r.attempts) billed.set(a.attemptId, a);
  const rawAttempts = new Map();
  for (const r of records)
    for (const a of r.attempts) {
      const versions = rawAttempts.get(a.attemptId) ?? [];
      versions.push({
        revision: r.receiptRevision,
        recordId: r.recordId,
        attempt: a,
      });
      rawAttempts.set(a.attemptId, versions);
    }
  for (const [id, versions] of rawAttempts) {
    versions.sort(
      (a, b) =>
        a.revision - b.revision ||
        canonical(a.attempt).localeCompare(canonical(b.attempt)),
    );
    let latest,
      conflict = false;
    for (const { revision, attempt } of versions) {
      if (latest) {
        try {
          if (latest.revision === revision)
            assert(
              canonical(latest.attempt) === canonical(attempt),
              "conflicting attempt revision",
            );
          else extendsAttempt(latest.attempt, attempt);
        } catch {
          conflict = true;
        }
      }
      latest = { revision, attempt };
    }
    if (!conflict) billed.set(id, latest.attempt);
    else {
      // Conflicts cannot erase paid evidence or manufacture complete billing.
      const known = versions
        .map((v) => v.attempt)
        .filter((a) => a.costStatus === "known");
      const conservative =
        known.sort((a, b) => b.costUsd - a.costUsd)[0] ?? latest.attempt;
      billed.set(id, { ...conservative, costCoverage: "incomplete" });
      if (
        !quarantine.some(
          (q) =>
            q.attemptId === id ||
            versions.some((v) => v.recordId === q.recordId),
        )
      )
        quarantine.push({
          attemptId: id,
          reason: "conflicting billed attempt history",
        });
    }
  }
  const actual = costs([...billed.values()]),
    eligibleActual = costs([...eligibleAttempts.values()]);
  const cfIds = new Set(
    eligible.flatMap((r) => [
      ...(r.gate?.attemptIds ?? []),
      ...r.forwardedBaselineAttemptIds,
      ...r.suggestionAttemptIds,
    ]),
  );
  const counterfactual = costs(
    [...eligibleAttempts.values()].filter((a) => cfIds.has(a.attemptId)),
  );
  const baselineCost = costs(
    [...eligibleAttempts.values()].filter((a) => a.purpose === "baseline"),
  );
  const costRatio =
    baselineCost.knownUsd > 0 &&
    !counterfactual.unknownAttempts.length &&
    !baselineCost.unknownAttempts.length
      ? counterfactual.knownUsd / baselineCost.knownUsd
      : null;
  const incomplete = eligible.filter(
    (r) =>
      (r.mode === "shadow" &&
        (!r.baseline.attemptIds.length ||
          !["positive", "negative"].includes(r.baseline.disposition))) ||
      r.costCoverage !== "complete" ||
      r.deadlineStatus !== "within",
  );
  const reasons = [];
  if (eligible.some((r) => r.eligibility.status !== "eligible"))
    reasons.push("current_authority_ineligible");
  if (!eligible.length) reasons.push("no_eligible_traffic");
  if (incomplete.length || eligibleActual.unknownAttempts.length)
    reasons.push("incomplete_baseline_or_cost");
  if (quarantine.length) reasons.push("quarantined_records");
  if (costRatio === null || costRatio >= 1)
    reasons.push("counterfactual_cost_superiority_unproven");
  if (
    !registration?.thresholdRevision ||
    !registration?.developmentEvidenceSha256 ||
    !registration?.severityBounds ||
    !registration?.controlSample ||
    registration?.labelRevision === undefined
  )
    reasons.push("missing_frozen_threshold_or_severity_registration");
  const miss = { urgent: 0, critical: 0 },
    n = { urgent: 0, critical: 0 };
  for (const r of eligible) {
    const l = labels.find(
      (l) =>
        l.recordId === r.recordId &&
        l.inputHash === r.inputHash &&
        l.policyHash === r.policyHash &&
        l.revision === r.severityLabelRevision &&
        l.revision === registration?.labelRevision &&
        l.method === "human_adjudicated" &&
        l.blindToGate === true,
    );
    if (!l) {
      reasons.push("missing_independent_severity_label");
      continue;
    }
    if (["urgent", "critical"].includes(l.severity)) {
      n[l.severity]++;
      if (r.gate?.disposition === "negative") miss[l.severity]++;
    }
  }
  const bounds = {};
  for (const severity of ["urgent", "critical"]) {
    bounds[severity] = n[severity] ? 1 - Math.pow(0.05, 1 / n[severity]) : 1;
    if (miss[severity]) reasons.push("additional_urgent_critical_miss");
    if (
      !registration?.severityBounds ||
      bounds[severity] > registration.severityBounds[severity]
    )
      reasons.push("severity_miss_bound_unproven");
  }
  return {
    version: 1,
    status: !eligible.length
      ? "do_not_pilot:no_eligible_traffic"
      : reasons.length
        ? "inconclusive"
        : "eligible_for_human_review",
    reasons: [...new Set(reasons)],
    logicalSources: sources.size,
    eligibleLogicalSources: eligible.length,
    currentEligibleLogicalSources: [...sources.values()].filter(
      (r) => r.eligibility.status === "eligible",
    ).length,
    eligibilityBasis: "ever_eligible_accepted_revision",
    eligibilityHistory: [...sources.values()].map((r) => ({
      logicalSourceId: r.logicalSourceId,
      current: r.eligibility,
      historicallyEligible: historicallyEligible.has(sourceKey(r)),
      receiptRevision: r.receiptRevision,
    })),
    strata: [...sources.values()].reduce((a, r) => {
      const k = `${r.eligibility.status}:${r.eligibility.reason}`;
      a[k] = (a[k] ?? 0) + 1;
      return a;
    }, {}),
    actualShadowCosts: actual,
    costComparison: {
      baseline: baselineCost,
      counterfactualRatio: costRatio,
      realizedSavingsClaimed: false,
    },
    eligibleActualCosts: eligibleActual,
    counterfactualActiveCosts: {
      ...counterfactual,
      assumptions:
        "hypothetical gate + forwarded baseline + suggestion; shadow baseline bills remain in actual costs",
    },
    costPerEligibleLogicalSource: eligible.length
      ? eligibleActual.knownUsd / eligible.length
      : null,
    miss,
    missRateUpper: bounds,
    quarantine,
    incomplete: incomplete.map((r) => r.recordId),
    authority: "analysis_only_no_activation",
  };
}
if (direct(import.meta.url))
  main(async () => {
    const a = args(process.argv.slice(2));
    const { manifest } = loadManifest(a.manifest);
    assert(manifest.provenance.gateway, "pinned C source required");
    const validate = compileComplaintSchema(
      path.resolve(a["gateway-root"]),
      manifest.provenance.gateway,
    );
    console.log(
      canonical(
        complaintReport(
          loadComplaintInput(a.input, manifest.provenance.gateway),
          validate,
          manifest.gates.complaint,
          a.labels ? readJSON(a.labels) : [],
        ),
      ),
    );
  });
