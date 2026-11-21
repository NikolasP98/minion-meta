"""Bind layer fills/strokes to "Hub tokens" colour variables where the literal colour equals a token's default-mode value.
Usage: python3 bindvars.py <file.figcraft> [page names...] (default: Components)  FC_ATTACH=port: open doc"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
ATTACH = os.environ.get("FC_ATTACH"); F = os.path.abspath(sys.argv[1])
PAGES = sys.argv[2:] or ["Components"]
m = MCP(["figcraft-cli", "mcp", "--attach", ATTACH] if ATTACH else ["figcraft-cli", "mcp", "--automation-write-root", os.path.dirname(F), "--automation-read-root", os.path.dirname(F)])
if not ATTACH: m.tool("open_file", path=F)
V = json.loads(m.tool("run_command", command="variable.list", params={}))
col = next(c for c in V["collections"] if c["name"] == "Hub tokens"); mode = col["modes"][0]["id"]
vars_ = [v for v in V["variables"] if v["collection"] == col["id"] and v["resolvedType"] == "color"]
PRIO = ["text", "surface", "canvas", "overlay", "border", "accent", "brand", "success", "warning", "danger", "info", "status", "muted"]
def key(v):  # literal (non-alias) semantic tokens first
    n = v["name"].split("/")[1]
    return (0 if v["values"][mode]["type"] == "color" else 1, next((i for i, p in enumerate(PRIO) if n.startswith("color-" + p)), 99), len(n))
byhex = {}
def tohex(c): return "#%02x%02x%02x%02x" % (round(c["r"] * 255), round(c["g"] * 255), round(c["b"] * 255), round(c.get("a", 1) * 255))
byid = {v["id"]: v for v in V["variables"]}
def lit(v, d=0):
    x = v["values"].get(mode)
    if not x: return None
    if x["type"] == "alias": return lit(byid[x["value"]], d + 1) if d < 8 and x["value"] in byid else None
    return x["value"] if x["type"] == "color" else None
for v in sorted(vars_, key=key):
    c = lit(v)
    if c: byhex.setdefault(tohex(c), v["name"])
print("colour tokens by value:", len(byhex), flush=True)
def norm(paint):
    c = paint.get("color") if isinstance(paint, dict) else None
    if not c: return None
    if isinstance(c, dict): return tohex(c)
    s = str(c).lstrip("#"); return "#" + (s + "ff" if len(s) == 6 else s).lower()
pages = json.loads(m.tool("run_command", command="page.list", params={}))
total = 0
for p in pages:
    if p["name"] not in PAGES: continue
    m.tool("run_command", command="page.select", params={"id": p["id"]})
    doc = json.loads(m.tool("inspect_document", depth=40, fields=["fills", "strokes", "type"]))
    pg = next(x for x in doc["pages"] if x["id"] == p["id"])
    groups = {}  # (field, variable) -> ids
    def walk(n):
        for field, paints in (("fill", n.get("fills") or []), ("stroke", n.get("strokes") or [])):
            if paints and isinstance(paints, list) and (paints[0].get("type") in (None, "solid", "SOLID")) and not paints[0].get("boundVariables"):
                h = norm(paints[0]); v = byhex.get(h) if h else None
                if v: groups.setdefault((field, v), []).append(n["id"])
        for c in n.get("children", []): walk(c)
    for c in pg.get("children", []): walk(c)
    cmds = [{"command": "variable.bind", "params": {"ids": ids, "field": f, "variable": v}} for (f, v), ids in groups.items()]
    res = json.loads(m.tool("batch", commands=cmds, onError="continue")) if cmds else []
    ok = sum(len(ids) for (k, ids), r in zip(groups.items(), res) if r.get("ok") is not False)
    bad = [str(r.get("error"))[:80] for r in res if r.get("ok") is False][:2]
    print(p["name"], "bound layers:", ok, "in", len(cmds), "groups", bad, flush=True); total += ok
m.tool("run_command", command="page.select", params={"index": 0})
if not ATTACH: print(m.tool("save_file", path=F))
