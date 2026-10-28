# basecamp.com: taste capture

Source: https://basecamp.com/ captured 2026-10-24 at 1440x900 and 390x844 (headless Chromium, en-US). The capture tool emulates `prefers-color-scheme: dark` by default and Basecamp honors it, so these are **dark-theme** values; the light variant was not captured. Sizes are fluid (scaled to the viewport width) and are given as rendered at 1440px. The "Big numbers" section rendered a ~570px empty block, probably a live map/canvas that headless Chromium did not draw.

Evidence: `basecamp.com-1440-viewport.jpeg`, `basecamp.com-1440-full.jpeg`, `basecamp.com-390-viewport.jpeg`, `basecamp.com-390-full.jpeg`, `basecamp.com-dom.json`.

# Design Map

## Spacing Scale
- Fluid unit u = 30.64px at 1440
- Micro: 2.42 / 4.84 / 9.57 / 15.32px
- Layout: 30.64 (1u, 2-col gutter) / 42.89 (1.4u, footer gap) / 61.28 (2u) / 76.6 (2.5u, letter side padding) / 122.56 (4u, footer margin)
- Between section panels: ~184px (~6u), with a wavy logo divider centered in the gap
- Outer frame inset: 31px each side; inner panel width 1194px

## Font Hierarchy
- Family: Graphik only
- H1 / section heading: 42.13px, 800, line-height 46.34px, letter-spacing -1.11px
- Hero subhead / H2: 30.64px, 400, line-height 39.83px, letter-spacing -0.80px
- H3 card title: 22.98px, 800, letter-spacing -0.32px
- Letter body, link index, stat pills: 19.15px, 400 (stat numbers 700, buttons 500)
- Card body: 17.23px, 400
- Testimonial quote: 15.32px italic 400; attribution 15.32px 700
- Step ratios: 1.375 / 1.333 / 1.2 / 1.11 / 1.125

## Color Palette
- `#0B151B`: outer page frame
- `#1B2930`: section panel surface (largest area, 28.5% + 15.7%)
- `#27353E`: stat pill / raised chip
- `#E1E5E8`: primary text
- `#A8AFB3`: secondary text
- `#828B8F`: tertiary text
- `#475257`: hairline rings
- `#68A8F4`: links (bold, underlined)
- `#117AF3`: filled actions only (Sign up free, Subscribe, staff name tags); at 10% alpha it is the testimonial highlight wash
- Incidental (<1% each): yellow stars, red calendar headers, green "NEW!" tags

## Image Ratios
- Full-width video posters (customers, demo): 16:9, 1194x672
- Staff video cards: 16:9, 582x328
- Hero product mockup frame: 1.04:1, 659x636
- Logo tiles in mockup: 1:1
- Tour thumbnail: 16:9 at 89px wide

## Component Tokens
- Radius: 0px section panels, primary buttons and email input; 4.84px small mockup controls; 9.57px hero browser frame; 42.13px stat pills; 50% avatars and play buttons
- Shadow, hero browser: 4 stacked black layers (0.02 ring + 0.1/0.2 long negative-spread drops)
- Shadow, hairline: `rgba(225,229,232,0.1)` 0.6px inset top/left
- Ring: `#475257 0 0 0 0.6px`
- Grid: hero 2 x 689px; testimonials 3 columns; staff cards 2 x 582px with a 30px gutter; stat pills and footer links flex-wrap centered
- Video affordance: white 0px-radius chip with a play triangle and a duration in the label ("Play this 1-minute video")
- Divider: ~400px wavy hairline with the mountain logo glyph at its center
- Motion: color/opacity 0.15s; scale 0.15s `cubic-bezier(0.34,1.2,0.64,1)`; `:focus-visible` present; `prefers-reduced-motion` respected

---

# Taste DNA

### Annotated link index instead of a navigation bar
- **Trigger**: When the designers had to route first-time visitors to pricing, features, migration stories, reliability and developer docs.
- **Decision**: They chose seven bold underlined links in the hero column, each followed by an em-dash gloss in plain words ("Pricing & sign up — A free plan + paid upgrades"), over a horizontal nav bar with Product / Solutions / Resources dropdowns.
- **Reason**: A visitor who does not know the vendor's vocabulary can only choose a destination if told what is behind it. The gloss answers "what is this?" before the click, not after.
- **Evidence**: The header holds only 3 items: "Have an account? Sign in", the logo, and "Want an account? Sign up free". The 7 links are 19.15px, `#68A8F4` bold underline plus a `#E1E5E8` gloss. There is no menu at 1440px, and 390px collapses to a hamburger. The footer repeats the pattern as a 36-chip link wall of sentence-titled pages ("Why we choose profit", "Can we stay in touch?").

### A signed founder letter carries the pitch
- **Trigger**: When the page had to explain why the product exists, right after the hero.
- **Decision**: They chose a ~660px-wide letter in 19.15px body text on a stacked, slightly rotated paper card. It opens "Hey there— Tell me if this sounds about right." and closes with a handwritten signature, a headshot and the CEO's real email. The rejected option is a three-icon benefit row or a feature grid.
- **Reason**: Readers recognize their own problem faster in second-person prose than in feature labels. A named person with a reachable address reads as accountable in a way an icon grid cannot.
- **Evidence**: Section 2 has no headline. The letter has 71.8 x 76.6px (2.5u) padding and 3 offset paper layers behind the card. The sign-off is a signature plus "jason@basecamp.com" and "Co-founder & CEO" in 15.32px italic.

