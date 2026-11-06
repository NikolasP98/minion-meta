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
  // The meta package may contain unrelated unreleased API work. Qualify only
  // this new export on the exact published consumer baseline, never that work.
  const baseVersion = "0.3.0";
  const baseIntegrity =
    "sha512-6lOD60XIXDM4ykyzp7erMLhooCGFje92o/V3Sqv5ocjfU1NJkCw7kJpC75JvvkL9XG48+lH1BPsbl6+EQU0trA==";
  const response = await fetch(
    "https://registry.npmjs.org/@minion-stack/workforce-client/-/workforce-client-0.3.0.tgz",
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok)
    throw new Error(`Published baseline download failed: ${response.status}`);
  const baseline = Buffer.from(await response.arrayBuffer());
  if (
    baseline.length > 1024 * 1024 ||
    `sha512-${createHash("sha512").update(baseline).digest("base64")}` !==
      baseIntegrity
  )
    throw new Error("Published baseline integrity mismatch");
  const baselineFile = path.join(temporary, "baseline.tgz");
  writeFileSync(baselineFile, baseline);
  execFileSync("tar", ["-xzf", baselineFile, "-C", temporary]);
  const packageRoot = path.join(temporary, "package");
  const manifest = JSON.parse(
    readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  );
  if (
    manifest.name !== "@minion-stack/workforce-client" ||
    manifest.version !== baseVersion
  )
    throw new Error("Wrong package baseline");
  manifest.version = "0.4.0-readiness.1";
  delete manifest.devDependencies;
  delete manifest.scripts;
  manifest.exports["./hub-identity-contract"] = {
    import: "./dist/hub-identity-contract.js",
    types: "./dist/hub-identity-contract.d.ts",
  };
  const pkg = path.join(root, "packages/workforce-client");
  const overlayFiles = readdirSync(path.join(pkg, "dist")).filter((file) =>
    /^hub-identity-contract\.(?:js|d\.ts)(?:\.map)?$/.test(file),
  );
  if (
    !overlayFiles.includes("hub-identity-contract.js") ||
    !overlayFiles.includes("hub-identity-contract.d.ts")
  )
    throw new Error("Missing built identity contract");
  for (const file of overlayFiles)
    cpSync(path.join(pkg, "dist", file), path.join(packageRoot, "dist", file));
  for (const file of ["index.js", "index.d.ts"]) {
    const destination = path.join(packageRoot, "dist", file);
    writeFileSync(
      destination,
      readFileSync(destination, "utf8") +
        "\nexport * from './hub-identity-contract.js';\n",
    );
  }
  writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  mkdirSync(output, { recursive: true });
  execFileSync("pnpm", ["pack", "--pack-destination", output], {
    cwd: packageRoot,
    stdio: "inherit",
  });
  const artifact = `minion-stack-workforce-client-${manifest.version}.tgz`;
  const sha256 = createHash("sha256")
    .update(readFileSync(path.join(output, artifact)))
    .digest("hex");
  const receipt = {
    schemaVersion: 1,
    baseVersion,
    baseIntegrity,
    overlayFiles: [
      ...overlayFiles.map((file) => `dist/${file}`),
      "dist/index.js",
      "dist/index.d.ts",
      "package.json",
    ],
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
