import { mkdirSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPolicy } from './scripts/repo-policy.mjs';
const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const policy = readPolicy();
const oldMod = await import('./scripts/old-checker.tmp.mjs');
const newMod = await import('./scripts/check-agent-instructions.mjs');

function goodAgents(renderBlock, extra = '') {
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

const temp = mkdtempSync(join(tmpdir(), 'discriminate-'));
const fixture = join(temp, 'root');
mkdirSync(fixture);
cpSync(join(root, 'repo-policy.yaml'), join(fixture, 'repo-policy.yaml'));
cpSync(join(root, 'minion.json'), join(fixture, 'minion.json'));
writeFileSync(join(fixture, 'LINKED.md'), '# Linked\n');
writeFileSync(join(fixture, 'CLAUDE.md'), newMod.INCLUDE_BYTES);

const cases = [
  ['html comment pseudo-fence (tight)', (m) => goodAgents(m.renderBlock, '\n<!--\n```\n-->\nSee [gone](./missing.md).\n'), true],
  ['html comment pseudo-fence (blank)', (m) => goodAgents(m.renderBlock, '\n<!--\n```\n-->\n\nSee [gone](./missing.md).\n'), true],
  ['script html block pseudo-fence', (m) => goodAgents(m.renderBlock, '\n<script>\n```\n</script>\n\nSee [gone](./missing.md).\n'), true],
  ['control: real fence after comment', (m) => goodAgents(m.renderBlock, '\n<!--\n```\n-->\n\n```md\n[x](./gone.md)\n```\n\nSee [ok](./LINKED.md).\n'), false],
  ['control: definition inside fence', (m) => goodAgents(m.renderBlock, '\n```md\n[setup]: ./missing.md\n```\n\nSee [setup].\n'), false],
  ['heading only inside a fence', (m) => goodAgents(m.renderBlock).replace(/^# AGENTS\.md — fixture repository$/m, '```text\n# AGENTS.md — fixture repository\n```').replace(/^## /gm, 'Section: '), true],
  ['marker quoted in a code span', (m) => goodAgents(m.renderBlock).replace(m.renderBlock('commands', policy), 'Quote `<!-- repo-policy:commands -->` and `<!-- /repo-policy:commands -->` inline.'), true],
  ['governed table inside a fence', (m) => goodAgents(m.renderBlock).replace(m.renderCommands(policy), '```md\n' + m.renderCommands(policy) + '\n```'), true],
  ['definition after table + blank line', (m) => goodAgents(m.renderBlock, '\n| a | b |\n| --- | --- |\n| c | d |\n\n[setup]: ./missing.md\n\nSee [setup].\n'), true],
  ['escaped-bracket label reference', (m) => goodAgents(m.renderBlock, '\nSee [a][b \\[c\\]].\n\n[b \\[c\\]]: ./missing.md\n'), true],
];

const label = (mod, build) => {
  writeFileSync(join(fixture, 'AGENTS.md'), build(mod));
  const errors = [...mod.checkRootProjections(fixture, policy), ...mod.checkInstructionPair(fixture, { label: 'fixture' })];
  return errors.length ? `FAIL(${errors.length})` : 'pass';
};

for (const [name, build, wantFail] of cases) {
  const before = label(oldMod, build);
  const after = label(newMod, build);
  const want = wantFail ? 'FAIL' : 'pass';
  const ok = wantFail ? after.startsWith('FAIL') : after === 'pass';
  const discriminating = before !== after;
  console.log(`${ok ? '✓' : '✗'} ${discriminating ? 'DISCRIMINATES' : 'same       '} | want ${want.padEnd(4)} | old=${before.padEnd(8)} new=${after.padEnd(8)} | ${name}`);
}
rmSync(temp, { recursive: true, force: true });
