"""Foundations page from the "Hub tokens" collection: colour swatches (fill bound), spacing bars (width bound), radius tiles (cornerRadius bound),
control/icon sizes, type specimens -> text styles, shadow tokens -> effect styles. Usage: python3 foundations.py <file.figcraft> (FC_ATTACH=port: open doc)"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
ATTACH = os.environ.get("FC_ATTACH"); F = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else None
m = MCP(["figcraft-cli", "mcp", "--attach", ATTACH] if ATTACH else ["figcraft-cli", "mcp", "--automation-write-root", os.path.dirname(F), "--automation-read-root", os.path.dirname(F)])
if not ATTACH: m.tool("open_file", path=F)
V = json.loads(m.tool("run_command", command="variable.list", params={}))
cols = V["collections"] if isinstance(V, dict) and "collections" in V else V
col = next(c for c in cols if c["name"] == "Hub tokens")
vars_ = [v for v in V["variables"] if v["collection"] == col["id"]]
default_mode = col["modes"][0]["id"]
byid = {v["id"]: v for v in vars_}
def val(v, depth=0):
    x = (v.get("values") or {}).get(default_mode)
    if not x: return None
    if x["type"] == "alias": return val(byid[x["value"]], depth + 1) if x["value"] in byid and depth < 8 else None
    if x["type"] == "color":
        c = x["value"]; return "#%02x%02x%02x" % (round(c["r"] * 255), round(c["g"] * 255), round(c["b"] * 255)) + ("" if c.get("a", 1) >= 0.999 else "%02x" % round(c["a"] * 255))
    return x["value"]
byname = {v["name"]: v for v in vars_}
print("variables:", len(vars_), "modes:", len(col["modes"]), flush=True)

# page
pages = json.loads(m.tool("run_command", command="page.list", params={}))
old = [p for p in pages if p["name"] == "Foundations"]
if old: m.tool("run_command", command="page.delete", params={"id": old[0]["id"]})
pid = json.loads(m.tool("run_command", command="page.add", params={"name": "Foundations"}))["id"]
m.tool("run_command", command="page.select", params={"id": pid})
BG, FG, MUTED, FONT = "#09090b", "#fafafa", "#a8a8a9", "Inter"
def frame(name, parent=None, x=0, y=0, layout="vertical", gap=16, padding=0, props=None, wrap=False):
    p = {"fill": "none", "layout": layout, "gap": gap, "padding": padding, "sizingH": "hug", "sizingV": "hug", "clip": False}
    if wrap: p["wrap"] = True; p["crossGap"] = gap
    if props: p.update(props)
    params = {"type": "frame", "name": name, "x": x, "y": y, "width": 10, "height": 10, "props": p, "select": False}
    if parent: params["parent"] = parent
    return json.loads(m.tool("batch", commands=[{"command": "node.create", "params": params}]))[0]["id"]
def text(parent, s, size=12, color=FG, style="Regular", family=FONT, extra=None):
    p = {"fill": color, "fontFamily": family, "fontStyle": style, "fontSize": size, "textAutoResize": "widthAndHeight"}
    if extra: p.update(extra)
    return {"command": "node.create", "params": {"type": "text", "parent": parent, "x": 0, "y": 0, "text": s, "name": s[:40], "props": p, "select": False}}
def rect(parent, w, h, fill="#333333", name="swatch", extra=None):
    p = {"fill": fill}; p.update(extra or {})
    return {"command": "node.create", "params": {"type": "rectangle", "parent": parent, "x": 0, "y": 0, "width": w, "height": h, "name": name, "props": p, "select": False}}
def run(cmds):  # batch with onError wraps each step as {ok, result|error}
    out = []
    for r in json.loads(m.tool("batch", commands=cmds, onError="continue")):
        if r.get("ok") is False: print("  step failed:", str(r.get("error"))[:120], flush=True); out.append(None)
        else: out.append((r.get("result") or r).get("id"))
    return out
def okcount(res): return len([r for r in res if r.get("ok") is not False])

root = frame("Foundations", layout="vertical", gap=64, padding=64, props={"fill": BG})
m.tool("batch", commands=[text(root, "MINION hub · Foundations", 28, FG, "SemiBold"), text(root, "Generated from packages/design-tokens/tokens.css · collection \"Hub tokens\" · %d modes (themes)" % len(col["modes"]), 12, MUTED)])

# ── colours by group ──
colors = [v for v in vars_ if v["name"].startswith("color/")]
groups = {}
SEM = [("surfaces", r"^color-(canvas|surface|overlay|bg\d?$|bg$|background)"), ("text", r"^color-(text|foreground|fg|on-)"), ("borders", r"^color-(border|hairline|divider)"), ("accent & brand", r"^color-(accent|brand|primary)"),
       ("status", r"^color-(success|warning|info|danger|error|status)"), ("muted", r"^color-(muted|neutral)"), ("decorative", r"^color-(purple|pink|cyan|emerald|lime|orange|violet|teal)"), ("card", r"^color-card"), ("board", r"^color-board"), ("destructive", r"^color-destructive")]
for v in colors:
    n = v["name"].split("/")[1]
    groups.setdefault(next((g for g, rx in SEM if re.search(rx, n)), "other"), []).append(v)
sec = frame("Colors", root, gap=32)
m.tool("batch", commands=[text(sec, "Colors", 18, FG, "SemiBold")])
binds = []
for g, vs in sorted(groups.items(), key=lambda x: [s for s, _ in SEM].index(x[0]) if x[0] in [s for s, _ in SEM] else 99):
    gf = frame("color/" + g, sec, gap=12)
    m.tool("batch", commands=[text(gf, g, 12, MUTED, "Medium", extra={"textCase": "upper", "letterSpacing": "4%"})])
    row = frame("swatches", gf, layout="horizontal", gap=12, wrap=True, props={"maxWidth": 1600})
    for v in vs:
        item = frame(v["name"], row, gap=6)
        ids = run([rect(item, 160, 88, "#333333", "swatch", {"cornerRadius": 6, "stroke": "rgba(255,255,255,0.08)", "strokeWeight": 1}), text(item, v["name"].split("/")[1], 11, FG, "Medium"), text(item, str(val(v))[:34], 10, MUTED, "Regular", "JetBrains Mono")])
        if ids[0]: binds.append({"command": "variable.bind", "params": {"ids": [ids[0]], "field": "fill", "variable": v["name"]}})
res = json.loads(m.tool("batch", commands=binds, onError="continue")) if binds else []; print("colour swatches bound:", okcount(res), "/", len(binds), flush=True)

# ── spacing ──
sp = sorted([v for v in vars_ if v["name"].startswith("spacing/")], key=lambda v: (val(v) or 0))
sec = frame("Spacing", root, gap=12); m.tool("batch", commands=[text(sec, "Spacing", 18, FG, "SemiBold")])
binds = []
for v in sp:
    rowf = frame(v["name"], sec, layout="horizontal", gap=16, props={"crossAlign": "center"})
    ids = run([text(rowf, v["name"].split("/")[1], 11, FG, "Medium", extra={"textAutoResize": "height", "width": 180}), rect(rowf, max(1, val(v) or 1), 16, "#3b82f6", "bar"), text(rowf, "%spx" % val(v), 10, MUTED, "Regular", "JetBrains Mono")])
    if ids[1]: binds.append({"command": "variable.bind", "params": {"ids": [ids[1]], "field": "width", "variable": v["name"]}})
res = json.loads(m.tool("batch", commands=binds, onError="continue")) if binds else []; print("spacing bound:", okcount(res), "/", len(binds), flush=True)

# ── radius + control + icon sizes ──
for title, prefix, mk, field in [("Radius", "radius/", lambda v: rect(None, 80, 80, "#18181b", "tile", {"cornerRadius": min(40, val(v) or 0), "stroke": "rgba(255,255,255,0.16)", "strokeWeight": 1}), "cornerRadius"),
                                 ("Control heights", "sizing/control-", lambda v: rect(None, 160, val(v) or 24, "#27272a", "control", {"cornerRadius": 6}), "height"),
                                 ("Icon sizes", "sizing/icon-", lambda v: rect(None, val(v) or 12, val(v) or 12, "#a8a8a9", "icon"), "width")]:
    vs = sorted([v for v in vars_ if v["name"].startswith(prefix)], key=lambda v: (val(v) or 0))
    if not vs: continue
    sec = frame(title, root, gap=12); m.tool("batch", commands=[text(sec, title, 18, FG, "SemiBold")])
    row = frame("items", sec, layout="horizontal", gap=24, wrap=True, props={"crossAlign": "max"})
    binds = []
    for v in vs:
        item = frame(v["name"], row, gap=6, props={"crossAlign": "center"})
        c = mk(v); c["params"]["parent"] = item
        ids = run([c, text(item, v["name"].split("/")[1], 11, FG, "Medium"), text(item, "%spx" % val(v), 10, MUTED, "Regular", "JetBrains Mono")])
        if ids[0] and (val(v) or 0) <= 40 or field != "cornerRadius":
            if ids[0]: binds.append({"command": "variable.bind", "params": {"ids": [ids[0]], "field": field, "variable": v["name"]}})
    res = json.loads(m.tool("batch", commands=binds, onError="continue")) if binds else []; print(title, "bound:", okcount(res), "/", len(binds), flush=True)

# ── typography: specimens -> text styles ──
LH = {"display": "display", "page-title": "heading", "section-title": "heading", "body": "body", "label": "compact", "caption": "compact", "mono": "mono", "telemetry": "compact"}
WT = {"display": "SemiBold", "page-title": "SemiBold", "section-title": "Medium", "body": "Regular", "label": "Medium", "caption": "Regular", "mono": "Regular", "telemetry": "Regular"}
sec = frame("Typography", root, gap=20); m.tool("batch", commands=[text(sec, "Typography", 18, FG, "SemiBold")])
styles = []
for name, lh in LH.items():
    fs = byname.get("typography/font-size-" + name); lhv = byname.get("typography/line-height-" + lh)
    if not fs: continue
    fam = "JetBrains Mono" if name in ("mono", "telemetry") else FONT
    rowf = frame("type/" + name, sec, layout="horizontal", gap=24, props={"crossAlign": "baseline"})
    ids = run([text(rowf, name, 11, MUTED, "Medium", extra={"textAutoResize": "height", "width": 140}),
               text(rowf, "The quick brown fox jumps over the lazy dog 0123456789", val(fs) or 14, FG, WT[name], fam, {"lineHeight": val(lhv) if lhv else "auto", "letterSpacing": "4%" if name == "label" else ("-1%" if name == "display" else 0)}),
               text(rowf, "%s / %spx · lh %spx · %s" % (fam, val(fs), val(lhv) if lhv else "auto", WT[name]), 10, MUTED, "Regular", "JetBrains Mono")])
    if ids[1]:
        try:
            m.tool("run_command", command="variable.bind", params={"ids": [ids[1]], "field": "fontSize", "variable": fs["name"]})
            if lhv: m.tool("run_command", command="variable.bind", params={"ids": [ids[1]], "field": "lineHeight", "variable": lhv["name"]})
        except Exception as e: print("bind type:", str(e)[:80])
        try: m.tool("run_command", command="style.create", params={"type": "text", "name": "Hub/" + name, "from": ids[1]}); styles.append(name)
        except Exception as e: print("style:", str(e)[:100])
print("text styles:", styles, flush=True)

# ── shadows -> effect styles ──
def parse_shadow(s):
    out = []
    for part in re.split(r",(?![^()]*\))", s):
        mm = re.match(r"\s*(inset\s+)?(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?(?:\s+(-?[\d.]+)(?:px)?)?\s+(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})", part.strip())
        if mm: out.append({"type": "innerShadow" if mm.group(1) else "dropShadow", "offset": [float(mm.group(2)), float(mm.group(3))], "radius": float(mm.group(4)), "spread": float(mm.group(5) or 0), "color": mm.group(6)})
    return out
sh = [v for v in vars_ if v["name"].startswith("effects/shadow-")]
sec = frame("Shadows", root, gap=12); m.tool("batch", commands=[text(sec, "Shadows", 18, FG, "SemiBold")])
row = frame("items", sec, layout="horizontal", gap=32, wrap=True, props={"maxWidth": 1600, "padding": 24})
estyles = []
for v in sh:
    effs = parse_shadow(str(val(v)))
    if not effs: continue
    item = frame(v["name"], row, gap=8, props={"crossAlign": "center"})
    ids = run([rect(item, 160, 100, "#18181b", "card", {"cornerRadius": 8}), text(item, v["name"].split("/")[1], 11, FG, "Medium"), text(item, str(val(v))[:40], 10, MUTED, "Regular", "JetBrains Mono")])
    for e in effs:
        try: m.tool("run_command", command="effect.add", params={"ids": [ids[0]], "effect": e})
        except Exception as ex: print("effect:", str(ex)[:100])
    try: m.tool("run_command", command="style.create", params={"type": "effect", "name": "Hub/" + v["name"].split("/")[1], "from": ids[0]}); estyles.append(v["name"])
    except Exception as ex: print("estyle:", str(ex)[:100])
print("effect styles:", len(estyles), flush=True)
m.tool("run_command", command="page.select", params={"index": 0})
if not ATTACH: print(m.tool("save_file", path=F))
