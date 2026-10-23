import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals';
const {digest}=await import(`${root}/scripts/agent-evals/lib/common.mjs`);
const {complaintReport}=await import(`${root}/scripts/agent-evals/complaint.mjs`);
const Ajv=createRequire(`${root}/package.json`)('ajv');
const schema=JSON.parse(fs.readFileSync(`${root}/scripts/agent-evals/fixtures/c-gateway/complaint-evaluation.schema.json`,'utf8'));
const ajv=new Ajv({strict:true,allErrors:true});ajv.addFormat('uuid',/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
const check=ajv.compile(schema);const validate=r=>{if(!check(r))throw Error(ajv.errorsText(check.errors));};
const terminal=JSON.parse(fs.readFileSync(`${root}/scripts/agent-evals/fixtures/c-gateway/complaint-evaluation-v1.json`,'utf8'))[0];
terminal.attempts[0].costUsd=0;
const admitted=structuredClone(terminal);
admitted.receiptRevision=1;admitted.resultId=null;admitted.resolvedClassifierModel=null;
admitted.baseline.disposition='unknown';admitted.costCoverage='incomplete';
Object.assign(admitted.attempts[0],{disposition:'admitted',costStatus:'unknown',costUsd:null,costCoverage:'incomplete',resolvedModel:null});
const zeroBill=complaintReport([admitted,terminal],validate);
const work=fs.mkdtempSync('/tmp/f-independent-screen-');
const trace={id:'one-independent-trace',allowedTools:[],tools:[],actions:[],receipts:[],terminal:'success',sends:[],cancelAt:null,citations:[],supportedIds:[],semantic:{rubricRevision:'screen-rubric-v1',outcome:'pass',evidence:[]}};
const registration={budget:100,controls:50,seed:19,missBounds:{major:0.05,urgent:0.05,critical:0.05},uncertainty:'stratified_bootstrap_v1',labelRevision:'human-label-v1'};
const {semantic,...source}=trace;
const labels=[{id:trace.id,revision:'human-label-v1',method:'human_adjudicated',blindToScreen:true,failure:false,severity:'major',traceSha256:digest(source),actorRef:'synthetic-review-author',reviewerRef:'synthetic-reviewer-other',adjudicationRef:'synthetic-only-review-test',adjudicatedAt:'2026-10-23T00:00:00Z',rubricRevision:'independent-review-v1'}];
// 100 byte-identical exports of ONE source trace, with ONE independent human label assertion.
fs.writeFileSync(path.join(work,'input.json'),JSON.stringify({traces:Array.from({length:100},()=>structuredClone(trace)),registration}));
fs.writeFileSync(path.join(work,'labels.json'),JSON.stringify(labels));
const command=[process.execPath,`${root}/scripts/agent-evals/screen.mjs`,'--input',path.join(work,'input.json'),'--labels',path.join(work,'labels.json')];
const r=spawnSync(command[0],command.slice(1),{cwd:root,env:{PATH:process.env.PATH},encoding:'utf8',timeout:15000});
fs.writeFileSync(path.join(work,'stdout.json'),r.stdout);fs.writeFileSync(path.join(work,'stderr.txt'),r.stderr);
const parsed=r.status===0?JSON.parse(r.stdout):null;
const summary={work,command,exit:r.status,stderr:r.stderr,
 duplicateTraces:parsed?{uniqueInputs:1,uniqueLabels:1,scored:parsed.scored.length,random:parsed.random,prioritized:parsed.prioritized}:null,
 zeroBillRevisions:{terminalCostStatus:terminal.attempts[0].costStatus,terminalCostUsd:0,terminalCoverage:'complete',actual:zeroBill.actualShadowCosts,quarantine:zeroBill.quarantine}};
fs.writeFileSync(path.resolve(import.meta.dirname,'../screen-and-complaint-result.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({exit:r.status,duplicate:parsed?{status:parsed.prioritized.status,reviewed:parsed.prioritized.reviewed,upper:parsed.prioritized.zeroMissRateUpper,uniqueSelectionIds:new Set(parsed.prioritized.selection.map(s=>s.id)).size}:null,zeroBill:summary.zeroBillRevisions},null,2));
