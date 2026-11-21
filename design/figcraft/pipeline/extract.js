(() => {
const out = {w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, nodes: [], fonts: []};
for (const f of document.fonts) if (f.status==='loaded') out.fonts.push({family:f.family, weight:f.weight, style:f.style, stretch:f.stretch});
const sy = window.scrollY, sx = window.scrollX;
const alpha = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if(!m) return 0; const p=m[1].split(/[\s,\/]+/).map(Number); return p.length>3? p[3] : 1; };
const px = v => parseFloat(v)||0;
const clipLike = cs => /hidden|clip/.test(cs.overflow);
const R = el => { const r = el.getBoundingClientRect(); return {x:r.left+sx, y:r.top+sy, w:r.width, h:r.height}; };
let order = 0;
function shapeToPath(s){
  const a = n => parseFloat(s.getAttribute(n)||0);
  switch(s.tagName.toLowerCase()){
    case 'path': return s.getAttribute('d');
    case 'circle': {const cx=a('cx'),cy=a('cy'),r=a('r'); return `M${cx-r} ${cy}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`;}
    case 'ellipse': {const cx=a('cx'),cy=a('cy'),rx=a('rx'),ry=a('ry'); return `M${cx-rx} ${cy}a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`;}
    case 'rect': {const x=a('x'),y=a('y'),w=a('width'),h=a('height'); return `M${x} ${y}h${w}v${h}h${-w}Z`;}
    case 'line': return `M${a('x1')} ${a('y1')}L${a('x2')} ${a('y2')}`;
    case 'polyline': return 'M'+s.getAttribute('points').trim().split(/\s+/).join('L');
    case 'polygon': return 'M'+s.getAttribute('points').trim().split(/\s+/).join('L')+'Z';
  }
  return null;
}
const inter=(a,b)=>!a?b:{x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),x2:Math.min(a.x+a.w,b.x+b.w),y2:Math.min(a.y+a.h,b.y+b.h)};
const norm=c=>({x:c.x,y:c.y,w:(c.x2!==undefined?c.x2:c.x+c.w)-c.x,h:(c.y2!==undefined?c.y2:c.y+c.h)-c.y});
const visibleIn=(r,c)=>!c||(r.x<c.x+c.w-0.5&&r.x+r.w>c.x+0.5&&r.y<c.y+c.h-0.5&&r.y+r.h>c.y+0.5);
function walk(el, sectionName, opacity, clipRect) {
  if (!(el instanceof Element)) return;
  const cs = getComputedStyle(el);
  if (cs.display==='none' || cs.visibility==='hidden') return;
  const op = opacity * (parseFloat(cs.opacity) || 0);
  if (op <= 0) return;
  const rect = R(el);
  const tag = el.tagName.toLowerCase();
  if (tag==='section' || ((tag==='header' || tag==='footer' || tag==='nav') && /^(body|main)$/i.test(el.parentElement.tagName))) sectionName = el.id || tag;
  if (cs.clipPath!=='none' || cs.clip!=='auto' || (rect.w<=1 && rect.h<=1 && clipLike(cs))) return; // visually-hidden (sr-only) content
  if (!visibleIn(rect, clipRect) && !(el instanceof SVGSVGElement)) {}
  if (el instanceof SVGSVGElement) {
    if (rect.w===0||rect.h===0||!visibleIn(rect, clipRect)) return;
    const vb = el.viewBox.baseVal; const vbw = vb.width||rect.w, vbh = vb.height||rect.h;
    const shapes = [];
    for (const s of el.querySelectorAll('path,circle,ellipse,rect,line,polyline,polygon')) {
      const scs = getComputedStyle(s); if (scs.display==='none') continue;
      const d = shapeToPath(s); if (!d) continue;
      let bb; try { bb = s.getBBox(); } catch(e){ continue; }
      shapes.push({d, bbox:{x:bb.x,y:bb.y,w:bb.width,h:bb.height}, stroke: alpha(scs.stroke)>0 && scs.stroke!=='none' ? scs.stroke : null, strokeWidth: px(scs.strokeWidth), fill: scs.fill!=='none' && alpha(scs.fill)>0 ? scs.fill : null, cap: scs.strokeLinecap, join: scs.strokeLinejoin, opacity: parseFloat(scs.opacity)});
    }
    out.nodes.push({k:'svg', sec:sectionName, order:order++, rect, vbw, vbh, vbx: vb.x||0, vby: vb.y||0, shapes, opacity: op});
    return;
  }
  if (tag==='img') { out.nodes.push({k:'img', sec:sectionName, order:order++, rect, src: el.currentSrc||el.src, fit: cs.objectFit, radius:[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomRightRadius,cs.borderBottomLeftRadius].map(px), opacity: op}); return; }
  if (tag==='video' || tag==='canvas' || tag==='iframe') { out.nodes.push({k:'media', tag, sec:sectionName, order:order++, rect, opacity: op}); return; }
  const bg = alpha(cs.backgroundColor)>0 ? cs.backgroundColor : null;
  const bgi = cs.backgroundImage !== 'none' ? cs.backgroundImage : null;
  const sides = ['Top','Right','Bottom','Left'].map(s => ({w: px(cs['border'+s+'Width']), c: cs['border'+s+'Color'], st: cs['border'+s+'Style'], dashed: /dashed|dotted/.test(cs['border'+s+'Style'])})).map(b => (b.w>0 && b.st!=='none' && alpha(b.c)>0) ? b : null);
  const radius = [cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomRightRadius,cs.borderBottomLeftRadius].map(px);
  const shadow = cs.boxShadow !== 'none' ? cs.boxShadow : null;
  const clip = /hidden|clip|scroll|auto/.test(cs.overflow) || /hidden|clip/.test(cs.overflowX+cs.overflowY);
  if (!visibleIn(rect, clipRect) && !(rect.w===0&&rect.h===0)) return;
  const childClip = clip ? norm(inter(clipRect, rect)) : clipRect;
  if (clip && (childClip.w<=0.5 || childClip.h<=0.5)) { return; }
  const pseudo = [];
  for (const p of ['::before','::after']) {
    const pc = getComputedStyle(el, p);
    if (pc.content==='none' || pc.content==='normal' || pc.display==='none') continue;
    const pbg = alpha(pc.backgroundColor)>0 ? pc.backgroundColor : null; const pbgi = pc.backgroundImage!=='none' ? pc.backgroundImage : null;
    const pb = px(pc.borderTopWidth)>0 && alpha(pc.borderTopColor)>0 ? pc.borderTopColor : null;
    if (!pbg && !pbgi && !pb) continue;
    // approximate pseudo box: absolute inset/top/left/width/height relative to el (position:absolute) else el's box
    const ins = {t: pc.top, l: pc.left, r: pc.right, b: pc.bottom, w: pc.width, h: pc.height};
    let pr = {x: rect.x, y: rect.y, w: rect.w, h: rect.h};
    if (pc.position==='absolute') {
      const t = ins.t==='auto'? null : px(ins.t), l = ins.l==='auto'? null: px(ins.l), r = ins.r==='auto'?null:px(ins.r), b = ins.b==='auto'?null:px(ins.b);
      const w = ins.w==='auto'? null : px(ins.w), h = ins.h==='auto'? null: px(ins.h);
      const bl = px(cs.borderLeftWidth), bt = px(cs.borderTopWidth);
      const iw = rect.w - bl - px(cs.borderRightWidth), ih = rect.h - bt - px(cs.borderBottomWidth);
      const X = l!=null ? l : (r!=null && w!=null ? iw - r - w : 0);
      const W = w!=null ? w : (l!=null && r!=null ? iw - l - r : iw);
      const Y = t!=null ? t : (b!=null && h!=null ? ih - b - h : 0);
      const H = h!=null ? h : (t!=null && b!=null ? ih - t - b : ih);
      pr = {x: rect.x + bl + X, y: rect.y + bt + Y, w: W, h: H};
    } else { pr = {x: rect.x, y: rect.y, w: px(pc.width)||rect.w, h: px(pc.height)||rect.h}; }
    pseudo.push({p, rect: pr, bg: pbg, bgi: pbgi, radius: pc.borderRadius==='inherit'? radius : [pc.borderTopLeftRadius,pc.borderTopRightRadius,pc.borderBottomRightRadius,pc.borderBottomLeftRadius].map(px), border: pb ? {w: px(pc.borderTopWidth), c: pb} : null, opacity: parseFloat(pc.opacity)});
  }
  const before = pseudo.filter(p=>p.p==='::before'), after = pseudo.filter(p=>p.p==='::after');
  if (rect.w>0 && rect.h>0 && (bg || bgi || sides.some(Boolean) || shadow || clip)) {
    out.nodes.push({k:'box', tag, sec:sectionName, order:order++, rect, bg, bgi, sides, radius, shadow, clip, opacity: op, id: el.id||null, cls: el.className && typeof el.className==='string' ? el.className.slice(0,60) : null});
  }
  for (const p of before) out.nodes.push({k:'box', tag:'::before', sec:sectionName, order:order++, rect:p.rect, bg:p.bg, bgi:p.bgi, sides:p.border?[{w:p.border.w,c:p.border.c},null,null,null]:[null,null,null,null], radius:p.radius, shadow:null, clip:false, opacity: op*p.opacity});
  const closedDetails = tag==='details' && !el.open;
  for (const n of el.childNodes) {
    if (closedDetails && !(n.nodeType===1 && n.tagName.toLowerCase()==='summary')) continue; // closed <details> content is not rendered
    if (n.nodeType===3) {
      if (!n.textContent.trim()) continue;
      if (childClip && childClip.w<=0.5) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const rs = Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0); if (!rs.length) continue;
      const x1=Math.min(...rs.map(r=>r.left)), y1=Math.min(...rs.map(r=>r.top)), x2=Math.max(...rs.map(r=>r.right)), y2=Math.max(...rs.map(r=>r.bottom));
      let text = n.textContent.replace(/\s+/g,' ');
      if (cs.whiteSpace.startsWith('pre')) text = n.textContent;
      if (rs.length===1 || !cs.whiteSpace.startsWith('pre')) text = text.trim();
      const tt = cs.textTransform; if (tt==='uppercase') text=text.toUpperCase(); else if (tt==='lowercase') text=text.toLowerCase();
      if (!visibleIn({x:x1+sx,y:y1+sy,w:x2-x1,h:y2-y1}, childClip)) continue;
      out.nodes.push({k:'text', sec:sectionName, order:order++, rect:{x:x1+sx,y:y1+sy,w:x2-x1,h:y2-y1}, lines: rs.length, firstLeft: rs[0].left+sx, text, family: cs.fontFamily.split(',')[0].replace(/["']/g,'').trim(), size: px(cs.fontSize), weight: cs.fontWeight, style: cs.fontStyle, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, color: cs.color, align: cs.textAlign, decoration: cs.textDecorationLine, opacity: op, fvs: cs.fontVariationSettings, stretch: cs.fontStretch, parentW: rect.w, parentX: rect.x});
    } else if (n.nodeType===1) walk(n, sectionName, op, childClip);
  }
  for (const p of after) out.nodes.push({k:'box', tag:'::after', sec:sectionName, order:order++, rect:p.rect, bg:p.bg, bgi:p.bgi, sides:p.border?[{w:p.border.w,c:p.border.c},null,null,null]:[null,null,null,null], radius:p.radius, shadow:null, clip:false, opacity: op*p.opacity});
}
const bodyBg = getComputedStyle(document.body).backgroundColor, htmlBg = getComputedStyle(document.documentElement).backgroundColor;
out.pageBg = alpha(bodyBg)>0 ? bodyBg : (alpha(htmlBg)>0 ? htmlBg : 'rgb(255,255,255)');
walk(document.body, 'body', 1, null);
return JSON.stringify(out);
})()
