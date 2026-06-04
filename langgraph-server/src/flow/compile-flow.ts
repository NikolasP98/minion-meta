import { MessagesAnnotation, StateGraph, START, END } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { randomUUID } from 'node:crypto';
import {
  UnsupportedFlowError,
  type FlowNode,
  type FlowEdge,
  type AgentNodeData,
  type PromptBoxData,
  type LLMNodeData,
  type PluginActionNodeData,
  type TransformNodeData,
  type StructuredNodeData,
  type RouterNodeData,
  type RouterBranch,
  type RouterRuleOp,
  type ToolAgentNodeData,
  type ChannelNodeData,
  type HandoffNodeData,
  type ReactionNodeData,
  type SubflowNodeData,
  type FlowRunEvent,
} from './types.js';
import { resolveProviderModel } from './provider.js';
import { sendAgentTurn, callGatewayMethod, sendChannelMessage, type ChannelSendResult } from '../gateway/client.js';
import { buildTools } from './tools.js';
import RE2 from 're2';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/** Fixed cap on toolAgent ReAct loop super-steps (not user-tunable in B3). */
export const TOOL_AGENT_RECURSION_LIMIT = 10;

/** Max nesting depth for subflow → subflow → … chains, a backstop against
 *  runaway recursion when the precise call-stack id seed is unavailable. */
export const DEFAULT_MAX_SUBFLOW_DEPTH = 8;

/** Memory bound on regex-matched input (the RE2 engine handles ReDoS-safety). */
const MAX_REGEX_INPUT = 10_000;
/** Sanity bound on regex pattern length. */
const MAX_REGEX_PATTERN = 1_000;

const PROCESSING_TYPES = ['llm', 'agent', 'pluginAction', 'transform', 'structured', 'router', 'toolAgent', 'channel', 'handoff', 'reaction', 'subflow'] as const;

/**
 * Entry nodes that are actually wired into the flow (i.e. they source a `flow`
 * edge). A prompt/trigger node a user dropped on the canvas but never connected
 * is an orphan — it must NOT count toward the entry-node checks, otherwise a
 * single stray node breaks an otherwise-valid flow ("cannot have both…",
 * "expected exactly 1…").
 */
export function wiredEntryNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const flowSources = new Set(edges.filter((e) => e.type === 'flow').map((e) => e.source));
  return nodes.filter(
    (n) =>
      (n.type === 'promptBox' || n.type === 'trigger' || n.type === 'pluginTrigger') &&
      flowSources.has(n.id),
  );
}

export function validateFlowShape(nodes: FlowNode[], edges: FlowEdge[]): void {
  const entries = wiredEntryNodes(nodes, edges);
  const prompts = entries.filter((n) => n.type === 'promptBox');
  const triggers = entries.filter((n) => n.type === 'trigger' || n.type === 'pluginTrigger');
  const processing = nodes.filter((n) => (PROCESSING_TYPES as readonly string[]).includes(n.type));

  if (prompts.length > 0 && triggers.length > 0) {
    throw new UnsupportedFlowError('A flow cannot have both a trigger and a prompt box.');
  }
  const entryNodes = [...prompts, ...triggers];
  if (entryNodes.length !== 1) {
    throw new UnsupportedFlowError(`Expected exactly 1 connected prompt or trigger node, found ${entryNodes.length}.`);
  }
  if (processing.length < 1) {
    throw new UnsupportedFlowError('Flow needs at least one processing node.');
  }

  const entry = entryNodes[0];
  const flowEdges = edges.filter((e) => e.type === 'flow');
  const adj = new Map<string, string[]>();
  for (const e of flowEdges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }

  // Reachability from entry.
  const reachable = new Set<string>();
  const stack = [entry.id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    for (const next of adj.get(cur) ?? []) stack.push(next);
  }
  for (const p of processing) {
    if (!reachable.has(p.id)) {
      throw new UnsupportedFlowError(`Node "${p.id}" is not connected to the entry node.`);
    }
  }

  // Cycle detection (DFS).
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const visit = (id: string): void => {
    color.set(id, GRAY);
    for (const next of adj.get(id) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) throw new UnsupportedFlowError('Flow graph has a cycle — loops are not supported.');
      if (c === WHITE) visit(next);
    }
    color.set(id, BLACK);
  };
  for (const n of nodes) if ((color.get(n.id) ?? WHITE) === WHITE) visit(n.id);
}

