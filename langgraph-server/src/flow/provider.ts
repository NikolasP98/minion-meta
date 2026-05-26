import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

export function resolveProviderModel(
  modelId: string,
  env: Record<string, string | undefined> = process.env,
) {
  if (env.OPENROUTER_API_KEY) {
    return new ChatOpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      model: modelId,
      temperature: 0,
      configuration: { baseURL: 'https://openrouter.ai/api/v1' },
    });
  }
  if (env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({ apiKey: env.ANTHROPIC_API_KEY, model: modelId, temperature: 0 });
  }
  throw new Error(
    'No LLM provider configured — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY.',
  );
}
