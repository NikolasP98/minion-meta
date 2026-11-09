import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals';
const out=path.resolve(import.meta.dirname,'..');
const {digest}=await import(`${root}/scripts/agent-evals/lib/common.mjs`);
const {reconcileRunEvidence}=await import(`${root}/scripts/agent-evals/lib/run-evidence.mjs`);
const {complaintReport}=await import(`${root}/scripts/agent-evals/complaint.mjs`);
const source=JSON.parse(fs.readFileSync(path.join(out,'fractional-billing-and-redaction-result.json'),'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'minion-f-r2-deep-'));
const run=path.join(tmp,'run');fs.cpSync(path.join(source.syntheticRoot,'output'),run,{recursive:true});
const original={manifest:JSON.parse(fs.readFileSync(path.join(run,'manifest.json'),'utf8')),result:JSON.parse(fs.readFileSync(path.join(run,'result.json'),'utf8')),events:fs.readFileSync(path.join(run,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse),receipts:fs.readFileSync(path.join(run,'receipts.jsonl'),'utf8').trim().split('\n').map(JSON.parse)};
function command(){const argv=[process.execPath,`${root}/scripts/agent-evals/report.mjs`,'--run',run];const r=spawnSync(argv[0],argv.slice(1),{cwd:root,env:{PATH:process.env.PATH},encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);return {argv,exitCode:r.status,report:JSON.parse(r.stdout)};}
const baseline=command().report.cohorts[0].arms;
const scenarios=[
 ['identity-required-even-when-list-omits',d=>{d.manifest.evidence.expectedKinds=d.manifest.evidence.expectedKinds.filter(k=>k!=='adapter_identity');d.receipts=d.receipts.filter(r=>r.kind!=='adapter_identity');}],
 ['exact-duplicate-global-evidence',d=>{d.receipts.push(...d.receipts.filter(r=>r.kind==='adapter_identity'));d.events.push(...d.events.filter(r=>r.kind==='prepared'));},true],
 ['conflicting-same-id-identity',d=>{const r=structuredClone(d.receipts.find(r=>r.kind==='adapter_identity'));r.payload.buildHash='f'.repeat(64);d.receipts.push(r);}],
 ['second-distinct-identity',d=>{const r=structuredClone(d.receipts.find(r=>r.kind==='adapter_identity'));r.id=randomUUID();d.receipts.push(r);}],
 ['foreign-protocol',d=>{d.receipts.find(r=>r.kind==='adapter_identity').payload.protocol='foreign/v1';}],
 ['foreign-source-inventory',d=>{d.receipts.find(r=>r.kind==='adapter_identity').payload.sources=[{path:'foreign',sha256:'f'.repeat(64)}];}],
 ['missing-prepared',d=>{d.events=d.events.filter(r=>r.kind!=='prepared');}],
 ['foreign-prepared-root',d=>{d.events.find(r=>r.kind==='prepared').rootId=randomUUID();}],
 ...['missing','quarantine','critical'].map(key=>[`collection-${key}-contradiction`,d=>{for(const r of d.receipts.filter(r=>r.kind==='collection')){r.payload[key]=['conflict'];r.payload.complete=true;r.payload.outcome='success';}}]),
 ['network-violation-with-zero-counter',d=>{for(const r of d.receipts.filter(r=>r.kind==='collection'))r.payload.network.violations=['forbidden'];}],
 ['cached-success-cannot-replace-identity',d=>{d.receipts=d.receipts.filter(r=>r.kind!=='adapter_identity');for(const row of d.result.analysis.observations){row.executionComplete=true;row.complete=true;row.outcome='success';row.evidenceProblems=[];}}],
];
const reportCases=[];
for(const [name,mutate,qualifies=false] of scenarios){const d=structuredClone(original);mutate(d);d.result.manifestSha256=digest(d.manifest);for(const e of d.events.filter(e=>e.kind==='prepared'))e.payload.manifestSha256=digest(d.manifest);
for(const [key,file] of [['manifest','manifest.json'],['result','result.json']])fs.writeFileSync(path.join(run,file),JSON.stringify(d[key]));
for(const key of ['events','receipts'])fs.writeFileSync(path.join(run,key+'.jsonl'),d[key].map(JSON.stringify).join('\n')+'\n');
const c=command();const arms=c.report.cohorts[0].arms;for(const [arm,a] of Object.entries(arms)){assert.equal(a.successes,qualifies?1:0,name);assert.equal(a.executionReceiptCoverage,qualifies?1:0,name);assert.equal(a.costMicroUsd,baseline[arm].costMicroUsd,name);assert.equal(a.billingReceiptCoverage,1,name);}
const joined=reconcileRunEvidence(run).analysis.observations;reportCases.push({name,qualifies,command:c.argv,exitCode:0,arms,problems:joined.map(r=>({arm:r.arm,execution:r.executionProblems,billing:r.billingProblems}))});fs.writeFileSync(path.join(tmp,name+'.report.json'),JSON.stringify(c.report,null,2));}
const Ajv=createRequire(`${root}/package.json`)('ajv');const ajv=new Ajv({strict:true,allErrors:true});ajv.addFormat('uuid',/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
const schema=JSON.parse(fs.readFileSync(`${root}/scripts/agent-evals/fixtures/c-gateway/complaint-evaluation.schema.json`,'utf8'));const check=ajv.compile(schema);const validate=r=>assert(check(r),ajv.errorsText(check.errors));
const seed=JSON.parse(fs.readFileSync(`${root}/scripts/agent-evals/fixtures/c-gateway/complaint-evaluation-v1.json`,'utf8'))[0];const costCases=[];
for(const amount of [0,0.0000348]){const terminal=structuredClone(seed);terminal.attempts[0].costUsd=amount;const before=structuredClone(terminal);before.receiptRevision--;before.costCoverage='incomplete';before.attempts[0].costCoverage='incomplete';const invalid=structuredClone(terminal);invalid.receiptRevision++;invalid.costCoverage='incomplete';invalid.attempts[0].costCoverage='incomplete';
for(const [name,records,conflict] of [['forward',[before,terminal],false],['reverse',[terminal,before],false],['duplicates',[terminal,before,terminal,before],false],['downgrade-forward',[before,terminal,invalid],true],['downgrade-reverse',[invalid,terminal,before],true],['downgrade-duplicates',[invalid,terminal,before,invalid,before,terminal],true]]){const r=complaintReport(records,validate);assert.equal(r.actualShadowCosts.knownUsd,amount);assert.equal(r.actualShadowCosts.attempts,1);assert.equal(r.actualShadowCosts.unknownAttempts.length,conflict?1:0);assert.equal(r.quarantine.length>0,conflict);costCases.push({name,amount,actual:r.actualShadowCosts,quarantine:r.quarantine,status:r.status});}}
fs.writeFileSync(path.join(out,'revision2-deep-boundaries-result.json'),JSON.stringify({temporaryRoot:tmp,reportCases,costCases,actualExternalRequests:0,actualPaidRequests:0},null,2)+'\n');console.log(JSON.stringify({reportCases:reportCases.length,costCases:costCases.length,allAssertionsPassed:true,temporaryRoot:tmp}));
