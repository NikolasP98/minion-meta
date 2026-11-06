import os,json,subprocess,datetime,time,uuid,signal
from pathlib import Path
repo=Path('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/d-pulse');audit=Path(__file__).parent;start=time.time();stamp=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
artifact=audit.parent/'default-critical-run-06/build';receipt=audit/'manual-server-receipt.json';assert artifact.is_dir() and not receipt.exists()
env={'PATH':os.environ['PATH'],'MINION_CRITICAL_OUT':str(artifact),'MINION_CRITICAL_RUN_ID':str(uuid.uuid4())}
r={'startedAt':stamp(),'argv':['node','tests/fixtures/critical-journeys/serve.mjs'],'cwd':str(repo),'artifact':str(artifact),'runId':env['MINION_CRITICAL_RUN_ID'],'status':'running'}
with (audit/'manual-server.log').open('w') as log:
 child=subprocess.Popen(r['argv'],cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT);r['pid']=child.pid;receipt.write_text(json.dumps(r,indent=2)+'\n')
 code=child.wait()
r.update(status='stopped' if code==0 else 'failed',exitCode=code,finishedAt=stamp(),elapsedSeconds=round(time.time()-start,3));receipt.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r));raise SystemExit(code)
