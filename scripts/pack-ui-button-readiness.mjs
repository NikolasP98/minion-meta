#!/usr/bin/env node
/** Overlay the reviewed Button on the exact shared Hub/Site UI baseline. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
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
const [baselineArg, outputArg] = process.argv.slice(2);
if (!baselineArg || !outputArg)
  throw new Error(
    "Usage: pack-ui-button-readiness.mjs <qualified-ui.tgz> <fresh-output-directory>",
  );
const baseline = path.resolve(baselineArg);
const output = path.resolve(outputArg);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const baselineSha256 =
  "6b21ce0eb1ba09d840039ba8830171a380a15eb19a9f537c7e783bdb4f9b1dfc";
if (hash(readFileSync(baseline)) !== baselineSha256)
  throw new Error("Unqualified UI baseline");
if (existsSync(output)) throw new Error("Output directory must be fresh");
const version = "0.1.0-readiness.1";
const overlayFiles = [
  "dist/Button.svelte",
  "dist/Button.svelte.d.ts",
  "package.json",
];
const source = "packages/ui/src/lib/Button.svelte";
const built = "packages/ui/dist/Button.svelte";
if (
  hash(readFileSync(path.join(root, source))) !==
  hash(readFileSync(path.join(root, built)))
)
  throw new Error("Canonical UI build is stale");
const temporary = mkdtempSync(path.join(os.tmpdir(), "minion-ui-button-"));
function inventory(directory, relative = "") {
  const entries = {};
  for (const entry of readdirSync(path.join(directory, relative), {
    withFileTypes: true,
  })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(entries, inventory(directory, name));
    else if (entry.isFile())
      entries[name] = hash(readFileSync(path.join(directory, name)));
    else throw new Error(`Unexpected non-file package entry: ${name}`);
  }
  return entries;
}
const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: "inherit" });
try {
  mkdirSync(output, { recursive: true });
  run("tar", ["-xzf", baseline, "-C", temporary], root);
  const pkg = path.join(temporary, "package");
  const before = inventory(pkg);
  for (const name of overlayFiles.slice(0, 2))
    cpSync(path.join(root, "packages/ui", name), path.join(pkg, name));
  const manifest = JSON.parse(
    readFileSync(path.join(pkg, "package.json"), "utf8"),
  );
  if (manifest.name !== "@minion-stack/ui" || manifest.version !== "0.1.0")
    throw new Error("Baseline identity mismatch");
  manifest.version = version;
  writeFileSync(
    path.join(pkg, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  run("pnpm", ["pack", "--pack-destination", output], pkg);
  const artifact = `minion-stack-ui-${version}.tgz`;
  const unpacked = path.join(temporary, "verification");
  mkdirSync(unpacked);
  run("tar", ["-xzf", path.join(output, artifact), "-C", unpacked], root);
  const after = inventory(path.join(unpacked, "package"));
  if (
    JSON.stringify(Object.keys(before).sort()) !==
    JSON.stringify(Object.keys(after).sort())
  )
    throw new Error("UI overlay added or removed package members");
  const changed = Object.keys(before)
    .filter((name) => before[name] !== after[name])
    .sort();
  if (JSON.stringify(changed) !== JSON.stringify([...overlayFiles].sort()))
    throw new Error(
      "UI overlay changed an unexpected member or omitted a required change",
    );
  const sources = Object.fromEntries(
    [
      source,
      "packages/ui/dist/Button.svelte",
      "packages/ui/dist/Button.svelte.d.ts",
    ].map((name) => [name, hash(readFileSync(path.join(root, name)))]),
  );
  const receipt = {
    schemaVersion: 1,
    artifact,
    version,
    baselineSha256,
    sha256: hash(readFileSync(path.join(output, artifact))),
    packerSha256: hash(readFileSync(fileURLToPath(import.meta.url))),
    sources,
    overlayFiles,
    removedFiles: [],
    before,
    after,
    releaseBoundary:
      "Local Button-only qualification artifact; no publication or deployment. All other members match the exact qualified Hub/Site baseline.",
  };
  // Keep the short, closed member allowlist in the consumer formatter's canonical form.
  const serialized = JSON.stringify(receipt, null, 2).replace(
    /"overlayFiles": \[[\s\S]*?\]/,
    `"overlayFiles": [${overlayFiles.map((name) => JSON.stringify(name)).join(", ")}]`,
  );
  writeFileSync(
    path.join(output, "ui-button-provenance.json"),
    serialized + "\n",
  );
  console.log(
    JSON.stringify({
      artifact,
      sha256: receipt.sha256,
      members: Object.keys(after).length,
      changed,
    }),
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
