(() => {
// Tree extractor: every section[id^=cmp-] -> nested boxes with computed layout (flex/grid, gap, padding, alignment), text leaves, svg icons.
const px = v => parseFloat(v) || 0;
const alpha = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return c && c !== 'transparent' ? 1 : 0; const p = m[1].split(/[\s,\/]+/).map(Number); return p.length > 3 ? p[3] : 1; };
const R = el => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
const INLINE = /^(span|b|i|strong|em|a|code|kbd|small|sup|sub|abbr|time|label)$/i;
function shapeToPath(s) {
  const t = s.tagName.toLowerCase(), a = n => s.getAttribute(n);
  if (t === 'path') return a('d');
  if (t === 'circle') { const cx = +a('cx'), cy = +a('cy'), r = +a('r'); return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`; }
  if (t === 'ellipse') { const cx = +a('cx'), cy = +a('cy'), rx = +a('rx'), ry = +a('ry'); return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`; }
  if (t === 'rect') { const x = +a('x') || 0, y = +a('y') || 0, w = +a('width'), h = +a('height'); if (!w || !h) return null; return `M${x} ${y}h${w}v${h}h${-w}Z`; }
  if (t === 'line') return `M${a('x1')} ${a('y1')}L${a('x2')} ${a('y2')}`;
  if (t === 'polyline' || t === 'polygon') { const p = (a('points') || '').trim().split(/[\s,]+/).map(Number); let d = ''; for (let i = 0; i < p.length; i += 2) d += (i ? 'L' : 'M') + p[i] + ' ' + p[i + 1]; return d + (t === 'polygon' ? 'Z' : ''); }
  return null;
}
function svgNode(el, cs) {
  const r = R(el), vb = (el.getAttribute('viewBox') || '0 0 24 24').split(/[\s,]+/).map(Number);
  const shapes = [];
  for (const s of el.querySelectorAll('path,circle,ellipse,rect,line,polyline,polygon')) { const c = getComputedStyle(s); const d = shapeToPath(s); if (!d) continue; let bb; try { bb = s.getBBox(); } catch (e) { continue; }
    shapes.push({ d, bbox: { x: bb.x, y: bb.y, w: bb.width, h: bb.height }, stroke: c.stroke !== 'none' && alpha(c.stroke) > 0 ? c.stroke : null, strokeWidth: px(c.strokeWidth), fill: c.fill !== 'none' && alpha(c.fill) > 0 ? c.fill : null, cap: c.strokeLinecap, join: c.strokeLinejoin, opacity: px(c.opacity) }); }
  return { k: 'svg', tag: 'svg', rect: r, vbx: vb[0], vby: vb[1], vbw: vb[2] || r.w, vbh: vb[3] || r.h, shapes, color: cs.color };
}
const sizeMode = (el, cs, parentCs, axis) => {
  // hug: content-sized; fill: stretches to the parent; fixed: explicit px
  const prop = axis === 'w' ? 'width' : 'height';
  if (cs.position === 'absolute' || cs.position === 'fixed') return 'fixed';
  if (parentCs && /flex/.test(parentCs.display)) {
    const row = parentCs.flexDirection.startsWith('row');
    const main = row ? axis === 'w' : axis === 'h';
    if (main) { if (px(cs.flexGrow) > 0) return 'fill'; }
    else if (parentCs.alignItems === 'stretch' || parentCs.alignItems === 'normal') { if (el.style[prop] === '' && (cs[axis === 'w' ? 'width' : 'height'] === parentCs[axis === 'w' ? 'width' : 'height'] || /auto|%/.test(el.style[prop] || 'auto'))) return 'fill'; }
  }
  if (parentCs && /grid/.test(parentCs.display)) return axis === 'w' ? 'fill' : 'hug';
  if (axis === 'w' && /^(100%|auto)$/.test(el.style.width || 'auto') && (cs.display === 'block' || cs.display === 'flex' || cs.display === 'grid') && !/inline/.test(cs.display)) return 'fill';
  if (/inline|flex|grid/.test(cs.display) || /^(button|a|span|label)$/i.test(el.tagName)) return 'hug';
  return 'fixed';
};
function walk(el, parentCs, depth) {
  if (!(el instanceof Element) || /^(script|style|noscript|template|svg)$/i.test(el.tagName) && el.tagName.toLowerCase() !== 'svg') return null;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || px(cs.opacity) === 0) return null;
  const r = R(el); if (r.w <= 0 || r.h <= 0) return null;
  if (/clip|rect\(/.test(cs.clipPath) || cs.clip !== 'auto' && cs.position === 'absolute' && r.w <= 1) return null;
  if (el.tagName.toLowerCase() === 'svg') return svgNode(el, cs);
  if (el.tagName.toLowerCase() === 'img') return { k: 'img', tag: 'img', rect: r, src: el.currentSrc || el.src, radius: px(cs.borderTopLeftRadius) };
  const n = { k: 'box', tag: el.tagName.toLowerCase(), id: el.id || null, cls: (el.className && el.className.baseVal === undefined ? el.className : '').toString().slice(0, 60), rect: r, children: [], depth };
  const bg = cs.backgroundColor; if (alpha(bg) > 0) n.fill = bg;
  if (cs.backgroundImage && cs.backgroundImage !== 'none' && /gradient/.test(cs.backgroundImage)) n.gradient = cs.backgroundImage;
  const bw = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)];
  if (bw.some(w => w > 0) && alpha(cs.borderTopColor || cs.borderLeftColor) > 0) { n.stroke = cs.borderTopColor; n.sw = bw; n.dashed = /dashed/.test(cs.borderTopStyle); }
  n.radius = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
  if (cs.boxShadow && cs.boxShadow !== 'none') n.shadow = cs.boxShadow;
  n.opacity = px(cs.opacity); n.clip = /hidden|clip|auto|scroll/.test(cs.overflow);
  n.pos = cs.position; n.sizeW = sizeMode(el, cs, parentCs, 'w'); n.sizeH = sizeMode(el, cs, parentCs, 'h');
  if (/flex/.test(cs.display)) {
    n.layout = cs.flexDirection.startsWith('column') ? 'vertical' : 'horizontal';
    n.reverse = cs.flexDirection.endsWith('reverse'); n.wrap = cs.flexWrap !== 'nowrap';
    n.gap = n.layout === 'horizontal' ? px(cs.columnGap) : px(cs.rowGap); n.crossGap = n.layout === 'horizontal' ? px(cs.rowGap) : px(cs.columnGap);
    n.mainAlign = { 'flex-start': 'min', start: 'min', normal: 'min', left: 'min', center: 'center', 'flex-end': 'max', end: 'max', right: 'max', 'space-between': 'spaceBetween', 'space-around': 'spaceAround', 'space-evenly': 'spaceEvenly' }[cs.justifyContent] || 'min';
    n.crossAlign = { 'flex-start': 'min', start: 'min', normal: 'min', stretch: 'min', center: 'center', 'flex-end': 'max', end: 'max', baseline: 'baseline' }[cs.alignItems] || 'min';
  } else if (/grid/.test(cs.display)) {
    n.layout = 'grid'; n.columnTracks = cs.gridTemplateColumns.split(' ').map(px).filter(Boolean); n.gap = px(cs.columnGap); n.crossGap = px(cs.rowGap);
  }
  n.padding = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
  // text leaf: no block-level element children, non-empty text
  const kids = [...el.childNodes];
  const elKids = kids.filter(c => c instanceof Element);
  const blockKids = elKids.filter(c => { const d = getComputedStyle(c).display; return !(INLINE.test(c.tagName) && /inline/.test(d)) && c.tagName.toLowerCase() !== 'svg' || c.tagName.toLowerCase() === 'svg'; });
  const text = (el.innerText || '').trim();
  if (text && blockKids.length === 0) {
    n.k = 'text'; n.text = text; n.font = { family: cs.fontFamily, size: px(cs.fontSize), weight: +cs.fontWeight || 400, style: cs.fontStyle, lh: cs.lineHeight === 'normal' ? null : px(cs.lineHeight), ls: px(cs.letterSpacing), color: cs.color, align: cs.textAlign, transform: cs.textTransform, deco: cs.textDecorationLine };
    // single line? compare to the line height
    n.lines = n.font.lh ? Math.round(r.h / n.font.lh) : 1;
    // a text leaf with its own fill/border stays a box containing a text child
    if (n.fill || n.stroke) { const t = { ...n, k: 'text', children: [], fill: undefined, stroke: undefined, layout: undefined, padding: [0, 0, 0, 0], rect: { x: r.x + n.padding[3], y: r.y + n.padding[0], w: r.w - n.padding[1] - n.padding[3], h: r.h - n.padding[0] - n.padding[2] }, sizeW: 'hug', sizeH: 'hug' }; n.k = 'box'; n.text = undefined; n.children = [t]; }
    return n;
  }
  for (const c of elKids) { const cn = walk(c, cs, depth + 1); if (cn) n.children.push(cn); }
  if (text && blockKids.length && kids.some(c => c.nodeType === 3 && c.textContent.trim())) {
    // mixed content: own text nodes beside block children -> one text leaf for the direct text
    const own = kids.filter(c => c.nodeType === 3).map(c => c.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (own) n.children.unshift({ k: 'text', tag: '#text', text: own, rect: { x: r.x + n.padding[3], y: r.y + n.padding[0], w: Math.max(8, r.w - n.padding[1] - n.padding[3]), h: px(cs.lineHeight) || px(cs.fontSize) * 1.3 }, font: { family: cs.fontFamily, size: px(cs.fontSize), weight: +cs.fontWeight || 400, style: cs.fontStyle, lh: px(cs.lineHeight) || null, ls: px(cs.letterSpacing), color: cs.color, align: cs.textAlign, transform: cs.textTransform, deco: cs.textDecorationLine }, lines: 1, sizeW: 'hug', sizeH: 'hug', children: [] });
  }
  return n;
}
const out = { pageBg: getComputedStyle(document.body).backgroundColor, sections: [] };
for (const sec of document.querySelectorAll('section[id^=cmp-]')) { const t = walk(sec, null, 0); if (t) { t.id = sec.id; out.sections.push(t); } }
return JSON.stringify(out);
})()