/**
 * Backward compat: a legacy 'agent' node whose agentId starts with "claude-"
 * is treated as an LLM node (preserves MVP "PONG demo" flows).
 */
export function resolveModelId(agentId: string): string {
  return (agentId ?? '').startsWith('claude-') ? agentId : DEFAULT_MODEL;
}

interface ChatModel {
  invoke(messages: BaseMessage[]): Promise<BaseMessage>;
  withStructuredOutput?(schema: unknown): ChatModel;
}

interface GatewayClient {
  sendAgentTurn(
    agentId: string,
    prompt: string,
    sessionMode: 'ephemeral' | 'shared',
    runId: string,
    nodeId: string,
  ): Promise<string>;
  callGatewayMethod?(method: string, params: Record<string, unknown>): Promise<string>;
  sendChannelMessage?(
    channel: string,
    to: string,
    message: string,
    accountId: string | undefined,
    runId: string,
    nodeId: string,
    index: number,
  ): Promise<ChannelSendResult>;
}

export interface CompileOptions {
  /** Inject a model for tests (llm node path). Defaults to resolveProviderModel(). */
  model?: ChatModel;
  /** Inject a gateway client for tests (agent node path). Defaults to the real client. */
  gatewayClient?: GatewayClient;
  /** Event payload passed by the trigger-manager when running trigger-based flows. */
  initialPrompt?: string;
  /** Origin session key of the triggering event (handoff node → relay.open). */
  originSessionKey?: string;
  /** Raw trigger event payload (carries channel/chatId/accountId for handoff). */
  eventPayload?: Record<string, unknown>;
  /** Inject the ReAct agent factory for tests (toolAgent path). Defaults to createReactAgent. */
  reactAgentFactory?: (args: { llm: unknown; tools: unknown[] }) => {
    invoke(
      input: { messages: BaseMessage[] },
      config?: { recursionLimit?: number },
    ): Promise<{ messages: BaseMessage[] }>;
  };
  /**
   * Per-node lifecycle sink. When provided, each processing node emits
   * node-start (with its input) before running and node-end (with input +
   * output) after, or node-error on throw — so callers can show live progress.
   */
  emit?: (event: FlowRunEvent) => void;
  /**
   * Resolve a flow's definition by id — used by `subflow` nodes to load the
   * referenced flow at execution time. Injectable for tests; production wires a
   * hub fetch. A subflow node throws if this is absent.
   */
  loadFlow?: (flowId: string) => Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }>;
  /**
   * Ids of the flows currently on the subflow call stack (outermost → innermost),
   * for cross-flow cycle detection. A subflow node throws if its target is
   * already on the stack. Threaded automatically into nested compiles.
   */
  subflowStack?: string[];
  /** Max subflow nesting depth (defaults to DEFAULT_MAX_SUBFLOW_DEPTH). */
  maxSubflowDepth?: number;
}

/** Human label for a node — its editor label, falling back to the type. */
function nodeLabelOf(node: FlowNode): string {
  const label = (node.data as { label?: unknown })?.label;
  return typeof label === 'string' && label.trim() ? label : node.type;
}

/**
 * Wrap a node runner so it emits node-start/node-end/node-error around
 * execution. No-op passthrough when no sink is configured.
 */
