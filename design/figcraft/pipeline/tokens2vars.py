"""packages/design-tokens/tokens.css -> FigCraft variable collection "Hub tokens" (one mode per theme; colours + numbers; var() refs become aliases).
Usage: python3 tokens2vars.py <file.figcraft>   (FC_ATTACH=port: the open doc)"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp import MCP
CSS = os.path.expanduser("~/Documents/CODE/MINION/packages/design-tokens/tokens.css")
src = open(CSS).read()
# top-level blocks by brace matching (handles `@theme static {`, nested @media/@layer are flattened into their inner rules)
src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
def blocks(text):
    i = 0; out = []
    while True:
        o = text.find("{", i)
        if o < 0: return out
        sel = text[text.rfind("}", 0, o) + 1:o].strip().split("\n")[-1].strip() if "}" in text[:o] else text[:o].strip().split("\n")[-1].strip()
        depth = 1; j = o + 1
        while depth and j < len(text):
            depth += {"{": 1, "}": -1}.get(text[j], 0); j += 1
        body = text[o + 1:j - 1]
        if "{" in body: out += blocks(body)  # nested rules (@media etc.)
        else: out.append((sel, body))
        i = j
themes = {}  # theme -> {var: value}
for sel, body in blocks(src):
    mth = re.search(r"data-(?:minion-theme|theme-preset)='([a-z0-9-]+)'", sel)
    name = mth.group(1) if mth else ("new-york" if (sel.startswith("@theme") or sel.startswith(":root")) and "data-" not in sel else None)
    if not name: continue
    for k, v in re.findall(r"(--[a-z0-9-]+)\s*:\s*([^;]+);", body):
        themes.setdefault(name, {})[k] = v.strip()
base = themes["new-york"]
for t in themes: themes[t] = {**base, **themes[t]}  # presets override the root
modes = ["new-york"] + sorted(t for t in themes if t != "new-york")
NUM = re.compile(r"^(-?\d*\.?\d+)(px|rem|ms|)$")
def kind(v):
    if v.startswith("var("): return "alias"
    if re.match(r"^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\(|color-mix\()", v): return "color"
    if NUM.match(v): return "number"
    return None
def num(v):
    m = NUM.match(v); n = float(m.group(1)); return n * 16 if m.group(2) == "rem" else n
# a variable's type = type of its root value in the default theme
def resolve(t, k, depth=0):
    v = themes[t].get(k)
    if v is None or depth > 8: return None
    if v.startswith("var("):
        inner = re.match(r"var\((--[a-z0-9-]+)(?:\s*,\s*([^)]+))?\)", v)
        r = resolve(t, inner.group(1), depth + 1) if inner else None
        return r if r is not None else (inner.group(2).strip() if inner and inner.group(2) else None)
    return v
types = {}
for k in base:
    r = resolve("new-york", k); t = kind(r) if r else None
    types[k] = t if t in ("color", "number") else "string"  # fonts, eases, shadows: kept verbatim
print("tokens:", len(base), "typed:", len(types), "modes:", modes, flush=True)
ATTACH = os.environ.get("FC_ATTACH"); F = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else None
m = MCP(["figcraft-cli", "mcp", "--attach", ATTACH] if ATTACH else ["figcraft-cli", "mcp", "--automation-write-root", os.path.dirname(F), "--automation-read-root", os.path.dirname(F)])
if not ATTACH: m.tool("open_file", path=F)
existing = json.loads(m.tool("run_command", command="variable.list", params={}))
cols = existing.get("collections", existing) if isinstance(existing, dict) else existing
if any((c.get("name") if isinstance(c, dict) else c) == "Hub tokens" for c in cols): m.tool("run_command", command="variable.deleteCollection", params={"collection": "Hub tokens"})
m.tool("run_command", command="variable.createCollection", params={"name": "Hub tokens", "modes": modes})
groups = {"color": "color", "space": "spacing", "radius": "radius", "font": "typography", "line": "typography", "letter": "typography", "icon": "sizing", "control": "sizing", "shadow": "effects", "elevation": "elevation", "duration": "motion", "layer": "layering"}
vname = lambda k: groups.get(k[2:].split("-")[0], "misc") + "/" + k[2:]
created = set(); cmds = []
def literal(t, k):
    v = resolve(t, k)
    return (num(v) if types[k] == "number" else re.sub(r"\s+", " ", v)) if v else None
# pass 1: every variable with literal per-mode values (aliases become literals when the target isn't typed)
for k, t in types.items():
    vals = {}
    for mode in modes:
        lv = literal(mode, k)
        if lv is not None: vals[mode] = lv
    if not vals: continue
    cmds.append({"command": "variable.create", "params": {"collection": "Hub tokens", "name": vname(k), "type": t, "values": vals}})
    created.add(k)
res = json.loads(m.tool("batch", commands=cmds, onError="continue"))
bad = [r for r in res if isinstance(r, dict) and r.get("ok") is False]
print("variables created:", len(cmds) - len(bad), "failed:", len(bad), bad[:3], flush=True)
# pass 2: direct var() references in the default theme become aliases (same type) in every mode where the ref holds
alias = []
for k in created:
    for mode in modes:
        v = themes[mode].get(k, "")
        mm = re.match(r"^var\((--[a-z0-9-]+)\)$", v)
        if mm and mm.group(1) in created and types[mm.group(1)] == types[k]:
            alias.append({"command": "variable.set", "params": {"variable": vname(k), "mode": mode, "value": {"alias": vname(mm.group(1))}}})
res = json.loads(m.tool("batch", commands=alias, onError="continue")) if alias else []
bad = [r for r in res if isinstance(r, dict) and r.get("ok") is False]
print("aliases:", len(alias) - len(bad), "failed:", len(bad), bad[:2], flush=True)
if not ATTACH: print(m.tool("save_file", path=F))
