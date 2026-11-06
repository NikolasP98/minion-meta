// Source-structure characterization only; no gateway/provider execution.
const GATEWAY = '/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion' + '/node_modules/typescript/lib/typescript.js');
const evidence = [];
function calls(file, name) {
  const text = fs.readFileSync(path.join(GATEWAY,file),'utf8');
  const source = ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const found = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === name) {
      const arg = node.arguments[0];
      assert.ok(arg && ts.isObjectLiteralExpression(arg));
      const spreads = arg.properties.filter(ts.isSpreadAssignment).map(x => x.expression.getText(source));
      const keys = arg.properties.filter(x => !ts.isSpreadAssignment(x)).map(x => x.name?.getText(source));
      found.push({file,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,keys,spreads});
    }
    ts.forEachChild(node,visit);
  }
  visit(source); return found;
}
const attempts = calls('src/agents/pi-embedded-runner/run.ts','runEmbeddedAttempt');
assert.equal(attempts.length,1);
assert.deepEqual(attempts[0].spreads,[]);
for (const key of ['resolvedHubUserId','senderId','senderName','senderUsername','senderE164','senderPermissionLevel']) assert.ok(!attempts[0].keys.includes(key));
assert.ok(attempts[0].keys.includes('senderIsOwner'));
assert.ok(attempts[0].keys.includes('abortSignal'));
evidence.push({...attempts[0], conclusion:'Optional resolved-user/sender/permission fields are omitted from the explicit attempt object; owner and abort are forwarded.'});
const bases = calls('src/auto-reply/reply/agent-runner-execution.ts','runEmbeddedPiAgent');
assert.equal(bases.length,1);
assert.ok(!bases[0].keys.includes('disableTools'));
const utilityText=fs.readFileSync(path.join(GATEWAY,'src/auto-reply/reply/agent-runner-utils.ts'),'utf8');
assert.ok(!utilityText.includes('disableTools'));
evidence.push({...bases[0], conclusion:'No explicit disableTools; spread context/base builders contain no disableTools field. Prompt-only routing flag does not control attempt tool array.'});
console.log(JSON.stringify({kind:'static-source-characterization',evidence},null,2));
