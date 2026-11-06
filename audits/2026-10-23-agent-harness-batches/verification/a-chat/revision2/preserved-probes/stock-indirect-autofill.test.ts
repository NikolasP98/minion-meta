// @vitest-environment happy-dom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,waitFor} from '@testing-library/svelte';
import {flushSync,tick,type ComponentProps} from 'svelte';
import StockEntry from '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat/src/routes/(app)/stock/entries/new/+page.svelte';
import {page} from '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat/tests/fixtures/pending-submission/page.svelte.ts';
import {executeTool,hasTool} from '$lib/assistant/model-context';
import {createAcceptedSurface,registerSubmittedRun,isRunCurrent,resetAcceptedRuns} from '$lib/assistant/accepted-runs';
import {createPendingSubmissions} from '$lib/assistant/pending-submission';
import {getPageContextRevision} from '$lib/assistant/page-context';
import {bindEffectLease} from '$lib/assistant/effect-lease';
import {decisionEvents} from '$lib/assistant/decision-events';
vi.mock('@sentry/sveltekit',()=>({captureException:vi.fn(),captureMessage:vi.fn()}));
vi.mock('$app/state',async()=>import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat/tests/fixtures/pending-submission/page.svelte.ts'));
vi.mock('$lib/navigation',()=>({goto:vi.fn(async()=>{})}));
vi.mock('$lib/access/can.svelte',()=>({canAct:()=>true,canViewPath:()=>true}));
const data={items:[{id:'item-a',code:'STOCK-A',name:'Probe stock item',uom:'unit',defaultSupplierPartyId:'supplier-a'}],warehouses:[{id:'warehouse-a',name:'Probe warehouse',isDefault:true}],bins:[],purchases:[],fx:{currency:'PEN',base:'USD',quote:'PEN',rate:3.8}} as unknown as ComponentProps<typeof StockEntry>['data'];
beforeEach(()=>{
 flushSync(()=>{page.url=new URL('http://localhost/stock/entries/new?type=receipt');page.data.user.id='actor-a';page.data.activeOrgId='org-a';});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
 if(!Element.prototype.animate)Element.prototype.animate=(()=>({cancel(){},finished:Promise.resolve()})) as unknown as typeof Element.prototype.animate;
 Element.prototype.scrollIntoView=()=>{};
});
afterEach(()=>{cleanup();resetAcceptedRuns();decisionEvents.setOwner({actorId:'',orgId:''});vi.unstubAllGlobals();vi.restoreAllMocks();});
it.each(['current','stop','expiry'] as const)('actual stock item supplier autofill honors %s accepted lease',async(mode)=>{
 let release!: (response:Response)=>void;
 const fetcher=vi.fn((url:RequestInfo|URL)=>String(url)==='/api/crm/parties/supplier-a'?new Promise<Response>(resolve=>release=resolve):Promise.resolve(Response.json([])));
 vi.stubGlobal('fetch',fetcher);
 const view=render(StockEntry,{data});await waitFor(()=>expect(hasTool('fill_stock_entry')).toBe(true));
 const scope={actorId:'actor-a',orgId:'org-a',agentId:'agent-a',sessionKey:'agent:agent-a:main'};
 const surface=createAcceptedSurface({readScope:()=>scope,followUp:async()=>true});
 const pending=createPendingSubmissions();pending.setScope(scope);const turn=pending.begin(0,getPageContextRevision());
 const binding=registerSubmittedRun(turn.submissionId,{surface,pending:turn})!;
 const lease=bindEffectLease({signal:binding.controller.signal},()=>isRunCurrent(binding));
 try{
   const running=executeTool('fill_stock_entry',{item:'Probe stock item',qty:1,rate:2},{signal:binding.controller.signal,lease});
   await waitFor(()=>expect(release).toBeDefined());
   if(mode==='stop')surface.stop();
   if(mode==='expiry')vi.spyOn(Date,'now').mockReturnValue(binding.expiresAt+1);
   release(Response.json({id:'supplier-a',name:'LATE SUPPLIER SHOULD NOT LAND',type:'company',docNumber:'20123456789'}));
   await running;for(let i=0;i<12;i++)await Promise.resolve();await tick();
   const selected=view.queryByDisplayValue('LATE SUPPLIER SHOULD NOT LAND');
   if(mode==='current')expect(selected).not.toBeNull();else expect(selected).toBeNull();
   expect(fetcher.mock.calls.filter(([url])=>String(url)==='/api/crm/parties/supplier-a')).toHaveLength(1);
 }finally{surface.dispose();}
});
