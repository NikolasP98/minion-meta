import { describe, it, expect } from 'vitest';
import { validateFlowShape, compileFlow, resolveModelId, DEFAULT_MODEL, matchesRule, buildRouterRoute } from './compile-flow.js';
import { UnsupportedFlowError } from './types.js';
import type { FlowNode, FlowEdge, LLMNodeData, TriggerNodeData, RouterNodeData } from './types.js';
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';

const prompt: FlowNode = {
  id: 'p1', type: 'promptBox', position: { x: 0, y: 0 },
  data: { label: 'Prompt', value: 'Hello' },
};
const agent: FlowNode = {
  id: 'a1', type: 'agent', position: { x: 200, y: 0 },
  data: { agentId: 'claude-haiku-4-5-20251001', label: 'Agent', sessionMode: 'ephemeral' },
};
const edge: FlowEdge = {
  id: 'e1', source: 'p1', sourceHandle: 'prompt-out',
  target: 'a1', targetHandle: 'in', type: 'flow',
};

describe('validateFlowShape', () => {
  it('accepts one prompt connected to one agent', () => {
    expect(() => validateFlowShape([prompt, agent], [edge])).not.toThrow();
  });

  it('rejects a flow with no agent', () => {
    expect(() => validateFlowShape([prompt], [])).toThrow(UnsupportedFlowError);
  });

  it('rejects a flow with two agents', () => {
    const agent2 = { ...agent, id: 'a2' };
    expect(() => validateFlowShape([prompt, agent, agent2], [edge])).toThrow(UnsupportedFlowError);
  });

  it('rejects when prompt is not connected to the agent', () => {
    expect(() => validateFlowShape([prompt, agent], [])).toThrow(UnsupportedFlowError);
  });

  it('rejects when prompt connects to agent only via a context edge', () => {
    const ctxEdge: FlowEdge = { ...edge, id: 'e2', type: 'context' };
    expect(() => validateFlowShape([prompt, agent], [ctxEdge])).toThrow(UnsupportedFlowError);
  });
});

describe('compileFlow', () => {
  it('seeds the prompt value and runs the agent node', async () => {
    const fakeModel = {
      async invoke(messages: BaseMessage[]) {
        const last = messages[messages.length - 1];
        return new AIMessage(`echo:${String(last.content)}`);
      },
    };

    const { graph, initialState } = compileFlow([prompt, agent], [edge], {
      model: fakeModel,
    });

    expect(initialState.messages[0]).toBeInstanceOf(HumanMessage);
    expect(initialState.messages[0].content).toBe('Hello');

    const result = await graph.invoke(initialState);
    const final = result.messages[result.messages.length - 1];
    expect(final.content).toBe('echo:Hello');
  });

  it('throws on an unsupported flow before building a graph', () => {
    expect(() => compileFlow([prompt], [], {})).toThrow(UnsupportedFlowError);
  });
});

