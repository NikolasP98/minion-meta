import json,pathlib,sys,subprocess,tempfile,os,time,hashlib,shutil
from detect_secrets.settings import default_settings
from detect_secrets.core.scan import scan_file, scan_for_allowlisted_secrets_in_file
from detect_secrets.__version__ import VERSION
root=pathlib.Path.cwd();audit=pathlib.Path(__file__).parent
manifest=json.loads((audit/"original-manifest.json").read_text())
rows=[]
for row in manifest[:9]:
 old=audit/"original"/row["path"];new=root/row["path"]
 if str(new).endswith("v1.json"):new=new.with_suffix(".jsonc")
 with default_settings(): before=list(scan_file(str(old)))
 with default_settings(): after=list(scan_file(str(new)))
 with default_settings(): allowed=list(scan_for_allowlisted_secrets_in_file(str(new)))
 assert not after,[(s.type,s.line_number) for s in after]
 rows.append({"path":str(new.relative_to(root)),"before":len(before),"after":len(after),"allowlistedAuditable":len(allowed),"types":sorted({s.type for s in before}),"auditedLines":[s.line_number for s in allowed]})
(audit/"scanner-current-files.json").write_text(json.dumps({"version":VERSION,"rows":rows,"freshDefaultSettingsPerInvocation":True},indent=2)+"\n")
# Explicitly authorized isolated Git test fixture only. The actual C repository is never staged or committed.
scratch=pathlib.Path(tempfile.mkdtemp(prefix="minion-c-security-scope-fixture-"));scratch.chmod(0o700)
def git(*args):return subprocess.check_output(["git","-C",str(scratch),*args],stderr=subprocess.STDOUT,text=True).strip()
git("init","-q");git("config","user.name","Fixture Audit");git("config","user.email","fixture@example.invalid")
for file in [".secrets.baseline",".github/scripts/ci-security-scope.sh"]:
 target=scratch/file;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,target)
git("add","--",".secrets.baseline",".github/scripts/ci-security-scope.sh");git("-c","core.hooksPath=/dev/null","commit","-qm","fixture baseline");base=git("rev-parse","HEAD")
paths=json.loads((audit/"original-feature-paths.json").read_text())
paths=[str(pathlib.Path(p).with_suffix(".jsonc")) if p.endswith(("complaint-evaluation-v1.json","complaint-retry-revisions-v1.json","pulse-cron-wire-v1.json")) else p for p in paths]
for file in paths:
 target=scratch/file;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,target)
git("add","--",*paths);git("-c","core.hooksPath=/dev/null","commit","-qm","fixture candidate")
wrapper=audit/"detect-secrets-hook-pinned";wrapper.write_text('#!/bin/sh\nexec env PYTHONPATH=/home/nikolas/.cache/uv/archive-v0/4G1w7n5doTda01Kz /home/nikolas/.cache/uv/archive-v0/bUqr0IVh_3Lq_HB7/bin/python -c \'import sys; from detect_secrets.pre_commit_hook import main; sys.exit(main())\' "$@"\n');wrapper.chmod(0o700)
def scope(label):
 env=os.environ.copy();env.update(BASE_SHA=base,GITHUB_SHA=git("rev-parse","HEAD"),DETECT_SECRETS_HOOK_BIN=str(wrapper),GITHUB_EVENT_NAME="pull_request",GITHUB_REF="refs/pull/356/merge",GITHUB_BASE_REF="DEV",GITHUB_HEAD_REF="feature/agent-harness-c-gateway")
 log=audit/(label+".log")
 with log.open("w") as f:result=subprocess.run(["bash",".github/scripts/ci-security-scope.sh"],cwd=scratch,env=env,stdout=f,stderr=subprocess.STDOUT)
 log.chmod(0o600)
 return {"exitCode":result.returncode,"log":str(log),"head":env["GITHUB_SHA"]}
positive=scope("unchanged-security-scope-positive");assert positive["exitCode"]==0,positive
canary=scratch/"test-only-canary.ts";canary.write_text('const api_key = "known-fake-never-valid-canary";\n');git("add","--",canary.name);git("-c","core.hooksPath=/dev/null","commit","-qm","negative control canary")
negative=scope("unchanged-security-scope-canary");assert negative["exitCode"]==1,negative
assert "test-only-canary.ts:1" in pathlib.Path(negative["log"]).read_text()
result={"version":VERSION,"scopeScriptSha256":hashlib.sha256((root/".github/scripts/ci-security-scope.sh").read_bytes()).hexdigest(),"baselineSha256":hashlib.sha256((root/".secrets.baseline").read_bytes()).hexdigest(),"scratchRepository":str(scratch),"currentCandidateFiles":len(paths),"positive":positive,"knownFakeCanary":negative,"actualCandidateGitMutations":False,"actualRewrittenHistoryScan":"root-owned follow-up"}
(audit/"scanner-scope-proof.json").write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps({"currentFiles":rows,"scope":result},indent=2))
