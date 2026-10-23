import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals',out=import.meta.dirname;
const {digest,writePrivate,readJSON}=await import(`${root}/scripts/agent-evals/lib/common.mjs`),{sourceDigest}=await import(`${root}/scripts/agent-evals/lib/manifest.mjs`);
const hash=p=>digest(fs.readFileSync(p));
for(const [from,to] of [['/tmp/minion-f-revision2-red.log','red-public-cli.log'],['/tmp/minion-f-revision2-green-focused.log','green-focused.log'],['/tmp/minion-f-revision2-final56.log','green-final56.log']])fs.copyFileSync(from,path.join(out,to));
const walk=p=>fs.readdirSync(path.join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${p}/${e.name}`):[`${p}/${e.name}`]);
const files=[...walk('scripts/agent-evals'),...walk('audits/2026-10-22-agent-use-transcripts/spec/fixtures'),'package.json','.github/workflows/ci.yml'].sort();
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard','--',...files],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const details=files.map(p=>({path:p,sha256:hash(path.join(root,p)),bytes:fs.statSync(path.join(root,p)).size,mode:(fs.statSync(path.join(root,p)).mode&0o777).toString(8)}));
writePrivate(`${out}/owned-files.json`,details);writePrivate(`${out}/untracked-files.json`,untracked);
let patch=execFileSync('git',['diff','--binary','--',...files],{cwd:root});
for(const p of untracked){const r=spawnSync('git',['diff','--no-index','--binary','--','/dev/null',p],{cwd:root});if(r.status!==1)throw Error(`untracked diff ${p}: ${r.status}`);patch=Buffer.concat([patch,r.stdout]);}
writePrivate(`${out}/f-owned.patch`,patch);
execFileSync('tar',['-czf',`${out}/owned-source.tar.gz`,'--',...files],{cwd:root});
const original=readJSON('/tmp/minion-f-review-revision1-20261023/independent-probe-identities.json');
for(const p of original)if(hash(p.path)!==p.sha256)throw Error(`independent probe changed: ${p.path}`);
const additional='/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/f-evals/revision1/probes/additional-evidence-boundaries.mjs';
original.push({path:additional,sha256:hash(additional),changedByAgent:false});writePrivate(`${out}/independent-probe-identities.json`,original);
const commands=[
 {command:'node --test scripts/agent-evals/revision2-regressions.test.mjs',exitCode:1,result:'both public-boundary assertions fail',log:'red-public-cli.log'},
 {command:'node --test scripts/agent-evals/revision2-regressions.test.mjs',exitCode:0,result:'2/2 green before expanded downgrade/inventory checks',log:'green-focused.log'},
 {command:'pnpm exec prettier --write [three changed JS modules]',exitCode:1,result:'root does not install prettier; used existing A pinned installed formatter instead; no install or lock change'},
 {command:'A/node_modules/.bin/prettier --write [changed JS and documentation files]',exitCode:0,result:'formatted owned files only, byte-identical C exporter excluded'},
 {command:'node --test scripts/agent-evals/*.test.mjs scripts/agent-evals/lib/*.test.mjs',exitCode:0,result:'56/56 pass,0fail/skip/TODO,14921.142029ms',log:'green-final56.log'},
 {command:'A/node_modules/.bin/prettier --check [changed JS and documentation files]',exitCode:0,result:'all matched files formatted'},
 {command:'node final-bridge/requalify-c.mjs',exitCode:0,result:'actual C explicit checkout schema/exporter pins;4 public CLI calls,matching reports',receipts:'final-bridge/c-public-cli-receipts.json'},
 {command:'node --import tsx /tmp/minion-f-c-authority-revision1/authority-history.mts C_ROOT F_ROOT /tmp/minion-f-review-revision2-20261023/c-authority-history',cwd:'C_ROOT',exitCode:0,result:'real SQLite6records,historicaleligible2/current0,known0+9micro receipts,no unknown/quarantine/provider calls',log:'c-authority-history.log'},
];writePrivate(`${out}/commands.json`,commands);
const runtime=sourceDigest(root),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const bridge=readJSON(`${out}/final-bridge/c-public-cli-receipts.json`);if(bridge.some(r=>r.FSourceSha256!==runtime))throw Error('bridge runtime drift');
const checkpoint={version:1,status:'revision2_corrections_author_checkpoint_not_final_acceptance',checkpointHead:head,sourceHeadAtTerminalSuite:head,branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),runtimeSha256:runtime,lockSha256:hash(`${root}/pnpm-lock.yaml`),ownedFiles:files.length,untrackedFiles:untracked.length,ownedPatchSha256:hash(`${out}/f-owned.patch`),terminalTests:{tests:56,passed:56,failed:0,skipped:0,todo:0,exitCode:0,durationMs:14921.142029,logSha256:hash(`${out}/green-final56.log`)},actualExternalRequests:0,actualPaidRequests:0,fullRootGates:'not_rerun_revision2_C_owned_heavy_allocation',stagedSourceByAgent:false,commitsPushPrMergeDeployByAgent:false,currentJobs:[],documentationChanges:['scripts/agent-evals/README.md','scripts/agent-evals/CORRECTIONS-REVISION-2.md'],changedRuntimeSinceRevision1:['scripts/agent-evals/lib/run-evidence.mjs','scripts/agent-evals/complaint.mjs','scripts/agent-evals/revision2-regressions.test.mjs'],newProducerSnapshot:{path:'scripts/agent-evals/fixtures/c-gateway/complaint-evaluation.ts',sha256:hash(`${root}/scripts/agent-evals/fixtures/c-gateway/complaint-evaluation.ts`),qualification:'byte_identical_actual_C_workingtree_exporter_not_final_commit_pin'},remaining:['independent F02-R1/F06-R1 convergence recheck','final reviewed A/C commit pins and actualA fixture/live-stub/currentC integration','allocated final root gates','parent scoped commit/draftPR/CI; merge/deploy unauthorized'],artifacts:{}};
for(const p of ['owned-files.json','untracked-files.json','f-owned.patch','owned-source.tar.gz','commands.json','independent-probe-identities.json','red-public-cli.log','green-final56.log','final-bridge/c-public-cli-receipts.json','c-authority-history.log'])checkpoint.artifacts[p]={path:path.join(out,p),sha256:hash(path.join(out,p))};
writePrivate(`${out}/checkpoint.json`,checkpoint);
const privacy=directory=>{fs.chmodSync(directory,0o700);for(const e of fs.readdirSync(directory,{withFileTypes:true})){const p=path.join(directory,e.name);if(e.isDirectory())privacy(p);else fs.chmodSync(p,0o600);}};privacy(out);
console.log(JSON.stringify({checkpoint:`${out}/checkpoint.json`,checkpointSha256:hash(`${out}/checkpoint.json`),runtimeSha256:runtime,ownedFiles:files.length,untrackedFiles:untracked.length,patchSha256:checkpoint.ownedPatchSha256,head}));
