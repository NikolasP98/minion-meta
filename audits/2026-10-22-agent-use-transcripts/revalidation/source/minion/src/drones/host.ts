import type {
  DroneEventInput,
  DroneHost,
  DroneModelSpec,
  DroneSkillFilter,
} from "@minion-stack/drone";
import { resolveApiKeyForProvider, requireApiKey } from "../agents/models/model-auth.js";
import { buildWorkspaceSkillSnapshot } from "../agents/skills/workspace.js";
import type { MinionConfig } from "../config/config.js";
import { emitEvent } from "../events/emitter.js";

export type GatewayDroneHostOptions = {
  config?: MinionConfig;
  agentDir?: string;
  /** Workspace dir for skill resolution. */
  workspaceDir?: string;
};

/**
 * Build a `DroneHost` that bridges the @minion-stack/drone primitive to
 * gateway internals: provider auth resolution, workspace skill snapshot,
 * and the agent.run.* event stream tagged kind:"drone".
 */
export function createGatewayDroneHost(opts: GatewayDroneHostOptions = {}): DroneHost {
  const { config, agentDir, workspaceDir } = opts;

  // Captured at resolveApiKey time so the terminal agent.run.end event can also
  // emit a *priced* agent.llm.usage (DroneEventInput carries no model/provider).
  // Safe as per-host state: every call site builds a FRESH host per run
  // (createGatewayDroneHost() per runDrone / per drones.run), so no cross-run race.
  // ponytail: records the primary spec's provider/model — a rare credential
  // fallback to a different provider would mislabel provider (token counts stay
  // exact); the drone SDK's resolvedModel isn't surfaced on the event to do better.
  let resolvedModel: { provider: string; model: string } | undefined;

  return {
    async resolveApiKey(spec: DroneModelSpec) {
      const auth = await resolveProvider(spec, config, agentDir);
      resolvedModel = { provider: spec.provider, model: spec.model };
      const apiKey = requireApiKey(auth, spec.provider);
      return { apiKey, source: auth.source };
    },

    resolveSkillsPrompt(filter: DroneSkillFilter | undefined) {
      if (!workspaceDir) {
        return "";
      }
      const snapshot = buildWorkspaceSkillSnapshot(workspaceDir, {
        config,
        skillFilter: filter?.include,
        denyFilter: filter?.exclude,
      });
      return snapshot.prompt ?? "";
    },

    emitEvent(input: DroneEventInput) {
      emitEvent({
        category: "agent",
        severity: input.event === "agent.run.error" ? "medium" : "info",
        event: input.event,
        message: dronesMessage(input),
        correlationId: input.correlationId,
        metadata: {
          kind: "drone",
          droneId: input.droneId,
          durationMs: input.durationMs,
          usage: input.usage,
          errorCode: input.errorCode,
          toolName: input.toolName,
          toolPhase: input.toolPhase,
          toolIsError: input.toolIsError,
        },
        timestamp: Date.now(),
      });

      // Also emit a priced usage event on completion so DRONE llm cost surfaces in
      // the reliability usage aggregate — which scans `agent.llm.usage` and keys on
      // metadata.model/provider/tokens (src/events/usage-aggregate.ts). Without this,
      // every drone (session-title, slug, gmail-label, TTS, outcome-billing,
      // drone-summarize, the drones.run RPC / paperclip pipeline) was invisible to
      // cost tracking. Emitted only on a successful end with usage + a known model;
      // channel/source tag them as system-initiated "drone" origin in the breakdown.
      if (input.event === "agent.run.end" && input.usage && resolvedModel) {
        const u = input.usage;
        const inTok = u.inputTokens ?? 0;
        const outTok = u.outputTokens ?? 0;
        const cacheTok = u.cacheReadTokens ?? 0;
        emitEvent({
          category: "agent",
          severity: "info",
          event: "agent.llm.usage",
          message: `Drone LLM usage: ${input.droneId}`,
          correlationId: input.correlationId,
          metadata: {
            kind: "drone",
            droneId: input.droneId,
            provider: resolvedModel.provider,
            model: resolvedModel.model,
            source: "system",
            channel: "drone",
            tokens: {
              input: inTok,
              output: outTok,
              cacheRead: cacheTok,
              total: inTok + outTok + cacheTok,
            },
          },
          timestamp: Date.now(),
        });
      }
    },
  };
}

async function resolveProvider(
  spec: DroneModelSpec,
  config: MinionConfig | undefined,
  agentDir: string | undefined,
) {
  let lastError: unknown;
  const chain = [
    { provider: spec.provider, authProfileId: spec.authProfileId },
    ...(spec.fallbacks ?? []).map((f) => ({
      provider: f.provider,
      authProfileId: f.authProfileId,
    })),
  ];
  for (const link of chain) {
    try {
      return await resolveApiKeyForProvider({
        provider: link.provider,
        cfg: config,
        profileId: link.authProfileId,
        agentDir,
      });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error(`No credentials found for provider "${spec.provider}"`);
}

function dronesMessage(input: DroneEventInput): string {
  switch (input.event) {
    case "agent.run.start":
      return `Drone started: ${input.droneId}`;
    case "agent.run.end":
      return `Drone finished: ${input.droneId} (${input.durationMs ?? 0}ms)`;
    case "agent.run.error":
      return `Drone error: ${input.droneId} [${input.errorCode ?? "?"}]`;
    case "agent.run.tool":
      return `Drone tool ${input.toolPhase ?? "event"}: ${input.droneId}/${input.toolName ?? "?"}`;
  }
}
