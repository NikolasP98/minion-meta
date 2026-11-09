from pathlib import Path
import os,json,datetime
repo=Path('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/d-pulse')
out=Path(__file__).parent;now=datetime.datetime.now(datetime.timezone.utc)
rows=[]
for p in Path('/proc').iterdir():
 if not p.name.isdigit() or int(p.name)==os.getpid(): continue
 try:
  if Path(os.readlink(p/'cwd'))!=repo:continue
  cmd=(p/'cmdline').read_bytes().decode().replace('\0',' ').strip()
  if not cmd or cmd.startswith('python3 -') or 'record-progress.py' in cmd:continue
  stat=(p/'stat').read_text().split();rows.append({'pid':int(p.name),'parent':int(stat[3]),'state':stat[2],'userTicks':int(stat[13]),'systemTicks':int(stat[14]),'command':cmd})
 except (FileNotFoundError,PermissionError,ProcessLookupError):continue
receipts=[]
for p in sorted(out.glob('*-receipt.json')):
 r=json.loads(p.read_text());receipts.append({k:r.get(k) for k in ['name','status','exitCode','startedAt','finishedAt']})
r={'createdAt':now.isoformat(),'ownedCwdProcesses':rows,'receipts':receipts}
p=out/('progress-'+now.strftime('%Y%m%dT%H%M%S')+'.json');p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'receipt':str(p),'processes':rows,'latestGates':receipts[-3:]},indent=2))
