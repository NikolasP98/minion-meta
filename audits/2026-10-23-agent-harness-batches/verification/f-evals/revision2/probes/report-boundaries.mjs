// Independent public-CLI review probe. All state and inputs are synthetic and disposable.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals';
const evidence = path.resolve(import.meta.dirname, '..');
const { setup, cli } = await import(`${root}/scripts/agent-evals/fixtures/helpers.mjs`);
const work = fs.mkdtempSync('/tmp/f-independent-report-');
const commands = [];
function report(args, name) {
  const command = [process.execPath, `${root}/scripts/agent-evals/report.mjs`, ...args];
  const r = spawnSync(command[0], command.slice(1), { cwd: root, env: { PATH: process.env.PATH }, encoding: 'utf8', timeout: 20000 });
  fs.writeFileSync(path.join(work, `${name}.stdout.json`), r.stdout);
  fs.writeFileSync(path.join(work, `${name}.stderr.txt`), r.stderr);
  commands.push({command, exit: r.status, stdout: path.join(work, `${name}.stdout.json`), stderr: r.stderr});
  if (r.status !== 0) throw new Error(`${name}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}
const observations = [];
for (let i = 0; i < 60; i++) for (const arm of ['full','jev','core_discovery']) observations.push({
  episodeId: `episode-${i}`, clusterId: `cluster-${i}`, arm, repeat: 0,
  cohort: { source: 'independent-synthetic', model: 'frozen', rubric: 'review-v1' },
  outcome: 'success', costMicroUsd: 100, upperMicroUsd: 100, costStatus: 'known',
  latencyMs: 100, complete: true, critical: [], labelMethod: 'human_adjudicated'
});
const input = {version: 1, observations, seed: 17, minimumClusters: 60, humanCorpusReady: true,
  expectedEpisodes: Array.from({length:60}, (_,i)=>`episode-${i}`), repeatAggregation: 'all_repeats',
  preregistration: {stopping:'two matched repeats per arm', expansion:'none'}};
// Every baseline has two repeats; both candidate arms are missing the entire second repeat.
input.observations.push(...observations.filter(o => o.arm === 'full').map(o=>({...o,repeat:1})));
const inputFile = path.join(work,'unmatched-repeats.json');
fs.writeFileSync(inputFile,JSON.stringify(input));
const repeats = report(['--input',inputFile], 'unmatched-repeats');

// Explicit repeated-trial estimand: repeated observations have matched IDs in all arms.
const matched = structuredClone(input);
matched.observations = [];
matched.preregistration.stopping = 'fixed matched repeats; each repeat is a started trial; successful trials each count; resample whole episode clusters';
for (let i=0;i<60;i++) for(const arm of ['full','jev','core_discovery']) for(let repeat=0;repeat<(i<30?2:1);repeat++) {
  matched.observations.push({...observations[0],episodeId:`episode-${i}`,clusterId:`cluster-${i}`,arm,repeat,
    costMicroUsd:arm==='full'?100:50,upperMicroUsd:arm==='full'?100:50,
    outcome:arm==='full'||repeat===0?'success':'incorrect'});
}
const matchedPath=path.join(work,'matched-repeat-trials.json');
fs.writeFileSync(matchedPath,JSON.stringify(matched));
const matchedResult=report(['--input',matchedPath],'matched-repeat-trials');

const s = setup();
const fixture = cli(s);
commands.push({command:'actual run.mjs fixture CLI via test fixture setup', exit: fixture.status, out:s.out, stderr:fixture.stderr});
if (fixture.status !== 0) throw new Error(fixture.stderr);
const clean = report(['--run',s.out], 'clean-run');
const receiptPath = path.join(s.out,'receipts.jsonl');
const original = fs.readFileSync(receiptPath,'utf8');
const records = original.trim().split('\n').map(JSON.parse);
const changed = records.filter(r=>r.kind==='provider_settled');
for (const r of changed) {r.rootId=crypto.randomUUID();r.submissionId=crypto.randomUUID();r.parentId=crypto.randomUUID();r.clusterId='foreign-cluster';}
fs.writeFileSync(receiptPath,records.map(JSON.stringify).join('\n')+'\n');
const foreign = report(['--run',s.out], 'foreign-provider-lineage');
const unknownRecords=original.trim().split('\n').map(JSON.parse);
for(const r of unknownRecords.filter(r=>r.kind==='provider_settled')) {
 r.payload.costStatus='unknown';r.payload.costMicroUsd=null;r.payload.exactCostUsd=null;r.payload.upperMicroUsd=null;
}
fs.writeFileSync(receiptPath,unknownRecords.map(JSON.stringify).join('\n')+'\n');
const unknown=report(['--run',s.out],'unknown-bill-cached-known');
const summary = {work, commands,
 unmatchedRepeats: {status:repeats.status,jev:repeats.cohorts[0].comparisons.jev, arms:repeats.cohorts[0].arms},
 matchedRepeatTrials:{expectedFromPreregisteredTrials:{startedPerArm:90,baselineSuccesses:90,candidateSuccesses:60,baselineCostMicroUsd:9000,candidateCostMicroUsd:4500,baselineCpsMicroUsd:100,candidateCpsMicroUsd:75,successDifference:-1/3,cpsRatio:0.75},actual:matchedResult.cohorts[0]},
 unknownBills:{arms:unknown.cohorts[0].arms,reasons:unknown.cohorts[0].comparisons.jev.reasons},
 foreignProviderLineage:{changedReceipts:changed.length,cleanArms:clean.cohorts[0].arms,foreignArms:foreign.cohorts[0].arms,reasons:foreign.cohorts[0].comparisons.jev.reasons}}
fs.writeFileSync(path.join(evidence,'report-boundaries-result.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
