import { assert, object, canonical, digest, integer, parse } from './common.mjs';
export const ENDPOINTS = Object.freeze({
  main: 'https://openrouter.ai/api/v1/chat/completions',
  classifier: 'https://openrouter.ai/api/alpha/decisions',
});
export function shapeRequest(request, manifest) {
  assert(request.kind === 'main' || request.kind === 'classifier', 'provider request kind');
  const p = manifest.provenance.provider,
    b = manifest.bounds;
  assert(
    p.profile === 'openrouter-v1' && p.boundPolicy === 'utf8-bytes-v1',
    'unsupported provider policy',
  );
  const model =
    request.kind === 'classifier'
      ? manifest.provenance.model.classifier
      : manifest.provenance.model;
  assert(model && request.model === model.requested, 'requested model drift');
  assert(
    typeof request.boundDescriptor === 'string' && request.boundDescriptor.length > 0,
    'missing bound descriptor',
  );
  let body;
  if (request.kind === 'main') {
    assert(request.boundDescriptor === p.boundPolicy, 'unsupported main bound descriptor');
    assert(
      Array.isArray(request.messages) && request.messages.length,
      'actual provider messages required',
    );
    for (const m of request.messages) {
      object(m, ['role', 'content']);
      assert(
        ['system', 'user', 'assistant', 'tool'].includes(m.role) && typeof m.content === 'string',
        'unsupported message',
      );
    }
    body = {
      model: model.requested,
      messages: request.messages,
      max_tokens: b.maxOutputTokens,
      stream: false,
      provider: { allow_fallbacks: false, require_parameters: true },
    };
  } else {
    assert(request.state && request.questions, 'actual classifier state/questions required');
    assert(request.boundDescriptor === 'decisions/v1', 'unsupported classifier bound');
    body = {
      model: model.requested,
      state: request.state,
      questions: request.questions,
      max_tokens: b.maxOutputTokens,
      provider: { allow_fallbacks: false, require_parameters: true },
    };
  }
  const serialized = canonical(body),
    bytes = Buffer.byteLength(serialized);
  assert(bytes <= b.maxRequestBytes, 'request byte bound exceeded');
  assert(b.maxOutputTokens > 0, 'output bound');
  // Versioned conservative policy: every serialized UTF-8 byte may consume one input token.
  // Provider fixed overhead is included explicitly rather than estimated from historical usage.
  const inputUpper = bytes + 1024,
    upperMicroUsd = Math.ceil(
      inputUpper * p.prices.inputMicroUsdPerToken +
        b.maxOutputTokens * p.prices.outputMicroUsdPerToken,
    );
  integer(upperMicroUsd, 1);
  assert(upperMicroUsd <= b.perCallMicroUsd, 'per-call exposure bound exceeded');
  return {
    url: ENDPOINTS[request.kind],
    serialized,
    upperMicroUsd,
    model,
    inputUpper,
    requestSha256: digest(serialized),
  };
}
export async function liveProvider({
  request,
  manifest,
  credential,
  budget,
  scope,
  alias,
  attemptId,
  runId,
  signal,
  onReceipt,
  authorize,
  fetcher = globalThis.fetch,
}) {
  assert(
    typeof credential === 'string' && credential.length >= 4 && !/[\r\n]/.test(credential),
    'explicit provider credential required',
  );
  const shaped = shapeRequest(request, manifest);
  assert(typeof authorize === 'function', 'per-attempt authorization required');
  authorize();
  budget.reserve({
    scope,
    alias,
    attemptId,
    runId,
    upperMicroUsd: shaped.upperMicroUsd,
    bounds: manifest.bounds,
    binding: {
      requestSha256: shaped.requestSha256,
      model: shaped.model.requested,
      profile: manifest.provenance.provider.revision,
    },
  });
  let received = false,
    transportEntered = false;
  const timeout = AbortSignal.timeout(manifest.bounds.maxDurationMs);
  const combined = signal ? AbortSignal.any([timeout, signal]) : timeout;
  try {
    assert(!combined.aborted, 'canceled before transport entry');
    budget.validate();
    authorize();
    budget.dispatched(scope, attemptId);
    // Recheck AFTER the durable dispatch-intent fsync, directly before entering the wire.
    authorize();
    transportEntered = true;
    // One fetch, redirects rejected. No SDK retries/fallback or application replay.
    const response = await fetcher(shaped.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
      body: shaped.serialized,
      redirect: 'error',
      signal: combined,
    });
    assert(response.url === '' || response.url === shaped.url, 'provider redirect');
    let total = 0;
    const buffers = [];
    assert(response.body, 'missing response body');
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        assert(total <= manifest.bounds.maxBodyBytes, 'provider response body exceeded bound');
        buffers.push(Buffer.from(value));
      }
    } finally {
      if (total > manifest.bounds.maxBodyBytes) await reader.cancel();
      reader.releaseLock();
    }
    const raw = Buffer.concat(buffers).toString('utf8');
    let result = null;
    try {
      result = parse(raw);
    } catch {
      /* Persist malformed bounded reply and unknown billing before validation. */
    }
    const usage = result?.usage;
    const cost = usage?.cost;
    const costKnown = typeof cost === 'number' && Number.isFinite(cost) && cost >= 0;
    const resolved = typeof result?.model === 'string' ? result.model : null;
    const costMicroUsd = costKnown ? Math.ceil(cost * 1e6) : null;
    const receipt = {
      costStatus: costKnown ? 'known' : 'unknown',
      costMicroUsd,
      billingComplete: costKnown,
      responseSha256: digest(raw),
      resolvedModel: resolved,
    };
    // Raw received evidence must be durable before interpretation/settlement. The callback writes/fsyncs the run receipt.
    await onReceipt({
      kind: 'provider_received',
      attemptId,
      requestSha256: shaped.requestSha256,
      raw,
      result,
      usage: usage ?? null,
      exactCostUsd: costKnown ? cost : null,
      ...receipt,
    });
    budget.received(scope, attemptId, receipt);
    received = true;
    if (costKnown) budget.settle(scope, attemptId);
    else {
      budget.unknown(scope, attemptId, 'missing_complete_bill');
      throw new Error('unknown provider billing');
    }
    assert(response.ok, 'provider HTTP failure; known charge retained');
    assert(result && resolved && shaped.model.resolved.includes(resolved), 'resolved model drift');
    const outputTokens = usage?.completion_tokens ?? usage?.output_tokens;
    assert(
      Number.isSafeInteger(outputTokens) &&
        outputTokens >= 0 &&
        outputTokens <= manifest.bounds.maxOutputTokens,
      'invalid output usage bound',
    );
    const inputTokens = usage?.prompt_tokens ?? usage?.input_tokens;
    assert(
      Number.isSafeInteger(inputTokens) && inputTokens >= 0 && inputTokens <= shaped.inputUpper,
      'invalid input usage bound',
    );
    if (request.kind === 'main')
      assert(
        typeof result.choices?.[0]?.message?.content === 'string',
        'malformed provider main result',
      );
    else assert(result.answers && typeof result.answers === 'object', 'malformed decisions result');
    return {
      result,
      requestedModel: shaped.model.requested,
      resolvedModel: resolved,
      usage: { inputTokens, outputTokens, costUsd: cost, costStatus: 'known' },
      upperMicroUsd: shaped.upperMicroUsd,
    };
  } catch (error) {
    let state = budget.status(scope).attempts.get(attemptId)?.state;
    if (!transportEntered && ['reserved', 'dispatched'].includes(state)) {
      budget.notDispatched(scope, attemptId, { transportEntered: false, reason: error.message });
      state = 'not_dispatched';
    }
    if (['reserved', 'dispatched', 'received'].includes(state))
      budget.unknown(
        scope,
        attemptId,
        received
          ? 'received_unsettled'
          : combined.aborted
            ? 'canceled_or_timeout'
            : 'transport_or_partial_body',
      );
    await onReceipt({
      kind: 'provider_terminal',
      attemptId,
      status:
        state === 'not_dispatched'
          ? 'not_dispatched'
          : state === 'settled'
            ? 'known_failure'
            : 'indeterminate',
      reason: error.message,
    });
    throw error;
  }
}
export async function fixtureProvider({ request, episode, index = 0 }) {
  const sequence = episode.providerFixture?.[request.kind];
  if (sequence) assert(index < sequence.length, 'provider fixture sequence exhausted');
  const entry = sequence?.[index];
  const result =
    entry ??
    (request.kind === 'classifier'
      ? {
          model: request.model,
          answers: {
            mode: { choice: 'chat', probabilities: { chat: 1 } },
            pages: { noul: 0 },
            forms: { noul: 0 },
            data: { noul: 0 },
            brain: { noul: 0 },
            changelog: { noul: 0 },
            sandbox: { noul: 0 },
          },
          usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
        }
      : {
          model: request.model,
          choices: [
            {
              message: {
                role: 'assistant',
                content: episode.terminal.expectedText ?? 'synthetic fixture response',
              },
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0 },
        });
  return {
    result,
    requestedModel: request.model,
    resolvedModel: request.model,
    usage: { inputTokens: 1, outputTokens: 1, costUsd: 0, costStatus: 'known' },
    upperMicroUsd: 0,
  };
}
