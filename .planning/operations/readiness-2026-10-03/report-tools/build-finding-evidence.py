"""Build per-finding, provenance-bound evidence. Does not invent browser or performance results."""
import hashlib, json, re, shutil, struct, subprocess, sys
from pathlib import Path
BASE=Path(sys.argv[1] if len(sys.argv)>1 else '/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw')
ROOT=Path(sys.argv[2] if len(sys.argv)>2 else '/home/nikolas/Documents/CODE/MINION')
OUT=ROOT/'.lavish/hub-gateway-readiness-2026-10-03'
OLD=ROOT/'.lavish/hub-gateway-recon-2026-10-02'
EV=BASE/'meta/.planning/operations/readiness-2026-10-03/evidence'
REG=json.loads((EV.parent/'findings.json').read_text())
RECON=json.loads(re.search(r'<script type="application/json" id="report-data">(.*?)</script>',(OLD/'report.html').read_text(),re.S)[1])
ORIGINAL={r['id']:r for r in RECON['findings']}
REPOS={k:BASE/k for k in ['hub','gateway','meta','factory','paperclip','site']}
GH={k:v['github'] for k,v in RECON['repos'].items()}
GH.update(gateway='NikolasP98/minion-ai',factory='NikolasP98/minion-factory',paperclip='NikolasP98/paperclip-minion',site='NikolasP98/minion-site')
BEFORE={k:v['sha'] for k,v in RECON['repos'].items()}
BEFORE.update({k:v for k,v in REG['bases'].items() if k not in BEFORE})
ASSET=OUT/'assets/finding-evidence';ASSET.mkdir(parents=True,exist_ok=True)
ansi=re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]')
cache={}
def git(repo,*args):
 key=(repo,*args)
 if key not in cache:
  p=subprocess.run(['git','-C',str(REPOS[repo]),*args],capture_output=True,text=True)
  cache[key]=p.stdout if p.returncode==0 else None
 return cache[key]
def text_receipt(path,title,environment,commit=None):
 data=path.read_bytes();raw=ansi.sub('',data.decode(errors='replace'))
 lines=raw.splitlines()
 # Show actual output tails, never a generated passing verdict. Keep full source digest.
 chosen=lines if len(lines)<=65 else lines[-65:]
 # Runtime logs may contain credentials in URLs or headers; redact before embedding.
 clean='\n'.join(chosen)
 clean=re.sub(r'(?i)(authorization:\s*bearer\s+)[^\s]+',r'\1[redacted]',clean)
 clean=re.sub(r'(postgres(?:ql)?://[^:\s/]+:)[^@\s]+@',r'\1[redacted]@',clean)
 clean=re.sub(r'(?i)((?:access_token|refresh_token|client_secret|api_key)=)[^&\s]+',r'\1[redacted]',clean)
 name=re.sub(r'[^a-zA-Z0-9._-]','-',title)[:70]+'-'+hashlib.sha256(data).hexdigest()[:10]+'.txt'
 (ASSET/name).write_text(clean+'\n')
 return dict(kind='console',title=title,environment=environment,commit=commit,source=str(path.relative_to(BASE)) if path.is_relative_to(BASE) else str(path.relative_to(OLD)),sha256=hashlib.sha256(data).hexdigest(),excerpt=clean,href='assets/finding-evidence/'+name,note=('Last 65 lines of the captured output; full-source SHA-256 shown.' if len(lines)>65 else 'Captured output, with credential redaction where needed.'))
def image_record(path,title,environment,commit,caption):
 name=path.name;shutil.copy2(path,ASSET/name)
 raw=path.read_bytes()
 if raw[:8] != b'\x89PNG\r\n\x1a\n':raise ValueError('Evidence image dimensions need a supported parser: '+str(path))
 width,height=struct.unpack('>II',raw[16:24])
 return dict(kind='image',title=title,environment=environment,commit=commit,caption=caption,href='assets/finding-evidence/'+name,sha256=hashlib.sha256(raw).hexdigest(),width=width,height=height)
def source_record(repo,path,ref,line=None,lines=None,note=''):
 if not isinstance(path,str) or not path:return None
 path=path.removeprefix(repo+'/')
 raw=git(repo,'show',f'{ref}:{path}')
 if raw is None:return None
 ranges=[]
 for a,b in re.findall(r'(\d+)(?:\s*-\s*(\d+))?',str(lines or line or 1))[:3]:
  start=max(1,int(a));end=int(b or a)
  if end==start:end=start+9
  ranges.append((max(1,start-2),min(end+2,start+29)))
 content=raw.splitlines();chunks=[]
 for start,end in ranges:
  if start>len(content):continue
  chunks.append('\n'.join(f'{i+1:>5}  {content[i]}' for i in range(start-1,min(end,len(content)))))
 if not chunks:return None
 excerpt='\n   …\n'.join(chunks)
 digest=hashlib.sha256(raw.encode()).hexdigest()
 name='source-'+hashlib.sha256(f'{repo}:{ref}:{path}:{ranges}'.encode()).hexdigest()[:24]+'.txt'
 (ASSET/name).write_text(f'Repository: {repo}\nRevision: {ref}\nPath: {path}\nFull source SHA-256: {digest}\nEvidence: frozen line-numbered excerpt, not the full source file.\n\n'+excerpt+'\n')
 return dict(kind='source',title=path,environment='Frozen source snapshot',commit=ref,excerpt=excerpt,note=note,sha256=digest,href='assets/finding-evidence/'+name,sourceHref=f'https://github.com/{GH[repo]}/blob/{ref}/{path}#L{ranges[0][0]}')
