"""Build per-finding, provenance-bound evidence. Does not invent browser or performance results."""
import hashlib, json, re, shutil, subprocess, sys
from pathlib import Path
BASE=Path(sys.argv[1] if len(sys.argv)>1 else '/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw')
ROOT=Path(sys.argv[2] if len(sys.argv)>2 else '/home/nikolas/Documents/CODE/MINION')
OUT=ROOT/'.lavish/hub-gateway-readiness-2026-10-03'
OLD=ROOT/'.lavish/hub-gateway-recon-2026-10-02'
EV=BASE/'meta/.planning/operations/readiness-2026-10-03/evidence'
REG=json.loads((EV.parent/'findings.json').read_text())
RECON=json.loads(re.search(r'<script type="application/json" id="report-data">(.*?)</script>',(OLD/'report.html').read_text(),re.S)[1])
ORIGINAL={r['id']:r for r in RECON['findings']}
REPOS={k:BASE/k for k in ['hub','gateway','meta','factory','paperclip','site']}
GH={k:v['github'] for k,v in RECON['repos'].items()}
GH.update(factory='NikolasP98/minion-factory',paperclip='NikolasP98/paperclip-minion',site='NikolasP98/minion-site')
BEFORE={k:v['sha'] for k,v in RECON['repos'].items()}
BEFORE.update({k:v for k,v in REG['bases'].items() if k not in BEFORE})
ASSET=OUT/'assets/finding-evidence';ASSET.mkdir(parents=True,exist_ok=True)
ansi=re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]')
cache={}
def git(repo,*args):
 key=(repo,*args)
 if key not in cache:
  p=subprocess.run(['git','-C',str(REPOS[repo]),*args],capture_output=True,text=True)
  cache[key]=p.stdout if p.returncode==0 else None
 return cache[key]
def text_receipt(path,title,environment,commit=None):
 data=path.read_bytes();raw=ansi.sub('',data.decode(errors='replace'))
 lines=raw.splitlines()
 # Show actual output tails, never a generated passing verdict. Keep full source digest.
 chosen=lines if len(lines)<=65 else lines[-65:]
 # Runtime logs may contain credentials in URLs or headers; redact before embedding.
 clean='\n'.join(chosen)
 clean=re.sub(r'(?i)(authorization:\s*bearer\s+)[^\s]+',r'\1[redacted]',clean)
 clean=re.sub(r'(postgres(?:ql)?://[^:\s/]+:)[^@\s]+@',r'\1[redacted]@',clean)
 clean=re.sub(r'(?i)((?:access_token|refresh_token|client_secret|api_key)=)[^&\s]+',r'\1[redacted]',clean)
 name=re.sub(r'[^a-zA-Z0-9._-]','-',title)[:70]+'-'+hashlib.sha256(data).hexdigest()[:10]+'.txt'
 (ASSET/name).write_text(clean+'\n')
 return dict(kind='console',title=title,environment=environment,commit=commit,source=str(path.relative_to(BASE)) if path.is_relative_to(BASE) else str(path.relative_to(OLD)),sha256=hashlib.sha256(data).hexdigest(),excerpt=clean,href='assets/finding-evidence/'+name,note=('Last 65 lines of the captured output; full-source SHA-256 shown.' if len(lines)>65 else 'Captured output, with credential redaction where needed.'))
def image_record(path,title,environment,commit,caption):
 name=path.name;shutil.copy2(path,ASSET/name)
 return dict(kind='image',title=title,environment=environment,commit=commit,caption=caption,href='assets/finding-evidence/'+name,sha256=hashlib.sha256(path.read_bytes()).hexdigest())
