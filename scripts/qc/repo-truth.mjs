/** Read-only source inventory. Never reads env files or executes package scripts. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function safeSource(root, relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).some((p) => p === '..' || p.startsWith('.env'))) {
    throw new Error(`Unsafe source path: ${relative}`);
  }
  const absolute = path.resolve(root, relative);
  const real = fs.realpathSync(absolute);
  const base = fs.realpathSync(root);
  if (real !== base && !real.startsWith(base + path.sep)) throw new Error(`Source escapes root: ${relative}`);
  if (path.relative(base, real).split(path.sep).some((p) => p.startsWith('.env'))) throw new Error(`Source resolves to environment file: ${relative}`);
  return fs.readFileSync(real, 'utf8');
}

function git(directory, args) {
  try { return execFileSync('git', ['-C', directory, ...args], {encoding:'utf8', stdio:['ignore','pipe','ignore'], timeout:5000}).trim(); }
  catch { return null; }
}
function digest(text) { return createHash('sha256').update(text).digest('hex'); }
export function safeRemote(remote) {
  if (!remote) return null;
  if (/^https?:\/\//i.test(remote)) {
    try { const u = new URL(remote); u.username = ''; u.password = ''; u.search = ''; u.hash = ''; return u.toString(); }
    catch { return '[unparseable remote]'; }
  }
  return remote.startsWith('git@') ? remote : '[local or nonstandard remote]';
}

const evidence = [
  ['hub-legacy-db','minion_hub/src/server/db/client.ts',['drizzle-orm/libsql','TURSO_DB_URL'],'Legacy LibSQL client remains available; its local default does not initialize PostgreSQL domains.'],
  ['hub-postgres-db','minion_hub/src/server/db/pg-client.ts',['drizzle-orm/postgres-js','@minion-stack/db/pg'],'Hub has a separate PostgreSQL core client.'],
  ['hub-postgres-config','minion_hub/src/server/db/pg-pool.ts',['SUPABASE_DB_URL','SUPABASE_DB_POOL_SIZE'],'PostgreSQL pool configuration is independent of the legacy LibSQL URL.'],
  ['hub-identity','minion_hub/src/server/auth/resolve-identity.ts',['resolveViaSupabase(event)','resolveViaMetricsBearer(event)'],'Hub browser identity uses Supabase; selected gateway push paths have a separate bearer provider.'],
  ['site-identity','minion_site/src/hooks.server.ts',["AUTH_PROVIDER === 'supabase'",'getAuth()'],'Site retains conditional Supabase and legacy Better Auth paths; the deployed selection is not inferred.'],
  ['site-legacy-db','minion_site/src/server/db/client.ts',['drizzle-orm/libsql','TURSO_DB_URL'],'Site retains legacy LibSQL data access.'],
  ['db-exports','packages/db/package.json',['"./schema"','"./pg"'],'The shared DB package has separate legacy schema and PostgreSQL exports; physical table counts require a catalog.'],
];

export function inspectRepository(root, relative, registration = null) {
  const directory = path.resolve(root, relative);
  let pkg = null;
  if (fs.existsSync(path.join(directory,'package.json'))) pkg = JSON.parse(safeSource(root,path.join(relative,'package.json')));
  const ownGit = fs.existsSync(path.join(directory,'.git'));
  return {path:relative, registration, present:fs.existsSync(directory), independentGit:ownGit,
    head:ownGit ? git(directory,['rev-parse','HEAD']) : null,
    localBranch:ownGit ? git(directory,['branch','--show-current']) : null,
    dirty:ownGit ? Boolean(git(directory,['status','--porcelain','--untracked-files=no'])) : null,
    remote:ownGit ? safeRemote(git(directory,['remote','get-url','origin'])) : null,
    package:pkg ? {name:pkg.name ?? null,version:pkg.version ?? null,packageManager:pkg.packageManager ?? null,scripts:pkg.scripts ?? {},sha256:digest(safeSource(root,path.join(relative,'package.json')))} : null,
    confidence:ownGit ? 'local-source-identity-only' : 'not-an-independent-checkout'};
}

export function buildManifest(root) {
  const registry = JSON.parse(safeSource(root,'minion.json'));
  if (!registry.subprojects || typeof registry.subprojects !== 'object') throw new Error('Missing subproject registry');
  const registered = Object.entries(registry.subprojects);
  const entries = new Map([['.',null]]);
  for (const [id,r] of registered) {
    if (typeof r.path !== 'string' || path.isAbsolute(r.path) || r.path.split(/[\\/]/).includes('..')) throw new Error(`Invalid registered path: ${id}`);
    entries.set(r.path,{id,declaredBranch:r.branch,packageManager:r.packageManager,commands:r.commands ?? {}});
  }
  for (const d of fs.readdirSync(root,{withFileTypes:true})) {
    if (d.isDirectory() && fs.existsSync(path.join(root,d.name,'.git')) && !entries.has(d.name)) entries.set(d.name,null);
  }
  const facts=evidence.map(([id,p,markers,claim])=>{
    try { const source=safeSource(root,p); const missing=markers.filter(m=>!source.includes(m)); return {id,path:p,sha256:digest(source),markers,missing,claim,confidence:missing.length?'needs-review':'source-pattern-observed'}; }
    catch { return {id,path:p,claim,confidence:'unavailable'}; }
  });
  return {generatedAt:new Date().toISOString(),scope:'Local registry, checkout and source inventory; no deployment or physical-catalog certification.',registeredCount:registered.length,repositories:[...entries].map(([p,r])=>inspectRepository(root,p,r)),facts};
}

export function checkDocs(root, manifest) {
  const errors=[];
  for (const f of manifest.facts) if(f.confidence!=='source-pattern-observed') errors.push(`Recheck source fact ${f.id}: ${f.confidence}`);
  const targets=['AGENTS.md','README.md','minion_hub/CLAUDE.md','minion_site/CLAUDE.md'];
  for(const p of targets) {
    const text=safeSource(root,p);
    for(const [pattern,label] of [[/wrap(?:s|ped) (?:around )?7 independent subprojects/i,'stale total repository count'],[/Canonical Drizzle schema \(38 tables\)/,'stale fixed schema count'],[/Production: Turso\. Auth: Better Auth/,'unqualified single storage/auth claim'],[/fall back to the first tenant in the DB|Unauthenticated fallback pattern|from\((?:tenants|organizations)\)\s*\.limit\(1\)/,'unsafe tenant fallback advice'],[/~\/CODE\/AI\/minion-shared/,'retired shared package path']]) {
      if(pattern.test(text)) errors.push(`${p}: ${label}`);
    }
    const repo=p.startsWith('minion_hub/')?'minion_hub':p.startsWith('minion_site/')?'minion_site':null;
    if(repo) {
      const pkg=JSON.parse(safeSource(root,repo+'/package.json'));
      for(const match of text.matchAll(/\bbun run ([\w:-]+)/g)) {
        const name=match[1];
        if(!pkg.scripts?.[name] && !pkg.dependencies?.[name] && !pkg.devDependencies?.[name]) errors.push(`${p}: undeclared script/binary ${name}`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.some(a=>!['--check-docs','--help'].includes(a))) { console.error('Unknown option; use --help'); process.exitCode=2; }
  else if(args.includes('--help')) console.log('node scripts/qc/repo-truth.mjs [--check-docs]\nWithout options, writes a source-only planning manifest. --check-docs validates current sources/docs without executing their commands.');
  else {
    const root=fileURLToPath(new URL('../../',import.meta.url));
    const manifest=buildManifest(root);
    if(args.includes('--check-docs')) {
      const errors=checkDocs(root,manifest); errors.forEach(e=>console.error(e));
      if(errors.length) process.exitCode=1;
      else console.log(`PASS: ${manifest.registeredCount} registry entries; ${manifest.facts.length} source facts; active doc commands checked. No runtime qualification.`);
    } else {
      const output=path.join(root,'.planning/phases/18-docs-governance/18-REPO-TRUTH.json');
      fs.writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
      console.log(`Wrote ${path.relative(root,output)}; ${manifest.repositories.length} local entries, ${manifest.registeredCount} registered. No env files read or package scripts executed.`);
    }
  }
}