describe('resolveModelId', () => {
  it('passes through a claude model id', () => {
    expect(resolveModelId('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5-20251001');
  });
  it('falls back to the default for non-model ids', () => {
    expect(resolveModelId('built:abc123')).toBe(DEFAULT_MODEL);
  });
  it('falls back to the default when agentId is missing', () => {
    expect(resolveModelId(undefined as unknown as string)).toBe(DEFAULT_MODEL);
  });
});

// ── New node types ────────────────────────────────────────────────────────────

const llmNode: FlowNode = {
  id: 'l1', type: 'llm', position: { x: 200, y: 0 },
  data: { modelId: 'openai/gpt-4o', label: 'LLM' } satisfies LLMNodeData,
};
const edgeToLlm: FlowEdge = {
  id: 'e-llm', source: 'p1', sourceHandle: 'prompt-out',
  target: 'l1', targetHandle: 'in', type: 'flow',
};

describe('validateFlowShape — llm nodes', () => {
  it('accepts one prompt connected to one llm node', () => {
    expect(() => validateFlowShape([prompt, llmNode], [edgeToLlm])).not.toThrow();
  });

  // B1: fan-out from one entry to two reachable processing nodes is now a valid DAG.
  it('accepts fan-out to two processing nodes (agent + llm)', () => {
    expect(() => validateFlowShape([prompt, agent, llmNode], [edge, edgeToLlm])).not.toThrow();
  });
});

describe('compileFlow — llm node', () => {
  it('uses modelId from LLMNodeData and calls the injected model', async () => {
    const fakeModel = {
      async invoke(messages: BaseMessage[]) {
        const last = messages[messages.length - 1];
        return new AIMessage(`llm-echo:${String(last.content)}`);
      },
    };
    const { graph, initialState } = compileFlow([prompt, llmNode], [edgeToLlm], {
      model: fakeModel,
    });
    expect(initialState.messages[0]).toBeInstanceOf(HumanMessage);
    const result = await graph.invoke(initialState);
    expect(result.messages[result.messages.length - 1].content).toBe('llm-echo:Hello');
  });
});

describe('compileFlow — agent node (real gateway agent)', () => {
  it('calls gatewayClient.sendAgentTurn with correct args and returns reply', async () => {
    const calls: Array<{ agentId: string; prompt: string; sessionMode: string }> = [];
    const fakeGateway = {
      async sendAgentTurn(agentId: string, p: string, sessionMode: 'ephemeral' | 'shared') {
        calls.push({ agentId, prompt: p, sessionMode });
        return 'gateway-reply';
      },
    };
    const agentNodeGw: FlowNode = {
      id: 'a1', type: 'agent', position: { x: 200, y: 0 },
      data: {
        agentId: 'PANIK',
        label: 'PANIK',
        sessionMode: 'ephemeral',
        inputHandles: [{ id: 'in', label: 'input' }],
        outputHandles: [{ id: 'out', label: 'output' }],
        contextHandles: [{ id: 'ctx', label: 'context' }],
      },
    };
    const edgeGw: FlowEdge = {
      id: 'eg', source: 'p1', sourceHandle: 'prompt-out',
      target: 'a1', targetHandle: 'in', type: 'flow',
    };
    const { graph, initialState } = compileFlow([prompt, agentNodeGw], [edgeGw], {
      gatewayClient: fakeGateway,
    });
    const result = await graph.invoke(initialState);
    expect(calls).toHaveLength(1);
    expect(calls[0].agentId).toBe('PANIK');
    expect(calls[0].prompt).toBe('Hello');
    expect(calls[0].sessionMode).toBe('ephemeral');
    expect(result.messages[result.messages.length - 1].content).toBe('gateway-reply');
  });
});

// ── Trigger node ──────────────────────────────────────────────────────────────

const triggerNode: FlowNode = {
  id: 't1', type: 'trigger', position: { x: 0, y: 0 },
  data: { event: 'message:received', label: 'Message received', deliverResponse: false } satisfies TriggerNodeData,
};
const edgeFromTrigger: FlowEdge = {
  id: 'e-t', source: 't1', sourceHandle: 'out', target: 'l1', targetHandle: 'in', type: 'flow',
};

describe('validateFlowShape — trigger nodes', () => {
  it('accepts one trigger connected to one llm node', () => {
    expect(() => validateFlowShape([triggerNode, llmNode], [edgeFromTrigger])).not.toThrow();
  });
  it('rejects trigger + promptBox together', () => {
    const edgePrompt: FlowEdge = { id: 'ep', source: 'p1', sourceHandle: 'prompt-out', target: 'l1', targetHandle: 'in', type: 'flow' };
    expect(() => validateFlowShape([triggerNode, prompt, llmNode], [edgeFromTrigger, edgePrompt])).toThrow(UnsupportedFlowError);
  });
  it('rejects an unreachable processing node (agent has no edge from trigger)', () => {
    expect(() => validateFlowShape([triggerNode, llmNode, agent], [edgeFromTrigger])).toThrow(UnsupportedFlowError);
  });
});

describe('validateFlowShape — orphaned entry nodes are ignored', () => {
  // Repro: a user drops a stray trigger / extra prompt box on the canvas next to
  // a valid promptBox→agent flow and never wires them. The orphans must not break
  // the flow ("A flow cannot have both a trigger and a prompt box.").
  const orphanTrigger: FlowNode = {
    id: 'orphan-t', type: 'trigger', position: { x: 0, y: 400 },
    data: { event: 'message:received', label: 'Stray', deliverResponse: false } satisfies TriggerNodeData,
  };
  const orphanPrompt: FlowNode = {
    id: 'orphan-p', type: 'promptBox', position: { x: 0, y: 500 }, data: { label: 'Stray', value: '' },
  };

  it('ignores an orphaned (unwired) trigger when a prompt box is the real entry', () => {
    expect(() => validateFlowShape([prompt, agent, orphanTrigger], [edge])).not.toThrow();
  });
  it('ignores an orphaned (unwired) second prompt box', () => {
    expect(() => validateFlowShape([prompt, agent, orphanPrompt], [edge])).not.toThrow();
  });
  it('ignores both a stray trigger AND a stray prompt box at once', () => {
    expect(() => validateFlowShape([prompt, agent, orphanTrigger, orphanPrompt], [edge])).not.toThrow();
  });
  it('still rejects when BOTH a trigger and a prompt box are wired in', () => {
    const edgePrompt: FlowEdge = { id: 'ep2', source: 'p1', sourceHandle: 'prompt-out', target: 'a1', targetHandle: 'in', type: 'flow' };
    const edgeTrig: FlowEdge = { id: 'et2', source: 'orphan-t', sourceHandle: 'out', target: 'a1', targetHandle: 'in', type: 'flow' };
    expect(() => validateFlowShape([prompt, agent, orphanTrigger], [edgePrompt, edgeTrig])).toThrow(UnsupportedFlowError);
  });
});

describe('compileFlow — trigger node', () => {
  it('uses initialPrompt from opts when trigger node is present', async () => {
    const fakeModel = {
      async invoke(messages: BaseMessage[]) {
        const last = messages[messages.length - 1];
        return new AIMessage(`trigger-echo:${String(last.content)}`);
      },
    };
    const { graph, initialState } = compileFlow([triggerNode, llmNode], [edgeFromTrigger], {
      model: fakeModel, initialPrompt: 'event payload text',
    });
    expect(initialState.messages[0]).toBeInstanceOf(HumanMessage);
    expect(initialState.messages[0].content).toBe('event payload text');
    const result = await graph.invoke(initialState);
    expect(result.messages[result.messages.length - 1].content).toBe('trigger-echo:event payload text');
  });
  it('throws when trigger node present but initialPrompt not provided', () => {
    expect(() => compileFlow([triggerNode, llmNode], [edgeFromTrigger], {})).toThrow(UnsupportedFlowError);
  });
});

// ── Plugin node types ─────────────────────────────────────────────────────────

import type { PluginActionNodeData, PluginTriggerNodeData } from './types.js';

const pluginAction: FlowNode = {
  id: 'pa1', type: 'pluginAction', position: { x: 200, y: 0 },
  data: { pluginId: 'flow-example', contributionId: 'echo', method: 'flowExample.echo', label: 'Example echo' } satisfies PluginActionNodeData,
};
const edgeToPluginAction: FlowEdge = {
  id: 'e-pa', source: 'p1', sourceHandle: 'prompt-out', target: 'pa1', targetHandle: 'in', type: 'flow',
};
const pluginTrigger: FlowNode = {
  id: 'pt1', type: 'pluginTrigger', position: { x: 0, y: 0 },
  data: { pluginId: 'flow-example', contributionId: 'ping', event: 'flow-example:ping', label: 'Example ping', deliverResponse: false } satisfies PluginTriggerNodeData,
};
const edgeFromPluginTrigger: FlowEdge = {
  id: 'e-pt', source: 'pt1', sourceHandle: 'out', target: 'l1', targetHandle: 'in', type: 'flow',
};

describe('validateFlowShape — plugin nodes', () => {
  it('accepts promptBox → pluginAction', () => {
    expect(() => validateFlowShape([prompt, pluginAction], [edgeToPluginAction])).not.toThrow();
  });
  it('accepts pluginTrigger → llm', () => {
    expect(() => validateFlowShape([pluginTrigger, llmNode], [edgeFromPluginTrigger])).not.toThrow();
  });
  it('rejects pluginTrigger + promptBox together', () => {
    const ep: FlowEdge = { id: 'ep', source: 'p1', sourceHandle: 'prompt-out', target: 'l1', targetHandle: 'in', type: 'flow' };
    expect(() => validateFlowShape([pluginTrigger, prompt, llmNode], [edgeFromPluginTrigger, ep])).toThrow(UnsupportedFlowError);
  });
  // B1: fan-out to two reachable processing nodes (pluginAction + llm) is now a valid DAG.
  it('accepts fan-out: pluginAction + llm', () => {
    expect(() => validateFlowShape([prompt, pluginAction, llmNode], [edgeToPluginAction, edgeToLlm])).not.toThrow();
  });
});

describe('compileFlow — pluginAction node', () => {
  it('calls gatewayClient.callGatewayMethod with method + input and returns reply', async () => {
    const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
    const fakeGateway = {
      async sendAgentTurn() { return 'unused'; },
      async callGatewayMethod(method: string, params: Record<string, unknown>) {
        calls.push({ method, params });
        return 'echo: Hello';
      },
    };
    const { graph, initialState } = compileFlow([prompt, pluginAction], [edgeToPluginAction], { gatewayClient: fakeGateway });
    const result = await graph.invoke(initialState);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('flowExample.echo');
    expect(calls[0].params.input).toBe('Hello');
    expect(result.messages[result.messages.length - 1].content).toBe('echo: Hello');
  });
});

const channelNode: FlowNode = {
  id: 'ch1', type: 'channel', position: { x: 200, y: 0 },
  data: {
    channel: 'whatsapp',
    label: 'WhatsApp',
    destinations: [
      { kind: 'custom', to: '+51922286663', label: 'Owner 1' },
      { kind: 'user', to: '+51999999999', label: 'Renzo' },
    ],
  },
};
const edgeToChannel: FlowEdge = {
  id: 'e-ch', source: 'p1', sourceHandle: 'prompt-out', target: 'ch1', targetHandle: 'in', type: 'flow',
};

describe('validateFlowShape — channel node', () => {
  it('accepts promptBox → channel', () => {
    expect(() => validateFlowShape([prompt, channelNode], [edgeToChannel])).not.toThrow();
  });
});

describe('compileFlow — channel node', () => {
  it('sends the upstream message to every destination via sendChannelMessage', async () => {
    const calls: Array<{ channel: string; to: string; message: string; index: number }> = [];
    const fakeGateway = {
      async sendAgentTurn() { return 'unused'; },
      async sendChannelMessage(
        channel: string, to: string, message: string,
        _accountId: string | undefined, _runId: string, _nodeId: string, index: number,
      ) {
        calls.push({ channel, to, message, index });
        return { ok: true, messageId: `m-${index}` };
      },
    };
    const { graph, initialState } = compileFlow([prompt, channelNode], [edgeToChannel], { gatewayClient: fakeGateway });
    const result = await graph.invoke(initialState);
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.to)).toEqual(['+51922286663', '+51999999999']);
    expect(calls.every((c) => c.channel === 'whatsapp' && c.message === 'Hello')).toBe(true);
    expect(String(result.messages[result.messages.length - 1].content)).toContain('Sent to 2/2');
  });

  it('completes with a partial-failure summary when some destinations fail', async () => {
    const fakeGateway = {
      async sendAgentTurn() { return 'unused'; },
      async sendChannelMessage(_c: string, to: string) {
        return to.endsWith('663') ? { ok: true } : { ok: false, error: 'unknown_channel' };
      },
    };
    const { graph, initialState } = compileFlow([prompt, channelNode], [edgeToChannel], { gatewayClient: fakeGateway });
    const result = await graph.invoke(initialState);
    const out = String(result.messages[result.messages.length - 1].content);
    expect(out).toContain('Sent to 1/2');
    expect(out).toContain('Failed');
  });

  it('throws (node error) when every destination fails', async () => {
    const fakeGateway = {
      async sendAgentTurn() { return 'unused'; },
      async sendChannelMessage() { return { ok: false, error: 'boom' }; },
    };
    const { graph, initialState } = compileFlow([prompt, channelNode], [edgeToChannel], { gatewayClient: fakeGateway });
    await expect(graph.invoke(initialState)).rejects.toThrow(/Sent to 0\/2/);
  });

  it('throws UnsupportedFlowError when the channel node has no destinations', async () => {
    const empty: FlowNode = { ...channelNode, data: { channel: 'whatsapp', label: 'WhatsApp', destinations: [] } };
    const { graph, initialState } = compileFlow([prompt, empty], [edgeToChannel], {
      gatewayClient: { async sendAgentTurn() { return 'x'; }, async sendChannelMessage() { return { ok: true }; } },
    });
    await expect(graph.invoke(initialState)).rejects.toThrow(UnsupportedFlowError);
  });
});

