# Deeper hub crawl: rail -> modules; per module BFS over sub-nav + same-prefix links (UUID pages collapsed to 2 per pattern);
# then per route click visible buttons to capture overlays (dialogs/menus) and button-driven navigation.
# Writes hub2/<slug>.json (+png) per view and hub2/tree.json. Run: BU_CDP_URL=... browser-harness < hubcap3.py
import json, time, base64, os, re, subprocess, http.cookiejar
HERE = os.path.expanduser("~/Documents/CODE/MINION/.local/figcraft/work")
BASE = os.environ.get("HUB_BASE", "http://127.0.0.1:5199"); USER = os.environ.get("HUB_USER", "tenancy.user.owner@qa.minion.test"); PASS = os.environ["HUB_PASS"]
W, H = 1440, 1000
OUT = os.path.join(HERE, os.environ.get("HUB_OUT", "hub2")); os.makedirs(OUT, exist_ok=True)
extract = open(os.path.join(HERE, "extract.js")).read()
MAX_VIEWS_PER_MODULE = int(os.environ.get("MAXV", "30")); MAX_PER_PATTERN = 2; MAX_BUTTONS = int(os.environ.get("MAXB", "10"))
ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))

LINKS_JS = """JSON.stringify([...document.querySelectorAll('a[href^="/en/"]')].map(a=>{const r=a.getBoundingClientRect();const nav=a.closest('nav,aside,header');
 return {href:a.getAttribute('href').split(/[?#]/)[0], text:(a.innerText||a.getAttribute('aria-label')||a.title||'').trim().split('\\n')[0].slice(0,40),
 x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height), rail: !!(nav && /sidebar-nav|surface-1/.test(nav.className||'')), inNav: !!nav}}).filter(l=>l.w>0&&l.h>0))"""
BUTTONS_JS = """JSON.stringify([...document.querySelectorAll('button,[role=button],[role=tab],summary')].filter(b=>!b.closest('nav.sidebar-nav,aside.surface-1,[role=dialog],[role=menu]')&&!b.disabled).map(b=>{const r=b.getBoundingClientRect();
 return {text:(b.innerText||b.getAttribute('aria-label')||b.title||'').trim().split('\\n')[0].slice(0,40), x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height)}})
 .filter(b=>b.w>8&&b.h>8&&b.x>=0&&b.y>=0&&b.x+b.w<=innerWidth&&b.y+b.h<=innerHeight))"""
OVERLAY_JS = "document.querySelectorAll('[role=dialog],[role=menu],[role=listbox],[role=alertdialog],dialog[open],[data-state=open][data-side],[data-popover],.popover,[data-floating]').length"

