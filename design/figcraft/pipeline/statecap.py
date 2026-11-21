# Per-screen states for module root routes: error (API + data requests fail), loading (requests never answer), empty (API list payloads emptied),
# plus side-nav expanded/collapsed on /en/home. Writes hub2/<slug>__state-<state>.json/png and hub2/states.json. Run after hubcap3 (shares the browser).
import json, time, base64, os, re, subprocess, http.cookiejar
HERE = os.path.expanduser("~/Documents/CODE/MINION/.local/figcraft/work")
BASE = "http://127.0.0.1:5199"; USER = os.environ.get("HUB_USER", "tenancy.user.owner@qa.minion.test"); PASS = os.environ["HUB_PASS"]
W, H = 1440, 1000
OUT = os.path.join(HERE, "hub2")
extract = open(os.path.join(HERE, "extract.js")).read()
tree = json.load(open(os.path.join(OUT, "tree.json")))
LINKS_JS = open(os.path.join(HERE, "hubcap3.py")).read().split('LINKS_JS = """')[1].split('"""')[0]
new_tab("about:blank")
cdp("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=1, mobile=False)
cdp("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}])
import tempfile
jf = tempfile.NamedTemporaryFile(prefix="hub-cookies-", suffix=".txt", delete=False); jar = jf.name; jf.close(); os.chmod(jar, 0o600)  # owner-only, removed right after use
subprocess.run(["curl", "-s", "-m", "60", "-o", "/dev/null", "-c", jar, "-H", "content-type: application/json", "-d", "@-", BASE + "/api/auth/password-login"], input=json.dumps({"identifier": USER, "password": PASS}), text=True)  # body via stdin: never in argv
cj = http.cookiejar.MozillaCookieJar(jar); cj.load(ignore_discard=True, ignore_expires=True)
for c in cj: cdp("Network.setCookie", name=c.name, value=c.value, url=BASE, path=c.path or "/")
os.remove(jar)

def settle(limit=20):
    for i in range(limit):
        time.sleep(1)
        if js("document.body.scrollHeight") > 100 and js("document.body.children.length") > 1: return True
    return False
def capture(route, slug, extra):
    js("window.scrollTo(0,0)")
    d = json.loads(js(extract))
    if len(d["nodes"]) < 4: return None
    d["route"] = route; d["links"] = json.loads(js(LINKS_JS)); d["title"] = js("document.title"); d.update(extra)
    open(os.path.join(OUT, slug + ".json"), "w").write(json.dumps(d))
    shot = cdp("Page.captureScreenshot", format="png"); open(os.path.join(OUT, slug + ".png"), "wb").write(base64.b64decode(shot["data"]))
    return {"route": route, "slug": slug, "title": d["title"], "nodes": len(d["nodes"]), "links": [l for l in d["links"] if not l["rail"]], **extra}

# States are produced INSIDE the page: a document-start script wraps fetch() for SvelteKit's __data.json
# (the hub loads every screen through it; there are no /api calls on these routes). Mode comes from localStorage.
HOOK = r"""(() => { const orig = window.fetch;
window.fetch = async function (input, init) {
  const mode = localStorage.getItem('__fc_state_mode'); const url = typeof input === 'string' ? input : (input && input.url) || '';
  if (!mode || !/__data\.json/.test(url)) return orig.apply(this, arguments);
  if (mode === 'loading') return new Promise(() => {});
  const res = await orig.apply(this, arguments);
  if (mode === 'error') { try { const j = await res.clone().json(); const nodes = j.nodes || []; for (let i = nodes.length - 1; i >= 0; i--) { if (nodes[i]) { nodes[i] = { type: 'error', status: 500, error: { message: 'Simulated server error' } }; break; } }
    return new Response(JSON.stringify(j), { status: 200, headers: { 'content-type': 'application/json' } }); } catch (e) { return res; } }
  if (mode === 'empty') { try { const j = await res.clone().json(); for (const n of (j.nodes || [])) if (n && Array.isArray(n.data)) n.data = n.data.map(v => Array.isArray(v) && v.length && v.every(x => Number.isInteger(x)) ? [] : v);
    return new Response(JSON.stringify(j), { status: res.status, headers: { 'content-type': 'application/json' } }); } catch (e) { return res; } }
  return res; }; })();"""
cdp("Page.enable")
cdp("Page.addScriptToEvaluateOnNewDocument", source=HOOK)
states = []
def run_state(route, slug, state):
    # shell first (Home, hook idle), then a client-side navigation to the route with the hook armed: only that screen's data is altered
    if js("location.pathname") != "/en/home": goto_url(BASE + "/en/home"); wait_for_load(); settle(15); time.sleep(1)
    js("localStorage.setItem('__fc_state_mode', %s)" % json.dumps(state))
    js("(() => { const a = document.createElement('a'); a.href = %s; document.body.appendChild(a); a.click(); a.remove(); })()" % json.dumps(route))
    for i in range(20):
        time.sleep(0.5)
        if js("location.pathname") == route: break
    time.sleep(5)
    v = capture(route, "%s__state-%s" % (slug, state), {"stateOf": route, "state": state}) if js("location.pathname") == route else None
    js("localStorage.removeItem('__fc_state_mode')")
    if v: states.append(v); print("state", state, route, v["nodes"], flush=True)
    else: print("state thin", state, route, js("location.pathname"), flush=True)

slug = lambda r: re.sub(r"[^A-Za-z0-9_.-]", "-", r.strip("/").replace("/", "_")) or "root"
targets = []
for mod in tree:
    roots = [v for v in mod["views"] if not v.get("overlayOf")]
    targets += [v["route"] for v in roots[:2]]
print("state targets:", len(targets), flush=True)
goto_url(BASE + "/en/home"); wait_for_load(); settle(20)
# normalise UI leftovers from the crawler's clicks: close TanStack devtools, collapse the sidebar
js("Object.keys(localStorage).filter(k => /tanstack|devtools/i.test(k)).forEach(k => localStorage.removeItem(k))")
goto_url(BASE + "/en/home"); wait_for_load(); settle(15); time.sleep(1)
NAV_JS = """(()=>{const b=[...document.querySelectorAll('button')].find(b=>/expand sidebar|collapse sidebar/i.test(b.getAttribute('aria-label')||b.title||''));if(!b)return null;const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,label:b.getAttribute('aria-label')||b.title}})()"""
t = js(NAV_JS); print("nav before:", t, flush=True)
if t and "ollapse" in t["label"]: click_at_xy(t["x"], t["y"]); time.sleep(1.5); print("sidebar collapsed", flush=True)
if os.environ.get("ONLY_ROUTES"): targets = os.environ["ONLY_ROUTES"].split(",")
for route in targets:
    for state in ("error", "empty"):
        if os.path.exists(os.path.join(OUT, "%s__state-%s.json" % (slug(route), state))): continue
        run_state(route, slug(route), state)
# side nav toggled on /en/home (expand, capture, collapse again so the app is left as found)
goto_url(BASE + "/en/home"); wait_for_load(); settle(); time.sleep(1)
tog = js(NAV_JS)
print("nav toggle:", tog, flush=True)
if tog:
    click_at_xy(tog["x"], tog["y"]); time.sleep(1.5)
    v = capture("/en/home", "en_home__state-nav-toggled", {"stateOf": "/en/home", "state": "nav-toggled", "trigger": {"text": tog["label"], "x": tog["x"] - 16, "y": tog["y"] - 16, "w": 32, "h": 32}})
    if v: states.append(v)
    back = js(NAV_JS)
    if back: click_at_xy(back["x"], back["y"]); time.sleep(1)
json.dump(states, open(os.path.join(OUT, "states.json"), "w"), indent=1)
print("states done:", len(states), flush=True)
