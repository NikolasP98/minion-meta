import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
const at=(p:string)=>pathToFileURL(path.join(root,p)).href;
await import(at('src/plugins/runtime.ts'));
const {testDb,workFixture}=await import(at('extensions/alert-watcher/src/work-test-fixtures.ts'));
const {admitSource,claimWork,admitInvocation,receiveInvocation,retryNoCredentials}=await import(at('extensions/alert-watcher/src/classification-work.ts'));
const {classifyMessage}=await import(at('extensions/alert-watcher/src/classifier.ts'));
const {exportComplaintEvaluation}=await import(at('extensions/alert-watcher/src/complaint-evaluation.ts'));
const db=testDb();
try {
 const snapshot=workFixture();
 const a=admitSource(db,'no-keys-probe',snapshot);
 assert.equal(a.kind,'admitted');
 const lease=claimWork(db,a.work.id,'probe');
 const attemptId=admitInvocation(db,lease);
 let credentialLookups=0;
 const host={resolveApiKey:async()=>{credentialLookups++;throw Error('stub has no credentials');},resolveSkillsPrompt:()=>{throw Error('must not reach post-auth preparation');}};
 let error='';
 try {await classifyMessage([{role:'user',content:'fixture',ts:Date.now()}],host,snapshot.model,undefined,'es',{}, {attemptId,purpose:'classification',onTerminal:(result,usage)=>receiveInvocation(db,lease,result,usage)});} catch(e){error=String(e);}
 assert.ok(error.includes('NO_API_KEY'));
 retryNoCredentials(db,lease);
 const record=exportComplaintEvaluation(db,a.work.id);
 console.log(JSON.stringify({credentialLookups,providerCalls:0,sdkError:error,baseline:record.baseline,attempts:record.attempts,costCoverage:record.costCoverage},null,2));
 assert.equal(record.attempts.filter((a:unknown)=>a.costStatus==='unknown'||a.costCoverage!=='complete').length,0,'proven NO_API_KEY before any provider dispatch must not create an unknown bill');
} finally {db.close();}
