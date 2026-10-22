#!/usr/bin/env python3
"""One read-only hosted-CI snapshot; caller controls bounded poll interval."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import json, subprocess

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'ci-hub-wave1.json'
LOG = ROOT / 'ci-hub-wave1.log'
REPO = 'NikolasP98/minion_hub'
HEAD = '3ebd0ded2116a400d0804c75affcc9624377b77c'

def get(endpoint):
    result = subprocess.run(['gh', 'api', endpoint], capture_output=True, text=True, timeout=45, check=True)
    return json.loads(result.stdout)

paths = [f'repos/{REPO}/pulls/587', f'repos/{REPO}/commits/{HEAD}/check-runs?per_page=100', f'repos/{REPO}/actions/runs?head_sha={HEAD}&per_page=100', f'repos/{REPO}/commits/{HEAD}/status?per_page=100']
with ThreadPoolExecutor(max_workers=4) as pool:
    pr, checks_raw, runs_raw, status_raw = list(pool.map(get, paths))
checks = [{k:x.get(k) for k in ['id','name','head_sha','status','conclusion','started_at','completed_at','html_url','details_url']} for x in checks_raw['check_runs']]
runs = [{k:x.get(k) for k in ['id','name','path','head_sha','event','status','conclusion','html_url','created_at','updated_at']} for x in runs_raw['workflow_runs']]
statuses = [{k:x.get(k) for k in ['context','state','target_url','updated_at']} for x in status_raw['statuses']]
counts = {'passed':0,'failed':0,'skipped':0,'pending':0,'other':0}
for c in checks:
    if c['status'] != 'completed': counts['pending'] += 1
    elif c['conclusion'] == 'success': counts['passed'] += 1
    elif c['conclusion'] in ['skipped','neutral']: counts['skipped'] += 1
    elif c['conclusion'] in ['failure','timed_out','cancelled','action_required','stale','startup_failure']: counts['failed'] += 1
    else: counts['other'] += 1
pending_statuses = any(x['state'] == 'pending' for x in statuses)
failed_statuses = [x for x in statuses if x['state'] in ['failure','error']]
terminal = bool(checks) and counts['pending'] == 0 and all(x['status']=='completed' for x in runs) and not pending_statuses
observed = datetime.now(timezone.utc).isoformat()
snapshot = {'observedAt':observed,'repo':REPO,'pullRequest':587,'url':pr['html_url'],'draft':pr['draft'],'state':pr['state'],'expectedHeadSha':HEAD,'headSha':pr['head']['sha'],'headMatchesExpected':pr['head']['sha']==HEAD,'counts':counts,'checks':checks,'workflowRuns':runs,'commitStatuses':statuses,'terminal':terminal,'failedCommitStatuses':failed_statuses}
data = json.loads(OUT.read_text()) if OUT.exists() else {'schemaVersion':1,'source':'gh-axi human inspection; raw gh API structured evidence because wrapper output omits exact head/check details','snapshots':[],'limits':['Selected hosted checks only; skipped tests/platforms are not passed coverage.','No retry/cancel/review/merge/deploy or product changes.'],'remoteMutations':[]}
data['snapshots'].append(snapshot)
data['latest'] = snapshot
data['monitoringStatus'] = 'head-changed' if not snapshot['headMatchesExpected'] else ('complete' if terminal else 'active')
if terminal: data['completedAt'] = observed
OUT.write_text(json.dumps(data, indent=2)+'\n')
line = f"{observed} PR587 head={snapshot['headSha']} exact={snapshot['headMatchesExpected']} checks={counts} terminal={terminal}\n"
with LOG.open('a') as out:
    out.write(line)
    for c in checks:
        out.write(f"  {c['name']}: {c['status']}/{c['conclusion']} {c['html_url']}\n")
    for r in runs:
        out.write(f"  workflow {r['name']}: {r['status']}/{r['conclusion']} {r['html_url']}\n")
print(line, end='')
for c in checks:
    if c['status']!='completed' or c['conclusion'] not in ['success','skipped','neutral']:
        print(c['name'],c['status'],c['conclusion'],c['html_url'])
