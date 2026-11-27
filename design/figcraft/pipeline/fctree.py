"""Nested box tree (extract-tree.js) -> FigCraft frames with auto layout. build_tree(m, node, x, y, name) -> root id."""
import json, re, os
from fcbuild import hexc, font  # colour + font mapping shared with the flat builder
GEN = {"linear-gradient": "linearGradient"}
def props_for(n):
    p = {"fill": hexc(n["fill"]) if n.get("fill") else "none", "clip": bool(n.get("clip")) and n["k"] == "box"}
    if n.get("stroke"):
        sw = n["sw"]; p["stroke"] = hexc(n["stroke"]); p["strokeAlign"] = "inside"
        if len(set(sw)) == 1: p["strokeWeight"] = sw[0]
        else: p.update({"strokeTopWeight": sw[0], "strokeRightWeight": sw[1], "strokeBottomWeight": sw[2], "strokeLeftWeight": sw[3]})
        if n.get("dashed"): p["dashes"] = [4, 4]
    r = n.get("radius") or [0, 0, 0, 0]
    if any(r): p["cornerRadius"] = r[0] if len(set(r)) == 1 else r
    if n.get("opacity", 1) < 1: p["opacity"] = n["opacity"]
    if n.get("layout") in ("horizontal", "vertical"):
        p.update({"layout": n["layout"], "gap": n.get("gap", 0), "crossGap": n.get("crossGap", 0), "padding": n["padding"], "mainAlign": n.get("mainAlign", "min"), "crossAlign": n.get("crossAlign", "min"), "wrap": bool(n.get("wrap"))})
    elif n.get("layout") == "grid" and n.get("columnTracks"):
        p.update({"layout": "grid", "columnTracks": n["columnTracks"], "gap": n.get("gap", 0), "crossGap": n.get("crossGap", 0), "padding": n["padding"]})
    return p
def shadow_effects(s):
    out = []
    for part in re.split(r",(?![^()]*\))", s):
        mm = re.match(r"\s*(inset\s+)?(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(?:\s+(-?[\d.]+)px)?\s*(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})?", part.strip()) or re.match(r"\s*(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(?:\s+(-?[\d.]+)px)?", part.strip())
        if not mm: continue
        g = mm.groups()
        if g[0] and g[0].startswith("rgb"): color, ox, oy, bl, sp, inset = g[0], g[1], g[2], g[3], g[4], False
        else: inset, ox, oy, bl, sp, color = bool(g[0]), g[1], g[2], g[3], g[4], g[5]
        if not color: continue
        out.append({"type": "innerShadow" if inset else "dropShadow", "offset": [float(ox), float(oy)], "radius": float(bl or 0), "spread": float(sp or 0), "color": color})
    return out

def hug_ok(n, axis):
    """hug only when the measured box equals its content + padding (min-height/explicit sizes in the DOM must stay fixed)"""
    kids = [c["rect"] for c in n.get("children", []) if c.get("pos") not in ("absolute", "fixed")]
    if not kids: return False
    pad = n.get("padding") or [0, 0, 0, 0]
    if axis == "w": span = max(k["x"] + k["w"] for k in kids) - min(k["x"] for k in kids) + pad[1] + pad[3]
    else: span = max(k["y"] + k["h"] for k in kids) - min(k["y"] for k in kids) + pad[0] + pad[2]
    return abs(n["rect"]["w" if axis == "w" else "h"] - span) <= 1.5