def source_record(repo,path,ref,line=None,lines=None,note=''):
 if not isinstance(path,str) or not path:return None
 path=path.removeprefix(repo+'/')
 raw=git(repo,'show',f'{ref}:{path}')
 if raw is None:return None
 ranges=[]
 for a,b in re.findall(r'(\d+)(?:\s*-\s*(\d+))?',str(lines or line or 1))[:3]:
  start=max(1,int(a));end=int(b or a)
  if end==start:end=start+9
  ranges.append((max(1,start-2),min(end+2,start+29)))
 content=raw.splitlines();chunks=[]
 for start,end in ranges:
  if start>len(content):continue
  chunks.append('\n'.join(f'{i+1:>5}  {content[i]}' for i in range(start-1,min(end,len(content)))))
 if not chunks:return None
 return dict(kind='source',title=path,environment='Frozen source snapshot',commit=ref,excerpt='\n   …\n'.join(chunks),note=note,sha256=hashlib.sha256(raw.encode()).hexdigest(),href=f'https://github.com/{GH[repo]}/blob/{ref}/{path}#L{ranges[0][0]}')
BEFORE_LOGS={'GW-001':['gw-broadcast-cross-org-repro.log'],'HC-001':['hc-bulk-tag-repro.log'],'HS-028':['hs-numeric-repro.log'],'TQ-001':['tq001-effect-root-probe.log'],'TQ-004':['test-quality-reproductions.log'],'TQ-005':['test-quality-reproductions.log'],'TQ-006':['test-quality-reproductions.log'],'TQ-007':['test-quality-reproductions.log']}
# Explicit mapping: a suite receipt is supporting evidence, not an assertion that every case is live-qualified.
AFTER_LOGS={
 'HS-008':['native-categories-jobs.log','native-categories-qualified.log','native-categories-cleanup.log'],
 'TQ-008':['native-categories-contracts.log','native-categories-qualified.log'],
 'GW-015':['gw-lifecycle-final-commit-tests.log','gw-lifecycle-lock-reclaim-review.log'],
 'GW-008':['gw-lifecycle-core-final.log'],
 'GW-021':['evidence/gw021-fixed-auth-e2e.log'],
 'HS-028':['money-core-focused-final.log','money-server-final-broad.log'],
 'HS-017':['money-server-final-broad.log'],
 'HC-035':['hc035-jobs-final.log','hc035-hosted-unit-failure.log','hc035-capability-integration.log'],
 'HC-012':['hc012-013-focused-tests.log'], 'HC-013':['hc012-013-focused-tests.log'],
 'HC-033':['hc033-final-tests.log'], 'HC-032':['hub-scheduling-read-final.log'],
 'HS-003':['hub-fresh-authority-final-tests.log'],
 'MR-OP-001':['hub-scheduling-read-final.log'],
 'HS-005':['hs005-final-native.log'],
 'FACES-PROD-001':['hub-meta-pagination-final-tests.log'],
 'FACES-001':['faces-logger-final-tests.log'], 'FACES-002':['faces-firewall-tests.log'], 'FACES-004':['faces-log-final-tests.log'],
 'HS-030':['marketplace-mounted-final.log'], 'HS-031':['marketplace-mounted-final.log'],
 'TQ-003':['tq003-mutation-focused-tests.log'],
}
LOG_CONTEXT={
 'native-categories-jobs.log':('Local marked disposable PostgreSQL; actual category migration; zero production mutations','hub:a65b2840'),
 'native-categories-qualified.log':('Exact native jobs manifest validator; 202 passing cases, zero skips','hub:a65b2840'),
 'native-categories-contracts.log':('Local manifest and disposable-runtime safety contracts','hub:a65b2840'),
 'native-categories-cleanup.log':('Owned disposable PostgreSQL: zero remaining category fixture schemas','hub:a65b2840'),
 'hc035-jobs-final.log':('Local disposable PostgreSQL; 198 native cases; no production data','hub:c600711c'),
 'hc035-hosted-unit-failure.log':('GitHub Actions unit lane: three failures exposed incomplete integration','hub:c600711c'),
 'hc035-capability-integration.log':('Local focused correction: hooks, route authority and neighboring access rules','hub:0bbb9aaa'),
}
# Captured source evidence for findings added after the original report.
EXTRA={
 'GW-021':[('gateway','src/infra/device-pairing.ts',444)],
 'HC-035':[('hub','src/lib/components/pos/PlanOpenForm.svelte',79),('hub','src/server/services/pos-accounts.service.ts',465)],
}
BEFORE_IMAGES={
 'HC-001': [('qa-bulk-503-confirmed.png','HTTP 503 still produces a success toast','Fault injected only at the local browser transport; no database mutation.')],
 'UI-001':[('qa-stock-mobile-closed.png','Before opening bulk Tags','390 × 844 baseline; closed control stays within the viewport.'),('qa-stock-mobile-tag-stable.png','Overflow after opening bulk Tags','Same viewport: document grows to 539 px. This reproduces the defect.')],
}
FACES={}
for file in ['faces-backend-recon.json','faces-product-recon.json']:
 doc=json.loads((EV/file).read_text())
 for row in doc['findings']:FACES[row['id']]=(row,doc,file)
