# minion-ai.org: taste capture (baseline)

Source: https://www.minion-ai.org/ captured 2026-10-24 at 1440x900 and 390x844 (headless Chromium, Spanish locale). Dark theme is the site default; the light theme behind the sun toggle was not captured. This is the current production site, measured honestly as the baseline for spec 040. The principles below describe what it chose, not what it should choose. The owner's verdict on it is "terrible and non-friendly"; the last section looks at why.

Evidence: `minion-ai.org-1440-viewport.jpeg`, `minion-ai.org-1440-full.jpeg` (5389px tall, ~6 screens), `minion-ai.org-390-viewport.jpeg`, `minion-ai.org-390-full.jpeg` (7342px tall, ~8.7 screens), `minion-ai.org-dom.json`.

Extractor notes: DOM `h1` reports 16px/400 because the visible headline is built from per-letter split-flap tiles (70.4px glyphs) inside it. `sectionGaps` came back empty, so vertical rhythm is read from the screenshots (~approx).

# Design Map

## Spacing Scale
- Base 4px. Values in use: 2 / 4 / 8 (127 uses) / 12 / 16 (86) / 24 (28) / 32 / 48
- 24px: board row and panel padding; 32px: nav horizontal padding; 48px: hero column gap
- Page side margin 80px at 1440 (content 80-1360, 1280px wide); 16px at 390
- Between sections: ~30px from the last caption to a 1px hairline, ~30px from hairline to the next h2 (~60px total, ~approx)
- Letter-spacing values that look like spacing in the DOM: 1.2px (0.1em on 12px, 136 uses), 3.584px (0.08em on h2), 7.04px (0.1em on flap tiles)

## Font Hierarchy
- Families: Barlow Condensed (headings, labels, buttons, board rows; 245 nodes) and Barlow Semi Condensed (paragraphs; 309 nodes)
- Hero split-flap tiles: 70.4px / 700 / uppercase / 7.04px tracking, one letter per #1B1B1E tile, 4 lines at 1440 (LOS / AGENTES / TRABAJAN / TÚ DECIDES)
- Final CTA heading: 51.2px / 700 / uppercase, centered
- h2 section heading: 44.8px / 700 / line-height 41.216px (0.92) / 3.584px tracking / uppercase
- Price headline: 41.6px / 700 / uppercase (GRATIS, A MEDIDA, A MEDIDA)
- Step body and pricing intro: 16px / 400 / sentence case
- Body paragraph: 14px / 400 / line-height 19.6px (1.4) / #B6BBC2 / max-width 324.6px in hero, ~440px in sections
- h3, board rows, buttons, nav, captions, badges: 12-14px / 600 / uppercase / 1.2-1.4px tracking
- Distribution: 12px x116, 14px x93, 16px x27, 70.4px x27, 44.8px x6, 41.6px x3, 51.2px x1. No size between 16px and 41.6px (2.6x jump)

## Color Palette
- `#0D0D0F`: page background, outer bands, text on amber
- `#141417`: section surface (95.8% of painted area)
- `#1B1B1E`: board panels and flap tiles (2.3%)
- `#F2F2F2`: primary text, 16.4:1 on #141417
- `#B6BBC2`: body paragraphs, 9.5:1
- `#8D939B`: labels, captions, column headers, 5.9:1
- `#FFB400`: amber lamp (1.9% of area): TÚ DECIDES tiles, FALTA TU OK, Aprobar, primary CTAs, EMPEZAMOS AQUÍ chip, Negocio card border, pricing badge outlines; #0D0D0F on it = 10.9:1
- `#4ADE80`: LISTO status cells and pricing check marks only
- `#FCA5A5`: ANULADO status only, with strikethrough on the whole row

## Image Ratios
- Only image: mascot.png, 0.95:1, rendered 24px in nav and footer
- No photos, illustrations or product screenshots anywhere on the page
- Hero board panel (no image): 631x311, 2.03:1

