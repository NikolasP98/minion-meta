import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { setup, cli, ROOT, temp } from "./fixtures/helpers.mjs";
import {
  canonical,
  digest,
  jsonl,
  readJSON,
  writePrivate,
} from "./lib/common.mjs";

function command(script, args) {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, "scripts/agent-evals", script), ...args],
    {
      cwd: ROOT,
      env: { PATH: process.env.PATH },
      encoding: "utf8",
      timeout: 15000,
    },
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
test("F02-R1 actual report CLI requires global pinned identity and consistent collection while retaining bills", () => {
  const s = setup();
  const run = cli(s);
  assert.equal(run.status, 0, run.stderr);
  const file = path.join(s.out, "receipts.jsonl");
  const receipts = jsonl(file);
  const baseline = command("report.mjs", ["--run", s.out]).cohorts[0].arms;
  writePrivate(
    file,
    [...receipts, ...receipts].map(canonical).join("\n") + "\n",
    false,
  );
  assert.equal(
    command("report.mjs", ["--run", s.out]).cohorts[0].arms.full.successes,
    1,
  );
  for (const mutation of [
    (records) => records.filter((r) => r.kind !== "adapter_identity"),
    ...["sourceSha", "sourceHash", "lockHash", "buildHash", "adapterHash"].map(
      (key) => (records) =>
        records.map((r) =>
          r.kind === "adapter_identity"
            ? {
                ...r,
                payload: {
                  ...r.payload,
                  [key]: "f".repeat(key === "sourceSha" ? 40 : 64),
                },
              }
            : r,
        ),
    ),
    (records) =>
      records.map((r) =>
        r.kind === "adapter_identity"
          ? {
              ...r,
              payload: {
                ...r.payload,
                sources: [{ path: "foreign.mjs", sha256: "f".repeat(64) }],
              },
            }
          : r,
      ),
    (records) =>
      records.map((r) =>
        r.kind === "adapter_identity"
          ? { ...r, rootId: "11111111-1111-4111-8111-111111111111" }
          : r,
      ),
    (records) =>
      records.map((r) =>
        r.kind === "adapter_identity"
          ? {
              ...r,
              revisions: {
                ...r.revisions,
                meta: { ...r.revisions.meta, sourceSha256: "f".repeat(64) },
              },
            }
          : r,
      ),
    ...["missing", "quarantine", "critical"].map(
      (key) => (records) =>
        records.map((r) =>
          r.kind === "collection"
            ? {
                ...r,
                payload: {
                  ...r.payload,
                  [key]: ["required-receipt"],
                  complete: true,
                  outcome: "success",
                },
              }
            : r,
        ),
    ),
  ]) {
    writePrivate(
      file,
      mutation(structuredClone(receipts)).map(canonical).join("\n") + "\n",
      false,
    );
    const arms = command("report.mjs", ["--run", s.out]).cohorts[0].arms;
    for (const arm of ["full", "jev", "core_discovery"]) {
      assert.equal(arms[arm].successes, 0, `unqualified ${arm} success`);
      assert.equal(arms[arm].executionReceiptCoverage, 0);
      assert.equal(arms[arm].costMicroUsd, baseline[arm].costMicroUsd);
      assert.equal(arms[arm].billingReceiptCoverage, 1);
    }
  }
  writePrivate(file, receipts.map(canonical).join("\n") + "\n", false);
  const eventsFile = path.join(s.out, "events.jsonl");
  const events = jsonl(eventsFile);
  for (const changed of [
    events.filter((r) => r.kind !== "prepared"),
    events.map((r) =>
      r.kind === "prepared"
        ? { ...r, payload: { ...r.payload, manifestSha256: "f".repeat(64) } }
        : r,
    ),
  ]) {
    writePrivate(eventsFile, changed.map(canonical).join("\n") + "\n", false);
    assert.equal(
      command("report.mjs", ["--run", s.out]).cohorts[0].arms.full.successes,
      0,
    );
  }
});

