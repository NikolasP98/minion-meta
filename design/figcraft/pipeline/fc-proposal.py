"""Start a FigCraft proposal file from the master: copies the named frames (fnmatch patterns, any page) into a new file, page names preserved.
Usage: python3 fc-proposal.py <master.figcraft> <proposal.figcraft> "<frame pattern>" ...   e.g. "CRM / crm/customers*" "Component / Button*" """
import sys, os, json, fnmatch, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
MASTER, OUT, PATTERNS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), sys.argv[3:]
m = MCP(["figcraft-cli", "mcp", "--automation-read-root", os.path.dirname(MASTER), "--automation-write-root", os.path.dirname(OUT)])
m.tool("open_file", path=MASTER); src = json.loads(m.tool("run_command", command="doc.list", params={}))
src_idx = next(d["index"] for d in src if d.get("current")) if any(d.get("current") for d in src) else src[-1]["index"]
m.tool("run_command", command="file.new", params={}); dst_idx = json.loads(m.tool("run_command", command="doc.list", params={}))[-1]["index"]
plan = []  # (page name, [ids])
m.tool("run_command", command="doc.switch", params={"index": src_idx})
for p in json.loads(m.tool("run_command", command="page.list", params={})):
    m.tool("run_command", command="page.select", params={"id": p["id"]})
    d = json.loads(m.tool("inspect_document", depth=1, fields=["name"])); pg = next(x for x in d["pages"] if x["id"] == p["id"])
    ids = [c["id"] for c in pg.get("children", []) if any(fnmatch.fnmatch(c["name"], pat) for pat in PATTERNS)]
    if ids: plan.append((p["name"], ids))
if not plan: sys.exit("no frames matched " + str(PATTERNS))
first = True; copied = 0
for page_name, ids in plan:
    m.tool("run_command", command="doc.switch", params={"index": src_idx})
    pid = next(p["id"] for p in json.loads(m.tool("run_command", command="page.list", params={})) if p["name"] == page_name)
    m.tool("run_command", command="page.select", params={"id": pid}); m.tool("run_command", command="edit.copy", params={"ids": ids})
    m.tool("run_command", command="doc.switch", params={"index": dst_idx})
    if first: dp = json.loads(m.tool("run_command", command="page.list", params={}))[0]["id"]; m.tool("run_command", command="page.rename", params={"id": dp, "name": page_name}); first = False
    else: dp = json.loads(m.tool("run_command", command="page.add", params={"name": page_name}))["id"]
    m.tool("run_command", command="page.select", params={"id": dp})
    new_ids = json.loads(m.tool("run_command", command="edit.paste", params={}))["ids"]
    m.tool("set_properties", ids=new_ids, props={"pluginData": {"proposalSource": os.path.basename(MASTER), "copiedAt": datetime.date.today().isoformat(), "role": "as-is"}})
    copied += len(new_ids); print("page", page_name, "copied", len(new_ids), flush=True)
m.tool("run_command", command="page.select", params={"index": 0})
print("proposal:", m.tool("save_file", path=OUT)); print("frames copied:", copied, "— duplicate a frame and rename it '… · to-be' for the proposed state")