function instrumentNode(
  node: FlowNode,
  run: (state: typeof MessagesAnnotation.State) => Promise<{ messages: BaseMessage[] }>,
  emit?: (event: FlowRunEvent) => void,
): (state: typeof MessagesAnnotation.State) => Promise<{ messages: BaseMessage[] }> {
  if (!emit) return run;
  const nodeLabel = nodeLabelOf(node);
  const base = { nodeId: node.id, nodeType: node.type, nodeLabel } as const;
  return async (state) => {
    const input = lastMessageContent(state);
    emit({ ...base, kind: 'node-start', level: 'info', input, message: `▶ ${nodeLabel}`, ts: Date.now() });
    try {
      const result = await run(state);
      const out = result?.messages?.[result.messages.length - 1];
      const output = out ? String(out.content) : '';
      emit({ ...base, kind: 'node-end', level: 'info', input, output, message: `✓ ${nodeLabel}`, ts: Date.now() });
      return result;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      emit({ ...base, kind: 'node-error', level: 'error', input, message: `✗ ${nodeLabel}: ${detail}`, ts: Date.now() });
      throw err;
    }
  };
}

export function compileFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  opts: CompileOptions = {},
) {
  validateFlowShape(nodes, edges);

  // Pick the wired entry (matches validateFlowShape), never an orphaned node.
  const entryNode = wiredEntryNodes(nodes, edges)[0]!;
  const runId = randomUUID();

  let promptValue: string;
  if (entryNode.type === 'trigger' || entryNode.type === 'pluginTrigger') {
    if (!opts.initialPrompt) {
      throw new UnsupportedFlowError(
        'Trigger node requires an initialPrompt (event payload) — call via /flows/run-triggered.',
      );
    }
    promptValue = opts.initialPrompt;
  } else {
    // A promptBox carries its own input, but when this flow is invoked AS a
    // subflow the caller passes the upstream message via `initialPrompt`, which
    // must win — that's how a reusable subflow receives its input. Manual runs
    // never set `initialPrompt` for promptBox entries (see hub testRunPrompt),
    // so this is a no-op there.
    promptValue = opts.initialPrompt ?? (entryNode.data as PromptBoxData).value ?? '';
  }

  const processing = nodes.filter((n) =>
    n.type === 'llm' || n.type === 'agent' || n.type === 'pluginAction' ||
    n.type === 'transform' || n.type === 'structured' || n.type === 'router' ||
    n.type === 'toolAgent' || n.type === 'channel' || n.type === 'handoff' ||
    n.type === 'reaction' || n.type === 'subflow',
  );
  const flowEdges = edges.filter((e) => e.type === 'flow');

  const builder = new StateGraph(MessagesAnnotation);
  type AnyGraph = {
    addNode: (name: string, fn: (s: typeof MessagesAnnotation.State) => Promise<{ messages: BaseMessage[] }>) => void;
    addEdge: (from: string, to: string) => void;
    addConditionalEdges: (
      source: string,
      path: (s: typeof MessagesAnnotation.State) => Promise<string>,
      pathMap: Record<string, string>,
    ) => void;
    compile: () => ReturnType<typeof builder.compile>;
  };
  const g = builder as unknown as AnyGraph;

  for (const node of processing) {
    g.addNode(node.id, instrumentNode(node, buildNodeRunner(node, opts, runId), opts.emit));
  }

  const outgoing = new Map<string, FlowEdge[]>();
  for (const e of flowEdges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
  }

  // Entry node's out-edges start the graph.
  for (const e of outgoing.get(entryNode.id) ?? []) g.addEdge(START, e.target);

  for (const node of processing) {
    const outs = outgoing.get(node.id) ?? [];
    // A node is a "brancher" if it carries branch config — either a built-in
    // router (routes on its INPUT, pass-through runner) or any node whose config
    // embeds a `branch-editor` field value (e.g. a plugin action: runs its
    // method, then routes on its OUTPUT). Both reuse the same routing engine;
    // `lastMessageContent` naturally yields input vs output per node kind.
    const branch = findBranchConfig(node);
    if (branch) {
      const pathMap: Record<string, string> = {};
      for (const e of outs) pathMap[e.sourceHandle || 'default'] = e.target;
      if (!pathMap.default) pathMap.default = END;
      const connected = new Set(Object.keys(pathMap));
      g.addConditionalEdges(node.id, buildBranchRoute(branch, connected, opts), pathMap);
    } else if (outs.length === 0) {
      g.addEdge(node.id, END);
    } else {
      for (const e of outs) g.addEdge(node.id, e.target);
    }
  }

  const graph = g.compile();
  const initialState = { messages: [new HumanMessage(promptValue)] };
  return { graph, initialState, runId };
}

