# Research: Calendar on phones

Each entry: decision, why, what else was considered. Evidence anchors are in [spec.md](spec.md) (AS-IS) and [plan.md](plan.md). Entries marked "round 1" changed after the first design review (five reviewers, 2026-11-21).

## R1 · How a finger scrolls and a hold drags (changed in round 1)

- **Decision**: `touch-action: pan-x pan-y` on the grid; the existing `longpress` action (extended with `ms` and pointer details) at 400 ms; one permanent non-passive `touchmove` listener that blocks scrolling only while a hold is active.
- **Why**: native scrolling keeps momentum, and the browser's `pointercancel` cancels the timer when it takes the gesture. The listener must exist before the touch starts, because browsers decide scroll handling at touch start.
- **Round 1**: the first draft installed the listener when the hold fired and fell back to `touch-action: none`; both are too late in the gesture. It also added a new recogniser file that duplicated `lib/actions/longpress.ts`.
- **Not verified**: real iOS Safari and Android Chrome. S2 checks one device of each before merge.

## R2 · Where "phone" is decided (changed in round 1)

- **Decision**: one media query (width ≤ 767.98 px, or a coarse pointer with height ≤ 500 px), mirrored into a cookie so the server can pick Día and the phone layout; page chrome is hidden with CSS.
- **Why**: the view is loaded by the server from the address, and a browser-only decision would draw desktop chrome first on every visit. The height clause covers phones held sideways.
- **Considered**: user-agent sniffing (wrong for tablets); a browser-only `replaceState` (the page and address would disagree).

## R3 · Views (changed in round 1)

- **Decision**: one `view` value as today. Día = the day view unchanged; 3 días = `week` with `weekDays = 3` and lanes off; Lista = `agenda`; Mes = `month` with phone cells.
- **Why**: all four exist. A second view vocabulary would need a mapping and a second store.
- **Round 1**: dropped `phoneView`, the saved view choice, and full-width paged staff columns (the day scroller has no snapping, and an existing phone test pins readable staff columns with sideways scroll).

## R4 · List view (changed in round 1)

- **Decision**: the existing `agenda` view on both pages on phones, with client, status and empty days added.
- **Deferred**: free gaps. The calendar only receives one opening and closing time per weekday, so breaks would show as free; `server/scheduling/slots.ts` `computeSlots` is the right source and needs its own proposal.

## R5 · Unscheduled services on touch (changed in round 1)

- **Decision**: move the tray's existing cards into a bottom sheet opened from the "…" sheet; a card tap opens the new-appointment form as it does today.
- **Round 1**: the first draft said the tray was drag-only and invented tap-to-place. The cards already open the form on tap.

## R6 · No floating buttons (changed in round 1)

- **Decision**: "+" in the toolbar row; the unscheduled count as a badge on "…".
- **Why**: the assistant launcher is draggable and lives in the browser's top layer, so a floating button cannot be kept clear of it.
- **Open**: the owner saw a floating "+" in the mock-up and has not seen this change.

## R7 · Moving without dragging (changed in round 1)

- **Decision**: "Mover a…" opens the appointment drawer with its existing reschedule form open.
- **Round 1**: the first draft added a new form in three places.

## R8 · Keyboard grid (changed in round 1)

- **Decision**: out of this spec. Accessible names, status text and announcements stay in.
- **Why**: one tab stop with arrow keys does not fit the endless week scroller and changes desktop behaviour that existing tests pin. It goes to the accessibility program.

## R9 · Not researched

- How many people use these pages on phones (PostHog not queried).
- Whether the app-wide 44 px `min-height` rule reaches short blocks on touch devices (`Button` is in `@minion-stack/ui`, outside the source snapshot). S2's first step checks it in the browser.
