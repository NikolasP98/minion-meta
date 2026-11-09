import hashlib,json,os,pathlib,subprocess,tarfile
root=pathlib.Path.cwd()
audit=pathlib.Path('/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/development/e-digest/revision-e02')
paths=['src/server/services/pulse-tick.ts','src/server/services/pulse-digest.store.ts']
saved={p:(root/p).read_bytes() for p in paths}
records={p:{'e02Sha256':hashlib.sha256(b).hexdigest()} for p,b in saved.items()}
try:
 with tarfile.open(audit.parent/'freeze-e01/e-owned-source.tar.gz') as archive:
  for p in paths:
   old=archive.extractfile(p).read();(root/p).write_bytes(old)
   records[p]['e01Sha256']=hashlib.sha256(old).hexdigest()
   (audit/('e01-'+pathlib.Path(p).name)).write_bytes(old)
 with (audit/'retention-e01-red.log').open('w') as log:
  cmd=['node','node_modules/vitest/vitest.mjs','run','src/server/services/pulse-digest.collection.test.ts','--maxWorkers=1','-t','redacts expired raw|keeps expired late|caps combined','--reporter=json','--outputFile='+str(audit/'retention-e01-red-results.json')]
  result=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
 records['command']=cmd;records['exitCode']=result.returncode
finally:
 for p,b in saved.items():
  (root/p).write_bytes(b);records[p]['restoredSha256']=hashlib.sha256((root/p).read_bytes()).hexdigest()
 (audit/'retention-e01-red-source.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(records,indent=2))
