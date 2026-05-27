import { describe, it, expect } from 'vitest';
import { safeEvalArithmetic, buildTools, BUILTIN_TOOL_IDS } from './tools.js';
import type { FlowRunEvent } from './types.js';

describe('safeEvalArithmetic', () => {
  it('evaluates addition and multiplication with precedence', () => {
    expect(safeEvalArithmetic('2+3*4')).toBe(14);
  });
  it('respects parentheses', () => {
    expect(safeEvalArithmetic('(1+2)*3')).toBe(9);
  });
  it('handles decimals and division', () => {
    expect(safeEvalArithmetic('7.5 / 2.5')).toBe(3);
  });
  it('handles unary minus', () => {
    expect(safeEvalArithmetic('-4 + 10')).toBe(6);
  });
  it('rejects identifiers / code', () => {
    expect(() => safeEvalArithmetic('process.exit(1)')).toThrow();
    expect(() => safeEvalArithmetic('a+b')).toThrow();
  });
  it('rejects statement separators', () => {
    expect(() => safeEvalArithmetic('1;2')).toThrow();
  });
});

describe('buildTools — built-ins', () => {
  it('exposes the three built-in ids', () => {
    expect(BUILTIN_TOOL_IDS).toEqual(['web_search', 'current_time', 'calculator']);
  });

  it('resolves current_time and calculator with their tool names', () => {
    const tools = buildTools(
      [{ kind: 'builtin', id: 'current_time' }, { kind: 'builtin', id: 'calculator' }],
      { env: {} },
    );
    expect(tools.map((t) => t.name).sort()).toEqual(['calculator', 'current_time']);
  });

  it('calculator tool computes via safeEvalArithmetic', async () => {
    const [calc] = buildTools([{ kind: 'builtin', id: 'calculator' }], { env: {} });
    const out = await calc.invoke({ expression: '6*7' });
    expect(String(out)).toContain('42');
  });

  it('current_time tool returns a parseable ISO string', async () => {
    const [clock] = buildTools([{ kind: 'builtin', id: 'current_time' }], { env: {} });
    const out = await clock.invoke({});
    expect(Number.isNaN(Date.parse(String(out)))).toBe(false);
  });

  it('omits web_search when TAVILY_API_KEY is unset and fires a warn event', () => {
    const events: FlowRunEvent[] = [];
    const tools = buildTools([{ kind: 'builtin', id: 'web_search' }], {
      env: {}, onEvent: (e) => events.push(e),
    });
    expect(tools).toHaveLength(0);
    expect(events[0]?.level).toBe('warn');
  });

  it('includes web_search when TAVILY_API_KEY is set', () => {
    const tools = buildTools([{ kind: 'builtin', id: 'web_search' }], {
      env: { TAVILY_API_KEY: 'test-key' },
    });
    expect(tools).toHaveLength(1);
  });

  it('skips unknown built-in ids', () => {
    const tools = buildTools([{ kind: 'builtin', id: 'does_not_exist' }], { env: {} });
    expect(tools).toHaveLength(0);
  });
});

describe('buildTools — gateway tools', () => {
  it('wraps a gateway ref as a tool that calls the injected invoker', async () => {
    const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
    const [t] = buildTools(
      [{ kind: 'gateway', method: 'weather.get', name: 'get_weather', description: 'Get weather' }],
      {
        env: {},
        runId: 'run-1',
        nodeId: 'node-1',
        gatewayInvoke: async (method, params) => { calls.push({ method, params }); return 'sunny'; },
      },
    );
    expect(t.name).toBe('get_weather');
    const out = await t.invoke({ input: 'Lima' });
    expect(String(out)).toBe('sunny');
    expect(calls[0].method).toBe('weather.get');
    expect(calls[0].params).toMatchObject({ input: 'Lima', runId: 'run-1', nodeId: 'node-1' });
  });
});
