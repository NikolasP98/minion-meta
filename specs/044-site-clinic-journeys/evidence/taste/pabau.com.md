# Design Map

Source: https://www.pabau.com (1440x900, full height 13,929px, single page). Extractor errors: none. Page loaded fully; the live-chat widget and a sticky 75px nav overlay lower screenshots.

## Spacing Scale
- Base unit: 4px; observed padding/margin/gap values by frequency: 10px (102), 16px (69), 8px (53), 12px (53), 14px (34), 20px (25), 4px (24), 28px (20), 24px (18), 32px (17), 60px (9), 100px (9)
- Not a strict 8px grid: 10px, 14px and 14.4px are the most frequent component values
- Section gap: 100px between sections 4-7; 270px before the footer wrapper
- Dark feature grid gap: 24px; footer horizontal padding: 24px
- Spacing method: `gap` on grids, margin 0 on h1-h3, p, ul, nav

## Font Hierarchy
- Families: Satoshi (1458 nodes, everything), DM Mono (33 nodes), Inter (10 nodes)
- h1: 64px / 700 / line-height 76.8px / letter-spacing -2.4px (centered, 890px wide)
- h2: 48px / 500 / 57.6px / -1.92px
- h5: 36px / 500 / 48px / -1px
- h3: 25.7px / 700 / 32.5px / -0.91px
- Hero subtitle: 20px, color #4A5565, centered, 2 lines
- UI default: 16px (107 nodes), 18px (41), 14px (36, body line-height 24px, weight 500), 15px (20), 13px (10)
- Weights: 400 (124), 500 (82), 700 (42), 600 (19)
- Scale ratios: 64 / 48 = 1.33, 48 / 36 = 1.33, 36 / 25.7 = 1.40; 25.7 to 16 = 1.6 (loose geometric, not a fixed modular scale)

