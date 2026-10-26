# Spec 041 — Amendment A: follow-ups F1–F3 (owner-approved 2026-10-25)

The owner approved the two orchestrator decisions (form submissions are owner/admin only; follow-ups only message leads that arrive after the switch is turned on) and asked for the open ends to be implemented. This amendment covers the items from `proposals/2026-10-24-hub-collection-points-followups.md` that need no credentials or owner action. Items 1 (payment links), 5 (FACES intake cut-over), 13 (no change needed) and 20 (FAQ model happy path, needs a paid model key) stay open in the proposal.

The three slices stack on top of S4 (`feat/doors-s4-follow-up`): F1 → F2 → F3.

## F1 — Public doors render on the server (`feat/doors-f1-public-ssr`) — items 9, 14

- **AS-IS:** the root layout sets `ssr = false` (`src/routes/+layout.ts`). `/d/<slug>` returns an empty shell with HTTP 200, even for a missing or switched-off door. The FAQ JSON-LD only exists after client JS runs.
- **TO-BE:** `/d/<slug>` is server-rendered. A missing or switched-off door answers **HTTP 404** in the document response. A live FAQ door's HTML contains the `FAQPage` JSON-LD and the questions as text, with no JS. The hub app shell (all other routes) is unchanged. The same 404 rule applies to `/book/<slug>` if the same change covers it; otherwise it is recorded as open.
- **DELTA / proof:** `curl -s -o /dev/null -w '%{http_code}'` returns 404 for a missing slug and 200 for a live one. `curl` of a live FAQ door shows `application/ld+json` in the body. svelte-check, the route contract test and the existing door tests stay green.

## F2 — Door hardening (`feat/doors-f2-hardening`) — items 6, 10, 12, 16, 17a, 17b, 18b, 19

- **6 — AS-IS:** `ensureCrmContact` catches a failed insert inside the caller's transaction, after Postgres has aborted it, so the next statement fails with a confusing error. **TO-BE:** the insert runs in a savepoint, so a unique-violation race resolves to the existing contact and the outer transaction stays usable. **Proof:** a test where the insert hits a unique violation and the outer transaction's next insert succeeds.
- **10 — AS-IS:** door stats days and the "new contacts" window use UTC days. **TO-BE:** they use the org's business timezone (the existing `zonedDayWindow`/org timezone helper). **Proof:** a unit test at 23:30 Lima time counts the event on the Lima day.
- **12 — AS-IS:** the ui-audit seed has no door. **TO-BE:** `scripts/ui-audit-seed.ts` provisions one door, and the capture fixtures point at it. **Proof:** the fixture test passes.
- **16 — AS-IS:** the form-door rate limit (5 per minute) is in lambda memory. **TO-BE:** it is shared across instances (the hub's existing durable limiter or a DB counter), still 5 per minute per visitor per door. **Proof:** the test for the 6th POST returning 429 runs against the shared store.
- **17a — AS-IS:** a staff message sent after a submission does not cancel the follow-up. **TO-BE:** if any outbound message reached the contact after the submission, the follow-up is skipped with reason `staff_replied`. **Proof:** unit test.
- **17b — AS-IS:** a successful WhatsApp send followed by a failed timeline insert shows "failed". **TO-BE:** the row is marked sent once the send succeeds; a timeline failure is logged, not shown as a failed send. **Proof:** unit test.
- **18b — AS-IS:** an offer door shows "Reservar" even when the org's scheduling module is off. **TO-BE:** the button is hidden then. **Proof:** unit test on the public view.
- **19 — AS-IS:** the next-offers ranking SQL is tested only as text. **TO-BE:** a `*.sql.integration.test.ts` runs it against the local QA DB (`HUB_TEST_DB_URL` guard, never prod). **Proof:** the test passes against the local stack and skips without the guard.

## F3 — Staff-facing polish (`feat/doors-f3-staff`) — items 2, 3, 7, 8, 15

- **2 — AS-IS:** nothing in the hub sets `_reminders_opt_out`. **TO-BE:** the contact page has a "No automatic messages" switch that writes it (optimistic, `crm:edit`). The key name stays as it is; the rename stays open in the proposal. **Proof:** an API test plus a live check.
- **3 — AS-IS:** a new form submission is only visible in the door's panel. **TO-BE:** owners/admins (`crm:manage`) get one in-app notification per submission through the existing notifications service, with no free-text answers in the notification body. **Proof:** unit test.
- **7 — AS-IS:** offer doors count views only. **TO-BE:** clicks on WhatsApp and Reservar are counted through a public beacon that is rate-limited and accepts only known door ids. They are shown in the Doors list. **Proof:** API test plus a live check.
- **8 — AS-IS:** `first_touch` is stored but not shown. **TO-BE:** the contact page shows "Origen: <source> · <door/booking link> · <date>". **Proof:** live check.
- **15 — AS-IS:** the `/es/book/<slug>` subtitle is in English. **TO-BE:** it is a Paraglide message with es and en text. **Proof:** live check.

## Verification

A final live QA pass runs on `dev:local` at the top of the stack. Then a single owner-run deploy script merges hub S0 → S3 → S1 → S2 → S6 → S5 → S4 → F1 → F2 → F3, plus site #36 and meta #891/#893, in order, and verifies production.