BEFORE_LOGS={'SITE-002':['site002-parent-encoding-negative.log'],'GW-001':['gw-broadcast-cross-org-repro.log'],'HC-001':['hc-bulk-tag-repro.log'],'HS-028':['hs-numeric-repro.log'],'TQ-001':['tq001-effect-root-probe.log'],'TQ-004':['test-quality-reproductions.log'],'TQ-005':['test-quality-reproductions.log'],'TQ-006':['test-quality-reproductions.log'],'TQ-007':['test-quality-reproductions.log']}
BEFORE_LOGS['NOTIF-003']=['notification-slice4-staged-monitoring-negative.log']
# Explicit mapping: a suite receipt is supporting evidence, not an assertion that every case is live-qualified.
AFTER_LOGS={
 'SITE-002':['site002-003-review-packet-v2.md','site002-003-focused-v2.log','site002-003-check-v2.log','site002-003-parent-manifest-v3.log'],
 'SITE-003':['site002-003-prerender-proof-v2.json','site002-003-build-v2.log'],
 'NOTIF-003':['notification-slice4-corrections-restored.log','notification-slice4-negative-controls.json','notification-slice4-native-review-packet.md','notification-slice4-native-final.log','notification-slice4-jobs-final-green-qualifier.log','notification-slice4-plan-receipt.json','notification-slice4-cleanup-receipt.json','notification-health-v2-owner-proof.json','notification-slice4-page-owner-focus-v7.log','notification-slice4-parent-review-v3.json','notification-slice4-compiled-v3/results.json','notification-slice4-compiled-v3-parent-cleanup.log','notification-slice4-build-artifacts-v2.log','notification-slice4-check-v7.log','notification-slice4-page-null-type-equivalence.json','notification-health-v6-mobile-edit-proof.json','notification-health-v6-mobile-cancel-proof.json','notification-health-v6-reduced-motion-proof.json'],
 'HS-009':['wallet-focused-final-v2.log','wallet-native-void-lock-v2.log','wallet-native-27-qualified.json','pos-v11-final-all.log','pos-v11-review-packet.md','pos-boundaries-final-receipt.md'],
 'HS-012':['wallet-focused-final-v2.log','wallet-native-void-lock-v2.log','pos-v11-final-all.log','pos-v11-review-packet.md'],
 'NOTIF-004':['notification-slice3-native-final.log','notification-slice3-plan-final.json','notification-slice3-native-receipt.md','notification-slice3-jobs-final.log','notification-slice3-parent-native-review.md'],
 'NOTIF-012':['notification-slice2-native-final.log','notification-slice2-semantic-validator.log','notification-slice2-cleanup-final.log','notification-slice2-parent-review.md'],
 'GW-022':['gw022a-parent-drain-probe.log','gw022a-async-parent-review-v1.json','gw022a-native-substrate-qualified-v4.log','gw022a-parent-negative-probes.log','gw022a-parent-cross-root-lock.log','gw022a-parent-cross-root-lock-fixed.log','gw022a-parent-fifo-v3.log','gw022a-native-substrate-review-v3.md','gw022a-parent-abnormal-descendant.log','gw022a-parent-abnormal-descendant-fixed.log','gw022a-native-admission-parent-review.md','gw022a-native-admission-qualified-v2.log','gw022a-sync-event-loop-baseline.json'],
 'NOTIF-007':['notification-slice2-authority-restored.log','notification-slice2-authority-native-v1.log','notification-slice2-authority-negative.log','notification-slice2-native-manifest-tests-v2.log','hub-coherent-check-v11.log','notification-slice2-design-exact-base.log','notification-slice2-tokens.log'],
 'NOTIF-009':['notification-slice2-authority-restored.log','notification-slice2-authority-native-v1.log','notification-slice2-authority-negative.log'],
 'SITE-004':['site004-meta-package.log','site004-site-token-test.log','site004-site-check.log','site004-site-build.log','site004-hub-token-test.log','site004-contract-blast-radius.json'],
 'NOTIF-018':['notif018-signature-qualified.log','notif018-staged-qc-v2.log','notif018-focused-v5.log','notif018-native-v3.log','notif018-negative-org.log','notif018-negative-target-read.log','hub-coherent-check-v9.log','notif018-design-v3.log','notif018-tokens-v2.log'],
 'HC-030':['pos-boundaries-focused.log','pos-boundaries-native-27.log','pos-boundaries-graph-and-exports.log'],
 'GW-025':['gw005-authority-db-qualified-v2.log'],
 'SITE-001':['site-locale-links-after-v3.log','site-build-locale-v2.log','site-locale-prerender-proof.json'],
 'GW-026':['gw026-qualified-v3.log','gw026-negative-control.log','gw026-dispatch-negative.log','gw026-typecheck-v5.log'],
 'HC-024':['reliability-qualified-v3-full.log','reliability-visible-owner-negative.log','reliability-performance-negative.log','reliability-parent-channel-status-before.log','reliability-slice-parent-review-in-progress.md'],
 'HC-025':['reliability-qualified-v3-full.log','reliability-performance-negative.log'],
 'HS-032':['reliability-skill-duration-negative.log','reliability-skill-duration-restored.log','reliability-skill-duration-negative.json'],
 'GW-023':['gw023-neighbor-tests.log','gw023-negative-control.log'],
 'NOTIF-002':['hub-notification-slice1-signed.log','gateway-notification-slice1-signed.log','notification-narrow-proof/hub-focused.log','notification-narrow-proof/gateway-pulse-tools.log','notification-native-parent-restored.log'],
 'NOTIF-014':['notification-native-proof-final/jobs-qualified.log','notification-native-negative-control.log','notification-native-parent-restored.log'],
 'HS-008':['native-categories-jobs.log','native-categories-qualified.log','native-categories-cleanup.log'],
 'TQ-008':['native-categories-contracts.log','native-categories-qualified.log'],
 'GW-015':['gw-lifecycle-final-commit-tests.log','gw-lifecycle-lock-reclaim-review.log'],
 'GW-008':['gw-lifecycle-core-final.log'],
 'GW-021':['evidence/gw021-fixed-auth-e2e.log'],
 'HS-028':['money-core-focused-final.log','money-server-final-broad.log'],
 'HS-017':['money-server-final-broad.log','pos-v11-final-all.log','pos-v11-review-packet.md'],
 'HC-035':['hc035-jobs-final.log','hc035-hosted-unit-failure.log','hc035-capability-integration.log'],
 'HC-012':['hc012-013-focused-tests.log'], 'HC-013':['hc012-013-focused-tests.log'],
 'HC-033':['hc033-final-tests.log'], 'HC-032':['hub-scheduling-read-final.log'],
 'HS-003':['hub-fresh-authority-final-tests.log'],
 'MR-OP-001':['hub-scheduling-read-final.log'],
 'HS-005':['hs005-final-native.log'],
 'FACES-PROD-001':['hub-meta-pagination-final-tests.log'],
 'FACES-001':['faces-logger-final-tests.log'], 'FACES-002':['faces-firewall-tests.log'], 'FACES-004':['faces-log-final-tests.log'],
 'HS-030':['marketplace-mounted-final.log'], 'HS-031':['marketplace-mounted-final.log'],
 'TQ-003':['tq003-mutation-focused-tests.log'],
}
for _id, _receipts in {
 'HC-024':['reliability-staged-focused.log','reliability-combined-checkpoint-hashes.json'],
 'HC-025':['reliability-staged-focused.log'],
 'HS-032':['reliability-staged-focused.log'],
 'HC-035':['pos-staged-focused.log','pos-checkpoint-drift-review.json'],
 'HS-009':['pos-staged-focused.log'],
 'HS-012':['pos-staged-focused.log'],
 'HS-017':['pos-staged-focused.log'],
 'HS-029':['pos-staged-focused.log'],
 'HS-033':['reliability-staged-focused.log'],
 'HC-030':['pos-staged-focused.log'],
 'SITE-002':['site002-003-parent-v3-focused.log'],
 'SITE-004':['site004-meta-checkpoint.log','site004-hub-checkpoint.log','site004-hub-checkpoint-tokens.log'],
 'NOTIF-003':['notification-slice4-monitoring-parent-review.json','notification-slice4-monitoring-checkpoint.log'],
}.items():
 AFTER_LOGS.setdefault(_id,[]).extend(_receipts)

# Exact reviewed checkpoint receipts; statuses still distinguish integration from release.
for _id, _receipts in {
 'HC-005':['hc005-006-parent-draft-negative.log','hc005-recovery-negative.log','hc005-006-independent-review-v1.md','hc005-006-review-corrections-negative.log'],
 'HC-006':['hc005-006-parent-draft-negative.log','hc005-006-independent-review-v1.md','hc005-006-review-corrections-negative.log'],
 'HC-036':['shared-errors-independent-review-v1.md','shared-errors-artifact-restored.log','shared-errors-artifact-diff.json','shared-error-hub-consumer.log'],
 'HC-024':['shared-error-hub-consumer.log'],
 'HC-025':['shared-error-hub-consumer.log'],
 'SITE-001':['site-parent-combined-review.json','site-staged-ordinary.log','site-staged-locale.log','shared-error-site-consumer.log'],
 'SITE-002':['site-staged-locale.log','site-format-parent-review.json'],
 'SITE-003':['site-staged-locale.log','site-staged-format-v2.log'],
 'SITE-004':['site-staged-design-v2.log','site-staged-tokens-v2.log','site-staged-token-tests-v2.log','token-cross-consumer-test-review-v1.md'],
 'GW-022':['gw022a-corrective-parent-review-v2.json','gw022a-parent-drain-corrected-v2.log','gw022a-native-signed.log'],
 'NOTIF-003':['hub-ci-bootstrap-parent-review.json','hub-ci-bootstrap-correction-review.md'],
 'NOTIF-012':['hub-ci-bootstrap-parent-review.json','hub-ci-utf8-parent-restored.log'],
}.items():
 AFTER_LOGS.setdefault(_id,[]).extend(_receipts)

