// Verify source anchors, Markdown links, snapshot drift and review-script syntax.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const errors=[];let links=0;
for(const file of [...readdirSync(here).filter(x=>x.endsWith('.md')).map(x=>join(here,x)),join(root,'proposals/2026-09-20-hub-component-service-centralization.md')]){
 const text=readFileSync(file,'utf8');
 // Local links use inline Markdown; consume balanced parentheses in route paths.
 for(const match of text.matchAll(/\]\(/g)){
  let i=match.index+2,depth=1,url='';
  for(;i<text.length&&depth;i++){
   const c=text[i];if(c==='(')depth++;if(c===')')depth--;
   if(depth)url+=c;
  }
  url=url.trim().replace(/^<|>$/g,'');
  if(!url||/^(https?:|#)/.test(url))continue;
  links++;if(!existsSync(resolve(dirname(file),decodeURIComponent(url.split('#')[0]))))errors.push({file:relative(root,file),link:url});
 }
 text.split('\n').forEach((line,i)=>{if(line.trimEnd()!==line)errors.push({file:relative(root,file),whitespaceLine:i+1});});
}
const inventory=JSON.parse(readFileSync(join(here,'inventory.json'),'utf8'));
const changed=[];
for(const [path,hash] of Object.entries(inventory.source_hashes)){
 const full=join(root,path);
 if(!existsSync(full)||createHash('sha256').update(readFileSync(full,'utf8')).digest('hex')!==hash)changed.push(path);
}
for(const f of JSON.parse(readFileSync(join(here,'findings.json'),'utf8'))){
 const m=f.source.match(/^(.*):(\d+)$/);const file=join(root,'minion_hub',m[1]);
 if(!existsSync(file)||Number(m[2])>readFileSync(file,'utf8').split('\n').length)errors.push({finding:f.id,anchor:f.source});
}
const html=readFileSync(join(root,'.lavish/hub-centralization-2026-09-20.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const js=spawnSync(process.execPath,['--check','--input-type=commonjs'],{input:scripts,encoding:'utf8'});
if(js.status!==0)errors.push({javascript:js.stderr});
const result={checked_at:new Date().toISOString(),links_checked:links,errors,source_files_changed_since_scan:changed,javascript_syntax:js.status===0?'pass':'fail',hub_head_now:execFileSync('git',['-C',join(root,'minion_hub'),'rev-parse','HEAD'],{encoding:'utf8'}).trim(),limits:'Static documentation/source checks only; no browser layout or Hub runtime tests.'};
writeFileSync(join(here,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
if(errors.length||changed.length)process.exitCode=1;
