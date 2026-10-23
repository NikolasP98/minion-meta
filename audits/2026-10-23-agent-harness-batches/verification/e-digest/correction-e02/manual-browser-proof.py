"""Prepared Browser Harness script. Execute only in root's allocated headless window."""
import os, time, json, base64, hashlib
from pathlib import Path
out = Path(os.environ['MINION_E_MANUAL_OUT'])
artifact = Path(os.environ['MINION_E_ARTIFACT_ROOT'])
assert out.is_absolute() and artifact.is_absolute()
assert not out.exists(), 'Use a fresh evidence directory; preserve every prior attempt'
manifest = (artifact / 'manifest.json').read_bytes()
assert json.loads(manifest)['boundary']['violations'] == 0
out.mkdir(mode=0o700)
steps = []

def wait_js(expression):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if js(expression):
            return
        time.sleep(.1)
    raise AssertionError('Timed out: ' + expression)

def capture(label):
    state = js("(()=>{const s=window.__pulseFixture.snapshot();return {writes:s.requests.filter(r=>['POST','PATCH'].includes(r.method)),requests:s.requests,feedbackCount:s.feedbackCount,unexpected:s.unexpected,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth}})()")
    assert state['unexpected'] == [] and not state['overflow']
    body = cdp('Page.captureScreenshot', _response_timeout=10, format='png', fromSurface=False)
    target = out / (label + '.png')
    target.write_bytes(base64.b64decode(body['data']))
    steps.append({'step': label, 'screenshot': target.name, **state})
    print(label, json.dumps({'writes': len(state['writes']), 'feedbackCount': state.get('feedbackCount')}))
    return state

def open_case(query, label, width):
    new_tab('http://127.0.0.1:18903/pulse.html?' + query)
    wait_for_load()
    cdp('Page.bringToFront')  # Dedicated invisible 9223 instance only.
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=900, deviceScaleFactor=1, mobile=False)
    wait_js('Boolean(window.__pulseFixture)')
    capture(label + '-initial')

def button_expression(label):
    return "Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()===" + json.dumps(label) + ')'

def enter(label):
    expression = button_expression(label)
    wait_js('Boolean((' + expression + ') && !(' + expression + ').disabled)')
    assert js('(()=>{const b=' + expression + ';b.focus();return document.activeElement===b})()')
    press_key('Enter')
    time.sleep(.35)

def select_fact_error_by_keyboard():
    assert js("(()=>{const s=document.querySelector('[data-pulse-feedback] select');if(!s)return false;s.focus();return document.activeElement===s})()")
    for key, code in [('Home', 36), ('ArrowDown', 40), ('ArrowDown', 40), ('ArrowDown', 40)]:
        cdp('Input.dispatchKeyEvent', type='keyDown', key=key, code=key, windowsVirtualKeyCode=code)
        cdp('Input.dispatchKeyEvent', type='keyUp', key=key, code=key, windowsVirtualKeyCode=code)
    press_key('Tab')
    assert js("document.querySelector('[data-pulse-feedback] select').value") == 'fact_error'

try:
    for locale, width in [('en', 1280), ('es', 390)]:
        save = 'Save feedback' if locale == 'en' else 'Guardar comentario'
        reload = 'Reload current data' if locale == 'en' else 'Recargar datos'
        correction = 'Save correction' if locale == 'en' else 'Guardar corrección'
        common = 'surface=page&digest&lang=' + locale
        open_case(common + '&feedback-write-fail&digest-malicious-summary', locale + '-failed-save', width)
        wait_js('Boolean((' + button_expression(save) + ') && !(' + button_expression(save) + ').disabled)')
        select_fact_error_by_keyboard()
        draft = '😀' * 500
        fill_input('textarea', draft)
        enter(save)
        wait_js('Boolean((' + button_expression(save) + ') && !(' + button_expression(save) + ').disabled)')
        assert js('document.querySelector("textarea").value') == draft
        assert js('document.querySelector("select").value') == 'fact_error'
        assert js('document.querySelectorAll(\'img[src*="attacker.invalid"]\').length') == 0
        state = capture(locale + '-failed-save-preserves-keyboard-draft')
        assert len(state['writes']) == 1 and state['feedbackCount'] == 0
        assert js("Array.from(document.querySelectorAll('a')).some(a=>a.href==='https://github.com/vercel/ai/releases/tag/ai%407.0.18')")
        for mode in ['refresh-fail', 'unknown']:
            label = locale + '-' + mode
            open_case(common + '&feedback-' + mode, label, width)
            wait_js('Boolean((' + button_expression(save) + ') && !(' + button_expression(save) + ').disabled)')
            fill_input('textarea', 'One durable feedback action.')
            enter(save)
            wait_js('Boolean(' + button_expression(reload) + ')')
            state = capture(label + '-one-committed-write')
            assert len(state['writes']) == 1 and state['feedbackCount'] == 1
            js('window.__pulseFixture.recover()')
            enter(reload)
            wait_js('Boolean((' + button_expression(correction) + ') && !(' + button_expression(correction) + ').disabled)')
            js('window.__pulseFixture.reconnect()')
            time.sleep(.3)
            state = capture(label + '-read-only-recovery-and-reconnect')
            assert len(state['writes']) == 1 and state['feedbackCount'] == 1
        open_case(common + '&other-owner', locale + '-other-owner', width)
        assert js('document.querySelectorAll("[data-pulse-feedback]").length') == 0
        assert len(capture(locale + '-other-owner-denied')['writes']) == 0
        open_case(common, locale + '-owner-switch', width)
        wait_js('Boolean((' + button_expression(save) + ') && !(' + button_expression(save) + ').disabled)')
        fill_input('textarea', 'Private unsent owner draft.')
        js('window.__pulseFixture.switchOwner()')
        wait_js('document.querySelectorAll("[data-pulse-feedback]").length===0')
        assert len(capture(locale + '-owner-switch-retires-draft')['writes']) == 0
        open_case('surface=page&scheduled&lang=' + locale, locale + '-scheduled', width)
        wait_js('document.querySelectorAll("[data-pulse-feedback]").length===1')
        before_id = js('document.querySelector("[data-pulse-feedback]").getAttribute("data-pulse-feedback")')
        js('window.__pulseFixture.reconnect()')
        time.sleep(.3)
        assert js('document.querySelectorAll("[data-pulse-feedback]").length') == 1
        assert js('document.querySelector("[data-pulse-feedback]").getAttribute("data-pulse-feedback")') == before_id
        assert len(capture(locale + '-scheduled-reconnect-one-card')['writes']) == 0
    status = 'passed-fixture-only'
except BaseException:
    status = 'failed'
    raise
finally:
    record = {'status': status, 'driver': 'browser-harness', 'browser': cdp('Browser.getVersion'), 'name': os.environ.get('BU_NAME'), 'endpoint': os.environ.get('BU_CDP_URL'), 'artifactRoot': str(artifact), 'artifactManifestSha256': hashlib.sha256(manifest).hexdigest(), 'syntheticAuthAndTransport': True, 'actualSqlAndSchedulerEvidence': 'separate E01/E02 receipts', 'steps': steps}
    (out / 'manual-receipt.json').write_text(json.dumps(record, indent=2) + '\n')
