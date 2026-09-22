#!/usr/bin/env python3
"""Inventory client async/motion signals. Lexical candidates, not runtime coverage."""
from pathlib import Path
import re,json,hashlib,subprocess,datetime
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1];HUB=ROOT/'minion_hub'
patterns={
 'async-function':r'\basync\s+(?:function\s+\w+|\([^)]*\)\s*=>|\w+\s*=>)',
 'network':r'\b(?:fetch|fetchJson|jsonMutation|rpc|wsSend|uploadAttachment)\s*(?:<[^>]+>)?\s*\(',
 'mutation-method':r'method\s*:\s*["\'](?:POST|PUT|PATCH|DELETE)["\']',
 'refresh':r'\b(?:invalidate|invalidateAll|refetch|invalidateQueries)\s*\(',
 'save-gesture':r'(?:onSave(?:Row|Cell)?|onCommit|onsubmit|type=["\']submit|m\.[\w]*(?:[Ss]ave|[Ss]ubmit)|>\s*Save\s*<)',
 'optimistic':r'(?:createOptimistic|\boptimistic\b|\brevert\s*\(|\brollback\b)',
 'svelte-motion':r'(?:transition:|animate:|\bin:(?:fade|fly|slide|scale)|\bout:(?:fade|fly|slide|scale)|from ["\']svelte/(?:transition|animate|motion))',
 'css-motion':r'(?:\btransition(?:-duration|-property)?\s*:|\banimation(?:-duration|-name)?\s*:|@keyframes)',
 'imperative-motion':r'(?:requestAnimationFrame\s*\(|\.animate\s*\(|Ticker\.|animationDuration|setOption\s*\()',
 'pending-feedback':r'(?:\b(?:loading|pending|saving|busy|uploading)\s*=|<Spinner\b|<Skeleton\b|aria-busy)',
 'reduced-motion':r'(?:prefers-reduced-motion|reducedMotion|observeReducedMotion)',
 'poll-or-debounce':r'(?:setInterval\s*\(|[Dd]ebounc|startPolling\s*\()'
}
rows=[];files=[]
for base in [HUB/'src/lib',HUB/'src/routes',ROOT/'packages/ui/src']:
 for p in sorted(base.rglob('*')):
  if p.suffix not in ('.svelte','.ts','.css'):continue
  rel=p.relative_to(ROOT).as_posix()
  if any(s in rel for s in ('/paraglide/','/server/','/routes/api/','/test-utils/','/_test/','/__tests__/','.test.','.spec.','fixture','harness','+server.ts','+page.server.ts','+layout.server.ts')):continue
  text=p.read_text(errors='replace');hits=[]
  for n,line in enumerate(text.splitlines(),1):
   for cat,pattern in patterns.items():
    if re.search(pattern,line):hits.append(dict(category=cat,line=n,excerpt=line.strip()[:210]))
  domain='shared'
  m=re.search(r'/routes/\(app\)/([^/]+)/',rel)
  if not m:m=re.search(r'/components/([^/]+)/',rel)
  if m:domain=m[1]
  files.append(dict(path=rel,sha256=hashlib.sha256(text.encode()).hexdigest(),domain=domain,signals=hits))
  for hit in hits:rows.append(dict(path=rel,domain=domain,**hit))
data=dict(generated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),hub_head=subprocess.check_output(['git','-C',str(HUB),'rev-parse','HEAD'],text=True).strip(),scope='Client source lexical scan; excludes generated messages, server/API and recognized test/fixture files. Comments may match. Async delegation and runtime effects require semantic review.',files=files,counts={k:sum(r['category']==k for r in rows) for k in patterns})
(HERE/'source-inventory.json').write_text(json.dumps(data,indent=2)+'\n')
lines=['# Async and motion source index','','Every scanned client file is listed below; zero signals does not prove synchronous behavior. Counts are lexical signals, including comments. This snapshot is not measured latency or exhaustive runtime coverage. See the spec catalogue for policy and manual evidence.','','| Source | Domain | Signals and line anchors |','|---|---|---|']
for f in files:
 summary='; '.join(f"{k}: "+', '.join(str(h['line']) for h in f['signals'] if h['category']==k) for k in patterns if any(h['category']==k for h in f['signals'])) or 'No lexical signal'
 lines.append(f"| [{f['path']}](../../{f['path']}) | {f['domain']} | {summary} |")
(HERE/'SOURCE-INDEX.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(dict(files=len(files),files_with_signals=sum(bool(f['signals']) for f in files),signals=data['counts']),indent=2))