def build_tree(m, root, X0, Y0, NAME):
    """Create the root frame absolutely positioned at X0,Y0 (auto-layout inside), then children level by level in DOM order."""
    rp = props_for(root); rp["fill"] = hexc(root["fill"]) if root.get("fill") else "none"
    rid = json.loads(m.tool("batch", commands=[{"command": "node.create", "params": {"type": "frame", "x": X0, "y": Y0, "width": root["rect"]["w"], "height": root["rect"]["h"], "name": NAME, "props": rp, "select": False}}]))[0]["id"]
    level = [(root, rid)]
    shadows = []
    while level:
        cmds = []; owners = []
        for n, pid in level:
            auto = n.get("layout") in ("horizontal", "vertical", "grid")
            for c in n["children"]:
                r = c["rect"]; rel = {"x": r["x"] - n["rect"]["x"], "y": r["y"] - n["rect"]["y"]}
                base = {"parent": pid, "x": rel["x"], "y": rel["y"], "select": False}
                if c["k"] == "text":
                    f = c["font"]; fam, sty = font({"family": f["family"].split(",")[0].strip(" '\""), "weight": f["weight"], "style": f["style"], "fvs": None, "size": f["size"]})
                    p = {"fill": hexc(f["color"]), "fontFamily": fam, "fontStyle": sty, "fontSize": f["size"], "textAlign": {"start": "left", "left": "left", "center": "center", "right": "right", "end": "right", "justify": "justified"}.get(f["align"], "left")}
                    if f.get("lh"): p["lineHeight"] = f["lh"]
                    if f.get("ls"): p["letterSpacing"] = f["ls"]
                    if f.get("transform") == "uppercase": p["textCase"] = "upper"
                    if "underline" in (f.get("deco") or ""): p["textDecoration"] = "underline"
                    one = c.get("lines", 1) <= 1
                    p["textAutoResize"] = "widthAndHeight" if one else "height"
                    if auto: p["sizingH"] = "fill" if (not one and c.get("sizeW") == "fill") else ("hug" if one else "fixed")
                    params = {**base, "type": "text", "text": c["text"], "name": c["text"][:40], "props": p}
                    if not one: params["width"] = r["w"]
                    cmds.append({"command": "node.create", "params": params}); owners.append((c, None))
                elif c["k"] == "svg":
                    # one vector per shape, scaled from the viewBox into the icon box; grouped in a hugging frame so auto layout can place it
                    fr = {**base, "type": "frame", "width": r["w"], "height": r["h"], "name": "icon", "props": {"fill": "none", "clip": False}}
                    if auto: fr["props"].update({"sizingH": "fixed", "sizingV": "fixed"})
                    cmds.append({"command": "node.create", "params": fr}); owners.append((c, "svg"))
                elif c["k"] == "img":
                    cmds.append({"command": "node.create", "params": {**base, "type": "rectangle", "width": r["w"], "height": r["h"], "name": "image", "props": {"fill": "#27272a", "cornerRadius": c.get("radius", 0)}}}); owners.append((c, None))
                else:
                    p = props_for(c)
                    if auto:
                        p["sizingH"] = "fill" if c.get("sizeW") == "fill" else ("hug" if c.get("layout") and c.get("sizeW") == "hug" and hug_ok(c, "w") else "fixed")
                        p["sizingV"] = "fill" if c.get("sizeH") == "fill" else ("hug" if c.get("layout") and c.get("sizeH") == "hug" and hug_ok(c, "h") else "fixed")
                        if c.get("pos") in ("absolute", "fixed"): p["absolute"] = True
                    cmds.append({"command": "node.create", "params": {**base, "type": "frame", "width": r["w"], "height": r["h"], "name": (c.get("tag") or "div") + ("." + c["cls"].split(" ")[0] if c.get("cls") else ""), "props": p}}); owners.append((c, "box"))
                    if c.get("shadow") and c["shadow"] != "none": shadows.append((len(owners) - 1, c["shadow"]))
        if not cmds: break
        res = json.loads(m.tool("batch", commands=cmds, onError="continue"))
        nxt = []; made = {}
        for i, (r, (c, kind)) in enumerate(zip(res, owners)):
            if r.get("ok") is False: continue
            nid = (r.get("result") or r).get("id"); made[i] = nid
            if kind == "box": nxt.append((c, nid))
            elif kind == "svg":
                s = min(c["rect"]["w"] / (c["vbw"] or 1), c["rect"]["h"] / (c["vbh"] or 1))
                vc = []
                for sh in c["shapes"]:
                    bb = sh["bbox"]
                    vp = {"type": "vector", "parent": nid, "name": "path", "path": sh["d"], "x": (bb["x"] - c["vbx"]) * s - bb["x"], "y": (bb["y"] - c["vby"]) * s - bb["y"], "select": False, "props": {"fill": hexc(sh["fill"]) if sh["fill"] else "none", "opacity": sh.get("opacity", 1)}}
                    if bb["w"] > 0: vp["width"] = bb["w"] * s
                    if bb["h"] > 0: vp["height"] = bb["h"] * s
                    if sh.get("stroke"): vp["props"].update({"stroke": hexc(sh["stroke"]), "strokeWeight": (sh.get("strokeWidth") or 1) * s, "strokeAlign": "center", "strokeCap": sh.get("cap") or "none", "strokeJoin": sh.get("join") or "miter"})
                    vc.append({"command": "node.create", "params": vp})
                if vc: m.tool("batch", commands=vc, onError="continue")
        for i, s in shadows:
            if i in made:
                for e in shadow_effects(s):
                    try: m.tool("run_command", command="effect.add", params={"ids": [made[i]], "effect": e})
                    except Exception: pass
        shadows = []
        level = nxt
    return rid
