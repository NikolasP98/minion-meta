# Feature Specification: Doors site SDK — a lead form on any site with two lines

**Feature Branch**: `114-doors-site-sdk` (meta); code branches are per slice in `minion_hub`, `minion-meta` and `faces-landing`

**Created**: 2026-11-13

**Status**: Parked 2026-11-13 after slice S0 (owner decision; see `plan.md`)

**Tags**: crm, security, data — human gates at approval AND merge (Constitution V)

**Review**: EGM stages 5–7 on 2026-11-13 changed this spec (see `plan.md` § Review record).

**Input**: Owner: "Find ways to improve the MINION Doors SDK so that sites that want to capture leads via forms can set it up with minimal boilerplate, easy to set up. We might even need an API Key generator or a native way to link a domain to an org." Follow-ups: "Please consider strategies to lower the line count even more"; on key ownership: "Yes, it should belong to the ORG." Source proposal: `proposals/2026-11-13-doors-site-sdk-low-boilerplate.md`.

## AS-IS → TO-BE → DELTA

### AS-IS (evidence: FACES `/modelos`, shipped 2026-11-13 in hub PR 657 and faces-landing PRs 10–12)

- A door exposes three public endpoints (`submit`, `upload`, `click` under `/api/doors/public/<slug>/`) and a hosted page `/d/<slug>`. A page on another domain cannot call them from the browser: no cross-origin answer exists.
- The FACES site therefore carries 1,108 lines for one form. Code, 847: `src/lib/form/modelos.ts` 160, `src/routes/modelos/+page.server.ts` 35, `upload/+server.ts` 43, `+page.svelte` 477, `CountryInput.svelte` 62, `FaceGuide.svelte` 42, `data/countries.ts` 28. Translations, 261: the `modelos` block of `src/lib/i18n/{es,en,pt}.ts`, 87 lines each. (Counted with `wc -l` on `faces-landing` `master`, 2026-11-13. `src/lib/form/hub.ts` belongs to `/intake` and is not counted.) It also copies the hub's list of accepted file types by hand.
- The door's field list cannot be read from outside. The production door was created with a SQL insert so that both lists matched.
- A form door has no sections, no conditional fields, no country-aware phone or document input and no photo guides; a site that wants them must build its own form.
- `submit` allows 5 per minute and `upload` 40 per minute per IP per door, keyed on the caller's address. Behind a site's server that address is the site's server, so all visitors share one bucket (read in `submit/+server.ts` and `upload/+server.ts`; not observed failing in production).
- Files travel through two servers and are capped at 4 MB.
- An organization has no API keys and no record of the sites that belong to it.

### TO-BE

A site owner adds a script tag and one element naming the door. The form appears in the page's own typography, validates, uploads, submits, and shows success or errors, with no server code on the site. Everything the FACES form needed (sections, conditional field, country pickers, photo guides, translations) is configured on the door in the hub. Server-side callers that must keep their own step use an organization API key.

### Invariants (must NOT change)

- A request with no `Origin` header, or with the hub's own origin, and no key, is treated exactly as today (this is how the hosted page and server-side callers such as the current FACES site call the hub).
- **Deliberate tightening (owner to confirm at approval)**: a browser request whose `Origin` is a foreign site that is not allowed for that door is refused with `403`. Today such a request is processed although the browser cannot read the answer. Submit additionally requires a JSON content type.
- The hub re-validates every submission against the stored door config; no response, log line or error carries a submitted value.
- Rate limits, the honeypot, the consent rule, file claiming, contact matching and tagging behave as today.
- The hosted page `/d/<slug>` keeps working. A door whose configuration uses none of the new settings keeps today's renderer for one release; a door that uses them renders with the same component as the embedded element.
- A door is embeddable only when its own "Allow embedding on our sites" switch is on (default off), in addition to the organization's allowed sites.
- Existing doors with today's config keep working without edits.

### DELTA

| # | Transition | Proven by |
|---|---|---|
| D1 | Org admins manage a list of allowed sites | US1 scenarios 1–3 |
| D2 | Public door endpoints answer cross-origin requests for the door organization's allowed sites only | US1 scenarios 2, 4 |
| D3 | A door's public form definition is readable by slug | US1 scenario 2, FR-006 |
| D4 | An embeddable element renders, validates, uploads and submits a form door | US1 scenario 2; SC-001 |
| D5 | Form doors gain sections, conditional fields, number fields, country-aware phone and document inputs, photo guides, a per-door embedding switch | US2 |
| D5a | Public paths tolerate a configuration they cannot read (answer "not found" instead of failing) before any door uses new settings | FR-019a |
| D6 | Organizations create, scope and revoke API keys; a key holder may submit for a visitor | US3 |
| D7 | Door labels can be translated; the element picks the page language | US4 |
| D8 | FACES `/modelos` runs on the element; its proxy routes and copied lists are deleted | US4 scenario 3; SC-002 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Put a door's form on my site with two lines (Priority: P1)

