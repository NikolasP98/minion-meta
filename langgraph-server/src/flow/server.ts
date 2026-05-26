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

const port = Number(process.env.FLOWS_PORT ?? 2025);
serve({ fetch: app.fetch, port });
console.log(`[flows] listening on http://localhost:${port}`);
