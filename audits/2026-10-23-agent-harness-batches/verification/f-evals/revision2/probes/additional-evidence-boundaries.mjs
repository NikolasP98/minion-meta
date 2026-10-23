import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals';
const {setup,cli}=await import(`${root}/scripts/agent-evals/fixtures/helpers.mjs`);
const {complaintReport}=await import(`${root}/scripts/agent-evals/complaint.mjs`);
const Ajv=createRequire(`${root}/package.json`)('ajv');
const ajv=new Ajv({strict:true,allErrors:true});ajv.addFormat('uuid',/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
const check=ajv.compile(JSON.parse(fs.readFileSync(`${root}/scripts/agent-evals/fixtures/c-gateway/complaint-evaluation.schema.json`,'utf8')));
const validate=r=>{if(!check(r))throw Error(ajv.errorsText(check.errors));};
const terminal=JSON.parse(fs.readFileSync(`${root}/scripts/agent-evals/fixtures/c-gateway/complaint-evaluation-v1.json`,'utf8'))[0];
const before=structuredClone(terminal);before.receiptRevision=terminal.receiptRevision-1;before.costCoverage='incomplete';before.attempts[0].costCoverage='incomplete';
const costs=[];
for(const [label,records] of [['forward',[before,terminal]],['reverse',[terminal,before]],['duplicate',[before,terminal,before,terminal]]]){
 const r=complaintReport(records,validate);costs.push({label,actual:r.actualShadowCosts,quarantine:r.quarantine});
}
const s=setup();const run=cli(s);if(run.status!==0)throw Error(run.stderr);
const p=path.join(s.out,'receipts.jsonl'),original=fs.readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
const scenarios=[
 ['missing-required-adapter-identity',original.filter(r=>r.kind!=='adapter_identity')],
 ['wrong-adapter-source-pin',original.map(r=>r.kind==='adapter_identity'?{...r,payload:{...r.payload,sourceSha:'f'.repeat(40),buildHash:'f'.repeat(64)}}:r)],
 ['contradictory-collection-completeness',original.map(r=>r.kind==='collection'?{...r,payload:{...r.payload,missing:['required-domain-receipt'],complete:true,outcome:'success'}}:r)]
];
const reportCases=[];
for(const [name,records] of scenarios){
 fs.writeFileSync(p,records.map(JSON.stringify).join('\n')+'\n');
 const cmd=[process.execPath,`${root}/scripts/agent-evals/report.mjs`,'--run',s.out];
 const r=spawnSync(cmd[0],cmd.slice(1),{cwd:root,env:{PATH:process.env.PATH},encoding:'utf8',timeout:10000});
 fs.writeFileSync(path.join(s.root,`${name}.stdout.json`),r.stdout);
 const report=r.status===0?JSON.parse(r.stdout):null;
 reportCases.push({name,command:cmd,exit:r.status,stderr:r.stderr,arms:report?.cohorts[0]?.arms,reasons:report?.cohorts[0]?.comparisons.jev.reasons});
}
const summary={fixtureRoot:s.root,out:s.out,requiredKinds:s.m.evidence.expectedKinds,complaintCoverageRefinement:costs,reportCases};
fs.writeFileSync(path.resolve(import.meta.dirname,'../additional-evidence-boundaries-result.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
