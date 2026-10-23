import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
const froot='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals',croot=path.join(path.dirname(froot),'c-gateway'),out=import.meta.dirname;
const {digest,writePrivate,readJSON}=await import(`${froot}/scripts/agent-evals/lib/common.mjs`),{sourceDigest}=await import(`${froot}/scripts/agent-evals/lib/manifest.mjs`);
const hash=p=>digest(fs.readFileSync(p)),head=root=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const receipts=[];
for(const kind of ['retry','authority']){
 const m=readJSON(`/tmp/minion-f-review-revision1-20261023/${kind}-manifest.json`);
 m.provenance.meta={commit:head(froot),lockSha256:hash(`${froot}/pnpm-lock.yaml`),sourceSha256:sourceDigest(froot)};
 m.provenance.gateway.commit=head(croot);
 assert.equal(hash(`${croot}/extensions/alert-watcher/src/complaint-evaluation.schema.json`),m.provenance.gateway.schemaSha256);
 assert.equal(hash(`${croot}/extensions/alert-watcher/src/complaint-evaluation.ts`),m.provenance.gateway.exporterSha256);
 const manifest=`${out}/${kind}-manifest.json`;writePrivate(manifest,m);
 const input=`${froot}/scripts/agent-evals/fixtures/c-gateway/complaint-${kind==='retry'?'retry-revisions':'authority-evolution'}-v1.json`;
 let prior;
 for(const script of ['complaint.mjs','report.mjs']){
  const argv=[process.execPath,`scripts/agent-evals/${script}`,script==='complaint.mjs'?'--input':'--complaint',input,'--manifest',manifest,'--gateway-root',croot];
  const r=spawnSync(argv[0],argv.slice(1),{cwd:froot,env:{PATH:process.env.PATH},encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,r.stderr);if(prior)assert.equal(prior,r.stdout);prior=r.stdout;
  const result=JSON.parse(r.stdout);assert.equal(result.quarantine.length,0);assert.equal(result.actualShadowCosts.unknownAttempts.length,0);assert.equal(result.actualShadowCosts.knownUsd,.000009);
  writePrivate(`${out}/${kind}-${script}.json`,r.stdout);
  receipts.push({argv,cwd:froot,exitCode:r.status,outputSha256:digest(r.stdout),knownUsd:result.actualShadowCosts.knownUsd,attempts:result.actualShadowCosts.attempts,sourceClass:'actual_C_reviewed_local_source_commit',FSourceSha256:sourceDigest(froot),CBaseHead:head(croot)});
 }
}
writePrivate(`${out}/c-public-cli-receipts.json`,receipts);console.log(JSON.stringify(receipts));