/** A processing node's input = the content of the most recent message in state. */
function lastMessageContent(state: typeof MessagesAnnotation.State): string {
  const last = state.messages[state.messages.length - 1];
  return last ? String(last.content) : '';
}

export function matchesRule(input: string, rule: { op: RouterRuleOp; value: string }): boolean {
  switch (rule.op) {
    case 'contains': return input.includes(rule.value);
    case 'equals': return input === rule.value;
    case 'regex': {
      if (rule.value.length > MAX_REGEX_PATTERN) return false;
      try {
        // RE2 is a linear-time engine (no catastrophic backtracking) — safe for
        // flow-author-supplied patterns run against untrusted input.
        return new RE2(rule.value).test(input.slice(0, MAX_REGEX_INPUT));
      } catch {
        return false;
      }
    }
  }
}

async function classifyWithLlm(input: string, data: RouterNodeData, opts: CompileOptions): Promise<string> {
  const model: ChatModel = opts.model ?? resolveProviderModel(data.modelId ?? DEFAULT_MODEL);
  // Build a deduped label list, carrying each branch's description (rubric) so
  // the model classifies against the conditions, not just bare label names.
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const b of data.branches) {
    const key = b.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const desc = b.description?.trim();
    lines.push(desc ? `- ${b.label}: ${desc}` : `- ${b.label}`);
  }
  if (!seen.has('default')) {
    lines.push('- default: none of the above');
  }
  const sys =
    `Classify the input into exactly one of the following labels based on its description. ` +
    `Reply with ONLY the label, nothing else.\n${lines.join('\n')}`;
  const res = await model.invoke([new SystemMessage(sys), new HumanMessage(input)]);
  const answer = String(res.content).trim().toLowerCase();
  const match = data.branches.find((b) => b.label.toLowerCase() === answer);
  return match ? match.id : 'default';
}

/**
 * Resolve a node's branch routing config, if any. A built-in `router` carries it
 * directly on `data`. Any other node may embed it via a `branch-editor` config
 * field — stored as `{ mode, modelId?, branches }` somewhere in `data.config`.
 * The runner has no descriptor, so it detects the field by shape (a value with a
 * `branches` array). Returns null for non-branching nodes.
 */
export function findBranchConfig(node: FlowNode): RouterNodeData | null {
  if (node.type === 'router') return node.data as RouterNodeData;
  const config = (node.data as { config?: Record<string, unknown> }).config;
  if (!config || typeof config !== 'object') return null;
  for (const v of Object.values(config)) {
    if (v && typeof v === 'object' && Array.isArray((v as { branches?: unknown }).branches)) {
      const bc = v as { mode?: unknown; modelId?: unknown; branches: RouterBranch[] };
      const mode = bc.mode === 'llm' || bc.mode === 'hybrid' ? bc.mode : 'rule';
      return {
        mode,
        modelId: typeof bc.modelId === 'string' ? bc.modelId : undefined,
        branches: Array.isArray(bc.branches) ? bc.branches : [],
        label: '',
      };
    }
  }
  return null;
}

/**
 * Build the conditional-edge routing fn for a router node. Exported for tests;
 * thin wrapper over buildBranchRoute reading the node's own router data.
 */
export function buildRouterRoute(
  node: FlowNode,
  connectedHandles: Set<string>,
  opts: CompileOptions,
): (state: typeof MessagesAnnotation.State) => Promise<string> {
  return buildBranchRoute(node.data as RouterNodeData, connectedHandles, opts);
}

/** Build the conditional-edge routing fn from resolved branch config (router data
 *  or a config-embedded branch-editor value). */
