import sys,os,json,subprocess,time,datetime
from pathlib import Path
root=Path('/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/development/d-pulse')
name=sys.argv[1];argv=sys.argv[2:];assert argv
start=time.time();stamp=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
record={'name':name,'argv':argv,'cwd':os.getcwd(),'startedAt':stamp(),'safeEnv':{k:os.environ[k] for k in ['PUBLIC_POSTHOG_KEY','PUBLIC_POSTHOG_HOST','VITEST_MAX_WORKERS','MINION_QC_DISPOSABLE','REQUIRE_PULSE_POSTGRES','GIT_CONFIG_GLOBAL','GIT_CONFIG_NOSYSTEM','GIT_CONFIG_COUNT','GIT_CONFIG_KEY_0','GIT_CONFIG_VALUE_0'] if k in os.environ},'status':'running'}
receipt=root/(name+'-receipt.json');receipt.write_text(json.dumps(record,indent=2)+'\n')
with (root/(name+'.log')).open('w') as log:
 p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT)
record.update(status='passed' if p.returncode==0 else 'failed',exitCode=p.returncode,finishedAt=stamp(),elapsedSeconds=round(time.time()-start,3));receipt.write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record));sys.exit(p.returncode)
