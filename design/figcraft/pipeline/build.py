import sys, os, json, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
from fcbuild import build, HERE
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "minion-site-landing.figcraft")
d = json.load(open(os.path.join(HERE, "dom.json")))
ATTACH = os.environ.get("FC_ATTACH")
m = MCP(["figcraft-cli", "mcp", "--attach", ATTACH] if ATTACH else ["figcraft-cli", "mcp", "--automation-write-root", HERE])
if ATTACH:  # rebuild inside the app's open file so its live session stays up
    page = json.loads(m.tool("inspect_document", depth=1, fields=[]))["pages"][0]
    ids = [c["id"] for c in page.get("children", [])]
    if ids: m.tool("run_command", command="edit.delete", params={"ids": ids})
root = build(m, d, 0, 0, "minion-ai.org / landing (1440)")
print(m.tool("save_file", path=OUT))
img = m.req("tools/call", {"name": "screenshot", "arguments": {"ids": [root], "maxSize": 7400, "scale": 1}})
for c in img["content"]:
    if c.get("type") == "image": open(os.path.join(HERE, "figcraft.png"), "wb").write(base64.b64decode(c["data"]))
