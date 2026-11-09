const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const c='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway';
const r='/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches';
const req=require('node:module').createRequire(path.join(c,'package.json'));const JSON5=req('json5'),ts=req('typescript'),{Ajv}=req('ajv');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const old=p=>cp.execFileSync('git',['show','53726013ba7347d0488478272df44561cf4b5c5d:'+p],{cwd:c,encoding:'utf8'});
const read=p=>fs.readFileSync(path.join(c,p),'utf8');
const fixtures=['extensions/alert-watcher/src/fixtures/complaint-evaluation-v1.json','extensions/alert-watcher/src/fixtures/complaint-retry-revisions-v1.json','src/gateway/test-support/fixtures/pulse-cron-wire-v1.json'];
const schema=JSON.parse(read('extensions/alert-watcher/src/complaint-evaluation.schema.json'));const validate=new Ajv({strict:false,validateFormats:false}).compile(schema);
const result={fixtures:[],commentOnly:[],loaders:[],regeneration:{}};
for(const file of fixtures){const current=file+'c',before=old(file),after=read(current),decoded=JSON5.parse(after);assert.deepEqual(decoded,JSON.parse(before));
 const strict=JSON.stringify(decoded,null,2)+'\n';const canonical=file.includes('pulse-cron')?strict:cp.execFileSync(path.join(c,'node_modules/.bin/oxfmt'),['--stdin-filepath',file],{input:strict,encoding:'utf8',cwd:c});assert.equal(canonical,before);
 const lines=after.split('\n');const comments=[];for(let i=0;i<lines.length;i++){if(!lines[i].includes('pragma: allowlist'))continue;assert.match(lines[i],/^\s*\/\/ pragma: allowlist nextline secret -- public /);const key=/^\s*"([^"]+)": "([a-f0-9]+)",?$/.exec(lines[i+1]);assert(key,'annotation must target one exact string property');assert(['logicalSourceId','authorityNamespaceHash','inputHash','policyHash','defaultPolicyHash','sourceHead','sourcePatchSha256'].includes(key[1]));assert([40,64].includes(key[2].length));comments.push({line:i+1,key:key[1]});}
 if(Array.isArray(decoded))for(const x of decoded)assert(validate(x),JSON.stringify(validate.errors));
 if(file.includes('retry')){assert.equal(decoded.length,18);const regenerated=strict.replace(/^(\s*)"(?:logicalSourceId|authorityNamespaceHash|inputHash|policyHash|defaultPolicyHash)":/gm,'$1// pragma: allowlist nextline secret -- public fixture identity, input or policy digest\n$&');assert.deepEqual(JSON5.parse(regenerated),decoded);assert.equal((regenerated.match(/pragma: allowlist nextline secret/g)||[]).length,90);result.regeneration={records:18,narrowAnnotations:90,decodedEqual:true};}
 if(file.includes('pulse-cron')){assert.equal(hash(strict),'63be47ba3e431c6079f314059736fa3013dc6e5c23bbda23a048487293ee215b');assert.equal(strict,fs.readFileSync(path.join(r,'development/d-pulse/pulse-cron-wire.json'),'utf8'));assert.equal(decoded.requests.length,2);}
 result.fixtures.push({file:current,decodedEqual:true,strictReconstructionEqualsCommittedOriginal:true,strictOriginalSha256:hash(canonical),sourceSha256:hash(after),records:Array.isArray(decoded)?decoded.length:undefined,comments});
}
function tree(s){return ts.createSourceFile('fixture.ts',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)}
function tokens(s){let out=[];let sf=tree(s);function visit(n){let children=n.getChildren(sf);if(!children.length&&n.kind!==ts.SyntaxKind.EndOfFileToken)out.push([n.kind,n.getText(sf)]);children.forEach(visit)}visit(sf);return out}
for(const p of ['extensions/alert-watcher/src/authority.test.ts','extensions/alert-watcher/src/usage-finalization.test.ts','extensions/alert-watcher/test-support/suggestion-process.ts','src/drones/host.test.ts']){assert.deepEqual(tokens(read(p)),tokens(old(p)));result.commentOnly.push({path:p,allLeafTokensUnchanged:true});}
const printer=ts.createPrinter({removeComments:true});
function assertions(s){let sf=tree(s),out=[];function visit(n){if(ts.isExpressionStatement(n)&&/^(await\s+)?expect\(/.test(n.getText(sf))){let text=printer.printNode(ts.EmitHint.Unspecified,n,sf);if(text.startsWith('expect(records).toEqual('))text=text.replace('JSON5.parse','JSON.parse');out.push(text);}ts.forEachChild(n,visit)}visit(sf);return out;}
for(const p of ['extensions/alert-watcher/src/receipt-export-revisions.test.ts','src/gateway/server-core/server-cron.binding.test.ts']){const before=assertions(old(p)),after=assertions(read(p));assert.deepEqual(after,before);assert.equal((read(p).match(/import JSON5 from "json5"/g)||[]).length,1);result.loaders.push({path:p,assertionStatements:after.length,allAssertionsIdenticalExceptApprovedFixtureDecoder:true});}
assert.equal(JSON.parse(read('package.json')).dependencies.json5,'^2.2.3');
fs.writeFileSync(path.join(__dirname,'independent-equivalence.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({fixtures:result.fixtures.map(x=>({file:x.file,sha:x.strictOriginalSha256,comments:x.comments.length})),commentOnlyFiles:result.commentOnly.length,loaders:result.loaders,regeneration:result.regeneration}));
