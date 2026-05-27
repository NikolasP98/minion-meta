import { tool } from '@langchain/core/tools';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { TavilySearch } from '@langchain/tavily';
import { callGatewayMethod } from '../gateway/client.js';
import type { ToolRef, FlowRunEvent } from './types.js';

/**
 * Evaluate a basic arithmetic expression safely.
 * Only `0-9 . + - * / ( )` and whitespace are permitted (regex-gated), and the
 * value is produced by a recursive-descent parser — never eval/Function/new Function.
 */
export function safeEvalArithmetic(expr: string): number {
  if (typeof expr !== 'string' || !/^[0-9+\-*/().\s]+$/.test(expr)) {
    throw new Error('calculator: only numbers and + - * / ( ) are allowed');
  }
  const tokens = expr.match(/\d+\.?\d*|\.\d+|[+\-*/()]/g);
  if (!tokens) throw new Error('calculator: no tokens');
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  // expr := term (('+'|'-') term)*
  function parseExpr(): number {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }
  // term := factor (('*'|'/') factor)*
  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }
  // factor := '-' factor | '+' factor | '(' expr ')' | number
  function parseFactor(): number {
    const t = peek();
    if (t === '-') { next(); return -parseFactor(); }
    if (t === '+') { next(); return parseFactor(); }
    if (t === '(') {
      next();
      const value = parseExpr();
      if (next() !== ')') throw new Error('calculator: unbalanced parentheses');
      return value;
    }
    const num = Number(next());
    if (Number.isNaN(num)) throw new Error('calculator: expected a number');
    return num;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('calculator: unexpected trailing input');
  return result;
}

export const BUILTIN_TOOL_IDS = ['web_search', 'current_time', 'calculator'] as const;

export type GatewayInvoke = (method: string, params: Record<string, unknown>) => Promise<string>;

export interface BuildToolsOptions {
  gatewayInvoke?: GatewayInvoke;
  env?: Record<string, string | undefined>;
  runId?: string;
  nodeId?: string;
  onEvent?: (e: FlowRunEvent) => void;
}

export function buildTools(refs: ToolRef[], opts: BuildToolsOptions = {}): StructuredToolInterface[] {
  const env = opts.env ?? process.env;
  const invoke = opts.gatewayInvoke ?? callGatewayMethod;
  const out: StructuredToolInterface[] = [];

  for (const ref of refs) {
    if (ref.kind === 'builtin') {
      if (ref.id === 'web_search') {
        if (!env.TAVILY_API_KEY) {
          opts.onEvent?.({ level: 'warn', message: 'web_search skipped — TAVILY_API_KEY not set', nodeId: opts.nodeId });
          continue;
        }
        out.push(new TavilySearch({ maxResults: 5, tavilyApiKey: env.TAVILY_API_KEY }) as unknown as StructuredToolInterface);
      } else if (ref.id === 'current_time') {
        out.push(tool(async () => new Date().toISOString(), {
          name: 'current_time',
          description: 'Returns the current date and time as an ISO 8601 string.',
          schema: z.object({}),
        }));
      } else if (ref.id === 'calculator') {
        out.push(tool(async ({ expression }: { expression: string }) => String(safeEvalArithmetic(expression)), {
          name: 'calculator',
          description: 'Evaluates a basic arithmetic expression (+, -, *, /, parentheses).',
          schema: z.object({ expression: z.string() }),
        }));
      }
      // Unknown builtin id → skipped (forward-compatible).
    } else {
      const { method, name, description } = ref;
      out.push(tool(
        async ({ input }: { input: string }) => invoke(method, { input, runId: opts.runId, nodeId: opts.nodeId }),
        { name, description, schema: z.object({ input: z.string() }) },
      ));
    }
  }
  return out;
}
