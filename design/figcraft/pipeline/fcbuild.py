"""dom.json (from extract.js) -> a FigCraft document via the figcraft MCP server."""
import urllib.parse, sys, json, re, base64, os, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from mcp import MCP

HERE = os.path.dirname(os.path.abspath(__file__))

def hexc(c):
    m = re.match(r"rgba?\(([^)]+)\)", c or "")
    if not m: return None
    p = [float(v) for v in re.split(r"[\s,/]+", m[1].strip()) if v != ""]
    a = p[3] if len(p) > 3 else 1
    h = "#%02x%02x%02x" % tuple(int(round(v)) for v in p[:3])
    return h if a >= 1 else h + "%02x" % int(round(a * 255))

def font(n):
    fam, w = n["family"].replace(" Variable", "").strip(), int(n["weight"])
    style = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold"}[min((400, 500, 600, 700), key=lambda k: abs(k - w))]
    if fam == "Fraunces":
        m = re.search(r'"opsz"\s*([\d.]+)', n["fvs"] or "")
        opsz = float(m[1]) if m else min(n["size"], 144)
        fam = "Fraunces %dpt" % min((20, 48, 72), key=lambda k: abs(k - opsz))
        if style == "Regular": style = "Medium"  # shortcut: only 500-700 installed; page uses no Fraunces 400
    elif fam.startswith("JetBrains"): fam = "JetBrains Mono"
    elif fam in ("ui-sans-serif", "system-ui", "sans-serif", "-apple-system"): fam = "Inter"
    elif fam in ("ui-monospace", "monospace", "Courier New"): fam = "JetBrains Mono"
    if n.get("style") == "italic": style = "Italic" if style == "Regular" else style + " Italic"
    return fam, style

