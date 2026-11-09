import pathlib,subprocess,json,hashlib,stat,tarfile,datetime
root=pathlib.Path.cwd();audit=pathlib.Path(__file__).parent
base="cc150b56b2b0d4396d44b9ef6f14b5d772c52db8";expected="53726013ba7347d0488478272df44561cf4b5c5d"
def git(*args):return subprocess.check_output(["git",*args])
assert git("rev-parse","HEAD").decode().strip()==expected
original=json.loads((audit/"original-manifest.json").read_text());feature=json.loads((audit/"original-feature-paths.json").read_text())
oldfixtures=[row["path"] for row in original[:3]];newfixtures=[str(pathlib.Path(p).with_suffix(".jsonc")) for p in oldfixtures]
owned=[row["path"] for row in original[:9]]+newfixtures
status=git("status","--porcelain=v1").decode().splitlines();initial=(audit/"original-status.txt").read_text().splitlines()
noise=[line[3:] for line in initial];assert len(noise)==20
assert [line for line in status if line[3:] in noise]==initial
assert not [line for line in status if line[3:] not in noise and line[3:] not in owned]
(audit/"correction.patch").write_bytes(git("diff","--binary","HEAD","--",*owned))
(audit/"candidate.patch").write_bytes(git("diff","--binary",base,"--",*feature))
with tarfile.open(audit/"candidate-untracked.tar.gz","w:gz") as tar:
 for file in newfixtures:tar.add(root/file,arcname=file,recursive=False)
rows=[]
for file in sorted(set(feature+newfixtures)):
 p=root/file
 if not p.exists():rows.append({"path":file,"state":"removed","classification":"strict JSON source renamed to JSONC; original immutable audit copy retained"});continue
 classification="unchanged original feature candidate"
 if file in newfixtures:classification="test fixture representation only: JSONC comments and formatter punctuation; decoded and reconstructed strict JSON equivalent"
 elif file in [original[i]["path"] for i in [3,5,6,7]]:classification="exact test-only credential comment; AST leaf tokens identical"
 elif file==original[4]["path"]:classification="trusted retry fixture test loader JSON5 import/path/parse, annotated regeneration, credential comment; remaining test AST identical"
 elif file==original[8]["path"]:classification="trusted Pulse fixture test loader JSON5 import/path/parse, deterministic exact strict byte checksum reconstruction, public checksum comment; remaining test AST identical"
 rows.append({"path":file,"state":"present","sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"mode":oct(stat.S_IMODE(p.stat().st_mode)),"classification":classification})
(audit/"candidate-file-manifest.json").write_text(json.dumps(rows,indent=2)+"\n")
(audit/"final-status.txt").write_text("\n".join(status)+"\n")
wrapperproof=[{"path":file,"sha256":hashlib.sha256((root/file).read_bytes()).hexdigest(),"mode":oct(stat.S_IMODE((root/file).stat().st_mode))} for file in noise]
(audit/"excluded-install-wrapper-noise.json").write_text(json.dumps(wrapperproof,indent=2)+"\n")
artifacts=[]
for file in ["correction.patch","candidate.patch","candidate-untracked.tar.gz","candidate-file-manifest.json","equivalence-proof.json","scanner-current-files.json","scanner-scope-proof.json"]:
 p=audit/file;artifacts.append({"path":file,"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"bytes":p.stat().st_size,"mode":oct(stat.S_IMODE(p.stat().st_mode))})
record={"frozenAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"head":expected,"base":base,"candidatePathCount":len(feature),"renamedSourceFixtures":3,"productionBehaviorChanges":0,"unrelatedInstallWrapperPathsPreserved":20,"gitMutationsPerformed":False,"artifacts":artifacts}
(audit/"freeze-manifest.json").write_text(json.dumps(record,indent=2)+"\n")
print(json.dumps(record,indent=2))
