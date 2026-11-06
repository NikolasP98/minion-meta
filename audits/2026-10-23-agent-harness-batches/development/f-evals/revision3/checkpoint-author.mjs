import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals',out=import.meta.dirname;
const {digest,writePrivate,readJSON}=await import(`${root}/scripts/agent-evals/lib/common.mjs`),{sourceDigest}=await import(`${root}/scripts/agent-evals/lib/manifest.mjs`);
const hash=p=>digest(fs.readFileSync(p));
fs.copyFileSync('/tmp/minion-f-revision3-red.log',`${out}/red-public-cli.log`);
fs.copyFileSync('/tmp/minion-f-revision3-green.log',`${out}/green-initial-targeted.log`);
const walk=p=>fs.readdirSync(path.join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${p}/${e.name}`):[`${p}/${e.name}`]);
const files=[...walk('scripts/agent-evals'),...walk('audits/2026-10-22-agent-use-transcripts/spec/fixtures'),'package.json','.github/workflows/ci.yml'].sort();
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard','--',...files],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const details=files.map(p=>({path:p,sha256:hash(path.join(root,p)),bytes:fs.statSync(path.join(root,p)).size,mode:(fs.statSync(path.join(root,p)).mode&0o777).toString(8)}));
writePrivate(`${out}/owned-files.json`,details);writePrivate(`${out}/untracked-files.json`,untracked);
let patch=execFileSync('git',['diff','--binary','--',...files],{cwd:root});
for(const p of untracked){const r=spawnSync('git',['diff','--no-index','--binary','--','/dev/null',p],{cwd:root});assert.equal(r.status,1,`untracked diff ${p}`);patch=Buffer.concat([patch,r.stdout]);}
writePrivate(`${out}/f-owned.patch`,patch);
execFileSync('tar',['-czf',`${out}/owned-source.tar.gz`,'--',...files],{cwd:root});
const original='/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/f-evals/revision2/probes';
const probeIdentities=fs.readdirSync(`${out}/probes`).filter(p=>p.endsWith('.mjs')).map(p=>{assert.equal(hash(`${out}/probes/${p}`),hash(`${original}/${p}`));return {path:`${original}/${p}`,copy:`${out}/probes/${p}`,sha256:hash(`${out}/probes/${p}`),changedByAgent:false};});
writePrivate(`${out}/independent-probe-identities.json`,probeIdentities);
const terminal=fs.readFileSync(`${out}/green-final57.log`,'utf8');assert(terminal.includes('# pass 57\n')&&terminal.includes('# fail 0\n'));
const probes=readJSON(`${out}/unchanged-probe-executions.json`);assert.equal(probes.length,9);assert(probes.every(r=>r.exitCode===0&&r.unchanged));
const collection=readJSON(`${out}/collection-terminal-conflict-result.json`);for(const c of collection.cases)for(const a of Object.values(c.arms)){assert.equal(a.successes,0);assert.equal(a.executionReceiptCoverage,0);assert.equal(a.billingReceiptCoverage,1);assert(Math.abs(a.costMicroUsd-.1)<1e-15);}
const runtime=sourceDigest(root),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const bridge=readJSON(`${out}/c-public-cli-final-receipts.json`);assert.equal(bridge.length,8);assert(bridge.every(r=>r.FSourceSha256===runtime&&r.CReviewedHead==='9da5b35a6e26ac0154b1f9aa215b218a064afe5d'&&r.exitCode===0));
const commands=[
 {command:'node --test --test-concurrency=1 scripts/agent-evals/revision3-regressions.test.mjs',exitCode:1,result:'public report collection success assertion reproduced F02-R2',log:'red-public-cli.log'},
 {command:'node --test --test-concurrency=1 scripts/agent-evals/revision3-regressions.test.mjs',exitCode:0,result:'initial10 terminal cases in forward/reverse order pass',log:'green-initial-targeted.log'},
 {command:'node --test --test-concurrency=1 scripts/agent-evals/*.test.mjs scripts/agent-evals/lib/*.test.mjs',exitCode:0,result:'57/57 pass,0fail/skip/TODO; regression expanded to12cases in bothorders',log:'green-final57.log'},
 {command:'A/node_modules/.bin/prettier --check [six changed owned files]',exitCode:0,log:'format-check.log'},
 {command:'node --check scripts/agent-evals/lib/run-evidence.mjs; node --check scripts/agent-evals/revision3-regressions.test.mjs',exitCode:0},
 {command:'byte-identical independent probe copies; nine executions',exitCode:0,receipts:'unchanged-probe-executions.json'},
 {command:'node --import tsx /tmp/minion-f-c-authority-revision1/authority-history.mts C_ROOT F_ROOT OUT/c-authority-history',cwd:'C_ROOT',exitCode:0,result:'fresh SQLite6record history, historicaleligible2/current0, known9micro+0, no unknown/quarantine/provider requests',log:'c-authority-history.log'},
 {command:'node requalify-c-final.mjs',exitCode:0,result:'eight public commands; actual C committed retry/authority, fresh SQLite export, shipped original pinned artifact',receipts:'c-public-cli-final-receipts.json'},
];writePrivate(`${out}/commands.json`,commands);
const checkpoint={version:1,status:'revision3_terminal_correction_author_checkpoint_not_final_acceptance',checkpointHead:head,branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),runtimeSha256:runtime,lockSha256:hash(`${root}/pnpm-lock.yaml`),ownedFiles:files.length,untrackedFiles:untracked.length,ownedPatchSha256:hash(`${out}/f-owned.patch`),previousCheckpointSha256:'a67336dbc20de357a1d03b011c9a3db669e939ac76a32e346d64af46203f5a65',previousRuntimeSha256:'119b81d8e62f4e4903c54039c3050b87ea6eb8e22e804de8582ef5968a7f2607',terminalTests:{tests:57,passed:57,failed:0,skipped:0,todo:0,exitCode:0,durationMs:41746.995099,logSha256:hash(`${out}/green-final57.log`)},independentProbeExecutions:9,actualExternalRequests:0,actualPaidRequests:0,fullRootGates:'not_rerun_revision3_D_reserved_heavy_allocation',stagedSourceByAgent:false,commitsPushPrMergeDeployByAgent:false,currentJobs:[],changedOwnedFiles:readJSON(`${out}/changed-files-vs-revision2.json`),finalC:{commit:'9da5b35a6e26ac0154b1f9aa215b218a064afe5d',artifact:'scripts/agent-evals/fixtures/c-gateway/artifact.json',artifactSha256:hash(`${root}/scripts/agent-evals/fixtures/c-gateway/artifact.json`),committedSourceBytesVerified:['schema','exporter','original sample','retry sample'],publicCliCommands:8},reviewAxes:{standards:'self_review_pass; independent review pending',spec:'self_review_F02R2_pass; final actualA/fullroot/independent convergence pending'},remaining:['independent F02-R2 and full software convergence review','fresh compiled actualA fixture/live-stub integration on abe7eeabc7f7bb6993a7b291ffefe49722abd294; build deliberately not invoked during D heavy window','allocated final root gates','parent scoped commit/draftPR/CI; merge/deploy unauthorized'],artifacts:{}};
for(const p of ['owned-files.json','untracked-files.json','f-owned.patch','owned-source.tar.gz','commands.json','independent-probe-identities.json','red-public-cli.log','green-final57.log','format-check.log','unchanged-probe-executions.json','collection-terminal-conflict-result.json','revision2-deep-boundaries-result.json','c-public-cli-final-receipts.json','c-authority-history.log','c-authority-history/producer-authority-revisions.json','changed-files-vs-revision2.json'])checkpoint.artifacts[p]={path:path.join(out,p),sha256:hash(path.join(out,p))};
writePrivate(`${out}/checkpoint.json`,checkpoint);
const privacy=directory=>{fs.chmodSync(directory,0o700);for(const e of fs.readdirSync(directory,{withFileTypes:true})){const p=path.join(directory,e.name);if(e.isDirectory())privacy(p);else fs.chmodSync(p,0o600);}};privacy(out);
console.log(JSON.stringify({checkpoint:`${out}/checkpoint.json`,checkpointSha256:hash(`${out}/checkpoint.json`),runtimeSha256:runtime,ownedFiles:files.length,untrackedFiles:untracked.length,patchSha256:checkpoint.ownedPatchSha256,archiveSha256:hash(`${out}/owned-source.tar.gz`),head}));