def build(m, d, X0=0, Y0=0, NAME='page'):
    N = d['nodes']
    # section order and bounds
    secs = []
    for n in N:
        if n["sec"] not in secs: secs.append(n["sec"])
    bounds = {}
    for n in N:
        r = n["rect"]; b = bounds.setdefault(n["sec"], [1e9, 1e9, -1e9, -1e9])
        b[0] = min(b[0], r["x"]); b[1] = min(b[1], r["y"]); b[2] = max(b[2], r["x"] + r["w"]); b[3] = max(b[3], r["y"] + r["h"])

    root = m.tool("batch", commands=[{"command": "node.create", "params": {"type": "frame", "x": X0, "y": Y0, "width": d["w"], "height": d["h"], "name": NAME, "props": {"fill": hexc(d["pageBg"]), "clip": True}, "select": False}}])
    root = json.loads(root)[0]["id"]
    sec_ids = {}
    cmds = []
    for s in secs:
        b = bounds[s]
        cmds.append({"command": "node.create", "params": {"type": "frame", "parent": root, "x": b[0], "y": b[1], "width": max(1, b[2] - b[0]), "height": max(1, b[3] - b[1]), "name": s, "props": {"fill": "none", "clip": False}, "select": False}})
    for s, r in zip(secs, json.loads(m.tool("batch", commands=cmds))):
        sec_ids[s] = r["id"]

    def node_cmds(n):
        b = bounds[n["sec"]]; ox, oy = b[0], b[1]
        r = n["rect"]; x, y = r["x"] - ox, r["y"] - oy
        parent = sec_ids[n["sec"]]
        op = round(n.get("opacity", 1), 3)
        if n["k"] == "box":
            props = {"cornerRadius": [round(v, 2) for v in n["radius"]], "opacity": op}
            props["fill"] = hexc(n["bg"]) if n["bg"] else "none"
            sides = n["sides"]
            present = [s for s in sides if s]
            if present:
                props["stroke"] = hexc(present[0]["c"]); props["strokeAlign"] = "inside"
                if present[0].get("dashed"): props["dashes"] = [present[0]["w"] * 3, present[0]["w"] * 3]
                if len(present) == 4 and len({(s["w"], s["c"]) for s in present}) == 1:
                    props["strokeWeight"] = present[0]["w"]
                else:
                    for key, s in zip(("strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"), sides):
                        props[key] = s["w"] if s else 0
            name = n["tag"] if d.get("sanitized") else (n.get("id") or (n.get("cls") or n["tag"]).split(" ")[0] or n["tag"])  # prod captures: tag only, never ids/classes
            return [{"command": "node.create", "params": {"type": "rectangle", "parent": parent, "x": x, "y": y, "width": r["w"], "height": r["h"], "name": name, "props": props, "select": False}}]
        if n["k"] == "text":
            fam, sty = font(n)
            props = {"fontFamily": fam, "fontStyle": sty, "fontSize": n["size"], "fill": hexc(n["color"]), "textAutoResize": "height", "opacity": op}
            if n["lineHeight"] not in ("normal", None): props["lineHeight"] = float(n["lineHeight"].replace("px", ""))
            if n["letterSpacing"] not in ("normal", None): props["letterSpacing"] = float(n["letterSpacing"].replace("px", ""))
            al = n["align"].replace("-webkit-", "")
            props["textAlign"] = {"start": "left", "end": "right", "justify": "justified"}.get(al, al)
            if "line-through" in (n["decoration"] or ""): props["textDecoration"] = "strikethrough"
            if "underline" in (n["decoration"] or ""): props["textDecoration"] = "underline"
            if n["lines"] == 1: props["textAutoResize"] = "widthAndHeight"  # never let a one-line label wrap on metric drift
            return [{"command": "node.create", "params": {"type": "text", "parent": parent, "x": x, "y": y, "width": r["w"] + 4, "text": n["text"], "name": n["text"][:40], "props": props, "select": False}}]
        if n["k"] == "svg":
            s = r["w"] / n["vbw"] if n["vbw"] else 1
            out = []
            for sh in n["shapes"]:
                bb = sh["bbox"]
                if re.fullmatch(r"M[\d.\-]+(L[\d.\-]+)+Z?", sh["d"]):  # polyline/polygon points came through unpaired
                    nums = re.findall(r"-?[\d.]+", sh["d"]); pts = ["%s %s" % (nums[i], nums[i+1]) for i in range(0, len(nums)-1, 2)]
                    sh["d"] = "M" + "L".join(pts) + ("Z" if sh["d"].endswith("Z") else "")
                p = {"type": "vector", "parent": parent, "name": "icon", "path": sh["d"], "x": x + (bb["x"] - n["vbx"]) * s - bb["x"], "y": y + (bb["y"] - n["vby"]) * s - bb["y"], "select": False}
                if bb["w"] > 0: p["width"] = bb["w"] * s
                if bb["h"] > 0: p["height"] = bb["h"] * s
                props = {"opacity": round(op * sh["opacity"], 3)}
                props["fill"] = hexc(sh["fill"]) if sh["fill"] else "none"
                if sh["stroke"]:
                    props.update({"stroke": hexc(sh["stroke"]), "strokeWeight": sh["strokeWidth"] * s, "strokeAlign": "center", "strokeCap": sh["cap"], "strokeJoin": sh["join"]})
                p["props"] = props
                out.append({"command": "node.create", "params": p})
            return out
        if n["k"] == "img":
            fn = os.path.join(HERE, "img-" + os.path.basename(n["src"]))
            if d.get("sanitized") and not n["src"].startswith("data:"): return []  # prod captures never fetch remote images
            if not os.path.exists(fn):
                u = urllib.parse.urlparse(n["src"]); origins = os.environ.get("FC_IMG_ORIGINS", "http://127.0.0.1:5199,https://hub.minion-ai.org,https://www.minion-ai.org").split(",")
                if u.scheme in ("http", "https") and "%s://%s" % (u.scheme, u.netloc) in origins:  # exact origins only: never file://, other ports or hosts
                    class _NoRedirect(urllib.request.HTTPRedirectHandler):  # a redirect could leave the allowlisted host
                        def redirect_request(self, *a, **k): return None
                    try:
                        with urllib.request.build_opener(_NoRedirect).open(n["src"], timeout=20) as r:
                            if not (r.headers.get("Content-Type") or "").startswith("image/"): return []
                            data = r.read(5 * 1024 * 1024 + 1)
                    except Exception: return []
                    if len(data) <= 5 * 1024 * 1024: open(fn, "wb").write(data)
                    else: return []
                else: return []
            return [{"command": "image.place", "params": {"path": fn, "parent": parent, "x": x, "y": y, "width": r["w"], "height": r["h"], "name": os.path.basename(n["src"]), "mode": "fill"}}]
        return []

    pending = []
    def flush():
        nonlocal pending
        if not pending: return
        res = json.loads(m.tool("batch", commands=pending, onError="continue"))
        for step in res:
            if not step.get("ok"): print("FAILED", step.get("step"), step.get("error"), json.dumps(pending[step["step"]])[:300], file=sys.stderr)
        pending = []

    for n in sorted(N, key=lambda n: n["order"]):
        pending += node_cmds(n)
        if len(pending) >= 80: flush()
    flush()
    return root
