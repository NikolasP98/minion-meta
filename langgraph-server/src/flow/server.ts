import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { AIMessage } from '@langchain/core/messages';
import { compileFlow } from './compile-flow.js';
import { UnsupportedFlowError, type FlowNode, type FlowEdge, type FlowRunEvent } from './types.js';

const FlowRunRequest = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['agent', 'promptBox', 'llm']),
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
});

const app = new Hono();
app.use('/*', cors());

app.get('/health', (c) => c.json({ ok: true }));

app.post('/flows/run', async (c) => {
  const parsed = FlowRunRequest.safeParse(await c.req.json().catch(() => null));

  return streamSSE(c, async (stream) => {
    const send = (e: FlowRunEvent) => stream.writeSSE({ data: JSON.stringify(e) });

    if (!parsed.success) {
      await send({ level: 'error', message: 'Invalid flow payload.' });
      await stream.writeSSE({ event: 'done', data: '{}' });
      return;
    }

    const nodes = parsed.data.nodes as FlowNode[];
    const edges = parsed.data.edges as FlowEdge[];

    try {
      await send({ level: 'info', message: 'Starting flow run…' });
      const { graph, initialState } = compileFlow(nodes, edges);
      await send({ level: 'debug', message: 'Compiled flow to StateGraph.' });

      for await (const chunk of await graph.stream(initialState, {
        streamMode: 'values',
      })) {
        const messages = (chunk as typeof import('@langchain/langgraph').MessagesAnnotation.State).messages ?? [];
        const last = messages[messages.length - 1];
        if (last instanceof AIMessage && last.content) {
          await send({ level: 'info', message: String(last.content) });
        }
      }

      await send({ level: 'info', message: 'Flow run complete.' });
    } catch (err) {
      const message =
        err instanceof UnsupportedFlowError
          ? err.message
          : `Flow run failed: ${err instanceof Error ? err.message : String(err)}`;
      await send({ level: 'error', message });
    } finally {
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

  const HUB_URL = process.env.HUB_URL ?? 'http://localhost:5173';
  const HUB_API_TOKEN = process.env.HUB_API_TOKEN ?? '';

  let nodes: FlowNode[];
  let edges: FlowEdge[];
  try {
    const res = await fetch(`${HUB_URL}/api/internal/flows/${flowId}`, {
      headers: HUB_API_TOKEN ? { Authorization: `Bearer ${HUB_API_TOKEN}` } : {},
    });
    if (!res.ok) {
      return c.json({ error: `Hub returned ${res.status} for flow ${flowId}` }, 502);
    }
    const body = (await res.json()) as { nodes: FlowNode[]; edges: FlowEdge[] };
    nodes = body.nodes;
    edges = body.edges;
  } catch (err) {
    return c.json({ error: `Hub unreachable: ${err instanceof Error ? err.message : String(err)}` }, 503);
  }

  try {
    const { graph, initialState } = compileFlow(nodes, edges, { initialPrompt: prompt });
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
serve({ fetch: app.fetch, port });
console.log(`[flows] listening on http://localhost:${port}`);