describe('compileFlow — pluginTrigger node', () => {
  it('requires initialPrompt and seeds it', async () => {
    const fakeModel = { async invoke(msgs: BaseMessage[]) { return new AIMessage(`pt-echo:${String(msgs[msgs.length - 1].content)}`); } };
    const { graph, initialState } = compileFlow([pluginTrigger, llmNode], [edgeFromPluginTrigger], { model: fakeModel, initialPrompt: 'evt' });
    expect(initialState.messages[0].content).toBe('evt');
    const result = await graph.invoke(initialState);
    expect(result.messages[result.messages.length - 1].content).toBe('pt-echo:evt');
  });
  it('throws when pluginTrigger present but initialPrompt missing', () => {
    expect(() => compileFlow([pluginTrigger, llmNode], [edgeFromPluginTrigger], {})).toThrow(UnsupportedFlowError);
  });
});

describe('compileFlow — agent node agentKind', () => {
  it('routes a custom-kind agent to gatewayClient.sendAgentTurn', async () => {
    const calls: string[] = [];
    const fakeGateway = {
      async sendAgentTurn(agentId: string) { calls.push(agentId); return 'gw-reply'; },
    };
    const customAgent: FlowNode = {
      id: 'a1', type: 'agent', position: { x: 200, y: 0 },
      data: { agentKind: 'custom', agentId: 'PANIK', label: 'PANIK', sessionMode: 'ephemeral' } as never,
    };
    const e: FlowEdge = { id: 'e', source: 'p1', sourceHandle: 'prompt-out', target: 'a1', targetHandle: 'in', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, customAgent], [e], { gatewayClient: fakeGateway });
    const result = await graph.invoke(initialState);
    expect(calls).toEqual(['PANIK']);
    expect(result.messages[result.messages.length - 1].content).toBe('gw-reply');
  });

  it('throws UnsupportedFlowError for a drone-kind agent', () => {
    const droneAgent: FlowNode = {
      id: 'a1', type: 'agent', position: { x: 200, y: 0 },
      data: { agentKind: 'drone', agentId: 'summarize', label: 'summarize', sessionMode: 'ephemeral' } as never,
    };
    const e: FlowEdge = { id: 'e', source: 'p1', sourceHandle: 'prompt-out', target: 'a1', targetHandle: 'in', type: 'flow' };
    expect(() => compileFlow([prompt, droneAgent], [e], { gatewayClient: { async sendAgentTurn() { return 'x'; } } }))
      .toThrow(UnsupportedFlowError);
  });
});

