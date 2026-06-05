import { describe, it, expect } from 'vitest';
import { extractReply, deriveSessionKey } from './client.js';

describe('extractReply', () => {
  it('extracts a top-level string content field', () => {
    expect(extractReply({ content: 'hello' })).toBe('hello');
  });
  it('extracts a top-level reply field', () => {
    expect(extractReply({ reply: 'hi there' })).toBe('hi there');
  });
  it('extracts the last message from a messages array', () => {
    expect(extractReply({ messages: [{ content: 'first' }, { content: 'last' }] })).toBe('last');
  });
  it('returns null for unrecognised shape', () => {
    expect(extractReply({ foo: 'bar' })).toBeNull();
  });
  it('returns null for null input', () => {
    expect(extractReply(null)).toBeNull();
  });
});

describe('deriveSessionKey', () => {
  it('makes an ephemeral key that still encodes the agent (canonical agent:<id>:<rest>)', () => {
    expect(deriveSessionKey('ephemeral', 'agent1', 'run-123', 'node-abc')).toBe(
      'agent:agent1:flow-run:run-123:node-abc',
    );
  });
  it('makes a shared key from agentId', () => {
    expect(deriveSessionKey('shared', 'PANIK', 'any', 'any')).toBe('agent:PANIK:main');
  });
});

describe('extractReply — plugin action reply', () => {
  it('reads { reply } from a plugin action response', () => {
    expect(extractReply({ reply: 'echo: hi' })).toBe('echo: hi');
  });
});
