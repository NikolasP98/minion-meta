#!/usr/bin/env python3
"""Root-owned sequential F gates. Start only with the heavy lane allocated."""
from pathlib import Path
import os,subprocess,json,hashlib,time,datetime,sys
repo=Path('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals')
proof=Path(__file__).resolve().parent
inventory=repo/'audits/2026-10-23-agent-harness-batches/verification/f-evals/feedback-delta/current-100-files.json'
files=json.loads(inventory.read_text());expected='48cb10ac168c2271e4e45761277078f62c549481'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()==expected
for item in files:
 assert hashlib.sha256((repo/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
env={k:v for k,v in os.environ.items() if not any(s in k.upper() for s in ['TOKEN','SECRET','PASSWORD','API_KEY','DATABASE_URL','DB_URL']) and not k.startswith(('MINION_','E2E_','REQUIRE_','HUB_TEST_'))}
env.update(CI='true',TZ='UTC',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_NOSYSTEM='1')
commands=[['pnpm','run',name] for name in ['repo-policy:validate','repo-policy:test','build-all','typecheck-all','lint-all','test-all','test:scripts','test:agent-evals','index:check','changeset:status']]
results=[]
for number,argv in enumerate(commands,1):
 label=f"{number:02d}-"+argv[-1].replace(':','-');log=proof/(label+'.log');receipt=proof/(label+'-receipt.json');assert not receipt.exists(),receipt
 record={'argv':argv,'cwd':str(repo),'sourceCommit':expected,'ownedFiles':len(files),'inventorySha256':hashlib.sha256(inventory.read_bytes()).hexdigest(),'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'running'}
 start=time.monotonic()
 with log.open('w') as output:
  child=subprocess.Popen(argv,cwd=repo,env=env,stdout=output,stderr=subprocess.STDOUT);record['pid']=child.pid;receipt.write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record),flush=True);code=child.wait()
 record.update(status='passed' if code==0 else 'failed',exitCode=code,seconds=round(time.monotonic()-start,3),logSha256=hashlib.sha256(log.read_bytes()).hexdigest());receipt.write_text(json.dumps(record,indent=2)+'\n');results.append(record);(proof/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(record),flush=True)
 if code:sys.exit(code if code>0 else 128-code)
for item in files:assert hashlib.sha256((repo/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
print('All ten F root gates passed; actual A integration and final independent delivery review remain separate.',flush=True)
