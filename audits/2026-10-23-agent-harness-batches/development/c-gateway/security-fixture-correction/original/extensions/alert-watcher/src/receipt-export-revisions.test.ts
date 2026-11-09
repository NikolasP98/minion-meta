import crypto from "node:crypto";
import fs from "node:fs";
import { Ajv } from "ajv";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  admitSource,
  claimWork,
  admitInvocation,
  markInvocationDispatch,
  receiveInvocation,
  retryNoCredentials,
  finishWork,
  getWork,
  recoverExpiredInvocations,
  setSuggestion,
  markSuggestionDispatch,
} from "./classification-work.js";
import { classifyMessage } from "./classifier.js";
import {
  exportComplaintEvaluation,
  type ComplaintEvaluationRecordV1,
} from "./complaint-evaluation.js";
import { runSuggestionsDrone } from "./reply-flow/suggestions-drone.js";
import { legacyTerminalObserver } from "./usage-finalization.js";
import { testDb, workFixture } from "./work-test-fixtures.js";

const transport = vi.hoisted(() => ({ complete: vi.fn(), emit: vi.fn() }));
vi.hoisted(() => vi.resetModules());
vi.mock("@earendil-works/pi-ai/compat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@earendil-works/pi-ai/compat")>()),
  complete: transport.complete,
}));
vi.mock("../../../src/events/emitter.js", () => ({ emitEvent: transport.emit }));
let clock = Date.parse("2026-10-23T00:00:00Z"),
  sequence = 0;
const host = (keys = true) => ({
  resolveApiKey: async () => {
    if (!keys) {
      throw Error("fixture missing credentials");
    }
    return { apiKey: "fixture", source: "test" };
  },
  resolveSkillsPrompt: vi.fn(() => ""),
});
const response = (data: unknown) => ({
  role: "assistant",
  content: [{ type: "toolCall", id: "r", name: "result", arguments: data }],
  usage: { input: 4, output: 1, cacheRead: 0, cacheWrite: 0 },
  stopReason: "toolUse",
  timestamp: clock,
});
beforeEach(() => {
  clock = Date.parse("2026-10-23T00:00:00Z");
  sequence = 0;
  transport.complete.mockReset();
  transport.emit.mockReset();
  transport.complete.mockResolvedValue(
    response({ is_complaint: false, severity: "low", category: "other", summary: "" }),
  );
  vi.spyOn(Date, "now").mockImplementation(() => clock);
  vi.spyOn(crypto, "randomUUID").mockImplementation(
    () => `00000000-0000-4000-8000-${(++sequence).toString(16).padStart(12, "0")}`,
  );
});
afterEach(() => vi.restoreAllMocks());

async function revisionHistory(exhausted: boolean): Promise<ComplaintEvaluationRecordV1[]> {
  const db = testDb(),
    snapshot = workFixture({ destinations: [], qualifiedModelRevision: "fixture-reviewed-r1" });
  try {
    const admission = admitSource(
      db,
      exhausted ? "exhausted-sdk-fixture" : "safe-retry-sdk-fixture",
      snapshot,
    );
    if (admission.kind !== "admitted") {
      throw Error("fixture admission");
    }
    const records = [exportComplaintEvaluation(db, admission.work.id)];
    for (let index = 0; index < (exhausted ? 3 : 2); index++) {
      const keys = !exhausted && index === 1;
      const lease = claimWork(db, admission.work.id, "fixture")!,
        attemptId = admitInvocation(db, lease);
      records.push(exportComplaintEvaluation(db, admission.work.id));
      const h = host(keys);
      await classifyMessage(
        [{ role: "user", content: snapshot.source.text, ts: clock }],
        h,
        snapshot.model,
        undefined,
        "es",
        {},
        {
          attemptId,
          purpose: "classification",
          onDispatch: () => {
            markInvocationDispatch(db, lease, attemptId);
            records.push(exportComplaintEvaluation(db, admission.work.id));
          },
          onTerminal: (result, usage) => receiveInvocation(db, lease, result, usage),
        },
      ).catch((error) => {
        expect(keys).toBe(false);
        expect(String(error)).toContain("NO_API_KEY");
      });
      records.push(exportComplaintEvaluation(db, admission.work.id));
      if (keys) {
        finishWork(db, lease, "completed");
      } else {
        retryNoCredentials(db, lease);
      }
      records.push(exportComplaintEvaluation(db, admission.work.id));
      if (!keys) {
        expect(h.resolveSkillsPrompt).not.toHaveBeenCalled();
        const work = getWork(db, admission.work.id)!;
        if (work.state === "queued") {
          clock = work.next_attempt_at;
        }
      }
    }
    const work = getWork(db, admission.work.id)!;
    expect(JSON.parse(work.attempts_json)).toHaveLength(exhausted ? 3 : 2);
    expect(
      JSON.parse(work.attempts_json).filter(
        (a: { dispatchStatus: string }) => a.dispatchStatus === "not_submitted",
      ),
    ).toHaveLength(exhausted ? 3 : 1);
    expect(work.state).toBe(exhausted ? "failed" : "completed");
    return records;
  } finally {
    db.close();
  }
}

