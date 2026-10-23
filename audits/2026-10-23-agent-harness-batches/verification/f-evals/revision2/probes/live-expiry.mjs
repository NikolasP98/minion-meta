// Uses only disposable test trust and an in-process fetch replacement; never sends network.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals';
const { liveSetup } = await import(`${root}/scripts/agent-evals/fixtures/helpers.mjs`);
const { canonical } = await import(`${root}/scripts/agent-evals/lib/common.mjs`);
const s = liveSetup();
const scenario = process.argv[2] ?? 'elapsed';
const approval = JSON.parse(fs.readFileSync(s.approvalPath,'utf8'));
approval.payload.expiresAt = new Date(Date.now()+(scenario==='after-reservation-fsync'?60000:750)).toISOString();
approval.signature = crypto.sign(null,Buffer.from(canonical(approval.payload)),s.pair.privateKey).toString('base64');
fs.writeFileSync(s.approvalPath,JSON.stringify(approval));
const preload = path.join(s.root,'independent-denied-network-preload.mjs');
fs.writeFileSync(preload, `import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
const deny = () => { throw Error('external network forbidden'); };
net.Socket.prototype.connect=deny; http.request=deny; https.request=deny;
if(process.env.TEST_SCENARIO==='after-reservation-fsync') {
 const RealDate=Date;let forced=null;
 globalThis.Date=class extends RealDate {constructor(...a){super(...(a.length?a:[forced??RealDate.now()]));}static now(){return forced??RealDate.now();}};
 const write=fs.writeSync.bind(fs),sync=fs.fsyncSync.bind(fs),pending=new Set();
 fs.writeSync=(fd,...args)=>{const result=write(fd,...args);if(String(args[0]).includes('"kind":"reserved"'))pending.add(fd);return result;};
 fs.fsyncSync=fd=>{const result=sync(fd);if(pending.delete(fd))forced=Number(process.env.TEST_EXPIRES)+1;return result;};
}
globalThis.fetch=async(url,o)=>{
 if (url!=='https://openrouter.ai/api/v1/chat/completions') throw Error('unallowlisted wire');
 const body=JSON.parse(o.body); if(o.redirect!=='error'||body.provider.allow_fallbacks!==false) throw Error('provider safety shape');
 const entries=fs.readFileSync(process.env.TEST_JOURNAL,'utf8').trim().split('\\n').map(JSON.parse);
 if(entries.at(-1).kind!=='dispatched'||!entries.some(e=>e.kind==='reserved'&&e.attemptId===entries.at(-1).attemptId)) throw Error('dispatch lacks durable reservation');
 fs.appendFileSync(process.env.TEST_COUNTER,JSON.stringify({at:Date.now(),url,lastJournalKind:entries.at(-1).kind})+'\\n');
 await new Promise(r=>setTimeout(r,400));
 return Response.json({model:body.model,choices:[{message:{content:'fixture answer'}}],usage:{prompt_tokens:2,completion_tokens:2,cost:0.000001}});
};\n`);
const command=[process.execPath,'--import',preload,`${root}/scripts/agent-evals/run.mjs`,
 '--live','--manifest',s.manifestPath,'--hub-root',s.hub,'--out',s.out,
 '--approval',s.approvalPath,'--operator-config',s.configPath,'--trusted-key',s.keyPath,
 '--owner-ref','test-owner','--credential-file',s.credentialFile];
const startedAt=Date.now();
const r=spawnSync(command[0],command.slice(1),{cwd:root,env:{PATH:process.env.PATH,HOME:process.env.HOME,TEST_COUNTER:s.counter,TEST_JOURNAL:s.config.journalPath,TEST_SCENARIO:scenario,TEST_EXPIRES:String(Date.parse(approval.payload.expiresAt))},encoding:'utf8',timeout:15000});
fs.writeFileSync(path.join(s.root,'cli.stdout.json'),r.stdout);
fs.writeFileSync(path.join(s.root,'cli.stderr.txt'),r.stderr);
const calls=fs.readFileSync(s.counter,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const summary={scenario,command,exit:r.status,stderr:r.stderr,startedAt,expiresAt:approval.payload.expiresAt,syntheticRoot:s.root,calls,
  requestsAfterExpiry:calls.filter(c=>c.at>=Date.parse(approval.payload.expiresAt)).length,
  result:r.status===0?{status:JSON.parse(r.stdout).status,paidRequests:JSON.parse(r.stdout).paidRequests}:null,
  actualExternalRequests:0,actualPaidRequests:0};
fs.writeFileSync(path.resolve(import.meta.dirname,`../live-expiry-${scenario==='elapsed'?'result':'after-fsync-result'}.json`),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
