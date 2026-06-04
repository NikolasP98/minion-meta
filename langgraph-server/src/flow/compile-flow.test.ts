import { describe, it, expect } from 'vitest';
import { validateFlowShape, compileFlow, resolveModelId, DEFAULT_MODEL, matchesRule, buildRouterRoute, buildBranchRoute, findBranchConfig } from './compile-flow.js';
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

const reactionNode: FlowNode = {
  id: 'rx1', type: 'reaction', position: { x: 200, y: 0 },
  data: { label: 'React', emoji: '👀' },
};
const edgeToReaction: FlowEdge = {
  id: 'e-rx', source: 'p1', sourceHandle: 'prompt-out', target: 'rx1', targetHandle: 'in', type: 'flow',
};

describe('validateFlowShape — reaction node', () => {
  it('accepts promptBox → reaction (reaction counts as a processing node)', () => {
    expect(() => validateFlowShape([prompt, reactionNode], [edgeToReaction])).not.toThrow();
  });
});

describe('compileFlow — reaction node', () => {
  it('reacts to the trigger message via flows.reaction.set, then passes the upstream message through', async () => {
    const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
    const fakeGateway = {
      async sendAgentTurn() { return 'unused'; },
      async callGatewayMethod(method: string, params: Record<string, unknown>) {
        calls.push({ method, params });
        return 'reacted 👀';
      },
    };
    const { graph, initialState } = compileFlow([prompt, reactionNode], [edgeToReaction], {
      gatewayClient: fakeGateway,
      eventPayload: { channelId: 'telegram', chatId: '9001', messageId: 'm-42', accountId: 'tg1' },
    });
    const result = await graph.invoke(initialState);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('flows.reaction.set');
    expect(calls[0].params).toMatchObject({
      channel: 'telegram', to: '9001', messageId: 'm-42', emoji: '👀', accountId: 'tg1',
    });
    // Transparent side-effect: the upstream prompt message is still the last message.
    expect(String(result.messages[result.messages.length - 1].content)).toBe('Hello');
  });

  it('no-ops on a manual run (no trigger message in the event payload)', async () => {
    const calls: string[] = [];
    const fakeGateway = {
      async sendAgentTurn() { return 'unused'; },
      async callGatewayMethod(method: string) { calls.push(method); return 'x'; },
    };
    const { graph, initialState } = compileFlow([prompt, reactionNode], [edgeToReaction], {
      gatewayClient: fakeGateway,
    });
    const result = await graph.invoke(initialState);
    expect(calls).toHaveLength(0);
    expect(String(result.messages[result.messages.length - 1].content)).toBe('Hello');
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

describe('buildRouterRoute — hybrid mode', () => {
  const node = routerNode({ mode: 'hybrid', branches: [
    { id: 'b1', label: 'high', rule: { op: 'contains', value: 'URGENT' }, description: 'severe' },
    { id: 'b2', label: 'low', description: 'minor' },
  ] });
  const connected = new Set(['b1', 'b2', 'default']);
  it('rule fast-path wins WITHOUT calling the LLM', async () => {
    let called = false;
    const fakeModel = { async invoke() { called = true; return new AIMessage('low'); } };
    expect(await buildRouterRoute(node, connected, { model: fakeModel })(stateWith('this is URGENT'))).toBe('b1');
    expect(called).toBe(false);
  });
  it('falls back to the LLM rubric when no rule matches', async () => {
    const fakeModel = { async invoke() { return new AIMessage('low'); } };
    expect(await buildRouterRoute(node, connected, { model: fakeModel })(stateWith('just a small thing'))).toBe('b2');
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

describe('findBranchConfig', () => {
  it('returns router data directly for a router node', () => {
    const router: FlowNode = { id: 'r1', type: 'router', position: { x: 0, y: 0 }, data: { mode: 'llm', label: 'R', branches: [{ id: 'b1', label: 'A' }] } as never };
    expect(findBranchConfig(router)?.branches).toHaveLength(1);
    expect(findBranchConfig(router)?.mode).toBe('llm');
  });
  it('detects a branch-editor config value embedded on a pluginAction by shape', () => {
    const node: FlowNode = {
      id: 'pa', type: 'pluginAction', position: { x: 0, y: 0 },
      data: { pluginId: 'p', contributionId: 'c', method: 'm', label: 'L',
        config: { routing: { mode: 'rule', branches: [{ id: 'b1', label: 'A', rule: { op: 'contains', value: 'x' } }] } } } as never,
    };
    const bc = findBranchConfig(node);
    expect(bc?.branches).toHaveLength(1);
    expect(bc?.mode).toBe('rule');
  });
  it('returns null when config has no branches (e.g. a destination-list value)', () => {
    const node: FlowNode = {
      id: 'pa', type: 'pluginAction', position: { x: 0, y: 0 },
      data: { pluginId: 'p', contributionId: 'c', method: 'm', label: 'L',
        config: { dest: { channel: 'whatsapp', destinations: [{ kind: 'custom', to: '+1' }] } } } as never,
    };
    expect(findBranchConfig(node)).toBeNull();
  });
  it('ignores invalid mode and falls back to rule', () => {
    const node: FlowNode = {
      id: 'pa', type: 'pluginAction', position: { x: 0, y: 0 },
      data: { pluginId: 'p', contributionId: 'c', method: 'm', label: 'L',
        config: { r: { mode: 'bogus', branches: [] } } } as never,
    };
    expect(findBranchConfig(node)?.mode).toBe('rule');
  });
});

describe('compileFlow — config-embedded brancher (branch-editor field)', () => {
  const mkLlm = (id: string): FlowNode => ({ id, type: 'llm', position: { x: 0, y: 0 }, data: { modelId: 'm', label: id } });

  it('runs the plugin method, then routes on its OUTPUT via the embedded branch config', async () => {
    const ran: string[] = [];
    const fakeModel = { async invoke(msgs: BaseMessage[]) { ran.push(String(msgs[msgs.length - 1].content)); return new AIMessage('llm-out'); } };
    const fakeGateway = {
      async sendAgentTurn() { return 'unused'; },
      // The plugin classifies and returns a label string; the brancher routes on it.
      async callGatewayMethod() { return 'urgent'; },
    };
    const brancher: FlowNode = {
      id: 'pa', type: 'pluginAction', position: { x: 0, y: 0 },
      data: { pluginId: 'p', contributionId: 'c', method: 'plugin.classify', label: 'Classify',
        config: { routing: { mode: 'rule', branches: [{ id: 'b1', label: 'urgent', rule: { op: 'contains', value: 'urgent' } }] } } } as never,
    };
    const a = mkLlm('na'); const b = mkLlm('nb');
    const eIn: FlowEdge = { id: 'e0', source: 'p1', sourceHandle: 'o', target: 'pa', targetHandle: 'i', type: 'flow' };
    const eA: FlowEdge = { id: 'ea', source: 'pa', sourceHandle: 'b1', target: 'na', targetHandle: 'i', type: 'flow' };
    const eB: FlowEdge = { id: 'eb', source: 'pa', sourceHandle: 'default', target: 'nb', targetHandle: 'i', type: 'flow' };
    const { graph, initialState } = compileFlow([prompt, brancher, a, b], [eIn, eA, eB], { model: fakeModel, gatewayClient: fakeGateway });
    await graph.invoke(initialState);
    // The plugin returned 'urgent' → branch b1 ('contains urgent') matched → only na ran on that output.
    expect(ran).toEqual(['urgent']);
  });

  it('buildBranchRoute classifies by LLM rubric when mode=llm', async () => {
    const fakeModel = { async invoke() { return new AIMessage('support'); } };
    const data = { mode: 'llm' as const, label: '', branches: [{ id: 'b1', label: 'sales' }, { id: 'b2', label: 'support' }] };
    const connected = new Set(['b1', 'b2', 'default']);
    const route = buildBranchRoute(data, connected, { model: fakeModel });
    expect(await route(stateWith('my app is broken'))).toBe('b2');
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

describe("compileFlow — handoff node", () => {
  it("calls flows.relay.open with origin + destinations and ends", async () => {
    const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
    const fakeGateway = {
      async sendAgentTurn() {
        return "x";
      },
      async callGatewayMethod(method: string, params: Record<string, unknown>) {
        calls.push({ method, params });
        return "relay opened (#1)";
      },
    };
    const trigger: FlowNode = {
      id: "t",
      type: "trigger",
      position: { x: 0, y: 0 },
      data: { event: "message:received", label: "T", deliverResponse: false, sources: [] } as never,
    };
    const handoff: FlowNode = {
      id: "h",
      type: "handoff",
      position: { x: 1, y: 0 },
      data: {
        label: "Handoff",
        destinations: [{ channel: "whatsapp", to: "O1" }],
        priority: "ALTA",
        suggestionCount: 3,
        language: "es",
      } as never,
    };
    const e: FlowEdge = {
      id: "e",
      source: "t",
      sourceHandle: "out",
      target: "h",
      targetHandle: "in",
      type: "flow",
    };
    const { graph, initialState } = compileFlow([trigger, handoff], [e], {
      initialPrompt: "tengo dolor intenso",
      gatewayClient: fakeGateway,
      originSessionKey: "whatsapp:default:51999@c.us",
      eventPayload: { channelId: "whatsapp", chatId: "51999@c.us", accountId: "default" },
    });
    await graph.invoke(initialState);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("flows.relay.open");
    expect(calls[0].params.originChannel).toBe("whatsapp");
    expect(calls[0].params.originChatId).toBe("51999@c.us");
    expect(calls[0].params.originalMessage).toBe("tengo dolor intenso");
    expect((calls[0].params.destinations as unknown[]).length).toBe(1);
  });
});

describe('subflow node', () => {
  // Parent flow: promptBox("hi there") → subflow(child-1).
  const pPrompt: FlowNode = {
    id: 'pp', type: 'promptBox', position: { x: 0, y: 0 },
    data: { label: 'P', value: 'hi there' },
  };
  const sfNode: FlowNode = {
    id: 'sf', type: 'subflow', position: { x: 200, y: 0 },
    data: { label: 'Subflow', flowId: 'child-1' },
  };
  const pEdge: FlowEdge = {
    id: 'pe', source: 'pp', sourceHandle: 'out', target: 'sf', targetHandle: 'in', type: 'flow',
  };

  // Child flow: promptBox("IGNORED") → transform("sub:{input}"). The child's
  // promptBox value must be overridden by the parent's input.
  const cPrompt: FlowNode = {
    id: 'cp', type: 'promptBox', position: { x: 0, y: 0 },
    data: { label: 'C', value: 'IGNORED' },
  };
  const cXform: FlowNode = {
    id: 'cx', type: 'transform', position: { x: 200, y: 0 },
    data: { label: 'X', template: 'sub:{input}' },
  };
  const cEdge: FlowEdge = {
    id: 'ce', source: 'cp', sourceHandle: 'out', target: 'cx', targetHandle: 'in', type: 'flow',
  };
  const childFlow = { nodes: [cPrompt, cXform], edges: [cEdge] };
  const loadFlow = async (id: string) => {
    if (id === 'child-1') return childFlow;
    throw new Error(`unknown flow ${id}`);
  };

  it('runs the referenced flow with the caller input and returns its output', async () => {
    const { graph, initialState } = compileFlow([pPrompt, sfNode], [pEdge], { loadFlow });
    const result = await graph.invoke(initialState);
    const final = result.messages[result.messages.length - 1];
    // Proves: input override (child promptBox "IGNORED" → "hi there"),
    // execution, and output propagation downstream.
    expect(final.content).toBe('sub:hi there');
  });

  it('threads injected options (model) into the subflow', async () => {
    const cLlm: FlowNode = {
      id: 'cl', type: 'llm', position: { x: 200, y: 0 },
      data: { modelId: 'claude-haiku-4-5-20251001', label: 'LLM' },
    };
    const childLlmFlow = {
      nodes: [cPrompt, cLlm],
      edges: [{ id: 'cle', source: 'cp', sourceHandle: 'out', target: 'cl', targetHandle: 'in', type: 'flow' } as FlowEdge],
    };
    const fakeModel = {
      async invoke(msgs: BaseMessage[]) {
        return new AIMessage(`model:${String(msgs[msgs.length - 1].content)}`);
      },
    };
    const sfLlm: FlowNode = { ...sfNode, data: { label: 'Subflow', flowId: 'child-llm' } };
    const { graph, initialState } = compileFlow([pPrompt, sfLlm], [pEdge], {
      loadFlow: async () => childLlmFlow,
      model: fakeModel,
    });
    const result = await graph.invoke(initialState);
    expect(result.messages[result.messages.length - 1].content).toBe('model:hi there');
  });

  it('throws when the subflow node has no flow selected', async () => {
    const sfNoId: FlowNode = { ...sfNode, data: { label: 'Subflow' } };
    const { graph, initialState } = compileFlow([pPrompt, sfNoId], [pEdge], { loadFlow });
    await expect(graph.invoke(initialState)).rejects.toThrow(/no flow selected/);
  });

  it('throws when no flow loader is configured', async () => {
    const { graph, initialState } = compileFlow([pPrompt, sfNode], [pEdge], {});
    await expect(graph.invoke(initialState)).rejects.toThrow(/no flow loader/);
  });

  it('detects a cross-flow cycle (flow references itself via a subflow)', async () => {
    // child-cyc loads a flow whose own subflow node points back at child-cyc.
    const cSelf: FlowNode = {
      id: 'cs', type: 'subflow', position: { x: 200, y: 0 },
      data: { label: 'Self', flowId: 'child-cyc' },
    };
    const cyclicFlow = {
      nodes: [cPrompt, cSelf],
      edges: [{ id: 'ce2', source: 'cp', sourceHandle: 'out', target: 'cs', targetHandle: 'in', type: 'flow' } as FlowEdge],
    };
    const parentToCyc: FlowNode = { ...sfNode, data: { label: 'Subflow', flowId: 'child-cyc' } };
    const { graph, initialState } = compileFlow([pPrompt, parentToCyc], [pEdge], {
      loadFlow: async () => cyclicFlow,
    });
    await expect(graph.invoke(initialState)).rejects.toThrow(/cycle detected/);
  });

  it('enforces the max nesting depth', async () => {
    const { graph, initialState } = compileFlow([pPrompt, sfNode], [pEdge], {
      loadFlow,
      subflowStack: ['x', 'y'],
      maxSubflowDepth: 2,
    });
    await expect(graph.invoke(initialState)).rejects.toThrow(/too deep/);
  });
});

describe('built-in data nodes (database / fileWrite)', () => {
  const edgeFrom = (target: string): FlowEdge => ({
    id: `e-${target}`, source: 'p1', sourceHandle: 'prompt-out', target, targetHandle: 'in', type: 'flow',
  });
  const captureGateway = (reply: string) => {
    const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
    return {
      calls,
      client: {
        async sendAgentTurn() { return 'unused'; },
        async callGatewayMethod(method: string, params: Record<string, unknown>) {
          calls.push({ method, params });
          return reply;
        },
      },
    };
  };

  it('database (read) calls flows.db.query with the configured SQL + mark fields, {input} expanded', async () => {
    const node: FlowNode = {
      id: 'db1', type: 'database', position: { x: 200, y: 0 },
      data: {
        label: 'Read rows', action: 'read',
        sql: 'SELECT * FROM messages WHERE chat_id = {input} AND last_checked IS NULL',
        markColumn: 'last_checked', markTable: 'messages', markIdColumn: 'id',
      },
    };
    const { calls, client } = captureGateway('[{"id":1}]');
    const { graph, initialState } = compileFlow([prompt, node], [edgeFrom('db1')], { gatewayClient: client });
    const result = await graph.invoke(initialState);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('flows.db.query');
    const cfg = calls[0].params.config as Record<string, unknown>;
    expect(cfg.sql).toBe('SELECT * FROM messages WHERE chat_id = Hello AND last_checked IS NULL');
    expect(cfg.markColumn).toBe('last_checked');
    expect(cfg.markTable).toBe('messages');
    expect(String(result.messages[result.messages.length - 1].content)).toBe('[{"id":1}]');
  });

  it('database (update) calls flows.db.exec with the configured SQL + dbPath', async () => {
    const node: FlowNode = {
      id: 'db2', type: 'database', position: { x: 200, y: 0 },
      data: { label: 'Write', action: 'update', sql: 'UPDATE messages SET seen = 1', dbPath: '~/.minion/message-ledger.db' },
    };
    const { calls, client } = captureGateway('{"changes":3}');
    const { graph, initialState } = compileFlow([prompt, node], [edgeFrom('db2')], { gatewayClient: client });
    const result = await graph.invoke(initialState);
    expect(calls[0].method).toBe('flows.db.exec');
    const cfg = calls[0].params.config as Record<string, unknown>;
    expect(cfg.sql).toBe('UPDATE messages SET seen = 1');
    expect(cfg.dbPath).toBe('~/.minion/message-ledger.db');
    expect(String(result.messages[result.messages.length - 1].content)).toBe('{"changes":3}');
  });

  it('database (create) routes to flows.db.exec', async () => {
    const node: FlowNode = {
      id: 'db3', type: 'database', position: { x: 200, y: 0 },
      data: { label: 'Insert', action: 'create', sql: "INSERT INTO log (msg) VALUES ('{input}')" },
    };
    const { calls, client } = captureGateway('{"changes":1}');
    const { graph, initialState } = compileFlow([prompt, node], [edgeFrom('db3')], { gatewayClient: client });
    await graph.invoke(initialState);
    expect(calls[0].method).toBe('flows.db.exec');
    expect((calls[0].params.config as Record<string, unknown>).sql).toBe("INSERT INTO log (msg) VALUES ('Hello')");
  });

  it('fileWrite calls flows.file.write with the upstream content as input and the configured path/mode', async () => {
    const node: FlowNode = {
      id: 'fw1', type: 'fileWrite', position: { x: 200, y: 0 },
      data: { label: 'Write file', path: '~/.minion/recon/report-{date}.md', mode: 'append' },
    };
    const { calls, client } = captureGateway('/home/x/.minion/recon/report-2026-06-04.md');
    const { graph, initialState } = compileFlow([prompt, node], [edgeFrom('fw1')], { gatewayClient: client });
    const result = await graph.invoke(initialState);
    expect(calls[0].method).toBe('flows.file.write');
    expect(calls[0].params.input).toBe('Hello');
    const cfg = calls[0].params.config as Record<string, unknown>;
    expect(cfg.path).toBe('~/.minion/recon/report-{date}.md');
    expect(cfg.mode).toBe('append');
    expect(String(result.messages[result.messages.length - 1].content)).toContain('report-2026-06-04.md');
  });
});

describe('schedule trigger entry node', () => {
  const scheduleNode: FlowNode = {
    id: 's1', type: 'schedule', position: { x: 0, y: 0 },
    data: { label: 'Every day', every: 1, unit: 'days', atTime: '09:00' },
  };
  const schedEdge: FlowEdge = {
    id: 'se', source: 's1', sourceHandle: 'out', target: 'a1', targetHandle: 'in', type: 'flow',
  };

  it('is a valid entry node (like a trigger)', () => {
    expect(() => validateFlowShape([scheduleNode, agent], [schedEdge])).not.toThrow();
  });

  it('rejects a flow with both a schedule and a prompt box', () => {
    const pEdge2: FlowEdge = { id: 'e1', source: 'p1', sourceHandle: 'prompt-out', target: 'a1', targetHandle: 'in', type: 'flow' };
    expect(() => validateFlowShape([scheduleNode, prompt, agent], [schedEdge, pEdge2])).toThrow(
      /cannot have both/,
    );
  });

  it('compiles with an empty seed prompt — no initialPrompt required', async () => {
    const fakeModel = {
      async invoke(msgs: BaseMessage[]) {
        return new AIMessage(`seen:[${String(msgs[0].content)}]`);
      },
    };
    const llmNode: FlowNode = { id: 'a1', type: 'llm', position: { x: 200, y: 0 }, data: { label: 'LLM', modelId: 'x' } };
    const { graph, initialState } = compileFlow([scheduleNode, llmNode], [schedEdge], { model: fakeModel });
    const result = await graph.invoke(initialState);
    // The entry seeded an empty HumanMessage (no inbound message on a scheduled run).
    expect(String(result.messages[result.messages.length - 1].content)).toBe('seen:[]');
  });
});