### One family, hierarchy by weight jump
- **Trigger**: When the page needed loud section headings and calm supporting copy without a display typeface.
- **Decision**: They chose Graphik alone, pairing 800-weight headings at -1.11px tracking with 400-weight subheads only 1.375x smaller, over a display or serif face paired with a sans.
- **Reason**: The 800-to-400 contrast reads as "headline, then plain explanation" at a glance. One family keeps the chatty letter and the bold claims in the same voice.
- **Evidence**: Graphik is the only family (1606 nodes). H1 is 42.13px/800 against H2 at 30.64px/400. Weight 800 appears on only 11 nodes, against 293 at 400. Headings are sentence case and often questions ("How about a quick demonstration?").

### Flat square panels; blue fill reserved for the two commitments
- **Trigger**: When separating ten stacked sections on a long dark page.
- **Decision**: They chose 0px-radius `#1B2930` panels on a `#0B151B` frame, separated by ~184px gaps and a wavy hand-drawn line with the logo glyph. Filled `#117AF3` appears only on "Sign up free" and "Subscribe". The rejected option is rounded gradient cards with a colored CTA in every section.
- **Reason**: When only two controls are filled, the reader never wonders which button is the real one. Every other ask is an underlined link or a play button that costs nothing to try.
- **Evidence**: Panels, buttons and the email input are all 0px radius. Panel surfaces cover 28.5% + 15.7% of the page; blue fill covers ~1.2%. Video asks are white square chips with a play triangle. A ~400px wavy divider sits between every pair of panels.

## Storytelling lens (for minion_site)

- **Arc, top to bottom (one job, one ask each):**
  1. **Header**: say who it's for. Ask: "Want an account? Sign up free" (the only filled button above the fold).
  2. **Hero**: shows a real project screen with a believable project name, tasks, calendar and files, plus the claim "Manage projects, coordinate teams, and master your company". Ask: "Take a 3-minute tour" (the 390px layout swaps in a "Try Basecamp Free" button).
  3. **Founder letter**: names the visitor's daily mess ("juggling people, projects, and expectations… spreading everything across different apps… doesn't work. You need a system."). Ask: "give Basecamp a try".
  4. **"Meet some of our customers"**: lists everyday trades (woodworkers, music industry folks, event planners, educators) so visitors self-identify. Ask: "Play this 1-minute video".
  5. **"What changed for the better since you switched?"**: 8 short quotes, each with its outcome phrase highlighted and attributed to a named person at a named organization. Ask: "Check out over 1,000 more customer testimonials".
  6. **"How about a quick demonstration?"** ("No slides, no sales pitch. Just a real project"). Ask: "See how Basecamp works".
  7. **"Big numbers"**: a live "people working right now" count plus usage pills. Proof only, no ask.
  8. **"Remember when companies cared about service?"**: two named staff with faces and job titles. No ask beyond meeting them.
  9. **"Want to see a live demo and ask some questions first?"**: six dated classes. Ask: join a class.
  10. **"Have a great day!"**: a newsletter, then a footer wall of sentence-titled pages.
- **Legitimacy without fabricated numbers:** The strongest proof here is not the counters. It is accountability you can check: a signed letter with the CEO's real email, quotes tied to a full name and organization, support and ops staff shown by face and name, a dated public class schedule, and a product screenshot full of realistic content instead of an abstract illustration. Minion can copy all of these with zero invented metrics: a signed owner letter, a screenshot of a real (anonymized) clinic workspace, named staff, and a real upcoming-session calendar.
- **Problem before product:** The page names the pain in the visitor's words before showing any feature list. There is no feature grid anywhere on the homepage; features sit behind one glossed link ("Features — Remarkably simple, surprisingly capable"). For Minion, the ERP → CRM → RPA stages fit the same move: "you track sales in a notebook and WhatsApp → …" before any module name.
- **FAQ and not-ready visitors:** There is no FAQ accordion. Questions are routed to humans and time: "ask some questions first?" leads to free live classes with dates, a no-pitch demo video, a newsletter for the "keep in touch" crowd, and a footer link wall whose titles are themselves questions or answers ("Can we stay in touch?", "Discounts", "Why we choose profit"). Each low-commitment path is a link or play button, never a second filled CTA.
- **Plain language for non-technical owners:** Headings are spoken questions ("How about a quick demonstration?"). Every navigation link carries an em-dash gloss. Proof quotes highlight outcomes, not features ("Errors are down. Clients are happier.", "easy to use even the 80-year-olds on our committee are using it!"). Video labels state the time cost up front ("1-minute", "3-minute"). For a Spanish-first Peruvian owner on a phone, the transferable rule is to say how long something takes and what changes for them, never what the module is called.
- **Mobile order:** At 390px the H1 and one filled CTA come before the product screenshot, and the link index collapses into the menu. The phone visitor gets the claim and the ask in the first 844px, and the proof right after.
