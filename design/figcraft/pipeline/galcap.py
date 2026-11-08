# Capture the scratch /en/dev-gallery route (component samples in <section id="cmp-*">) -> hub2/components.json
import json, time, base64, os, subprocess, http.cookiejar
HERE = os.path.expanduser("~/Documents/CODE/MINION/.local/figcraft/work")
BASE = "http://127.0.0.1:5199"; USER = os.environ.get("HUB_USER", "tenancy.user.owner@qa.minion.test"); PASS = os.environ["HUB_PASS"]
extract = open(os.path.join(HERE, "extract.js")).read()
new_tab("about:blank")
cdp("Emulation.setDeviceMetricsOverride", width=1440, height=1000, deviceScaleFactor=1, mobile=False)
cdp("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}])
import tempfile
jf = tempfile.NamedTemporaryFile(prefix="hub-cookies-", suffix=".txt", delete=False); jar = jf.name; jf.close(); os.chmod(jar, 0o600)  # owner-only, removed right after use
subprocess.run(["curl", "-s", "-m", "60", "-o", "/dev/null", "-c", jar, "-H", "content-type: application/json", "-d", "@-", BASE + "/api/auth/password-login"], input=json.dumps({"identifier": USER, "password": PASS}), text=True)  # body via stdin: never in argv
cj = http.cookiejar.MozillaCookieJar(jar); cj.load(ignore_discard=True, ignore_expires=True)
for c in cj: cdp("Network.setCookie", name=c.name, value=c.value, url=BASE, path=c.path or "/")
os.remove(jar)
goto_url(BASE + "/en/dev-gallery"); wait_for_load()
for i in range(40):
    time.sleep(1)
    if js("document.querySelectorAll('section[id^=cmp-]').length") > 5: break
time.sleep(2)
# the app shell scrolls in an inner container: unlock every ancestor so the page lays out at full height
js("""(()=>{let el=document.querySelector('section[id^=cmp-]');while(el){el.style.overflow='visible';el.style.height='auto';el.style.maxHeight='none';el=el.parentElement;}})()""")
time.sleep(1)
h = js("document.documentElement.scrollHeight")
cdp("Emulation.setDeviceMetricsOverride", width=1440, height=int(h), deviceScaleFactor=1, mobile=False)
time.sleep(1.5)
d = json.loads(js(extract))
tree = json.loads(js(open(os.path.join(HERE, "extract-tree.js")).read()))
open(os.path.join(HERE, "hub2", "components-tree.json"), "w").write(json.dumps(tree)); print("tree sections:", len(tree["sections"]))
secs = sorted({n["sec"] for n in d["nodes"] if n["sec"].startswith("cmp-")})
print("gallery", d["w"], d["h"], len(d["nodes"]), "sections:", len(secs), secs[:6])
open(os.path.join(HERE, "hub2", "components.json"), "w").write(json.dumps(d))
shot = cdp("Page.captureScreenshot", format="png")
open(os.path.join(HERE, "hub2", "components.png"), "wb").write(base64.b64decode(shot["data"]))
