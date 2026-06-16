# Google OAuth Verification Packet — Minion (project `omega-mile-483509-e7`)

**Date:** 2026-06-11
**App type:** External / public
**Single OAuth client:** MINION project `omega-mile-483509-e7` (one consent entry point)
**Status:** App already verified for current non-sensitive scopes. Adding 2 operational scopes below → re-verification (+ CASA for the restricted Gmail scope).

---

## 1. Scopes being added

| Scope | Tier | Why the app needs it |
|---|---|---|
| `https://www.googleapis.com/auth/gmail.modify` | Restricted | The Minion assistant reads, sends, replies to, labels, archives, and trashes the user's email **on the user's explicit instruction** inside a chat/agent session. |
| `https://www.googleapis.com/auth/calendar.events` | Sensitive | The assistant creates, updates, deletes, and looks up the user's calendar events on request, and RSVPs to invitations. |

Already held (no change): `openid`, `userinfo.email`, `userinfo.profile`, `calendar.calendarlist.readonly`, `calendar.freebusy`, `calendar.events.freebusy`, `calendar.settings.readonly`.

> Minimization note for reviewers: we deliberately use `calendar.events` (not full `calendar`) and `gmail.modify` (not `https://mail.google.com/`) because the app never permanently deletes mail and never manages calendar ACLs/settings beyond reading them.

---

## 2. Per-scope justification text (paste into the consent-screen scope justification fields)

**gmail.modify**
> Minion is a personal AI assistant. When a user asks it (in natural language) to manage their inbox — e.g. "reply to the last email from my accountant", "archive newsletters", "label this thread as Invoices", or "draft and send a follow-up" — the assistant uses gmail.modify to read the relevant messages, apply labels, change read/archive state, move items to trash, and create/send messages or drafts. The scope is used only in direct response to a user instruction within an authenticated session; no background scanning, no bulk export, and no use of message content for advertising or model training. We request gmail.modify rather than narrower scopes because a single user request commonly spans reading a thread, modifying its labels/state, and sending a reply.

**calendar.events**
> The assistant manages the user's schedule on request: creating events ("book a 30-min call with Maria tomorrow at 3pm"), updating or deleting events, looking up upcoming events, and responding to invitations (RSVP). calendar.events is used only to act on the user's own calendars in direct response to a user instruction. Free/busy availability and the calendar list are read via the narrower scopes we already hold.

---

## 3. Data-use narrative (for the "How will the scopes be used?" / limited-use sections)

- **Access trigger:** Only during an authenticated, interactive assistant session, in direct response to an explicit user request. No background jobs read mail/calendar without a triggering instruction.
- **Storage:** OAuth refresh tokens are encrypted at rest (AES‑256‑GCM, app-held ENCRYPTION_KEY) in the Minion identity vault. Message/event content is processed transiently to fulfill the request and is not retained beyond the session/log needed to show the user the result.
- **Sharing:** Not sold, not shared with third parties, not used for advertising. Content may be sent to the LLM provider solely to fulfill the user's request (state your provider, e.g. Anthropic/OpenRouter, and that it is a service provider under your privacy policy).
- **Limited Use compliance:** Use of Google user data complies with the Google API Services User Data Policy, including the Limited Use requirements. (Gmail restricted scopes require this affirmation + CASA.)

---

## 4. Demo video — requirements + shot list

> ⚠️ Verify against the current Google requirements in the OAuth Verification Center before recording — Google updates these. The list below is the standard set as I understand it; confirm.

**Hard requirements (must all appear or it bounces):**
1. Hosted on **YouTube** (unlisted is fine).
2. **English** narration or captions.
3. The **production OAuth client** is what's shown — the consent screen must display your verified app name and the production domain.
4. The video must **show the OAuth client ID**. Easiest: before clicking "Sign in with Google", show the browser address bar on the consent URL (it contains `client_id=...`), OR show the GCP Credentials page with the client ID for that client, then switch to the live flow.
5. Show the **full consent flow**: click sign-in → Google account chooser → the consent screen **listing every requested scope** (scroll so gmail.modify + calendar.events are visible) → grant.
6. For **each** added scope, demonstrate the **in-app feature that uses it** end-to-end.

**Scene-by-scene script (~3–4 min):**

| # | On screen | Narration |
|---|---|---|
| 1 | Your app's landing/login page on the production domain | "This is Minion, a personal AI assistant at <domain>. I'll show how it uses Google account access." |
| 2 | GCP Credentials page showing the OAuth client ID for project omega-mile-483509-e7 (blur the secret) | "This is our verified OAuth client. Client ID shown here." |
| 3 | Click "Sign in with Google"; address bar visible on `accounts.google.com/o/oauth2/...client_id=...`; account chooser; consent screen scrolled to show gmail.modify + calendar.events | "The user signs in and is shown exactly which scopes we request, including Gmail modify and Calendar events. They consent explicitly." |
| 4 | Back in the app, in chat: type "Summarize my unread emails from this week" → assistant lists them | "Using gmail.modify, the assistant reads messages — only when the user asks." |
| 5 | Chat: "Archive the newsletter from Acme and label the invoice thread 'Invoices'" → show it happen, then show Gmail confirming the change | "The same scope lets it modify labels and archive — in direct response to the request." |
| 6 | Chat: "Reply to Maria saying I'll join at 4pm" → show the sent reply in Gmail | "And to send replies the user dictates." |
| 7 | Chat: "Create a 30-minute event tomorrow at 3pm called Design review" → show it appear in Google Calendar | "Using calendar.events, the assistant creates events on request." |
| 8 | Chat: "Move that to 4pm and then delete it" → show update + delete in Calendar | "And update or delete them — always on explicit instruction." |
| 9 | Show your privacy policy page section on Google data / Limited Use | "All Google data use follows the Limited Use policy, described in our privacy policy at <url>." |

**Tips to pass first time:** real (test) data only, no fake mockups; one continuous take per feature so reviewers see cause→effect; keep the granting account and the demoing account the same; don't cut away from the consent screen before all scopes are visible.

---

## 5. Code change required to actually request the scopes

Add the two scopes to every Supabase Google sign-in / link call (re-consent already configured via `access_type=offline`, `prompt=consent`):

- `minion_hub/src/routes/login/+page.svelte` (~line 46) — change `scopes: 'email profile'` →
  `scopes: 'email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.events'`
- `minion_hub/src/lib/components/users/ConnectedIdentities.svelte` (`linkIdentity`, ~line 48) — add the same `scopes:` to `options`.
- `minion_site/src/routes/(app)/login/+page.svelte` and `.../register/+page.svelte` — same `scopes:` string.

After deploy, existing users must log in once more to re-consent (their current refresh tokens lack these scopes — proven 2026-06-11: all gws calls returned `403 insufficient authentication scopes`). See memory `gws-cli-login-scopes-gap`.

> Until verification passes, only accounts added as **Test users** on the consent screen can grant the new scopes.
