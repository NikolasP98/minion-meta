"""hub2/tree.json -> one FigCraft page per module, one frame per view (named "<module> / <view>", route + nav-link hit areas in pluginData for prototyping)."""
import sys, os, json, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
from fcbuild import build, HERE
from fctree import build_tree

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "minion-hub.figcraft")
HUB = os.path.join(HERE, "hub2")
tree = json.load(open(os.path.join(HUB, "tree.json")))
# a view belongs to the module of its first path segment, whatever module's crawl discovered it
def regroup(tree):
    mods = {m["key"]: {"key": m["key"], "label": m["label"], "views": []} for m in tree}; order = [m["key"] for m in tree]
    for m in tree:
        for v in m["views"]:
            seg = (v.get("overlayOf") or v["route"]).split("/")[2] if len(v["route"].split("/")) > 2 else "home"
            if seg not in mods: mods[seg] = {"key": seg, "label": seg.replace("-", " ").title(), "views": []}; order.append(seg)
            if v["route"] not in {w["route"] for w in mods[seg]["views"] if not w.get("overlayOf")} or v.get("overlayOf"): mods[seg]["views"].append(v)
    return [mods[k] for k in order if mods[k]["views"]]
tree = regroup(tree)
ATTACH = os.environ.get("FC_ATTACH")
m = MCP(["figcraft-cli", "mcp", "--attach", ATTACH] if ATTACH else ["figcraft-cli", "mcp", "--automation-write-root", HERE])
if ATTACH and os.environ.get("FC_DOC"): m.tool("run_command", command="doc.switch", params={"index": int(os.environ["FC_DOC"])})
if ATTACH:  # rebuild in place: wipe every page but the first
    for p in json.loads(m.tool("run_command", command="page.list", params={}))[1:]:
        m.tool("run_command", command="page.delete", params={"id": p["id"]})
    m.tool("run_command", command="page.select", params={"index": 0})
    ids = [c["id"] for c in json.loads(m.tool("inspect_document", depth=1, fields=[]))["pages"][0].get("children", [])]
    if ids: m.tool("run_command", command="edit.delete", params={"ids": ids})

GAP = 200
first = True
for mod in tree:
    name = mod["label"]
    if first:
        pid = json.loads(m.tool("run_command", command="page.list", params={}))[0]["id"]
        m.tool("run_command", command="page.rename", params={"id": pid, "name": name}); first = False
    else:
        pid = json.loads(m.tool("run_command", command="page.add", params={"name": name}))["id"]
    m.tool("run_command", command="page.select", params={"id": pid})
    x = 0
    for v in mod["views"]:
        d = json.load(open(os.path.join(HUB, v["slug"] + ".json")))
        title = (d.get("title") or v["route"]).replace(" | MINION hub", "").replace("MINION hub", "").strip(" -|·") or v["route"]
        frame = "%s / %s" % (name, v["route"].replace("/en/", "", 1) or "home")
        if d.get("overlayOf"): frame += " \u25b8 " + (d["trigger"]["text"] or "overlay")
        print("building", frame, len(d["nodes"]), flush=True)
        root = build(m, d, x, 0, frame)
        nav = [{"href": l["href"], "text": l["text"], "x": l["x"], "y": l["y"], "w": l["w"], "h": l["h"], "rail": l["rail"]} for l in d.get("links", [])]
        pd = {"route": v["route"], "title": title, "navLinks": json.dumps(nav)}
        if d.get("overlayOf"): pd["overlayOf"] = d["overlayOf"]; pd["trigger"] = json.dumps(d["trigger"])
        m.tool("set_properties", ids=[root], props={"pluginData": pd})
        x += d["w"] + GAP
    # row 2: per-screen states (error / loading / empty / nav-toggled) captured by statecap.py
    states = [v for v in (json.load(open(os.path.join(HUB, "states.json"))) if os.path.exists(os.path.join(HUB, "states.json")) else []) if v["stateOf"] in {w["route"] for w in mod["views"]}]
    x = 0
    for v in states:
        d = json.load(open(os.path.join(HUB, v["slug"] + ".json")))
        frame = "%s / %s · %s" % (name, v["stateOf"].replace("/en/", "", 1) or "home", v["state"])
        print("building", frame, len(d["nodes"]), flush=True)
        root = build(m, d, x, 1400, frame)
        pd = {"route": v["stateOf"], "state": v["state"], "title": d.get("title") or "", "navLinks": json.dumps([{"href": l["href"], "text": l["text"], "x": l["x"], "y": l["y"], "w": l["w"], "h": l["h"], "rail": l["rail"]} for l in d.get("links", [])])}
        if d.get("trigger"): pd["trigger"] = json.dumps(d["trigger"]); pd["overlayOf"] = v["stateOf"]
        m.tool("set_properties", ids=[root], props={"pluginData": pd})
        x += d["w"] + GAP
    # row 3: FACES production screens (data-full previews) captured by faces-cap.sh
    FACES = os.path.join(HERE, "hub2-faces")
    ftree = json.load(open(os.path.join(FACES, "tree.json"))) if os.path.exists(os.path.join(FACES, "tree.json")) else []
    fmod = next((fm for fm in ftree if fm["key"] == mod["key"]), None)
    x = 0
    for v in (fmod["views"] if fmod else []):
        d = json.load(open(os.path.join(FACES, v["slug"] + ".json")))
        import re as _re
        # keep only /en/<module>/<segment> parts that also exist in the QA route set; anything else is a record id
        qa_segs = {s for m2 in tree for w in m2["views"] for s in w["route"].split("/")[2:] if s and not _re.fullmatch(r"[0-9a-f-]{36}|[^/]+~[a-z0-9]+|\d+", s)}
        parts = v["route"].split("/"); anon = "/".join(parts[:3] + [s if s in qa_segs else "<id>" for s in parts[3:]])
        frame = "%s / %s · FACES" % (name, anon.replace("/en/", "", 1) or "home")
        print("building", frame, len(d["nodes"]), flush=True)
        root = build(m, d, x, 2800, frame)
        m.tool("set_properties", ids=[root], props={"pluginData": {"route": anon, "state": "faces-prod", "title": "", "navLinks": "[]"}})
        x += d["w"] + GAP
