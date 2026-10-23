import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import{createRequire}from'node:module';import{pathToFileURL}from'node:url';
const [croot,froot,out]=process.argv.slice(2),at=(p:string)=>pathToFileURL(path.join(croot,p)).href;
await import(at('src/plugins/runtime.ts'));
const {testDb,workFixture}=await import(at('extensions/alert-watcher/src/work-test-fixtures.ts'));
const {admitSource,claimWork,admitInvocation,receiveInvocation,finishWork,getWork,observeWorkAuthority}=await import(at('extensions/alert-watcher/src/classification-work.ts'));
const {exportComplaintEvaluation}=await import(at('extensions/alert-watcher/src/complaint-evaluation.ts'));
const {complaintReport,reconcileComplaints}=await import(pathToFileURL(path.join(froot,'scripts/agent-evals/complaint.mjs')).href);
const Ajv=createRequire(path.join(froot,'package.json'))('ajv'),ajv=new Ajv({strict:true,allErrors:true});ajv.addFormat('uuid',/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);const check=ajv.compile(JSON.parse(fs.readFileSync(path.join(croot,'extensions/alert-watcher/src/complaint-evaluation.schema.json'),'utf8'))),validate=(r:unknown)=>assert(check(r),ajv.errorsText(check.errors));
const db=testDb(path.join(out,'authority.db')),exports=[];
try{for(const costUsd of [.000009,0]){
 const snapshot=workFixture({qualifiedModelRevision:'fixture-reviewed-r1',sourceCertification:'certified'});snapshot.source.messageId=`f-authority-history-${costUsd}`;
 const work=admitSource(db,'f-review-history',snapshot);assert.equal(work.kind,'admitted');const id=work.work.id,lease=claimWork(db,id,'f-review-owner'),attemptId=admitInvocation(db,lease);
 const model={provider:'anthropic',model:snapshot.model,revision:'fixture-reviewed-r1'},usage={inputTokens:1,outputTokens:1,cacheReadTokens:0,cacheCreationTokens:0};
 receiveInvocation(db,lease,{ok:true,data:{is_complaint:false},usage,durationMs:1,resolvedModel:model},{attemptId,purpose:'classification',requestedModel:model,resolvedModel:model,usage,costStatus:'known',costUsd,costCoverage:'complete',elapsedMs:1});finishWork(db,lease,'completed');
 observeWorkAuthority(db,getWork(db,id),snapshot,snapshot.authority);const before=exportComplaintEvaluation(db,id);validate(before);assert.equal(before.eligibility.status,'eligible');assert.equal(before.attempts[0].costUsd,costUsd);
 observeWorkAuthority(db,getWork(db,id),snapshot,{kind:'unavailable',reason:'plugin_disabled'});const disabled=exportComplaintEvaluation(db,id);validate(disabled);
 observeWorkAuthority(db,getWork(db,id),snapshot,{kind:'unavailable',reason:'policy_unmatched'});const unmatched=exportComplaintEvaluation(db,id);validate(unmatched);assert.equal(unmatched.matched,false);
 assert.deepEqual(before.attempts,disabled.attempts);assert.deepEqual(before.attempts,unmatched.attempts);assert.equal(reconcileComplaints([before,disabled,unmatched],validate).quarantine.length,0);
 const report=complaintReport([before,disabled,unmatched],validate);assert.equal(report.eligibleLogicalSources,1);assert.equal(report.currentEligibleLogicalSources,0);assert.equal(report.actualShadowCosts.knownUsd,costUsd);assert.equal(report.eligibleActualCosts.knownUsd,costUsd);assert.deepEqual(report.actualShadowCosts.unknownAttempts,[]);
 exports.push(before,disabled,unmatched);
}
 const full=complaintReport(exports,validate);assert.equal(full.eligibleLogicalSources,2);assert.equal(full.actualShadowCosts.attempts,2);assert.equal(full.actualShadowCosts.knownUsd,.000009);
 fs.writeFileSync(path.join(out,'producer-authority-revisions.json'),JSON.stringify(exports,null,2)+'\n',{mode:0o600});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(full,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({records:exports.length,historicalEligible:full.eligibleLogicalSources,currentEligible:full.currentEligibleLogicalSources,paidAttemptReceipts:full.actualShadowCosts.attempts,knownUsd:full.actualShadowCosts.knownUsd,unknownAttempts:full.actualShadowCosts.unknownAttempts,quarantine:full.quarantine,actualProviderCalls:0,actualPaidCalls:0}));
}finally{db.close();}