test("F06-R1 complaint and report CLIs reconcile same-amount coverage forward/reverse/duplicate including zero", () => {
  const s = setup();
  const root = temp(),
    artifact = path.join(root, "artifact");
  fs.mkdirSync(artifact, { mode: 0o700 });
  const croot = path.join(ROOT, "scripts/agent-evals/fixtures/c-gateway");
  for (const f of [
    "complaint-evaluation.schema.json",
    "complaint-evaluation.ts",
  ])
    fs.copyFileSync(path.join(croot, f), path.join(artifact, f));
  const source = readJSON(path.join(croot, "complaint-evaluation-v1.json"))[0];
  for (const amount of [source.attempts[0].costUsd, 0]) {
    const terminal = structuredClone(source);
    terminal.attempts[0].costUsd = amount;
    const before = structuredClone(terminal);
    before.receiptRevision--;
    before.costCoverage = before.attempts[0].costCoverage = "incomplete";
    for (const records of [
      [before, terminal],
      [terminal, before],
      [before, terminal, before, terminal],
    ]) {
      const input = path.join(root, "input.json");
      writePrivate(input, records, false);
      const pin = {
        commit: "a".repeat(40),
        lockSha256: "b".repeat(64),
        schemaSha256: digest(
          fs.readFileSync(
            path.join(artifact, "complaint-evaluation.schema.json"),
          ),
        ),
        exporterSha256: digest(
          fs.readFileSync(path.join(artifact, "complaint-evaluation.ts")),
        ),
        fixtureSha256: digest(fs.readFileSync(input)),
      };
      fs.copyFileSync(
        input,
        path.join(artifact, "complaint-evaluation-v1.json"),
      );
      writePrivate(
        path.join(artifact, "artifact.json"),
        {
          version: 1,
          sourceCommit: pin.commit,
          ...Object.fromEntries(
            Object.entries(pin).filter(([k]) => k !== "commit"),
          ),
          producer: "gateway-complaint-evaluation-v1",
          qualification: "producer_emitted",
        },
        false,
      );
      s.m.provenance.gateway = pin;
      writePrivate(s.manifestPath, s.m, false);
      const args = [
        "--input",
        input,
        "--manifest",
        s.manifestPath,
        "--gateway-root",
        artifact,
      ];
      const direct = command("complaint.mjs", args);
      const viaReport = command("report.mjs", [
        "--complaint",
        input,
        "--manifest",
        s.manifestPath,
        "--gateway-root",
        artifact,
      ]);
      assert.deepEqual(viaReport, direct);
      assert.equal(direct.quarantine.length, 0);
      assert.deepEqual(direct.actualShadowCosts, {
        knownUsd: amount,
        unknownAttempts: [],
        attempts: 1,
      });
      const invalid = structuredClone(terminal);
      invalid.receiptRevision++;
      invalid.costCoverage = invalid.attempts[0].costCoverage = "incomplete";
      writePrivate(input, [terminal, invalid], false);
      pin.fixtureSha256 = digest(fs.readFileSync(input));
      fs.copyFileSync(
        input,
        path.join(artifact, "complaint-evaluation-v1.json"),
      );
      writePrivate(
        path.join(artifact, "artifact.json"),
        {
          version: 1,
          sourceCommit: pin.commit,
          ...Object.fromEntries(
            Object.entries(pin).filter(([k]) => k !== "commit"),
          ),
          producer: "gateway-complaint-evaluation-v1",
          qualification: "producer_emitted",
        },
        false,
      );
      writePrivate(s.manifestPath, s.m, false);
      const rejected = command("complaint.mjs", args);
      assert(rejected.quarantine.length > 0);
      assert.equal(rejected.actualShadowCosts.knownUsd, amount);
      assert.equal(rejected.actualShadowCosts.unknownAttempts.length, 1);
    }
  }
});