results={};missing=[]
for finding in REG['findings']:
 fid=finding['id'];old=ORIGINAL.get(fid,{})
 before=[];after=[];related=[]
 for name,title,caption in BEFORE_IMAGES.get(fid,[]):before.append(image_record(OLD/'evidence'/name,title,'Local frozen Hub + synthetic QA data',BEFORE['hub'],caption))
 if fid=='UI-002':before.append(image_record(EV/'calendar-074-mobile-failure.png','Mobile toolbar overlap at 390 × 844','Headless Chromium; real components; synthetic fixture','07463ec1','The overlap is an observed defect. Failed-week banners are deliberately injected; this image is not an after-fix acceptance.'))
 if fid in FACES:
  row,doc,file=FACES[fid];facts=row.get('observed',row.get('productionEvidence',{}))
  before.append(dict(kind='measurement',title='Read-only production observation',environment=doc.get('environment','FACES production backend'),commit=(doc.get('runtimeIdentity',{}).get('imageRevision') or 'Hub deployed revision not attested'),excerpt=json.dumps(facts,indent=2,ensure_ascii=False),note=row.get('evidenceBoundary','Live state observed; source cause remains an inference unless the deployed revision is attested.'),source=file,sha256=hashlib.sha256((EV/file).read_bytes()).hexdigest(),capturedAt=doc.get('generatedAt')))
 for name in BEFORE_LOGS.get(fid,[]):
  p=OLD/'evidence'/name
  if p.exists():before.append(text_receipt(p,'Baseline reproduction: '+name,'Frozen audit source; synthetic local fixture',BEFORE.get(old.get('repo','hub'))))
 if fid=='HS-008':before.append(text_receipt(BASE/'native-categories-baseline.log','Category native tests skipped in the old ordinary lane','Local baseline test discovery','hub:0bbb9aaa'))
 if fid=='OP-003':before.append(text_receipt(BASE/'factory-input-baseline.log','Factory provider-spawn baseline failure','Local reproduction of runner invocation'))
 if fid=='GW-021':before.append(text_receipt(BASE/'evidence/gw021-baseline-auth-e2e.log','Paired-device baseline failures','Local real WebSocket fixture',BEFORE['gateway']))
 anchors=[*old.get('evidence',[]),*finding.get('sourceAnchors',[])]
 for e in anchors:
  if not isinstance(e,dict):continue
  repo=e.get('repo',old.get('repo','hub'));repo=repo if repo in REPOS else 'hub'
  path=e.get('file',e.get('path',''));ref=e.get('repoCommit',BEFORE[repo])
  record=source_record(repo,path,ref,e.get('line'),e.get('lines'),e.get('detail',e.get('note','')))
  if record:before.append(record)
  elif e.get('url') and (OLD/e['url']).is_file():before.append(text_receipt(OLD/e['url'],'Audit fixture: '+Path(path or e['url']).name,'Frozen audit fixture',ref))
 for e in finding.get('source_evidence',[]):
  m=re.match(r'(.+?):(\d+)(?:-(\d+))?',e)
  if not m:continue
  path,start,end=m.groups();repo='gateway' if path.startswith('gateway/') else 'hub'
  record=source_record(repo,path,BEFORE[repo],start,start+('-'+end if end else ''),'Parent review source anchor')
  if record:before.append(record)
 for repo,path,line in EXTRA.get(fid,[]):
  record=source_record(repo,path,BEFORE[repo],line)
  if record:before.append(record)
 # Changes are taken from recorded commits, never from another worker's uncommitted tree.
 for spec in finding.get('code_commits',[]):
  if ':' not in spec:continue
  repo,ref=spec.split(':',1)
  if repo not in REPOS:continue
  full=git(repo,'rev-parse',ref)
  if not full:continue
  full=full.strip();changed=(git(repo,'diff-tree','--no-commit-id','--name-only','-r',full) or '').splitlines()
  wanted=[(e.get('file') or e.get('path') or '').removeprefix(repo+'/') for e in anchors if isinstance(e,dict) and e.get('repo',old.get('repo','hub'))==repo]
  wanted += [re.sub(r':\d+.*','',p).removeprefix(repo+'/') for p in finding.get('source_evidence',[]) if (repo=='gateway')==p.startswith('gateway/')]
  matched=[p for p in changed if p in wanted]
  selected=matched[:3] or [p for p in changed if not p.endswith(('.json','.lock','.png'))][:2]
  diff=git(repo,'show','--format=fuller','--no-ext-diff','--unified=3',full,'--',*selected) or ''
  lines=diff.splitlines();excerpt='\n'.join(lines[:150])+ ('\n… excerpt ends; open the commit for the full diff.' if len(lines)>150 else '')
  patch_name=f'{fid}-{repo}-{full[:12]}.patch'
  (ASSET/patch_name).write_text(diff)
  after.append(dict(kind='diff',title='Committed implementation: '+repo+' '+full[:9],environment='Feature branch; not production',commit=full,excerpt=excerpt,href='assets/finding-evidence/'+patch_name,sha256=hashlib.sha256(diff.encode()).hexdigest(),source=f'git show {full} -- selected finding paths',note='Code evidence only. '+('Diff follows the original source anchors.' if matched else 'Representative changed files from this recorded commit; the commit may cover several findings.')))
 for name in AFTER_LOGS.get(fid,[]):
  p=BASE/name
  if p.exists():
   environment,revision=LOG_CONTEXT.get(name,('Local synthetic/disposable test environment',finding.get('code_commits',[])[-1] if finding.get('code_commits') else 'Uncommitted review candidate'))
   after.append(text_receipt(p,'Verification: '+Path(name).name,environment,revision))
 if fid in ('HC-012','HC-013'):
  after.insert(0,image_record(EV/'calendar-074-mobile-recovered.png','After Retry: both failed weeks recover','Headless Chromium; actual calendar; synthetic fixture','07463ec1','Same 390 × 844 fixture after each Retry. The separate UI-002 toolbar overlap remains open.'))
  after.insert(0,image_record(EV/'calendar-074-mobile-failure.png','Fixed error handling under injected HTTP 503','Headless Chromium; actual calendar; synthetic fixture','07463ec1','Post-change failure state: missing data is visibly unavailable and retryable. This is not a pre-fix screenshot.'))
 if fid=='HC-035' and (EV/'hc035-v6-desktop-overlap.png').exists():
  before.insert(0,image_record(EV/'hc035-v6-desktop-overlap.png','Review found recovery actions overlapping adjacent card','Headless Chromium; actual PlanOpenForm; synthetic recovery records','Uncommitted v6 fixture on hub:a65b2840','1280 × 960 viewport with narrow form panels. The new recovery buttons overflow their panel. Correction remains in progress; this is captured failure evidence, not acceptance.'))
 if fid=='HC-035' and (EV/'hc035-v6-mobile-clipped-actions.png').exists():
  before.insert(0,image_record(EV/'hc035-v6-mobile-clipped-actions.png','Mobile action clipping despite zero document overflow','Headless Chromium; actual PlanOpenForm; synthetic recovery records','Uncommitted v6 fixture on hub:a65b2840','390 × 844 viewport: the recovery action extends offscreen while document.scrollWidth remains390. Visible control bounds are part of acceptance.'))
 if fid=='HC-035' and (EV/'hc035-v7-desktop-wrapped-actions.png').exists():
  after.insert(0,image_record(EV/'hc035-v7-desktop-wrapped-actions.png','Candidate: recovery actions wrap within each form','Headless Chromium; actual PlanOpenForm; synthetic recovery records','Uncommitted v7 fixture on hub:a65b2840','1280 × 960 viewport. Recovery controls fit the narrow panels. This validates layout only; parent review still requires storage-accessor and calendar-handoff corrections.'))
 if fid=='HC-035' and (EV/'hc035-v7-mobile-wrapped-actions.png').exists():
  after.insert(0,image_record(EV/'hc035-v7-mobile-wrapped-actions.png','Candidate: mobile recovery actions remain in bounds','Headless Chromium; actual PlanOpenForm; synthetic recovery records','Uncommitted v7 fixture on hub:a65b2840','390 × 844 viewport; every action lies inside the card. The 28px touch-height concern remains under correction. This is interim visual evidence, not final acceptance.'))
 if fid=='TQ-003':
  after.insert(0,image_record(EV/'dependency-parent-chromium.png','Actual browser security fixture','Headless Chromium; synthetic paste/sanitizer inputs','71152adb','Screenshot supports fixture provenance. The hosted receipt and mutation results establish the four behaviors.'))
  after.append(text_receipt(EV/'tq003-f333cbc2-hosted-browser.md','Hosted Chromium and deliberate regression receipts','GitHub Actions Chromium fixture','f333cbc2'))
 if fid=='HS-007':
  before.append(text_receipt(EV/'finance-sync-red.txt','Progress baseline failure','Local fixture'))
  after.append(text_receipt(EV/'finance-sync-green.txt','Progress regression passes','Local fixture',finding.get('code_commits',[])[-1]))
 if fid=='OP-003':after.append(text_receipt(EV/'factory-input-green.txt','Factory stdin handling regression','Local synthetic runner',finding.get('code_commits',[])[-1]))
 if not before:
  missing.append(fid)
  before.append(dict(kind='gap',title='Baseline receipt needs attachment',note='The finding remains open. Its ledger narrative is not a substitute for an independently inspectable source or runtime receipt.'))
 if not after:after.append(dict(kind='pending',title='After evidence pending',note='No verified implementation receipt has been attached for this finding. The required proof below is an acceptance target, not a test result.'))
 results[fid]=dict(before=before,after=after,required=finding.get('acceptance'),status=finding['status'],runtime=finding.get('runtime'),performanceNote='No latency percentile is claimed without a captured sample count, workload, environment and measurement window.')
(OUT/'assets/finding-evidence.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
summary={'findings':len(results),'baselineGaps':missing,'images':sum(r['kind']=='image' for f in results.values() for side in ['before','after'] for r in f[side]),'consoleReceipts':sum(r['kind']=='console' for f in results.values() for side in ['before','after'] for r in f[side]),'sourceExcerpts':sum(r['kind']=='source' for f in results.values() for r in f['before']),'committedDiffs':sum(r['kind']=='diff' for f in results.values() for r in f['after']),'afterPending':sum(any(r['kind']=='pending' for r in f['after']) for f in results.values())}
(BASE/'finding-evidence-coverage.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
