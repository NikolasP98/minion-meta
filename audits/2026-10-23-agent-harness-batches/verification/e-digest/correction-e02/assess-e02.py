from pathlib import Path
import json,collections,datetime
p=Path(__file__).parent
x=json.loads((p.parent/'intent-inventory.json').read_text())
x['phase']='E02 complete intent source and bounded assessment; final repository/UI qualification pending'
x['snapshot']='freeze-e02'
x['assessed_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
x['e01_inventory']='../intent-inventory.json'
x['source_identity']='entry-check.json'
x['method']='All118 prior intent dispositions re-assessed. All61 frozen source/archive hashes/modes verified; exact8-path delta reviewed. Unchanged53 owned paths plus F6 retain E01 evidence by proven identity; changed tick/store execute fresh native, reviewer and shell probes. This is not a selected-diff-only review.'
retention=['FR-009','T027','PLAN-13','PROBE-RETAIN-01','PROBE-RETAIN-02']
affected_domains=['admission','publication','feedback','schedule','sql','policy']
for i in x['items']:
 i['e01_status']=i['status']
 i['e01_executable_evidence']=i.pop('executable_evidence')
 i['e01_assessment']=i['assessment']
 i['evidence_base']='E01 evidence paths are relative to parent e-digest audit; fresh E02 paths are relative to this correction directory.'
 i['executable_evidence']=['entry-check.json: source/archive identity and exact delta','../intent-inventory.json#'+i['id']+': carried-forward E01 evidence and original red history']
 if i['review_domain'] in affected_domains:i['executable_evidence'].append('affected-results.json:124/124 including46 actual D/E SQL cases and current tick/publication/feedback/route/budget contracts')
 if i['id'] in retention:
  i['status']='verified-source-and-bounded';i['resolved_finding']='E-FINAL-001';i.pop('finding',None)
  i['assessment']='Validated retained owner scope permits bounded housekeeping before disabled/expired policy and current authority returns. Invalid/absent/mismatched selectors deny maintenance. Original3 actual-tick failures now pass unchanged. Late expired receipt before/after cleanup preserves one minimal bill/hash/admission/unknown fence without retaining or rehydrating raw response. Shared family limits20+50+10+20 produce100 redactions then remaining32 on second tick. Current owner publication authority stays required.'
  i['executable_evidence'] += ['original-retention-green-results.json and retention-disabled-green-observations.jsonl: unchanged original3 assertions','independent-invariants-results.json and late-receipt-observations.jsonl: independent late receipt and revoked owner probes','affected-results.json: actual authenticated tick, combined cap and monotonic deadline cases']
  i['limitations']=[]
 if i['id'] in ['FR-008','SC-004','US4/AC1','US4/AC2','US4/AC3','US4/AC4','US4/AC5','T023','T024','T025','T026','PLAN-11','PLAN-12','PROBE-TICK-01','PROBE-TICK-02','PROBE-TICK-03','PROBE-SCHED-01','PROBE-SCHED-02']:
  i['executable_evidence'] += ['scheduler.log and scheduler-receipt.json/.scope.json: E02 actual uninstalled shell cold-start/restart and scope negatives','affected-results.json:50s monotonic stage budget, full32s inference allowance, actual100then32 cleanup']
 if i['id']=='T017':
  i['status']='verified-source-and-bounded';i['resolved_finding']='E-FINAL-002';i.pop('finding',None);i['limitations']=[]
  i['assessment']='Durable prescribed contract and actual gateway route suites now contain22 attack cases each plus legacy/identity positives. Tests invoke real production validators/routes; only storage is spied to prove rejection before write. Independent unchanged22attack route matrix remains green.'
  i['source_evidence'] += ['src/server/services/pulse-ingest-contract.test.ts','src/routes/api/gateway/pulse/proposals/server.test.ts']
  i['executable_evidence'] += ['affected-results.json: contract41/41 and actualgatewayroute32/32','independent-invariants-results.json: reviewer route matrix and legacypositive2/2']
 if i['review_domain']=='feedback':i['executable_evidence'].append('e02-export-to-f.json: fresh E02 actual route JSONL accepted by unchanged F6 with server hash, unadjudicated facts and no automatic gold/weights')
 if i['id'] in ['T028','T030','PLAN-15','CONST-IV','PROBE-GATES-01']:
  i['limitations']=['Full required Hub gates, final browser matrix/manual evidence and parent draftPR delivery remain pending. Both demonstrated E01 source/test findings are independently closed on E02.']
  i['executable_evidence'] += ['heavy-gate-commands.json: prepared exact gated commands, not executed','manual-browser-proof.py: prepared and Python syntax checked only']
 if i['id']=='CONST-III':i['assessment']='Exact E02 source61 and F6 unchanged at review. Reviewer owns correction-e02 only, preserving E01 source/probes/receipts. Parent controls commits/PR/tasks/spec/index; no application/Git/release action by reviewer.'
 if i['id']=='CONST-II':i['assessment']='Source, bounded executable proof, authored component evidence, final browser/whole-repository qualification and live activation remain separate. E01 red probes and reviewer harness typo preserved by hash; author E02 native first-run45/46 timeout preserved despite green isolated and independent reruns. Timeout cause is unproven.'
 if i['status']=='verified-source-and-bounded' and i['id'] not in retention+['T017']:
  i['assessment'] += ' E02 continuity/delta assessment preserves this disposition; fresh affected-boundary evidence is listed where applicable.'
x['summary']=dict(collections.Counter(i['status'] for i in x['items']))
x['sourceFindingsOpen']=[]
x['sourceFindingsClosed']=['E-FINAL-001','E-FINAL-002']
x['standardsSourceVerdict']='pass; final repository and UI qualification pending'
x['specSourceAndBoundedVerdict']='pass; final repository and UI qualification pending'
assert len(x['items'])==118
assert not any(i['status'] in ['failed-reproducible','implementation-proven-durable-regression-missing'] for i in x['items'])
(p/'intent-inventory.json').write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
lines=['# Complete E02 intent disposition','', 'All118 approved intent obligations assessed.102 have source/bounded verification;11 await final UI qualification and5 await full qualification/delivery. Both E01 findings are closed by independent current-source evidence.','', '| ID | Disposition | Domain | E02 correction / qualification |','| --- | --- | --- | --- |']
for i in x['items']:lines.append('| '+i['id']+' | '+i['status']+' | '+i['review_domain']+' | '+(i.get('resolved_finding','') or '; '.join(i['limitations']) or 'Verified; full evidence in JSON')+' |')
lines += ['', 'See [intent-inventory.json](intent-inventory.json) for original intent text, source evidence, E01 continuity and fresh E02 receipts.', '']
(p/'intent-inventory.md').write_text('\n'.join(lines));print(x['summary'])
