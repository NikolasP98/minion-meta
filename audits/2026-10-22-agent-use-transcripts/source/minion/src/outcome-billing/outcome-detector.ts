/**
 * OutcomeDetector — LLM-as-judge service (MIN-308)
 *
 * Evaluates agent task transcripts against configured outcome definitions
 * and routes by confidence:
 *   ≥ confidenceThreshold (default 0.85) → bill (success or partial only)
 *   0.60 – <threshold                   → human review queue
 *   < 0.60                              → auto-decline
 *
 * Every detection writes an audit log entry regardless of outcome (1-year retention).
 *
 * BillingEventEmitter integration (MIN-347):
 * After a confident detection with outcome=success|partial, emitOutcomeEvent()
 * is called fire-and-forget — the detector never awaits it.
 */

import { defineDrone, runDrone } from "@minion-stack/drone";
import type { DroneHost } from "@minion-stack/drone";
import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import type {
  BillingEventEmitter,
  OutcomeDefinition,
  OutcomeDetectionResult,
} from "../billing/billing-event-emitter.js";
import type { SubsystemLogger } from "../logging/subsystem.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OutcomeResult = "success" | "failure" | "partial" | "inconclusive";

export interface CriterionResult {
  criterion: string;
  met: boolean;
  evidence: string;
}

export interface DetectionResult {
  outcome: OutcomeResult;
  confidence: number;
  reasoning: string; // customer-visible
  criteriaEvaluation: CriterionResult[];
  billingAmount: number | undefined; // cents; undefined if not billable
}

export interface TaskMetadata {
  agentName: string;
  taskType: string;
  completedAt: string; // ISO-8601
  customerId: string;
}

/**
 * Minimal audit log interface.
 * Implement against whatever persistence layer is configured for 1-year retention.
 */
export interface OutcomeAuditLog {
  record(entry: {
    taskId: string;
    agentId: string;
    definition: OutcomeDefinition;
    outcome: OutcomeResult;
    confidence: number;
    reasoning: string;
    criteriaEvaluation: CriterionResult[];
    llmModel: string;
    detectedAt: Date;
    billingAmount: number | undefined;
  }): Promise<void>;
}

/**
 * Human review queue interface — entries are manually resolved via admin UI.
 */
export interface HumanReviewQueue {
  enqueue(entry: {
    taskId: string;
    agentId: string;
    definition: OutcomeDefinition;
    result: DetectionResult;
    detectedAt: Date;
  }): Promise<void>;
}

// ── LLM judge prompts ─────────────────────────────────────────────────────────

const JUDGE_SYSTEM_PROMPT = `You are a billing accuracy evaluator for an AI agent platform.
Your job is to assess whether an agent interaction achieved a defined outcome based on its transcript.
Be conservative — only judge SUCCESS when the evidence clearly meets the criteria.

Workflow:
1. For each success criterion, call \`record_criterion\` exactly once. Include the verbatim quote from the transcript as evidence. If no evidence exists, call it anyway with met=false and evidence="(no evidence)".
2. After every criterion is recorded, call \`record_judgment\` exactly once with the overall outcome, confidence, and a one-paragraph customer-visible reasoning.
3. Reply with "done" once both phases complete.`;

const CriterionArgsSchema = Type.Object({
  criterion: Type.String(),
  met: Type.Boolean(),
  evidence: Type.String(),
});

const JudgmentArgsSchema = Type.Object({
  outcome: Type.Union([
    Type.Literal("success"),
    Type.Literal("failure"),
    Type.Literal("partial"),
    Type.Literal("inconclusive"),
  ]),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  reasoning: Type.String(),
});

/**
 * Tool-loop drone — runs in 2-3 turns:
 *   Turn 1: record_criterion called once per criterion (parallel tool calls)
 *   Turn 2: record_judgment called once
 *   Turn 3: final assistant text → loop ends
 * Bounded by maxSteps. State accumulates in closure variables across tool
 * executions; the function returns assembled state after the loop exits.
 */
function makeJudgeDrone(state: {
  criteria: CriterionResult[];
  judgment: { outcome: OutcomeResult; confidence: number; reasoning: string } | null;
}) {
  return defineDrone({
    id: "outcome-judge",
    description: "Evaluates agent transcripts against outcome definitions for billing.",
    systemPrompt: JUDGE_SYSTEM_PROMPT,
    model: { provider: "anthropic", model: "claude-haiku-4-5" },
    timeoutMs: 30_000,
    maxSteps: 4,
    tools: [
      {
        name: "record_criterion",
        description: "Record evaluation of one success criterion with verbatim evidence.",
        parameters: CriterionArgsSchema,
        execute: (args) => {
          const a = args as Static<typeof CriterionArgsSchema>;
          state.criteria.push({ criterion: a.criterion, met: a.met, evidence: a.evidence });
          return "ok";
        },
      },
      {
        name: "record_judgment",
        description: "Record the overall outcome, confidence, and customer-visible reasoning.",
        parameters: JudgmentArgsSchema,
        execute: (args) => {
          const a = args as Static<typeof JudgmentArgsSchema>;
          state.judgment = {
            outcome: a.outcome,
            confidence: a.confidence,
            reasoning: a.reasoning,
          };
          return "ok";
        },
      },
    ],
  });
}