An organization admin lists their site in the hub. Their web developer pastes a script tag and one element with the door's slug. Visitors fill the form on the site; leads land in the CRM exactly as from the hosted page.

**Why this priority**: it removes the server code, the duplicated field list and the wrong rate-limit bucket in one step, and is the base every other story builds on.

**Independent Test**: on a blank HTML page served from a linked domain, add the two lines; submit a lead with a photo; find the contact, submission and attachment in the CRM.

**Acceptance Scenarios**:

1. **Given** an org admin, **When** they add `https://www.example.com` to Allowed sites, **Then** it is saved, listed, and removable; a member without the org-settings permission can neither see the editor nor change the list.
2. **Given** a linked site and an active form door, **When** a visitor completes the embedded form, **Then** the submission, files, contact and tags are stored as from the hosted page, and the visitor sees the door's success message.
3. **Given** an entry that is not a valid `https` origin (a path, a wildcard, plain `http` other than localhost), **When** the admin saves, **Then** it is refused with a message naming the problem.
4. **Given** a site that is not linked, or a door whose embedding switch is off, **When** a page embeds the element, **Then** the hub refuses with a readable "not allowed" answer, the element shows "this site is not allowed to use this form", and nothing is stored.
5. **Given** a door that is switched off or missing, **When** the element loads, **Then** it shows a neutral "form unavailable" message and makes no further calls.
6. **Given** validation errors from the hub, **When** the visitor submits, **Then** each field shows its message, focus moves to the first one, and typed values and uploaded files are kept.

---

### User Story 2 - Configure a rich form on the door, not in site code (Priority: P2)

A hub user edits a form door and groups fields into titled sections, makes a field appear only when another has a given answer, chooses a phone field with a country picker, a document field with a country picker, and photo fields that show a face-position guide. The hosted page and the embedded element both render it.

**Why this priority**: without it, sites with anything beyond a flat form still hand-build theirs, which is the cost this feature exists to remove.

**Independent Test**: recreate the FACES casting form in the door editor only; the hosted page shows the same sections, conditional "other niche" field, country pickers and five guided photo zones.

**Acceptance Scenarios**:

1. **Given** fields assigned to sections, **When** the form renders, **Then** fields appear under their section titles in order; fields without a section render first.
2. **Given** a field shown only when "Niche" is "Other", **When** the visitor picks another niche, **Then** the field is hidden, not required, and its value is not submitted; the hub applies the same rule when validating.
3. **Given** a phone field with country picker, **When** the visitor picks Colombia and types a number, **Then** the stored value is `+57 <number>`; the default country is the door's configured one.
4. **Given** a document field with country picker defaulting to Peru, **When** the country is Peru, **Then** exactly 8 digits are required; for another country a `CC <5–15 letters or digits>` value is stored.
5. **Given** a photo field with a guide (front, left profile, right profile, left three-quarter, right three-quarter), **When** empty, **Then** the zone shows the matching drawing; after a drop it shows a preview with replace and remove; a file of a type the field does not accept is refused before any upload with the file's name and the reason.
6. **Given** a door saved before this feature, **When** it renders, **Then** it looks and behaves as before.

---

### User Story 3 - Server-side callers use an organization API key (Priority: P3)

An org admin creates a named API key limited to submitting to doors. A site that must keep its own server step sends the key and the visitor's address; the hub counts the rate limit against the visitor, under a ceiling per key.

**Why this priority**: needed only by sites that cannot go browser-direct; the embed covers the common case.

**Independent Test**: create a key, submit a lead from a script with it and a forwarded visitor address, revoke the key, and see the next call refused.

**Acceptance Scenarios**:

1. **Given** an org admin, **When** they create a key, **Then** the secret is shown once, and afterwards only its name, prefix, scopes, creation date and last-used time are visible.
2. **Given** a valid key with the door-submit scope, **When** a server submits to a door of the same organization with a visitor address, **Then** the rate limit is counted for that visitor address and the submission is stored.
3. **Given** a revoked key, a key of another organization, or a key without the scope, **When** it is used, **Then** the call is refused, nothing is stored, and the forwarded address is ignored.
4. **Given** a key, **When** it is sent from a browser on another site, **Then** the browser refuses to send it (the hub does not allow the header cross-origin).

---

### User Story 4 - Translated forms, and FACES runs on the element (Priority: P4)

A hub user adds English and Portuguese labels to a Spanish door. The element shows the language of the page. The FACES `/modelos` page is replaced by the element and keeps its three languages, sections, guides and behaviour.

**Why this priority**: proves the result on the real site and removes the code that motivated the work; depends on stories 1 and 2.

