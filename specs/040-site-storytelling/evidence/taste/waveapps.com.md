# waveapps.com

Source: https://www.waveapps.com/ (captured 2026-10-24, en-US, 1440x900 and 390x844).
Fallback reference: https://gusto.com/ returned a Cloudflare "Performing security verification" challenge to the headless browser, so it was not analyzed.
Capture caveats: a TrustArc cookie banner covers the bottom ~80px of the desktop viewport and ~40% of the mobile viewport. The autoplay feature videos rendered as blank white panels in headless Chromium. The proof headline reads "Over 350,000" on desktop and "Over 300,000" on mobile.

# Design Map

## Spacing Scale
- Base unit: 8px (4px half-step)
- Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px
- Most used: 16px (x56), 32px (x28), 24px (x23), 8px (x19), 48px (x12), 96px (x10)
- Section bands: ~96px vertical padding
- Outliers: 7px, 10px, 20px (button internals)

## Font Hierarchy
- Display: Stix Two Text Variable (serif), weight 400, -1px tracking
  - 72px / 75.6px: hero ("Clear books. Confident decisions.")
  - 56px: centered section headlines
  - 42px: video testimonial pull-quote
  - 30px: announcement bar headline
- UI and body: Dinero Sans
  - 32px: FAQ heading, testimonial-card quote
  - 24px / 31.2px, 700: feature and benefit titles (h3/h4)
  - 20px / 28px, 400: hero lead paragraph
  - 16px, 600: nav, buttons, FAQ questions
  - 14px, 400-600: card body, eyebrow (uppercase, tracked), captions
- Scale steps: 14 / 16 / 20 / 24 / 32 / 42 / 56 / 72, roughly x1.25 to x1.33 per step
- Line length: no `ch` max-width; text measure is set by column width (~600px hero lead)

## Color Palette
- `#F9F4F1`: page background, warm cream
- `#001B66`: serif headline text, dark bands, footer (24.3% area)
- `#CCE9FF`: feature band (23.8% area)
- `#0040FF`: primary pill fill, announcement bar, proof band with grid texture (14.4% area)
- `#E8AAFF`: secondary pill, final CTA band, testimonial card (6.9% area)
- `#76C3FC`: persona band, testimonial card
- `#FF6B00` (~approx): testimonial card
- `#232426`: body text
- `#8E44DD` (~approx): eyebrow label "WAVE: SMALL BUSINESS SOFTWARE"

## Image Ratios
- Hero product screenshot: 1.39:1 (840x604), right column, cropped at the band edge
- Alternating lifestyle photo with UI overlay: ~1.09:1
- Video testimonial portrait: ~0.87:1
- Persona portraits: ~0.70:1
- Blog illustrations: ~2:1, flat two-tone blue/lilac drawing style
- Avatars: 1:1, 60px, circular

## Component Tokens
- Radius: 40px pills (all buttons), 32px testimonial cards and video panel, 24px advisor card and photos, 16px / 12px tiles, 8px small chips, 50% avatars and icon buttons, 0px blog cards (1px border)
- Shadows: `rgba(0,0,0,0.25) 0 2px 12px 2px`, `rgba(0,0,0,0.2) 0 4px 16px 0`. Both single-layer, plain black, on floating media only
- Container: 1280px (80px margins at 1440); inner 1024px for feature and benefit rows
- Grids: 2-col 498px + 28px gap; 3-col testimonials and blog; 4-col personas; 6 compare tiles (6-up at 1440, 2-col x3 rows at 390px)
- Buttons: primary filled `#0040FF` pill, 16px/600 white, ~16px 24px padding; secondary outline pill (2px `#0040FF`); tertiary text link with arrow icon
- FAQ: 6 rows, question 16px/600, `#E0A060`-ish (~approx) 1px divider, circled-plus icon at right, "Expand all" link
- Motion: opacity/transform 0.2s, all 0.3s; `:focus-visible` present; no `prefers-reduced-motion` query detected
- Alignment: hero left; section headlines centered; feature rows, personas, FAQ left; footer left

---

# Taste DNA

### Serif speaks the feeling, sans states the fact
- **Trigger**: When the page had to address a worried owner and also list concrete tool features.
- **Decision**: They chose a two-voice system, with Stix Two serif at weight 400 for every emotional headline at 56-72px and Dinero Sans 600/700 for every functional label at 14-24px, over the single geometric sans that most accounting-software homepages use at every level.
- **Reason**: An owner who fears bookkeeping reads a book-like serif line ("Clear books. Confident decisions.") as a person reassuring them, and a bold sans line ("Painless payroll") as the tool doing a job. Keeping the voices apart tells them which lines are promises and which are features.
- **Evidence**: Stix Two covers 17 nodes, all headlines, all weight 400, -1px tracking. Dinero Sans covers 648 nodes, with h3/h4 at 24px/700. Weights 600 (x72) and 700 (x57) appear only in the sans.

### A new color is a new chapter
- **Trigger**: When a ~10,000px homepage (12,200px on mobile) had to carry 11 distinct sections to a non-technical reader.
- **Decision**: They chose to change the full-bleed background on almost every section (cream, sky, navy, blue grid, cream, sky blue, cream, lilac, navy: six hues) over one neutral canvas with cards or divider rules.
- **Reason**: A reader skimming on a phone knows they have reached a new topic from color alone, before reading a word. The bands work as chapter breaks the owner never has to parse.
- **Evidence**: Background area shares are `#001B66` 24.3%, `#CCE9FF` 23.8%, `#0040FF` 14.4% and `#E8AAFF` 6.9%. Neither screenshot shows a horizontal rule between sections. Bands use ~96px padding, and the DOM extract finds no card containers (`cards: []`): the band does the grouping.