for _id, _receipts in {
 'HC-005':['hc005-before-draft-proof.json','hc005-after-draft-proof.json','hc005-006-touch-final.log','hc005-006-touch-design.log','hc005-006-touch-tokens.log','mutation-drafts-fixture-v3/fixture-manifest.json'],
 'HC-006':['hc006-before-draft-proof.json','hc006-after-draft-proof.json','hc006-after-unknown-proof.json','hc006-after-failed-read-proof.json','hc006-after-read-repair-proof.json','hc005-006-touch-final.log','mutation-drafts-fixture-v3/fixture-manifest.json'],
 'HC-036':['hc036-gateway-parent-staged.json','hc036-gateway-staged-qualified.log','hc036-own-handler-parent-qualified.log','hc036-own-handler-parent-review.json','hc036-own-handler-signed.log'],
 'NOTIF-003':['notification-hosted-ci-parent-review.json','notification-outbox-fixed-baseline-full.log','notification-outbox-plan-old-policy-negative.log'],
 'NOTIF-007':['notification-slice5-v8-independent-standards-review.md','notification-slice5-v8-rls-recursive.log','notification-slice5-v8-rls-rerun.log'],
 'SITE-001':['site-dev-merge-review-v1.md','site-dev-merge-check-v2.log','site-dev-merge-tests-v2.log','site-dev-merge-build-v3.log'],
}.items():
 AFTER_LOGS.setdefault(_id,[]).extend(_receipts)

for _id in ['HC-005','HC-006']:
 AFTER_LOGS.setdefault(_id,[]).extend(['hc005-006-independent-final-review.md','hc005-006-independent-focused.log','hc005-006-final-owned-v2.sha256'])
for _id in ['SITE-001','SITE-002','SITE-003','SITE-004']:
 AFTER_LOGS.setdefault(_id,[]).extend(['site-dev-merge-parent-review.json','site-fa2638-live-pr.json'])

for _id in ['GW-009', 'GW-010']:
 AFTER_LOGS.setdefault(_id,[]).extend(['gw-slice-b-final-qualification.md','gw-slice-b-independent-review.md','gw-slice-b-parent-final-review.json','gw-slice-b-final-signed.log'])
AFTER_LOGS.setdefault('HC-026',[]).extend(['hc026-before-native-delete-proof-v2.json','hc026-cards-mounted-v1.log','hc026-card-fixture-before-v2/fixture-manifest.json'])
for _id in ['HC-005','HC-006','HC-036']:
 AFTER_LOGS.setdefault(_id,[]).extend(['shared-session-readiness2-parent-test.log','shared-session-readiness2-signed.log'])
AFTER_LOGS.setdefault('NOTIF-007',[]).extend(['notification-slice5-v10-owner-transfer-evidence.json','notification-slice5-v10-parent-review.md','notification-slice5-v10-independent-spec-review.md'])

AFTER_LOGS.setdefault('HC-026',[]).extend(['hc026-final-focused-v1.log','hc026-after-native-delete-proof-v3.json','hc026-after-mobile-locale-proof-v3.json','hc026-after-native-navigation-proof-v3.json','hc026-card-fixture-after-v3/fixture-manifest.json','hc026-design-exact-base-v4.log','hc026-tokens-v2.log'])
AFTER_LOGS.setdefault('HC-026',[]).extend(['hc026-final-focused-v3.log','hc026-parent-qualification.json','hc026-source-independent-review.md','hc026-isolated-check-v3.log','hc026-isolated-build-v1.log','hc026-signed-source.json','hc026-unencoded-path-negative.json','hc026-format-ci-proof.json'])
AFTER_LOGS.setdefault('HC-038',[]).extend(['hc038-canonical-baseline-tests.log','hc038-canonical-final-tests.log','hc038-final-focused.log','hc038-site-full-unit-v1.log','hc038-native-proof-v3.json','hc038-parent-qualification-v5.json','hc038-source-independent-review.md','hc038-full-qualification-v1.json','hc038-final-pack-reproducibility.json','hc038-signed-commits.json','hc038-source-sha256-v5.json','hc038-ui-artifact-v4/ui-button-provenance.json','hc038-static-consumer-inventory.json','hc038-final-pr-format.log'])
AFTER_LOGS.setdefault('HC-038',[]).extend(['hc038-semantic-query-followup.log','hc038-semantic-query-parent-review.json','hub-909b13ec-hosted-checks.log','hub-909b13ec-failed-unit-summary.log','site-cb9cd1a5-hosted-checks.log'])
AFTER_LOGS.setdefault('HC-039',[]).extend(['hc039-042-parent-qualification-v1.json','hc039-mounted-review-v3.log','hc039-route-v2.log','hc039-native-v2.log','hc039-native-org-predicate-mutant.log','hc039-native-owner-change-v1.json','hc039-before-fixture-manifest-v1.json','hc039-042-after-fixture-manifest-v3.json','hc039-042-native-proof-v4.json','hc039-hc042-independent-source-review-v2.md'])
AFTER_LOGS.setdefault('HC-041',[]).extend(['hc041-corrected-tests.log','hc041-hc036-real-getter-session-resource.log','hc041-parent-qualification.json','hc041-source-sha256.json'])
AFTER_LOGS.setdefault('HC-042',[]).extend(['hc039-042-parent-qualification-v1.json','hc042-contract-review.md','hc039-042-native-proof-v4.json','hc039-042-after-fixture-manifest-v3.json','hc039-hc042-independent-source-review-v2.md'])

# User-requested pause: exact heads and unresolved failures supersede old progress summaries.
for _id in ['HC-039','HC-042']:
 AFTER_LOGS.setdefault(_id,[]).extend(['hc039-042-parent-qualification-v2.json','hc039-isolated-focused-v2.log','hc039-isolated-final-seams-v3.log','hc039-isolated-build-v1.log','hc039-isolated-check-v2.log','hc039-042-native-proof-v7.json'])
AFTER_LOGS.setdefault('HC-041',[]).append('pause-hub-pr-431.json')
AFTER_LOGS.setdefault('HC-036',[]).extend(['hc036-tool-page-unknown-negative-v2.log','readiness-hub-client-handoff-2026-10-03.md'])
AFTER_LOGS.setdefault('GW-018',[]).extend(['gw018-nightly-child-outcome-independent-review-v2.md'])
AFTER_LOGS.setdefault('GW-019',[]).extend(['gateway-reviewed-e2e-v1.log','gateway-reviewed-e2e-v2.log','gateway-reviewed-e2e-signal-diagnostic.log'])
AFTER_LOGS.setdefault('GW-022',[]).append('readiness-gateway-native-handoff-2026-10-03.md')
for _id in ['NOTIF-003','NOTIF-007','NOTIF-009']:
 AFTER_LOGS.setdefault(_id,[]).extend(['notification-slice5-native-final-v3.log','readiness-notification-handoff-2026-10-03.md'])

