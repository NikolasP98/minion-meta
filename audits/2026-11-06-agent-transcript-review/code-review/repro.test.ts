import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Public-boundary probes against frozen canonical source. These tests reproduce
// current defects; passing them does not mean the product has been corrected.
// TODO(handoff): Promote corrected expectations into product regression tests
// through proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md.
const boundary=vi.hoisted(()=>({
  auth:vi.fn(),createBooking:vi.fn(),listBookings:vi.fn(),llm:vi.fn(),
}));
vi.mock('./gateway/src/infra/posthog.js',()=>({trackEvent:vi.fn()}));
vi.mock('./gateway/src/infra/sentry.js',()=>({addSentryBreadcrumb:vi.fn()}));
vi.mock('./gateway/src/infra/diagnostic-events.js',()=>({emitDiagnosticEvent:vi.fn()}));
vi.mock('./gateway/src/logging/reliability.js',()=>({trackSkillExecution:vi.fn()}));
vi.mock('./gateway/src/logging/subsystem.js',()=>({createSubsystemLogger:()=>({info:vi.fn(),debug:vi.fn(),warn:vi.fn(),error:vi.fn()})}));
vi.mock('./gateway/src/agents/identity/workspace.js',()=>({
  DEFAULT_FOCUS_FILENAME:'FOCUS.md',DEFAULT_HEARTBEAT_FILENAME:'HEARTBEAT.md',
  DEFAULT_TOOLS_FILENAME:'TOOLS.md',DEFAULT_WORKSHOP_FILENAME:'WORKSHOP.md',
  filterBootstrapFilesForSession:(files:unknown[])=>files,
  isWorkspaceOnboardingCompleted:async()=>false,
  loadWorkspaceBootstrapFiles:async()=>[{name:'BOOTSTRAP.md',filePath:'/synthetic/BOOTSTRAP.md',content:'Choose a persona.',missing:false}],
}));
vi.mock('./gateway/src/agents/pi-embedded/pi-embedded-helpers.js',()=>({
  buildBootstrapContextFiles:()=>[],resolveBootstrapMaxChars:()=>1000,resolveBootstrapTotalMaxChars:()=>1000,
}));
vi.mock('./gateway/src/agents/bootstrap/bootstrap-hooks.js',()=>({applyBootstrapHookOverrides:async({files}:{files:unknown[]})=>files}));
vi.mock('./gateway/src/agents/pi-embedded-runner/tool-result-truncation.js',()=>({HARD_MAX_TOOL_RESULT_CHARS:400000}));
vi.mock('./hub/src/routes/api/gateway/_shared/action-auth',()=>({requireAssistantCapability:boundary.auth}));
vi.mock('$lib/permissions',()=>({SENSITIVE_FIELD_LEVEL:2}));
vi.mock('./hub/src/server/services/scheduling-bookings.service',()=>({
  createBooking:boundary.createBooking,listBookings:boundary.listBookings,
  SlotUnavailableError:class SlotUnavailableError extends Error{},
}));

import { maybeExtractMemories,getOrCreateCursor,clearSessionCursor } from './gateway/src/memory/extract-memories-runner.js';
import { createDefaultConfig,shouldExtract,createCursor } from './gateway/src/memory/extract-memories.js';
import { resolveBootstrapContextForRun } from './gateway/src/agents/bootstrap/bootstrap-files.js';
import { IDENTITY_SECTIONS } from './gateway/src/agents/sections/identity.js';
import type { SectionRenderContext } from './gateway/src/agents/sections/types.js';
import { sanitizeOutboundText } from './gateway/src/channels/outbound-sanitizer.js';
import { installSessionToolResultGuard } from './gateway/src/agents/sessions/session-tool-result-guard.js';
import { POST as bookingPreview } from './hub/src/routes/api/gateway/actions/booking-create/+server';
import { GET as bookingQuery } from './hub/src/routes/api/gateway/query/bookings/+server';
import { parsePeriod } from './hub/src/lib/finance/period';
import { wrapToolWithTracking } from './gateway/src/logging/tool-tracking.js';
import { hubGet } from './gateway/src/agents/tools/hub/hub-common.js';
import { setHubRest } from './gateway/src/gateway/hub-rest-registry.js';

beforeEach(()=>{
  vi.clearAllMocks();
  vi.stubGlobal('fetch',vi.fn(()=>{throw Error('External network forbidden in review probes')}));
  boundary.auth.mockResolvedValue({ctx:{tenantId:'synthetic-org'},capabilities:{fieldLevel:()=>100}});
  boundary.llm.mockResolvedValue('[]');
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();setHubRest(null);for(const id of ['probe-memory','probe-memory-control','probe-memory-overlap'])clearSessionCursor(id)});

