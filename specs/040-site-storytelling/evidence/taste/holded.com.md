# Design Map

Source: https://www.holded.com/es (es-ES, single page, captured 2026-10-24 at 1440x900 and 390x844). Page height 17,009px desktop / 26,131px mobile. A cookie modal ("¿Podemos usar cookies?") blurs the first viewport in `holded.com-1440-viewport.jpeg` and `holded.com-390-viewport.jpeg`; `holded.com-*-viewport-nobanner.jpeg` are the same viewports after clicking "Rechazar todas".

## Spacing Scale
- Component steps (2px base): 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32px (6px = 152 nodes, 8px = 145, 10px = 128)
- Layout steps: 36, 48, 64, 88, 104px
- Section padding: 104px top / 64px bottom (measured); visual gap between sections ~120-160px (~approx)
- Card grid gutter: 16px (2 x 609.6px columns)
- Page frame: content column inset 56px from each edge, bounded by 1px vertical hairlines; inner content 102-1338px (1236px)
- Spacing method: `gap` on flex/grid (ul gap 12px 28px, button gap 4px), margins zeroed

## Font Hierarchy
- Family: Inter only (2,246 nodes); system-ui / ui-monospace fallbacks <= 4 nodes
- Hero h1: 56px / 600 / line-height 54.88px / letter-spacing -2.1px (mobile ~34px, 4 lines)
- Section h2: 48px / 600 / 48px / -1.68px
- Stat numbers: ~40px / 400 (+900.000, 40 h, 160x, 80%)
- Card h3: 24px / 600 / 32px / -0.48px
- Lead: 18.5px / 400 / 26.8px, max-width 820px, color #686F7C with bold #121926 key phrase ("autónomos y empresas")
- Body 16px / 400; buttons and eyebrows 14px / 500-600 (eyebrows uppercase, tracked)
- Product-mock UI: 11, 12, 12.5, 13, 13.5px (13px is the most frequent size on the page, 151 nodes)
- Weights: 400 (380), 500 (229), 600 (94), 700 (13)

## Color Palette
- #FFFFFF page background (80.3% area)
- #FAFAF9 warm stone card surface (6.2% area); #F5F5F4 FAQ band and chips
- #ECEAE6 card hairline (inset 1px)
- #121926 primary text, cool ink (244 nodes)
- #686F7C secondary text (184 nodes); #5D6878, #4B5563 mid; #9CA3AF tertiary
- #1963EF primary CTA blue ("Empieza gratis" hero, cookie accept, "Ver más" links)
- #000000 nav CTA pill; #121926 sticky-bar CTA pill
- #0F1117 dark bands (scanner section, pricing section)
- ~#E5484D brand red: logo mark and the full stop after "sitio" in the h1 only (~approx)
- ~#22A06B trust green: Capterra stars, checkmarks, "Cumple con Verifactu y la AEAT" pill on mobile (~approx)

## Image Ratios
- Hero: interactive HTML product simulation, ~1.6:1 framed window, not a raster image
- Video thumbnail ("Holded en acción"): 16:9 (768x432)
- Feature cards: 2.77:1 (513x185), 1.36:1 (252x185), 1:1 (185x185 inner tiles), 1.6:1 (512x320)
- Logos: bank wordmarks 3.33:1, integration icons 1:1 at 32px
- Testimonial portrait: tall, ~1:1.2 (~approx)

## Component Tokens
- Radius: 8px (buttons, inputs; 203 nodes), 9999px (pills, chips, nav CTA; 201), 20px (large cards; 46), 18px (feature cards), 16px, 12px (inner tiles), 4px
- Nested radius: 18-20px card > 12px tile > 8px or 9999px chip
- Card shadow: `inset 0 0 0 1px #ECEAE6, 0 1px 2px rgba(18,25,38,0.04)`; tiles `0 0 0 1px rgba(0,0,0,0.09)`
- Hero CTA: #1963EF fill, 8px radius, ~48px tall at desktop, soft blue glow; secondary "Pide una demo" white with 1px border and calendar icon
- Nav CTA: black pill 36px tall, 14px/600, padding 0 18px; sticky bottom bar CTA "Empieza 14 días gratis" ink pill 44px
- Persistent chrome: promo strip (dark, 40px), sticky header (56px), floating bottom bar ("Descubre lo que Holded puede hacer por ti" + 2 CTAs), "¿Te ayudo?" chat bubble, live signup toasts
- Grid: 12 columns (col-span-6 / col-span-3 cards), 16px gutter, 48 grid containers on the page
- Motion: cubic-bezier(0.4, 0, 0.2, 1); 150ms color/opacity, 300ms background/border, 500ms sticky top; `:focus-visible` present; `prefers-reduced-motion` respected

