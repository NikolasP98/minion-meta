import { describe, it, expect } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { resolveProviderModel } from './provider.js';

describe('resolveProviderModel', () => {
  it('returns ChatOpenAI pointed at OpenRouter when OPENROUTER_API_KEY is set', () => {
    const model = resolveProviderModel('openai/gpt-4o', { OPENROUTER_API_KEY: 'sk-or-test' });
    expect(model).toBeInstanceOf(ChatOpenAI);
  });

  it('returns ChatAnthropic when only ANTHROPIC_API_KEY is set', () => {
    const model = resolveProviderModel('claude-haiku-4-5-20251001', { ANTHROPIC_API_KEY: 'sk-ant-test' });
    expect(model).toBeInstanceOf(ChatAnthropic);
  });

  it('prefers OpenRouter over Anthropic when both keys are set', () => {
    const model = resolveProviderModel('some-model', {
      OPENROUTER_API_KEY: 'sk-or-test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
    });
    expect(model).toBeInstanceOf(ChatOpenAI);
  });

  it('throws when neither key is set', () => {
    expect(() => resolveProviderModel('some-model', {})).toThrow(
      'No LLM provider configured',
    );
  });
});