**Independent Test**: load `/modelos` in es, en and pt; submit in each; compare the stored submission with one from the current page.

**Acceptance Scenarios**:

1. **Given** a door with translations, **When** the page language is `en`, **Then** labels, options, help texts and messages are English; a missing translation falls back to the door's own text.
2. **Given** option translations, **When** a visitor submits in English, **Then** the stored answer is the door's canonical option, the same as from a Spanish submission.
3. **Given** the migrated FACES page, **When** a visitor submits, **Then** the CRM result equals today's (contact, tag "Modelo", five photos, optional files), and the site repository no longer contains the forwarding routes, the field list, or the copied file-type list.

### Edge Cases

- The same origin listed by two organizations: each origin grant applies only to doors of the organization that listed it.
- A linked site embeds a door of a different organization: refused like an unlinked site.
- `localhost` and `127.0.0.1` with any port may be listed for development, over `http`.
- An admin removes a site while a visitor has the form open: the next call is refused and the element says the site is not allowed.
- A visitor uploads photos, then the conditional field that owned a value is hidden: hidden values are dropped; uploaded files of visible fields are kept.
- The element is added twice on one page with different slugs: both work independently.
- The script fails to load or the hub is unreachable: the element shows "form unavailable, try again" and a retry control; the page is not otherwise affected.
- A key is pasted into browser code: it works only until revoked; the settings page warns that keys are for servers and offers Allowed sites instead.
- A forwarded visitor address that is not a valid address: ignored; the caller's own address is used.
- More keys than the limit (20 active per organization): creation is refused with the reason.

## Requirements *(mandatory)*

### Functional Requirements

**Allowed sites**

- **FR-001**: Org admins MUST be able to list, add and remove allowed sites for their organization (at most 20).
- **FR-002**: An allowed site MUST be an exact web origin: `https` scheme and host, optional port, no path, no wildcard; `http` only for `localhost` and `127.0.0.1`. Entries are stored normalised (lower case, no trailing slash).
- **FR-003**: Public door endpoints MUST answer cross-origin browser requests when, and only when, the request origin is an allowed site of the organization that owns the door AND the door's embedding switch is on. Any other foreign origin MUST be refused before anything is stored.
- **FR-003a**: Each form door MUST have an "Allow embedding on our sites" switch, off by default; the editor MUST say that scripts on the embedding page can read what visitors type.
- **FR-004**: Changes to allowed sites MUST take effect within one minute.
- **FR-005**: Adding or removing a site and creating or revoking a key MUST be recorded with who did it and when.

**Public form definition**

- **FR-006**: A public read by slug MUST return the door's title, description, visitor-facing field definitions (key, label, type, required, options, help, section, visibility rule, accepted file kinds, file count, guide, default country), consent text, success message, size limit and available languages. It MUST NOT return tags, internal ids of tags or contacts, notification settings, statistics, or any organization data beyond its display name.
- **FR-007**: The public read MUST behave identically for missing, switched-off and non-form doors (one "not found" answer).

**Embeddable element**

- **FR-008**: A site MUST be able to render a form door with one script reference and one element naming the slug, with no build step and no server code.
- **FR-009**: The element MUST validate before sending, upload files with per-file state (uploading, uploaded, failed, retry), shrink large photos before upload, refuse unacceptable files before any upload, submit, and show the success message or per-field errors while keeping the visitor's input.
- **FR-010**: The element MUST inherit the page's font and expose named colours, radius and spacing for styling by the site; it MUST be usable by keyboard and screen reader (labels, error association, focus on first error, live status for uploads).
- **FR-011**: The element MUST announce `ready`, `submitted` and `error` to the page so the site can react (for example, analytics or a redirect), without exposing submitted values in the announcement.
- **FR-012**: The element MUST carry campaign attribution (campaign parameters and referrer) the same way the hosted page does.
- **FR-013**: The hosted page and the element MUST read the same form definition and produce the same stored submission for the same answers. The hub's validation is the authority; the element's own checks are a convenience.

**Richer form configuration**

