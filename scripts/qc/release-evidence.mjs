/** Local evidence/patch packets only. Never executes manifest commands or releases. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requirementsFrom } from './proposal-requirement-map.mjs';

export const LIMITS = Object.freeze({ json: 2 * 1024 ** 2, file: 32 * 1024 ** 2, total: 256 * 1024 ** 2, plans: 256, files: 4096, patch: 64 * 1024 ** 2 });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stable = (value) => JSON.stringify(value);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const scope = 'Local owned-file and policy-selected evidence verification; not transitive build, deployment or release authorization.';
const fail = (code) => { throw new Error(code); };
const requireThat = (condition, code) => { if (!condition) fail(code); };
function shape(value, keys, label) {
  requireThat(value && typeof value === 'object' && !Array.isArray(value), `invalid-${label}`);
  requireThat(Object.keys(value).every((key) => keys.includes(key)), `unknown-${label}-field`);
}
function unique(rows, key, label, max = LIMITS.files) {
  requireThat(Array.isArray(rows) && rows.length <= max, `invalid-${label}`);
  requireThat(new Set(rows.map(key)).size === rows.length, `duplicate-${label}`);
}
function relative(name) {
  requireThat(typeof name === 'string' && name.length > 0 && name.length <= 1024 && name.isWellFormed() && !path.isAbsolute(name) && !/[\\:\x00-\x1f\x7f]/.test(name), 'unsafe-path');
  requireThat(name.split('/').every((part) => part && part !== '.' && part !== '..' && part !== '.git' && !part.toLowerCase().startsWith('.env')), 'unsafe-path');
  return name;
}
function rootDirectory(root) {
  requireThat(typeof root === 'string' && path.isAbsolute(root), 'explicit-absolute-root-required');
  let current = path.parse(root).root;
  for (const segment of path.resolve(root).slice(current.length).split('/').filter(Boolean)) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    requireThat(!stat.isSymbolicLink() && stat.isDirectory(), 'unsafe-root');
  }
  return current;
}
function filePath(root, name, absent = false) {
  let current = rootDirectory(root);
  const parts = relative(name).split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) {
      if (absent && error.code === 'ENOENT') return null;
      throw error;
    }
    requireThat(!stat.isSymbolicLink(), 'symlink-denied');
    requireThat(i === parts.length - 1 ? stat.isFile() : stat.isDirectory(), 'nonregular-path');
  }
  return current;
}
function read(root, name, budget, max = LIMITS.file) {
  const absolute = filePath(root, name);
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    requireThat(before.isFile() && before.size <= BigInt(max), 'file-capacity');
    requireThat((before.mode & 0o7000n) === 0n, 'special-file-mode');
    const buffer = Buffer.alloc(Number(before.size) + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const named = fs.lstatSync(absolute, { bigint: true });
    requireThat(length === Number(before.size) && before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeNs === after.mtimeNs && before.ctimeNs === after.ctimeNs && named.ino === before.ino && named.dev === before.dev && !named.isSymbolicLink(), 'read-identity-drift');
    budget.used += length;
    requireThat(budget.used <= LIMITS.total, 'aggregate-capacity');
    const bytes = buffer.subarray(0, length);
    return { bytes, sha256: hash(bytes), mode: (before.mode & 0o111n) ? '100755' : '100644' };
  } finally { fs.closeSync(fd); }
}
function jsonFile(root, name, budget) {
  const file = read(root, name, budget, LIMITS.json);
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(file.bytes)); } catch { fail('invalid-json'); }
  return { ...file, value };
}
function frontmatterArray(text, key) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
  requireThat(front !== undefined, 'missing-plan-frontmatter');
  const lines = front.split(/\r?\n/);
  const positions = lines.flatMap((line, i) => line.startsWith(`${key}:`) ? [i] : []);
  requireThat(positions.length === 1, `missing-or-duplicate-plan-${key}`);
  const index = positions[0];
  const raw = lines[index].slice(key.length + 1).trim();
  const unquote = (value) => value.trim().replace(/^(?:"([^"]*)"|'([^']*)')$/, (_, a, b) => a ?? b);
  if (raw.startsWith('[') && raw.endsWith(']')) return raw.slice(1, -1).split(',').filter((v) => v.trim()).map(unquote);
  requireThat(raw === '', `unsupported-plan-${key}`);
  const items = [];
  for (const line of lines.slice(index + 1)) {
    if (/^\S/.test(line)) break;
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = /^\s+-\s+(.+)$/.exec(line);
    requireThat(match, `unsupported-plan-${key}`);
    items.push(unquote(match[1]));
  }
  return items;
}
export function inventory(root, budget = { used: 0 }) {
  const requirements = read(root, '.planning/REQUIREMENTS.md', budget);
  const allowlist = jsonFile(root, '.planning/operations/360/plan-allowlist.json', budget);
  const baseline = read(root, '.planning/operations/360/baseline.json', budget);
  const definitions = requirementsFrom(requirements.bytes.toString('utf8'));
  unique(definitions, (row) => row.id, 'canonical-requirements');
  requireThat(definitions.length > 0, 'empty-canonical-requirements');
  unique(allowlist.value.plans, (p) => p, 'plans', LIMITS.plans);
  const plans = allowlist.value.plans.map((name) => {
    relative(name);
    requireThat(name.startsWith('.planning/phases/') && name.endsWith('-PLAN.md') && !(allowlist.value.excluded_phase_directories ?? []).some((excluded) => name === excluded || name.startsWith(excluded + '/')), 'unadmitted-plan');
    const source = read(root, name, budget);
    const refs = frontmatterArray(source.bytes.toString('utf8'), 'requirements');
    const files = frontmatterArray(source.bytes.toString('utf8'), 'files_modified');
    unique(refs, (v) => v, 'plan-requirements'); unique(files, (v) => v, 'plan-files');
    requireThat(refs.length && refs.every((id) => definitions.some((r) => r.id === id)), 'unknown-plan-requirement');
    try { files.forEach((file) => relative(file.replace(/\/$/, ''))); } catch { fail(`unsafe-plan-file:${name}`); }
    return { path: name, sha256: source.sha256, requirements: refs, files };
  }).sort((a, b) => compare(a.path, b.path));
  return { requirements: definitions, plans, identity: { requirements: requirements.sha256, allowlist: allowlist.sha256, baseline: baseline.sha256, plans: plans.map(({ path: name, sha256 }) => ({ path: name, sha256 })) } };
}
function git(cwd, args, accepted = [0], maxBuffer = LIMITS.patch) {
  const result = spawnSync('/usr/bin/git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-c', 'core.attributesFile=/dev/null', '-c', 'core.quotePath=false', ...args], {
    cwd, env: { PATH: '/usr/bin:/bin', HOME: cwd, LANG: 'C.UTF-8', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_ATTR_NOSYSTEM: '1', GIT_LITERAL_PATHSPECS: '1', GIT_NO_REPLACE_OBJECTS: '1' }, timeout: 10000, maxBuffer,
  });
  requireThat(!result.error && accepted.includes(result.status), 'native-git-failed');
  return result.stdout;
}
function checkoutHead(directory) {
  requireThat(fs.existsSync(path.join(directory, '.git')), 'independent-git-root-required');
  const top = git(directory, ['rev-parse', '--show-toplevel']).toString().trim();
  requireThat(fs.realpathSync(top) === rootDirectory(directory), 'ancestor-git-identity-denied');
  return git(directory, ['rev-parse', '--verify', 'HEAD']).toString().trim();
}
function verifyTree(directory, commit, files, side) {
  requireThat(git(directory, ['rev-parse', '--verify', `${commit}^{commit}`]).toString().trim() === commit, 'selected-commit-mismatch');
  for (const file of files) {
    const entry = git(directory, ['ls-tree', '-z', commit, '--', file.path]).toString();
    if (file[side] === null) requireThat(entry === '', `${side}-commit-presence-mismatch`);
    else {
      const match = /^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(entry);
      requireThat(match && match[3] === file.path && match[1] === file[side].mode && hash(git(directory, ['cat-file', 'blob', match[2]], [0], LIMITS.file)) === file[side].sha256, `${side}-commit-blob-mismatch`);
    }
  }
}
function contentRecord(root, name, expected, budget) {
  if (expected === null) { requireThat(filePath(root, name, true) === null, 'unexpected-file'); return null; }
  shape(expected, ['sha256', 'mode'], 'file-identity');
  requireThat(SHA.test(expected.sha256) && ['100644', '100755'].includes(expected.mode), 'invalid-file-identity');
  const actual = read(root, name, budget);
  requireThat(actual.sha256 === expected.sha256 && actual.mode === expected.mode, 'source-identity-mismatch');
  return { path: name, sha256: actual.sha256, mode: actual.mode };
}
function prepare(options) {
  const { root, roots, policyPath, policySha256, manifestPath } = options;
  requireThat(SHA.test(policySha256), 'policy-pin-required');
  shape(roots, Object.keys(roots ?? {}), 'roots');
  for (const [id, directory] of Object.entries(roots)) { requireThat(ID.test(id), 'invalid-root-id'); rootDirectory(directory); }
  const budget = { used: 0 };
  const policyFile = jsonFile(root, policyPath, budget);
  requireThat(policyFile.sha256 === policySha256, 'policy-pin-mismatch');
  const policy = policyFile.value;
  shape(policy, ['version', 'catalogue', 'evidenceRoots', 'requirements', 'candidates', 'gates', 'prerequisites'], 'policy');
  requireThat(policy.version === 1, 'unsupported-policy-version');
  const catalogue = inventory(root, budget);
  requireThat(stable(policy.catalogue) === stable(catalogue.identity), 'catalogue-identity-mismatch');
  const manifest = jsonFile(root, manifestPath, budget).value;
  shape(manifest, ['version', 'proofs'], 'manifest'); requireThat(manifest.version === 1, 'unsupported-manifest-version');
  unique(policy.candidates, (v) => v.id, 'candidates', LIMITS.plans);
  unique(policy.requirements, (v) => v.id, 'requirements');
  requireThat(stable(policy.requirements.map((r) => r.id).sort()) === stable(catalogue.requirements.map((r) => r.id).sort()), 'requirement-coverage-mismatch');
  unique(policy.gates, (v) => v.id, 'gates'); unique(manifest.proofs, (v) => v.gate, 'proofs');
  unique(policy.evidenceRoots, (v) => v, 'evidence-roots');
  requireThat(policy.evidenceRoots.every((id) => Object.hasOwn(roots, id)), 'unknown-evidence-root');
  const issues = [];
  let fileCount = 0;
  const ownedPaths = new Set();
  function artifact(row, candidate, kind) {
    shape(row, ['state', 'reason', 'root', 'path', 'sha256', 'digest'], 'artifact');
    requireThat(['present', 'pending', 'not-applicable'].includes(row.state), 'invalid-artifact-state');
    if (row.state !== 'present') {
      requireThat(Object.keys(row).every((key) => ['state', 'reason'].includes(key)), 'contradictory-artifact');
      requireThat(typeof row.reason === 'string' && row.reason.length > 0 && row.reason.length <= 512, 'artifact-disposition-required');
      if (row.state === 'pending') issues.push(`pending-${kind}:${candidate.id}`);
      return row;
    }
    if (kind === 'image') {
      requireThat(Object.keys(row).every((key) => ['state', 'digest'].includes(key)), 'contradictory-artifact'); requireThat(/^sha256:[a-f0-9]{64}$/.test(row.digest), 'invalid-image-digest'); return row; }
    requireThat(Object.keys(row).every((key) => (kind === 'lock' ? ['state', 'path', 'sha256'] : ['state', 'root', 'path', 'sha256']).includes(key)), 'contradictory-artifact');
    requireThat(SHA.test(row.sha256), 'artifact-hash-required');
    const directory = kind === 'lock' ? roots[candidate.afterRoot] : roots[row.root];
    requireThat(directory && (kind === 'lock' || policy.evidenceRoots.includes(row.root)), 'unapproved-artifact-root');
    requireThat(read(directory, row.path, budget).sha256 === row.sha256, 'artifact-identity-mismatch');
    return row;
  }
  const candidates = policy.candidates.map((candidate) => {
    shape(candidate, ['id', 'author', 'prefix', 'beforeRoot', 'afterRoot', 'baseCommit', 'baseGitRoot', 'source', 'locks', 'archives', 'image', 'files'], 'candidate');
    requireThat(ID.test(candidate.id) && ID.test(candidate.author), 'invalid-candidate-id');
    requireThat(Object.hasOwn(roots, candidate.beforeRoot) && Object.hasOwn(roots, candidate.afterRoot), 'unknown-candidate-root');
    if (candidate.prefix) relative(candidate.prefix.replace(/\/$/, ''));
    requireThat(typeof candidate.prefix === 'string' && (!candidate.prefix || candidate.prefix.endsWith('/')), 'invalid-repo-prefix');
    unique(candidate.files, (v) => v.path, 'owned-files'); fileCount += candidate.files.length;
    requireThat(fileCount <= LIMITS.files, 'owned-file-capacity');
    const before = []; const after = [];
    for (const file of candidate.files) {
      shape(file, ['path', 'plan', 'before', 'after'], 'owned-file'); relative(file.path);
      const ownedPath = path.join(rootDirectory(roots[candidate.afterRoot]), file.path);
      requireThat(!ownedPaths.has(ownedPath), 'overlapping-candidate-ownership'); ownedPaths.add(ownedPath);
      const plan = catalogue.plans.find((p) => p.path === file.plan);
      requireThat(plan && plan.files.some((admitted) => admitted === candidate.prefix + file.path || (admitted.endsWith('/') && (candidate.prefix + file.path).startsWith(admitted))), 'unowned-file');
      requireThat(file.before !== null || file.after !== null, 'absent-owned-file');
      before.push(contentRecord(roots[candidate.beforeRoot], file.path, file.before, budget));
      after.push(contentRecord(roots[candidate.afterRoot], file.path, file.after, budget));
    }
    const sorted = (rows) => rows.filter(Boolean).sort((a, b) => compare(a.path, b.path));
    const beforeDigest = hash(stable(sorted(before)));
    const ownedSourceDigest = hash(stable(sorted(after)));
    shape(candidate.source, ['kind', 'value'], 'source');
    if (candidate.source.kind === 'git') {
      requireThat(COMMIT.test(candidate.source.value) && checkoutHead(roots[candidate.afterRoot]) === candidate.source.value, 'source-git-mismatch');
      verifyTree(roots[candidate.afterRoot], candidate.source.value, candidate.files, 'after');
    } else requireThat(candidate.source.kind === 'owned-files' && candidate.source.value === ownedSourceDigest, 'owned-source-digest-mismatch');
    if (candidate.baseCommit !== null) {
      requireThat(COMMIT.test(candidate.baseCommit) && Object.hasOwn(roots, candidate.baseGitRoot), 'base-git-root-required');
      // The registered repository can be at a later HEAD; the selected base is
      // an explicit immutable commit, never an inferred source identity.
      checkoutHead(roots[candidate.baseGitRoot]);
      verifyTree(roots[candidate.baseGitRoot], candidate.baseCommit, candidate.files, 'before');
    } else requireThat(candidate.baseGitRoot === null, 'base-git-root-without-commit');
    requireThat(Array.isArray(candidate.locks) && candidate.locks.length && Array.isArray(candidate.archives) && candidate.archives.length, 'artifact-disposition-required');
    const identity = { id: candidate.id, baseCommit: candidate.baseCommit, baseGitRoot: candidate.baseGitRoot, beforeDigest, source: candidate.source, ownedSourceDigest,
      locks: candidate.locks.map((row) => artifact(row, candidate, 'lock')), archives: candidate.archives.map((row) => artifact(row, candidate, 'archive')), image: artifact(candidate.image, candidate, 'image') };
    return { ...identity, digest: hash(stable(identity)) };
  });
  for (const gate of policy.gates) {
    shape(gate, ['id', 'requirement', 'plan', 'candidate', 'kind', 'reviewer', 'receiptSha256'], 'gate');
    requireThat(ID.test(gate.id) && ID.test(gate.reviewer) && ['source', 'behavior', 'standards', 'spec', 'integration', 'runtime', 'policy'].includes(gate.kind), 'invalid-gate');
    requireThat(gate.receiptSha256 === null || SHA.test(gate.receiptSha256), 'reviewed-receipt-pin-required');
    const plan = catalogue.plans.find((p) => p.path === gate.plan);
    const candidate = policy.candidates.find((c) => c.id === gate.candidate);
    requireThat(plan?.requirements.includes(gate.requirement) && candidate && candidate.files.some((file) => file.plan === gate.plan) && candidate.author !== gate.reviewer, 'invalid-independent-gate');
  }
  for (const row of policy.requirements) {
    shape(row, ['id', 'gates'], 'requirement'); unique(row.gates, (v) => v, 'requirement-gates');
    requireThat(row.gates.every((id) => policy.gates.some((g) => g.id === id && g.requirement === row.id)), 'unknown-required-gate');
    if (!row.gates.length) issues.push(`missing-gate-policy:${row.id}`);
    for (const plan of catalogue.plans.filter((p) => p.requirements.includes(row.id))) {
      if (!row.gates.some((id) => policy.gates.some((g) => g.id === id && g.plan === plan.path))) issues.push(`missing-plan-proof:${plan.path}:${row.id}`);
    }
  }
  requireThat(manifest.proofs.every((p) => policy.gates.some((g) => g.id === p.gate)), 'unknown-proof-gate');
  for (const gate of policy.gates) {
    if (gate.receiptSha256 === null) issues.push(`unreviewed-receipt:${gate.id}`);
    const proof = manifest.proofs.find((p) => p.gate === gate.id);
    if (!proof) { issues.push(`missing-proof:${gate.id}`); continue; }
    shape(proof, ['gate', 'root', 'path', 'sha256'], 'proof');
    requireThat(policy.evidenceRoots.includes(proof.root) && SHA.test(proof.sha256), 'unapproved-proof');
    requireThat(gate.receiptSha256 === null || proof.sha256 === gate.receiptSha256, 'unapproved-receipt-identity');
    const receiptFile = jsonFile(roots[proof.root], proof.path, budget);
    requireThat(receiptFile.sha256 === proof.sha256, 'receipt-hash-mismatch');
    const receipt = receiptFile.value;
    shape(receipt, ['version', 'gate', 'candidateDigest', 'reviewer', 'result'], 'receipt');
    requireThat(receipt.version === 1 && receipt.gate === gate.id && receipt.candidateDigest === candidates.find((c) => c.id === gate.candidate).digest && receipt.reviewer === gate.reviewer, 'receipt-identity-mismatch');
    shape(receipt.result, ['status', 'exitCode', 'passed', 'failed', 'skipped'], 'result');
    const result = receipt.result;
    requireThat(['passed', 'failed', 'pending'].includes(result.status) && (result.exitCode === null || Number.isInteger(result.exitCode)) && ['passed', 'failed', 'skipped'].every((key) => Number.isSafeInteger(result[key]) && result[key] >= 0), 'invalid-result');
    if (result.status !== 'passed' || result.exitCode !== 0 || !result.passed || result.failed || result.skipped) issues.push(`unsatisfied-proof:${gate.id}`);
  }
  unique(policy.prerequisites, (p) => p.path, 'prerequisites');
  for (const prerequisite of policy.prerequisites) {
    shape(prerequisite, ['path', 'sha256'], 'prerequisite');
    if (!filePath(root, prerequisite.path, true)) { issues.push(`missing-prerequisite:${prerequisite.path}`); continue; }
    requireThat(SHA.test(prerequisite.sha256) && read(root, prerequisite.path, budget).sha256 === prerequisite.sha256, 'prerequisite-identity-mismatch');
  }
  return { policy, catalogue, report: { version: 1, verdict: issues.length ? 'incomplete' : 'evidence-qualified', qualificationScope: scope, releaseAuthorized: false, policySha256, catalogue: catalogue.identity, candidates, issues } };
}
export function evaluate(options) {
  try { return prepare(options).report; } catch (error) { return { version: 1, verdict: 'invalid', qualificationScope: scope, releaseAuthorized: false, issues: [error.code ?? error.message] }; }
}
function writeExclusive(root, name, bytes, mode = 0o644) {
  relative(name);
  const destination = path.join(root, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes, { flag: 'wx', mode }); fs.chmodSync(destination, mode);
}
export function createPacket(options, outputRoot, packetName) {
  let destination;
  try {
    const prepared = prepare(options);
    requireThat(Object.hasOwn(options.roots, outputRoot) && ID.test(packetName), 'invalid-output');
    destination = path.join(rootDirectory(options.roots[outputRoot]), packetName);
    const inputs = [options.root, ...prepared.policy.evidenceRoots.map((id) => options.roots[id]), ...prepared.policy.candidates.flatMap((c) => [options.roots[c.beforeRoot], options.roots[c.afterRoot], ...(c.baseGitRoot === null ? [] : [options.roots[c.baseGitRoot]])])].map(rootDirectory);
    requireThat(inputs.every((input) => destination !== input && !destination.startsWith(input + path.sep) && !input.startsWith(destination + path.sep)), 'output-input-overlap');
    fs.mkdirSync(destination, { mode: 0o700 });
    const packetFiles = [];
    const budget = { used: 0 };
    for (const candidate of prepared.policy.candidates) {
      const work = path.join(destination, candidate.id); fs.mkdirSync(work, { mode: 0o700 });
      fs.mkdirSync(path.join(work, 'before')); fs.mkdirSync(path.join(work, 'after'));
      for (const file of candidate.files) {
        for (const side of ['before', 'after']) {
          if (file[side] === null) continue;
          const directory = options.roots[candidate[`${side}Root`]];
          const actual = read(directory, file.path, budget);
          requireThat(actual.sha256 === file[side].sha256 && actual.mode === file[side].mode, 'copy-identity-drift');
          const name = `${candidate.id}/${side}/${file.path}`;
          writeExclusive(destination, name, actual.bytes, actual.mode === '100755' ? 0o755 : 0o644);
          packetFiles.push({ path: name, sha256: actual.sha256, mode: actual.mode });
        }
      }
      const patch = git(work, ['diff', '--no-index', '--no-prefix', '--binary', '--no-ext-diff', '--no-textconv', '--no-renames', '--', 'before', 'after'], [0, 1]);
      budget.used += patch.length; requireThat(budget.used <= LIMITS.total, 'packet-capacity');
      const patchName = `${candidate.id}.patch`;
      writeExclusive(destination, patchName, patch); packetFiles.push({ path: patchName, sha256: hash(patch), mode: '100644' });
      const changed = candidate.files.filter((f) => stable(f.before) !== stable(f.after)).map((f) => f.path).sort();
      if (patch.length) {
        const absolutePatch = path.join(destination, patchName);
        const names = git(work, ['apply', '--numstat', '-z', '--', absolutePatch]).toString().split('\0').filter(Boolean).map((row) => {
          const match = /^(?:\d+|-)\t(?:\d+|-)\t(.+)$/.exec(row); requireThat(match, 'invalid-native-patch-inventory'); return match[1];
        }).sort();
        requireThat(stable(names) === stable(changed), 'unrelated-patch-path');
        const modes = git(work, ['apply', '--summary', '--', absolutePatch]).toString().split('\n').map((line) => line.trim()).filter(Boolean).sort();
        const expectedModes = candidate.files.flatMap((file) => file.before === null ? [`create mode ${file.after.mode} ${file.path}`] : file.after === null ? [`delete mode ${file.before.mode} ${file.path}`] : file.before.mode !== file.after.mode ? [`mode change ${file.before.mode} => ${file.after.mode} ${file.path}`] : []).sort();
        requireThat(stable(modes) === stable(expectedModes), 'patch-mode-mismatch');
        git(path.join(work, 'before'), ['apply', '--check', '--no-index', '--', absolutePatch]);
      } else requireThat(!changed.length, 'missing-patch');
    }
    const final = prepare(options).report;
    requireThat(stable(final) === stable(prepared.report), 'post-packet-input-drift');
    const report = { ...final, packetFiles, patchApplied: false };
    writeExclusive(destination, 'manifest.json', JSON.stringify(report, null, 2) + '\n');
    return report;
  } catch (error) {
    // Preserve any exclusively created partial packet for diagnosis; no reusable
    // successful manifest is emitted after failure. Never delete caller paths.
    return { verdict: 'invalid', qualificationScope: scope, releaseAuthorized: false, issues: [error.code ?? error.message] };
  }
}

function main(argv) {
  const action = argv.shift();
  if (action === 'inventory' && argv.length === 1) { console.log(JSON.stringify(inventory(argv[0]), null, 2)); return; }
  requireThat(action === 'validate' || action === 'packet', 'unsupported-action');
  const options = { roots: {} }; let output; const seen = new Set();
  while (argv.length) {
    const flag = argv.shift(); const value = argv.shift(); requireThat(value !== undefined, 'missing-option');
    requireThat(flag === '--directory' || !seen.has(flag), 'duplicate-option'); seen.add(flag);
    if (flag === '--root') options.root = value;
    else if (flag === '--policy') options.policyPath = value;
    else if (flag === '--policy-sha256') options.policySha256 = value;
    else if (flag === '--manifest') options.manifestPath = value;
    else if (flag === '--directory') { const at = value.indexOf('='); requireThat(at > 0 && !Object.hasOwn(options.roots, value.slice(0, at)), 'duplicate-or-invalid-directory'); options.roots[value.slice(0, at)] = value.slice(at + 1); }
    else if (flag === '--output') output = value;
    else fail('unknown-option');
  }
  requireThat(action !== 'packet' || (typeof output === 'string' && output.split(':').length === 2), 'invalid-output');
  const report = action === 'packet' ? createPacket(options, ...(output ?? '').split(':')) : evaluate(options);
  console.log(JSON.stringify(report, null, 2)); process.exitCode = report.verdict === 'evidence-qualified' ? 0 : report.verdict === 'incomplete' ? 1 : 2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.code ?? error.message); process.exitCode = 2; }
}
