#!/usr/bin/env python3
"""Freeze C-owned source and build identities, excluding preserved install noise."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import stat
import subprocess
import tarfile

root = Path.cwd()
proof = Path(__file__).resolve().parent
def git(*args):
    return subprocess.check_output(["git", *args])
def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
tracked = sorted(filter(None, git("diff", "--name-only", "-z", "HEAD").decode().split("\0")))
untracked = sorted(filter(None, git("ls-files", "--others", "--exclude-standard", "-z").decode().split("\0")))
excluded = [p for p in tracked + untracked if "/node_modules/" in p]
files = sorted(set(tracked + untracked) - set(excluded))
records = []
for relative in files:
    file = root / relative
    metadata = file.lstat()
    records.append({"path": relative, "kind": "untracked" if relative in untracked else "tracked", "mode": oct(stat.S_IMODE(metadata.st_mode)), "size": metadata.st_size, "sha256": digest(file)})
patch = git("diff", "--binary", "--full-index", "HEAD", "--", *[p for p in tracked if p not in excluded])
(proof / "candidate.patch").write_bytes(patch)
with tarfile.open(proof / "candidate-untracked.tar.gz", "w:gz") as archive:
    for relative in untracked:
        if relative not in excluded:
            archive.add(root / relative, arcname=relative, recursive=False)
sdk = root / "node_modules/@minion-stack/drone"
pins = ["pnpm-lock.yaml", "node_modules/@minion-stack/drone/package.json", "node_modules/@minion-stack/drone/dist/types.d.ts", "node_modules/@minion-stack/drone/dist/run.js"]
manifest = {"frozenAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "root": str(root), "branch": git("branch", "--show-current").decode().strip(), "baseHead": git("rev-parse", "HEAD").decode().strip(), "baseTree": git("rev-parse", "HEAD^{tree}").decode().strip(), "sourceState": "uncommitted scoped candidate; HEAD alone is not candidate identity", "node": subprocess.check_output(["node", "--version"], text=True).strip(), "pnpm": subprocess.check_output(["pnpm", "--version"], text=True).strip(), "droneVersion": json.loads((sdk / "package.json").read_text())["version"], "pins": [{"path": p, "sha256": digest(root / p)} for p in pins], "candidatePatchSha256": hashlib.sha256(patch).hexdigest(), "untrackedArchiveSha256": digest(proof / "candidate-untracked.tar.gz"), "files": records, "excludedPreservedInstallNoise": [{"path": p, "mode": oct(stat.S_IMODE((root / p).lstat().st_mode)), "sha256": digest(root / p)} for p in excluded]}
(proof / "source-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
build = []
if (root / "dist").is_dir():
    for file in sorted((root / "dist").rglob("*")):
        if file.is_file():
            build.append({"path": str(file.relative_to(root)), "size": file.stat().st_size, "sha256": digest(file)})
(proof / "build-manifest.json").write_text(json.dumps({"sourcePatchSha256": manifest["candidatePatchSha256"], "sourceManifestSha256": digest(proof / "source-manifest.json"), "files": build}, indent=2) + "\n")
print(json.dumps({"sourceManifestSha256": digest(proof / "source-manifest.json"), "patchSha256": manifest["candidatePatchSha256"], "candidateFiles": len(records), "excludedInstallNoise": len(excluded), "buildFiles": len(build)}))
