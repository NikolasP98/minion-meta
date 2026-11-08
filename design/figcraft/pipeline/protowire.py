"""Wire prototype links in the hub .figcraft: every frame's pluginData.navLinks whose href matches another frame's pluginData.route
gets a transparent hotspot child + click-navigate interaction. Usage: python3 protowire.py <in.figcraft> [<out.figcraft>]  (FC_ATTACH=port: wire the open doc in the app)"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
HERE = os.path.dirname(os.path.abspath(__file__))
ATTACH = os.environ.get("FC_ATTACH")
SRC = os.path.abspath(sys.argv[1]); OUT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else SRC
m = MCP(["figcraft-cli", "mcp", "--attach", ATTACH] if ATTACH else ["figcraft-cli", "mcp", "--automation-write-root", os.path.dirname(OUT), "--automation-read-root", os.path.dirname(SRC)])
if not ATTACH: m.tool("open_file", path=SRC)

pages = json.loads(m.tool("run_command", command="page.list", params={}))
frames = []  # {page, id, name, route, nav}
for p in pages:
    m.tool("run_command", command="page.select", params={"id": p["id"]})
    doc = json.loads(m.tool("inspect_document", depth=1, fields=["name", "pluginData"]))
    pg = next(x for x in doc["pages"] if x["id"] == p["id"])  # only the current page is expanded
    for c in pg.get("children", []):
        pd = c.get("pluginData") or {}
        if pd.get("route"):
            frames.append({"page": p["id"], "id": c["id"], "name": c["name"], "route": pd["route"], "nav": json.loads(pd.get("navLinks") or "[]"),
                           "overlayOf": pd.get("overlayOf"), "trigger": json.loads(pd["trigger"]) if pd.get("trigger") else None, "state": pd.get("state")})
by_route = {f["route"]: f for f in frames if not f["overlayOf"] and not f["state"]}
overlays = {}  # parent route -> [overlay frames]
for f in frames:
    if f["overlayOf"]: overlays.setdefault(f["overlayOf"], []).append(f)
print("frames with routes:", len(frames), flush=True)

norm = lambda h: h.split("?")[0].split("#")[0].rstrip("/") or "/"
wired = missed = 0; missing = {}
for f in frames:
    m.tool("run_command", command="page.select", params={"id": f["page"]})
    kids = json.loads(m.tool("get_node", id=f["id"], depth=1, fields=["name"])).get("children", [])
    old = [k["id"] for k in kids if k["name"].startswith("→ ")]  # hotspots from an earlier run
    if old: m.tool("run_command", command="edit.delete", params={"ids": old})
    cmds = []; targets = []
    if f["overlayOf"]:  # backdrop: anywhere not covered by another hotspot goes back to the parent view
        bid = json.loads(m.tool("batch", commands=[{"command": "node.create", "params": {"type": "rectangle", "parent": f["id"], "x": 0, "y": 0, "width": 1440, "height": 1000, "name": "→ back", "props": {"fill": "none"}, "select": False}}]))[0]["id"]
        m.tool("run_command", command="proto.interaction.add", params={"id": bid, "action": {"type": "back"}})
    for o in overlays.get(f["route"], []) if not f["overlayOf"] else []:  # trigger areas open the captured overlays
        t = o["trigger"]
        cmds.append({"command": "node.create", "params": {"type": "rectangle", "parent": f["id"], "x": t["x"], "y": t["y"], "width": max(1, t["w"]), "height": max(1, t["h"]), "name": "→ " + o["name"].split(" / ", 1)[-1], "props": {"fill": "none"}, "select": False}})
        targets.append(o["id"])
    for l in f["nav"]:
        h = norm(l["href"]); t = by_route.get(h) or by_route.get(h + "/")
        if not t: missing[h] = missing.get(h, 0) + 1; missed += 1; continue
        if t["id"] == f["id"]: continue
        cmds.append({"command": "node.create", "params": {"type": "rectangle", "parent": f["id"], "x": l["x"], "y": l["y"], "width": max(1, l["w"]), "height": max(1, l["h"]), "name": "→ " + h, "props": {"fill": "none"}, "select": False}})
        targets.append(t["id"])
    if not cmds: continue
    ids = [r["id"] for r in json.loads(m.tool("batch", commands=cmds))]
    links = [{"command": "proto.interaction.add", "params": {"id": i, "dest": t}} for i, t in zip(ids, targets)]
    r = m.tool("batch", commands=links, onError="continue")
    bad = [x for x in json.loads(r) if isinstance(x, dict) and x.get("ok") is False]
    wired += len(links) - len(bad)
    print("%-40s %3d links%s" % (f["name"][:40], len(links) - len(bad), (" (%d failed: %s)" % (len(bad), str(bad[0].get("error"))[:80])) if bad else ""), flush=True)

home = by_route.get("/en/home") or by_route.get("/en") or frames[0]
m.tool("run_command", command="page.select", params={"id": home["page"]})
try: m.tool("run_command", command="proto.flow.add", params={"start": home["id"], "name": "MINION hub"})
except Exception as e: print("flow:", str(e)[:120])
try: m.tool("run_command", command="proto.settings", params={"device": "Custom size", "width": 1440, "height": 1000})
except Exception as e: print("settings:", str(e)[:120])
m.tool("run_command", command="page.select", params={"index": 0})
print("wired", wired, "hotspots; unmatched hrefs:", missed, sorted(missing.items(), key=lambda x: -x[1])[:12])
if not ATTACH: print(m.tool("save_file", path=OUT))
