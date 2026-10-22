import fs from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
vi.mock('@minion-stack/drone', async (importOriginal) => ({...await importOriginal<typeof import('@minion-stack/drone')>(), runDrone:vi.fn()}));
import { runDrone } from '@minion-stack/drone';
import { classifyMessage } from './src/classifier.js';
const outputDir='/home/nikolas/Documents/CODE/MINION/audits/2026-10-22-agent-use-transcripts/revalidation/filter';
describe('serialized request-component measurement, no network',()=>{
 it('captures actual classifier definition and caller payload',async()=>{
  vi.mocked(runDrone).mockResolvedValue({ok:true,data:{is_complaint:false,severity:'low',category:'other',summary:''},usage:{},durationMs:0,resolvedModel:{provider:'anthropic',model:'claude-haiku-4-5'}});
  const content='Hola, ¿a qué hora abren mañana?';
  await classifyMessage([{role:'user',content,ts:1}],{resolveApiKey:async()=>({apiKey:'fake',source:'offline'}),resolveSkillsPrompt:()=>''},'claude-haiku-4-5');
  const [drone,input]=vi.mocked(runDrone).mock.calls[0];
  const actualComponents={systemPrompt:drone.definition.systemPrompt,output:drone.definition.output,prompt:input.prompt,maxTokens:input.maxTokens};
  const illustrativeGate={model:'~typesafe/jev-latest',state:input.prompt,questions:{complaint:{type:'noul',question:'Does this single customer message express a complaint or grievance? Greetings, questions about hours/prices, requests for information, agreement words and generic chitchat do not count.'}}};
  const bytes=(s:unknown)=>Buffer.byteLength(typeof s==='string'?s:JSON.stringify(s),'utf8');
  const measurements={fixture:content,bytes:{systemPrompt:bytes(drone.definition.systemPrompt),outputSchema:bytes(drone.definition.output),userPrompt:bytes(input.prompt),actualComponentsJson:bytes(actualComponents),illustrativeGateJson:bytes(illustrativeGate)},actualComponents,illustrativeGate,boundary:'Actual runDrone arguments, not provider wire payload or tokenizer counts. Illustrative gate has not been validated against provider API. No live inference, billed tokens, costs, cached tokens, traffic or quality measured.'};
  fs.writeFileSync(outputDir+'/request-sizes.json',JSON.stringify(measurements,null,2)+'\n');
  expect(input.maxTokens).toBe(256);
  expect(String(drone.definition.systemPrompt)).toContain('Otherwise an empty string');
 });
});
