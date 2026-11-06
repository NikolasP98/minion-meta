import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire('/home/nikolas/Documents/CODE/MINION/minion_hub/package.json');
const ts = require('typescript');
const hub='/tmp/minion-agent-validation-20261022-blbb_5vg/minion_hub';
const read=p=>fs.readFileSync(`${hub}/${p}`,'utf8');
const transpile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
const home=read('src/routes/(app)/home/+page.svelte');
const handle=home.slice(home.indexOf('  function handleSubmit('),home.indexOf('  // ─── Per-message actions'));
function homeHarness(){
 const d=deferred(), sends=[];
 const make=new Function('requestRouteDecision','sendAssistantTurn',transpile(`let agentId='agent-a',chat={sessionKey:'thread-a'},conn={connected:true},routing=false; const languageTag=()=> 'en'; const gateManifests=()=>new Set(); const routerMode=()=> 'enforce'; const buildAssistantContext=()=> 'context'; ${handle}; return {handleSubmit,change:(a,s)=>{agentId=a;chat.sessionKey=s}};`));
 return {d,sends,...make(()=>d.promise,(...args)=>sends.push(args))};
}
let h=homeHarness();h.handleSubmit('book in thread A','ask');h.change('agent-a','thread-b');h.d.resolve(null);await flush();assert.equal(h.sends[0][3],'thread-b');
console.log('CONFIRMED /home pending route migrates original text from thread-a to thread-b');
h=homeHarness();h.handleSubmit('book for agent A','ask');h.change('agent-b','thread-b');h.d.resolve(null);await flush();assert.equal(h.sends[0][0],'agent-b');
console.log('CONFIRMED /home pending route adopts a changed personalAgentId');
const floating=read('src/lib/components/layout/FloatingAssistant.svelte');
const send=floating.slice(floating.indexOf('  async function send()'),floating.indexOf('  function stopFactoryPolling()'));
const stop=floating.slice(floating.indexOf('  function stopReply()'),floating.indexOf('  function copyAction('));
function floatingHarness(){
 const d=deferred(),sends=[],aborts=[];
 const make=new Function('requestRouteDecision','sendAssistantTurn','abortChat',transpile(`let composerMode='chat',canSend=true,draft='original request',stagedFiles=[],routing=false,lastMode=null;const assistant={personalAgentId:'agent-a'};let key='thread-a',path='/stock'; const preferenceOwner=()=> 'org:actor';const fileDraftContext=async()=>'';const canonicalPath=x=>x;const page={url:{get pathname(){return path}}};const languageTag=()=> 'en';const m={shell_drop_assistant:()=>'',shell_drop_failed:()=>''};const gateManifests=()=>new Set();const routerMode=()=> 'enforce';const toastError=()=>{};const buildAssistantContext=()=>path;const sessionKeyFor=()=>key;const submitFactoryIntake=()=>{};${send};${stop};return {send,stopReply,change:(k,p)=>{key=k;path=p}};`));
 return {d,sends,aborts,...make(()=>d.promise,(...args)=>sends.push(args),(...args)=>aborts.push(args))};
}
let f=floatingHarness();let pending=f.send();await flush();f.stopReply();f.d.resolve(null);await pending;assert.equal(f.aborts.length,1);assert.equal(f.sends.length,1);
console.log('CONFIRMED Floating Stop during classifier await aborts nonexistent run then sends original request');
f=floatingHarness();pending=f.send();await flush();f.change('thread-b','/sandbox');f.d.resolve(null);await pending;assert.equal(f.sends[0][3],'thread-b');assert.equal(f.sends[0][2],'/sandbox');
console.log('CONFIRMED Floating pending route adopts changed thread and context page');
const obs=read('src/lib/server/observability-context.ts');
const obsmod={exports:{}};new Function('require','exports',transpile(obs))(require,obsmod.exports);
const props=obsmod.exports.sanitizeEventProperties({assistant_mode:'chat',p_sandbox:0.99,p_pages:0.5},'assistant_route');
assert.equal(props.p_pages,0.5);assert.equal(props.p_sandbox,undefined);
console.log('CONFIRMED assistant_route p_sandbox is silently dropped by telemetry sanitizer');
const ident=obsmod.exports.requestIdentity({routeId:'/api/assistant/route',method:'POST',headers:{get:()=>null},locals:{orgId:'o',user:{id:'u'}}});assert.equal(ident.agent_run_id,null);
console.log('CONFIRMED route request without run header has no agent_run_id correlation');