describe('chaining input contract', () => {
  it('agent node reads the latest message (not just the last human)', async () => {
    const fakeModel = { async invoke() { return new AIMessage('LLM_OUT'); } };
    const seen: string[] = [];
    const fakeGateway = { async sendAgentTurn(_id: string, p: string) { seen.push(p); return 'AGENT_OUT'; } };
    const llm: FlowNode = { id: 'l1', type: 'llm', position: { x: 0, y: 0 }, data: { modelId: 'm', label: 'LLM' } };
    const ag: FlowNode = { id: 'a2', type: 'agent', position: { x: 0, y: 0 }, data: { agentKind: 'custom', agentId: 'PANIK', label: 'PANIK', sessionMode: 'ephemeral' } as never };
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 'l1', targetHandle: 'i', type: 'flow' };
    const e2: FlowEdge = { id: 'e2', source: 'l1', sourceHandle: 'o', target: 'a2', targetHandle: 'i', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, llm, ag], [e1, e2], { model: fakeModel, gatewayClient: fakeGateway });
    await graph.invoke(initialState);
    expect(seen).toEqual(['LLM_OUT']);
  });
});

describe('validateFlowShape — graph (B1)', () => {
  const llm2: FlowNode = { id: 'l2', type: 'llm', position: { x: 0, y: 0 }, data: { modelId: 'm', label: 'LLM2' } };
  it('accepts a 3-node chain prompt->llm->llm2', () => {
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 'l1', targetHandle: 'i', type: 'flow' };
    const e2: FlowEdge = { id: 'e2', source: 'l1', sourceHandle: 'o', target: 'l2', targetHandle: 'i', type: 'flow' };
    expect(() => validateFlowShape([prompt, llmNode, llm2], [e1, e2])).not.toThrow();
  });
  it('rejects a cycle', () => {
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 'l1', targetHandle: 'i', type: 'flow' };
    const e2: FlowEdge = { id: 'e2', source: 'l1', sourceHandle: 'o', target: 'l2', targetHandle: 'i', type: 'flow' };
    const e3: FlowEdge = { id: 'e3', source: 'l2', sourceHandle: 'o', target: 'l1', targetHandle: 'i', type: 'flow' };
    expect(() => validateFlowShape([prompt, llmNode, llm2], [e1, e2, e3])).toThrow(UnsupportedFlowError);
  });
  it('rejects an unreachable processing node', () => {
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 'l1', targetHandle: 'i', type: 'flow' };
    expect(() => validateFlowShape([prompt, llmNode, llm2], [e1])).toThrow(UnsupportedFlowError);
  });
  it('rejects zero processing nodes', () => {
    expect(() => validateFlowShape([prompt], [])).toThrow(UnsupportedFlowError);
  });
  it('still accepts the classic single prompt->agent flow', () => {
    expect(() => validateFlowShape([prompt, agent], [edge])).not.toThrow();
  });
});

