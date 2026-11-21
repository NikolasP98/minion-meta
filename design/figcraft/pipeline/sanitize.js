(() => {
// Replace production data in the content area with deterministic dummy values of the same kind, varying length/magnitude.
// Chrome (nav/header/aside), headings, buttons, labels, table headers stay untouched. Marks replaced elements with data-dummy.
let seed = 1337; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];
const FIRST = ['Ana', 'Luis', 'María José', 'Jo', 'Valentina', 'Sebastián', 'Camila Fernanda', 'Diego', 'Lucía', 'Maximiliano Alejandro', 'Sofía', 'Renzo', 'Ximena', 'Bartolomé'];
const LAST = ['Quispe', 'García', 'Fernández de Córdova', 'Li', 'Rodríguez', 'Huamán', 'Castañeda Villanueva', 'Paz', 'Montoya', 'Villavicencio Echevarría', 'Ruiz', 'Ng'];
const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim minim veniam quis nostrud exercitation ullamco laboris nisi aliquip commodo consequat'.split(' ');
const PRODUCTS = ['Limpieza facial', 'Botox 50u', 'X', 'Ácido hialurónico labios 1 ml', 'Peeling químico medio', 'Consulta', 'Tratamiento láser CO2 fraccionado rostro completo', 'Crema SPF 50', 'Vitamina C sérum 30 ml'];
const name = () => pick(FIRST) + ' ' + pick(LAST) + (rnd() < 0.3 ? ' ' + pick(LAST) : '');
const words = (n) => Array.from({ length: n }, () => pick(WORDS)).join(' ');
const sentence = () => { const n = pick([1, 2, 4, 8, 14, 26]); const s = words(n); return s[0].toUpperCase() + s.slice(1) + (n > 3 ? '.' : ''); };
const digits = n => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('');
const money = (m) => { const v = pick([0, 0.5, 9.9, 120, 1250.75, 48900, 1234567.89]); const f = v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return m.replace(/[\d.,]+/, f); };
// structural rule: records repeat. Text inside a run of >=3 identical siblings (rows, cards, events, chips, list items) is data,
// unless that run lives in a strict chrome container. Everything else is chrome, except value-shaped text (email/phone/money/ids/names).
const CHROME = 'nav, header, aside, [role=navigation], [role=tablist], [role=menubar], thead, th, [role=columnheader], .seg, [class*=toolbar], [class*=page-header], label, legend, h1, h2, h3, h4, h5, h6, select, option, [data-keep], [class*=sidebar], [class*=breadcrumb], [class*=pagination], [role=alert], [role=status], [class*=toast], [class*=banner]';
const sameKind = (a, b) => a.tagName === b.tagName && a.className === b.className;
const inRepeat = el => {
  for (let x = el; x && x !== document.body; x = x.parentElement) {
    const p = x.parentElement; if (!p) break;
    if (x.closest(CHROME)) return false;
    const kids = [...p.children]; if (kids.length >= 3 && kids.filter(k => sameKind(k, x)).length >= 3 && (x.className || /^(tr|li|article|dd|option)$/i.test(x.tagName))) return true;
  }
  return false;
};
const RECORD = 'td, [role=cell], [role=gridcell], [role=row], li, article, [role=listitem], dd, [class*=event], [class*=card], [class*=chip], [class*=avatar], [class*=message], [class*=product], [class*=booking], [class*=appointment-card], [class*=slot]';
const KEEP = el => { if (el.closest(CHROME)) return true; const b = el.closest('button, [role=button]'); if (b) return !inRepeat(b);  // a button is data only when the button itself repeats (cards, events)
  if (inRepeat(el)) return false; if (el.closest(RECORD)) return false; return true; };
const SCOPE = document.body;  // whole page: toasts, dialogs and panels portal outside <main> (and some pages have none)
const RX = {
  email: /^[\w.+-]+@[\w-]+\.[\w.]+$/, phone: /^\+?[\d\s().-]{7,}$/, money: /(S\/\.?|US?\$|€|PEN|USD)\s?-?[\d.,]+|-?[\d.,]+\s?(PEN|USD|soles)/i,
  dni: /^\d{8}$/, capsName: /^[A-ZÁÉÍÓÚÑ]{2,}([\s.-]+[A-ZÁÉÍÓÚÑ.]{1,}){1,4}$/, ruc: /^(10|20)\d{9}$/, uuid: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i, date: /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$|^\d{4}-\d{2}-\d{2}/, time: /^\d{1,2}:\d{2}(\s?[ap]\.?m\.?)?$/i,
  number: /^-?[\d.,]+%?$/, personName: /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}$/, handle: /^@[\w.]+$/, code: /^[A-Z]{1,4}[-_ ]?\d{3,}$/
};
const inData = el => !!el.closest('td, [role=cell], [role=gridcell], [role=row], li, article, [role=listitem], [class*=card], [class*=row], [class*=item], dl, dd, p, [class*=value], [class*=cell], [class*=chip], [class*=badge], [class*=avatar], [class*=message], [class*=event], [class*=slot]');
// column-aware kinds: a table cell takes its kind from its header text
const headerOf = el => { const cell = el.closest('td, th, [role=cell], [role=gridcell]'); if (!cell) return ''; const row = cell.closest('tr, [role=row]'); if (!row) return '';
  const idx = [...row.children].indexOf(cell.closest('tr > *, [role=row] > *')); const tbl = cell.closest('table, [role=grid], [role=table]'); if (!tbl || idx < 0) return '';
  const hrow = tbl.querySelector('thead tr, [role=rowgroup] [role=row], tr'); const h = hrow && hrow.children[idx]; return h ? h.innerText.trim().toLowerCase() : ''; };