new_tab("about:blank")
cdp("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=1, mobile=False)
cdp("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}])
import tempfile
jf = tempfile.NamedTemporaryFile(prefix="hub-cookies-", suffix=".txt", delete=False); jar = jf.name; jf.close(); os.chmod(jar, 0o600)  # session at rest: owner-only, short-lived
subprocess.run(["curl", "-s", "-m", "60", "-o", "/dev/null", "-c", jar, "-H", "content-type: application/json", "-d", "@-", BASE + "/api/auth/password-login"], input=json.dumps({"identifier": USER, "password": PASS}), text=True)  # body via stdin: never in argv
cj = http.cookiejar.MozillaCookieJar(jar); cj.load(ignore_discard=True, ignore_expires=True)
for c in cj: cdp("Network.setCookie", name=c.name, value=c.value, url=BASE, path=c.path or "/", secure=BASE.startswith("https"))
os.remove(jar)  # the browser holds the session now; nothing stays on disk

def fresh_tab():
    """a click can freeze the renderer: abandon the tab, open a new one with the same emulation + cookies"""
    try: new_tab("about:blank")
    except Exception as e: print("new_tab failed", repr(e)[:60], flush=True); return
    cdp("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=1, mobile=False)
    cdp("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}])
    for c in cj: cdp("Network.setCookie", name=c.name, value=c.value, url=BASE, path=c.path or "/", secure=BASE.startswith("https"))

def hydrated(limit=30):
    for i in range(limit):
        time.sleep(1)
        if js("document.body.scrollHeight") > 100 and js("document.body.children.length") > 1: return True
    return False

def visit(route):
    for attempt in range(2):
        try: goto_url(BASE + route); wait_for_load(); hydrated(30); time.sleep(1.5); return js("location.pathname")
        except Exception as e: print("retry", route, repr(e)[:60], flush=True); time.sleep(3)
    return ""

SANITIZE = open(os.path.join(HERE, "sanitize.js")).read() if os.environ.get("SANITIZE") else None
KNOWN_JS = None
if SANITIZE:  # UI vocabulary from the QA captures (synthetic seed data + chrome): names in the nav/sidebar outside it are replaced too
    import glob as _glob
    known = set()
    for f in _glob.glob(os.path.join(HERE, "hub2", "*.json")):
        if f.endswith(("tree.json", "states.json", "overlays.json")) or "components" in f: continue
        try: known.update(n.get("text", "").strip() for n in json.load(open(f))["nodes"] if n.get("k") == "text" and len(n.get("text", "")) <= 60)
        except Exception: pass
    keep = [k for k in os.environ.get("SANITIZE_KEEP", "FACES SCULPTORS").split("|") if k]
    KNOWN_JS = "window.__FC_KNOWN__ = new Set(%s); window.__FC_KEEP__ = new Set(%s);" % (json.dumps(sorted(known)), json.dumps(keep))
    print("sanitize vocabulary:", len(known), "known UI strings", flush=True)
def capture(route, slug, extra=None):
    js("window.scrollTo(0,0)")
    if SANITIZE: js(KNOWN_JS); print("  sanitized", js(SANITIZE), "values", flush=True)
    d = json.loads(js(extract))
    if len(d["nodes"]) < 4: return None
    links = json.loads(js(LINKS_JS))
    d["route"] = route; d["links"] = links; d["title"] = js("document.title")
    if SANITIZE:  # prod: titles and link labels can carry names — keep only structure
        d["title"] = route
        for l in links: l["text"] = l["text"] if l["rail"] or l["inNav"] else ""
    if extra: d.update(extra)
    if SANITIZE:  # element ids / classes / image urls carry record ids too
        d["sanitized"] = True
        idrx = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b\d{6,}\b")
        for n in d["nodes"]:
            for k in ("id", "cls", "name", "alt", "src"):
                if isinstance(n.get(k), str) and not n[k].startswith("data:"): n[k] = idrx.sub("id", n[k])
    open(os.path.join(OUT, slug + ".json"), "w").write(json.dumps(d))
    shot = cdp("Page.captureScreenshot", format="png")
    open(os.path.join(OUT, slug + ".png"), "wb").write(base64.b64decode(shot["data"]))
    v = {"route": route, "slug": slug, "title": d["title"], "nodes": len(d["nodes"]), "links": [l for l in links if not l["rail"]]}
    if extra: v.update(extra)
    return v

import hashlib
def slug(r):  # sanitized (prod) captures: record ids never appear in file names
    if SANITIZE: r = re.sub(r"/([0-9a-f]{8}-[0-9a-f-]{27}|[^/]+~[a-z0-9]+|\d+)(?=/|$)", lambda m: "/id-" + hashlib.sha1(m.group(1).encode()).hexdigest()[:6], r)
    return re.sub(r"[^A-Za-z0-9_.-]", "-", r.strip("/").replace("/", "_")) or "root"
pattern = lambda r: re.sub(r"/[0-9a-f]{8}-[0-9a-f-]{27}|/[^/]+~[a-z0-9]+|/\d+", "/*", r)
visit("/en/home")
rail = [l for l in json.loads(js(LINKS_JS)) if l["rail"]]
if os.environ.get("HUB_ROUTES"):  # prod: the rail is a module switcher, seed the modules explicitly
    rail = [{"href": r, "text": r.strip("/").split("/")[-1].title(), "rail": True, "inNav": True, "x": 0, "y": 0, "w": 0, "h": 0} for r in os.environ["HUB_ROUTES"].split(",") if r]
rail_routes = {l["href"] for l in rail}
print("rail:", [(l["href"], l["text"]) for l in rail], flush=True)
modules = {}
for l in rail:
    seg = l["href"].split("/")[2] if len(l["href"].split("/")) > 2 else "home"
    modules.setdefault(seg, {"key": seg, "label": l["text"] or seg, "entries": []})["entries"].append(l["href"])
tree = []; seen = set(); per_pattern = {}; seen_triggers = set()  # overlay trigger texts already captured anywhere (app-shell buttons repeat on every route)
def enqueue(queue, seg, links):
    for l in links:
        h = l["href"]
        if h in seen or h in rail_routes or h in queue: continue
        if h.startswith("/en/" + seg + "/") or (l["inNav"] and not l["rail"]):
            p = pattern(h)
            if p != h and per_pattern.get(p, 0) >= MAX_PER_PATTERN: continue
            per_pattern[p] = per_pattern.get(p, 0) + 1 if p != h else 0
            queue.append(h)

for seg, mod in modules.items():
    if ONLY and seg not in ONLY: continue
    views = []
    queue = list(mod["entries"])
    while queue and len(views) < MAX_VIEWS_PER_MODULE:
        route = queue.pop(0)
        if route in seen: continue
        seen.add(route)
        cached = os.path.join(OUT, slug(route) + ".json")
        if os.path.exists(cached):  # resume
            d = json.load(open(cached)); v = {"route": route, "slug": slug(route), "title": d.get("title"), "nodes": len(d["nodes"]), "links": [l for l in d.get("links", []) if not l["rail"]]}
            views.append(v); print("cached", mod["label"], route, flush=True); enqueue(queue, seg, v["links"]); continue
        try:
            url = visit(route)
            if not url or "/login" in url: print("skip (redirect)", route, url, flush=True); continue
            v = capture(route, slug(route))
        except Exception as e:  # a page that wedges the renderer/IPC must not end the run
            print("skip (error)", route, repr(e)[:60], flush=True); fresh_tab(); continue
        if not v: print("thin/skip", route, flush=True); continue
        views.append(v); print("ok", mod["label"], route, v["nodes"], flush=True)
        enqueue(queue, seg, v["links"])
    # overlays: click buttons on each route view
    if MAX_BUTTONS:
        for v in list(views):
            if v.get("overlayOf"): continue
            if re.search(r"/settings/appearance|/account|/settings/notifications", v["route"]):  # buttons here persist user preferences (theme/locale/mascot)
                print("  overlays skipped (preference page)", v["route"], flush=True); continue
            ovf = os.path.join(OUT, v["slug"] + ".overlays.json")
            if os.path.exists(ovf):
                cached_ov = json.load(open(ovf)); views.extend(cached_ov); seen_triggers.update(o["trigger"]["text"] for o in cached_ov); print("cached overlays", v["route"], flush=True); continue
            found = []; failures = 0
            if not visit(v["route"]): continue
            try: buttons = json.loads(js(BUTTONS_JS))
            except Exception as e: print("  buttons failed", repr(e)[:60], flush=True); json.dump([], open(ovf, "w")); continue
            tried = set()
            for b in buttons:
              try:
                  if len(found) >= MAX_BUTTONS: break
                  key = (b["text"], b["x"], b["y"])
                  if key in tried or not b["text"] or b["text"] in seen_triggers: continue
                  tried.add(key)
                  before = js(OVERLAY_JS)
                  try: click_at_xy(b["x"] + b["w"] / 2, b["y"] + b["h"] / 2)
                  except Exception as e: print("click err", repr(e)[:60]); continue
                  time.sleep(1.2)
                  path = js("location.pathname")
                  if path != v["route"]:
                      v["links"].append({"href": path, "text": b["text"], "x": b["x"], "y": b["y"], "w": b["w"], "h": b["h"], "rail": False, "inNav": False, "button": True})
                      print("  button nav", b["text"], "->", path, flush=True)
                      if path.startswith("/en/" + seg + "/") and path not in seen and path not in queue: queue.append(path)
                      visit(v["route"]); continue
                  if js(OVERLAY_JS) > before:
                      s = "%s__%02d" % (v["slug"], len(found) + 1)
                      ov = capture(v["route"], s, {"overlayOf": v["route"], "trigger": {"text": b["text"], "x": b["x"], "y": b["y"], "w": b["w"], "h": b["h"]}})
                      if ov: found.append(ov); seen_triggers.add(b["text"]); print("  overlay", b["text"], ov["nodes"], flush=True)
                      cdp("Input.dispatchKeyEvent", type="keyDown", key="Escape", code="Escape", windowsVirtualKeyCode=27); cdp("Input.dispatchKeyEvent", type="keyUp", key="Escape", code="Escape", windowsVirtualKeyCode=27)
                      time.sleep(0.6)
                      if js(OVERLAY_JS) > before: visit(v["route"])
              except Exception as e:
                failures += 1; print("  overlay pass error", b.get("text", "")[:20], repr(e)[:50], flush=True)
                fresh_tab()
                if failures >= 2 or not visit(v["route"]): print("  giving up overlays for", v["route"], flush=True); break
            json.dump(found, open(ovf, "w")); views.extend(found)
            # fold in the routes button-navigation discovered (bounded by the module cap)
            while queue and len([x for x in views if not x.get("overlayOf")]) < MAX_VIEWS_PER_MODULE:
                route = queue.pop(0)
                if route in seen: continue
                seen.add(route)
                if not visit(route): continue
                nv = capture(route, slug(route))
                if nv: views.append(nv); print("ok", mod["label"], route, nv["nodes"], flush=True); enqueue(queue, seg, nv["links"])
        # persist the links we appended (button navs) for the build step
        for v in views:
            if v.get("overlayOf"): continue
            f = os.path.join(OUT, v["slug"] + ".json"); d = json.load(open(f)); d["links"] = v["links"] + [l for l in d.get("links", []) if l["rail"]]; json.dump(d, open(f, "w"))
    if views: tree.append({"key": seg, "label": mod["label"], "views": views})
    json.dump(tree, open(os.path.join(OUT, "tree.json"), "w"), indent=1)
print("done:", [(m["label"], len(m["views"])) for m in tree], flush=True)