m.tool("run_command", command="page.select", params={"index": 0})
print(m.tool("save_file", path=OUT))

# ── Components page: every gallery section becomes its own top-level frame ──
comp_path = os.path.join(HUB, "components.json")
if os.path.exists(comp_path):
    g = json.load(open(comp_path))
    tree_path = os.path.join(HUB, "components-tree.json")
    trees = {t["id"]: t for t in json.load(open(tree_path))["sections"]} if os.path.exists(tree_path) else {}
    secs = []
    for n in g["nodes"]:
        if n["sec"].startswith("cmp-") and n["sec"] not in secs: secs.append(n["sec"])
    bounds = {}
    for n in g["nodes"]:
        if n["sec"] in secs:
            r = n["rect"]; b = bounds.setdefault(n["sec"], [1e9, 1e9, -1e9, -1e9]); b[0] = min(b[0], r["x"]); b[1] = min(b[1], r["y"]); b[2] = max(b[2], r["x"] + r["w"]); b[3] = max(b[3], r["y"] + r["h"])
    moved = 0
    for n in g["nodes"]:
        if n["sec"].startswith("cmp-"): continue
        r = n["rect"]; best = None; bo = 0
        for sname, b in bounds.items():
            ov = max(0, min(r["x"] + r["w"], b[2]) - max(r["x"], b[0])) * max(0, min(r["y"] + r["h"], b[3]) - max(r["y"], b[1]))
            if ov > bo: bo, best = ov, sname
        if best and bo > 0.5 * r["w"] * r["h"]: n["sec"] = best; moved += 1
    print("portaled nodes re-homed:", moved, flush=True)
    pid = json.loads(m.tool("run_command", command="page.add", params={"name": "Components"}))["id"]
    m.tool("run_command", command="page.select", params={"id": pid})
    x = y = 0; row_h = 0; PER_ROW = 3; GAPC = 120
    for i, sec in enumerate(secs):
        nodes = [n for n in g["nodes"] if n["sec"] == sec]
        x0 = min(n["rect"]["x"] for n in nodes); y0 = min(n["rect"]["y"] for n in nodes)
        x1 = max(n["rect"]["x"] + n["rect"]["w"] for n in nodes); y1 = max(n["rect"]["y"] + n["rect"]["h"] for n in nodes)
        sub = {"w": x1 - x0, "h": y1 - y0, "pageBg": g["pageBg"], "nodes": []}
        for n in nodes:
            c = dict(n); c["rect"] = {"x": n["rect"]["x"] - x0, "y": n["rect"]["y"] - y0, "w": n["rect"]["w"], "h": n["rect"]["h"]}
            if n["k"] == "text": c["firstLeft"] = n["firstLeft"] - x0
            sub["nodes"].append(c)
        name = "Component / " + sec[4:].replace("-", " / ", 1)
        if i and i % PER_ROW == 0: x = 0; y += row_h + GAPC; row_h = 0
        print("building", name, len(nodes), "tree" if sec in trees else "flat", flush=True)
        if sec in trees:
            try: root = build_tree(m, trees[sec], x, y, name)
            except Exception as e: print("  tree build failed, falling back:", str(e)[:100]); root = build(m, sub, x, y, name)
        else: root = build(m, sub, x, y, name)
        m.tool("set_properties", ids=[root], props={"pluginData": {"component": sec[4:].split("-")[0], "state": sec[4:].split("-", 1)[-1]}})
        x += sub["w"] + GAPC; row_h = max(row_h, sub["h"])
    m.tool("run_command", command="page.select", params={"index": 0})
    print(m.tool("save_file", path=OUT))
