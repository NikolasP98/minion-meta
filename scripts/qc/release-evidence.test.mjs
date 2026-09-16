import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { inventory, evaluate, createPacket } from './release-evidence.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const planPath = '.planning/phases/20-fixture/20-01-PLAN.md';
function put(root, relative, value, mode = 0o644) {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), value, { mode });
  fs.chmodSync(path.join(root, relative), mode);
}
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-evidence-test-'));
  const dirs = Object.fromEntries(['meta', 'before', 'after', 'proofs', 'output'].map((id) => {
    const directory = path.join(root, id); fs.mkdirSync(directory); return [id, directory];
  }));
  try {
    put(dirs.meta, '.planning/REQUIREMENTS.md', '- [ ] **QC-01**: Synthetic requirement\n');
    put(dirs.meta, '.planning/operations/360/plan-allowlist.json', json({ plans: [planPath], excluded_phase_directories: [] }));
    put(dirs.meta, '.planning/operations/360/baseline.json', '{}\n');
    put(dirs.meta, planPath, '---\nrequirements: ["QC-01"]\nfiles_modified:\n  - "src/file.txt"\n---\nSynthetic only.\n');
    put(dirs.before, 'src/file.txt', 'before\n'); put(dirs.after, 'src/file.txt', 'after\n');
    const catalogue = inventory(dirs.meta);
    const policy = {
      version: 1, catalogue: catalogue.identity,
      evidenceRoots: ['proofs'],
      requirements: [{ id: 'QC-01', gates: ['behavior'] }],
      candidates: [{ id: 'fixture', author: 'author', prefix: '', beforeRoot: 'before', afterRoot: 'after',
        baseCommit: null, baseGitRoot: null, source: { kind: 'owned-files', value: sha(JSON.stringify([{path:'src/file.txt',sha256:sha('after\n'),mode:'100644'}])) },
        locks: [{state:'not-applicable',reason:'synthetic'}], archives: [{state:'not-applicable',reason:'synthetic'}], image: { state: 'not-applicable', reason: 'synthetic local tooling' },
        files: [{ path: 'src/file.txt', plan: planPath, before: { sha256: sha('before\n'), mode: '100644' }, after: { sha256: sha('after\n'), mode: '100644' } }],
      }],
      gates: [{ id: 'behavior', requirement: 'QC-01', plan: planPath, candidate: 'fixture', kind: 'behavior', reviewer: 'reviewer', receiptSha256: null }],
      prerequisites: [],
    };
    const state = { root, dirs, policy, manifest: { version: 1, proofs: [] } };
    state.save = () => {
      put(dirs.meta, 'policy.json', json(policy)); put(dirs.meta, 'manifest.json', json(state.manifest));
      return { root: dirs.meta, roots: dirs, policyPath: 'policy.json', policySha256: sha(json(policy)), manifestPath: 'manifest.json' };
    };
    state.pass = () => {
      const first = evaluate(state.save());
      assert.equal(first.verdict, 'incomplete');
      const receipt = { version: 1, gate: 'behavior', candidateDigest: first.candidates[0].digest, reviewer: 'reviewer',
        result: { status: 'passed', exitCode: 0, passed: 1, failed: 0, skipped: 0 } };
      put(dirs.proofs, 'receipt.json', json(receipt));
      policy.gates[0].receiptSha256 = sha(json(receipt));
      state.manifest.proofs = [{ gate: 'behavior', root: 'proofs', path: 'receipt.json', sha256: sha(json(receipt)) }];
      return receipt;
    };
    return fn(state);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('missing proof is incomplete; exact independent evidence qualifies only the local packet', () => fixture((f) => {
  assert.equal(evaluate(f.save()).verdict, 'incomplete'); f.pass();
  const report = evaluate(f.save()); assert.equal(report.verdict, 'evidence-qualified'); assert.equal(report.releaseAuthorized, false);
}));
test('rejects a policy whose supplied SHA differs', () => fixture((f) => {
  const options = f.save(); options.policySha256 = '0'.repeat(64);
  assert.equal(evaluate(options).verdict, 'invalid');
}));
test('unrelated after bytes cannot be authorized by a manifest assertion', () => fixture((f) => {
  f.pass(); put(f.dirs.after, 'src/file.txt', 'unrelated WIP\n');
  assert.equal(evaluate(f.save()).verdict, 'invalid');
}));
test('creates an exclusive unapplied packet without changing candidate or before bytes', () => fixture((f) => {
  f.pass(); const report = createPacket(f.save(), 'output', 'packet');
  assert.equal(report.verdict, 'evidence-qualified'); assert.equal(report.releaseAuthorized, false);
  assert.equal(fs.readFileSync(path.join(f.dirs.before, 'src/file.txt'), 'utf8'), 'before\n');
  assert.equal(fs.readFileSync(path.join(f.dirs.after, 'src/file.txt'), 'utf8'), 'after\n');
  assert.ok(fs.readFileSync(path.join(f.dirs.output, 'packet', 'fixture.patch'), 'utf8').includes('+after'));
  assert.equal(createPacket(f.save(), 'output', 'packet').verdict, 'invalid');
}));

function replaceReceipt(f, change) {
  const receipt = JSON.parse(fs.readFileSync(path.join(f.dirs.proofs, 'receipt.json'), 'utf8'));
  change(receipt); put(f.dirs.proofs, 'receipt.json', json(receipt));
  f.manifest.proofs[0].sha256 = sha(json(receipt));
  f.policy.gates[0].receiptSha256 = sha(json(receipt));
}
function files(f, rows) {
  f.policy.candidates[0].files = rows.map(({ name, before, after, mode = '100644' }) => {
    if (before !== null) put(f.dirs.before, name, before);
    if (after !== null) put(f.dirs.after, name, after, mode === '100755' ? 0o755 : 0o644);
    return { path: name, plan: planPath, before: before === null ? null : {sha256: sha(before),mode:'100644'}, after: after === null ? null : {sha256: sha(after),mode} };
  });
  put(f.dirs.meta, planPath, `---\nrequirements: [QC-01]\nfiles_modified:\n${rows.map((r) => '  - ' + JSON.stringify(r.name)).join('\n')}\n---\nSynthetic.\n`);
  f.policy.catalogue = inventory(f.dirs.meta).identity;
  const records = f.policy.candidates[0].files.filter((r) => r.after).map((r) => ({path:r.path,...r.after})).sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  f.policy.candidates[0].source.value = sha(JSON.stringify(records));
}

test('self-asserted pass without independently pinned receipt remains incomplete', () => fixture((f) => {
  f.pass(); f.policy.gates[0].receiptSha256 = null;
  const report = evaluate(f.save()); assert.equal(report.verdict, 'incomplete');
  assert.ok(report.issues.includes('unreviewed-receipt:behavior'));
}));
test('manifest cannot replace a policy-approved receipt', () => fixture((f) => {
  f.pass(); const pin = f.policy.gates[0].receiptSha256;
  replaceReceipt(f, (r) => { r.result.passed = 999; }); f.policy.gates[0].receiptSha256 = pin;
  assert.deepEqual(evaluate(f.save()).issues, ['unapproved-receipt-identity']);
}));
for (const [name, change] of [
  ['wrong reviewer', (r) => {r.reviewer='impostor';}],
  ['different candidate identity', (r) => {r.candidateDigest='0'.repeat(64);}],
  ['noninteger result', (r) => {r.result.passed=0.5;}],
]) test(`rejects ${name}`, () => fixture((f) => {
  f.pass(); replaceReceipt(f, change); assert.equal(evaluate(f.save()).verdict, 'invalid');
}));
for (const [name, change] of [
  ['failed', (r) => {r.result.status='failed';r.result.exitCode=1;r.result.failed=1;}],
  ['skipped', (r) => {r.result.skipped=1;}],
  ['zero checks', (r) => {r.result.passed=0;}],
]) test(`${name} evidence stays incomplete`, () => fixture((f) => {
  f.pass(); replaceReceipt(f, change); assert.equal(evaluate(f.save()).verdict, 'incomplete');
}));
test('missing compatibility prerequisite stays explicit even with passing evidence', () => fixture((f) => {
  f.pass(); const name='.planning/phases/14-sdk-transport/14-COMPATIBILITY.md';
  f.policy.prerequisites=[{path:name,sha256:null}];
  assert.ok(evaluate(f.save()).issues.includes(`missing-prerequisite:${name}`));
}));
test('requirement and admitted PLAN bytes cannot drift behind the policy', () => fixture((f) => {
  f.pass(); put(f.dirs.meta, planPath, fs.readFileSync(path.join(f.dirs.meta, planPath),'utf8')+'Drift.\n');
  assert.deepEqual(evaluate(f.save()).issues,['catalogue-identity-mismatch']);
}));
test('missing canonical requirements and self-review gates are rejected', () => fixture((f) => {
  f.policy.requirements=[]; assert.equal(evaluate(f.save()).verdict,'invalid');
  f.policy.requirements=[{id:'QC-01',gates:['behavior']}]; f.policy.gates[0].reviewer='author';
  assert.deepEqual(evaluate(f.save()).issues,['invalid-independent-gate']);
}));
test('all admitted plans for a requirement need explicit proof coverage', () => fixture((f) => {
  const second='.planning/phases/20-fixture/20-02-PLAN.md';
  put(f.dirs.meta,second,'---\nrequirements: [QC-01]\nfiles_modified: [src/other.txt]\n---\n');
  put(f.dirs.meta,'.planning/operations/360/plan-allowlist.json',json({plans:[planPath,second]}));
  f.policy.catalogue=inventory(f.dirs.meta).identity; f.pass();
  assert.ok(evaluate(f.save()).issues.includes(`missing-plan-proof:${second}:QC-01`));
}));
test('lock and archive bytes are independently checked', () => fixture((f) => {
  put(f.dirs.after,'lock.json','lock'); put(f.dirs.proofs,'archive.tgz','archive');
  f.policy.candidates[0].locks=[{state:'present',path:'lock.json',sha256:sha('lock')}];
  f.policy.candidates[0].archives=[{state:'present',root:'proofs',path:'archive.tgz',sha256:sha('archive')}];
  f.pass(); assert.equal(evaluate(f.save()).verdict,'evidence-qualified');
  put(f.dirs.proofs,'archive.tgz','changed'); assert.deepEqual(evaluate(f.save()).issues,['artifact-identity-mismatch']);
}));
for (const name of ['../outside','/absolute','.env','src/.env.local','src/../escape']) {
  test(`denies unsafe owned path ${name}`, () => fixture((f) => {
    f.policy.candidates[0].files[0].path=name; assert.deepEqual(evaluate(f.save()).issues,['unsafe-path']);
  }));
}
test('does not follow source or parent symlinks', () => fixture((f) => {
  fs.unlinkSync(path.join(f.dirs.after,'src/file.txt'));
  fs.symlinkSync(path.join(f.dirs.before,'src/file.txt'),path.join(f.dirs.after,'src/file.txt'));
  assert.deepEqual(evaluate(f.save()).issues,['symlink-denied']);
  fs.rmSync(path.join(f.dirs.after,'src'),{recursive:true});
  fs.symlinkSync(path.join(f.dirs.before,'src'),path.join(f.dirs.after,'src'));
  assert.deepEqual(evaluate(f.save()).issues,['symlink-denied']);
}));
test('rejects nonregular sources before opening and malformed JSON without content leakage', () => fixture((f) => {
  fs.unlinkSync(path.join(f.dirs.after,'src/file.txt'));fs.mkdirSync(path.join(f.dirs.after,'src/file.txt'));
  assert.deepEqual(evaluate(f.save()).issues,['nonregular-path']);
  const options=f.save();put(f.dirs.meta,'manifest.json','{"private-marker": broken');
  assert.deepEqual(evaluate(options).issues,['invalid-json']);
}));
test('unknown command fields are rejected without execution', () => fixture((f) => {
  f.manifest.command='touch SHOULD_NOT_EXIST';
  assert.deepEqual(evaluate(f.save()).issues,['unknown-manifest-field']);
  assert.equal(fs.existsSync(path.join(f.root,'SHOULD_NOT_EXIST')),false);
}));
test('denies overlapping output and source roots before mutation', () => fixture((f) => {
  assert.deepEqual(createPacket(f.save(),'after','packet').issues,['output-input-overlap']);
  assert.equal(fs.existsSync(path.join(f.dirs.after,'packet')),false);
}));
test('native patch verifies spaces, binary, addition, deletion, executable mode and inert shell syntax', () => fixture((f) => {
  files(f,[
    {name:'src/space name.txt',before:'old\n',after:'new\n',mode:'100755'},
    {name:'src/binary.bin',before:Buffer.from([0,1,2]),after:Buffer.from([0,3,4])},
    {name:'src/added file',before:null,after:'added\n'},
    {name:'src/deleted file',before:'deleted\n',after:null},
    {name:'src/$(touch sentinel)',before:'before\n',after:'after\n'},
  ]);
  f.pass(); const report=createPacket(f.save(),'output','packet');
  assert.equal(report.verdict,'evidence-qualified',JSON.stringify(report));
  const patch=fs.readFileSync(path.join(f.dirs.output,'packet/fixture.patch'),'utf8');
  assert.ok(patch.includes('GIT binary patch')); assert.ok(patch.includes('new mode 100755'));
  assert.equal(fs.existsSync(path.join(f.root,'sentinel')),false);
  assert.equal(fs.existsSync(path.join(f.dirs.before,'src/added file')),false);
  assert.equal(fs.readFileSync(path.join(f.dirs.before,'src/deleted file'),'utf8'),'deleted\n');
}));
test('ordinary copies cannot borrow the enclosing repository HEAD', () => fixture((f) => {
  f.policy.candidates[0].source={kind:'git',value:'a'.repeat(40)};
  assert.deepEqual(evaluate(f.save()).issues,['independent-git-root-required']);
}));

function testGit(cwd, args) {
  const result = spawnSync('/usr/bin/git', ['-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false','-c','user.name=Synthetic QC','-c','user.email=synthetic@example.invalid',...args], {
    cwd, env:{PATH:'/usr/bin:/bin',HOME:cwd,LANG:'C.UTF-8',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_LITERAL_PATHSPECS:'1'}, timeout:5000,
  });
  assert.equal(result.status,0,result.stderr.toString()); return result.stdout.toString().trim();
}
test('real disposable Git base blobs and HEAD are checked separately from owned WIP', () => fixture((f) => {
  for (const dir of [f.dirs.before,f.dirs.after]) {
    testGit(dir,['init','--quiet']); testGit(dir,['add','--','src/file.txt']); testGit(dir,['commit','--quiet','-m','Synthetic fixture']);
  }
  f.policy.candidates[0].baseCommit=testGit(f.dirs.before,['rev-parse','HEAD']);
  f.policy.candidates[0].baseGitRoot='before';
  f.policy.candidates[0].source={kind:'git',value:testGit(f.dirs.after,['rev-parse','HEAD'])};
  f.pass(); assert.equal(evaluate(f.save()).verdict,'evidence-qualified');
  f.policy.candidates[0].source.value='0'.repeat(40);
  assert.deepEqual(evaluate(f.save()).issues,['source-git-mismatch']);
}));
test('a matching working file cannot disguise a different base commit blob', () => fixture((f) => {
  testGit(f.dirs.before,['init','--quiet']);
  put(f.dirs.before,'src/file.txt','committed content');
  testGit(f.dirs.before,['add','--','src/file.txt']);testGit(f.dirs.before,['commit','--quiet','-m','Synthetic fixture']);
  f.policy.candidates[0].baseCommit=testGit(f.dirs.before,['rev-parse','HEAD']);
  f.policy.candidates[0].baseGitRoot='before';
  put(f.dirs.before,'src/file.txt','before\n');
  assert.deepEqual(evaluate(f.save()).issues,['before-commit-blob-mismatch']);
}));
test('nested ordinary copy cannot adopt its actual ancestor Git identity', () => fixture((f) => {
  testGit(f.root,['init','--quiet']);testGit(f.root,['add','--','after/src/file.txt']);testGit(f.root,['commit','--quiet','-m','Synthetic ancestor']);
  f.policy.candidates[0].source={kind:'git',value:testGit(f.root,['rev-parse','HEAD'])};
  assert.deepEqual(evaluate(f.save()).issues,['independent-git-root-required']);
}));
test('a sparse oversized source is rejected before allocation', () => fixture((f) => {
  fs.truncateSync(path.join(f.dirs.after,'src/file.txt'),32*1024**2+1);
  assert.deepEqual(evaluate(f.save()).issues,['file-capacity']);
}));
test('a FIFO is rejected without a blocking open', () => fixture((f) => {
  const name=path.join(f.dirs.after,'src/file.txt');fs.unlinkSync(name);
  const made=spawnSync('/usr/bin/mkfifo',[name],{env:{PATH:'/usr/bin:/bin'},timeout:1000}); assert.equal(made.status,0);
  assert.deepEqual(evaluate(f.save()).issues,['nonregular-path']);
}));
test('explicit owned children may use an admitted directory without scanning unrelated WIP', () => fixture((f) => {
  put(f.dirs.meta,planPath,'---\nrequirements: [QC-01]\nfiles_modified: [src/]\n---\n');
  f.policy.catalogue=inventory(f.dirs.meta).identity; put(f.dirs.after,'src/unrelated.txt','private unrelated WIP');
  f.pass();const report=createPacket(f.save(),'output','packet');
  assert.equal(report.verdict,'evidence-qualified');
  assert.ok(report.packetFiles.every((row)=>!row.path.includes('unrelated')));
}));

test('dirty after bytes cannot be described as the clean source commit', () => fixture((f) => {
  testGit(f.dirs.after,['init','--quiet']);
  put(f.dirs.after,'src/file.txt','committed after');
  testGit(f.dirs.after,['add','--','src/file.txt']);testGit(f.dirs.after,['commit','--quiet','-m','Synthetic source']);
  f.policy.candidates[0].source={kind:'git',value:testGit(f.dirs.after,['rev-parse','HEAD'])};
  put(f.dirs.after,'src/file.txt','after\n');
  assert.deepEqual(evaluate(f.save()).issues,['after-commit-blob-mismatch']);
}));
test('Git replacement refs cannot reinterpret a pinned source commit', () => fixture((f) => {
  testGit(f.dirs.after,['init','--quiet']);
  put(f.dirs.after,'src/file.txt','original commit');
  testGit(f.dirs.after,['add','--','src/file.txt']);testGit(f.dirs.after,['commit','--quiet','-m','Original']);
  const original=testGit(f.dirs.after,['rev-parse','HEAD']);
  put(f.dirs.after,'src/file.txt','after\n');
  testGit(f.dirs.after,['add','--','src/file.txt']);testGit(f.dirs.after,['commit','--quiet','-m','Replacement']);
  const replacement=testGit(f.dirs.after,['rev-parse','HEAD']);
  testGit(f.dirs.after,['update-ref','HEAD',original]);testGit(f.dirs.after,['replace',original,replacement]);
  assert.equal(testGit(f.dirs.after,['show',original+':src/file.txt']),'after');
  f.policy.candidates[0].source={kind:'git',value:original};
  assert.deepEqual(evaluate(f.save()).issues,['after-commit-blob-mismatch']);
}));
test('materialized before images use an explicit separate repository for immutable base verification', () => fixture((f) => {
  testGit(f.dirs.after,['init','--quiet']);put(f.dirs.after,'src/file.txt','before\n');
  testGit(f.dirs.after,['add','--','src/file.txt']);testGit(f.dirs.after,['commit','--quiet','-m','Base']);
  f.policy.candidates[0].baseCommit=testGit(f.dirs.after,['rev-parse','HEAD']);
  f.policy.candidates[0].baseGitRoot='after';
  put(f.dirs.after,'src/file.txt','later committed bytes');
  testGit(f.dirs.after,['add','--','src/file.txt']);testGit(f.dirs.after,['commit','--quiet','-m','Later']);
  put(f.dirs.after,'src/file.txt','after\n');
  const head=testGit(f.dirs.after,['rev-parse','HEAD']);
  f.pass();const report=createPacket(f.save(),'output','packet');
  assert.equal(report.verdict,'evidence-qualified',JSON.stringify(report));
  assert.equal(testGit(f.dirs.after,['rev-parse','HEAD']),head);
  assert.equal(fs.existsSync(path.join(f.dirs.before,'.git')),false);
}));
