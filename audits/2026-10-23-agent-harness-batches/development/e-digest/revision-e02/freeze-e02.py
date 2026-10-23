import hashlib,json,pathlib,stat,subprocess,tarfile
root=pathlib.Path.cwd(); audit=pathlib.Path('/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/development/e-digest'); dst=audit/'freeze-e02'; dst.mkdir(exist_ok=True)
old=json.loads((audit/'freeze-e01/e-owned-files.json').read_text()); paths=sorted({r['path'] for r in old}|{'src/server/services/pulse-ingest-contract.test.ts','src/routes/api/gateway/pulse/proposals/server.test.ts'})
def record(base,p):
 f=base/p;b=f.read_bytes();return {'path':p,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'mode':format(stat.S_IMODE(f.stat().st_mode),'o')}
manifest=[record(root,p) for p in paths];(dst/'e-owned-files.json').write_text(json.dumps(manifest,indent=2)+'\n'); indexed={r['path']:r for r in old}
delta=[{'path':r['path'],'before':indexed.get(r['path']),'after':r} for r in manifest if r!=indexed.get(r['path'])];(dst/'e02-delta-from-e01.json').write_text(json.dumps(delta,indent=2)+'\n')
with tarfile.open(dst/'e-owned-source.tar.gz','w:gz') as archive:
 for p in paths:archive.add(root/p,arcname=p,recursive=False)
(dst/'e-owned.patch').write_bytes(subprocess.check_output(['git','diff','--binary','HEAD','--',*paths]))
froot=root.parent/'f-evals'; fold=json.loads((audit/'freeze-e01/f-feedback-files.json').read_text()); fnow=[record(froot,r['path']) for r in fold];assert fold==fnow,'F6 changed';(dst/'f-feedback-continuity.json').write_text(json.dumps({'unchanged':True,'files':fnow},indent=2)+'\n')
base={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'bun':subprocess.check_output(['bun','--version'],text=True).strip(),'lockSha256':record(root,'bun.lock')['sha256'],'ownedFiles':len(manifest),'changedFromE01':len(delta),'unchangedFromE01':len(old)-(len(delta)-2)};(dst/'base.json').write_text(json.dumps(base,indent=2)+'\n')
checks=[record(dst,p.name) for p in sorted(dst.iterdir()) if p.name!='packet-sha256.json'];(dst/'packet-sha256.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps({'base':base,'delta':[r['path'] for r in delta],'packet':checks},indent=2))
