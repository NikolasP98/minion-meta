import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {eq} from '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/node_modules/drizzle-orm/index.js';
import {createServer,type Server} from 'node:http';
import {openPulsePostgres} from '$server/test-utils/pulse-postgres';
import {seedPulseAuthority,PULSE_FIXTURE_ORG as org,PULSE_FIXTURE_PROFILE as profile} from '$server/test-utils/pulse-fixtures';
import {digestFixturePolicy,digestFixtureSnapshot,digestFixtureResponse} from '$server/test-utils/pulse-digest-fixtures';
const boundary=vi.hoisted(()=>({pool:vi.fn()}));
vi.mock('$server/db/pg-pool',()=>({getPgClient:boundary.pool,getRlsPgClient:boundary.pool,getCriticalPgClient:boundary.pool,resetAllPgPools:vi.fn()}));
import {queueDigestSnapshotTx,admitDigestAttemptTx,retainDigestReceipt} from '$server/services/pulse-digest.store';
import {pulseDigestRuns} from '$server/db/pg-schema/pulse-digest';
import {runSelectedTick} from '$server/services/bg-runtime';
import '$server/services/pulse-digest.worker';
import {parseDigestReceipt} from '$server/services/pulse-digest.reasoning';
import {collectDigestSources} from '$server/services/pulse-digest.sources';
let f:Awaited<ReturnType<typeof openPulsePostgres>>,policy:ReturnType<typeof digestFixturePolicy>,snapshot:Awaited<ReturnType<typeof digestFixtureSnapshot>>,server:Server,calls:number,origin:string;
const originalFetch=globalThis.fetch;
beforeEach(async()=>{
 f=await openPulsePostgres();boundary.pool.mockReturnValue(f.pg);await seedPulseAuthority(f,'wss://fixture.invalid');delete process.env.MINION_PULSE_WORKER_CONFIG;
 policy=digestFixturePolicy();process.env.MINION_PULSE_DIGEST_SCOPE=JSON.stringify({tenantId:org,ownerProfileId:profile});process.env.MINION_PULSE_DIGEST_POLICY=JSON.stringify(policy);process.env.OPENROUTER_API_KEY='local-fixture-no-paid-access';snapshot=await digestFixtureSnapshot(policy);calls=0;
 server=createServer(async(req,res)=>{for await(const _chunk of req){}calls++;res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(digestFixtureResponse(snapshot)));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw new Error('fixture_bind');origin=`http://127.0.0.1:${address.port}`;
 vi.spyOn(globalThis,'fetch').mockImplementation((input,init)=>{const u=new URL(String(input));if(u.origin!=='https://openrouter.ai'||u.pathname!=='/api/v1/chat/completions')throw new Error('independent_external_denied');return originalFetch(origin+u.pathname,init);});
});
afterEach(async()=>{vi.restoreAllMocks();server?.closeAllConnections();if(server)await new Promise<void>(r=>server.close(()=>r()));delete process.env.MINION_PULSE_DIGEST_POLICY;delete process.env.MINION_PULSE_DIGEST_SCOPE;delete process.env.OPENROUTER_API_KEY;await f?.close();});
const tick=()=>runSelectedTick({tenantId:org,ownerProfileId:profile,types:['pulse_digest'],budgetMs:45000});

for(const timing of ['before-cleanup','after-cleanup'] as const)it(`independent expired receipt ${timing} keeps one minimal bill and permanent replay fence without raw rehydration`,async()=>{
 const queued=await f.db.transaction(tx=>queueDigestSnapshotTx(tx,policy,snapshot));if(!queued)throw Error('queue');
 const [run]=await f.db.select().from(pulseDigestRuns).where(eq(pulseDigestRuns.id,queued.runId));const admitted=await f.db.transaction(tx=>admitDigestAttemptTx(tx,policy,run,1));if(!admitted)throw Error('admission');
 await f.pg.unsafe('alter table pulse_digest_runs disable trigger pulse_digest_guard');
 try{await f.pg`update pulse_digest_runs set created_at=now()-interval '31 days' where id=${queued.runId}`;}finally{await f.pg.unsafe('alter table pulse_digest_runs enable trigger pulse_digest_guard');}
 delete process.env.MINION_PULSE_DIGEST_POLICY;
 const {runPulseTick}=await import('$server/services/pulse-tick');if(timing==='after-cleanup')await runPulseTick();
 const receipt=parseDigestReceipt(JSON.stringify(digestFixtureResponse(snapshot)),200);await retainDigestReceipt(f.db,admitted,receipt);
 const [immediate]=await f.pg`select state,raw_response,safe_reason,receipt_hash,cost_micro_usd from pulse_digest_runs where id=${queued.runId}`;
 expect(immediate.state).toBe('indeterminate');expect(immediate.raw_response).toBeNull();expect(immediate.safe_reason).toBeTruthy();expect(immediate.receipt_hash).toBe(receipt.receiptHash);expect(Number(immediate.cost_micro_usd)).toBe(100);
 await runPulseTick();await retainDigestReceipt(f.db,admitted,receipt);await runPulseTick();
 const [stored]=await f.pg`select state,evidence,snapshot,raw_response,redacted_at,attempt_id,receipt_hash,cost_micro_usd,source_snapshot_hash from pulse_digest_runs where id=${queued.runId}`;
 const [ns]=await f.pg`select active_run_id,active_attempt_id,admission_generation,attempted_calls,reserved_micro_usd,unknown_exposure_fence from pulse_digest_admission`;
 expect(stored).toMatchObject({state:'indeterminate',evidence:null,snapshot:null,raw_response:null,attempt_id:admitted.attemptId,receipt_hash:receipt.receiptHash,source_snapshot_hash:snapshot.hash});expect(stored.redacted_at).toBeTruthy();expect(Number(stored.cost_micro_usd)).toBe(100);
 expect(ns.active_run_id).toBe(queued.runId);expect(ns.active_attempt_id).toBe(admitted.attemptId);expect(ns.attempted_calls).toBe(1);expect(Number(ns.reserved_micro_usd)).toBe(1000);expect(ns.unknown_exposure_fence).toBe(true);expect(calls).toBe(0);expect(await f.pg`select id from pulse_proposals`).toHaveLength(0);expect((await f.pg`select revision from pulse_digest_sources`)[0].revision).toBe(0);
 const fs=await import('node:fs');fs.appendFileSync('/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/e-digest/correction-e02/late-receipt-observations.jsonl',JSON.stringify({timing,state:stored.state,rawResponse:stored.raw_response,redacted:!!stored.redacted_at,receiptHash:stored.receipt_hash,costMicroUsd:Number(stored.cost_micro_usd),namespace:ns,providerCalls:calls})+'\n');
});
it('retained-scope cleanup cannot give a revoked owner received publication authority',async()=>{
 const queued=await f.db.transaction(tx=>queueDigestSnapshotTx(tx,policy,snapshot));if(!queued)throw Error('queue');const [run]=await f.db.select().from(pulseDigestRuns).where(eq(pulseDigestRuns.id,queued.runId));const admitted=await f.db.transaction(tx=>admitDigestAttemptTx(tx,policy,run,1));if(!admitted)throw Error('admission');const receipt=parseDigestReceipt(JSON.stringify(digestFixtureResponse(snapshot)),200);await retainDigestReceipt(f.db,admitted,receipt);await f.pg`delete from organization_members where profile_id=${profile}`;const {runPulseTick}=await import('$server/services/pulse-tick');await runPulseTick();const [stored]=await f.pg`select state,cost_micro_usd,receipt_hash from pulse_digest_runs where id=${queued.runId}`;expect(stored.state).toBe('indeterminate');expect(Number(stored.cost_micro_usd)).toBe(100);expect(stored.receipt_hash).toBe(receipt.receiptHash);expect(calls).toBe(0);expect(await f.pg`select id from pulse_proposals`).toHaveLength(0);expect((await f.pg`select revision from pulse_digest_sources`)[0].revision).toBe(0);const [ns]=await f.pg`select reserved_micro_usd,unknown_exposure_fence,active_attempt_id from pulse_digest_admission`;expect(Number(ns.reserved_micro_usd)).toBe(1000);expect(ns.unknown_exposure_fence).toBe(true);expect(ns.active_attempt_id).toBe(admitted.attemptId);
});