describe('compileFlow — chain ordering (B1)', () => {
  it('runs prompt->llm->llm2 in order, passing outputs forward', async () => {
    const calls: string[] = [];
    const fakeModel = {
      async invoke(msgs: BaseMessage[]) {
        const inp = String(msgs[msgs.length - 1].content);
        calls.push(inp);
        return new AIMessage(`<${inp}>`);
      },
    };
    const llm2: FlowNode = { id: 'l2', type: 'llm', position: { x: 0, y: 0 }, data: { modelId: 'm', label: 'LLM2' } };
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 'l1', targetHandle: 'i', type: 'flow' };
    const e2: FlowEdge = { id: 'e2', source: 'l1', sourceHandle: 'o', target: 'l2', targetHandle: 'i', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, llmNode, llm2], [e1, e2], { model: fakeModel });
    const result = await graph.invoke(initialState);
    expect(calls[0]).toBe('Hello');
    expect(calls[1]).toBe('<Hello>');
    expect(result.messages[result.messages.length - 1].content).toBe('<<Hello>>');
  });
});

describe('compileFlow — transform node', () => {
  it('templates {input} with the last message and feeds the next node', async () => {
    const seen: string[] = [];
    const fakeModel = { async invoke(msgs: BaseMessage[]) { seen.push(String(msgs[msgs.length - 1].content)); return new AIMessage('done'); } };
    const transform: FlowNode = { id: 't1', type: 'transform', position: { x: 0, y: 0 }, data: { template: 'Q: {input}', label: 'T' } as never };
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 't1', targetHandle: 'i', type: 'flow' };
    const e2: FlowEdge = { id: 'e2', source: 't1', sourceHandle: 'o', target: 'l1', targetHandle: 'i', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, transform, llmNode], [e1, e2], { model: fakeModel });
    await graph.invoke(initialState);
    expect(seen).toEqual(['Q: Hello']);
  });

  it('runs a standalone transform (prompt->transform) producing the templated text', async () => {
    const transform: FlowNode = { id: 't1', type: 'transform', position: { x: 0, y: 0 }, data: { template: 'X:{input}:Y', label: 'T' } as never };
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 't1', targetHandle: 'i', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, transform], [e1], {});
    const result = await graph.invoke(initialState);
    expect(String(result.messages[result.messages.length - 1].content)).toBe('X:Hello:Y');
  });
});

