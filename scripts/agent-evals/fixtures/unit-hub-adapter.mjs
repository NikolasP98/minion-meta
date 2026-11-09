// Synthetic protocol unit fixture ONLY. This is not the A adapter/integration qualification.
import fs from 'node:fs';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
const h = (v) => crypto.createHash('sha256').update(v).digest('hex');
let reset,
  pending,
  answer = '';
const send = (id, payload) =>
  console.log(JSON.stringify({ version: 1, id, type: 'result', payload }));
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const m = JSON.parse(line),
    p = m.payload;
  if (m.type === 'hello')
    send(m.id, {
      protocol: 'minion-agent-eval-fixture/v1',
      sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      lockHash: h(fs.readFileSync('bun.lock')),
      adapterHash: h(fs.readFileSync(import.meta.filename)),
      buildHash: 'b'.repeat(64),
      sourceHash: 'a'.repeat(64),
      disposable: true,
      features: ['unit_only'],
      evidenceRoot: '/synthetic-unit-only',
    });
  else if (m.type === 'reset') {
    reset = p;
    pending = null;
    answer = '';
    send(m.id, {
      initialStateHash: h(
        JSON.stringify({ fixture: p.initialState, seed: p.seed, persona: p.persona }),
      ),
      episodeId: p.episodeId,
      arm: p.arm,
    });
  } else if (m.type === 'turn') {
    send(m.id, { submittedIntent: true });
    pending = crypto.randomUUID();
    console.log(
      JSON.stringify({
        version: 1,
        id: pending,
        type: 'provider_request',
        payload: {
          requestId: pending,
          kind: 'main',
          model: reset.model.requestedModel,
          boundDescriptor: reset.model.boundDescriptor,
          messages: [{ role: 'user', content: p.text }],
        },
      }),
    );
  } else if (m.type === 'provider_result') {
    answer = p.result?.choices?.[0]?.message?.content ?? p.result?.text ?? '';
    pending = null;
    send(m.id, { received: true });
  } else if (m.type === 'collect')
    send(m.id, {
      episodeId: reset.episodeId,
      arm: reset.arm,
      observations: [],
      receipts: [],
      answerTexts: [answer],
      finalStateHash: h('state'),
      network: { externalRequests: 0, boundary: 'synthetic-unit-only' },
      identity: { disposable: true },
      inference: [],
      pendingProviders: pending ? 1 : 0,
      pendingReloads: 0,
      incomplete: !!pending,
    });
  else if (m.type === 'close') {
    send(m.id, { closed: true });
    process.exit(0);
  } else send(m.id, {});
});