## Component Tokens
- Radius: 2px (122 uses: buttons, chips, flap tiles), 4px (14 uses: board panels, hero CTA pair). Nothing rounder
- Shadow: one, `0 4px 12px 0 rgba(0,0,0,0.4)`, single layer, plain black, on board panels only (11 uses); barely visible on #141417
- Grid: hero 2 columns 601px / 631px, gap 48px; sections single column with heading block ~380-540px wide; pricing 3 equal cards, ~16px gap; footer 3 link columns
- Buttons: 12px / 600 / uppercase / 1.2px tracking; ~36px tall at both widths (~approx); filled amber primary, 1px gray-outline secondary
- Board panel: 1px border, header row in #8D939B 12px caps, rows separated by hairlines, status cell flush right as letter-spaced flap glyphs
- Motion: 150ms `cubic-bezier(0.2, 0, 0, 1)` on color, border-color, background, transform (one rule uses `all`); `prefers-reduced-motion` respected; `:focus-visible` present
- Section separators: 1px hairline plus a background step #0D0D0F / #141417; no illustrations or dividers

---

# Taste DNA

### Departure-board voice over shop-counter voice
- **Trigger**: When choosing how every label, heading, row and button should sound and look
- **Decision**: Chose one condensed family set in uppercase with 0.08-0.1em tracking for every non-paragraph role over a sentence-case pairing where headings and actions read like normal speech
- **Reason**: Uppercase tracked condensed type reads as signage, so the page feels like an operations board that is already running. The cost: someone scanning on a phone reads uppercase tracked text letter by letter, and the voice sounds like a machine announcing rather than a person explaining
- **Evidence**: h2 44.8px/700 uppercase with 3.584px tracking; buttons, nav, board rows and captions at 12px/600 uppercase with 1.2px tracking (12px is the most frequent size, 116 uses); flap tiles 70.4px with 7.04px tracking; only body paragraphs and pricing bullets are sentence case

