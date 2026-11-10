#!/usr/bin/env python3
"""Rebuild the isolated candidate from pinned Git objects; never edits input repos."""
import argparse,json,os,shutil,subprocess,tarfile,tempfile
from pathlib import Path
ARTIFACT=Path(__file__).resolve().parent
PINS={'gateway':'d3e0fbf54fc657521df07c896ea7adce5ba1afcd','hub':'1f1ab6a327b347645aeff16f5bd675b8d9fbf54d'}
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--gateway-repo',type=Path,required=True)
p.add_argument('--hub-repo',type=Path,required=True)
p.add_argument('--run',action='store_true',help='Run isolated test configs after reconstruction')
a=p.parse_args()
root=Path(tempfile.mkdtemp(prefix='minion-egm-reproduce-'))
for name,repo in [('gateway',a.gateway_repo.resolve()),('hub',a.hub_repo.resolve())]:
    dest=root/name;dest.mkdir()
    if not (repo/'node_modules').is_dir():raise SystemExit(f'Missing reused dependencies: {repo}/node_modules')
    paths=['src','package.json','AGENTS.md' if name=='gateway' else 'CLAUDE.md']
    archive=root/f'{name}.tar'
    with archive.open('wb') as stream:
        subprocess.run(['git','-C',str(repo),'archive',PINS[name],*paths],stdout=stream,check=True)
    with tarfile.open(archive) as tar:
        for member in tar:
            # Archive contents come from known Git objects. Still reject traversal.
            if member.name.startswith('/') or '..' in Path(member.name).parts:raise SystemExit('Unsafe archive path')
            if member.isfile():
                target=dest/member.name;target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes(tar.extractfile(member).read())
    subprocess.run(['git','apply',str(ARTIFACT/f'{name}-candidate.patch')],cwd=dest,check=True)
    (dest/'node_modules').symlink_to(repo/'node_modules',target_is_directory=True)
(root/'node_modules').symlink_to(a.gateway_repo.resolve()/'node_modules',target_is_directory=True)
shutil.copytree(ARTIFACT/'tests',root/'tests')
for filename in ['vitest.config.mjs','hub-candidate.config.mjs']:
    shutil.copy2(ARTIFACT/filename,root/filename)
print(json.dumps({'scratch':str(root),'source_pins':PINS,'dependencies':'reused; no installation or production configuration copied'},indent=2),flush=True)
if a.run:
    for config in ['vitest.config.mjs','hub-candidate.config.mjs']:
        subprocess.run([str(root/'node_modules/.bin/vitest'),'run','--config',config,'--reporter=json',f'--outputFile={config}.results.json'],cwd=root,check=True)
