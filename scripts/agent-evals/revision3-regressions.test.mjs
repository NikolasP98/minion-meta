import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { liveSetup, cli, ROOT } from "./fixtures/helpers.mjs";
import { canonical, jsonl, writePrivate } from "./lib/common.mjs";
import { reconcileRunEvidence } from "./lib/run-evidence.mjs";
import { deterministicScreen } from "./screen.mjs";

test("F02-R2 singleton lifecycle contradictions quarantine execution independent of input order and retain fractional bills", () => {
  const s = liveSetup();
  const run = cli(s);
  assert.equal(run.status, 0, run.stderr);
  const receiptFile = path.join(s.out, "receipts.jsonl");
  const eventFile = path.join(s.out, "events.jsonl");
  const receipts = jsonl(receiptFile);
  const events = jsonl(eventFile);
  for (const r of receipts) {
    if (["provider_received", "provider_settled"].includes(r.kind)) {
      r.payload.exactCostUsd = 0.0000001;
      r.payload.costMicroUsd = r.payload.exactCostUsd * 1e6;
      if (r.payload.usage.costUsd !== undefined)
        r.payload.usage.costUsd = 0.0000001;
      if (r.payload.usage.cost !== undefined) r.payload.usage.cost = 0.0000001;
    }
  }
  const write = (file, records) =>
    writePrivate(file, records.map(canonical).join("\n") + "\n", false);
  const report = () => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, "scripts/agent-evals/report.mjs"), "--run", s.out],
      {
        cwd: ROOT,
        env: { PATH: process.env.PATH },
        encoding: "utf8",
        timeout: 15000,
      },
    );
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout).cohorts[0].arms;
  };
  write(receiptFile, receipts);
  const baseline = report();
  // Exact same-ID re-exports are idempotent at every singleton boundary.
  write(receiptFile, [...receipts, ...receipts]);
  write(eventFile, [...events, ...events]);
  assert.deepEqual(report(), baseline);

  const cases = [
    [
      "collection",
      (p) => ({
        ...p,
        complete: false,
        outcome: "indeterminate",
        missing: ["required-domain-receipt"],
      }),
    ],
    [
      "collection",
      (p) => ({ ...p, outcome: "incorrect", critical: ["critical-action"] }),
    ],
    ["collection", (p) => p],
    ["reset", (p) => ({ ...p, initialStateHash: "f".repeat(64) })],
    ["provider_received", (p) => ({ ...p, responseSha256: "f".repeat(64) })],
    [
      "provider_received",
      (p) => ({
        ...p,
        costStatus: "unknown",
        costMicroUsd: null,
        exactCostUsd: null,
        billingComplete: false,
      }),
    ],
    ["provider_settled", (p) => p],
    ["provider_settled", (p) => ({ ...p, upperMicroUsd: p.upperMicroUsd + 1 })],
    ["prepared", (p) => p],
    ["failed", () => ({ reason: "terminal failure" })],
    ["canceled", () => ({ reason: "operator" })],
    [
      "provider_terminal",
      (p, r) => ({
        kind: "provider_terminal",
        attemptId: r.attemptId,
        status: "known_failure",
        reason: "terminal failure",
      }),
    ],
  ];
  for (const [kind, payload] of cases) {
    const eventKind = ["prepared", "failed", "canceled"].includes(kind);
    const source =
      kind === "prepared"
        ? events.filter((r) => r.kind === kind)
        : kind === "provider_terminal"
          ? receipts.filter((r) => r.kind === "provider_settled")
          : ["failed", "canceled"].includes(kind)
            ? receipts.filter((r) => r.kind === "collection")
            : receipts.filter((r) => r.kind === kind);
    const added = source.map((r) => ({
      ...structuredClone(r),
      id: randomUUID(),
      kind,
      payload: payload(structuredClone(r.payload), r),
    }));
    let prior;
    for (const reverse of [false, true]) {
      const original = eventKind ? events : receipts;
      write(receiptFile, receipts);
      write(eventFile, events);
      write(
        eventKind ? eventFile : receiptFile,
        reverse ? [...added, ...original] : [...original, ...added],
      );
      const arms = report();
      for (const arm of ["full", "jev", "core_discovery"]) {
        assert.equal(arms[arm].successes, 0, `${kind} ${arm} success`);
        assert.equal(
          arms[arm].executionReceiptCoverage,
          0,
          `${kind} ${arm} coverage`,
        );
        assert(
          arms[arm].costMicroUsd >= baseline[arm].costMicroUsd,
          `${kind} conservative report cost`,
        );
      }
      const observations = reconcileRunEvidence(s.out).analysis.observations;
      for (const row of observations) {
        assert.equal(
          row.costMicroUsd,
          baseline[row.arm].costMicroUsd,
          `${kind} retained fractional bill`,
        );
        assert(
          deterministicScreen(row).some(
            (c) => c.name === "receipt_integrity" && c.outcome === "fail",
          ),
        );
        if (kind === "collection" && added[0].payload.critical.length)
          assert(row.critical.includes("critical-action"));
      }
      const normalized = observations.map((r) => ({
        ...r,
        evidenceProblems: [...r.evidenceProblems].sort(),
        executionProblems: [...r.executionProblems].sort(),
        billingProblems: [...r.billingProblems].sort(),
      }));
      if (prior)
        assert.deepEqual(normalized, prior, `${kind} order invariance`);
      prior = normalized;
    }
  }
});
