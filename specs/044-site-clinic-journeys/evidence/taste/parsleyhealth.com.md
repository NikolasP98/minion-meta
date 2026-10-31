# Design Map

Source: https://www.parsleyhealth.com (1440x900, single page, scrollHeight 10,429px). A newsletter modal and a sticky announcement bar overlay the page; modal-covered lower sections were verified at y=1500 and y=3000 only. Values marked ~approx are read from screenshots.

## Spacing Scale
- Base unit 8px. Observed: 4, 6, 8, 12, 16, 24, 32, 40, 48, 56, 64, 80, 96, 120px
- Most frequent: 8px (101), 24px (95), 16px (61), 32px (47), 12px (31), 120px (18)
- Container side padding 160px at 1440 (footer 120px 160px); nav padding 16px 57px
- Card padding 24px, card gap 16px, card margin 0 24px 32px 0
- Two-column grid gap 96px (504.5px + 504.5px)

## Font Hierarchy
- h1: Teodor 300, 64px / 71.68px, tracking -1.28px
- h2: Teodor 300, 48px / 53.76px, tracking -0.96px
- h3: Teodor 300, 38px / 41.8px, tracking -0.38px
- Lead body: EuclidCircularB 500, 21px / 29.4px
- UI text: EuclidCircularB 400, 18px and 16px; meta 14px (64 uses, most common size)
- Buttons: EuclidCircularB 500, 16px, tracking -0.16px, padding 16px 32px
- Eyebrows: uppercase tracked, 11-12px, weight 500
- Weights in use: 500 (95), 400 (82), 300 (18), 700 (1), 600 (1)

## Color Palette
- #F8F6F2 page background (35.8% area), warm off-white
- #284849 ink: headlines, nav bar, primary buttons, dark pricing section (17.9% area; text on 73 elements)
- #132D2E footer and deepest ground
- #EBF2F0 pale green-gray section tint (16.4% area)
- #C1E5DB announcement bar, comparison-table highlight column
- #6FB29F sage accent: timeline dots, secondary fills
- #4A786A link and secondary button fill; text on 16 elements
- #333333 body copy (31 elements)
- #FCFBFA modal surface
- #C77B3B ~approx price-note accent ("HSA/FSA eligible")
- #E8D4B9 ~approx hero ground, behind photograph
- Neutrals: #F8F6F2 and #EBF2F0 tinted warm/green; #333333 is the only pure gray

## Image Ratios
- Hero: 1.90:1 (1440x758), full-bleed photo with text overlay on left
- Feature: 1:1 (599x599), 4:3 (599x449), 1.38:1 (618x449), rendered 505-609px wide
- Portrait: 0.63:1 (714x1125)
- Card: 1.13:1 (448x395), radius 16px
- Thumbnails 221px wide, 1:1 and 0.92:1

## Component Tokens
- Radius: 9999px (40 elements: buttons, nav CTA, inputs), 12px (12), 16px (6), 2px (5)
- Shadows: ring 0 0 0 2px #F8F6F2 (6); modal-type 0 25px 50px -12px rgba(0,0,0,0.25) ~approx (2); inset 0 0 0 1px #284849 outline button (1). Plain black rgba, single layer; no tinted shadows
- Primary button: #284849 fill, white 16px/500 text, pill, 16px 32px padding
- Secondary button: transparent, 1px #284849 inset ring, pill (hero "Join now"); fill variant #4A786A ("Join today")
- Nav: 82px tall bar in #284849 under a 58px #C1E5DB announcement bar; white pill "Join now"
- Grid: 2 columns at md, gap 96px, 13 grids on page; content width ~1120px
- Section gap: 80-120px padding between ground-color blocks; no divider lines
- Text alignment: left in hero and cards; centered section headings ("Two ways to get started") and comparison table
- Motion: color/background/border-color 0.15-0.2s cubic-bezier(0.4,0,0.2,1); transform+opacity 0.3s ease-out; box-shadow 0.5s
- Interaction: :focus-visible present; prefers-reduced-motion handled

---

# Taste DNA

### Serif Voice, Sans Utility
- **Trigger**: When a medical brand had to sound like a person who listens, while still hosting pricing, nav and form UI.
- **Decision**: Set every headline in Teodor 300 (a light serif) at 64/48/38px with negative tracking, over a single geometric sans for everything.
- **Reason**: Patients arriving with chronic symptoms read a light serif as a considered voice; the sans (EuclidCircularB) is kept for the places they must act, so tone and function never share a typeface.
- **Evidence**: Teodor on 24 elements vs EuclidCircularB on 891; h1 64px/71.68px weight 300, tracking -1.28px; h2 48px, h3 38px (~1.26x steps); body 21px/29.4px weight 500.

### Green-Black Instead of Black
- **Trigger**: When choosing the ink and the inverse surface for text, nav, buttons and footer.
- **Decision**: Used one deep teal-green #284849 as text, nav bar, primary button and dark section, and tinted every light neutral warm (#F8F6F2), over pure black on pure white.
- **Reason**: A clinic selling slow, root-cause care avoids the sterile white-and-black of urgent care; one ink for text and fill makes buttons and headlines feel like the same hand.
- **Evidence**: #284849 is text on 73 elements and 17.9% of background area; #F8F6F2 covers 35.8%; footer #132D2E; tint #EBF2F0 16.4%; #333333 is the only gray.

### Pills Only for Actions
- **Trigger**: When many elements could be rounded: buttons, inputs, cards, tables, modal.
- **Decision**: Gave full-pill radius (9999px) to buttons, nav CTA and inputs only, and kept content panes at 12-16px or square, over rounding everything the same.
- **Reason**: Pill shape reads as "press here" before the label is read; square-cornered pricing panels stay quiet so the price copy, not the box, carries the weight.
- **Evidence**: 40 elements at 9999px, 12 at 12px, 6 at 16px, 5 at 2px; pricing panels at y=3000 are square on #F8F6F2; outline button is an inset 1px #284849 ring.

### Flat Surfaces, Color Blocks Do the Layering
- **Trigger**: When separating hero, insurance, pricing, comparison and FAQ sections on a 10,429px page.
- **Decision**: Separated sections by switching ground colors (#F8F6F2, #284849, #EBF2F0, #C1E5DB) with 80-120px padding, over card shadows, divider rules or illustration. Restraint: no card drop shadows, no decorative gradients outside the photographic hero, no illustration.
- **Reason**: Long clinical pages with prices and tables lose readers at every border; a full-width color shift marks "new topic" without adding lines to parse.
- **Evidence**: only 2 non-ring shadows in the DOM (modal-type); spacing tokens 80/96/120px; footer padding 120px 160px; dark pricing section #284849 with #F8F6F2 panels; comparison highlight column in pale #C1E5DB range.