- **FR-014**: Door editors MUST be able to define sections (title, optional help) and assign fields to them.
- **FR-015**: Door editors MUST be able to make a field visible only when one other choice field (single choice: equals; multiple choice: includes any; checkbox: ticked) matches chosen options. Hidden fields are not required and their values are discarded; the hub enforces the same rule. The controlling field cannot itself be conditional, and a phone or email field that the door relies on to identify the contact cannot be conditional.
- **FR-015a**: A number field type with optional minimum and maximum MUST exist (for example, age 18–99).
- **FR-015b**: Choice options MAY carry a short description shown under the option; fields MAY be marked half width so two sit side by side on wide screens.
- **FR-016**: Phone fields MUST offer an optional country picker placed inside the input, on its left, adding the dialling code; the list covers every country of the Americas and Europe plus common others, with a configurable default.
- **FR-017**: A document field type MUST exist with a country picker. A country with a known rule applies it (Peru: 8 digits). The door's default country stores the bare document; any other country stores the country code and the document.
- **FR-017a**: A phone number with a non-default country MUST match an existing contact only on the full international number, never on its last digits; a document of a non-default country MUST NOT be used to match an existing contact.
- **FR-018**: Image file fields MUST accept an optional position guide from a fixed set (front, left and right profile, left and right three-quarter).
- **FR-019**: Doors saved before this feature MUST load, render, validate and submit unchanged.
- **FR-019a**: A door whose stored configuration a running version cannot read MUST answer "not found" on public paths instead of an error, and this behaviour MUST be in production before any door is saved with new settings.

**Organization API keys**

- **FR-020**: Org admins MUST be able to create a named key with scopes, see it once, list keys with prefix, scopes, created and last-used times, and revoke a key. Keys belong to the organization, not to the person who created them, and survive that person leaving.
- **FR-021**: Only a non-reversible form of the key MUST be stored.
- **FR-022**: A valid key with the door-submit scope MUST allow reading the definition, submit and upload for doors of its organization from servers, and MUST allow the caller to state the visitor's address for rate limiting. A ceiling per key MUST always apply as well. Without a valid key a stated visitor address MUST be ignored. Keys MUST NOT be usable from a browser on another site.
- **FR-023**: Invalid, revoked, wrong-organization or wrong-scope keys MUST be refused with one indistinguishable answer, and attempts MUST be rate limited.

**Translations and FACES**

- **FR-025**: A door has a base language (default Spanish). Door editors MUST be able to add translations (English, Portuguese, Spanish) for labels, option labels and descriptions, help texts, section titles, consent text and success message; stored answers always use the door's canonical options. A page language such as `es-PE` uses `es`; an unsupported language uses the base language.
- **FR-026**: The FACES `/modelos` page MUST be rebuilt on the element and the replaced site code removed. Accepted differences: error messages use the element's standard wording instead of the page's field-specific copy; layout follows the element's sections and half-width rule. Everything else (fields, age range, conditional niche, country pickers, guided photos, treatment descriptions, three languages, stored result) is kept.

### Key Entities

- **Allowed site**: an origin an organization has declared as its own; belongs to one organization; has who added it and when.
- **Organization API key**: a named secret of an organization with scopes, a visible prefix, created, last-used and revoked times, and who created it.
- **Form definition (public view)**: the visitor-facing projection of a form door's configuration.
- **Section, visibility rule, guide, translation**: additions to a form door's configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with a linked site puts a working lead form on a page by adding two lines, in under five minutes, with no server code.
- **SC-002**: The FACES site's code and translations for the casting form drop from 1,108 lines to under 100 (page wrapper with its title texts in three languages, the two lines, and site-specific styling), counted with `wc -l` on the same paths, with the same stored result in the CRM.
- **SC-003**: Two visitors of one linked site submitting in the same minute are counted separately; six submissions from six visitor addresses in one minute all succeed (verified with a route test that varies the caller address, and once in production from two networks).
- **SC-004**: A request carrying a foreign, unlisted `Origin`, or a bad key, stores nothing, in 100% of tested cases (including a request with no content type).
- **SC-005**: Every form door that existed before the change keeps today's renderer and produces the same stored submission for the same answers (fixtures of the two production door configs, `faces-historia-clinica` and `faces-modelos`, in the validation tests).
- **SC-006**: The embedded form can be completed with the keyboard alone, and an automated accessibility scan (axe) of the test page reports no critical or serious issue.
- **SC-007**: The script a site loads is under 60 KB compressed (the build fails above it).

## Assumptions

- Domain ownership is not proven by DNS in this version: an org admin typing the origin is enough, because a listed origin can only post to that organization's own doors. (Owner was asked; no objection recorded. DNS proof can be added later without changing the model.)
- Keys belong to the organization (owner decision, 2026-11-13).
- One conditional rule per field, on one other choice field; no nested logic.
- Files keep the 4 MB limit in this feature. Browser-direct uploads that raise it, a zero-config `minion doors push` command, a published headless client package, and framework-specific wrapper components are out of scope and stay in the proposal (the client package was cut after review: nothing in this feature consumes it).
- An embedded form runs inside the host page: scripts on that page can read what visitors type. That is why embedding is a per-door switch, off by default, and clinical doors should stay hosted.
- No captcha; the honeypot and rate limits remain the spam controls.
- The first key scope is door submit only; reading submissions or contacts by key is out of scope.
- Photo guides are a fixed built-in set of face drawings; custom guide images are out of scope.
