import time,json,base64
from pathlib import Path
base='/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/development/d-pulse/browser-harness-final/'
Path(base).mkdir(exist_ok=False)
results=[]
def open_surface(query,w,h):
 new_tab('http://127.0.0.1:18903/pulse.html?'+query)
 wait_for_load();cdp('Page.bringToFront')
 cdp('Emulation.setDeviceMetricsOverride',width=w,height=h,deviceScaleFactor=1,mobile=False)
 time.sleep(.25)
 assert js('[innerWidth,innerHeight]')==[w,h]
def enter(label):
 assert js("(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==="+json.dumps(label)+");if(!b)return false;b.focus();return true})()"),label
 press_key('Enter');time.sleep(.3)
def snap(label,file):
 value=js("(()=>{const s=window.__pulseFixture.snapshot();return {decision:s.decision,dispatches:s.dispatches,requests:s.requests.length,writes:s.requests.filter(r=>['POST','PATCH'].includes(r.method)),unexpected:s.unexpected,viewport:[innerWidth,innerHeight]}})()")
 results.append({'step':label,**value});print(label,value)
 r=cdp('Page.captureScreenshot',_response_timeout=10,format='png',fromSurface=False)
 open(base+file,'wb').write(base64.b64decode(r['data']))
 return value
open_surface('surface=notifications&lang=en&stale',1280,900)
snap('EN desktop rendered revision1','en-desktop-rendered-revision1.png')
enter('Approve');state=snap('EN keyboard stale revision conflict','en-desktop-conflict.png');assert len(state['writes'])==1 and state['writes'][0]['body']['expectedRevision']==1 and state['dispatches']==0
enter('Reload current data');assert 'Revision 2' in js('document.body.innerText')
enter('Approve');state=snap('EN refreshed revision approval','en-desktop-queued-receipt.png');assert len(state['writes'])==2 and state['writes'][1]['body']['expectedRevision']==2 and state['decision']=='approved'
open_surface('surface=popup&lang=es',390,844)
enter('Aprobar');js('window.__pulseFixture.scheduled(); window.__pulseFixture.reconnect()');time.sleep(.3)
state=snap('ES compact popup scheduled readback','es-compact-popup-scheduled.png');assert len(state['writes'])==1 and 'Programado; ejecución sin verificar' in js('document.body.innerText')
open_surface('surface=page&lang=es&write-fail',1280,900)
enter('Editar');fill_input('textarea','{"title":"Retained draft"}');enter('Guardar')
assert js('document.querySelector("textarea").value')=='{"title":"Retained draft"}'
state=snap('ES desktop rejected edit retains draft','es-desktop-page-retained-draft.png');assert len(state['writes'])==1
open_surface('surface=notifications&lang=es&other-owner',390,844)
assert 'Pulse reviewed calendar action' not in js('document.body.innerText')
assert js('window.__pulseFixture.readDenied()') is True
state=snap('ES compact other-owner receipt denied','es-compact-owner-denied.png');assert not state['writes']
open_surface('surface=notifications&lang=en&refresh-fail',1280,900)
enter('Approve');state=snap('EN committed decision with failed refresh','en-committed-refresh-failed.png');assert len(state['writes'])==1 and state['dispatches']==1
js('window.__pulseFixture.recover()');enter('Reload current data');js('window.__pulseFixture.reconnect()');time.sleep(.3)
state=snap('EN read recovery and reconnect without replay','en-committed-read-recovered.png');assert len(state['writes'])==1
open_surface('surface=notifications&lang=es&unknown',390,844)
enter('Aprobar');state=snap('ES unknown committed transport fenced','es-compact-unknown.png');assert len(state['writes'])==1
enter('Recargar datos');js('window.__pulseFixture.reconnect()');time.sleep(.3)
state=snap('ES unknown transport receipt recovered by reads','es-compact-unknown-recovered.png');assert len(state['writes'])==1 and state['dispatches']==1
record={'browser':cdp('Browser.getVersion'),'driver':'browser-harness','name':'minion-d-pulse-7j3r-final','endpoint':'http://127.0.0.1:9223','sourceArtifact':'default-critical-run-06','steps':results,'syntheticAuth':True,'screenshotMechanism':'Page.captureScreenshot fromSurface=false; Page.bringToFront inside dedicated headless9223 only'}
open(base+'manual-receipt.json','w').write(json.dumps(record,indent=2)+'\n')
print('manual proof complete',len(results))