describe('compileFlow — structured node', () => {
  it('uses withStructuredOutput and stringifies the result', async () => {
    const fakeModel = {
      invoke: async () => new AIMessage('ignored'),
      withStructuredOutput() {
        return { async invoke() { return new AIMessage('{"name":"Ada"}'); } } as never;
      },
    };
    const structured: FlowNode = { id: 's1', type: 'structured', position: { x: 0, y: 0 }, data: { modelId: 'm', schema: '{"type":"object"}', label: 'S' } as never };
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 's1', targetHandle: 'i', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, structured], [e1], { model: fakeModel });
    const result = await graph.invoke(initialState);
    expect(String(result.messages[result.messages.length - 1].content)).toBe('{"name":"Ada"}');
  });

  it('throws on invalid JSON schema', () => {
    const structured: FlowNode = { id: 's1', type: 'structured', position: { x: 0, y: 0 }, data: { modelId: 'm', schema: 'not json', label: 'S' } as never };
    const e1: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'o', target: 's1', targetHandle: 'i', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, structured], [e1], { model: { invoke: async () => new AIMessage('x') } });
    return expect(graph.invoke(initialState)).rejects.toThrow(UnsupportedFlowError);
  });
});

// ── Router node routing functions (B2-T2) ────────────────────────────────────

describe('matchesRule', () => {
  it('contains', () => {
    expect(matchesRule('hello world', { op: 'contains', value: 'world' })).toBe(true);
    expect(matchesRule('hello', { op: 'contains', value: 'world' })).toBe(false);
  });
  it('equals', () => {
    expect(matchesRule('hi', { op: 'equals', value: 'hi' })).toBe(true);
    expect(matchesRule('hi ', { op: 'equals', value: 'hi' })).toBe(false);
  });
  it('regex (and invalid regex → false)', () => {
    expect(matchesRule('abc123', { op: 'regex', value: '\\d+' })).toBe(true);
    expect(matchesRule('abc', { op: 'regex', value: '[' })).toBe(false);
  });
});

function routerNode(data: Partial<RouterNodeData>): FlowNode {
  return { id: 'r1', type: 'router', position: { x: 0, y: 0 }, data: { mode: 'rule', branches: [], label: 'R', ...data } as never };
}
const stateWith = (text: string) => ({ messages: [new HumanMessage(text)] }) as never;

