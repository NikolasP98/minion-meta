import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals';
const {liveSetup}=await import(`${root}/scripts/agent-evals/fixtures/helpers.mjs`);
const s=liveSetup(),preload=path.join(s.root,'fractional-bill-wire.mjs');
fs.writeFileSync(preload,`import net from 'node:net';net.Socket.prototype.connect=()=>{throw Error('external network denied')};globalThis.fetch=async(url,o)=>{if(url!=='https://openrouter.ai/api/v1/chat/completions')throw Error('unallowed');return Response.json({model:JSON.parse(o.body).model,choices:[{message:{content:'fixture answer'}}],usage:{prompt_tokens:2,completion_tokens:2,cost:0.0000001}})};`);
const command=[process.execPath,'--import',preload,`${root}/scripts/agent-evals/run.mjs`,'--live','--manifest',s.manifestPath,'--hub-root',s.hub,'--out',s.out,'--approval',s.approvalPath,'--operator-config',s.configPath,'--trusted-key',s.keyPath,'--owner-ref','test-owner','--credential-file',s.credentialFile];
const run=spawnSync(command[0],command.slice(1),{cwd:root,env:{PATH:process.env.PATH,HOME:process.env.HOME},encoding:'utf8',timeout:15000});
if(run.status!==0)throw Error(run.stderr);
const reportCommand=[process.execPath,`${root}/scripts/agent-evals/report.mjs`,'--run',s.out];
const report=spawnSync(reportCommand[0],reportCommand.slice(1),{cwd:root,env:{PATH:process.env.PATH},encoding:'utf8',timeout:10000});
if(report.status!==0)throw Error(report.stderr);
const parsed=JSON.parse(report.stdout),journal=fs.readFileSync(s.config.journalPath,'utf8').trim().split('\n').map(JSON.parse);
const traversal=JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname,'../corpus-paths-result.json'),'utf8'));
const before=fs.readdirSync(path.join(traversal.out,'raw'));
const redactCommand=[process.execPath,`${root}/scripts/agent-evals/run.mjs`,'redact','--run',traversal.out,'--deletion-ref','independent-synthetic-review'];
const redaction=spawnSync(redactCommand[0],redactCommand.slice(1),{cwd:root,env:{PATH:process.env.PATH},encoding:'utf8',timeout:10000});
const after=fs.readdirSync(path.join(traversal.out,'raw'));
const result={syntheticRoot:s.root,commands:[{command,exit:run.status},{command:reportCommand,exit:report.status},{command:redactCommand,exit:redaction.status,stderr:redaction.stderr}],
 observedArms:parsed.cohorts[0].arms,knownBills:journal.filter(r=>r.kind==='settled').map(r=>r.costMicroUsd),expectedExactUsdPerCall:0.0000001,expectedConservativeLedgerMicroUsdPerCall:1,
 rawFilesBefore:before,rawFilesAfter:after,actualExternalRequests:0,actualPaidRequests:0};
fs.writeFileSync(path.resolve(import.meta.dirname,'../fractional-billing-and-redaction-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
