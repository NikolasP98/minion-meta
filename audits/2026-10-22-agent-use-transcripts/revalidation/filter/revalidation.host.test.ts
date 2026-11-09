import { describe,it,expect,vi } from 'vitest';
vi.mock('../../src/agents/models/model-auth.js',()=>({resolveApiKeyForProvider:vi.fn(async()=>({apiKey:'fake'})),requireApiKey:vi.fn(()=> 'fake')}));
vi.mock('../../src/agents/skills/workspace.js',()=>({buildWorkspaceSkillSnapshot:vi.fn(()=>({prompt:''}))}));
vi.mock('../../src/events/emitter.js',()=>({emitEvent:vi.fn()}));
import { createGatewayDroneHost } from '../../src/drones/host.js';
import { emitEvent } from '../../src/events/emitter.js';
describe('shared watcher host accounting',()=>{
 it('labels earlier concurrent run with most recently resolved model',async()=>{
  const host=createGatewayDroneHost({config:{}});
  await host.resolveApiKey({provider:'anthropic',model:'model-a'});
  await host.resolveApiKey({provider:'anthropic',model:'model-b'});
  host.emitEvent?.({event:'agent.run.end',droneId:'alert-classifier',correlationId:'run-a',durationMs:1,usage:{inputTokens:10,outputTokens:2}});
  const usage=vi.mocked(emitEvent).mock.calls.map(c=>c[0]).find(e=>e.event==='agent.llm.usage');
  expect(usage?.metadata?.model).toBe('model-b');
  expect(usage?.correlationId).toBe('run-a');
 });
});
