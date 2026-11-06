// Offline source probes. Usage: node probes.mjs /path/to/pinned/minion_factory
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(process.argv[2]);
const { buildReport, normalizeJev } = await import(pathToFileURL(path.join(root,'scripts/jev-shadow-report.mjs')));
const answers = Object.fromEntries(['criticality','importance','impact'].map(k=>[k,{type:'score',score:5}]));
const shared = {site:'rank',runId:'fixture-one-inference',ts:'2026-10-22T00:00:00Z'};
const central = {...shared,origin:'container',today:null,jev:{ok:true,model:'fixture-model',answers,costUsd:0.01,costSource:'provider-reported',ms:10}};
const local = {...shared,today:{criticality:5,importance:5,impact:5},jev:{model:'fixture-model',answers,total_cost_usd:0.01,cost_source:'provider-reported',ms:12}};
const result = buildReport([central,local]);
assert.equal(result.rank.n,2);
assert.equal(result.rank.totalCostUsd,0.02);
assert.deepEqual(result.rank.byOrigin,{runner:1,container:1});
console.log('PASS one inference represented by central + local records is counted twice:',JSON.stringify(result.rank));
const unknown = normalizeJev({ok:true,answers,model:'other-model',costSource:'unknown'});
assert.equal(unknown.costUsd,0);
assert.equal(unknown.model,undefined);
assert.equal(unknown.costSource,undefined);
console.log('PASS unknown cost becomes zero and model/cost provenance is omitted:',JSON.stringify(unknown));
const tmp = mkdtempSync(path.join(tmpdir(),'minion-factory-probe-'));
try {
  const bin=path.join(tmp,'bin'); mkdirSync(bin);
  writeFileSync(path.join(bin,'curl'),`#!/usr/bin/env python3\nimport os,sys,json\na=sys.argv[1:]\nopen(os.environ['PROBE_ARGS'],'w').write(json.dumps(a))\nprint(json.dumps({'ok':True,'model':'fixture','answers':{'irreversible':{'type':'noul','noul':.99},'destructive_intent':{'type':'noul','noul':.99}},'usage':{'inputTokens':1,'outputTokens':0},'costUsd':0,'costSource':'unknown'}))\nprint('200')\n`,{mode:0o700});
  const env={...process.env,PATH:bin+':'+process.env.PATH,PROBE_ARGS:path.join(tmp,'args.json'),FACTORY_OUT_DIR:tmp,FACTORY_JEV_LIB:path.join(root,'agent/lib/jev.sh'),FACTORY_JEV_GUARD:'enforce',FACTORY_JEV_TIMEOUT_S:'4',FACTORY_JEV_PROXY_URL:'http://offline.invalid',FACTORY_JEV_CAPABILITY:'fixture',FACTORY_RUN_ID:'offline-probe'};
  delete env.FACTORY_JEV_PROXY_TIMEOUT_S;
  const hook=spawnSync('bash',[path.join(root,'agent/hooks/jev-guard.sh')],{env,input:JSON.stringify({tool_name:'Bash',tool_input:{command:'custom-cleanup-tool --wipe'},cwd:'/work'}),encoding:'utf8',timeout:6000});
  assert.equal(hook.status,0,hook.stderr);
  const args=JSON.parse(readFileSync(env.PROBE_ARGS,'utf8'));
  assert.equal(args[args.indexOf('-m')+1],'25');
  assert.equal(JSON.parse(hook.stdout).hookSpecificOutput.permissionDecision,'deny');
  console.log('PASS real guard configured for 4s uses proxy curl timeout 25s; immediate mock still returns semantic deny. No live request.');
} finally {rmSync(tmp,{recursive:true,force:true});}
