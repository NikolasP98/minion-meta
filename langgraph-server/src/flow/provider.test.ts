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

  it('prefers OpenRouter over Anthropic for non-native ids when both keys are set', () => {
    const model = resolveProviderModel('some-model', {
      OPENROUTER_API_KEY: 'sk-or-test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
    });
    expect(model).toBeInstanceOf(ChatOpenAI);
  });

  it('routes Anthropic-native claude ids to ChatAnthropic even when OpenRouter is set', () => {
    // claude-haiku-4-5-20251001 is invalid on OpenRouter (needs anthropic/<slug>),
    // so a bare claude-* id must go to the Anthropic API.
    const model = resolveProviderModel('claude-haiku-4-5-20251001', {
      OPENROUTER_API_KEY: 'sk-or-test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
    });
    expect(model).toBeInstanceOf(ChatAnthropic);
  });

  it('sends OpenRouter anthropic/<slug> form through OpenRouter, not the Anthropic API', () => {
    const model = resolveProviderModel('anthropic/claude-haiku-4.5', {
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
