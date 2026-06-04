import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { compileFlow } from './compile-flow.js';
import { UnsupportedFlowError, type FlowNode, type FlowEdge, type FlowRunEvent } from './types.js';

const FlowRunRequest = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      // Must mirror the FlowNode type union (and compile-flow's runners). The
      // original enum only allowed agent/promptBox/llm, which rejected every
      // flow built with the v2 / plugin nodes — including channel triggers and
      // plugin-contributed actions.
      type: z.enum([
        'agent',
        'promptBox',
        'llm',
        'trigger',
        'pluginTrigger',
        'pluginAction',
        'transform',
        'structured',
        'router',
        'toolAgent',
        'channel',
        'handoff',
        'reaction',
        'subflow',
      ]),
      position: z.object({ x: z.number(), y: z.number() }),
      data: z.record(z.string(), z.unknown()),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      sourceHandle: z.string(),
      target: z.string(),
      targetHandle: z.string(),
      type: z.enum(['flow', 'context']),
      label: z.string().optional(),
    }),
  ),
  // Optional seed input for trigger-entry flows run manually from the editor —
  // without it a pluginTrigger/trigger entry starts with empty input.
  prompt: z.string().optional(),
});

/**
 * Resolve a flow's definition by id from the hub — the loader injected into the
 * runner so `subflow` nodes can run a referenced flow. Server-to-server: bypasses
 * user auth via the optional HUB_API_TOKEN bearer. Reused by the triggered-run
 * entry too (which loads the top-level flow the same way).
 */
function createHubFlowLoader(): (flowId: string) => Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }> {
  const HUB_URL = process.env.HUB_URL ?? 'http://localhost:5173';
  const HUB_API_TOKEN = process.env.HUB_API_TOKEN ?? '';
  return async (flowId: string) => {
    const res = await fetch(`${HUB_URL}/api/internal/flows/${flowId}`, {
      headers: HUB_API_TOKEN ? { Authorization: `Bearer ${HUB_API_TOKEN}` } : {},
    });
    if (!res.ok) {
      throw new UnsupportedFlowError(`Hub returned ${res.status} for flow ${flowId}.`);
    }
    return (await res.json()) as { nodes: FlowNode[]; edges: FlowEdge[] };
  };
}

const loadHubFlow = createHubFlowLoader();

const app = new Hono();
app.use('/*', cors());

app.get('/health', (c) => c.json({ ok: true }));

app.post('/flows/run', async (c) => {
  const parsed = FlowRunRequest.safeParse(await c.req.json().catch(() => null));

  return streamSSE(c, async (stream) => {
    // Serialize all SSE writes through one promise chain so node-lifecycle
    // events (emitted synchronously from inside node execution) flush in the
    // order they were produced without interleaving.
    let writeChain: Promise<void> = Promise.resolve();
    const send = (e: FlowRunEvent): Promise<void> => {
      writeChain = writeChain.then(() => stream.writeSSE({ data: JSON.stringify(e) }));
      return writeChain;
    };

    if (!parsed.success) {
      await send({ level: 'error', message: 'Invalid flow payload.' });
      await stream.writeSSE({ event: 'done', data: '{}' });
      return;
    }

    const nodes = parsed.data.nodes as FlowNode[];
    const edges = parsed.data.edges as FlowEdge[];

    try {
      await send({ level: 'info', kind: 'run-start', message: 'Starting flow run…', ts: Date.now() });
      const { graph, initialState } = compileFlow(nodes, edges, {
        initialPrompt: parsed.data.prompt,
        // Per-node lifecycle (start/end/error with input+output) streams live.
        emit: (e) => void send(e),
        // Enable subflow nodes — the editor run doesn't know the top-level flow
        // id, so the stack seeds empty (a direct self-reference is still caught
        // one level in, and depth is bounded).
        loadFlow: loadHubFlow,
      });
      await send({ level: 'debug', message: 'Compiled flow to StateGraph.' });

      await graph.invoke(initialState);

      await send({ level: 'info', kind: 'run-end', message: 'Flow run complete.', ts: Date.now() });
    } catch (err) {
      const message =
        err instanceof UnsupportedFlowError
          ? err.message
          : `Flow run failed: ${err instanceof Error ? err.message : String(err)}`;
      await send({ level: 'error', kind: 'run-end', message, ts: Date.now() });
    } finally {
      await writeChain; // flush every queued write before signalling done
      await stream.writeSSE({ event: 'done', data: '{}' });
    }
  });
});

const TriggeredRunRequest = z.object({
  flowId: z.string(),
  prompt: z.string(),
  eventPayload: z.record(z.string(), z.unknown()).optional(),
  sessionKey: z.string().optional(),
});

app.post('/flows/run-triggered', async (c) => {
  const parsed = TriggeredRunRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Invalid request payload.' }, 400);
  }
  const { flowId, prompt } = parsed.data;

  let nodes: FlowNode[];
  let edges: FlowEdge[];
  try {
    const body = await loadHubFlow(flowId);
    nodes = body.nodes;
    edges = body.edges;
  } catch (err) {
    return c.json({ error: `Hub unreachable: ${err instanceof Error ? err.message : String(err)}` }, 503);
  }

  try {
    const { graph, initialState } = compileFlow(nodes, edges, {
      initialPrompt: prompt,
      originSessionKey: parsed.data.sessionKey,
      eventPayload: parsed.data.eventPayload,
      // Subflow support: seed the call stack with this flow's id so a self- or
      // cyclic reference is caught on the first hop.
      loadFlow: loadHubFlow,
      subflowStack: [flowId],
    });
    const result = await graph.invoke(initialState);
    const lastMessage = result.messages[result.messages.length - 1];
    const reply = String(lastMessage?.content ?? '');
    return c.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Flow run failed: ${message}` }, 500);
  }
});

const port = Number(process.env.FLOWS_PORT ?? 2025);
// Bind to loopback by default: the runner is reached only by the co-located
// gateway (localhost) and executes flows + calls gateway methods, so it must
// NOT be world-reachable. Override with FLOWS_HOST only if you intentionally
// expose it behind an authenticating proxy.
const hostname = process.env.FLOWS_HOST ?? '127.0.0.1';
serve({ fetch: app.fetch, port, hostname });
console.log(`[flows] listening on http://${hostname}:${port}`);