it("emits schema-valid golden incremental receipts without publishing retryable computation results or unsubmitted bills", async () => {
  const success = await revisionHistory(false),
    exhausted = await revisionHistory(true),
    records = [...success, ...exhausted];
  const schema = JSON.parse(
    fs.readFileSync(new URL("./complaint-evaluation.schema.json", import.meta.url), "utf8"),
  );
  const validate = new Ajv({ strict: false, validateFormats: false }).compile(schema);
  for (const record of records) {
    expect(validate(record), JSON.stringify(validate.errors)).toBe(true);
  }
  for (const record of [...success.slice(0, 5), ...exhausted.slice(0, -2)]) {
    expect(record.resultId).toBeNull();
    expect(record.baseline.disposition).toBe("unknown");
  }
  expect(success.at(-1)?.baseline.disposition).toBe("negative");
  expect(success.at(-1)?.attempts).toHaveLength(1);
  expect(exhausted.at(-1)?.baseline.disposition).toBe("failed");
  expect(exhausted.every((record) => record.attempts.length === 0)).toBe(true);
  for (const history of [success, exhausted]) {
    const published = history.filter((record) => record.resultId !== null);
    expect(new Set(published.map((record) => record.resultId)).size).toBe(1);
    for (let i = 1; i < history.length; i++) {
      expect(history[i].receiptRevision).toBeGreaterThan(history[i - 1].receiptRevision);
    }
  }
  const file = new URL("./fixtures/complaint-retry-revisions-v1.json", import.meta.url);
  if (process.env.UPDATE_C_RETRY_FIXTURES === "1") {
    fs.writeFileSync(file, JSON.stringify(records, null, 2) + "\n");
  }
  expect(records).toEqual(JSON.parse(fs.readFileSync(file, "utf8")));
  expect(transport.complete).toHaveBeenCalledTimes(1);
  expect(transport.emit).toHaveBeenCalledTimes(1);
});

it.each(["classification", "suggestion"] as const)(
  "actual SDK missing credentials keeps %s history private and emits no provider usage event",
  async (purpose) => {
    const db = testDb();
    try {
      const observer = legacyTerminalObserver(db, purpose, "claude-haiku-4-5", "private fixture");
      const h = host(false);
      const noCredentials = h.resolveApiKey;
      h.resolveApiKey = async () => {
        clock += 7;
        return noCredentials();
      };
      if (purpose === "classification") {
        await expect(
          classifyMessage(
            [{ role: "user", content: "fixture", ts: clock }],
            h,
            "claude-haiku-4-5",
            undefined,
            "es",
            {},
            observer,
          ),
        ).rejects.toThrow("NO_API_KEY");
      } else {
        await runSuggestionsDrone(
          h,
          "claude-haiku-4-5",
          {
            language: "es",
            severity: "high",
            category: "other",
            summary: "fixture",
            senderMessage: "fixture",
            systemPrompt: "",
            count: 3,
            maxChars: 140,
          },
          observer,
        );
      }
      const row = db.prepare("SELECT id,attempts_json FROM classification_work").get() as {
        id: string;
        attempts_json: string;
      };
      expect(JSON.parse(row.attempts_json)).toMatchObject([
        { errorCode: "NO_API_KEY", dispatchStatus: "not_submitted" },
      ]);
      const record = exportComplaintEvaluation(db, row.id);
      expect(record.attempts).toEqual([]);
      expect(record.baseline.attemptIds).toEqual([]);
      expect(record.suggestionAttemptIds).toEqual([]);
      expect(record.costCoverage).toBe("complete");
      expect(record.elapsedMs).toBe(7);
      expect(h.resolveSkillsPrompt).not.toHaveBeenCalled();
      expect(transport.complete).not.toHaveBeenCalled();
      expect(transport.emit).not.toHaveBeenCalled();
    } finally {
      db.close();
    }
  },
);

