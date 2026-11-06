import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const repo = '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory';
const root = mkdtempSync(join(tmpdir(), 'b-v1-independent-'));
process.env.FACTORY_DATA=root;
process.env.FACTORY_RUNS_DIR=join(root,'runs');
const { readJevRunAccounting } = await import(repo + '/runner/src/jev-accounting.ts');
after(() => rmSync(root,{recursive:true,force:true}));
const lexemes=['0','-0.0','5e-324','2.2250738585072014e-308','1e-7','0.000001','0.00000012345678901234567','0.01','0.30000000000000004','1.0000000000000002','9007199254740993','1000000000000000100','1e20','1e21','1.7976931348623157e308','null'];
test('independent raw JSON → Python/TS actual readers → lossless shell subtotal',()=>{
  const revisions=new Map<string,string>();
  for(let i=0;i<lexemes.length;i++){
    const lexeme=lexemes[i], runId='boundary-'+i, out=join(root,'runs',runId);
    mkdirSync(out,{recursive:true});
    const unknown=lexeme==='null', expected=unknown?0:JSON.parse(lexeme);
    writeFileSync(join(out,'worker-result.json'),'{'+'"total_cost_usd":'+lexeme+',"cost_source":"'+(unknown?'unknown':'provider-reported')+'"}');
    const env={...process.env,FACTORY_OUT_DIR:out,FACTORY_JEV_ACCOUNTING_HELPER:repo+'/agent/lib/jev-accounting.py'};
    const py=JSON.parse(execFileSync('/usr/bin/python3',['-B',repo+'/agent/lib/jev-accounting.py','snapshot'],{env,encoding:'utf8'}));
    const ts=readJevRunAccounting(runId,out);
    const shell=execFileSync('/bin/bash',['-c','source "$1"; sum_cost_usd','fixture',repo+'/agent/lib/cost.sh'],{env,encoding:'utf8'}).trim();
    assert.ok(Number.isFinite(Number(shell)),lexeme+' finite subtotal');
    assert.equal(Number(shell),expected===0?0:expected,lexeme+' shell precision');
    assert.equal(ts.knownCostUsd,expected===0?0:expected,lexeme+' TS precision');
    assert.equal(py.knownCostUsd,expected===0?0:expected,lexeme+' Python precision');
    assert.equal(ts.costCoverage,unknown?'incomplete':'complete',lexeme+' TS coverage');
    assert.equal(py.costCoverage,ts.costCoverage,lexeme+' coverage agreement');
    assert.equal(py.receiptRevision,ts.receiptRevision,lexeme+' receipt identity');
    revisions.set(lexeme,ts.receiptRevision);
    console.log(JSON.stringify({lexeme,knownCostUsd:ts.knownCostUsd,costCoverage:ts.costCoverage,shellSubtotal:shell,receiptRevision:ts.receiptRevision}));
  }
  assert.notEqual(revisions.get('0'),revisions.get('null'),'known zero cannot share unknown identity');
  assert.notEqual(revisions.get('0'),revisions.get('-0.0'),'raw signed zero identities agree across languages without decimal serialization collapse');
});