---

# Taste DNA

### The product is the illustration
- **Trigger**: When every section needed a visual to explain a back-office chore (invoicing, receipts, bank sync) to an owner who has never used an ERP
- **Decision**: Live-looking product fragments filled with believable Spanish business data over abstract illustrations, icons-in-blobs or lifestyle stock photography
- **Reason**: An owner who fears "software" trusts what they recognise. A ticket for "Café Mar · −4,50 €" booked to "Dietas" answers "will this understand my receipts?" faster than any sentence
- **Evidence**: The hero visual is a clickable simulation of 14 modules, labelled "Es una simulación: nada de lo que hagas aquí se guarda". Mock data reads F260014, 47.320 € saldo, "Ticket 0042 · 46,54 €", "Hoy tienes 3 tareas, 1 presupuesto por firmar y 2 leads nuevos". Photography appears only in the testimonial block. Mock UI text sits at 11-13px (13px is the most common size on the page), so it reads as a screen rather than as marketing copy

### One typeface, hierarchy by tracking and size
- **Trigger**: When choosing a type voice for a broad small-business audience across 18 sections
- **Decision**: A single generic family (Inter) in 400/500/600 with heavy negative tracking at display sizes over a display/body pairing or a characterful brand face
- **Reason**: The brand wants to sound like a tool, not a magazine. Display weight comes from compression (-2.1px at 56px, line-height 0.98), not from a second font the owner would read as "marketing"
- **Evidence**: Inter on 2,246 nodes; 700 weight on only 13. Tracking scales with size: h1 56px/-2.1px, h2 48px/-1.68px, h3 24px/-0.48px. Limit, stated plainly: Inter with a 56/48/24 jump is not a modular scale, so the craft lives in the tracking, not the face

### Accent budget: blue only where the trial is asked for
- **Trigger**: When a page with ~18 sections and 4 always-visible CTAs risked turning every button into a shout
- **Decision**: Saturated blue #1963EF spent on the primary trial button only, every other CTA black, ink or white, over painting nav, eyebrows, cards and icons in brand color
- **Reason**: A visitor scanning a long page learns within one screen that "blue = start", so the conversion target is findable again at any scroll depth without re-reading
- **Evidence**: Blue fill covers 0% of measured background area (10 nodes). Nav CTA is a #000 pill, sticky-bar CTA a #121926 pill, dark-band CTA a white pill; only the hero CTA is blue and glows. Brand red appears exactly twice: the logo and the full stop of "sitio." in the h1