describe('buildRouterRoute — rule mode', () => {
  const node = routerNode({ mode: 'rule', branches: [
    { id: 'b1', label: 'urgent', rule: { op: 'contains', value: 'urgent' } },
    { id: 'b2', label: 'greet', rule: { op: 'contains', value: 'hello' } },
  ] });
  const connected = new Set(['b1', 'b2', 'default']);
  it('first match wins, ordered', async () => {
    expect(await buildRouterRoute(node, connected, {})(stateWith('this is urgent and hello'))).toBe('b1');
  });
  it('falls to default when none match', async () => {
    expect(await buildRouterRoute(node, connected, {})(stateWith('nothing here'))).toBe('default');
  });
  it('clamps a matched-but-unconnected branch to default', async () => {
    expect(await buildRouterRoute(node, new Set(['b2', 'default']), {})(stateWith('urgent'))).toBe('default');
  });
});

describe('buildRouterRoute — llm mode', () => {
  const node = routerNode({ mode: 'llm', branches: [ { id: 'b1', label: 'sales' }, { id: 'b2', label: 'support' } ] });
  const connected = new Set(['b1', 'b2', 'default']);
  it('maps the model label to the branch id', async () => {
    const fakeModel = { async invoke() { return new AIMessage('support'); } };
    expect(await buildRouterRoute(node, connected, { model: fakeModel })(stateWith('my app is broken'))).toBe('b2');
  });
  it('unknown label → default', async () => {
    const fakeModel = { async invoke() { return new AIMessage('zzz'); } };
    expect(await buildRouterRoute(node, connected, { model: fakeModel })(stateWith('x'))).toBe('default');
  });
  it('normalizes mixed-case model output to the branch id', async () => {
    const fakeModel = { async invoke() { return new AIMessage('Support'); } };
    expect(await buildRouterRoute(node, connected, { model: fakeModel })(stateWith('x'))).toBe('b2');
  });
});

describe('matchesRule — regex input cap', () => {
  it('still matches within the cap', () => {
    expect(matchesRule('a'.repeat(50) + 'NEEDLE', { op: 'contains', value: 'NEEDLE' })).toBe(true);
  });
  it('only tests the capped prefix for regex (match beyond cap is not seen)', () => {
    const big = 'x'.repeat(10_000) + 'TAIL';
    // 'TAIL' is past the 10k cap, so an anchored search for it should NOT match the sliced input.
    expect(matchesRule(big, { op: 'regex', value: 'TAIL$' })).toBe(false);
    // but a pattern matching within the cap still works
    expect(matchesRule(big, { op: 'regex', value: '^x+' })).toBe(true);
  });
});

describe('compileFlow — router integration', () => {
  const mkLlm = (id: string): FlowNode => ({ id, type: 'llm', position: { x: 0, y: 0 }, data: { modelId: 'm', label: id } });

  it('rule router fires the matching branch only', async () => {
    const invoked: string[] = [];
    const fakeModel = { async invoke(msgs: BaseMessage[]) { invoked.push(String(msgs[msgs.length - 1].content)); return new AIMessage('out'); } };
    const router: FlowNode = { id: 'r1', type: 'router', position: { x: 0, y: 0 }, data: { mode: 'rule', label: 'R', branches: [{ id: 'b1', label: 'A', rule: { op: 'contains', value: 'go-a' } }] } as never };
    const a = mkLlm('na'); const b = mkLlm('nb');
    const eIn: FlowEdge = { id: 'e0', source: 'p1', sourceHandle: 'o', target: 'r1', targetHandle: 'i', type: 'flow' };
    const eA: FlowEdge = { id: 'ea', source: 'r1', sourceHandle: 'b1', target: 'na', targetHandle: 'i', type: 'flow' };
    const eB: FlowEdge = { id: 'eb', source: 'r1', sourceHandle: 'default', target: 'nb', targetHandle: 'i', type: 'flow' };
    const promptGoA: FlowNode = { id: 'p1', type: 'promptBox', position: { x: 0, y: 0 }, data: { label: 'P', value: 'please go-a now' } };
    const { graph, initialState } = compileFlow([promptGoA, router, a, b], [eIn, eA, eB], { model: fakeModel });
    await graph.invoke(initialState);
    expect(invoked).toEqual(['please go-a now']); // only branch A's node ran
  });

  it('routes to default → END when nothing matches and default is unconnected', async () => {
    const fakeModel = { async invoke() { return new AIMessage('x'); } };
    const router: FlowNode = { id: 'r1', type: 'router', position: { x: 0, y: 0 }, data: { mode: 'rule', label: 'R', branches: [{ id: 'b1', label: 'A', rule: { op: 'contains', value: 'zzz' } }] } as never };
    const a = mkLlm('na');
    const eIn: FlowEdge = { id: 'e0', source: 'p1', sourceHandle: 'o', target: 'r1', targetHandle: 'i', type: 'flow' };
    const eA: FlowEdge = { id: 'ea', source: 'r1', sourceHandle: 'b1', target: 'na', targetHandle: 'i', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, router, a], [eIn, eA], { model: fakeModel });
    const result = await graph.invoke(initialState);
    expect(String(result.messages[result.messages.length - 1].content)).toBe('Hello'); // 'na' never ran
  });
});