const kindOf = h => /contact|contacto|name|nombre|cliente|customer|paciente|patient|titular|staff|vendedor|owner|assignee|responsable/.test(h) ? 'name'
  : /email|correo/.test(h) ? 'email' : /phone|tel|celular|whatsapp/.test(h) ? 'phone' : /total|amount|monto|precio|price|saldo|balance|subtotal|igv|pago|cobro|revenue|ingreso/.test(h) ? 'money'
  : /score|qty|cantidad|stock|count|units|unidades|visitas|visits|edad|age|#|n°|nº/.test(h) ? 'number' : /stage|etapa|status|estado|funnel|tag|etiqueta|tipo|type|categor|kind/.test(h) ? 'label'
  : /product|producto|servicio|service|item|artículo|concepto|descripción|description|detalle|notas|notes|title|título|asunto|subject/.test(h) ? 'text' : /date|fecha|hora|time|creado|created|updated/.test(h) ? 'keep' : '';
let count = 0;
const walker = document.createTreeWalker(SCOPE, NodeFilter.SHOW_TEXT);
const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
for (const t of nodes) {
  const el = t.parentElement; if (!el) continue;
  const s = t.textContent.trim(); if (!s || s.length < 2) continue;
  // inline values inside longer strings (any container, nav included): emails, phones, 8-digit ids, RUC
  const inline = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, 'persona@example.com').replace(/\+?\d[\d\s().-]{7,}\d/g, m => /\d{6,}/.test(m.replace(/\D/g, '')) ? '+51 987 654 321' : m).replace(/\b(10|20)\d{9}\b/g, '20' + digits(9)).replace(/\b\d{8}\b/g, digits(8));
  if (inline !== s) { t.textContent = t.textContent.replace(s, inline); el.setAttribute('data-dummy', '1'); count++; continue; }
  const valueShaped = RX.email.test(s) || RX.uuid.test(s) || RX.ruc.test(s) || RX.dni.test(s) || (RX.phone.test(s) && /\d{6,}/.test(s)) || RX.money.test(s) || RX.capsName.test(s) || RX.handle.test(s);
  const heading = (!!el.closest('h1, h2, h3, [class*=page-header], [class*=title], [class*=breadcrumb], ' + RECORD) && (RX.capsName.test(s) || RX.personName.test(s))) || (RX.personName.test(s) && s.split(/\s+/).length >= 3);  // record names in headings / breadcrumbs / records, or 3+ capitalised words anywhere
  const KNOWN = window.__FC_KNOWN__ || new Set(), KEEPSET = window.__FC_KEEP__ || new Set();
  const inNav = !!el.closest('nav, aside, [role=navigation]');
  const navName = inNav && (RX.capsName.test(s) || RX.personName.test(s)) && !KNOWN.has(s) && !KEEPSET.has(s);  // a name in the rail that no QA capture shows = a real person
  if (KEEP(el) && !((valueShaped || heading) && !inNav) && !navName) continue;
  if (/\n/.test(s)) { t.textContent = s.split('\n').map(l => l.trim() && !RX.time.test(l.trim()) ? (RX.capsName.test(l.trim()) ? name().toUpperCase() : (RX.personName.test(l.trim()) ? name() : pick(PRODUCTS))) : l).join('\n'); el.setAttribute('data-dummy', '1'); count++; continue; }
  let out = null;
  const k = kindOf(headerOf(el));
  if (k === 'keep') out = s;
  else if (k === 'name') out = name();
  else if (k === 'email') out = pick(['a@b.co', 'maria.jose.fernandez@clinica-ejemplo.com.pe', 'jo@x.io', 'cliente' + digits(3) + '@example.com']);
  else if (k === 'phone') out = pick(['+51 987 654 321', '+1 (415) 555-0199', '987654321']);
  else if (k === 'money') out = RX.money.test(s) ? money(s) : pick(['S/ 0.00', 'S/ 9.90', 'S/ 1,250.75', 'S/ 48,900.00', 'S/ 1,234,567.89']);
  else if (k === 'number') out = pick(['0', '1', '12', '340', '9,999', '1,234,567']);
  else if (k === 'label') out = pick(['Nuevo', 'Lead calificado', 'X', 'Seguimiento post-tratamiento', 'Cerrado', 'VIP']);
  else if (k === 'text') out = rnd() < 0.5 ? pick(PRODUCTS) : sentence();
  else if (RX.email.test(s)) out = pick(['a@b.co', 'maria.jose.fernandez@clinica-ejemplo.com.pe', 'jo@x.io', 'cliente' + digits(3) + '@example.com']);
  else if (RX.uuid.test(s)) out = 'e6b8e2b4-1a2c-4d5e-9f00-' + digits(12);
  else if (RX.ruc.test(s)) out = pick(['20', '10']) + digits(9);
  else if (RX.dni.test(s)) out = digits(8);
  else if (RX.phone.test(s) && /\d{6,}/.test(s)) out = pick(['+51 9', '9', '+1 (415) ', '+34 6'])[0] === '+' ? pick(['+51 987 654 321', '+1 (415) 555-0199', '+34 612 345 678']) : '9' + digits(8);
  else if (RX.money.test(s)) out = money(s);
  else if (RX.date.test(s) || RX.time.test(s)) out = s;  // dates/times keep their format
  else if (RX.handle.test(s)) out = '@' + pick(['ana', 'maximiliano_alejandro.v', 'x']);
  else if (RX.code.test(s)) out = s.replace(/\d+/, digits(pick([3, 5, 8])));
  else if (RX.number.test(s)) out = s.endsWith('%') ? pick(['0%', '7%', '48.5%', '100%']) : pick(['0', '1', '12', '340', '9,999', '1,234,567', '2.50']);
  else if (RX.personName.test(s) && inData(el)) out = name();
  else if (RX.capsName.test(s)) out = name().toUpperCase();
  else if (inData(el)) out = s.length > 60 ? sentence() + ' ' + sentence() : (rnd() < 0.5 ? pick(PRODUCTS) : (s.length > 24 ? sentence() : words(pick([1, 2, 3]))));
  if (out !== null && out !== s) {
    const ml = el.getAttribute('maxlength'); if (ml) out = out.slice(0, +ml);
    t.textContent = t.textContent.replace(s, out); el.setAttribute('data-dummy', '1'); count++;
  }
}
// form controls carrying prod values
for (const i of SCOPE.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea')) {
  if (!i.value || i.closest('nav, aside, [role=navigation]')) continue; const ml = i.maxLength > 0 ? i.maxLength : 80;  // every field value outside the nav is record data (ids, DNI, phones live in labelled inputs)
  let v = i.type === 'email' ? 'persona@example.com' : i.type === 'tel' ? '+51 987 654 321' : i.type === 'number' ? '1234' : (i.value.length > 40 ? sentence() : words(2));
  i.value = v.slice(0, ml); i.setAttribute('data-dummy', '1'); count++;
}
// attributes that can carry record values (alt/title/aria-label/placeholder) and the document title
for (const el of SCOPE.querySelectorAll('[alt],[title],[aria-label],[placeholder]')) {
  if (KEEP(el) && !el.closest(RECORD)) continue;
  for (const a of ['alt', 'title', 'aria-label', 'placeholder']) { const v = el.getAttribute(a); if (v && v.length > 1 && !/^(close|open|menu|search|more|edit|delete|remove|add|new|save|cancel|expand|collapse)/i.test(v)) { el.setAttribute(a, a === 'placeholder' ? 'Type here…' : words(2)); count++; } }
}
document.title = location.pathname;
// every image in the content area -> neutral placeholder (prod captures never keep pixels)
for (const src of SCOPE.querySelectorAll('picture source')) src.remove();
for (const img of SCOPE.querySelectorAll('img')) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#27272a"/><circle cx="32" cy="24" r="12" fill="#52525b"/><rect x="12" y="42" width="40" height="18" rx="9" fill="#52525b"/></svg>'); img.setAttribute('data-dummy', '1'); count++; }
// avatars/images that could show real people -> neutral placeholder
for (const img of SCOPE.querySelectorAll('img')) { if (/avatar|profile|photo|foto|paciente|customer/i.test(img.className + ' ' + img.alt + ' ' + img.src) && !KEEP(img)) { img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#27272a"/><circle cx="32" cy="24" r="12" fill="#52525b"/><rect x="12" y="42" width="40" height="18" rx="9" fill="#52525b"/></svg>'); img.setAttribute('data-dummy', '1'); count++; } }
return count;
})()