export function buildBranchRoute(
  data: RouterNodeData,
  connectedHandles: Set<string>,
  opts: CompileOptions,
): (state: typeof MessagesAnnotation.State) => Promise<string> {
  return async (state) => {
    const input = lastMessageContent(state);
    let chosen = 'default';
    // Rule fast-path runs for 'rule' and 'hybrid' — deterministic and cheap.
    if (data.mode === 'rule' || data.mode === 'hybrid') {
      for (const b of data.branches) {
        if (b.rule && matchesRule(input, b.rule)) { chosen = b.id; break; }
      }
    }
    // LLM rubric classification runs for 'llm' always, and for 'hybrid' only when
    // no rule matched — so a Classify/Route node can combine deterministic
    // overrides with sentiment/rubric judgement in a single node.
    if (chosen === 'default' && (data.mode === 'llm' || data.mode === 'hybrid')) {
      chosen = await classifyWithLlm(input, data, opts);
    }
    return connectedHandles.has(chosen) ? chosen : 'default';
  };
}

function buildNodeRunner(
  node: FlowNode,
  opts: CompileOptions,
  runId: string,
): (state: typeof MessagesAnnotation.State) => Promise<{ messages: BaseMessage[] }> {
  // pluginAction node — call gateway method contributed by a plugin
  if (node.type === 'pluginAction') {
    const data = node.data as PluginActionNodeData;
    const invoke = opts.gatewayClient?.callGatewayMethod ?? callGatewayMethod;
    // Forward the node's declared config values (from the editor form) as
    // `config` so the gateway method can read them (e.g. model, minSeverity).
    const config = data.config ?? {};
    return async (state) => {
      const input = lastMessageContent(state);
      const reply = await invoke(data.method, { input, runId, nodeId: node.id, config });
      return { messages: [new AIMessage(reply)] };
    };
  }

  // handoff node — built-in terminal: open a live human relay session via the
  // gateway `flows.relay.open` method, threading the triggering event's origin
  // (channel/chat/account) so owners can claim and relay to the client.
  if (node.type === 'handoff') {
    const data = node.data as HandoffNodeData;
    const invoke = opts.gatewayClient?.callGatewayMethod ?? callGatewayMethod;
    const ep = opts.eventPayload ?? {};
    // Prefer explicit event payload fields; fall back to parsing the sessionKey
    // "channel:account:chatId[:...]" if the payload lacks them.
    const sk = (opts.originSessionKey ?? '').split(':');
    const originChannel = (ep.channelId as string | undefined) ?? sk[0] ?? '';
    const originAccountId =
      (ep.accountId as string | undefined) ?? (sk.length >= 3 ? sk[1] : undefined);
    const originChatId = (ep.chatId as string | undefined) ?? (sk.length >= 3 ? sk[2] : sk[1]) ?? '';
    return async (state) => {
      const originalMessage = lastMessageContent(state);
      if (!originChannel || !originChatId) {
        return { messages: [new AIMessage('Handoff skipped: no origin session (manual run).')] };
      }
      const reply = await invoke('flows.relay.open', {
        originChannel,
        originChatId,
        originAccountId,
        destinations: data.destinations ?? [],
        priority: data.priority,
        suggestionCount: data.suggestionCount ?? 3,
        language: data.language ?? 'es',
        systemPrompt: data.systemPrompt ?? '',
        originalMessage,
        closingMessage: data.closingMessage,
      });
      return { messages: [new AIMessage(String(reply))] };
    };
  }

  // reaction node — built-in transparent side-effect: set a status emoji on the
  // flow's TRIGGER message (the inbound message that fired the flow) via the
  // gateway `flows.reaction.set` RPC, then pass the upstream message through
  // unchanged. Needs the trigger's channel/chat/message id from the event
  // payload, so it no-ops on manual runs (no trigger message).
  if (node.type === 'reaction') {
    const data = node.data as ReactionNodeData;
    const invoke = opts.gatewayClient?.callGatewayMethod ?? callGatewayMethod;
    const ep = opts.eventPayload ?? {};
    const channel = (ep.channelId as string | undefined) ?? '';
    const to = (ep.chatId as string | undefined) ?? '';
    const messageId = (ep.messageId as string | undefined) ?? '';
    const accountId = ep.accountId as string | undefined;
    const emoji = (data.emoji ?? '').trim();
    return async () => {
      if (emoji && channel && to && messageId) {
        await invoke('flows.reaction.set', {
          channel,
          to,
          messageId,
          emoji,
          ...(accountId ? { accountId } : {}),
        });
      }
      return { messages: [] };
    };
  }

  // channel node — built-in delivery of the upstream message to one or more
  // destinations on a chosen channel, via the gateway `send` RPC. Not tied to a
  // plugin: the gateway routes by `channel` to the right channel implementation.
  if (node.type === 'channel') {
    const data = node.data as ChannelNodeData;
    const invoke = opts.gatewayClient?.sendChannelMessage ?? sendChannelMessage;
    const destinations = Array.isArray(data.destinations) ? data.destinations : [];
    return async (state) => {
      const message = lastMessageContent(state);
      if (!data.channel) {
        throw new UnsupportedFlowError(`Channel node "${node.id}" has no channel selected.`);
      }
      if (destinations.length === 0) {
        throw new UnsupportedFlowError(`Channel node "${node.id}" has no destinations.`);
      }
      const results: Array<ChannelSendResult & { to: string }> = [];
      for (let i = 0; i < destinations.length; i++) {
        const to = (destinations[i]?.to ?? '').trim();
        if (!to) {
          results.push({ to: '', ok: false, error: 'empty destination' });
          continue;
        }
        const r = await invoke(data.channel, to, message, data.accountId, runId, node.id, i);
        results.push({ to, ...r });
      }
      const okCount = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      const summary = `Sent to ${okCount}/${results.length} ${data.channel} destination(s).`;
      const detail = failed.length
        ? ` Failed: ${failed.map((r) => `${r.to || '(empty)'}${r.error ? ` — ${r.error}` : ''}`).join('; ')}`
        : '';
      // Total failure surfaces as a node error; partial success still completes.
      if (okCount === 0) {
        throw new Error(summary + detail);
      }
      return { messages: [new AIMessage(summary + detail)] };
    };
  }

  // llm node — direct model call
  if (node.type === 'llm') {
    const { modelId } = node.data as LLMNodeData;
    const model: ChatModel = opts.model ?? resolveProviderModel(modelId ?? DEFAULT_MODEL);
    return async (state) => {
      const response = await model.invoke(state.messages);
      return { messages: [response] };
    };
  }

  // agent node — check for legacy claude-* id (backward compat)
  if (node.type === 'agent') {
    const agentData = node.data as AgentNodeData;

    if (agentData.agentKind === 'drone') {
      throw new UnsupportedFlowError('Drone execution is not yet supported — coming soon.');
    }

    const isLegacyLLM = agentData.agentId && agentData.agentId.startsWith('claude-');

    if (isLegacyLLM) {
      // Intentional duplicate of the llm-node path — kept separate for clarity,
      // not collapsed to preserve the ability to diverge these paths later.
      const modelId = resolveModelId(agentData.agentId);
      const model: ChatModel = opts.model ?? resolveProviderModel(modelId);
      return async (state) => {
        const response = await model.invoke(state.messages);
        return { messages: [response] };
      };
    }

    // agent node — real gateway agent
    const gc: GatewayClient = opts.gatewayClient ?? { sendAgentTurn };
    return async (state) => {
      const prompt = lastMessageContent(state);
      const reply = await gc.sendAgentTurn(
        agentData.agentId, prompt, agentData.sessionMode ?? 'ephemeral', runId, node.id,
      );
      return { messages: [new AIMessage(reply)] };
    };
  }

  // transform node — string template with {input} substitution
  if (node.type === 'transform') {
    const { template } = node.data as TransformNodeData;
    return async (state) => {
      const text = template.replaceAll('{input}', lastMessageContent(state));
      return { messages: [new HumanMessage(text)] };
    };
  }

  // structured node — withStructuredOutput + JSON schema
  if (node.type === 'structured') {
    const data = node.data as StructuredNodeData;
    const model: ChatModel = opts.model ?? resolveProviderModel(data.modelId ?? DEFAULT_MODEL);
    return async (state) => {
      let schema: Record<string, unknown>;
      try {
        schema = JSON.parse(data.schema || '{}');
      } catch {
        throw new UnsupportedFlowError(`Structured node "${node.id}" has invalid JSON schema.`);
      }
      const structuredModel = model.withStructuredOutput?.(schema) ?? model;
      const response = await structuredModel.invoke(state.messages);
      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content ?? response);
      return { messages: [new AIMessage(content)] };
    };
  }

  // router node — routing happens on the conditional edge; the node itself is a pass-through.
  if (node.type === 'router') {
    return async () => ({ messages: [] });
  }

  // toolAgent node — ReAct tool-calling loop via createReactAgent
  if (node.type === 'toolAgent') {
    const data = node.data as ToolAgentNodeData;
    // `||` (not `??`) so a freshly-dropped node's empty modelId falls back too.
    const model: ChatModel = opts.model ?? resolveProviderModel(data.modelId || DEFAULT_MODEL);
    const factory = opts.reactAgentFactory ?? (createReactAgent as unknown as typeof opts.reactAgentFactory);
    return async (state) => {
      const tools = buildTools(data.tools ?? [], {
        gatewayInvoke: opts.gatewayClient?.callGatewayMethod,
        runId,
        nodeId: node.id,
      });
      const agent = factory!({ llm: model as unknown, tools });
      const messages = data.systemPrompt
        ? [new SystemMessage(data.systemPrompt), ...state.messages]
        : state.messages;
      const result = await agent.invoke({ messages }, { recursionLimit: TOOL_AGENT_RECURSION_LIMIT });
      const last = result.messages[result.messages.length - 1];
      return { messages: [last] };
    };
  }

  // subflow node — run another flow as a subroutine. Loads the referenced flow,
  // compiles it, and invokes it with THIS node's input as the entry prompt; the
  // subflow's final message becomes this node's output. The triggering event
  // context (eventPayload/originSessionKey) and any injected model/gateway are
  // threaded through, so a subflow can contain handoff/reaction nodes that act
  // on the original trigger. Guarded against cross-flow cycles and runaway depth.
  if (node.type === 'subflow') {
    const data = node.data as SubflowNodeData;
    const flowId = data.flowId;
    const load = opts.loadFlow;
    const stack = opts.subflowStack ?? [];
    const maxDepth = opts.maxSubflowDepth ?? DEFAULT_MAX_SUBFLOW_DEPTH;
    return async (state) => {
      const input = lastMessageContent(state);
      if (!flowId) {
        throw new UnsupportedFlowError(`Subflow node "${node.id}" has no flow selected.`);
      }
      if (!load) {
        throw new UnsupportedFlowError(`Subflow node "${node.id}" cannot run: no flow loader configured.`);
      }
      if (stack.includes(flowId)) {
        throw new UnsupportedFlowError(`Subflow cycle detected: ${[...stack, flowId].join(' → ')}.`);
      }
      if (stack.length >= maxDepth) {
        throw new UnsupportedFlowError(`Subflow nesting too deep (limit ${maxDepth}).`);
      }
      const sub = await load(flowId);
      const childOpts: CompileOptions = {
        ...opts,
        initialPrompt: input,
        subflowStack: [...stack, flowId],
      };
      const { graph, initialState } = compileFlow(sub.nodes, sub.edges, childOpts);
      const result = await graph.invoke(initialState);
      const last = result.messages[result.messages.length - 1];
      const reply = last ? String(last.content) : '';
      return { messages: [new AIMessage(reply)] };
    };
  }

  // No runner exists for this node type yet — fail loudly rather than mis-casting.
  throw new UnsupportedFlowError(`No runner for node type "${node.type}".`);
}
