// Synthetic corpus IDs probe only writes inside a fresh /tmp test tree.
import fs from 'node:fs';
import path from 'node:path';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals';
const {setup,cli}=await import(`${root}/scripts/agent-evals/fixtures/helpers.mjs`);
const {digest}=await import(`${root}/scripts/agent-evals/lib/common.mjs`);
const s=setup();
const index=s.split.entries[0];
const bodyPath=path.join(s.croot,index.body),labelPath=path.join(s.croot,index.labels);
const episode=JSON.parse(fs.readFileSync(bodyPath,'utf8'));
episode.episodeId='../../../../independent-escaped-collection';
const labels=JSON.parse(fs.readFileSync(labelPath,'utf8'));
labels[0].episodeId=episode.episodeId; labels[0].sourceSha256=digest(episode);
index.episodeId=episode.episodeId;index.episodeSha256=digest(episode);index.labelSha256=digest(labels);
fs.writeFileSync(bodyPath,JSON.stringify(episode));fs.writeFileSync(labelPath,JSON.stringify(labels));
fs.writeFileSync(path.join(s.croot,'split.json'),JSON.stringify(s.split));
s.m.corpus.episodeIds=[episode.episodeId];s.m.corpus.splitSha256=digest(s.split);
fs.writeFileSync(s.manifestPath,JSON.stringify(s.m));
const expectedEscapes=['full','jev','core_discovery'].map(arm=>path.join(s.out,`raw/collection-${episode.episodeId}-${arm}.json`));
if(expectedEscapes.some(p=>!p.startsWith(s.root+'/'))) throw new Error('probe escaped synthetic scratch boundary');
const run=cli(s);
fs.writeFileSync(path.join(s.root,'cli.stdout.json'),run.stdout);fs.writeFileSync(path.join(s.root,'cli.stderr.txt'),run.stderr);
const summary={syntheticRoot:s.root,out:s.out,episodeId:episode.episodeId,exit:run.status,stderr:run.stderr,
  escaped:expectedEscapes.map(file=>({file,exists:fs.existsSync(file),outsideRun:!file.startsWith(s.out+'/')})),
  result:run.status===0?{status:JSON.parse(run.stdout).status,rawFiles:JSON.parse(run.stdout).rawFiles}:null};
fs.writeFileSync(path.resolve(import.meta.dirname,'../corpus-paths-result.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