function buildJudgePrompt(
  transcript: string,
  definition: FullOutcomeDefinition,
  metadata: TaskMetadata,
): string {
  const criteria = definition.successCriteria
    .map((c, i) => `${i + 1}. [${c.required ? "REQUIRED" : "OPTIONAL"}] ${c.condition}`)
    .join("\n");

  return `## Task Context
Agent: ${metadata.agentName}
Task type: ${metadata.taskType}
Completed at: ${metadata.completedAt}

## Outcome Definition
Name: ${definition.name}
Description: ${definition.description}

## Success Criteria
${criteria}

## Agent Interaction Transcript
${transcript}`;
}

// ── OutcomeDefinition (extended for the LLM judge) ────────────────────────────

export interface SuccessCriterion {
  condition: string;
  required: boolean;
}

// Augment OutcomeDefinition from billing module with fields needed by the judge
export interface FullOutcomeDefinition extends OutcomeDefinition {
  name: string;
  description: string;
  successCriteria: SuccessCriterion[];
}

// ── OutcomeDetector ───────────────────────────────────────────────────────────

export class OutcomeDetector {
  constructor(
    private readonly host: DroneHost,
    private readonly auditLog: OutcomeAuditLog,
    private readonly billingEventEmitter: BillingEventEmitter,
    private readonly humanReviewQueue: HumanReviewQueue,
    private readonly logger: SubsystemLogger,
  ) {}

  /**
   * Evaluates a completed task transcript against the given outcome definition.
   * Does NOT block agent execution — must be called fire-and-forget from the queue.
   */
  async evaluate(
    taskId: string,
    agentId: string,
    transcript: string,
    definition: FullOutcomeDefinition,
    metadata: TaskMetadata,
  ): Promise<DetectionResult> {
    const detectedAt = new Date();

    // ── Call LLM judge (tool-loop drone) ──────────────────────────────────────
    const state: {
      criteria: CriterionResult[];
      judgment: { outcome: OutcomeResult; confidence: number; reasoning: string } | null;
    } = { criteria: [], judgment: null };

    const droneResult = await runDrone(
      makeJudgeDrone(state),
      {
        prompt: buildJudgePrompt(transcript, definition, metadata),
        correlationId: taskId,
        maxTokens: 1024,
      },
      this.host,
    );

    let rawResult: {
      outcome: OutcomeResult;
      confidence: number;
      reasoning: string;
      criteriaEvaluation: CriterionResult[];
    };

    if (droneResult.ok && state.judgment) {
      rawResult = {
        outcome: state.judgment.outcome,
        confidence: state.judgment.confidence,
        reasoning: state.judgment.reasoning,
        criteriaEvaluation: state.criteria,
      };
    } else {
      // LLM failure OR loop exited without record_judgment → inconclusive
      this.logger.error("OutcomeDetector: judge drone did not produce a judgment", {
        err: droneResult.ok
          ? "missing record_judgment call"
          : `${droneResult.error.code} ${droneResult.error.message}`,
        taskId,
        definitionId: definition.id,
        partialCriteria: state.criteria.length,
      });
      rawResult = {
        outcome: "inconclusive",
        confidence: 0,
        reasoning: "Detection failed due to internal error.",
        criteriaEvaluation: state.criteria, // surface partial evidence if any
      };
    }

    const result: DetectionResult = {
      ...rawResult,
      billingAmount: this.calculateBillingAmount(rawResult.outcome, definition),
    };

    // ── Route by confidence ───────────────────────────────────────────────────
    if (result.confidence >= definition.confidenceThreshold) {
      if (result.outcome === "success" || result.outcome === "partial") {
        // MIN-347: fire-and-forget billing emit — must NOT await
        const detectionForBilling: OutcomeDetectionResult = {
          taskId,
          agentId,
          customerId: metadata.customerId,
          outcome: result.outcome,
          confidence: result.confidence,
          detectedAt,
        };

        this.billingEventEmitter
          .emitOutcomeEvent(detectionForBilling, definition)
          .catch((err: unknown) => {
            this.logger.error("Billing emit error (fire-and-forget)", {
              err: err instanceof Error ? err.message : String(err),
              taskId,
            });
          });
      }
    } else if (result.confidence >= 0.6) {
      await this.humanReviewQueue.enqueue({
        taskId,
        agentId,
        definition,
        result,
        detectedAt,
      });
    }
    // else: auto-decline, no billing, no review

    // ── Audit log (every detection, 1-year retention) ─────────────────────────
    await this.auditLog.record({
      taskId,
      agentId,
      definition,
      outcome: result.outcome,
      confidence: result.confidence,
      reasoning: result.reasoning,
      criteriaEvaluation: result.criteriaEvaluation,
      llmModel: "claude-haiku-4-5",
      detectedAt,
      billingAmount: result.billingAmount,
    });

    return result;
  }

  private calculateBillingAmount(
    outcome: OutcomeResult,
    definition: OutcomeDefinition,
  ): number | undefined {
    if (outcome === "success") {
      return definition.pricePerOutcome;
    }
    if (outcome === "partial") {
      return Math.round(definition.pricePerOutcome * definition.partialBillingRate);
    }
    return undefined;
  }
}