## Color Palette
- Page background: #FFFFFF (21.7% of area); light tint section #EDF6FB (5.2%); hero fades to a lavender-blue wash with a dot-grid texture (visible in screenshot, ~approx #E9ECFF at y=800)
- Text: #1E1B18 (headings, warm near-black), #4A5565 (body), #344054 (secondary), #202020 (secondary button label)
- Primary CTA: gradient #0073FF to #0DA2FF, 1px border #0088FF, inset highlight #D2EAFF, label #FFFFFF
- Secondary button: bg #F3F4F6, border 1px #F3F4F6
- Logo/accent cyan: #54B2D3 (48 uses)
- Announcement bar: linear-gradient(90deg, #121D36 19.79%, #037CD2 67.12%)
- Dark AI section: #0B0B14, card border #202023, card fill rgba(255,255,255,0.01), text #EAECF0 / rgba(255,255,255,0.75)
- Footer: #121D36
- Neutrals: text grays #4A5565 and #344054 lean cool blue-gray (tinted toward blue); #1E1B18 leans warm; #F3F4F6 is cool

## Image Ratios
- Product screenshots (hero/feature): 1.69:1 (1144x677 source; rendered 756px to 1008px wide)
- Resource cover thumbnails: 0.71:1 (119px wide)
- Doctor portrait: 0.56:1 (230px wide)
- Mobile launch tile: 1:1 (242px wide)

## Component Tokens
- Radius: 4px (small controls), 10px, 12px (buttons, 20 uses at 10px, 13 at 12px), 16px (27 uses, most common), 20px, 24px (dark cards), 30px (pills), 100px (dark section bottom corners)
- Nested radius: dark section 100px, cards inside 24px, mockup frames inside ~20px
- Shadows: `0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)` (2 layers, pure black); `inset 0 1px 4px 2px #D2EAFF` (CTA); `0 0 0 1px rgba(255,255,255,0.18)` (dark ring); `inset 0 -32px 64px 1px rgba(255,255,255,0.08)` x2 (dark sheen); one 2-layer blue-tinted shadow `rgba(99,131,241,0.68) 0 1px 4px, rgba(43,173,212,0.25) 0 -1px 2.8px`
- Buttons: 16px / 500, radius 12px, padding 14px 20px, letter-spacing -0.25px or 0.3px; tag pills radius 30px, padding 4px 16px
- Nav: 75px tall, white; announcement bar above it 64px; links 16px/400
- Grid: dark feature grid 2 columns, 538px + 538px, 24px gap (`div.pabau-ai-scribe-grid`); 10 grid containers total; footer is a 4-column link list with 24px side padding
- Text alignment: hero, h2s in light sections and footer language row are centered; AI-section headings and body, footer links, and nav links are left aligned
- Motion: transitions `color 0.3s, border-color 0.3s`, `transform 0.4s`, `opacity 0.25s`, `transform 0.15s`, `transform 0.08s linear`; one `all`; no easing curves beyond defaults recorded
- Interaction: `:focus-visible` present; `prefers-reduced-motion` handled

---

# Taste DNA

### Product UI as the hero image
- **Trigger**: Selling clinical software to clinic owners who cannot picture a CRM from adjectives
- **Decision**: Chose real, dense product screenshots (1144x677, 1.69:1, 907-1008px rendered) tucked under a centered headline over illustration, stock clinic photography or abstract hero art
- **Reason**: A practice owner buying software judges it by whether the calendar and client card look usable on their own front desk, so the screen itself is the proof
- **Evidence**: Calendar, Online-Booking, Client-card and Automation images are all 1144x677; hero tab pills (Calendar, Online Booking, EMR, Workflows, Payments, Marketing) switch the screenshot; the first viewport already clips a screenshot at y=760 of 900

### One loud CTA, everything else gray
- **Trigger**: Two buttons side by side in the nav and hero, both pointing at a sales conversation
- **Decision**: Chose a single saturated blue gradient button (#0073FF to #0DA2FF, 1px #0088FF border, inset #D2EAFF highlight) next to a flat #F3F4F6 secondary, over two equally colored buttons or an outline pair
- **Reason**: The buyer is meant to take exactly one action, book a demo, while the tour stays available without competing for the eye
- **Evidence**: Both buttons share 12px radius, 16px/500 and 14px 20px padding; secondary has #F3F4F6 bg, #202020 text, no shadow; body text is #1E1B18 / #4A5565 and blue appears only on CTAs, the "4,000+" figure and the logo

### Tight, negative-tracked Satoshi headlines
- **Trigger**: A claim-led headline ("The only software your practice will ever need") that has to hold its own at 64px on a 1440px canvas
- **Decision**: Chose one geometric sans (Satoshi, 1458 of 1501 text nodes) with letter-spacing of about -3.75% on display sizes and ~1.2x line height over a serif/sans display-body pairing
- **Reason**: Tight tracking makes a two-line claim read as one block, and a single family keeps the page from looking like three vendors assembled it
- **Evidence**: h1 64px/700/-2.4px/76.8px; h2 48px/500/-1.92px/57.6px; h5 36px/500/-1px; h3 25.7px/700/-0.91px; DM Mono (33 nodes) and Inter (10 nodes) appear only in tags and embeds

### White page, one dark island (restraint)
- **Trigger**: A page with a heavy AI section (Scribe, safety checks, letters) that needs to feel different from the booking and billing sections without redecorating the whole site
- **Decision**: Chose a white #FFFFFF canvas with no section borders or card shadows on light areas, and a single #0B0B14 block with 100px bottom-corner radius and 24px-radius cards, over alternating tinted bands or a fully dark theme
- **Reason**: The AI features get a distinct space the eye notices by contrast alone, while everything operational stays in the neutral reading mode a clinic manager already trusts
- **Evidence**: White is 21.7% of measured area, #EDF6FB tint 5.2%; dark block is 1780px tall with 100px radius; dark cards are rgba(255,255,255,0.01) with 1px #202023 border, 24px radius, 2-column 538px + 538px with 24px gap; light sections are separated by 100px gaps and no rules
