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

  it('rejects two execution nodes (agent + llm)', () => {
    expect(() => validateFlowShape([prompt, agent, llmNode], [edge, edgeToLlm])).toThrow(
      UnsupportedFlowError,
    );
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
  it('rejects two execution nodes: trigger + agent + llm', () => {
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
