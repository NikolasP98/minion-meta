import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],froot=process.argv[3],at=(p:string)=>pathToFileURL(path.join(root,p)).href;
await import(at('src/plugins/runtime.ts'));
const {positiveFixture}=await import(at('extensions/alert-watcher/src/work-test-fixtures.ts'));
const {getWork,observeWorkAuthority}=await import(at('extensions/alert-watcher/src/classification-work.ts'));
const {exportComplaintEvaluation}=await import(at('extensions/alert-watcher/src/complaint-evaluation.ts'));
const {reconcileComplaints}=await import(pathToFileURL(path.join(froot,'scripts/agent-evals/complaint.mjs')).href);
const require=createRequire(path.join(froot,'package.json')),Ajv=require('ajv'),ajv=new Ajv({strict:true,allErrors:true});
ajv.addFormat('uuid',/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
const check=ajv.compile(JSON.parse(fs.readFileSync(path.join(root,'extensions/alert-watcher/src/complaint-evaluation.schema.json'),'utf8')));
const validate=(r:unknown)=>assert.ok(check(r),ajv.errorsText(check.errors));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'astra-authority-export-')),f=positiveFixture(dir);
try {
 observeWorkAuthority(f.db,getWork(f.db,f.id),f.snapshot,f.snapshot.authority);
 const before=exportComplaintEvaluation(f.db,f.id);
 observeWorkAuthority(f.db,getWork(f.db,f.id),f.snapshot,{kind:'unavailable',reason:'plugin_disabled'});
 const after=exportComplaintEvaluation(f.db,f.id);
 validate(before);validate(after);
 const result=reconcileComplaints([before,after],validate);
 console.log(JSON.stringify({before:{revision:before.receiptRevision,enabled:before.enabled,matched:before.matched},after:{revision:after.receiptRevision,enabled:after.enabled,matched:after.matched},unchangedBill:JSON.stringify(before.attempts)===JSON.stringify(after.attempts),result},null,2));
 assert.equal(result.quarantine.length,0,'legal current-authority observation must not conflict with immutable source/model/bill facts');
} finally {f.db.close();fs.rmSync(dir,{recursive:true,force:true});}
