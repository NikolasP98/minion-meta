#!/usr/bin/env node
/** Build a reproducible prerelease for cross-repository qualification before npm release. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = process.argv[2] && path.resolve(process.argv[2]);
if (!output)
  throw new Error(
    "Usage: node scripts/pack-workforce-readiness.mjs <output-directory>",
  );
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sourcePaths = [
  "packages/workforce-client",
  "scripts/pack-workforce-readiness.mjs",
];
if (git("status", "--porcelain", "--", ...sourcePaths))
  throw new Error("Commit source and packer before packing");
const sourceCommit = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD:packages/workforce-client");
execFileSync("pnpm", ["--filter", "@minion-stack/workforce-client", "build"], {
  cwd: root,
  stdio: "inherit",
});
const temporary = mkdtempSync(path.join(os.tmpdir(), "workforce-readiness-"));
try {
  const pkg = path.join(root, "packages/workforce-client");
  const manifest = JSON.parse(
    readFileSync(path.join(pkg, "package.json"), "utf8"),
  );
  manifest.version = "0.4.0-readiness.0";
  delete manifest.devDependencies;
  delete manifest.scripts;
  for (const file of ["dist", "README.md"])
    cpSync(path.join(pkg, file), path.join(temporary, file), {
      recursive: true,
    });
  // Incremental compiler state is not part of the runtime package.
  for (const file of readdirSync(path.join(temporary, "dist"))) {
    if (file.endsWith(".tsbuildinfo"))
      rmSync(path.join(temporary, "dist", file));
  }
  writeFileSync(
    path.join(temporary, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  mkdirSync(output, { recursive: true });
  execFileSync("pnpm", ["pack", "--pack-destination", output], {
    cwd: temporary,
    stdio: "inherit",
  });
  const artifact = `minion-stack-workforce-client-${manifest.version}.tgz`;
  const sha256 = createHash("sha256")
    .update(readFileSync(path.join(output, artifact)))
    .digest("hex");
  const receipt = {
    schemaVersion: 1,
    artifact,
    sha256,
    sourceRepository: "NikolasP98/minion-meta",
    sourceCommit,
    sourceTree,
    packCommand: "node scripts/pack-workforce-readiness.mjs <output-directory>",
    contractExport: "@minion-stack/workforce-client/hub-identity-contract",
    version: manifest.version,
  };
  writeFileSync(
    path.join(output, "workforce-contract-provenance.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
