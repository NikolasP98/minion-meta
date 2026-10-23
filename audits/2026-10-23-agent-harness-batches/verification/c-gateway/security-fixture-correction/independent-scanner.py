import pathlib,json,hashlib,subprocess,os,sys,socket
from detect_secrets.settings import default_settings
from detect_secrets.core.scan import scan_file,scan_for_allowlisted_secrets_in_file
from detect_secrets.__version__ import VERSION
assert VERSION=='1.5.0'
def deny(*a,**kw):raise RuntimeError('external network forbidden in independent fixture review')
socket.socket.connect=deny;socket.create_connection=deny
c=pathlib.Path('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway');r=pathlib.Path('/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches');a=r/'development/c-gateway/security-fixture-correction';out=pathlib.Path(__file__).parent
files=[x for x in json.loads((a/'candidate-file-manifest.json').read_text()) if x['state']=='present'];rows=[]
for row in files:
 with default_settings(): found=list(scan_file(str(c/row['path'])))
 assert not found,[(x.type,x.line_number) for x in found]
 rows.append({'path':row['path'],'findings':len(found)})
allow=[]
for row in json.loads((a/'original-manifest.json').read_text())[:9]:
 p=c/row['path'];p=p.with_suffix('.jsonc') if p.suffix=='.json' else p
 with default_settings(): found=list(scan_for_allowlisted_secrets_in_file(str(p)))
 allow.append({'path':str(p.relative_to(c)),'count':len(found),'lines':[x.line_number for x in found],'types':sorted({x.type for x in found})})
assert sum(x['count'] for x in allow)==104
scratch=pathlib.Path('/tmp/minion-c-security-scope-fixture-2zkbykku')
def git(*args):return subprocess.check_output(['git','-C',str(scratch),*args],text=True).strip()
positive='691d71e17f67940267826c1d34986e04931c162c';negative='4bb5f283a8ce5b09f8ff3a67c235951a979fc379';assert git('rev-parse','HEAD')==negative;assert git('rev-parse',negative+'^')==positive;base=git('rev-parse',positive+'^')
for row in files:assert hashlib.sha256(subprocess.check_output(['git','-C',str(scratch),'show',positive+':'+row['path']])).hexdigest()==row['sha256']
assert git('diff-tree','--no-commit-id','--name-only','-r',negative)=='test-only-canary.ts';assert 'known-fake-never-valid-canary' in git('show',negative+':test-only-canary.ts')
for p in ['.secrets.baseline','.github/scripts/ci-security-scope.sh']:assert (scratch/p).read_bytes()==(c/p).read_bytes()
# Replay the existing two-commit scratch history read-only. The unchanged script
# scans candidate then canary; the wrapper records each actual hook exit.
wrapper=out/'instrumented-pinned-hook.py';invocations=out/'independent-hook-invocations.jsonl'
wrapper.write_text('''#!/home/nikolas/.cache/uv/archive-v0/bUqr0IVh_3Lq_HB7/bin/python
import sys,os,json,pathlib,socket
sys.path.insert(0,'/home/nikolas/.cache/uv/archive-v0/4G1w7n5doTda01Kz')
from detect_secrets.pre_commit_hook import main
from detect_secrets.__version__ import VERSION
assert VERSION=='1.5.0'
def deny(*a,**kw):raise RuntimeError('network forbidden')
socket.socket.connect=deny;socket.create_connection=deny
status=main()
p=pathlib.Path(os.environ['REVIEW_HOOK_RECEIPT'])
with p.open('a') as f:f.write(json.dumps({'commit':pathlib.Path.cwd().name,'exitCode':status,'files':sys.argv[sys.argv.index('--')+1:]})+'\\n')
sys.exit(status)
''');wrapper.chmod(0o700)
invocations.write_text('');env=os.environ.copy();env.update(BASE_SHA=base,GITHUB_SHA=negative,DETECT_SECRETS_HOOK_BIN=str(wrapper),REVIEW_HOOK_RECEIPT=str(invocations),GITHUB_EVENT_NAME='pull_request',GITHUB_REF='refs/pull/356/merge',GITHUB_BASE_REF='DEV',GITHUB_HEAD_REF='feature/agent-harness-c-gateway',GITHUB_REPOSITORY='NikolasP98/minion-ai')
log=out/'independent-unchanged-security-scope.log'
with log.open('w') as f:proc=subprocess.run(['bash','.github/scripts/ci-security-scope.sh'],cwd=scratch,env=env,stdout=f,stderr=subprocess.STDOUT)
log.chmod(0o600);calls=[json.loads(x) for x in invocations.read_text().splitlines()];assert proc.returncode==1;assert len(calls)==2;assert calls[0]['commit']==positive and calls[0]['exitCode']==0 and len(calls[0]['files'])==67;assert calls[1]['commit']==negative and calls[1]['exitCode']==1 and calls[1]['files']==['test-only-canary.ts'];assert 'test-only-canary.ts:1' in log.read_text()
result={'version':VERSION,'currentCandidateFiles':67,'allDefaultScansNoFindings':True,'files':rows,'auditedExactAllowlistOccurrences':allow,'totalOccurrences':104,'existingScratchPositiveCommit':positive,'existingScratchCanaryCommit':negative,'base':base,'scratchCommitBlobsMatchFrozen67':True,'unchangedScopeFullRangeReplayExit':proc.returncode,'hookCalls':calls,'positiveCandidateExit':0,'canaryExit':1,'noGitMutations':True,'actualRewrittenHistoryGatePending':True,'logSha256':hashlib.sha256(log.read_bytes()).hexdigest()}
(out/'independent-scanner.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'version':VERSION,'currentCandidateFiles':67,'findings':0,'narrowAllowlistOccurrences':104,'actualCandidateHookExit':0,'actualCanaryHookExit':1,'fullRangeExit':proc.returncode,'gitMutations':False}))
