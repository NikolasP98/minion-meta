import { describe, it, expect } from 'vitest';
import { validateFlowShape, compileFlow, resolveModelId, DEFAULT_MODEL } from './compile-flow.js';
import { UnsupportedFlowError } from './types.js';
import type { FlowNode, FlowEdge, LLMNodeData, TriggerNodeData } from './types.js';
import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';

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