it("a no-key suggestion subreceipt never appears first as an admitted provider bill", async () => {
  const db = testDb();
  try {
    const work = admitSource(db, "suggestion-no-key", workFixture());
    if (work.kind !== "admitted") {
      throw Error();
    }
    const lease = claimWork(db, work.work.id, "fixture")!,
      baselineId = admitInvocation(db, lease);
    const result = {
      ok: true as const,
      data: { is_complaint: true, severity: "high", category: "other", summary: "fixture" },
      usage: {},
      durationMs: 1,
      resolvedModel: { provider: "anthropic", model: "claude-haiku-4-5" },
    };
    receiveInvocation(db, lease, result, {
      attemptId: baselineId,
      purpose: "classification",
      requestedModel: result.resolvedModel,
      resolvedModel: result.resolvedModel,
      usage: {},
      costStatus: "unknown",
      costUsd: null,
      costCoverage: "incomplete",
      elapsedMs: 1,
    });
    const id = crypto.randomUUID();
    setSuggestion(db, lease, { state: "queued" });
    setSuggestion(db, lease, { state: "admitted", attemptId: id, dispatchStatus: "preparing" });
    expect(exportComplaintEvaluation(db, work.work.id).suggestionAttemptIds).toEqual([]);
    await runSuggestionsDrone(
      host(false),
      "claude-haiku-4-5",
      {
        language: "es",
        severity: "high",
        category: "other",
        summary: "fixture",
        senderMessage: "fixture",
        systemPrompt: "",
        count: 3,
        maxChars: 140,
      },
      {
        attemptId: id,
        purpose: "suggestion",
        onDispatch: () => markSuggestionDispatch(db, lease, id),
        onTerminal: (terminal, usage) =>
          setSuggestion(db, lease, {
            state: "received",
            attemptId: id,
            result: terminal,
            usage,
            suggestions: [],
          }),
      },
    );
    finishWork(db, lease, "completed");
    const exported = exportComplaintEvaluation(db, work.work.id);
    expect(exported.suggestionAttemptIds).toEqual([]);
    expect(exported.attempts).toHaveLength(1);
    expect(transport.complete).not.toHaveBeenCalled();
  } finally {
    db.close();
  }
});

it.each(["checkpoint_error", "lost_generation"] as const)(
  "post-auth %s fences the actual provider and recovery preserves uncertainty",
  async (fault) => {
    const db = testDb();
    try {
      const work = admitSource(db, "dispatch-fault", workFixture());
      if (work.kind !== "admitted") {
        throw Error();
      }
      const lease = claimWork(db, work.work.id, "fixture")!,
        id = admitInvocation(db, lease);
      if (fault === "checkpoint_error") {
        db.exec(
          "CREATE TRIGGER refuse_provider_marker BEFORE UPDATE OF attempts_json ON classification_work WHEN NEW.attempts_json LIKE '%may_have_submitted%' BEGIN SELECT RAISE(ABORT,'fixture durable write failed'); END",
        );
      }
      const h = host();
      if (fault === "lost_generation") {
        h.resolveSkillsPrompt = vi.fn(() => {
          db.prepare("UPDATE classification_work SET generation=generation+1 WHERE id=?").run(
            work.work.id,
          );
          return "";
        });
      }
      await expect(
        classifyMessage(
          [{ role: "user", content: "fixture", ts: clock }],
          h,
          "claude-haiku-4-5",
          undefined,
          "es",
          {},
          {
            attemptId: id,
            purpose: "classification",
            onDispatch: () => markInvocationDispatch(db, lease, id),
            onTerminal: (result, usage) => receiveInvocation(db, lease, result, usage),
          },
        ),
      ).rejects.toThrow();
      expect(transport.complete).not.toHaveBeenCalled();
      expect(exportComplaintEvaluation(db, work.work.id).attempts).toEqual([]);
      recoverExpiredInvocations(db, clock + 31000);
      expect(exportComplaintEvaluation(db, work.work.id).attempts).toMatchObject([
        { disposition: "indeterminate", costStatus: "unknown", costCoverage: "incomplete" },
      ]);
    } finally {
      db.close();
    }
  },
);

it("legacy or already provider-admitted no-key rows cannot acquire a free safe retry", () => {
  for (const legacy of [false, true]) {
    const db = testDb();
    try {
      const work = admitSource(db, "legacy-unknown", workFixture());
      if (work.kind !== "admitted") {
        throw Error();
      }
      const lease = claimWork(db, work.work.id, "fixture")!,
        id = admitInvocation(db, lease);
      if (legacy) {
        const a = JSON.parse(getWork(db, work.work.id)!.attempts_json);
        delete a[0].dispatchStatus;
        db.prepare("UPDATE classification_work SET attempts_json=? WHERE id=?").run(
          JSON.stringify(a),
          work.work.id,
        );
      } else {
        markInvocationDispatch(db, lease, id);
      }
      receiveInvocation(
        db,
        lease,
        { ok: false, error: { code: "NO_API_KEY", message: "fixture" }, durationMs: 0 },
        {
          attemptId: id,
          purpose: "classification",
          requestedModel: { provider: "anthropic", model: "claude-haiku-4-5" },
          resolvedModel: null,
          usage: {},
          costStatus: "known",
          costUsd: 0,
          costCoverage: "complete",
          dispatchStatus: "not_submitted",
          elapsedMs: 0,
        },
      );
      expect(() => retryNoCredentials(db, lease)).toThrow("retry_not_proven_safe");
      expect(exportComplaintEvaluation(db, work.work.id).attempts).toMatchObject([
        { costStatus: "unknown", costUsd: null, costCoverage: "incomplete" },
      ]);
    } finally {
      db.close();
    }
  }
});