AFTER_LOGS.setdefault('HC-026',[]).append('hub-0040a8fb-hosted-checks.log')
AFTER_LOGS.setdefault('NOTIF-007',[]).extend(['notification-slice5-v11-event-trigger-owner-evidence.md','notification-slice5-v11-parent-review.md','notification-slice5-v11-gateway-standards-review.md'])
AFTER_LOGS.setdefault('GW-022A',[]).extend(['gw022a-config-cas-distribution-parent-review-v4.md','gw022a-config-cas-distribution-independent-review-v4.md'])

LOG_CONTEXT={
 'gw022a-parent-drain-probe.log':('Parent runtime failure: actual unchanged native addon; second fresh process retained64 descriptors after a reported complete drain. Owned fixtures removed.','BLOCKED candidate; correction in progress'),
 'site002-parent-encoding-negative.log':('Parent negative against original candidate: four failures; dot path normalized to /privacy. Synthetic strings and local Vitest only.','Historical rejected SITE002 v1'),
 'gw022a-sync-event-loop-baseline.json':('Exact local addon:150ms contended lease blocks10ms event-loop timer; owned child/root removed','Observed current sync limitation; asynchronous executor planned'),
 'gw022a-parent-abnormal-descendant-fixed.log':('Independent same compiled reproduction: descendant no longer survives rejected child; cleanup confirmed','Reviewed native admission v2'),
 'notification-slice3-jobs-final.log':('Marked disposable PostgreSQL:15 files252 tests zero skips; actual pool/roles/SQL','Reviewed Slice3 foundation; not a production worker'),

 'notification-slice3-native-final.log':('14 actual disposable PostgreSQL cases; producer/outbox foundation only. Existing legacy rule pagination is not yet migrated.','Uncommitted Slice3 source/native PASS; producer integrations pending'),
 'notification-slice3-plan-final.json':('Production-emitted SQL; mixed live/expired claims and100000 same-org pending rows; bounded index plans, not latency percentiles','Uncommitted Slice3 native qualification'),
 'notification-slice3-native-receipt.md':('Native qualification and deliberate failing source mutations; independent source PASS and combined252 cases passed. No production wiring or sends.','Foundation evidence; NOTIF004 remains open'),
 'gw022a-parent-abnormal-descendant.log':('Independent compiled probe failure reproduction; descendant remained alive after rejection; owned process killed and observed gone, fixture removed','Historical admission v1 failure; corrected v2 independently reprobed'),
 'gw022a-native-admission-parent-review.md':('Independent blast-radius review found abnormal-exit cleanup and receipt-deadline gaps, then accepted bounded v2 correction','Admission v2 bounded source PASS; fullGW022A remains open'),
 'reliability-parent-channel-status-before.log':('Direct evaluation of the existing status predicate; disconnected/inactive/not-ready are falsely classified. No backend queried.','Historical predicate; exact-status correction source reviewed'),
 'reliability-slice-parent-review-in-progress.md':('Parent accepted status/query bounds but actual mobile Architecture toolbar remains clipped; visual correction in progress','Reliability panel expansion under review'),
 'wallet-native-void-lock-v2.log':('Actual disposable PostgreSQL, production wallet migration and refund/spend/identity races; 27 passing cases','Uncommitted reviewed wallet server'),
 'pos-v11-final-all.log':('120 focused production client/actual mounted continuation cases; synthetic transport','Uncommitted reviewed POS v11'),
 'pos-v11-review-packet.md':('Frozen22-file candidate; subsequent parent review accepted owner-fenced post-commit continuation; ticket idempotency remains HS011','POS v11 source PASS; signed integration pending'),
 'pos-boundaries-final-receipt.md':('POS settings/account extraction, unchanged moved bodies and actual import/type contract gates; later coherent check tracked separately','Uncommitted reviewed extraction'),
 'notification-slice2-native-final.log':('Marked disposable PostgreSQL; isolated historical prefix fixtures plus separately restored supported QA baseline; 10 passing cases, zero skips','Uncommitted reviewed legacy reconciliation e79a5699'),
 'notification-slice2-parent-review.md':('Independent parent source and adjacent reminder/booking caller review; integration and release remain pending','Bounded NOTIF012 source PASS'),
 'gw022a-parent-negative-probes.log':('Historical candidate negative probes: moved directory, unlinked lock and FIFO defects; owned temporary data removed','Superseded native substrate candidate'),
 'gw022a-parent-cross-root-lock.log':('Historical candidate negative probe: a second root admitted the replaced live lock; corrected in v3','Superseded v2 substrate candidate'),
 'gw022a-parent-cross-root-lock-fixed.log':('Corrected v3: fresh-root and separate-process attempts reject replaced live lock; restored original inode remains busy','Uncommitted native substrate v3'),
 'gw022a-parent-fifo-v3.log':('Independent corrected assertion: FIFO immediately rejects as NOT_A_SINGLE_LINK_REGULAR_FILE; cleanup true','Uncommitted native substrate v3'),
 'gw022a-native-substrate-qualified-v4.log':('Local Linux native runtime and static checks; full filesystem atomicity admission and four-target release still open','Uncommitted native substrate v3'),
 'reliability-qualified-v2.log':('Local actual loaders/mounted Svelte coordinator with synthetic transport; 122 passing cases','Uncommitted v2 reliability candidate'),
 'reliability-restored-v2.log':('Local restored source; mounted8 plus bootstrap6 passing; mounted8 overlap the122 receipt','Uncommitted v2 reliability candidate'),
 'reliability-visible-owner-negative.log':('Intentional getter-guard removal;2 mounted failures prove regression sensitivity; exact bytes restored','Negative control, not a current product failure'),
 'gw023-neighbor-tests.log':('Local synthetic clients through actual handler/broadcaster; candidate source; no production messages','uncommitted GW-023 candidate'),
 'gw023-negative-control.log':('Intentional guard removal proves regression sensitivity; exact candidate bytes restored','GW-023 negative control'),
 'notification-narrow-proof/hub-focused.log':('Local focused narrow tenant/audience boundary; candidate source','uncommitted notification candidate'),
 'notification-narrow-proof/gateway-pulse-tools.log':('Local synthetic machine transport tool tests; no provider sends','uncommitted notification candidate'),
 'notification-native-parent-restored.log':('Actual disposable PostgreSQL authority/Pulse paths after restoring original bytes; six passing cases','uncommitted notification candidate'),
 'notification-native-negative-control.log':('Intentional SQL organization-filter removal reproduces foreign audience; bytes restored and six native cases passed','notification negative control'),
 'notification-native-proof-final/jobs-qualified.log':('Exact native lane semantic validator: 11 files, 208 named passing tests, zero skips','uncommitted notification candidate'),
 'native-categories-jobs.log':('Local marked disposable PostgreSQL; actual category migration; zero production mutations','hub:a65b2840'),
 'native-categories-qualified.log':('Exact native jobs manifest validator; 202 passing cases, zero skips','hub:a65b2840'),
 'native-categories-contracts.log':('Local manifest and disposable-runtime safety contracts','hub:a65b2840'),
 'native-categories-cleanup.log':('Owned disposable PostgreSQL: zero remaining category fixture schemas','hub:a65b2840'),
 'hc035-jobs-final.log':('Local disposable PostgreSQL; 198 native cases; no production data','hub:c600711c'),
 'hc035-hosted-unit-failure.log':('GitHub Actions unit lane: three failures exposed incomplete integration','hub:c600711c'),
 'hc035-capability-integration.log':('Local focused correction: hooks, route authority and neighboring access rules','hub:0bbb9aaa'),
}
# Captured source evidence for findings added after the original report.
EXTRA={
 'GW-021':[('gateway','src/infra/device-pairing.ts',444)],
 'HC-035':[('hub','src/lib/components/pos/PlanOpenForm.svelte',79),('hub','src/server/services/pos-accounts.service.ts',465)],
}
BEFORE_IMAGES={
 'HC-001': [('qa-bulk-503-confirmed.png','HTTP 503 still produces a success toast','Fault injected only at the local browser transport; no database mutation.')],
 'UI-001':[('qa-stock-mobile-closed.png','Before opening bulk Tags','390 × 844 baseline; closed control stays within the viewport.'),('qa-stock-mobile-tag-stable.png','Overflow after opening bulk Tags','Same viewport: document grows to 539 px. This reproduces the defect.')],
}
FACES={}
for file in ['faces-backend-recon.json','faces-product-recon.json']:
 doc=json.loads((EV/file).read_text())
 for row in doc['findings']:FACES[row['id']]=(row,doc,file)
