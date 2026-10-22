// Run with tsx loader against the pinned Factory snapshot; fetch is fully stubbed.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
async function main(){
 const root=path.resolve(process.argv[2]);
 const {mintJevCapability,handleJevDecideRequest}=await import(pathToFileURL(path.join(root,'runner/src/jev-proxy.ts')).href);
 const tmp=mkdtempSync(path.join(tmpdir(),'minion-budget-probe-'));
 process.env.FACTORY_DATA=tmp;
 process.env.FACTORY_OPENROUTER_API_KEY='offline-fixture';
 process.env.FACTORY_JEV_RUN_MAX_CALLS='1';
 let calls=0; let release!:()=>void;
 const barrier=new Promise<void>(r=>{release=r});
 const timer=setTimeout(()=>release(),2000);
 globalThis.fetch=async()=>{calls++; if(calls===2)release(); await barrier; return new Response(JSON.stringify({model:'fixture',answers:{q:{type:'noul',noul:0.5}},usage:{input_tokens:1,output_tokens:0,cost:0.0001}}),{status:200});};
 try{
  const token=mintJevCapability('concurrency-fixture');
  const body={site:'rank',state:{},questions:{q:{type:'noul',instructions:'fixture'}}};
  const results=await Promise.all([handleJevDecideRequest(token,body),handleJevDecideRequest(token,body)]);
  assert.deepEqual(results.map(r=>r.status),[200,200]);
  assert.equal(calls,2);
  assert.equal((await handleJevDecideRequest(token,body)).status,429);
  console.log('PASS per-run max_calls=1 admits two concurrent mocked upstream calls; subsequent call is rejected.');
 }finally{clearTimeout(timer);rmSync(tmp,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1});
