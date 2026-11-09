#!/usr/bin/env node
/** Backport only reviewed error semantics onto the qualified session artifact. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [baselineArg, outputArg] = process.argv.slice(2);
if (!baselineArg || !outputArg)
  throw new Error(
    "Usage: pack-shared-error-readiness.mjs <readiness.1.tgz> <fresh-output-directory>",
  );
const baseline = path.resolve(baselineArg);
const output = path.resolve(outputArg);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const baselineSha256 =
  "caf243eafb15942a32be62652d12e0fc1a1fb2cc3141cdd7bd7075f60bd19fdc";
if (digest(readFileSync(baseline)) !== baselineSha256)
  throw new Error("Wrong qualified session baseline");
if (existsSync(output)) throw new Error("Output directory must be fresh");
const sourceCommit = "900a988ff10d1ca03e0a37fc0228c7566806e15a";
const version = "0.9.1-readiness.2";
const temp = mkdtempSync(path.join(os.tmpdir(), "shared-error-readiness-"));
const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: "inherit" });

try {
  mkdirSync(output, { recursive: true });
  run("tar", ["-xzf", baseline, "-C", temp], root);
  const pkg = path.join(temp, "package");
  const fixture = path.join(temp, "fixture");
  cpSync(path.join(pkg, "dist"), path.join(fixture, "src"), {
    recursive: true,
  });
  const sources = {};
  for (const name of ["client.ts", "client.test.ts"]) {
    const bytes = execFileSync(
      "git",
      ["show", `${sourceCommit}:packages/shared/src/gateway/${name}`],
      { cwd: root },
    );
    writeFileSync(path.join(fixture, "src/gateway", name), bytes);
    sources[`signed-baseline/${name}`] = digest(bytes);
  }
  const patch = "scripts/fixtures/shared-errors/client.patch";
  run("git", ["apply", "--check", path.join(root, patch)], fixture);
  run("git", ["apply", path.join(root, patch)], fixture);
  sources[patch] = digest(readFileSync(path.join(root, patch)));
  for (const name of ["errors.ts", "protocol.ts", "error-transport.test.ts"]) {
    const source = `packages/shared/src/gateway/${name}`;
    cpSync(path.join(root, source), path.join(fixture, "src/gateway", name));
    sources[source] = digest(readFileSync(path.join(root, source)));
  }
  for (const name of ["client", "protocol"]) {
    for (const suffix of ["js", "d.ts"])
      rmSync(path.join(fixture, `src/gateway/${name}.${suffix}`));
  }
  const tools = path.join(root, "packages/shared/node_modules");
  symlinkSync(tools, path.join(fixture, "node_modules"), "dir");
  writeFileSync(
    path.join(fixture, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
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
      files: [
        "./src/gateway/client.ts",
        "./src/gateway/protocol.ts",
        "./src/gateway/errors.ts",
      ],
    }),
  );
  run(
    process.execPath,
    [path.join(tools, "typescript/bin/tsc"), "--project", "tsconfig.json"],
    fixture,
  );
  const testReport = path.join(output, "shared-error-tests.json");
  writeFileSync(
    path.join(fixture, "vitest.config.mjs"),
    `export default ${JSON.stringify({
      test: {
        include: [
          "src/gateway/client.test.ts",
          "src/gateway/error-transport.test.ts",
        ],
        environment: "node",
        minWorkers: 1,
        maxWorkers: 1,
        retry: 0,
        passWithNoTests: false,
        reporters: ["default", "json"],
        outputFile: { json: testReport },
      },
    })};\n`,
  );
  run(
    path.join(tools, ".bin/vitest"),
    ["run", "--config", "vitest.config.mjs"],
    fixture,
  );
  const report = JSON.parse(readFileSync(testReport, "utf8"));
  if (
    !report.success ||
    report.numFailedTests ||
    report.numPendingTests ||
    report.numPassedTests !== 73 ||
    report.testResults.length !== 2
  ) {
    throw new Error("Exact baseline and error behavior suites did not qualify");
  }
  const overlayFiles = [];
  const removedFiles = [];
  for (const name of ["client", "protocol", "errors"]) {
    for (const suffix of ["js", "d.ts"]) {
      const file = `gateway/${name}.${suffix}`;
      cpSync(path.join(fixture, "build", file), path.join(pkg, "dist", file));
      overlayFiles.push(`dist/${file}`);
      const staleMap = `dist/${file}.map`;
      if (existsSync(path.join(pkg, staleMap))) removedFiles.push(staleMap);
      rmSync(path.join(pkg, staleMap), { force: true });
    }
  }
  for (const suffix of ["js", "d.ts"]) {
    const file = `dist/gateway/index.${suffix}`;
    const prior = readFileSync(path.join(pkg, file), "utf8");
    writeFileSync(
      path.join(pkg, file),
      prior.replace(/^\/\/# sourceMappingURL=.*$/m, "") +
        "\nexport * from './errors.js';\n",
    );
    if (existsSync(path.join(pkg, `${file}.map`))) removedFiles.push(`${file}.map`);
    rmSync(path.join(pkg, `${file}.map`), { force: true });
    overlayFiles.push(file);
  }
  const manifest = JSON.parse(
    readFileSync(path.join(pkg, "package.json"), "utf8"),
  );
  if (
    manifest.name !== "@minion-stack/shared" ||
    manifest.version !== "0.9.1-readiness.1"
  )
    throw new Error("Baseline identity mismatch");
  manifest.version = version;
  writeFileSync(
    path.join(pkg, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  run("pnpm", ["pack", "--pack-destination", output], pkg);
  const artifact = `minion-stack-shared-${version}.tgz`;
  const receipt = {
    schemaVersion: 1,
    artifact,
    version,
    baselineSha256,
    sourceCommit,
    sources,
    sha256: digest(readFileSync(path.join(output, artifact))),
    packerSha256: digest(readFileSync(fileURLToPath(import.meta.url))),
    overlayFiles: [...overlayFiles, "package.json"],
    removedFiles,
    verifiedTests: report.numPassedTests,
    testReportSha256: digest(readFileSync(testReport)),
    releaseBoundary:
      "Local qualification artifact; not published or deployed. Existing unrelated package exports preserved.",
  };
  writeFileSync(
    path.join(output, "shared-error-provenance.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
