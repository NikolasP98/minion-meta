"""Promote an approved proposal into the master: frames whose name exists in the master REPLACE it (same page, same position);
new frames are appended to the page of the same name (created if missing). Then the proposal file is deleted unless --keep.
Usage: python3 fc-promote.py <proposal.figcraft> <master.figcraft> [--keep]"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
PROP, MASTER = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); KEEP = "--keep" in sys.argv
m = MCP(["figcraft-cli", "mcp", "--automation-read-root", os.path.dirname(PROP) if os.path.dirname(PROP) == os.path.dirname(MASTER) else os.path.commonpath([PROP, MASTER]), "--automation-write-root", os.path.dirname(MASTER)])
m.tool("open_file", path=MASTER); mi = json.loads(m.tool("run_command", command="doc.list", params={}))[-1]["index"]
m.tool("open_file", path=PROP); pi = json.loads(m.tool("run_command", command="doc.list", params={}))[-1]["index"]
def frames(idx):
    m.tool("run_command", command="doc.switch", params={"index": idx}); out = {}
    for p in json.loads(m.tool("run_command", command="page.list", params={})):
        m.tool("run_command", command="page.select", params={"id": p["id"]})
        d = json.loads(m.tool("inspect_document", depth=1, fields=["name", "x", "y"])); pg = next(x for x in d["pages"] if x["id"] == p["id"])
        out[p["name"]] = {"id": p["id"], "frames": {c["name"]: c for c in pg.get("children", [])}}
    return out
master, prop = frames(mi), frames(pi)
replaced = added = 0
for page_name, pdata in prop.items():
    names = [n for n in pdata["frames"] if not n.startswith("→")]
    if not names: continue
    m.tool("run_command", command="doc.switch", params={"index": pi}); m.tool("run_command", command="page.select", params={"id": pdata["id"]})
    m.tool("run_command", command="edit.copy", params={"ids": [pdata["frames"][n]["id"] for n in names]})
    m.tool("run_command", command="doc.switch", params={"index": mi})
    if page_name not in master:
        pid = json.loads(m.tool("run_command", command="page.add", params={"name": page_name}))["id"]; master[page_name] = {"id": pid, "frames": {}}
    mp = master[page_name]; m.tool("run_command", command="page.select", params={"id": mp["id"]})
    old = {n: mp["frames"][n] for n in names if n in mp["frames"]}
    if old: m.tool("run_command", command="edit.delete", params={"ids": [o["id"] for o in old.values()]})
    new_ids = json.loads(m.tool("run_command", command="edit.paste", params={}))["ids"]
    nodes = {json.loads(m.tool("get_node", id=i, fields=["name"]))["name"]: i for i in new_ids}
    for n, i in nodes.items():
        if n in old: m.tool("set_properties", ids=[i], props={"x": old[n]["x"], "y": old[n]["y"]}); replaced += 1
        else: added += 1
        m.tool("set_properties", ids=[i], props={"pluginData": {"proposalSource": None, "role": None, "promotedFrom": os.path.basename(PROP)}})
    print("page", page_name, "replaced", len([n for n in nodes if n in old]), "added", len([n for n in nodes if n not in old]), flush=True)
m.tool("run_command", command="doc.switch", params={"index": mi}); m.tool("run_command", command="page.select", params={"index": 0})
print("master:", m.tool("save_file", path=MASTER)); print("replaced", replaced, "added", added)
if not KEEP: os.remove(PROP); print("deleted", PROP)
