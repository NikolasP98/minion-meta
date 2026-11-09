// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';

it('actual fixture provider requests preserve prior conversation and expose compaction', async () => {
  vi.stubGlobal('__evalBootstrap', {
    episodeId: 'independent-history', arm: 'full', seed: 7, persona: 'owner',
    initialState: 'empty', locale: 'en',
    model: {requestedModel:'fixture/main',boundDescriptor:'utf8-bytes-v1'},
  });
  const {installEval} = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat/tests/fixtures/critical-journeys/eval-transport.ts');
  const {fixtureBridge, FixtureSocket} = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat/tests/fixtures/critical-journeys/gateway-transport.ts');
  const previousFetch=globalThis.fetch, previousSocket=globalThis.WebSocket;
  installEval();
  const socket = new FixtureSocket('ws://critical.invalid');
  const bridge = (window as unknown as {__eval:{takeProviders:()=>Array<{messages:Array<{role:string;content:string}>}>}}).__eval;
  try {
    fixtureBridge.record({message:'My favorite color is blue.'},
      {role:'assistant',content:[{type:'text',text:'I will remember blue.'}]});
    fixtureBridge.main!({runId:crypto.randomUUID(),sessionKey:'agent:fixture-agent:main',message:'Which color did I name?'},socket,()=>{},()=>{});
    const second=bridge.takeProviders()[0];
    console.log('ACTUAL_SECOND_REQUEST',JSON.stringify(second));
    expect.soft(second.messages).toEqual([
      {role:'user',content:'My favorite color is blue.'},
      {role:'assistant',content:'I will remember blue.'},
      {role:'user',content:'Which color did I name?'},
    ]);
    fixtureBridge.record({message:'Which color did I name?'},
      {role:'assistant',content:[{type:'text',text:'Blue.'}]});
    fixtureBridge.compact();
    fixtureBridge.main!({runId:crypto.randomUUID(),sessionKey:'agent:fixture-agent:main',message:'Continue after compaction.'},socket,()=>{},()=>{});
    const after=bridge.takeProviders()[0];
    console.log('ACTUAL_COMPACTED_REQUEST',JSON.stringify(after));
    expect.soft(after.messages[0]).toEqual({role:'system',content:'Disposable server history compaction fixture.'});
    expect.soft(after.messages.at(-1)).toEqual({role:'user',content:'Continue after compaction.'});
  } finally {
    socket.close();globalThis.fetch=previousFetch;Object.defineProperty(globalThis,'WebSocket',{configurable:true,value:previousSocket});vi.unstubAllGlobals();
  }
});
