#!/usr/bin/env node
/** Qualify the reviewed session hook on the exact installed shared-package baseline. */
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
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = process.argv[2] && path.resolve(process.argv[2]);
if (!output)
  throw new Error(
    "Usage: node scripts/pack-shared-session-readiness.mjs <output-directory>",
  );
// A failed qualification must never leave an earlier successful receipt in place.
if (existsSync(output))
  throw new Error(
    "Output directory must be fresh; choose a new qualification path",
  );
const sourceCommit = "900a988ff10d1ca03e0a37fc0228c7566806e15a";
const baseVersion = "0.9.0";
const baseIntegrity =
  "sha512-oImoUxBYUGpBcYudNIPiJ9k8on/oYYbanJqENoRgP9QuSpPSuKq01k/uQ0+6G1bS1AsV+owehYA9ltXnqulv+w==";
const version = "0.9.1-readiness.1";
const temporary = mkdtempSync(
  path.join(os.tmpdir(), "shared-session-readiness-"),
);
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

try {
  mkdirSync(output, { recursive: true });
  const response = await fetch(
    "https://registry.npmjs.org/@minion-stack/shared/-/shared-0.9.0.tgz",
    {
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok)
    throw new Error(`Baseline download failed: ${response.status}`);
  const baseline = Buffer.from(await response.arrayBuffer());
  if (
    baseline.length > 2 * 1024 * 1024 ||
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
    manifest.name !== "@minion-stack/shared" ||
    manifest.version !== baseVersion
  )
    throw new Error("Wrong baseline package identity");

  // Overlay only the reviewed client change. Packing meta HEAD would also adopt
  // unrelated unreleased protocol-validation and SDK changes in both frontends.
  const fixture = path.join(temporary, "fixture");
  cpSync(path.join(packageRoot, "dist"), path.join(fixture, "src"), {
    recursive: true,
  });
  const sources = {};
  for (const file of ["client.ts", "client.test.ts"]) {
    const source = git(
      "show",
      `${sourceCommit}:packages/shared/src/gateway/${file}`,
    );
    writeFileSync(path.join(fixture, "src/gateway", file), source);
    sources[file] = digest(source);
  }
  for (const file of ["client.js", "client.d.ts"])
    rmSync(path.join(fixture, "src/gateway", file));
  writeFileSync(
    path.join(fixture, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  // Reuse installed tools; no install scripts, credentials or application env files.
  const toolRoot = path.join(root, "packages/shared/node_modules");
  symlinkSync(toolRoot, path.join(fixture, "node_modules"), "dir");
  writeFileSync(
    path.join(fixture, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        skipLibCheck: true,
        declaration: true,
        noEmitOnError: true,
        lib: ["ES2022", "DOM"],
        rootDir: "./src",
        outDir: "./build",
      },
      files: ["./src/gateway/client.ts"],
    }),
  );
  execFileSync(
    process.execPath,
    [path.join(toolRoot, "typescript/bin/tsc"), "--project", "tsconfig.json"],
    {
      cwd: fixture,
      stdio: "inherit",
    },
  );
  const reportPath = path.join(output, "shared-session-client-tests.json");
  writeFileSync(
    path.join(fixture, "vitest.config.mjs"),
    `export default ${JSON.stringify({
      test: {
        include: ["src/gateway/client.test.ts"],
        environment: "node",
        minWorkers: 1,
        maxWorkers: 1,
        retry: 0,
        passWithNoTests: false,
        reporters: ["default", "json"],
        outputFile: { json: reportPath },
      },
    })};\n`,
  );
  execFileSync(
    path.join(toolRoot, ".bin/vitest"),
    ["run", "--config", "vitest.config.mjs"],
    {
      cwd: fixture,
      stdio: "inherit",
    },
  );
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  if (
    report.success !== true ||
    report.numFailedTests ||
    report.numPendingTests ||
    report.numPassedTests < 65 ||
    report.testResults.length !== 1
  )
    throw new Error(
      "Reviewed client behavior did not qualify on the published baseline",
    );

  const overlayFiles = ["dist/gateway/client.js", "dist/gateway/client.d.ts"];
  for (const file of overlayFiles)
    cpSync(
      path.join(fixture, "build", file.slice("dist/".length)),
      path.join(packageRoot, file),
    );
  if (
    !readFileSync(path.join(packageRoot, overlayFiles[0]), "utf8").includes(
      "notifyAuthenticated",
    ) ||
    !readFileSync(path.join(packageRoot, overlayFiles[1]), "utf8").includes(
      "onAuthenticated",
    )
  )
    throw new Error("Both callback runtime and declarations must be present");
  // The published baseline carried test output. It is not a public export and
  // must not ride this runtime artifact. Old client maps describe replaced code.
  const removedFiles = [];
  function cleanOutput(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) cleanOutput(file);
      else if (
        /\.test\.(?:js|d\.ts)(?:\.map)?$/.test(entry.name) ||
        (directory === path.join(packageRoot, "dist/gateway") &&
          ["client.js.map", "client.d.ts.map"].includes(entry.name))
      ) {
        removedFiles.push(path.relative(packageRoot, file));
        rmSync(file);
      }
    }
  }
  cleanOutput(path.join(packageRoot, "dist"));
  manifest.version = version;
  delete manifest.devDependencies;
  delete manifest.scripts;
  writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  execFileSync("pnpm", ["pack", "--pack-destination", output], {
    cwd: packageRoot,
    stdio: "inherit",
  });
  const artifact = `minion-stack-shared-${version}.tgz`;
  const receipt = {
    schemaVersion: 1,
    artifact,
    version,
    baseVersion,
    baseIntegrity,
    sha256: digest(readFileSync(path.join(output, artifact))),
    sourceRepository: "NikolasP98/minion-meta",
    sourceCommit,
    sources,
    packerSha256: digest(readFileSync(fileURLToPath(import.meta.url))),
    overlayFiles: [...overlayFiles, "package.json"],
    removedFiles: removedFiles.sort(),
    verifiedClientTests: report.numPassedTests,
    testReportSha256: digest(readFileSync(reportPath)),
    command:
      "node scripts/pack-shared-session-readiness.mjs <output-directory>",
    releaseBoundary:
      "Local qualification artifact; not published to npm or deployed.",
  };
  writeFileSync(
    path.join(output, "shared-session-provenance.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
