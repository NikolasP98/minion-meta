import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import postgres from '/home/nikolas/.cache/codex-work/hub-org-role-templates-20261112/node_modules/postgres';
const root='/home/nikolas/.cache/codex-work/hub-org-role-templates-20261112';
const expected='da51646cbe5bc4d03b52feec566a8be4a332217f';
const path='src/server/services/organization-bootstrap.service.ts';
const source=readFileSync(root+'/'+path,'utf8');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==expected)throw Error('Unexpected candidate');
if(execFileSync('git',['show',expected+':'+path],{cwd:root,encoding:'utf8'})!==source)throw Error('Source differs from approved candidate');
const capChunk=root+'/.svelte-kit/output/server/chunks/rbac.service.js';
const compiledCapsSha256=createHash('sha256').update(readFileSync(capChunk)).digest('hex');
if(compiledCapsSha256!=='29223d55d19e0e9ccc1318f27ca4faaa469d3feb44fc75bb71940b75aacdf8b8')throw Error('Unexpected compiled capability artifact');
for(const canonical of ['src/server/services/rbac.service.ts','src/lib/permissions.ts']){
 const current=readFileSync(root+'/'+canonical,'utf8');
 if(current!==execFileSync('git',['show',expected+':'+canonical],{cwd:root,encoding:'utf8'})||current!==execFileSync('git',['show','99341e7074541360eadcf2dcd32e67494f3c65ad:'+canonical],{cwd:root,encoding:'utf8'}))throw Error('Capability source provenance changed');
}
const caps=await import(root+'/.svelte-kit/output/server/chunks/rbac.service.js');
if(JSON.stringify(caps.i)!==JSON.stringify(['overview','crm','finance','sales','scheduling','support','projects','memberships','comms','brains','stock','ads','pos','pulse','agents','channels','flows','marketplace','reliability','workspace','settings','users','roles','tools'])||JSON.stringify(caps.t)!==JSON.stringify(['view','create','edit','delete','export','manage']))throw Error('Unexpected canonical module/action inventory');
for(const module of caps.i){
 if(caps.f(module)!==(['crm','finance','scheduling'].includes(module)?1:0))throw Error('Unexpected Administrator field defaults');
 for(const action of caps.t)if(caps.d('admin',module)[action]!== (module!=='overview'||action==='view'))throw Error('Unexpected Administrator action defaults');
}
const compiled=new Bun.Transpiler({loader:'ts'}).transformSync(source).replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
const bootstrap=new Function('randomUUID','MODULES','ACTIONS','defaultCaps','defaultFieldLevel','getPgClient',compiled+'\nreturn bootstrapOrganization;')(randomUUID,caps.i,caps.t,caps.d,caps.f,()=>{throw Error('Explicit transaction required')});
const report={candidate:expected,compiledCapsSha256,sourceSha256:createHash('sha256').update(source).digest('hex'),moduleCount:caps.i.length,checkedAt:new Date().toISOString(),scope:'canonical bootstrap inside one transaction with mandatory rollback; no external provisioning',result:'not run'};
if(!process.argv.includes('--run')){console.log(JSON.stringify(report));process.exit(0)}
const env=Object.fromEntries(readFileSync('/tmp/role113-production.env','utf8').split('\n').filter(x=>x&&!x.startsWith('#')&&x.includes('=')).map(x=>{const i=x.indexOf('=');let v=x.slice(i+1);if(v.startsWith('"'))v=JSON.parse(v);return[x.slice(0,i),v]}));
if(!env.SUPABASE_DB_URL?.trim())throw Error('Explicit production URL required');
const target=new URL(env.SUPABASE_DB_URL);
if(!['postgres:','postgresql:'].includes(target.protocol))throw Error('PostgreSQL URL required');
const targetIdentity=target.protocol+'//'+target.username+'@'+target.hostname+':'+target.port+target.pathname;
const targetIdentitySha256=createHash('sha256').update(targetIdentity).digest('hex');
if(targetIdentitySha256!=='8c65ef68e4fe9d2a797ed0b2c10476124d987981c4451d96b7381dc94f0a88fe')throw Error('Production target identity differs from Vercel-linked preflight');
Object.assign(report,{targetIdentitySha256});
const sql=postgres(env.SUPABASE_DB_URL,{prepare:false,max:1,onnotice:()=>{}});
const id=randomUUID(),slug='release-role113-'+randomUUID();const rollback=new Error('owned postflight rollback');
let verified=false;
try{
 try{await sql.begin(async tx=>{
  await tx`set local statement_timeout='10s'`;await tx`set local lock_timeout='2s'`;
  const [identity]=await tx`select current_database() as database,current_user as role`;
  if(identity.database!=='postgres'||identity.role!=='postgres')throw Error('Unexpected production database/role');
  const versions=await tx`select version from hub_migrations where version in ('20261112010000','20261112020000')`;
  if(versions.length!==2)throw Error('Both migrations required');
  const [runtime]=await tx`select generation::text,owner_id,last_heartbeat_at from notification_worker_runtime where singleton`;
  if(runtime?.owner_id||runtime?.last_heartbeat_at||runtime?.generation!=='0')throw Error('Worker state changed; requalify plan');
  // Creator is used only inside this rolled-back transaction; no profile or existing grants are modified.
  const [creator]=await tx`select p.id from profiles p where not p.deletion_pending and p.role='admin' order by p.id limit 1`;
  if(!creator)throw Error('An existing active platform administrator is required');
  const result=await bootstrap({name:'Release role113 rollback verification',slug,profileId:creator.id,organizationId:id},{begin:fn=>fn(tx)});
  const [org]=await tx`select role_model,default_role_key from organizations where id=${id}::uuid`;
  const roles=await tx`select key,name,rank,template_id,template_version from org_roles where org_id=${id}`;
  const assignments=await tx`select role_key from member_roles where org_id=${id}`;
  const memberships=await tx`select role from organization_members where organization_id=${id}::uuid`;
  const rules=await tx`select * from permission_rules where org_id=${id} order by module`;
  if(!result.created||org.role_model!=='organization'||org.default_role_key!=='custom-administrator'||roles.length!==1||roles[0].key!==org.default_role_key||roles[0].rank!==80||roles[0].template_id!=='admin'||roles[0].template_version!==1||assignments.length!==1||assignments[0].role_key!==org.default_role_key||memberships.length!==1||memberships[0].role!=='owner'||rules.length!==caps.i.length)throw Error('Bootstrap shape mismatch');
  for(const module of caps.i){const row=rules.find(x=>x.module===module);if(!row)throw Error('Missing rule');const expected=caps.d('admin',module);for(const action of caps.t){if(row['can_'+action]!==expected[action])throw Error('Capability mismatch: '+module+':'+action)}if(row.if_owner!==false||row.field_level!==caps.f(module))throw Error('Scope/field mismatch')}
  const snapshot=async()=>{const [r]=await tx`select jsonb_build_object(
   'org',(select to_jsonb(o) from organizations o where id=${id}::uuid),
   'roles',(select jsonb_agg(to_jsonb(r) order by key) from org_roles r where org_id=${id}),
   'rules',(select jsonb_agg(to_jsonb(r) order by module) from permission_rules r where org_id=${id}),
   'assignments',(select jsonb_agg(to_jsonb(r) order by role_key) from member_roles r where org_id=${id}),
   'memberships',(select jsonb_agg(to_jsonb(r) order by profile_id) from organization_members r where organization_id=${id}::uuid),
   'audit_count',(select count(*) from doc_audit_log where org_id=${id})
  )::text as value`;return r.value};
  const initialSnapshot=await snapshot();
  const retry=await bootstrap({name:'Release role113 rollback verification',slug,profileId:creator.id,organizationId:id},{begin:fn=>fn(tx)});
  if(retry.created||await snapshot()!==initialSnapshot)throw Error('Retry must preserve complete organization shape');
  Object.assign(report,{roleModel:org.role_model,roleCount:roles.length,assignmentCount:assignments.length,ruleCount:rules.length,defaultRole:org.default_role_key,retryCreated:retry.created,retryShapeUnchanged:true});verified=true;throw rollback;
 })}catch(e){if(e!==rollback)throw e}
 const [remaining]=await sql`select exists(select 1 from organizations where id=${id}::uuid or slug=${slug}) as present`;
 if(!verified||remaining.present)throw Error('Rollback verification failed');
 Object.assign(report,{result:'pass',rollbackVerified:true});
 writeFileSync('/tmp/role113-native-postflight.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await sql.end({timeout:5})}
