# Feature Specification: The landing wears a clinic, and the week demo tells one patient's story

**Feature Branch**: `spec/044-site-clinic-journeys` (meta) · site slice `feat/site-clinic-journeys` → `master` (scoped release, same pattern as #37; `dev` is behind `master` since 2026-10-16)

**Created**: 2026-10-29

**Status**: Draft (UI, copy and one new theme pair in the shared token contract; no data, auth or security surface). Owner reviews on a phone and merges.

**Input**: Owner, verbatim: "The sample section should be way more ellaborate. Add animations, add figures, icons, morphing, simulated animations. Tell a story with it, simulate an end-to-end process. Generate realistic customer journeys/user stories that can be accomplish with existing minion features. We also need to update the overall aesthetic from the flip-letters to something more 'clinic'-oriented. This is an erp/crm for private practices (cosmetic clinics, dentists, occulists, etc) run with /taste and other UX/UI optimization skills... This change is cosmetic, so content is kept."

Scope: marketing landing `/` (ES default, `/en`), Navbar, Footer, lead dialog and auth shell (they share the plate and button recipes). `/members` is out of scope. No new backend.

## AS-IS (evidence)

Anchors: `minion_site` `origin/master` @ `558b53b` (spec 040 release, live at `https://www.minion-ai.org/`), owner screenshot of the Week section (2026-10-29, `evidence/owner-week-before.png` if the owner's capture is kept; otherwise the production page at `#week`).

1. **The world is a rail-concourse split-flap board.** `src/app.html` direction contract; `DESIGN.md` "Concourse"; `src/app.css` `.flap/.flap-flip/.t-board/.t-row/.t-legend`; `board/FlapText.svelte` renders strings as flap cells (hero board caption, method step numerals). The brand voice is Barlow Condensed caps, flap-black canvas `#0d0d0f`, delay-amber accent, brushed-steel bezels (`.board::before`). Dark is the default theme (`data-minion-theme="concourse"`).
2. **The buyer is a private practice.** PRODUCT.md names salons and clinics; the live tenant is a cosmetic clinic. A departures board reads as transport and logistics, not as a reception desk; the owner's words: "something more clinic-oriented".
3. **The Week section is five flat panels.** `sections/Week.svelte` + `week/{YesCascade,RefundGate,SlotOffer,StockAlert,FaqReply}.svelte`: a vertical tab list and a stage. Each panel is one list or one card with one or two buttons; the only motion is `StatusBadge`'s flap fall. The five moments are unrelated to each other (a quote, a refund, a slot, a salon stock alert about shampoo and dye, a WhatsApp FAQ) and nothing carries from one to the next. There is no figure, icon system, or depiction of the process between modules.
4. **Content and structure that work and are kept**: the narrative arc Hero → Problem → Method → Week → How to start → Plans → FAQ → Close; every copy key outside `week_*`; the roster board rows in the hero; the three-state model (done / needs your OK / cancelled, nothing disappears); the "example, not customer data" captions; the premium marking of AI moments (owner rule 2026-10-26: AI is a paid upgrade).
5. **Gates before the change**: `lint:design` baseline 9/7/0 (hardcoded-color 9 → counted 1 on master after 040, arbitrary 0), `lint:tokens` 0, `test:tokens` green, `check` 0/0.
6. **Taste evidence** (`evidence/taste/`): jane.app and pabau.com, the two practice-management references, both measured 2026-10-29 at 1440×900. Shared DNA: one hue for every action and tint (teal `#027989`; blue `#0073FF`), flat tinted plates with 12–16px radius and no shadows, a headline voice distinct from the UI voice (a serif at 66px; a tight-tracked sans at 64px), the product UI as the hero's proof, white or near-white canvas with section rhythm carried by tint and gap instead of rules. Neither uses dark mode by default. A clinic brand reference (onemedical.com) refused automated access; parsleyhealth.com is being measured as the third reference and is added to the evidence folder when it lands.

## TO-BE

### The world: the clinical chart

The page becomes **a clinic's own record**: the patient chart and the day sheet, on paper-bone canvas with white sheets, one teal for every action, and a rubber stamp for state. The product thesis maps one to one, so the visual grammar still says what the product does:

| Chart behaviour | What it means in the product |
|---|---|
| An entry is written once and shows on every sheet that cites it | One shared record; a change made once is true everywhere |
| A green **Hecho** stamp | The action completed; the entry stays |
| An amber **Necesita tu firma** stamp | It stopped and wants a human: the approval gate |
| A red **Anulado** stamp over a struck entry that is still on the sheet | The reversible audit log; nothing disappears |
| The chart's tabs in order | The method: order the business → order the customers → automate |

Rules carried over unchanged from the concourse: amber marks exactly one thing (wants a human); red means cancelled; green means done; no fabricated evidence; both locales always; every link resolves.

### Aesthetic (cosmetic change; content kept)

- **Light by default.** Canvas is warm bone; sheets are white; section bands are white sheets on the bone, separated by gap and tint rather than hairlines. A night theme stays available behind the existing toggle (deep teal ink) and passes the same contrast tests.
- **One accent.** Clinic teal for the primary action of each chapter, links and the "done" state's icon. Status keeps the contract's success / warning / danger triples. The accent never decorates.
- **Two voices.** A serif for headlines (the person speaking) and a humanist sans for everything a hand operates: UI, body, numbers (tabular). Headings and leads stay sentence case (spec 040 I2 holds; the caps roles are retired with the flaps).
- **Flat plates.** 12–16px radius, hairline border, no bezel, no drop shadow on light surfaces; the lead dialog and the auth panel are the same plate.
- **The stamp replaces the flip.** The one authored motion: a state lands like a rubber stamp (scale from 1.3 to 1 with a 2° settle), fired once when a state changes; a drawn line connects the chapters of the journey as they complete. Reduced motion: stamps and lines appear without animating.
- **Hero proof stays the product.** The roster becomes the day sheet ("Un martes cualquiera, en una sola agenda"), same rows, same states, rendered as a chart list with stamps rather than a steel table.
- **Theme lives in the shared contract.** Two themes `clinic` (light) and `clinic-night` are added to `@minion-stack/design-tokens` `contract.json`; the site vendors a new durability archive with its provenance receipt, exactly as spec 012 prescribes. No colour literal enters the site.

### The Week section becomes one patient's journey

One protagonist, one week, seven chapters in order, each a working interaction. The visitor can play them in sequence or jump; a journey rail across the top shows the chapters as icons joined by a line that draws as each one completes; a **chart card** beside the stage accumulates the entries the chapters write ("Cliente creada", "Cita jueves 15:00", "Consumo 1 ml", "Boleta emitida", …), which is the shared-record thesis made visible. Every chapter names the Minion feature it runs on and whether it needs the AI upgrade.

| # | When | Chapter | The visitor does | What the platform shows (all existing hub behaviour) | Plan |
|---|---|---|---|---|---|
| 1 | Lunes 10:12 | A patient writes on WhatsApp | Picks one of three free slots to offer | Typing dots, the message arrives in the inbox, a customer entry is created on the chart, the reply bubble carries the offered time, the agenda cell fills, "the reminder goes out the day before, automatically" | Base |
| 2 | Miércoles 08:00 | The reminder goes out | Reads (no action; auto-plays when reached) | A reminder message leaves on its own, the patient's "Confirmado 👍" arrives, the agenda entry stamps Confirmada | Base |
| 3 | Jueves 15:40 | The visit ends and the chart asks what was used | Confirms consumption (edits a quantity if they like) | The completion dialog lists the mapped product (hyaluronic acid 1 ml, expected 1, used 1); confirming stamps the visit Hecho and cascades: consumption written, stock 12 → 11 (counter animates), sale posted to the till, receipt issued (a receipt figure prints), control visit proposed in 14 days | Base |
| 4 | Viernes 11:05 | A refund above the limit | Approves or refuses | The deposit refund (S/ 240 over a S/ 200 limit) arrives stamped **Necesita tu firma**; approve stamps Hecho and the till updates; refuse stamps Anulado, the entry stays struck with who asked and who refused | Base |
| 5 | Sábado 08:00 | An alert with its sources | Adds to the order or snoozes | Three clinic products running out (hyaluronic acid, botulinum toxin vials, needles) with a draining level figure per product; each number links to its source note (stock count, 14-day sales) | AI · Premium |
| 6 | Domingo 19:30 | A question on WhatsApp | Sends the draft or writes their own | The assistant drafts from the clinic's own FAQ and quotes the line it used; nothing goes out on its own | AI · Premium |
| 7 | Lunes siguiente | The week on one sheet | Starts over or asks for a plan | The chart card is complete: every entry from the week on one record, with who did it (staff, platform, assistant) | Reading |

Realism constraints: every behaviour above is something the hub does today (WhatsApp inbox with customer linking; bookings with services and slot offers; automatic reminders; consumption confirmation on booking completion with zero/edited quantities, spec 033; stock movements; POS sale and receipt; approval gate with reversible log; AI stock alert and FAQ-grounded drafts). Nothing is shown that the product cannot do; AI chapters are marked premium and the base chapters are done by staff or the platform.

### Invariants

- **I1 No fabricated proof.** Demonstration data stays labelled as an example; no testimonial, logo, count, or metric is added. The protagonist is a named example, not a customer.
- **I2 Content kept.** Every copy key outside `week_*` keeps its meaning in both locales (wording may be touched only where a metaphor word like "tablero"/"board" names the old world). Sections, anchors (`#hero #problem #method #week #how-it-works #pricing #faq #cta #stay`) and the FAQ JSON-LD are unchanged.
- **I3 Three states, three colours.** Green done, amber wants-a-human, red cancelled (struck, still visible). The accent is never a state.
- **I4 Parity.** Every `week_*` key exists in `messages/es.json` and `messages/en.json`; no em dash in new copy; Spanish sentence case.
- **I5 Governance.** Semantic tokens only; new colours exist only in `contract.json`; `lint:design` counts never rise; `lint:tokens` 0; the durability receipt pins the new archive.
- **I6 Motion is optional.** Every chapter is legible and completable with `prefers-reduced-motion: reduce`; nothing is hidden behind an animation; the journey works by keyboard (tabs pattern kept).
- **I7 AI is premium.** Chapters 5 and 6 carry the premium marker; chapters 1–4 and 7 do not imply an assistant.
- **I8 Phone first.** At 390px the journey rail scrolls horizontally, the chart card stacks under the stage, and no chapter needs a horizontal page scroll.

## DELTA

| Transition | Where | Proof |
|---|---|---|
| `clinic` + `clinic-night` themes; `defaultTheme` untouched (hub keeps its own) | meta `packages/design-tokens/contract.json`, regenerated `tokens.css`, `inventory.json` | `pnpm --filter @minion-stack/design-tokens build` green (AA test covers both themes) |
| New durability archive vendored with receipt | site `deps/*.tgz`, `deps/design-system-provenance.json`, `deps/design-token-provenance.json`, `package.json`, `bun.lock`, pin in `ui-button-artifact.test.ts` and `token-integrity.test.mjs` | `test:tokens`, `bun run test` green |
| Flap world retired: fonts, `.flap*`, `.t-board/.t-row/.t-legend`, `FlapText.svelte`, bezel | `src/app.css`, `src/app.html` (direction contract rewritten), `board/FlapText.svelte` deleted | grep `flap` in `src` = 0 outside history |
| Clinic roles: serif headline voice, sans UI voice, plate, stamp motion, journey line | `src/app.css`, `@fontsource` deps | `check` 0/0; screenshots 1440/390 ES+EN, light+night |
| `StatusBadge` becomes a stamp (same props, same states) | `board/StatusBadge.svelte` | approve/refuse still toggles; reduced motion static |
| Hero day sheet | `Hero.svelte`, `board/BoardTable.svelte` restyled | screenshots |
| Week → Journey: rail, chart card, seven chapters with figures | `sections/Week.svelte` (rewritten), `week/*.svelte` (rewritten/added) | each chapter completable by mouse and keyboard; `ondone` marks the rail; chart card accumulates |
| Copy for the journey | `messages/{es,en}.json` `week_*` | key-set parity test |
| DESIGN.md rewritten for the chart world; `PRODUCT.md` incumbent-look note updated | `DESIGN.md`, `PRODUCT.md` | review |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A clinic owner recognises her own reception (Priority: P1)

A cosmetic-clinic owner opens the link on her phone. The first screen looks like a clinic (paper, white sheets, one calm teal, a day sheet with stamps), not a train station, and she can say what Minion does and what to press without scrolling.

**Why this priority**: the owner asked for the aesthetic change; it frames every other section.

**Independent Test**: 390×844 Spanish first viewport: serif headline, the method sentence, the teal "Recibe tu plan gratis", the day sheet with one amber stamp; no split-flap cells anywhere on the page.

**Acceptance Scenarios**:

1. **Given** `/` in a Spanish browser, **When** it loads, **Then** the H1 is the same sentence as today, set in the serif voice, and the primary button is teal and at least 44px tall.
2. **Given** the day sheet in the hero, **When** rendered, **Then** the six rows and their states are the same as today, the amber row is the only amber element in the viewport, and no row scrolls horizontally at 390px.
3. **Given** the theme toggle, **When** switched to night, **Then** text, accent and status pairs still pass the contract's contrast test (the package test proves it) and the page keeps the same composition.

---

### User Story 2 - She plays the week and follows one patient from WhatsApp to the receipt (Priority: P1)

**Why this priority**: the owner's main ask: the sample must tell a story end to end with real features.

**Independent Test**: starting at chapter 1, the visitor can complete chapters 1 to 7 in order with one action each; the rail's line draws to each completed chapter; the chart card ends with every entry the week wrote.

**Acceptance Scenarios**:

1. **Given** chapter 1, **When** the visitor picks a slot, **Then** the reply bubble shows that time, the agenda figure marks it, the chart card gains "Cliente" and "Cita" entries, the rail marks chapter 1 done and offers chapter 2.
2. **Given** chapter 3, **When** the visitor confirms consumption with quantity 1, **Then** the visit stamps Hecho, the stock counter goes from 12 to 11, the receipt figure appears, and the chart gains consumption, sale and receipt entries; **When** they set the quantity to 0 first, **Then** the platform reports no stock movement and still completes the visit (spec 033 behaviour).
3. **Given** chapter 4, **When** the visitor refuses, **Then** the entry stays on the sheet struck through with "Lo pide: caja" and "La rechazas: tú", and the chart card records the refusal.
4. **Given** chapters 5 and 6, **When** shown, **Then** both carry the "IA · Premium" marker and the base note explains it.
5. **Given** `prefers-reduced-motion: reduce`, **When** any chapter completes, **Then** the same end state appears with no animation and nothing is missing.

---

### User Story 3 - She jumps around and nothing breaks (Priority: P2)

**Independent Test**: select chapters out of order with the mouse and with arrow keys; replay one; start over.

**Acceptance Scenarios**:

1. **Given** chapter 5 selected before chapter 1, **When** completed, **Then** only chapter 5 is marked and the chart shows only its entries; "Siguiente" offers the first unfinished chapter.
2. **Given** "Empezar de nuevo", **When** pressed, **Then** every chapter resets, the line retracts, the chart card empties, focus returns to chapter 1.

---

### User Story 4 - The technical evaluator reads the night theme and the code (Priority: P3)

**Acceptance Scenarios**:

1. **Given** the night theme, **When** the journey plays, **Then** stamps and figures keep their meaning by icon and label, never by colour alone.
2. **Given** the site repo, **When** `lint:design`, `lint:tokens`, `test:tokens`, `check`, `test`, `build` run, **Then** all exit 0 and no colour literal exists outside `app.css` (where none are added either).

### Edge Cases

- A chapter is replayed after the chart card already holds its entries: the entries are replaced, not duplicated.
- Locale switch mid-journey: the page reloads (locale is a link); the journey restarts; nothing persists, by design.
- Very narrow (320px): the rail still scrolls; chapter titles wrap; buttons stack.
- Fonts fail to load: system serif/sans fallbacks keep the measure within one line of the design (headline max-width in `ch`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing MUST render in the clinic world described above in both themes, with no split-flap cell, condensed-caps role or steel bezel left in the marketing surface.
- **FR-002**: Every section's content and anchor MUST be preserved; only `week_*` copy may change meaning.
- **FR-003**: The Week section MUST present seven ordered chapters of one patient's week, each with one visitor action (chapter 2 auto-plays, chapter 7 reads), a figure or animated depiction, the feature it runs on, and its plan marker.
- **FR-004**: Completing a chapter MUST mark it on the journey rail, draw the line to it, add its entries to the chart card, and offer the next unfinished chapter.
- **FR-005**: The three states MUST be stamps in green (done), amber (wants a human) and red (cancelled, struck, still visible), each carrying an icon and a word.
- **FR-006**: Chapters 5 and 6 MUST be marked AI · Premium; no other chapter may imply an assistant did the work.
- **FR-007**: The journey MUST be operable by keyboard (tabs pattern: arrows, Home, End) and complete under reduced motion with identical end states.
- **FR-008**: All colour MUST come from the shared token contract through the two new themes; the site MUST vendor the archive with a provenance receipt and pass `test:tokens`.
- **FR-009**: All new strings MUST exist in both locales with key-set parity.
- **FR-010**: DESIGN.md and the `app.html` direction contract MUST describe the chart world and the stamp motion.

### Key Entities

- **Chapter**: id, day/time label, title, lead, feature label, plan (base | premium), body component, done flag, entries it writes.
- **Chart entry**: label, who (staff | platform | assistant | you), state (done | waiting | void), chapter that wrote it.
- **Theme**: `clinic` (light; canvas bone, white sheets, teal accent) and `clinic-night` (dark teal ink), both in the contract.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 390px phone the first viewport shows headline, method sentence, primary action and the day sheet with exactly one amber element.
- **SC-002**: A first-time visitor can complete all seven chapters in under three minutes with one action each; a reviewer can name the feature behind each chapter from the chapter itself.
- **SC-003**: Zero split-flap cells, zero caps roles, zero colour literals added; `lint:design` counts do not rise; all six site gates exit 0.
- **SC-004**: Both themes pass the contract's AA test; the night theme keeps icon+word on every stamp.
- **SC-005**: Both locales render every chapter with no missing key and no em dash.

## Assumptions

- The night theme is secondary; the owner may drop the toggle later (not done here: it exists and has users of the preference).
- The protagonist's name and the example products (hyaluronic acid, botulinum toxin vials, needles) are illustrative and labelled; dentists and oculists read them as "a clinic", not as a mismatch.
- Fonts ship self-hosted through `@fontsource` like today (serif Fraunces, sans Instrument Sans; if either is unavailable offline the plan names the fallback pair).
- The site PR targets `master` as a scoped release, since `dev` is behind `master` and the last two site releases followed this pattern; the owner merges.