### Flat paper, no floating panels (restraint)
- **Trigger**: When the page needed to look trustworthy for money software while already running six saturated band colors.
- **Decision**: They chose flat surfaces on a warm cream ground (`#F9F4F1`), only two single-layer black shadows on the whole page, and 1px-border square blog cards, over elevated multi-shadow cards and gradient hero backgrounds.
- **Reason**: With six bright fills already competing, any depth effect would add a second layer of noise. Flat color reads like printed stationery the owner already trusts, and the warm off-white avoids the clinical white of a banking dashboard.
- **Evidence**: Neither screenshot shows a gradient. Texture comes from a flat grid pattern on `#0040FF` and hand-drawn strokes on the lilac band. The two shadows sit only on floating media (the hero screenshot and the overlay).

### One ask, one shape, repeated at every depth
- **Trigger**: When readers would be ready to start at very different scroll depths.
- **Decision**: They chose one primary verb in one shape (a 40px-radius pill at 16px/600 reading "Get started now" or "Get started for free", in 5 places) and demoted every other ask to outline pills or underlined text links, over a menu of competing CTAs such as demo, pricing and video.
- **Reason**: An owner who is not ready yet should never have to choose between buttons. When they are ready, the same filled pill is waiting in whatever band they are in.
- **Evidence**: Primary pills appear in the nav, the hero, after the proof band, in the final band and in the mobile header, filled only with `#0040FF` or `#E8AAFF`. The secondary asks are the "Log in" outline pill, a "Learn more about Advisors" arrow link and the "Wave vs." outline tiles. The homepage shows no price figures and no demo booking.

## Storytelling lens (for minion_site)

- **Narrative arc, top to bottom (job → single ask):**
  1. Announcement bar (`#0040FF`): community belonging ("Your business, your voice") → "Discover what's next".
  2. Hero: an outcome promise, a 4.5 Google rating, a real dashboard screenshot greeting "Good morning, Erica" → "Get started now".
  3. "More reasons to love Wave": four features, each named after the pain it removes ("No sweat accounting", "Painless payroll") → "Learn more".
  4. "Ask an expert / Get by with a little 1:1 help": a human safety net from a "(non-judgmental)" in-house team → "Learn more about Advisors".
  5. "Focus on your business, not your books": one video testimonial → watch.
  6. "Over 350,000 small businesses trust Wave" plus three named quote cards → "Get started for free".
  7. "Spend more time on what you love": three alternating relief rows ("Breathe that sigh of relief", "Make it without the fake it", "Be the wiz of your biz") → no button.
  8. "Built for small business owners like you": four personas (freelancer, solopreneur, contractor, consultant), so readers can see themselves → no button.
  9. "From the blog": six guides plus "Browse by category" → read.
  10. "How does Wave compare…": six "Wave vs." tiles → compare.
  11. FAQ → expand.
  12. Final lilac band, "You didn't start your business to be a bookkeeper" → "Get started for free".
  13. Footer: education centers, calculators and templates.
- **Legitimacy stack:** star rating above the headline; a customer count; named quotes with company names; a candid disclosure under the video ("received a complimentary annual subscription for their honest feedback"); real product UI in the hero and in the photos; real advisor faces; a BBB "Accredited Business" badge; a "System status" link; and a security FAQ answer naming 256-bit SSL and PCI-DSS. The count is inconsistent between viewports (350,000 vs 300,000), which shows how easily a number can undercut trust.
- **FAQ as an objection list, in the owner's own words:** "Is Wave's software something I need to install?", "What if I just want to try Wave to see if it works for my business?", "Can I change plans easily?", "Is my data secure?", "Do you provide customer support?", "Is it easy to cancel for any reason?". Each question is a fear, not a feature, and the answers are plain ("You bet!").
- **"Not ready yet" paths:** a free Starter plan answers "just want to try"; six guides plus seven category links act as a free education layer; the compare tiles serve the evaluator; the Advisors section offers a person; the footer adds calculators, invoice templates and education centers. None of these paths needs a sign-up, and the one filled button is still there when the reader is ready.
- **Plain language for non-technical owners:** features are named by the feeling they remove ("No sweat", "Painless", "without worrying about the complicated legal stuff"). The page says outright that it is "built for small business owners and solopreneurs at every stage, not accountants". The serif headlines speak like a person ("Clear books. Confident decisions."), and only the sans labels name tools. For a Spanish-first Peru page, the equivalent is to drop ERP/CRM/RPA from headlines and lead with verbs (ordena tu negocio → ordena a tus clientes → automatiza), with colloquial phrasing checked by a native Peruvian reader.
- **Transferable to Minion with no customers (honest proof):** real product screenshots of the hub; feature rows named by the pain removed; the objection-style FAQ (install? try first? is my data safe? can I leave and take my data? who helps me?); concrete security and data facts; a status page; a human-help section, but only if a real person is on WhatsApp; guides, but only once real articles exist; and compare tiles framed against the status quo (cuaderno, Excel, WhatsApp chats) instead of competitors. Persona columns can work as clearly labeled archetypes ("bodega", "salón", "consultorio") without names or photos of real people.
- **Not transferable without real customers, so do not fabricate:** star ratings, customer counts, named testimonial quotes and video testimonials, named persona photos, and third-party badges (BBB-style). Leave these slots out instead of filling them with placeholders. Wave's disclosure footnote is the standard to meet once real quotes exist.
- **Mobile behavior to copy:** the hero centers its eyebrow, rating, serif headline and lead at 390px, and the primary pill moves into the sticky header ("Get started now" next to the menu icon), so the ask stays visible while the hero's own button sits below the fold.
