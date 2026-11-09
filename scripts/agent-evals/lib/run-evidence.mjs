import path from "node:path";
import { assert, readJSON, jsonl, digest, canonical } from "./common.mjs";
import { loadManifest } from "./manifest.mjs";
import { validateRecord, validatePayload, dedupe } from "./receipts.mjs";
const lineage = [
  "runId",
  "episodeId",
  "clusterId",
  "arm",
  "rootId",
  "submissionId",
  "parentId",
];
const sameLineage = (a, b) => lineage.every((key) => a[key] === b[key]);
export function reconcileRunEvidence(root) {
  const result = readJSON(path.join(root, "result.json")),
    { manifest } = loadManifest(path.join(root, "manifest.json"));
  assert(
    digest(manifest) === result.manifestSha256,
    "run manifest hash changed",
  );
  const rawEvents = jsonl(path.join(root, "events.jsonl")).map(validateRecord),
    rawReceipts = jsonl(path.join(root, "receipts.jsonl")).map(validateRecord);
  const all = dedupe([...rawEvents, ...rawReceipts]),
    invalid = new Set(),
    invalidFinancial = new Set();
  for (const r of all.records) {
    try {
      validatePayload(r);
      assert(
        r.runId === result.runId &&
          digest(r.revisions) === digest(manifest.provenance),
        "run source binding",
      );
    } catch {
      if (
        ["provider_settled", "provider_failed", "provider_received"].includes(
          r.kind,
        )
      )
        invalidFinancial.add(r.id);
      else invalid.add(r.id);
    }
  }
  const events = dedupe(rawEvents),
    receipts = dedupe(rawReceipts),
    analysis = structuredClone(result.analysis);
  analysis.expectedEpisodes = manifest.corpus.episodeIds;
  const globalProblems = [];
  const global = (kind, records) => {
    const matches = records.filter((r) => r.kind === kind);
    if (matches.length !== 1)
      globalProblems.push(`missing_or_conflicting_${kind}`);
    const record = matches.length === 1 ? matches[0] : undefined;
    if (
      record &&
      (invalid.has(record.id) ||
        record.episodeId !== "run" ||
        record.clusterId !== "run" ||
        record.arm !== "run" ||
        record.rootId !== result.runId ||
        record.submissionId !== result.runId ||
        record.parentId !== null ||
        record.attemptId !== null)
    )
      globalProblems.push(`invalid_global_${kind}`);
    return record;
  };
  const identity = global("adapter_identity", receipts.records),
    prepared = global("prepared", events.records),
    hub = manifest.provenance.hub;
  if (
    identity &&
    (identity.payload.protocol !== "minion-agent-eval-fixture/v1" ||
      identity.payload.disposable !== true ||
      identity.payload.sourceSha !== hub.commit ||
      identity.payload.sourceHash !== hub.sourceSha256 ||
      identity.payload.lockHash !== hub.lockSha256 ||
      identity.payload.buildHash !== hub.buildSha256 ||
      identity.payload.adapterHash !== hub.adapterSha256)
  )
    globalProblems.push("adapter_provenance_mismatch");
  if (
    identity?.payload.sources !== undefined &&
    (!Array.isArray(identity.payload.sources) ||
      digest(JSON.stringify(identity.payload.sources)) !== hub.sourceSha256)
  )
    globalProblems.push("adapter_source_inventory_mismatch");
  if (
    prepared &&
    (prepared.payload.manifestSha256 !== digest(manifest) ||
      prepared.payload.approvalSha256 !== result.approvalSha256 ||
      prepared.payload.mode !== manifest.mode)
  )
    globalProblems.push("prepared_manifest_mismatch");
  for (const row of analysis.observations) {
    const relevant = receipts.records.filter(
        (r) => r.episodeId === row.episodeId && r.arm === row.arm,
      ),
      related = events.records.filter(
        (r) => r.episodeId === row.episodeId && r.arm === row.arm,
      );
    const problems = [...globalProblems],
      billingProblems = [];
    // Lifecycle records have no revision/supersession protocol. Only a single
    // record after exact-ID deduplication can supply authoritative state.
    const singleton = (kind) => {
      const matches = relevant.filter((r) => r.kind === kind);
      if (matches.length !== 1) problems.push(`missing_or_conflicting_${kind}`);
      return matches.length === 1 ? matches[0] : undefined;
    };
    const reset = singleton("reset"),
      collection = singleton("collection");
    if (related.some((r) => ["failed", "canceled"].includes(r.kind)))
      problems.push("terminal_task_failure_or_cancellation");
    if (invalidFinancial.size)
      billingProblems.push("invalid_typed_financial_evidence");
    const requests = related.filter((r) => r.kind === "provider_requested"),
      steps = related.filter((r) => r.kind === "step");
    for (const request of requests) {
      const model =
        request.payload.kind === "classifier"
          ? manifest.provenance.model.classifier
          : manifest.provenance.model;
      if (request.payload.requestedModel !== model?.requested)
        problems.push("unapproved_request_model");
      const peers = requests.filter((r) => r.attemptId === request.attemptId);
      if (
        peers.some(
          (r) =>
            !sameLineage(r, request) ||
            canonical(r.payload) !== canonical(request.payload),
        )
      )
        problems.push("conflicting_attempt_requests");
    }
    if (!reset || !collection) problems.push("missing_reset_or_collection");
    if (
      all.quarantine.length ||
      events.quarantine.length ||
      receipts.quarantine.length
    )
      problems.push("conflicting_record_ids");
    if (
      invalid.size ||
      [...relevant, ...related].some((r) => invalid.has(r.id))
    )
      problems.push("invalid_typed_evidence");
    if (reset) {
      if (
        reset.clusterId !== row.clusterId ||
        (collection &&
          (collection.rootId !== reset.rootId ||
            collection.clusterId !== reset.clusterId))
      )
        problems.push("foreign_root_or_cluster");
      for (const r of [...relevant, ...related])
        if (r.rootId !== reset.rootId || r.clusterId !== reset.clusterId)
          problems.push("foreign_root_or_cluster");
      const submissions = new Set([reset.submissionId]);
      for (const step of steps) {
        if (
          step.parentId === null ||
          !submissions.has(step.parentId) ||
          submissions.has(step.submissionId)
        )
          problems.push("broken_step_parent_chain");
        submissions.add(step.submissionId);
      }
      for (const request of requests)
        if (!steps.some((step) => sameLineage(step, request)))
          problems.push("foreign_request_lineage");
      const finalStep = steps.at(-1) ?? reset;
      if (collection && !sameLineage(collection, finalStep))
        problems.push("foreign_collection_lineage");
    }
    const expected = manifest.evidence.expectedKinds.filter(
      (k) => k !== "adapter_identity",
    );
    for (const kind of expected)
      if (!relevant.some((r) => r.kind === kind && !invalid.has(r.id)))
        (kind.startsWith("provider_") ? billingProblems : problems).push(
          "missing_expected_receipt",
        );
    const attemptIds = new Set(requests.map((r) => r.attemptId));
    const terminalKinds = ["provider_settled", "provider_failed"];
    const providerRecords = relevant.filter((r) =>
      r.kind.startsWith("provider_"),
    );
    for (const r of providerRecords) {
      const request = requests.find((q) => q.attemptId === r.attemptId);
      if (
        !request ||
        !sameLineage(request, r) ||
        r.payload.attemptId !== r.attemptId
      ) {
        problems.push("foreign_provider_lineage");
        if (
          ["provider_received", "provider_settled", "provider_failed"].includes(
            r.kind,
          )
        ) {
          invalidFinancial.add(r.id);
          billingProblems.push("unjoined_financial_lineage");
        }
      }
      if (
        r.kind === "provider_settled" &&
        (r.payload.episodeId !== r.episodeId || r.payload.arm !== r.arm)
      )
        problems.push("foreign_provider_payload_scope");
    }
    let knownLower = 0,
      upper = 0,
      allKnown = true,
      allBounded = true,
      knownAttempts = 0;
    const drift = [];
    for (const id of new Set([
      ...attemptIds,
      ...providerRecords.map((r) => r.attemptId),
    ])) {
      const request = requests.find((r) => r.attemptId === id),
        records = providerRecords.filter((r) => r.attemptId === id),
        terminals = records.filter((r) => terminalKinds.includes(r.kind)),
        received = records.filter((r) => r.kind === "provider_received"),
        failures = records.filter((r) => r.kind === "provider_terminal");
      if (terminals.length !== 1) {
        billingProblems.push("missing_or_conflicting_attempt_terminal");
        problems.push("missing_or_conflicting_attempt_terminal");
      }
      if (received.length > 1) {
        problems.push("conflicting_provider_received");
        billingProblems.push("conflicting_provider_received");
      }
      if (failures.length > 1) {
        problems.push("conflicting_provider_terminal");
        billingProblems.push("conflicting_provider_terminal");
      }
      if (
        failures.length ||
        terminals.some((r) => r.kind === "provider_failed")
      )
        problems.push("terminal_provider_failure");
      const financial = records.filter((r) =>
        ["provider_received", ...terminalKinds].includes(r.kind),
      );
      const malformed = financial.some(
        (r) => invalid.has(r.id) || invalidFinancial.has(r.id),
      );
      const known = financial
        .filter(
          (r) =>
            !invalid.has(r.id) &&
            !invalidFinancial.has(r.id) &&
            r.payload.costStatus === "known",
        )
        .map((r) =>
          r.payload.exactCostUsd !== undefined
            ? r.payload.exactCostUsd * 1e6
            : r.payload.costMicroUsd,
        );
      const lower = known.length ? Math.max(...known) : 0;
      const terminal = terminals[0];
      const knownBill =
        !malformed &&
        terminals.length === 1 &&
        received.length <= 1 &&
        failures.length <= 1 &&
        terminal.payload.costStatus === "known" &&
        financial.every(
          (r) =>
            r.payload.costStatus === "known" &&
            (r.kind !== "provider_received" ||
              r.payload.billingComplete === true),
        ) &&
        known.every((n) => n === lower);
      if (knownBill) {
        knownLower += lower;
        upper += lower;
        knownAttempts++;
      } else {
        knownLower += lower;
        allKnown = false;
        billingProblems.push("incomplete_or_conflicting_bill");
        const ceilings = terminals.map((r) => r.payload.upperMicroUsd);
        if (
          ceilings.length > 0 &&
          ceilings.every(
            (ceiling) =>
              typeof ceiling === "number" &&
              Number.isFinite(ceiling) &&
              ceiling >= lower,
          ) &&
          !malformed
        )
          upper += Math.max(...ceilings);
        else allBounded = false;
      }
      for (const record of records) {
        if (
          record.kind === "provider_settled" &&
          request &&
          (record.payload.kind !== request.payload.kind ||
            record.payload.requestedModel !== request.payload.requestedModel)
        )
          problems.push("provider_model_binding");
        const model =
          request?.payload.kind === "classifier"
            ? manifest.provenance.model.classifier
            : manifest.provenance.model;
        if (
          record.payload.resolvedModel &&
          !model?.resolved.includes(record.payload.resolvedModel)
        )
          drift.push({
            kind: request?.payload.kind ?? "unknown",
            requested: request?.payload.requestedModel ?? null,
            resolved: record.payload.resolvedModel,
          });
      }
    }
    if (collection) {
      if (
        !collection.payload.complete ||
        collection.payload.missing.length ||
        collection.payload.quarantine.length ||
        collection.payload.network.externalRequests !== 0 ||
        (collection.payload.network.violations?.length ?? 0) > 0 ||
        (collection.payload.outcome === "success" &&
          collection.payload.critical.length)
      )
        problems.push("incomplete_collection");
      for (const domain of collection.payload.domainReceipts) {
        const main = requests.find(
          (r) =>
            r.payload.adapterRunId === domain.runId &&
            r.payload.adapterSessionKey === domain.sessionKey,
        );
        if (
          !main ||
          domain.episodeId !== row.episodeId ||
          domain.arm !== row.arm ||
          domain.actorId !== manifest.scope.actor ||
          domain.orgId !== manifest.scope.org
        )
          problems.push("foreign_domain_lineage");
      }
    }
    assert(
      digest(row.cohort) === digest(manifest.provenance),
      "cohort binding mismatch",
    );
    row.cohort = drift.length
      ? { ...manifest.provenance, observedModelDrift: drift }
      : manifest.provenance;
    row.executionProblems = [...new Set(problems)];
    row.billingProblems = [...new Set(billingProblems)];
    row.evidenceProblems = [...row.executionProblems, ...row.billingProblems];
    row.executionComplete = problems.length === 0;
    row.billingComplete = billingProblems.length === 0 && allKnown;
    row.complete = row.executionComplete;
    row.outcome = row.complete ? collection.payload.outcome : "indeterminate";
    // Conflicting execution evidence cannot erase an independently reported
    // critical action, even though no terminal outcome is selected.
    row.critical = [
      ...new Set(
        relevant
          .filter((r) => r.kind === "collection" && !invalid.has(r.id))
          .flatMap((r) => r.payload.critical),
      ),
    ].sort();
    row.costMicroUsd = knownLower;
    row.upperMicroUsd = allBounded ? upper : null;
    row.costStatus = allKnown
      ? "known"
      : allBounded
        ? "bounded_unknown"
        : "unbounded";
    row.attempts = new Set([
      ...attemptIds,
      ...providerRecords.map((r) => r.attemptId),
    ]).size;
    row.knownAttempts = knownAttempts;
  }
  return {
    manifest,
    result,
    events: events.records,
    receipts: receipts.records,
    analysis,
  };
}
