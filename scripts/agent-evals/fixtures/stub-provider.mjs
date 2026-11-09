// Test preload replaces the transport seam of the REAL live adapter. No CLI fake-live path.
import fs from 'node:fs';
const allowed = new Set([
  'https://openrouter.ai/api/v1/chat/completions',
  'https://openrouter.ai/api/alpha/decisions',
]);
globalThis.fetch = async (url, options) => {
  if (!allowed.has(url)) throw Error('external network denied by test harness');
  if (options.redirect !== 'error') throw Error('redirects not disabled');
  const body = JSON.parse(options.body);
  if (!body.max_tokens || body.provider.allow_fallbacks !== false) throw Error('unbounded request');
  const counter = process.env.MINION_EVAL_TEST_COUNTER;
  if (!counter) throw Error('test counter required');
  fs.appendFileSync(
    counter,
    JSON.stringify({ url, model: body.model, maxTokens: body.max_tokens }) + '\n',
    { mode: 0o600 },
  );
  const behavior = process.env.MINION_EVAL_TEST_BEHAVIOR;
  if (behavior === 'hold') await new Promise((resolve) => setTimeout(resolve, 1000));
  if (behavior === 'crash') process.kill(process.pid, 'SIGKILL');
  if (behavior === 'loss') throw Error('response lost');
  if (behavior === 'timeout')
    return new Promise((resolve, reject) =>
      options.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }),
    );
  if (behavior === 'partial')
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode('{"usage":'));
          c.error(new Error('partial body'));
        },
      }),
    );
  const result = {
    model: behavior === 'drift' ? 'wrong/model' : body.model,
    choices: [{ message: { content: 'fixture answer' } }],
    usage: {
      prompt_tokens: 2,
      completion_tokens: 2,
      cost: behavior === 'unknown' ? null : behavior === 'costly' ? 0.0015 : 0.000001,
    },
  };
  if (url.endsWith('/decisions')) {
    delete result.choices;
    result.answers = {
      mode: { choice: 'chat', probabilities: { chat: 1 } },
      pages: { noul: 0 },
      forms: { noul: 0 },
      data: { noul: 0 },
      brain: { noul: 0 },
      changelog: { noul: 0 },
      sandbox: { noul: 0 },
    };
    result.usage = { input_tokens: 2, output_tokens: 2, cost: result.usage.cost };
  }
  if (behavior === 'malformed') delete result.choices;
  return Response.json(result);
};