### One board component carries the whole story
- **Trigger**: When each section needed something to show next to its heading
- **Decision**: Chose to reuse the same bordered board panel (#1B1B1E, 4px radius, hairline rows, status cell flush right) for method, flow, approval and onboarding over a different visual per section (a screenshot, a diagram, a photo of a real shop)
- **Reason**: Repeating the board teaches the product's core object once and keeps the metaphor intact from top to bottom. It also gives every section the same silhouette (uppercase heading, small gray paragraph, full-width table), so after the second one the eye finds nothing new
- **Evidence**: 4 of 6 content sections end in a full-width board (3, 6, 1 and 3 rows); FAQ is a 9-row list of the same shape; the only shadow sits on these panels; radius set is 2px/4px only

### Amber is the lamp for a human decision
- **Trigger**: When deciding where the only warm color on a near-black page goes
- **Decision**: Chose to reserve #FFB400 for moments that need a person (TÚ DECIDES, FALTA TU OK, Aprobar, the primary CTA, the EMPEZAMOS AQUÍ step) and give finished machine work a small green LISTO over spreading the accent across headings, icons and section fills
- **Reason**: When the one warm color appears only where the owner has to act, the page says "you stay in control" without a sentence: the eye goes to the amber, and the amber means you. The rule leaks where amber also outlines date badges (LANZA Q3 2026, BAJO ACUERDO) that ask nothing of the reader
- **Evidence**: #FFB400 covers 1.9% of painted area against #141417 at 95.8%; #4ADE80 only on LISTO and check marks; #FCA5A5 only on ANULADO; amber outlines also on three pricing badges and the Negocio card

### No pictures, no people, no numbers
- **Trigger**: When the page needed proof that the product is real and made for someone like the reader
- **Decision**: Chose simulated board rows, each captioned as an example, as the only proof over product screenshots, photos of businesses, customer logos or metric counters
- **Reason**: With no real testimonials or metrics yet, invented ones would be a lie, and the captions say so openly. The trade: a small-business owner never sees a face, a shop, a phone screen or a price, so nothing on the page looks like their own day
- **Evidence**: one image on the page, the 24px mascot; captions "Tablero de ejemplo. Tus filas son las tuyas." and "Un ejemplo funcional. Nada aquí es un registro de cliente."; price headlines GRATIS (beta) and A MEDIDA twice, no amount in soles; no photo, illustration or screenshot in 5389px of page

## Baseline friction (why it reads unfriendly)

- **The phone's first screen is about the machine, not the owner.** At 390x844 the visitor sees a 72px header with four controls (EN, theme, EMPEZAR, menu), then "LOS AGENTES TRABAJAN / TÚ DECIDES" in tracked flap tiles. The one sentence that states the value (order the business, then customers, then automate) is 14px #B6BBC2 under it, followed by a 12px uppercase tracked footnote about audit logs. "Agentes" is the first noun; the owner's business, money or time never appear in the headline.
- **Almost everything shouts in small caps.** h2 is uppercase with 3.584px tracking; buttons, nav, h3, every board row, captions and FAQ questions are 12-14px/600 uppercase with 1.2-1.4px tracking. 12px is the most used size on the page (116 nodes). Uppercase condensed text with wide tracking is read letter by letter, which is the opposite of a quick skim on a phone.
- **Jargon a non-technical owner has to decode.** The `<title>` reads "El ERP nativo para agentes. Un tablero para personas y agentes." The page uses ERP, CRM, RPA, agentes, lead, back office, embudo, atribución, tickets, módulos, conectores, "operado por agentes", and in pricing Workforce, Brains, Pulse, "Gateway dedicado o self-hosted". The footer's Recursos column is GitHub and Contribuir, which speaks to developers.
- **Every section has the same silhouette.** Left-aligned uppercase h2 (~380-540px wide), a ~440px gray 14px paragraph, then a full-width bordered table. At 1440 the right ~55-65% of the 1280px container beside each heading is empty #141417. Sections are ~60px apart with only a hairline between them, so 6 screens (8.7 on a phone) read as one continuous dark list.
- **The main action has six names and the middle has none.** Labels across the page: Empezar, Recibe tu plan, Consigue tu plan gratis, Entrar a la beta, Hablemos, Escríbenos por WhatsApp. Hero has 2 CTAs, the four story sections have 0 real ones, pricing 3, final band 2. The approval demo shows Aprobar/Rechazar buttons that look clickable but are an example.
- **Pricing never says how much.** Cards read GRATIS (with a LANZA Q3 2026 badge, already stale on 2026-10-24), A MEDIDA, A MEDIDA. The paid card's button says "Consigue tu plan gratis". The FAQ asks "¿Qué incluye el plan empresarial?" and "¿Qué viene en el plan miembros?", names that match none of the three cards (Personal / Negocio / Escala).
- **Small tap targets on the phone.** Both hero CTAs are ~36px tall at 390px (~approx from the screenshot), and the EN and theme buttons ~30px, under the 44px commonly used as a minimum for thumbs.
- **The status code is hard to read at a glance.** The split-flap seam runs through every status glyph, so the amber FALTA TU OK cell looks struck through, next to the ANULADO row that really is struck through. LISTO is 12px green letters spread across ~60px. The metaphor asks the reader to learn a board's grammar before getting the point.
- **No human anywhere.** The only image is a 24px mascot. No owner, shop, staff, phone or receipt appears, so a clinic or bodega owner has nothing to recognise as their own life.

What works and should be kept:

- **The method section says the product truth in plain words.** Step titles are "Ordena el negocio / Ordena tus clientes / Automatiza lo que ya funciona", with EMPEZAMOS AQUÍ / DESPUÉS / LUEGO chips and ERP / CRM / RPA demoted to 12px gray tags at the right. The order is explicit and the acronyms are secondary.
- **"Nada toca el dinero sin ti" is the clearest block on the page.** One concrete card in local currency (a S/ 240 refund against a S/ 200 limit) with Aprobar in amber. It shows the control promise instead of claiming it, and it is where the amber-means-you rule works best.
- **Honest and accessible base.** Example boards are captioned as examples (no fake testimonials or metrics). Contrast passes everywhere measured (body #B6BBC2 at 9.5:1, tertiary #8D939B at 5.9:1, ink on amber at 10.9:1), `:focus-visible` exists and `prefers-reduced-motion` is respected.
