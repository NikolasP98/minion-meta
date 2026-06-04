import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

export function resolveProviderModel(
  modelId: string,
  env: Record<string, string | undefined> = process.env,
) {
  const id = (modelId ?? '').trim();
  // Anthropic-NATIVE model ids (e.g. `claude-haiku-4-5-20251001`, the format the
  // hub editor defaults to) are only valid against the Anthropic API. OpenRouter
  // rejects them ("… is not a valid model ID") — it needs the `anthropic/<slug>`
  // form. So route bare `claude-*` ids to ChatAnthropic when a key is present;
  // everything else (OpenRouter slugs like `anthropic/claude-haiku-4.5` or
  // `openai/gpt-4o`) goes through OpenRouter.
  const isAnthropicNative = !id.includes('/') && /^claude-/i.test(id);
  if (isAnthropicNative && env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({ apiKey: env.ANTHROPIC_API_KEY, model: id, temperature: 0 });
  }
  if (env.OPENROUTER_API_KEY) {
    return new ChatOpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      model: id,
      temperature: 0,
      configuration: { baseURL: 'https://openrouter.ai/api/v1' },
    });
  }
  if (env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({ apiKey: env.ANTHROPIC_API_KEY, model: id, temperature: 0 });
  }
  throw new Error(
    'No LLM provider configured — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY.',
  );
}
