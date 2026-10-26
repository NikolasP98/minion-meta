# Feature Specification: The landing tells the owner's story, in plain words

**Feature Branch**: `spec/040-site-storytelling` (meta) · site slice `feat/site-storytelling` → `dev`
**Created**: 2026-10-24
**Status**: Draft (UI + copy; no data, auth or security surface). Owner approves the spec and merges the site PR.
**Input**: Owner, verbatim: "have another agent run the /taste skill (get if not installed) and other UX/UI skills to improve the site's layout and visual story-telling. The current state is terrible and non-friendly". Storytelling lens from a video the owner reviewed: the homepage is the *hallway*: prove legitimacy honestly, point each visitor to the right door, one clear ask per section, answer real buyer questions (FAQ, also for AI-search citation), and keep a door open for visitors not ready to buy.

Scope: marketing landing `/` (ES default, `/en`), Navbar, Footer; `/login`, `/register` and the lead dialog for visual consistency only. `/members` is out of scope. No new backend.

## AS-IS (evidence)

Anchors: `minion_site` `origin/dev` @ `4edd54f`; production `https://www.minion-ai.org/` captured 2026-10-24 (same composition). Screens: `evidence/taste/minion-ai.org-{1440,390}-{viewport,full}.jpeg`. Taste baseline: `evidence/taste/minion-ai.org.md` (§Baseline friction).

1. **The voice shouts.** Everything except paragraphs is condensed uppercase with 0.08–0.18em tracking (`src/app.css` `.t-board/.t-row/.t-legend`): headings, buttons, nav, FAQ questions, pricing features, form labels. 12px is the most used size (116 nodes per the extractor). Leads are 14px grey: sections set `font-size: var(--font-size-section-title)`, and the contract's font-size roles are app density (`--font-size-body: 14px`).
2. **The hero sells the mechanism, not the method.** H1 is flap cells "LOS AGENTES TRABAJAN / TÚ DECIDES" (`Hero.svelte`, `hero_line1/2`). PRODUCT.md already flagged this as open (§Positioning: "the competitor is the owner's belief that scaling needs 20 experts").
3. **Jargon throughout.** ERP, CRM, RPA as stage labels; "Módulo", "Agente · Ventas", "Workforce", "Gateway dedicado o self-hosted", "Brains", "Pulse"; lead dialog title "Recibe Tu Plan de ERP Nativo de Agentes"; page `<title>` "The agent-native ERP" in English on the Spanish page.
4. **Every section is the same shape.** Heading + lead at left, a full-width steel board below, ~55–65% of the width beside each heading empty (Method, Cascade, Approval, HowItWorks, FAQ). Hairline separators only; no rhythm between chapters.
5. **No problem framing.** The page jumps from the hero to "Escalar tiene un orden" without naming the pain the owner feels.
6. **Asks are scattered and inconsistent.** The main action has six names ("Recibe tu plan", "Empezar", "Consigue tu Plan Gratis", "Envíame un Plan", "Quiero mi Plan", "Hablemos"); four middle sections have no button; hero buttons are ~36px tall.
7. **Pricing confuses.** "GRATIS" and "A MEDIDA" twice; the free tier's badge reads "Lanza Q3 2026" (stale on 2026-10-24); the amber "Consigue tu Plan Gratis" sits under a paid tier; the FAQ asks about "plan Empresarial" and "plan Miembros", names that appear nowhere else.
8. **No door for "not yet".** WhatsApp appears only inside the FAQ subtitle and the final CTA. The footer's middle column is GitHub + "Contribuir" (a developer door, not an owner's).
9. **Gates before the change**: `lint:design` 9/7/0 at baseline, `lint:tokens` 0 violations, `check` 0/0.

Kept on purpose (the taste baseline lists them as working): the departures-board roster, the approval card (S/ 240 over a S/ 200 limit) and the honest "example" captions.

## TO-BE

The page reads as one argument an owner can follow on a phone, in Spanish, without a glossary:

| # | Chapter (anchor) | Its job | Its one ask |
|---|---|---|---|
| 1 | Hero (`#hero`) | Plain promise: "Haz crecer tu negocio con orden, no con veinte expertos." + the three steps in one sentence; beside it, one ordinary day on the board, one row amber "FALTA TU OK" | Recibe tu plan gratis (secondary: text link to the method) |
| 2 | Problem (`#problem`, new) | Four pains in the owner's words, then "Crecer bien no es trabajo de especialistas" | none (reading) |
| 3 | Method (`#method`) | Three steps in order, plain names first; "Los expertos lo llaman ERP/CRM/RPA" as a footnote; data as the ground under them | "¿No sabes en qué paso estás?" → Recibe tu plan gratis |
| 4 | Your week (`#week`, merges Cascade + Approval) | Two labelled demos side by side: one "sí" settles six rows; the visitor approves or rejects a refund | the demo itself |
| 5 | How to start (`#how-it-works`) | Hoy / Días 1 a 3 / Días 3 a 5 on a timeline | Recibe tu plan gratis (the page's main ask) |
| 6 | Plans (`#pricing`) | Same tiers (module bundles), de-jargoned; business CTA "Pide tu propuesta" | per tier |
| 7 | Questions (`#faq`) | The questions owners ask (tech skill, keep my POS/Excel, what is an AI assistant, cost, data, time, models, outside Peru) + FAQPage JSON-LD | "Escríbenos por WhatsApp" in the subtitle |
| 8 | Close (`#cta`) + stay in touch (`#stay`) | "Empieza por el paso uno." / "¿Todavía no es momento?" | Recibe tu plan gratis / Escríbenos por WhatsApp |

### Invariants
- **I1 No fabricated proof.** No testimonial, logo, count, rating or metric is added. Demonstrations stay labelled as examples.
- **I2 Caps belong to board objects.** Rows, states, column legends and flap cells may be uppercase; headings, leads, buttons, nav, FAQ questions and form labels are sentence case.
- **I3 One ask per chapter**, and the primary ask has one name in each locale ("Recibe tu plan gratis" / "Get your free plan").
- **I4 Parity.** Every key exists in `messages/es.json` and `messages/en.json`; no em dash in new or edited marketing copy.
- **I5 Governance.** Semantic tokens only; `lint:design` counts never rise; `lint:tokens` 0 violations.
- **I6 No new backend.** The stay-in-touch door uses the existing WhatsApp link; an updates list is a proposal, not code.
- **I7 Product truth.** ERP → CRM → RPA order unchanged; approvals and the reversible log are not weakened; "never sold or used to train a model" kept; the claim that assistants send text to AI providers is stated, not hidden.

Why keep the concourse world instead of a new one: the owner picked it on 2026-08-07 over the dealt direction, and the friction above is voice, size, copy and composition, not palette. The amendment moves the board into the role it plays best (the product doing its job) and lets prose carry the argument. Dark stays the default: the light theme is a cool steel grey that would not read warmer, and its mascot disappears (open item).

## DELTA

| Transition | Where | Proof |
|---|---|---|
| Sentence-case reading scale (`.t-head/.t-hero/.t-h2/.t-h3/.t-lead/.t-field`), prose in full-width Barlow | `src/app.css`, Google Fonts link in `src/app.html` | screenshots; `check` 0/0 |
| One section rhythm (`.section/.section-band/.section-inner/.section-head`) and one button recipe (`.btn/.btn-primary/.link-action`, 44px) replace per-section copies | `src/app.css`, every section | `lint:design` unchanged at 9/7/0; token-integrity pin of `--page-max` consumers 10 → 4 (deliberate, test updated) |
| Hero rewritten; board kept with a flap caption | `Hero.svelte` | 1440/390 screenshots |
| New Problem chapter | `Problem.svelte` | screenshots |
| Method: plain names, flap step numerals, expert term as footnote, ask row | `Method.svelte` | screenshots |
| Cascade + Approval become panels inside a new Week chapter | `Cascade.svelte`, `Approval.svelte`, `Week.svelte` | approve/reject still toggles, reduced motion still static |
| HowItWorks as a timeline ending in the main ask | `HowItWorks.svelte` | screenshots |
| Pricing de-jargoned, stale badge fixed, amber removed from badges | `Pricing.svelte`, messages | screenshots |
| FAQ rewritten + FAQPage JSON-LD | `FAQ.svelte`, `+page.svelte`, messages | served HTML contains one `FAQPage` block |
| Close + stay-in-touch door; `TODO(handoff)` for an updates list | `FinalCTA.svelte`; proposal `2026-10-24-site-stay-in-touch-updates` | grep TODO |
| Navbar/Footer sentence case, 44px controls, WhatsApp contact column, tagline | `Navbar.svelte`, `Footer.svelte` | 390 shot: no wrap, no overflow |
| Lead dialog + auth pages: sentence-case title, labels, buttons | `LeadFormDialog.svelte`, `AuthShell.svelte`, `login`, `register` | `check` 0/0 |
| Spanish `<title>`/description/OG copy; direction contract STORY/FIRST VIEWPORT amended | `+page.svelte`, `app.html` | served HTML |
| DESIGN.md amendment (type roles, controls, layout, known gap) | `DESIGN.md` | review |

## User Scenarios & Testing

### US1: A salon owner opens a link forwarded on WhatsApp (P1)
She reads the hero on a 390px phone and can say what Minion does and what to press without scrolling.
**Independent test**: 390×844 first viewport shows the plain headline, the three-step sentence and the amber "Recibe tu plan gratis".
1. **Given** `/` in a Spanish browser, **When** it loads, **Then** the H1 is a sentence-case Spanish sentence with no ERP/CRM/RPA, and the primary button is ≥44px tall.
2. **Given** the navbar at 390px, **When** rendered, **Then** nothing wraps and the document does not scroll horizontally.

### US2: She recognises herself and learns the order (P1)
**Independent test**: scrolling from the hero, the next two chapters name four pains and then three ordered steps in plain words.
1. **Given** the Problem chapter, **Then** none of its copy uses a product noun.
2. **Given** the Method chapter, **Then** each step is named in plain words and the expert term appears only as a footnote.

### US3: She sees what changes in her week and tries it (P2)
1. **Given** the Week chapter, **When** she taps Aprobar, **Then** the row flips to LISTO and the outcome sentence appears; **When** Reiniciar then Rechazar, **Then** the row is struck through (ANULADO), not removed.
2. **Given** `prefers-reduced-motion: reduce`, **Then** both demos are fully legible without animation.

### US4: She has a question or is not ready (P2)
1. **Given** the FAQ, **Then** she finds cost, "do I need to be technical", "keep my POS/Excel" and "my data" as questions.
2. **Given** the close, **When** she is not ready, **Then** a WhatsApp door is offered without a form.
3. **Given** the served HTML, **Then** exactly one FAQPage JSON-LD block lists the same questions as the page.

### US5: A technical evaluator still finds the specifics (P3)
1. **Given** Method, **Then** ERP/CRM/RPA are named; **Given** FAQ, **Then** the models question and the data-provider answer are present; **Given** the footer, **Then** GitHub and the licence remain reachable.

### Edge Cases
- Spanish runs ~10% longer: headings use `text-wrap: balance`; no flap headline remains that cannot reflow.
- English at `/en`: same structure, parity enforced by key equality.
- Light theme: still works through tokens; the mascot contrast gap is recorded, not fixed.
- No JS: all copy is prerendered; only the lead dialog and the demo toggle need JS (unchanged).

## Requirements

### Functional Requirements
- **FR-001**: The landing MUST present the eight chapters in the order of the TO-BE table.
- **FR-002**: The primary ask MUST be one label per locale and appear in the hero, Method, How to start and Close.
- **FR-003**: Headings, leads, buttons, nav, FAQ questions and form labels MUST be sentence case; uppercase is limited to board objects (I2).
- **FR-004**: Body copy MUST render at ≥17px and leads at ≥18px on a 390px viewport.
- **FR-005**: Every interactive control on the landing, navbar and footer MUST be ≥44px tall, except inline footer links (≥32px).
- **FR-006**: The page MUST NOT add testimonials, logos, counts, ratings or metrics (I1).
- **FR-007**: The FAQ MUST answer cost, technical skill, keeping existing tools, what an AI assistant is, data use, time to start, models and availability, and MUST be published as FAQPage structured data.
- **FR-008**: The page MUST offer a no-form way to stay in touch (WhatsApp).
- **FR-009**: Copy changes MUST land in both locales (I4).
- **FR-010**: Site gates MUST pass: `check`, `lint:design` (no count rises), `lint:tokens`, `test`, `build`.

## Success Criteria

### Measurable Outcomes
- **SC-001**: At 390px, the first viewport contains the headline, the method sentence and the primary button (verified by screenshot).
- **SC-002**: Zero occurrences of ERP/CRM/RPA, "agente", "módulo" or "back office" in the hero and Problem copy.
- **SC-003**: The main ask has one name in each locale (was six variants).
- **SC-004**: No section leaves more than half its width empty beside its heading at 1440px (Problem and FAQ are two-column; Method/Week/How/Plans fill the measure).
- **SC-005**: No horizontal document overflow at 390 and 1440 in ES and EN.
- **SC-006**: Owner review: the owner reads the page on a phone and no longer describes it as non-friendly (qualitative; the owner's call).

## Assumptions
- "Plan" in the CTA means the free setup plan returned by the lead flow (PRODUCT.md §Operating Context), not a pricing tier; pricing tiers use "Pide tu propuesta" to avoid the clash.
- The owner's request plus the provided storytelling lens is the confirmed brief (Impeccable `shape`), so no concept roll was run: the structure was pinned by the brief, and the visual world is the one the owner already chose.
- Headless captures use a Spanish locale (`es-PE`); the client-side redirect to `/en` does not fire, so `/` renders Spanish.
- The Impeccable finish-reviewer agent is not available in this harness; the review was an in-thread pass (disclosed).
