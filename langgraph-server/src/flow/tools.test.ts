import { describe, it, expect } from 'vitest';
import { safeEvalArithmetic } from './tools.js';

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
