import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {safeSource,safeRemote,inspectRepository,checkDocs} from './repo-truth.mjs';
function fixture(fn) { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'minion-doc-truth-'));try{return fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});} }
test('source reader rejects env, traversal and escaping symlink',()=>fixture(root=>{
 fs.mkdirSync(path.join(root,'inner'));fs.writeFileSync(path.join(root,'plain.txt'),'public');
 fs.symlinkSync('/etc/hostname',path.join(root,'outside'));
 fs.writeFileSync(path.join(root,'.env.local'),'SYNTHETIC_ONLY');
 fs.symlinkSync('.env.local',path.join(root,'env-alias.txt'));
 assert.throws(()=>safeSource(root,'env-alias.txt'),/environment file/);
 assert.throws(()=>safeSource(root,'.env.local'));assert.throws(()=>safeSource(root,'../secret'));assert.throws(()=>safeSource(root,'outside'));
 assert.equal(safeSource(root,'plain.txt'),'public');
}));
test('remote inventory never returns HTTP credentials or query tokens',()=>{
 assert.equal(safeRemote('https://user:secret@example.test/a.git?token=secret#x'),'https://example.test/a.git');
 assert.equal(safeRemote('git@github.com:owner/repo.git'),'git@github.com:owner/repo.git');
 assert.equal(safeRemote('/private/local'),'[local or nonstandard remote]');
});
test('nested source directory does not inherit enclosing git identity',()=>fixture(root=>{
 fs.mkdirSync(path.join(root,'ordinary'));fs.writeFileSync(path.join(root,'ordinary/package.json'),JSON.stringify({name:'fixture',scripts:{test:'never execute'}}));
 const record=inspectRepository(root,'ordinary');assert.equal(record.independentGit,false);assert.equal(record.head,null);assert.equal(record.package.scripts.test,'never execute');
}));
test('doc checker rejects stale authority, missing evidence and absent commands',()=>fixture(root=>{
 for(const repo of ['minion_hub','minion_site']) {fs.mkdirSync(path.join(root,repo));fs.writeFileSync(path.join(root,repo,'package.json'),JSON.stringify({scripts:{check:'never execute'}}));fs.writeFileSync(path.join(root,repo,'CLAUDE.md'),'bun run check');}
 fs.writeFileSync(path.join(root,'README.md'),'Current source only');fs.writeFileSync(path.join(root,'AGENTS.md'),'Current source only');
 assert.deepEqual(checkDocs(root,{facts:[]}),[]);
 fs.writeFileSync(path.join(root,'minion_hub/CLAUDE.md'),'bun run missing\nAPI routes fall back to the first tenant in the DB.');
 const errors=checkDocs(root,{facts:[{id:'missing',confidence:'unavailable'}]});
 assert.equal(errors.length,3);assert.ok(errors.some(e=>e.includes('undeclared')));assert.ok(errors.some(e=>e.includes('unsafe')));
}));

test('doc checker catches executable first-tenant fallback example',()=>fixture(root=>{
 for(const repo of ['minion_hub','minion_site']) {fs.mkdirSync(path.join(root,repo));fs.writeFileSync(path.join(root,repo,'package.json'),'{}');fs.writeFileSync(path.join(root,repo,'CLAUDE.md'),'Current');}
 fs.writeFileSync(path.join(root,'README.md'),'Current');fs.writeFileSync(path.join(root,'AGENTS.md'),'Current');
 fs.writeFileSync(path.join(root,'minion_hub/CLAUDE.md'),'async function ctx() { const rows = await db.select().from(tenants).limit(1); return rows[0]; }');
 assert.ok(checkDocs(root,{facts:[]}).some(e=>e.includes('unsafe tenant fallback')));
}));
