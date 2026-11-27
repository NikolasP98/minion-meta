"""Components page: every "Component / <Name> / <state>" frame -> main component named "state=<state>", then one component set per <Name>
(variants by state). Usage: python3 mkcomponents.py <file.figcraft> (FC_ATTACH=port: open doc)"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
ATTACH = os.environ.get("FC_ATTACH"); F = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else None
m = MCP(["figcraft-cli", "mcp", "--attach", ATTACH] if ATTACH else ["figcraft-cli", "mcp", "--automation-write-root", os.path.dirname(F), "--automation-read-root", os.path.dirname(F)])
if not ATTACH: m.tool("open_file", path=F)
pages = json.loads(m.tool("run_command", command="page.list", params={}))
pid = next(p["id"] for p in pages if p["name"] == "Components")
m.tool("run_command", command="page.select", params={"id": pid})
doc = json.loads(m.tool("inspect_document", depth=1, fields=["name", "type", "pluginData"]))
pg = next(x for x in doc["pages"] if x["id"] == pid)
groups = {}
for c in pg.get("children", []):
    if not c["name"].startswith("Component / "): continue
    if c.get("type", "").lower() in ("component", "componentset", "component_set"): print("already a component:", c["name"]); continue
    _, name, state = (c["name"].split(" / ") + ["default"])[:3]
    groups.setdefault(name, []).append((c["id"], state))
sets = 0
for name, items in groups.items():
    ids = []
    for cid, state in items:
        try:
            r = json.loads(m.tool("run_command", command="component.create", params={"ids": [cid]}))
            comp = r.get("id") or (r[0]["id"] if isinstance(r, list) else cid)
            m.tool("set_properties", ids=[comp], props={"name": "state=" + state})
            ids.append(comp)
        except Exception as e: print("component.create failed", name, state, str(e)[:100])
    if not ids: continue
    try:
        if len(ids) > 1:
            r = json.loads(m.tool("run_command", command="component.combineVariants", params={"ids": ids}))
            sid = r.get("id") or (r[0]["id"] if isinstance(r, list) else None)
        else:
            sid = ids[0]
        if sid: m.tool("set_properties", ids=[sid], props={"name": name, "pluginData": {"component": name, "states": ",".join(s for _, s in items)}})
        sets += 1; print("set", name, len(ids), "variants", flush=True)
    except Exception as e: print("combine failed", name, str(e)[:120])
print("component sets:", sets)
m.tool("run_command", command="page.select", params={"index": 0})
if not ATTACH: print(m.tool("save_file", path=F))
