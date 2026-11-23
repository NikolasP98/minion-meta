from pathlib import Path
from urllib.parse import urlparse
import os, subprocess
root=Path('/tmp/minion-white-label-145-data')
raw=Path('/tmp/minion-white-label-145-release/.env.qa').read_text()
qa={}
for line in raw.splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key,value=line.split('=',1)
        qa[key]=value.strip().strip('"').strip("'")
db=urlparse(qa['SUPABASE_DB_URL'])
http=urlparse(qa['PUBLIC_SUPABASE_URL'])
assert db.hostname=='127.0.0.1' and db.port==54422 and db.path=='/postgres'
assert http.scheme=='http' and http.hostname=='127.0.0.1' and http.port==54421
env=dict(os.environ)
for key in ['PUBLIC_SUPABASE_URL','PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_DB_URL','ENCRYPTION_KEY']:
    env[key]=qa[key]
env.update({'HUB_TEST_DB_URL':qa['SUPABASE_DB_URL'],'REQUIRE_QA_NATIVE_POSTGRES':'1','PUBLIC_POSTHOG_KEY':'ci','PUBLIC_POSTHOG_HOST':'https://posthog.invalid','TURSO_DB_URL':'file::memory:'})
with open('/tmp/white145-provision-native.log','w') as log:
    result=subprocess.run(['node','node_modules/vitest/vitest.mjs','run','--config','.local/hub-white-label-145-implementation/t014/vitest.config.ts','--reporter=verbose','--maxWorkers=1'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print('native_exit',result.returncode)
raise SystemExit(result.returncode)