### Warm paper, cool ink, hairline cards
- **Trigger**: When grouping ~40 feature cards without the page reading like a dashboard of floating boxes
- **Decision**: Warm stone surfaces (#FAFAF9, #F5F5F4) edged by a 1px inset hairline #ECEAE6 and a 4%-opacity ink-tinted shadow over gray cards with visible drop shadows
- **Reason**: Flat warm cards read as paper on a desk, separated but not lifted, so the eye stays on the product fragment inside each card rather than on the card chrome
- **Evidence**: Card shadow `inset 0 0 0 1px #ECEAE6, 0 1px 2px rgba(18,25,38,0.04)`: the shadow is tinted toward text ink #121926, not black. Text ink is cool navy while surfaces lean warm. Nesting holds 18-20px cards > 12px tiles > 8px/pill chips. Only two full-bleed color changes (#0F1117 scanner and pricing bands) in 17,000px

## Storytelling lens (for minion_site)

- **Narrative arc, top to bottom (job → single ask)**:
  1. Promo strip: urgency ("14 días gratis… 50% de descuento durante 3 meses") → start trial, or call Ventas.
  2. Hero "Facturación y mucho más. Todo tu negocio en un solo sitio.": name the entry job (invoicing) and the whole-business promise in one breath → "Empieza gratis" (secondary "Pide una demo").
  3. Interactive product simulation: let the visitor touch the product before signing up → explore the modules.
  4. Client logo strip: "others like me use it" → none.
  5. "Lleva tu empresa hablando con ella" (Holded + your AI): the new capability, shown as a chat that answers "¿Qué facturas tengo sin cobrar?" → "Ver preguntas".
  6. "Factura. Cobra. Cierra.": the core money loop as three verbs → "Explorar facturación/contabilidad/tesorería".
  7. "Escanea y olvídate" (dark band): one hated chore removed → "Empieza gratis".
  8. Stats band (+900.000 users, 40 h, 160x, 80%): scale proof → none.
  9. "Holded en acción" video: from spreadsheets to one place, "Listo en minutos. Sin consultores ni proyectos eternos." → watch.
  10. "Empieza facturando, haz crecer tu negocio" (eyebrow "UN NUEVO TIPO DE ERP"): the growth path, "Fácil como una app de facturación, completo como un ERP." → "Ver todas las funcionalidades".
  11. "Todo esto, en la misma app" (Equipo, Inventario, Proyectos, CRM), then "Conectado con todo lo que usas": breadth on demand → developer page.
  12. "Por qué elegir Holded. Cinco razones, sin rodeos." plus "Lo que marca la diferencia": objection-shaped differentiators (setup in 9 minutes, compliance, scanner) → "Saber más".
  13. "¿Eres asesor?": side door for the accountant who influences the purchase → advisor page.
  14. "Lo que dicen nuestros clientes": stories with outcomes ("ahorra 3 horas cada semana") → none.
  15. "Sin letra pequeña. Siempre a tu lado.": risk reversal plus human support → chat or call Ventas.
  16. "Resolvemos tus dudas" (FAQ) → "Habla con nosotros".
  17. Pricing close (dark): "14 días gratis y la mitad de precio los 3 primeros meses" with an email field, "Pon tu email de empresa y entra. Sin tarjeta." → start trial.
  18. "NOTICIAS": a list of evergreen guides (Guía trabajador autónomo 2026, Calendario Fiscal 2026, plantillas de inventario en Excel) → read.
- **Legitimacy proof stack**: it uses third-party ratings (4,6/5 Capterra), scale (+900.000 usuarios), regulatory compliance ("Cumple con Verifactu y la AEAT", "Verifactu, SII… incluidos"), logos of client brands and banks (BBVA, Santander, CaixaBank), outcome metrics (40 h/mes, 160x, 80%), named testimonials and "by VISMA" ownership. It also shows live toasts ("Mireia, de Sitges, acaba de empezar su prueba gratis · hace 3 min"). **Transferable without customers**: the regulatory-fit claim (SUNAT/factura electrónica, but only for features that are actually live), integration and bank logos only where the integration is real, the labelled product simulation with demo data ("Cliente Demo"), and the "Sin letra pequeña" terms list if those terms are true policy. **Not transferable; would be fabrication**: ratings, user counts, time-saved metrics, client logos, testimonials, and especially the live signup toasts.
- **FAQ and "not ready to buy yet"**: every ask comes with a softer sibling. "Empieza gratis" is paired with "Pide una demo" in the hero and in the sticky bar. The FAQ opens with the cost question ("¿Es gratis?" answers with the 14 days, no card and a 15 € price) and sits beside "Habla con nosotros" (chat or phone). A "¿Te ayudo?" chat bubble stays visible on every screen. The bottom "NOTICIAS" block offers practical guides and Excel templates instead of a newsletter: the page has **no newsletter signup at all**. The not-ready visitor is captured with useful content, not an email list.
- **Plain language for non-technical owners**: headlines are imperative verbs in the "tú" form about chores the owner already does ("Factura. Cobra. Cierra.", "Escanea y olvídate", "Pregunta como hablarías"). The only jargon, "ERP", appears once, as an eyebrow, and is translated immediately ("Fácil como una app de facturación, completo como un ERP."). Reassurance copy names fears directly ("sin permanencia", "sin consultores ni proyectos eternos", "Personas reales, en tu idioma"). FAQ questions are written in the owner's voice ("¿Sirve para autónomos?", "¿Se conecta con mi banco?").
- **Staged growth is already Holded's spine**: section 10, "Empieza facturando, haz crecer tu negocio", says that the first job is small and that the same data grows into a full ERP. That is the closest reference anywhere for Minion's ERP → CRM → RPA order. Minion can make the stages explicit, numbered and in order where Holded implies them, and attach one plain verb per stage (organiza tu negocio → organiza a tus clientes → automatiza).
- **Mobile behavior**: at 390px the hero stacks the two CTAs full-width (blue fill above, outlined below) and collapses the proof row to two items: the Capterra stars and a green "Cumple con Verifactu y la AEAT" pill. The user count is dropped. On a phone, Holded keeps one rating and one compliance claim, the two a cautious owner checks first. For Minion the honest equivalent is a single compliance or "your data stays yours" claim.
- **Caution, density**: 18 sections and four persistent CTA surfaces (promo strip, sticky header, floating bottom bar, chat bubble) suit a mature brand with abundant proof. A proof-light Minion should cut the arc to about 7 sections (hero, labelled simulation, the three-stage method, one chore removed, terms and support, FAQ, close plus guides) rather than copying the length.
