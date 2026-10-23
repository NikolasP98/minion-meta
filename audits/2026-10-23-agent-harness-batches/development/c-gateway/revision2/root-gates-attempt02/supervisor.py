#!/usr/bin/env python3
"""Sequential, completion-aware Gateway gates; no product mutations or detached work."""
from pathlib import Path
import datetime, hashlib, json, os, subprocess, sys, time
proof=Path(__file__).resolve().parent
repo=Path('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway')
env=dict(os.environ, GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_NOSYSTEM='1')
commands=[('check-full-root',['pnpm','check'],{}),('test-full-root',['pnpm','test'],{'OPENCLAW_TEST_VM_FORKS':'0','OPENCLAW_TEST_PROFILE':'low','OPENCLAW_TEST_SERIAL_GATEWAY':'1','OPENCLAW_TEST_MAX_OLD_SPACE_SIZE_MB':'4096','OPENCLAW_VITEST_REPORT_DIR':str(proof/'main-test-reports')}),('build-full-root',['pnpm','build'],{})]
ledger=proof/'root-gates.jsonl'
for label,argv,extra in commands:
    record={'label':label,'argv':argv,'cwd':str(repo),'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'environmentOverrides':{'GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_NOSYSTEM':'1',**extra},'log':label+'.log'}
    start=time.monotonic()
    with (proof/record['log']).open('w') as out:
        child=subprocess.Popen(argv,cwd=repo,env={**env,**extra},stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
        record.update(pid=child.pid,processGroup=child.pid,status='running')
        (proof/'root-active-gate.json').write_text(json.dumps(record,indent=2)+'\n')
        print(json.dumps(record),flush=True)
        code=child.wait()
    record.update(status='passed' if code==0 else 'failed',exitCode=code,seconds=round(time.monotonic()-start,3),logSha256=hashlib.sha256((proof/record['log']).read_bytes()).hexdigest())
    if label=='build-full-root' and '[build] WARN: plugin-sdk dts step failed' in (proof/record['log']).read_text():
        record.update(status='failed-swallowed-declaration-error',wrapperExitCode=code,exitCode=1)
        code=1
    with ledger.open('a') as out:out.write(json.dumps(record)+'\n')
    (proof/'root-active-gate.json').write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps(record),flush=True)
    if code!=0:sys.exit(code if code>0 else 128-code)
print('All three Gateway root gates have terminal success receipts.',flush=True)
