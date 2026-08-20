#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliMappings, readPolicy } from './repo-policy.mjs';
import { INCLUDE_BYTES, checkCliRegistry, checkInstructionPair, checkProjections, checkRootProjections, renderBlock } from './check-agent-instructions.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const policy = readPolicy();
const checker = join(root, 'scripts/check-agent-instructions.mjs');

function goodAgents(extra = '') {
  return `# AGENTS.md — fixture repository

This fixture stands in for a product repository's canonical, provider-neutral instructions. It is
long enough to be substantive and it links to [a sibling document](./LINKED.md) so include and link
resolution are exercised.

## Project Map

${renderBlock('project-map', policy)}

## Commands Quick Reference

${renderBlock('commands', policy)}

## Release policy in prose

The release train lands on \`main\`, and a hotfix may be cut from \`master\` — plain prose naming a
branch outside a policy-owned block must never be rejected. Example commands are documentation too:

\`\`\`bash
git switch main && pnpm run build-all
\`\`\`
${extra}`;
}

const temp = mkdtempSync(join(tmpdir(), 'agent-instructions-test-'));
try {
  const fixture = join(temp, 'root');
  mkdirSync(fixture);
  cpSync(join(root, 'repo-policy.yaml'), join(fixture, 'repo-policy.yaml'));
  cpSync(join(root, 'minion.json'), join(fixture, 'minion.json'));
  writeFileSync(join(fixture, 'LINKED.md'), '# Linked\n');
  writeFileSync(join(fixture, 'LINKED DOC.md'), '# Linked with a space in its name\n');
  const writeAgents = (text) => writeFileSync(join(fixture, 'AGENTS.md'), text);
  const writeClaude = (text) => writeFileSync(join(fixture, 'CLAUDE.md'), text);
  const writeRegistry = (mutate) => {
    const registry = JSON.parse(readFileSync(join(root, 'minion.json'), 'utf8'));
    mutate(registry);
    writeFileSync(join(fixture, 'minion.json'), `${JSON.stringify(registry, null, 2)}\n`);
  };
  const reset = () => {
    writeAgents(goodAgents());
    writeClaude(INCLUDE_BYTES);
    cpSync(join(root, 'minion.json'), join(fixture, 'minion.json'));
  };

  // The clean fixture passes every rule, prose branch names and fenced examples included.
  reset();
  assert.deepEqual(checkRootProjections(fixture, policy), []);
  assert.deepEqual(checkInstructionPair(fixture, { label: 'fixture' }), []);

  function failsWith(pattern, mutate, restore = reset) {
    mutate();
    const errors = [...checkRootProjections(fixture, policy), ...checkInstructionPair(fixture, { label: 'fixture' })];
    assert(errors.length > 0, `negative fixture unexpectedly passed: ${pattern}`);
    assert.match(errors.join('\n'), pattern);
    restore();
  }

  // 1. Missing pair — each half is reported on its own.
  failsWith(/fixture\/CLAUDE\.md: is required/, () => rmSync(join(fixture, 'CLAUDE.md')));
  failsWith(/fixture\/AGENTS\.md: is required/, () => rmSync(join(fixture, 'AGENTS.md')));

  // 2. Non-exact include — missing newline, extra content, or a different target all fail.
  for (const text of ['@AGENTS.md', '@AGENTS.md\n\n', '# Notes\n\n@AGENTS.md\n', '@./AGENTS.md\n', ' @AGENTS.md\n']) {
    failsWith(/fixture\/CLAUDE\.md: must be exactly '@AGENTS\.md'/, () => writeClaude(text));
  }

  // 3. Mismatched marked policy fields — branch, command, directory, CLI id, and set membership.
  failsWith(/project-map\] minion_hub\.Development branch: 'dev' does not match repo-policy 'master'/, () =>
    writeAgents(goodAgents().replace('| `minion_hub` | `hub` | `minion_hub/` | `bun` | `master` | `master` |', '| `minion_hub` | `hub` | `minion_hub/` | `bun` | `dev` | `master` |')));
  failsWith(/project-map\] minion\.CLI id: 'gateway' does not match repo-policy 'minion'/, () =>
    writeAgents(goodAgents().replace('| `minion` | `minion` |', '| `minion` | `gateway` |')));
  failsWith(/project-map\] pixel-agents\.Directory: 'pixel' does not match repo-policy 'pixel-agents'/, () =>
    writeAgents(goodAgents().replace('| `pixel-agents` | `pixel-agents` | `pixel-agents/` |', '| `pixel-agents` | `pixel-agents` | `pixel/` |')));
  failsWith(/commands\] minion\.commands\.test: 'pnpm run test' does not match repo-policy 'pnpm test'/, () =>
    writeAgents(goodAgents().replace('| `pnpm test` | `pnpm check` |', '| `pnpm run test` | `pnpm check` |')));
  failsWith(/commands\] minion_hub\.commands\.typecheck: 'bun run check' does not match repo-policy '—'/, () =>
    writeAgents(goodAgents().replace('| `bun run check` | — |', '| `bun run check` | `bun run check` |')));
  failsWith(/project-map\]: row for 'minion_site' is missing/, () =>
    writeAgents(goodAgents().split('\n').filter((line) => !line.startsWith('| `minion_site` | `site` |')).join('\n')));
  failsWith(/project-map\] row 6: 'minion-base' is not a CLI-registered repository policy row/, () =>
    writeAgents(goodAgents().replace('| `pixel-agents` | `pixel-agents` | `pixel-agents/` | `npm` | `main` | `main` |', '| `minion-base` | `base` | `minion-base/` | `bun` | `main` | `main` |\n| `pixel-agents` | `pixel-agents` | `pixel-agents/` | `npm` | `main` | `main` |')));
  failsWith(/project-map\]: columns must be exactly/, () =>
    writeAgents(goodAgents().replace('| Repo id | CLI id | Directory |', '| Repo id | Directory |')));

  // 4. A missing or duplicated policy-owned block is drift, not an excuse to skip the comparison.
  failsWith(/AGENTS\.md: policy-owned block 'commands' is missing/, () =>
    writeAgents(goodAgents().replace(renderBlock('commands', policy), '')));
  failsWith(/AGENTS\.md: policy-owned block 'project-map' is declared more than once/, () =>
    writeAgents(`${goodAgents()}\n${renderBlock('project-map', policy)}\n`));

  // 5. A leading stale-memory block is rejected; the same text further down is ordinary prose.
  failsWith(/fixture\/AGENTS\.md: must not open with a <claude-mem-context> memory block/, () =>
    writeAgents(`<claude-mem-context>\nstale injected memory\n</claude-mem-context>\n\n${goodAgents()}`));
  writeAgents(goodAgents('\nA later mention of `<claude-mem-context>` in prose is documentation, not an injected dump.\n'));
  assert.deepEqual(checkInstructionPair(fixture, { label: 'fixture' }), []);
  reset();

  // 6. Broken includes and links, in both CommonMark destination forms.
  failsWith(/fixture\/AGENTS\.md: include '@MISSING\.md' does not resolve/, () => writeAgents(goodAgents('\n@MISSING.md\n')));
  failsWith(/fixture\/AGENTS\.md: link '\.\/gone\.md' does not resolve/, () => writeAgents(goodAgents('\nSee [gone](./gone.md).\n')));
  // An angle-bracket destination is a real link: a space in the path must not buy an exemption.
  failsWith(/fixture\/AGENTS\.md: link '\.\/missing file\.md' does not resolve/, () =>
    writeAgents(goodAgents('\nSee [gone](<./missing file.md>).\n')));
  failsWith(/fixture\/AGENTS\.md: link '\.\/missing file\.md' does not resolve/, () =>
    writeAgents(goodAgents('\nSee [gone](<./missing file.md> "with a title").\n')));
  failsWith(/fixture\/AGENTS\.md: link '\.\/gone%\.md' does not resolve/, () =>
    writeAgents(goodAgents('\nSee [gone](./gone%.md) — an undecodable escape is still a local path.\n')));
  // …and an angle-bracket destination that does resolve passes, percent-escapes included.
  writeAgents(goodAgents('\nSee [spaced](<./LINKED DOC.md>) and [escaped](./LINKED%20DOC.md).\n'));
  assert.deepEqual(checkInstructionPair(fixture, { label: 'fixture' }), []);
  reset();

  // A bare destination may nest parentheses to any depth — a bounded regex cannot represent that,
  // so a missing target with two nesting levels must still be caught.
  failsWith(/fixture\/AGENTS\.md: link '\.\/missing\(a\(b\)c\)\.md' does not resolve/, () =>
    writeAgents(goodAgents('\nSee [gone](./missing(a(b)c).md) for details.\n')));
  writeFileSync(join(fixture, 'LINKED(DOC(deep)ok).md'), 'nested target\n');
  writeAgents(goodAgents('\nSee [nested](./LINKED(DOC(deep)ok).md).\n'));
  assert.deepEqual(checkInstructionPair(fixture, { label: 'fixture' }), []);
  reset();

  // 7. An AGENTS.md that is only the include is not substantive.
  failsWith(/fixture\/AGENTS\.md: must be substantive/, () => writeAgents('@CLAUDE.md\n'));

  // 8. minion.json drift — branch, path, command, package manager, key set.
  failsWith(/subprojects\.site\.branch: 'master' does not match repo-policy development branch 'dev'/, () =>
    writeRegistry((registry) => { registry.subprojects.site.branch = 'master'; }));
  failsWith(/subprojects\.paperclip\.path: 'paperclip' does not match repo-policy checkout 'paperclip-minion'/, () =>
    writeRegistry((registry) => { registry.subprojects.paperclip.path = 'paperclip'; }));
  failsWith(/subprojects\.pixel-agents\.commands\.build: 'npm run compile' does not match repo-policy 'npm run build'/, () =>
    writeRegistry((registry) => { registry.subprojects['pixel-agents'].commands.build = 'npm run compile'; }));
  failsWith(/subprojects\.site\.commands\.test: '\(absent\)' does not match repo-policy 'bun run test'/, () =>
    writeRegistry((registry) => { delete registry.subprojects.site.commands.test; }));
  failsWith(/subprojects\.hub\.commands\.typecheck: repo-policy declares no 'typecheck' command/, () =>
    writeRegistry((registry) => { registry.subprojects.hub.commands.typecheck = 'bun run check'; }));
  failsWith(/subprojects\.hub\.commands\.install: unknown command/, () =>
    writeRegistry((registry) => { registry.subprojects.hub.commands.install = 'bun install'; }));
  failsWith(/subprojects\.minion\.packageManager: 'npm' does not match repo-policy 'pnpm'/, () =>
    writeRegistry((registry) => { registry.subprojects.minion.packageManager = 'npm'; }));
  failsWith(/subprojects\.plugins\.packageManager: 'npm' does not match repo-policy 'none'/, () =>
    writeRegistry((registry) => { registry.subprojects.plugins.packageManager = 'npm'; }));
  failsWith(/subprojects\.minion\.remote: '[^']*' does not normalize to repo-policy remote 'NikolasP98\/minion-ai'/, () =>
    writeRegistry((registry) => { registry.subprojects.minion.remote = 'git@github.com:NikolasP98/minion.git'; }));
  failsWith(/subprojects\.site: is required/, () =>
    writeRegistry((registry) => { delete registry.subprojects.site; }));
  failsWith(/subprojects\.docs: unknown CLI id/, () =>
    writeRegistry((registry) => { registry.subprojects.docs = registry.subprojects.hub; }));
  failsWith(/minion\.json: must be valid JSON/, () => writeFileSync(join(fixture, 'minion.json'), '{ not json'));
  failsWith(/minion\.json: is required/, () => rmSync(join(fixture, 'minion.json')));

  // 'none' is projected as itself: the CLI registry never invents a package manager.
  assert.equal(JSON.parse(readFileSync(join(root, 'minion.json'), 'utf8')).subprojects.plugins.packageManager, 'none');

  // Every stable CLI key is asserted, so a silently dropped row cannot pass.
  assert.deepEqual(Object.keys(cliMappings).sort(), ['hub', 'minion', 'paperclip', 'pixel-agents', 'plugins', 'site']);

  // A checkout that was not supplied is reported as such — never as a passing pair.
  assert.match(checkInstructionPair(join(temp, 'absent'), { label: 'absent' }).join('\n'), /absent: checkout was not supplied/);

  // Projections are checked from text, independent of the filesystem.
  assert.deepEqual(checkProjections(goodAgents(), policy), []);
  assert.deepEqual(checkCliRegistry(fixture, policy), []);

  // CLI surface: clean fixture passes, a supplied product checkout is checked, drift exits non-zero.
  const product = join(temp, 'product');
  mkdirSync(product);
  writeFileSync(join(product, 'AGENTS.md'), goodAgents());
  writeFileSync(join(product, 'LINKED.md'), '# Linked\n');
  writeFileSync(join(product, 'CLAUDE.md'), INCLUDE_BYTES);
  let result = spawnSync(process.execPath, [checker, '--root', fixture, product], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /instruction parity verified \(root projections \+ 2 instruction pairs\)/);

  rmSync(join(product, 'CLAUDE.md'));
  result = spawnSync(process.execPath, [checker, '--root', fixture, product], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CLAUDE\.md: is required/);

  result = spawnSync(process.execPath, [checker, '--root', join(temp, 'absent')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /document must be valid JSON-compatible YAML|ENOENT/);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

// The real meta checkout is the primary fixture: its projections and its own pair must pass.
assert.deepEqual(checkRootProjections(root, policy), []);
assert.deepEqual(checkInstructionPair(root, { label: 'minion-meta' }), []);

console.log('agent instruction checker tests passed');
