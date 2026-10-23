// Read-only proof that handoff comments preserve the reviewed TypeScript syntax tree.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = process.env.MINION_ENGINE_SOURCE;
assert.ok(root, 'MINION_ENGINE_SOURCE required');
const ts = require(path.join(root, 'node_modules/typescript/lib/typescript.js'));
const baseline = '7fac6744ea9f15fb64b0423bd4f3c39592b3e6a7';
const files = ['src/agents/pi-embedded-runner/run.ts', 'src/auto-reply/reply/get-reply-run.ts', 'src/auto-reply/reply/queue/types.ts'];
function syntaxTree(source) {
  const parsed = ts.createSourceFile('checked.ts', source, ts.ScriptTarget.Latest, true);
  assert.equal(parsed.parseDiagnostics.length, 0, 'Parse diagnostics in checked source');
  function visit(node) {
    const children = [];
    ts.forEachChild(node, child => { children.push(visit(child)); });
    return [node.kind, children.length ? children : node.getText(parsed)];
  }
  return visit(parsed);
}
const checked = files.map(file => {
  const original = execFileSync('git', ['-C', root, 'show', baseline + ':' + file], {encoding: 'utf8'});
  const current = fs.readFileSync(path.join(root, file), 'utf8');
  assert.deepEqual(syntaxTree(current), syntaxTree(original), 'Non-comment syntax change in ' + file);
  assert.equal(current.split('TODO(handoff)').length, original.split('TODO(handoff)').length + 1);
  return {path: file, sha256: createHash('sha256').update(current).digest('hex'), nonCommentSyntaxEqualBaseline: true, addedHandoffComments: 1};
});
console.log(JSON.stringify({baseline, head: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), checked}, null, 2));
