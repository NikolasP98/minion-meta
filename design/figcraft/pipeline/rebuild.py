"""Post-capture chain: pages (+states, +FACES) -> variables -> Foundations -> component sets -> bindings -> prototype links -> durable file -> app reload.
Usage: python3 rebuild.py  (reads hub2/, hub2-faces/; writes .local/figcraft/minion-hub.figcraft)"""
import subprocess, sys, os, shutil, json, time
W = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(W, "minion-hub.figcraft"); DUR = os.environ.get("FC_MASTER", os.path.expanduser("~/Documents/CODE/MINION/design/figcraft/minion-hub.master.figcraft"))  # the canonical master
def run(*args):
    print("\n==>", " ".join(args), flush=True); t = time.time()
    r = subprocess.run([sys.executable] + list(args), cwd=W)
    print("    exit", r.returncode, "in %.0fs" % (time.time() - t), flush=True)
    if r.returncode: sys.exit(r.returncode)
if os.path.isdir(os.path.join(W, "hub2-faces")): run("piiscan.py")  # production-derived captures must be clean before they enter the master
run("hubbuild2.py", OUT)
run("tokens2vars.py", OUT)
run("foundations.py", OUT)
run("mkcomponents.py", OUT)
run("bindvars.py", OUT, "Components", "Foundations")
run("protowire.py", OUT)
shutil.copy(OUT, DUR); print("copied to", DUR)
# reload in the running app (only answers while its window draws)
sys.path.insert(0, W)
from mcp import MCP
try:
    m = MCP(["figcraft-cli", "mcp", "--attach", "9871"])
    docs = json.loads(m.tool("run_command", command="doc.list", params={}))
    for d in docs:
        if "minion-hub" in (d.get("path") or d.get("name") or ""):
            m.tool("run_command", command="doc.switch", params={"index": d["index"]}); m.tool("run_command", command="file.close", params={"force": True}); break
    print(m.tool("open_file", path=DUR)[:200]); print("app reloaded")
except Exception as e: print("app reload skipped:", str(e)[:120], "— run: figcraft --control 9871", DUR)