results={};missing=[]
for finding in REG['findings']:
 fid=finding['id'];old=ORIGINAL.get(fid,{})
 before=[];after=[];related=[]
 for name,title,caption in BEFORE_IMAGES.get(fid,[]):before.append(image_record(OLD/'evidence'/name,title,'Local frozen Hub + synthetic QA data',BEFORE['hub'],caption))
 if fid in ['HC-005','HC-006']:
  prefix='hc005' if fid=='HC-005' else 'hc006'
  before.append(image_record(BASE/(prefix+'-before-draft-mobile.png'),'Before: acknowledged save erases newer draft','Headless Chromium; actual historical page; synthetic transport','hub:fae8ff43','390 × 844. Type a draft, start Save/Add, enter a newer draft, then acknowledge the earlier request. The newer draft disappears. No production session or write.'))
  after.append(image_record(BASE/(prefix+'-after-draft-mobile.png'),'After: newer draft survives the earlier save','Same Chromium viewport and synthetic sequence; current production page','HC005/006 fixture v3; exact product hashes in attached manifest','390 × 844. The newer draft remains. One write and one read; product actions meet the shared44px touch height. Browser evidence precedes the additional scope-guard defense; current source acceptance remains a separate gate.'))
  if fid=='HC-006':
   after.append(image_record(BASE/'hc006-after-unknown-mobile.png','Lost reply: preserve draft and block repeat writes','Headless Chromium; actual Pulse page; deliberately lost synthetic reply','HC005/006 fixture v3','The outcome stays unknown. Save, Approve and Dismiss remain blocked; Reload current data is read-only.'))
   after.append(image_record(BASE/'hc006-after-read-repair-mobile.png','Successful read permits deliberate editing without claiming success','Same Pulse fixture after a failed read, then a successful read','HC005/006 fixture v3','The draft survives both reads. Total writes remain2 and reads advance from1 to3. The unknown-outcome message remains after unlocking; no write is replayed.'))
   after.append(image_record(BASE/'hc006-after-read-repair-desktop.png','Desktop: recovered draft and uncertainty remain visible','Headless Chromium; actual Pulse page; synthetic transport','HC005/006 fixture v3','1440 × 1000. Same recovered state and retained draft as the mobile case.'))
 if fid=='HC-026':
  for surface in ['agents','workshop']:
   before.append(image_record(BASE/f'hc026-before-{surface}-delete-enter-v2.png',f'Before: {surface} Delete also opens the record','Dedicated headless Chromium; actual source; synthetic rows and action callbacks','Hub0020b673 with frozen fixture manifest','Real Enter key dispatch generates native click. Trace records navigation/open and delete from the same activation. No production session or data write.'))
 if fid=='HC-026':
  for surface in ['agents','workshop']:
   after.append(image_record(BASE/f'hc026-after-{surface}-delete-enter-v3.png',f'After: {surface} Delete acts once','Dedicated headless Chromium; actual six-card fixture; synthetic callbacks','HC026 fixture v3; source hashes attached','Real Enter produces one delete and no navigation, request or form submission. Ten Enter/Space cases pass across five destructive surfaces.'))
   after.append(image_record(BASE/f'hc026-after-{surface}-es-mobile-v3.png',f'After: {surface} in Spanish at390px','Same actual component fixture with installed Paraglide preprocessor','HC026 fixture v3; nullable-ID guard hardened afterward','Document remains390px wide. Buttons are at least44px; Workshop includes a loaded thumbnail and a placeholder. Unit and full-source checks separately qualify transport guards.'))
 if fid in ['HC-038','HC-039']:
  before.append(text_receipt(BASE/'hc026-route-panels-v1.log','Actual mounted failures exposed during card-consumer verification','Local actual FlowExports/FlowCopilot components; synthetic HTTP; no production data','Unfixed shared Button semantics and alias failure handling'))
 if fid=='HC-038':
  before.append(image_record(BASE/'hc038-native-proof-v3-hc038-before-native-focus.png','Before: Tab reaches a control declared outside the tab order','Dedicated headless Chromium; exact original packed Button; synthetic fixture','UI baseline6b21ce0e','The first Tab focuses Unselected option because the shared control overwrites tabindex=-1. Accessibility output also shows Report as a generic button.'))
  after.append(image_record(BASE/'hc038-native-proof-v3-hc038-after-native-focus.png','After: native Tab respects the selected option','Dedicated headless Chromium; exact Button-only packed overlay','UI artifact403344ff','Tab skips the unselected option and reaches Selected option. Actual accessibility tree retains option and switch roles; no production session.'))
  after.append(image_record(BASE/'hc038-native-proof-v3-hc038-after-native-actions.png','After: actual controls, forms and flow export actions','Same actual packed Button and production FlowExports; synthetic PATCH response','HC038 native fixture v3','Pointer, Enter and Space execute once. Disabled/loading controls, native form types and exact two flow export PATCHes pass. Full source/release gates remain separate.'))
  after.append(image_record(BASE/'hc038-native-proof-v3-hc038-after-native-mobile.png','After: actual controls at390px','Dedicated headless Chromium; synthetic fixture','HC038 native fixture v3','Document width equals390px. This demonstrates primitive behavior and containment; the preexisting FlowExports custom touch target/state issues are tracked underHC040.'))
 if fid=='HC-039':
  before.append(image_record(BASE/'hc039-before-owner-change-v1.png','Before: organization changes but the old mention remains','Dedicated headless Chromium; original alias cache from909b13ec with lifecycle compatibility hook; actual current chat consumers','HC039 before fixture v1','Studio South still resolves Studio North colleague after switching. The original cache makes only one request. Synthetic identities only.'))
  after.append(image_record(BASE/'hc039-after-owner-change-v1.png','After: the current organization resolves its own colleague','Dedicated headless Chromium; owner-scoped directory and actual consumers','HC039 after fixture v1','Studio South resolves current_person after the second request; the old colleague is plain text. This image also exposed the separate contrast defect HC042.'))
  after.append(image_record(BASE/'hc039-042-v7-keyboard-suggestion-mobile.png','After: real keyboard mention suggestions at390px','Dedicated headless Chromium; actual composer with synthetic directory and disconnected Gateway resources','HC039/042 fixture v3','Native keyboard selects the current colleague and submits the reference locally. The final browser proof also rejects reversed owner replies and recovers after a failed read.'))
 if fid=='HC-041':
  before.append(text_receipt(BASE/'hc041-original-negative.log','Actual PageData shape exposes the obsolete organization getter','Local actual getter; synthetic canonical layout shape','Original getter:12 failures and4 passes'))
 if fid=='HC-042':
  before.append(image_record(BASE/'hc039-after-initial-v1.png','Before: the resolved colleague name disappears','Dedicated headless Chromium; actual ChatMessage on the default filled surface','HC039 discovery fixture v1','Computed mention text and user bubble background both rgb(59,130,246): contrast1:1. The blank-looking leading name is present in the DOM.'))
  for theme in ['new-york','github-light']:
   after.append(image_record(BASE/f'hc039-042-v7-{theme}-390.png',f'After: readable user mentions in {theme} at390px','Dedicated headless Chromium; actual components and actual theme application','HC042 signed875fb043; isolated fixture v7','Computed foreground matches semantic on-accent, with underline and contrast5.1686:1. Ordinary/error mention colors remain unchanged; document width390px. Theme transitions settle before capture.'))
 if fid=='HC-040':
  before.append(text_receipt(BASE/'hc040-flow-export-ownership-recon.log','Two actual flow-export ownership regressions','Mounted production FlowExports; synthetic requests; no production writes','Current source before ownership correction'))
 if fid=='UI-002':before.append(image_record(EV/'calendar-074-mobile-failure.png','Mobile toolbar overlap at 390 × 844','Headless Chromium; real components; synthetic fixture','07463ec1','The overlap is an observed defect. Failed-week banners are deliberately injected; this image is not an after-fix acceptance.'))
 if fid in FACES:
  row,doc,file=FACES[fid];facts=row.get('observed',row.get('productionEvidence',{}))
  before.append(dict(kind='measurement',title='Read-only production observation',environment=doc.get('environment','FACES production backend'),commit=(doc.get('runtimeIdentity',{}).get('imageRevision') or 'Hub deployed revision not attested'),excerpt=json.dumps(facts,indent=2,ensure_ascii=False),note=row.get('evidenceBoundary','Live state observed; source cause remains an inference unless the deployed revision is attested.'),source=file,sha256=hashlib.sha256((EV/file).read_bytes()).hexdigest(),capturedAt=doc.get('generatedAt')))
 for name in BEFORE_LOGS.get(fid,[]):
  p=OLD/'evidence'/name
  if p.exists():before.append(text_receipt(p,'Baseline reproduction: '+name,'Frozen audit source; synthetic local fixture',BEFORE.get(old.get('repo','hub'))))
 if fid=='HS-008':before.append(text_receipt(BASE/'native-categories-baseline.log','Category native tests skipped in the old ordinary lane','Local baseline test discovery','hub:0bbb9aaa'))
 if fid=='OP-003':before.append(text_receipt(BASE/'factory-input-baseline.log','Factory provider-spawn baseline failure','Local reproduction of runner invocation'))
 if fid=='GW-024':before.append(text_receipt(BASE/'gw024-proof/gw024-proof.log','Browser credential authority bypass reproduction','Actual Hub token route, Site layout and Gateway JWT resolver; synthetic identities; no production credentials','Uncommitted proof against current source'))
 if fid=='SITE-004':before.append(text_receipt(BASE/'site-token-integrity-locale.log','Ten undefined Site page-width consumers','Actual scanner over installed Site package; no production data',BEFORE['site']))
 if fid=='SITE-001':before.append(text_receipt(BASE/'site-baseline-build.log','Unchanged Site base fails during prerender','Isolated base source; disposable public compile exports; no production data',BEFORE['site']))
 if fid=='GW-023':before.append(text_receipt(BASE/'gw023-agent-event-baseline.log','Parallel agent stream leaks across organizations','Actual production handler and broadcaster; synthetic clients; no production writes','gateway:98767f4de'))
 if fid=='GW-021':before.append(text_receipt(BASE/'evidence/gw021-baseline-auth-e2e.log','Paired-device baseline failures','Local real WebSocket fixture',BEFORE['gateway']))
 anchors=[*old.get('evidence',[]),*finding.get('sourceAnchors',[])]
 for e in anchors:
  if not isinstance(e,dict):continue
  repo=e.get('repo',old.get('repo','hub'));repo=repo if repo in REPOS else 'hub'
  path=e.get('file',e.get('path',''));ref=e.get('repoCommit',BEFORE[repo])
  record=source_record(repo,path,ref,e.get('line'),e.get('lines'),e.get('detail',e.get('note','')))
  if record:before.append(record)
  elif e.get('url') and (OLD/e['url']).is_file():before.append(text_receipt(OLD/e['url'],'Audit fixture: '+Path(path or e['url']).name,'Frozen audit fixture',ref))
 for e in finding.get('source_evidence',[]):
  m=re.match(r'(.+?):(\d+)(?:-(\d+))?',e)
  if not m:continue
  path,start,end=m.groups();repo='gateway' if path.startswith('gateway/') else 'hub'
  record=source_record(repo,path,BEFORE[repo],start,start+('-'+end if end else ''),'Parent review source anchor')
  if record:before.append(record)
 for repo,path,line in EXTRA.get(fid,[]):
  record=source_record(repo,path,BEFORE[repo],line)
  if record:before.append(record)
 # Changes are taken from recorded commits, never from another worker's uncommitted tree.
 for spec in finding.get('code_commits',[]):
  if ':' not in spec:continue
  repo,ref=spec.split(':',1)
  if repo not in REPOS:continue
  full=git(repo,'rev-parse',ref)
  if not full:continue
  full=full.strip();changed=(git(repo,'diff-tree','--no-commit-id','--name-only','-r',full) or '').splitlines()
  wanted=[(e.get('file') or e.get('path') or '').removeprefix(repo+'/') for e in anchors if isinstance(e,dict) and e.get('repo',old.get('repo','hub'))==repo]
  wanted += [re.sub(r':\d+.*','',p).removeprefix(repo+'/') for p in finding.get('source_evidence',[]) if (repo=='gateway')==p.startswith('gateway/')]
  matched=[p for p in changed if p in wanted]
  selected=matched[:3] or [p for p in changed if not p.endswith(('.json','.lock','.png'))][:2]
  diff=git(repo,'show','--format=fuller','--no-ext-diff','--unified=3',full,'--',*selected) or ''
  lines=diff.splitlines();excerpt='\n'.join(lines[:150])+ ('\n… excerpt ends; open the commit for the full diff.' if len(lines)>150 else '')
  patch_name=f'{fid}-{repo}-{full[:12]}.patch'
  (ASSET/patch_name).write_text(diff)
  after.append(dict(kind='diff',title='Committed implementation: '+repo+' '+full[:9],environment='Feature branch; not production',commit=full,excerpt=excerpt,href='assets/finding-evidence/'+patch_name,sha256=hashlib.sha256(diff.encode()).hexdigest(),source=f'git show {full} -- selected finding paths',note='Code evidence only. '+('Diff follows the original source anchors.' if matched else 'Representative changed files from this recorded commit; the commit may cover several findings.')))
 for name in AFTER_LOGS.get(fid,[]):
  p=BASE/name
  if p.exists():
   environment,revision=LOG_CONTEXT.get(name,('Local synthetic/disposable test environment',finding.get('code_commits',[])[-1] if finding.get('code_commits') else 'Uncommitted review candidate'))
   after.append(text_receipt(p,'Verification: '+Path(name).name,environment,revision))
 if fid in ('HC-012','HC-013'):
  after.insert(0,image_record(EV/'calendar-074-mobile-recovered.png','After Retry: both failed weeks recover','Headless Chromium; actual calendar; synthetic fixture','07463ec1','Same 390 × 844 fixture after each Retry. The separate UI-002 toolbar overlap remains open.'))
  after.insert(0,image_record(EV/'calendar-074-mobile-failure.png','Fixed error handling under injected HTTP 503','Headless Chromium; actual calendar; synthetic fixture','07463ec1','Post-change failure state: missing data is visibly unavailable and retryable. This is not a pre-fix screenshot.'))
 if fid=='HC-035' and (EV/'hc035-v6-desktop-overlap.png').exists():
  before.insert(0,image_record(EV/'hc035-v6-desktop-overlap.png','Review found recovery actions overlapping adjacent card','Headless Chromium; actual PlanOpenForm; synthetic recovery records','Uncommitted v6 fixture on hub:a65b2840','1280 × 960 viewport with narrow form panels. The new recovery buttons overflow their panel. Correction remains in progress; this is captured failure evidence, not acceptance.'))
 if fid=='HC-035' and (EV/'hc035-v6-mobile-clipped-actions.png').exists():
  before.insert(0,image_record(EV/'hc035-v6-mobile-clipped-actions.png','Mobile action clipping despite zero document overflow','Headless Chromium; actual PlanOpenForm; synthetic recovery records','Uncommitted v6 fixture on hub:a65b2840','390 × 844 viewport: the recovery action extends offscreen while document.scrollWidth remains390. Visible control bounds are part of acceptance.'))
 if fid=='HC-035' and (EV/'hc035-v10-desktop.png').exists():
  after.insert(0,image_record(EV/'hc035-v10-desktop.png','Reviewed candidate: recovery actions fit narrow panels','Headless Chromium; actual PlanOpenForm; synthetic recovery records','Uncommitted v10 candidate on hub:eb6867db','1440px desktop. Parent visual and source review passed. 100 focused tests passed; production release remains pending.'))
 if fid=='HC-035' and (EV/'hc035-v10-mobile.png').exists():
  after.insert(0,image_record(EV/'hc035-v10-mobile.png','Reviewed candidate: mobile controls are reachable','Headless Chromium; actual PlanOpenForm; synthetic recovery records','Uncommitted v10 candidate on hub:eb6867db','390px viewport and document. Actions stay in the panel and meet the 44px touch height. Same-customer recovery and customer-switch races are covered by mounted tests.'))
 if fid in ('HC-024','HC-025'):
  for name,title,caption in [
   ('reliability-v6-desktop-failed.png','Candidate: failed refresh retains the same-query snapshot','1440px desktop, eight contained failures, last successful count 42 retained. Post-change failure state, not a baseline screenshot.'),
   ('reliability-v6-desktop-recovered.png','Candidate: actual Retry recovers all eight resources','Initial 8 reads, failed refresh 16, Retry 24; errors clear without hard refresh.'),
   ('reliability-v6-mobile-failed.png','Candidate: mobile failure controls fit and wrap','390px viewport and document; every control meets 44 px touch height.'),
   ('reliability-v6-mobile-last-retry.png','Candidate: final Retry remains reachable in the actual scroll container','Main scroll height 2362 px; final control is visible at y 756–800 and was clicked.'),
   ('reliability-v6-mobile-recovered.png','Candidate: final mobile Retry recovers the data','After the real final-button click: zero error cards, 40 total reads, scrollTop 0. Synthetic transport; independent final source review passed.'),
  ]:
   after.append(image_record(EV/name,title,'Headless Chromium; production coordinator/loaders/notices/shared primitives; synthetic transport','Uncommitted reviewed v3 reliability candidate on hub:eb6867db',caption))
  after.append(text_receipt(EV/'reliability-v6-browser-proof.json','Measured component recovery and control bounds','Local Chromium component fixture; no production session or p99 claim','Uncommitted v2 reliability candidate'))
 if fid=='HC-024':
  before.append(image_record(BASE/'evidence/reliability-panels-v3-architecture-mobile-comparable.png','Before: graph actions are clipped on mobile','Headless Chromium; actual ArchitectureGraph; synthetic transport','Uncommitted panel v3 on eb6867db','390 × 844; both document scroll owners reset. Refresh is 24px tall and starts outside the viewport at x418.'))
  for panel in ['plugins','insights','architecture']:
   for state in ['failed','recovered']:
    after.append(image_record(BASE/'evidence'/f'reliability-panels-v3-{panel}-desktop-{state}.png',f'Actual {panel}: {state}','Headless Chromium; production panels/loaders; synthetic transport','Uncommitted panel v3 on eb6867db','1440 × 1000. Failure and successful Retry states. These desktop captures precede the responsive graph toolbar correction below.'))
  for panel in ['plugins','insights']:
   after.append(image_record(BASE/'evidence'/f'reliability-panels-v3-{panel}-mobile-recovered.png',f'Actual {panel}: mobile recovery','Headless Chromium; actual panel; synthetic transport','Uncommitted panel v3 on eb6867db','390px viewport and document. Actual 44px Retry recovers without a hard refresh.'))
  for name,title,caption in [
   ('reliability-panels-v5-architecture-mobile-comparable.png','After: graph controls fit the mobile viewport','Same 390 × 844, fixture identity, request count and scroll positions as the before capture. Refresh is 78 × 44px at x197; Show key and view selectors remain reachable.'),
   ('reliability-panels-v5-architecture-mobile-comparable-key.png','After: expanded key leaves view controls reachable','The key occupies document flow on mobile. Its bottom is above the view selector. Actual Live, Refresh and Code clicks passed, including scrolling the real container.'),
  ]:
   after.append(image_record(BASE/'evidence'/name,title,'Headless Chromium; actual ArchitectureGraph; synthetic transport','Uncommitted reviewed panel v5 on eb6867db',caption))
  for name in ['reliability-panels-v3-desktop-proof.json','reliability-panels-v3-mobile-proof.json','reliability-panels-before-after-comparable.json','reliability-panels-v5-mobile-proof.json','reliability-panels-v5-desktop-proof.json']:
   after.append(text_receipt(BASE/name,name,'Actual component bounds and actions; synthetic data','Local source and visual review passed'))
  for version in ['v3','v5']:
   after.append(text_receipt(BASE/f'reliability-panels-fixture-{version}/fixture-manifest.json',f'Actual panel source provenance {version}','Production source hashes, fixture inputs, dependency lock and fonts',f'{version} fixture'))
 if fid=='SITE-004':
  for suffix in ['desktop-dark','desktop-light','mobile-dark','mobile-light']:
   after.append(image_record(EV/('site004-'+suffix+'.png'),'Actual Site: '+suffix,'Local built Site preview; public page; no production session','Uncommitted SITE004 artifact 2b893413','All ten containers compute max-width1280px; document has no horizontal overflow. The four renders cover1440x900 and390x844 in both themes.'))
  after.append(text_receipt(EV/'site004-browser-proof.json','Four actual Site layout measurements','Headless Chromium; local production build; no production data','SITE004 local qualification'))
 if fid=='NOTIF-003':
  for name,title,caption in [
   ('notification-health-v1-desktop-unavailable.png','Before review correction: implementation-heavy status copy','Earlier actual-component candidate at1440×1000. This is a local synthetic fixture, not the preexisting production page.'),
   ('notification-health-v2-desktop-unavailable.png','After: plain notification delivery status','Actual settings page and shared primitives.5000+ is an explicit bounded lower count. Legacy rules remain clearly unverified; source projector is still unregistered.'),
   ('notification-health-v2-desktop-failed.png','Failed refresh retains the last known queue','An actual Refresh click receives a synthetic503. The5000+ value stays visible with an explicit stale-data warning and Retry.'),
   ('notification-health-v2-resolved-old-a.png','Workspace switch rejects an old response','A delayed request from workspaceA resolves after switching toB. NoA queue or health appears inB; its unavailable seed is retained.'),
   ('notification-health-v2-mobile-top.png','Earlier mobile health action; adjacent rule actions were undersized','Historical390px checkpoint: Refresh was44px but legacy actions were smaller. The later actual-page evidence below demonstrates their correction.'),
   ('notification-health-v3-mobile-edit.png','Before focus correction: Edit leaves the form offscreen','Actual Edit click from the final rule row left Name335px above the viewport and unfocused. This reproduced the navigation problem.'),
   ('notification-health-v4-mobile-actions.png','After: mobile rule actions meet44px','Actual Create, Edit and Delete actions are44px tall at390px with no horizontal overflow.'),
   ('notification-health-v4-mobile-edit-later.png','After: Edit reveals and focuses Name','Actual Edit click brings Name into view at76px and moves focus to the input. This screenshot uses fixturev4; the later v5 source adds a separately tested same-tick owner fence.'),
   ('notification-health-v4-mobile-cancel.png','After: Cancel returns focus to the initiating row','Actual Cancel click clears the form and returns focus to the connected Edit action.390px viewport, no horizontal overflow.'),
   ('notification-health-v6-mobile-actions.png','Final mobile rule actions','Current reviewed source: Create/Edit/Delete meet44px and remain within the390px document.'),
   ('notification-health-v6-mobile-edit.png','Final Edit: heading and Name clear the sticky header','Actual Edit click moves to the editor. Heading starts at88px below the71px header; Name is focused at148px. Exact final source is recorded in the attached fixture manifest.'),
   ('notification-health-v6-mobile-cancel.png','Final Cancel restores row focus','Actual Cancel returns keyboard focus to the initiating Edit action and resets the form.'),
   ('notification-health-v6-mobile-reduced-motion.png','Reduced-motion editor navigation','With reduced motion enabled, the same actual Edit action reveals the heading and focuses Name without smooth scrolling.'),
  ]:
   after.append(image_record(BASE/'evidence'/name,title,'Headless Chromium; actual settings components; synthetic PageData and transport','Uncommitted Slice4 candidate; final review in progress',caption))
  for version in ['v2','v3','v4','v6']:
   after.append(text_receipt(BASE/f'notification-health-fixture-{version}/fixture-manifest.json',f'Actual notification settings source provenance {version}','Exact production component inputs and synthetic fixture boundaries',f'Slice4 fixture {version}'))
 if fid=='NOTIF-007':
  for name,title,caption in [
   ('notification-authority-manager-desktop.png','Before/after: capability holders can find Notifications','1440px. Same synthetic non-admin comms manager. Historical SettingsNav hides the entry; current SettingsNav offers it. Both use current shared navigation and route registry.'),
   ('notification-authority-manager-mobile.png','Before/after: mobile notification settings stay reachable','390px viewport and document; actual notification link is44px tall. This is a role fixture, not a production login.'),
   ('notification-authority-viewer-mobile.png','Denied role: notification settings remain hidden','390px. A view-only synthetic role has no Notifications entry in either component. Actual route denial and fresh native membership are tested separately.'),
  ]:
   after.append(image_record(EV/name,title,'Headless Chromium; actual SettingsNav/SectionNav; synthetic capability state','Uncommitted reviewed Slice2 authority candidate',caption))
  for name in ['notification-authority-manager-proof.json','notification-authority-viewer-proof.json','notification-authority-fixture-v2-manifest.json']:
   after.append(text_receipt(EV/name,'Navigation evidence: '+name,'Local Chromium component fixture; no production session','Slice2 authority source review passed'))
 if fid=='NOTIF-018':
  before.insert(0,image_record(EV/'notif018-before-empty-desktop.png','Before: waiting URL claimed Request sent without a record','Headless Chromium; historical route component; synthetic empty applicant','Historical route at hub:eb6867db, compiled with fixture shared shell','1440 × 1000. Historical page had no authoritative load and rendered this success claim for the empty fixture. This is component evidence, not a logged-in production session.'))
  for name,title,caption in [
   ('notif018-v3-after-empty-desktop.png','After: no request is shown as no request','Same 1440 × 1000 viewport and empty applicant state; current component offers access request and status refresh.'),
   ('notif018-v2-after-many-mobile.png','After: multiple own workspaces are explicit','390 × 844; long display names wrap and the status control meets44px. Synthetic records passed to actual component.'),
   ('notif018-v3-mobile-last-control.png','After: final status control remains reachable','Fifty own pending requests,3434px internal scroll. Final action is visible and44px tall; document remains390px.'),
   ('notif018-v3-mobile-retry-recovered.png','After: status retry clears the error','Actual second status-button click succeeds; all50 pending rows remain and no alert remains. Same390px viewport.'),
   ('notif018-v3-mobile-refresh-failed.png','After: a failed status refresh remains visible and retryable','Actual status button clicked; synthetic transport failure shows fixed safe copy. Existing requests remain visible. Scrolled to the end to inspect the full feedback.'),
  ]:
   after.append(image_record(EV/name,title,'Local Chromium; actual JoinPendingState and shared primitives; synthetic records','Uncommitted NOTIF018 candidate on hub:eb6867db',caption))
  after.append(text_receipt(EV/'notif018-v3-fixture-manifest.json','Current waiting-component source provenance','Exact production source hashes and font hashes; local fixture','NOTIF018 v3 fixture'))
  after.append(text_receipt(EV/'notif018-v3-browser-proof.json','Notification waiting component bounds','Synthetic component fixture with loaded fonts; not authenticated production','Uncommitted NOTIF018 candidate'))
 if fid=='TQ-003':
  after.insert(0,image_record(EV/'dependency-parent-chromium.png','Actual browser security fixture','Headless Chromium; synthetic paste/sanitizer inputs','71152adb','Screenshot supports fixture provenance. The hosted receipt and mutation results establish the four behaviors.'))
  after.append(text_receipt(EV/'tq003-f333cbc2-hosted-browser.md','Hosted Chromium and deliberate regression receipts','GitHub Actions Chromium fixture','f333cbc2'))
 if fid=='HS-007':
  before.append(text_receipt(EV/'finance-sync-red.txt','Progress baseline failure','Local fixture'))
  after.append(text_receipt(EV/'finance-sync-green.txt','Progress regression passes','Local fixture',finding.get('code_commits',[])[-1]))
 if fid=='OP-003':after.append(text_receipt(EV/'factory-input-green.txt','Factory stdin handling regression','Local synthetic runner',finding.get('code_commits',[])[-1]))
 if not before:
  missing.append(fid)
  before.append(dict(kind='gap',title='Baseline receipt needs attachment',note='The finding remains open. Its ledger narrative is not a substitute for an independently inspectable source or runtime receipt.'))
 if not after:after.append(dict(kind='pending',title='After evidence pending',note='No verified implementation receipt has been attached for this finding. The required proof below is an acceptance target, not a test result.'))
 results[fid]=dict(before=before,after=after,required=finding.get('acceptance'),status=finding['status'],runtime=finding.get('runtime'),performanceNote='No latency percentile is claimed without a captured sample count, workload, environment and measurement window.')
(OUT/'assets/finding-evidence.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
summary={'findings':len(results),'baselineGaps':missing,'images':sum(r['kind']=='image' for f in results.values() for side in ['before','after'] for r in f[side]),'consoleReceipts':sum(r['kind']=='console' for f in results.values() for side in ['before','after'] for r in f[side]),'sourceExcerpts':sum(r['kind']=='source' for f in results.values() for r in f['before']),'committedDiffs':sum(r['kind']=='diff' for f in results.values() for r in f['after']),'afterPending':sum(any(r['kind']=='pending' for r in f['after']) for f in results.values())}
(BASE/'finding-evidence-coverage.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