describe('compileFlow — toolAgent node', () => {
  const prompt = { id: 'p', type: 'promptBox', position: { x: 0, y: 0 }, data: { label: 'P', value: 'hi agent' } } as const;
  const toolAgent = {
    id: 'ta', type: 'toolAgent', position: { x: 1, y: 0 },
    data: { modelId: 'm', systemPrompt: 'You are helpful.', tools: [], label: 'Tool Agent' },
  } as const;
  const edge = { id: 'e', source: 'p', sourceHandle: 'out', target: 'ta', targetHandle: 'in', type: 'flow' } as const;

  it('appends only the agent final message and passes system prompt + recursionLimit', async () => {
    let seenMessages: BaseMessage[] = [];
    let seenConfig: { recursionLimit?: number } | undefined;
    const fakeFactory = (_args: { llm: unknown; tools: unknown[] }) => ({
      async invoke(input: { messages: BaseMessage[] }, config?: { recursionLimit?: number }) {
        seenMessages = input.messages;
        seenConfig = config;
        return { messages: [...input.messages, new AIMessage('AGENT_FINAL')] };
      },
    });

    const { graph, initialState } = compileFlow(
      [prompt, toolAgent] as never,
      [edge] as never,
      { model: { async invoke() { return new AIMessage('x'); } }, reactAgentFactory: fakeFactory },
    );
    const result = await graph.invoke(initialState);
    const last = result.messages[result.messages.length - 1];
    expect(String(last.content)).toBe('AGENT_FINAL');
    expect(String(seenMessages[0].content)).toBe('You are helpful.');
    expect(seenConfig?.recursionLimit).toBe(10);
  });

  it('omits the system message when systemPrompt is empty', async () => {
    let seenMessages: BaseMessage[] = [];
    const fakeFactory = () => ({
      async invoke(input: { messages: BaseMessage[] }) {
        seenMessages = input.messages;
        return { messages: [...input.messages, new AIMessage('OK')] };
      },
    });
    const ta2 = { ...toolAgent, data: { ...toolAgent.data, systemPrompt: '' } };
    const { graph, initialState } = compileFlow(
      [prompt, ta2] as never, [edge] as never,
      { model: { async invoke() { return new AIMessage('x'); } }, reactAgentFactory: fakeFactory },
    );
    await graph.invoke(initialState);
    expect(String(seenMessages[0].content)).toBe('hi agent');
  });
});

describe('validateFlowShape — toolAgent', () => {
  it('accepts a prompt → toolAgent flow', () => {
    const prompt = { id: 'p', type: 'promptBox', position: { x: 0, y: 0 }, data: { label: 'P', value: 'x' } };
    const ta = { id: 'ta', type: 'toolAgent', position: { x: 1, y: 0 }, data: { modelId: 'm', tools: [], label: 'T' } };
    const edge = { id: 'e', source: 'p', sourceHandle: 'out', target: 'ta', targetHandle: 'in', type: 'flow' };
    expect(() => validateFlowShape([prompt, ta] as never, [edge] as never)).not.toThrow();
  });

  it('rejects a cycle through a toolAgent', () => {
    const prompt = { id: 'p', type: 'promptBox', position: { x: 0, y: 0 }, data: { label: 'P', value: 'x' } };
    const ta = { id: 'ta', type: 'toolAgent', position: { x: 1, y: 0 }, data: { modelId: 'm', tools: [], label: 'T' } };
    const e1 = { id: 'e1', source: 'p', sourceHandle: 'out', target: 'ta', targetHandle: 'in', type: 'flow' };
    const e2 = { id: 'e2', source: 'ta', sourceHandle: 'out', target: 'ta', targetHandle: 'in', type: 'flow' };
    expect(() => validateFlowShape([prompt, ta] as never, [e1, e2] as never)).toThrow();
  });
});
