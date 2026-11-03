# Design Map

Source: https://jane.app (home page, 1440x900, 7052px tall, single page analyzed; extractor reported no errors).

## Spacing Scale
- Base unit 8px; observed values: 4px (24 uses), 8px (49), 12px (11), 16px (46), 32px (9, grid gap), 40px (18)
- Off-grid values: 22.46px (list gap, 18 uses), 89.08px (section padding, 12 uses), 70.77px, 191.5px
- Method: `gap` on lists/grids (ul gap 22.46px, button inner gap 4px); h2 margin-top 16px
- Section rhythm ~89px padding between content bands; sections separated by background tint changes, not rules

## Font Hierarchy
- h2 section: fields, 66.6px / 73.3px line-height, weight 500, tracking -0.208px
- h2 secondary: fields, 55.4px (5 uses) and 34.5px (2 uses), weight 500
- h3: fields, 28px / 33.6px, weight 500
- Lead: Proxima Nova 20px (4 uses); body-large 18px (7)
- Body: Proxima Nova 16px / 24px, weight 400 (67 uses), paragraph max-width 850px
- Eyebrow / small: Proxima Nova 14px, weight 500, uppercase (e.g. "PRACTICE MANAGEMENT SOFTWARE & EMR")
- Weights: 400 (79), 500 (26), 600 (2)
- Scale ratio: 28 -> 34.5 -> 55.4 -> 66.6 is not a fixed multiple; body steps 14/16/18/20/24

## Color Palette
- Page background: #FFFFFF (23.3% area)
- Hero / section tint: #EAFAFB (32.1% area); card tint #CDF5F7 (18.9%); alt tint #D1F4F5 (3.3%)
- Accent (buttons, links, eyebrows, footer headings): #027989
- Deep teal (newsletter band, footer CTA): #025968 (17.1% area)
- Bright teal (logo, product-UI mock): #00A5B0
- Text primary (display headings): #04070A
- Text body: #54575A (58 uses)
- Neutrals: #54575A is a slightly cool gray; #04070A tinted near-black blue. Tints are all toward cyan/teal

## Image Ratios
- Hero product mock: 16:9 (1439x810), rendered 1280px wide
- Feature folder-tab screenshots: 1.01:1 (1439x1421), rendered 569px wide
- Feature thumbnails: 1:1 (~148px)
- Testimonial photo: ~1.5:1 landscape (approx, from screenshot), play button 64px circle (#025968)

## Component Tokens
- Radius: 8px (buttons, inputs, 26 uses); 16px (testimonial and photo plates, 5); 50% (circular play button, avatar); joined input+button uses 8px 0 0 8px / 0 8px 8px 0
- Shadows: none (extractor `shadows: []`; screenshot shows none)
- Grid: 3 columns, 32px gap, 405.3px tracks (`div.core-group.alignwide`); content max ~1280px, nav and footer inset ~80px
- Buttons: primary filled #027989 white text 16-18px, ~42px tall; secondary 1px #027989 outline on white, same height; padding 8px 16px
- Nav: white bar, 1px bottom border (~#E5E5E5 approx), 66px tall, 18px Proxima Nova, chevron dropdowns, circular account icon
- Footer: 4 link columns, #027989 column headings, #54575A links
- Motion: transitions `background-color/color/border-color 0.15s`, `transform 0.15s ease-out` / `0.2s`, `width 0.25s`
- Interaction: `:focus-visible` rules present; `prefers-reduced-motion` rules present

---

# Taste DNA

### Serif Voice, Sans Tools
- **Trigger**: When selling clinical software to solo therapists and clinic owners who distrust enterprise tooling
- **Decision**: They chose a warm serif (fields, 66.6px / 500) for every headline and Proxima Nova only for UI and body over one sans family across the whole page
- **Reason**: A practitioner reading "Your patients have you, your practice has Jane" hears a person, not a vendor; the sans stays for scanning labels and forms where a serif would slow them down
- **Evidence**: h2/h3 family fields at 66.6px and 28px; body Proxima Nova 16px/24px; weights limited to 400/500/600; -0.208px tracking on large headings

### One Teal, Tinted Surfaces
- **Trigger**: When needing hierarchy and section separation without borders, shadows or multiple hues
- **Decision**: They chose a single teal hue at four lightness steps (#EAFAFB, #CDF5F7, #027989, #025968) for surfaces and actions over a multi-color palette with neutral gray panels
- **Reason**: Each tint reads as a different section while the brand stays one color; a clinic owner skimming the page always knows teal means "act here"
- **Evidence**: bg areas #EAFAFB 32.1%, #CDF5F7 18.9%, #025968 17.1%; buttons and links #027989; text #04070A and #54575A, no second accent hue

### No Shadows, Rounded Plates
- **Trigger**: When grouping testimonials, features and the newsletter form into containers
- **Decision**: They chose flat tinted plates with 16px radius and 8px controls, zero box-shadows, over elevated shadowed cards (restraint)
- **Reason**: Depth would add noise on top of a busy product-screenshot hero; fill color alone separates blocks
- **Evidence**: extractor shadows empty; radius 8px (26 uses), 16px (5), 50%; testimonial plate #CDF5F7 beside a photo plate, no borders

### Product Screenshot As Hero
- **Trigger**: When the first viewport must prove the software is usable by non-technical staff
- **Decision**: They chose a full-width real scheduling UI mock (1280px, 16:9) under the headline with only two CTAs (filled "Sign up", outlined "Explore plans and pricing") over abstract illustration or a stock-photo hero
- **Reason**: Practitioners buy what they can picture themselves clicking; the calendar, appointment panel and chat bubble answer "what does a day look like" before any feature list
- **Evidence**: hero image 1439x810 rendered at 1280px; CTA pair at y~458 inside the first 900px; lead paragraph 18px at ~850px max-width
