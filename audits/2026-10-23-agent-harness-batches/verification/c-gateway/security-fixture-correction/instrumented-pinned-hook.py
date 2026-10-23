#!/home/nikolas/.cache/uv/archive-v0/bUqr0IVh_3Lq_HB7/bin/python
import sys,os,json,pathlib,socket
sys.path.insert(0,'/home/nikolas/.cache/uv/archive-v0/4G1w7n5doTda01Kz')
from detect_secrets.pre_commit_hook import main
from detect_secrets.__version__ import VERSION
assert VERSION=='1.5.0'
def deny(*a,**kw):raise RuntimeError('network forbidden')
socket.socket.connect=deny;socket.create_connection=deny
status=main()
p=pathlib.Path(os.environ['REVIEW_HOOK_RECEIPT'])
with p.open('a') as f:f.write(json.dumps({'commit':pathlib.Path.cwd().name,'exitCode':status,'files':sys.argv[sys.argv.index('--')+1:]})+'\n')
sys.exit(status)