describe('C01 durable extraction is unreachable from the current attempt caller',()=>{
 it('reproduces ten settled turns with zero extraction calls',async()=>{
  const config=createDefaultConfig();
  expect(config.minNewMessagesForExtraction).toBeGreaterThan(2);
  for(let n=0;n<10;n++){
   const recentMessages=[{role:'user',content:`Remember preference ${n}.`},{role:'assistant',content:'Understood.'}];
   maybeExtractMemories({sessionId:'probe-memory',lastTurnHadToolCalls:false,newMessageCount:recentMessages.length,userWroteMemoryThisTurn:false,existingMemory:'',recentMessages,llmCall:boundary.llm});
  }
  await new Promise<void>(resolve=>setImmediate(resolve));
  expect(boundary.llm).not.toHaveBeenCalled();
  expect(getOrCreateCursor('probe-memory').extractionCount).toBe(0);
  const caller=fs.readFileSync(fileURLToPath(new URL('./gateway/src/agents/pi-embedded-runner/run/attempt.ts',import.meta.url)),'utf8');
  expect(caller).toContain('newMessageCount: recentMsgs.length');
  expect(caller).toMatch(/const recentMsgs = lastText\s*\?\s*\[\s*\{ role: "user"[\s\S]*?\{ role: "assistant"[\s\S]*?\]\s*:\s*\[\]/);
 });
 it('positive control: four supplied messages open the real runner gate',async()=>{
  const recentMessages=[{role:'user',content:'A'},{role:'assistant',content:'B'},{role:'user',content:'C'},{role:'assistant',content:'D'}];
  expect(shouldExtract(createDefaultConfig(),createCursor('control'),false,4,false)).toBe(true);
  maybeExtractMemories({sessionId:'probe-memory-control',lastTurnHadToolCalls:false,newMessageCount:4,userWroteMemoryThisTurn:false,existingMemory:'',recentMessages,llmCall:boundary.llm});
  await new Promise<void>(resolve=>setImmediate(resolve));
  expect(boundary.llm).toHaveBeenCalledTimes(1);
 });
});

describe('C08 extraction admission does not reserve the per-session budget',()=>{
 it('admits ten overlapping extractions despite a five-extraction budget, then records only one',async()=>{
  let release:((value:string)=>void)|undefined;
  const pending=new Promise<string>(resolve=>{release=resolve});
  const llm=vi.fn(()=>pending);
  const config=createDefaultConfig();
  expect(config.maxExtractionsPerSession).toBe(5);
  for(let n=0;n<10;n++){
   maybeExtractMemories({sessionId:'probe-memory-overlap',lastTurnHadToolCalls:false,newMessageCount:4,userWroteMemoryThisTurn:false,existingMemory:'',recentMessages:[{role:'user',content:`Fixture ${n}`}],llmCall:llm});
  }
  await new Promise<void>(resolve=>setImmediate(resolve));
  expect(llm).toHaveBeenCalledTimes(10);
  expect(getOrCreateCursor('probe-memory-overlap').extractionCount).toBe(0);
  if(!release)throw Error('Missing synthetic resolver');
  release('[]');
  await new Promise<void>(resolve=>setImmediate(resolve));
  expect(getOrCreateCursor('probe-memory-overlap').extractionCount).toBe(1);
 });
});

describe('C02 onboarding instructions contradict ordinary-task guidance',()=>{
 it('injects the blocking gate for an unconfigured personal agent',async()=>{
  delete process.env.OPENCLAW_SKIP_ONBOARDING_GATE;
  const out=await resolveBootstrapContextForRun({workspaceDir:'/synthetic',agentId:'personal-fixture'});
  expect(out.contextFiles[0].path).toBe('ONBOARDING_REQUIRED');
  expect(out.contextFiles[0].content).toContain('before doing anything else');
  expect(out.contextFiles[0].content).toContain('Do NOT proceed with other tasks');
  const section=IDENTITY_SECTIONS.find(x=>x.id==='personality');
  if(!section)throw Error('Missing real personality section');
  const text=section.render({params:{runtimeInfo:{agentId:'personal-fixture'},senderName:'Fixture'}} as unknown as SectionRenderContext).join('\n');
  expect(text).toContain('process their message normally');
  expect(text).toContain('Do not ask about personality again');
 });
});

describe('C03 advertised validated booking preview skips semantic validation',()=>{
 it('returns 200 for nonexistent service/customer/staff without querying the booking service',async()=>{
  const request=new Request('http://localhost/actions/booking-create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:false,eventTypeId:'nonexistent-service',crmContactId:'nonexistent-customer',resourceId:'nonexistent-staff',start:'2026-10-26T10:00:00-05:00'})});
  const response=await bookingPreview({locals:{},url:new URL(request.url),request} as Parameters<typeof bookingPreview>[0]);
  expect(response.status).toBe(200);
  const body=await response.json();
  expect(body.preview.eventTypeId).toBe('nonexistent-service');
  expect(body.preview.attendeeName).toBeNull();
  expect(body.preview).not.toHaveProperty('crmContactId');
  expect(body.preview).not.toHaveProperty('resourceId');
  expect(boundary.auth).toHaveBeenCalledTimes(1);
  expect(boundary.createBooking).not.toHaveBeenCalled();
 });
});

describe('C04 booking reads expose neither completeness nor pagination',()=>{
 it('returns an apparently complete bare array when the source reaches its default cap',async()=>{
  boundary.listBookings.mockResolvedValue(Array.from({length:500},(_,n)=>({id:`fixture-${n}`,startTime:'2026-10-26T15:00:00Z'})));
  const response=await bookingQuery({locals:{},url:new URL('http://localhost/query/bookings')} as Parameters<typeof bookingQuery>[0]);
  const body=await response.json();
  expect(body.bookings).toHaveLength(500);
  expect(Object.keys(body)).toEqual(['bookings']);
  expect(boundary.listBookings.mock.calls[0][1]).not.toHaveProperty('limit');
  const service=fs.readFileSync(fileURLToPath(new URL('./hub/src/server/services/scheduling-bookings.service.ts',import.meta.url)),'utf8');
  expect(service).toContain('.limit(Math.min(opts.limit ?? 500, 2000))');
 });
});

describe('C05 invalid finance dates silently become a different time period',()=>{
 it('replaces an invalid explicit range with twelve months rather than rejecting it',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-06T06:00:00Z'));
  const period=parsePeriod(new URL('http://localhost/query/finance?from=not-a-date&to=also-not-a-date'));
  expect(period).toEqual({from:'2025-11-06T06:00:00.000Z',to:'2026-11-06T06:00:00.000Z',bucket:'month'});
 });
 it('positive control: explicitly requested all-time is supported by Hub but not exposed by the agent finance tool',()=>{
  expect(parsePeriod(new URL('http://localhost/query/finance?range=all'))).toEqual({from:null,to:null,bucket:'month'});
  const tool=fs.readFileSync(fileURLToPath(new URL('./gateway/src/agents/tools/hub/finance-query-tool.ts',import.meta.url)),'utf8');
  expect(tool).not.toMatch(/range:\s*/);
 });
});

describe('C06 outbound guard misses the exact protocol family in the chats',()=>{
 it('passes raw DSML through unchanged',()=>{
  const raw='<｜DSML｜tool_calls>\n<｜DSML｜invoke name="sdk_inspect">\n<｜DSML｜parameter name="query" string="true">cost</｜DSML｜parameter>\n</｜DSML｜invoke>\n</｜DSML｜tool_calls>';
  expect(sanitizeOutboundText(raw)).toEqual({text:raw,redactions:0,strippedToolSyntax:false});
 });
 it('positive control: existing plain tool-call tags are removed',()=>{
  expect(sanitizeOutboundText('<tool_calls>internal</tool_calls>')).toEqual({text:'',redactions:0,strippedToolSyntax:true});
 });
});

describe('C07 named secret fields and fine-grained PATs are not redacted',()=>{
 it('default transcript guard persists a synthetic secret-bearing tool result unchanged',()=>{
  const stored:unknown[]=[];
  const manager={appendMessage:(message:unknown)=>{stored.push(message);return 'synthetic-entry'}} as unknown as Parameters<typeof installSessionToolResultGuard>[0];
  installSessionToolResultGuard(manager);
  const text='MINION_SECRETS_KEY='+ 'ab'.repeat(32);
  manager.appendMessage({role:'toolResult',toolCallId:'fixture-call',toolName:'exec',isError:false,content:[{type:'text',text}],timestamp:1} as Parameters<typeof manager.appendMessage>[0]);
  expect(JSON.stringify(stored)).toContain(text);
 });
 it('retains synthetic secret values in the same named-field shape seen in the chat',()=>{
  const raw='MINION_SECRETS_KEY='+ 'ab'.repeat(32)+'\nMINION_AGENT_BOT_PAT=github_pat_'+ 'X'.repeat(82);
  expect(sanitizeOutboundText(raw)).toEqual({text:raw,redactions:0,strippedToolSyntax:false});
 });
 it('positive control: classic synthetic GitHub PATs are redacted',()=>{
  expect(sanitizeOutboundText('ghp_'+ 'X'.repeat(36)).redactions).toBe(1);
 });
});

describe('Cleared against current canonical source',()=>{
 it('current tracking wrapper marks a fulfilled semantic failure as an error',async()=>{
  const tool=wrapToolWithTracking({name:'fixture',label:'Fixture',description:'Synthetic fixture',parameters:{type:'object',properties:{}},execute:async()=>({details:{error:'denied',status:403},content:[{type:'text',text:'denied'}]})} as Parameters<typeof wrapToolWithTracking>[0],'fixture');
  const result=await tool.execute('fixture-call',{});
  expect(result.isError).toBe(true);
 });
 it('current Hub helper retains permanent denial metadata and gateway identity',async()=>{
  setHubRest({hubUrl:'https://fixture.invalid',serverToken:'synthetic-token',serverId:'gateway-fixture'});
  const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'denied',code:'ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED',retryable:false}),{status:403}));
  vi.stubGlobal('fetch',fetchMock);
  const result=await hubGet('query/bookings','personal-fixture');
  expect(result).toMatchObject({error:'denied',code:'ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED',status:403,retryable:false});
  expect(fetchMock.mock.calls[0][1].headers['x-minion-server-id']).toBe('gateway-fixture');
 });
});
