# Feature Specification: Organization API keys and linked domains (base)

**Feature Branch**: `spec/121-org-api-keys-domains` (meta); code branches are per slice in `minion_hub`

**Created**: 2026-11-16

**Status**: Draft

**Tags**: crm, security, data — human gates at approval AND merge (Constitution V)

**Input**: Owner, 2026-11-16: "Build the per-org api key feature. Use speckit and egm. also build the base for the dns validation. I need you to make this process as simple as possible (kind of how resend email validates dns, one-click if possible)". Earlier, on key ownership: "Yes, it should belong to the ORG." Earlier, on forms: "Eventually, we can consider a form builder to embed into a subdomain like modelos.facesculptors.net. This would need DNS validation." Source proposal: `proposals/2026-11-16-org-api-keys-and-linked-domains.md`. The key design continues story US3 of the parked `specs/114-doors-site-sdk/`.

## AS-IS → TO-BE → DELTA

### AS-IS (hub `origin/master` at `16def9eb`, read on 2026-11-16)

- A form door has two public write endpoints, `submit` and `upload`, under `/api/doors/public/<slug>/`, and a hosted page `/d/<slug>`. Anyone may call them without identifying themselves.
- Their rate limits count per caller address and door: 5 submissions and 40 uploads per minute (`submit/+server.ts:12,34`, `upload/+server.ts:12,33`). When a customer's own server forwards its visitors' forms (as the FACES site does), every visitor shares the server's address, so one busy minute blocks everyone. This was read in the code, not observed in production.
- An organization has no API keys. No table stores a hashed secret that belongs to an organization.
- An organization has no record of a domain it owns. The hub answers only on its own address. No code talks to the hosting provider, and no code reads DNS records except a guard against internal addresses (`ssrf-guard.ts:195`).
- The hub does not look at the host name of a request. If an extra host name were attached to the hub's hosting project today, the whole hub, login page included, would answer on it.
- Door slugs are unique across all organizations (`crm_doors_slug_uniq`).

### TO-BE

1. An organization admin creates named API keys on a new settings page, sees each secret once, and revokes keys. A server that sends a valid key with a form submission or a file upload may state the visitor's address, so rate limits count per visitor again, under a ceiling per key.
2. An organization admin links a subdomain they control. The hub shows one DNS record to add, keeps checking by itself, and marks the domain active when the record is found. From then on that host name serves the organization's hosted form pages, with a valid certificate, and nothing else of the hub.

### Invariants (must NOT change)

- A call to `submit` or `upload` without a key behaves exactly as today, limits included. The current FACES site keeps working unchanged.
- The hub validates every submission against the stored door settings. No response, log line or error carries a submitted value or a key.
- On the hub's own address every page and endpoint behaves as today.
- A door is reachable only for its own organization's linked domains; another organization's domain never shows it.
- Nothing in this feature changes existing doors, contacts or submissions.

### DELTA

| # | Transition | Proved by |
|---|---|---|
| D1 | No keys → an admin creates, lists and revokes keys that belong to the organization | US1 |
| D2 | Anonymous server calls only → a call with a valid key is identified, and may state the visitor's address for rate limiting | US2 |
| D3 | No domain record → an admin adds a subdomain and sees the one DNS record it needs | US3 |
| D4 | No DNS reading → the hub checks the record by itself and activates the domain, certificate included | US3 |
| D5 | Hub ignores the host name → a linked host serves only its organization's form pages and their endpoints | US4 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and revoke an organization API key (Priority: P1)

An organization admin opens Settings → Developers, names a new key and creates it. The secret is shown once with a copy button. The list afterwards shows each key's name, first characters, creation date, last use and who created it. The admin can revoke a key; a revoked key stops working at once.

**Why this priority**: every other key behaviour depends on keys existing; the page is also where linked domains live.

**Independent Test**: create a key, reload the page and confirm the secret is no longer shown, revoke it, and confirm it is listed as revoked.

**Acceptance Scenarios**:

1. **Given** an org admin, **When** they create a key with a name, **Then** the full secret is shown once, and after leaving the page only its name, first characters, dates and creator are visible.
2. **Given** a member without the settings-management permission, **When** they open the page or call its endpoints, **Then** they are refused and told their role does not allow it.
3. **Given** an active key, **When** an admin revokes it, **Then** it is listed as revoked with the time and the person, and it cannot be restored.
4. **Given** an organization with 10 active keys, **When** an admin creates another, **Then** the hub refuses and says the limit is reached.
5. **Given** the person who created a key leaves the organization, **When** the key is used, **Then** it still works.

---

### User Story 2 - A server submits leads with a key and its visitors' addresses (Priority: P1)

A customer's server forwards a form submission or a file to a door and sends the organization's key and the visitor's address. The hub counts the per-visitor limits against that visitor, and a higher ceiling against the key.

**Why this priority**: this is what the key is for; without it the key has no effect.

**Independent Test**: with one key, send six submissions in a minute for six different visitor addresses and see all accepted; send six for one visitor address and see the sixth refused; revoke the key and see the next call refused.

**Acceptance Scenarios**:

1. **Given** a valid key of the door's organization, **When** a server submits with a visitor address, **Then** the submission is stored and the per-visitor limit is counted for that address.
2. **Given** a valid key and no visitor address, **When** a server submits, **Then** the submission is stored and only the per-key ceiling is counted.
3. **Given** a revoked key, an unknown key, a malformed key, or a key of another organization, **When** it is sent, **Then** the call is refused with one and the same answer, nothing is stored, and the stated visitor address is ignored.
4. **Given** no key, **When** a server states a visitor address, **Then** the address is ignored and the call is treated exactly as today.
5. **Given** a valid key, **When** calls exceed the per-key ceiling within a minute, **Then** further calls are refused until the minute ends.
6. **Given** repeated wrong keys from one caller, **When** they exceed 10 in a minute, **Then** further wrong attempts from that caller are answered "too many requests" until the minute ends.
7. **Given** a key is used, **When** an admin opens the list, **Then** "last used" is at most one minute behind.

---

### User Story 3 - Link a subdomain with one DNS record (Priority: P2)

An admin types a subdomain, for example `forms.example.com`. The hub shows one record to add at their DNS provider, with copy buttons, and a status. While the page is open the hub re-checks by itself. When the record is found the status becomes active; the admin never has to press "verify". A "check now" button exists for the impatient. The admin can remove a domain at any time.

**Why this priority**: it is the base for hosting an organization's forms on its own name; it has value only together with US4.

**Independent Test**: add a subdomain, create the record at the DNS provider, keep the page open, and see the status turn active without a click; open `https://<subdomain>/d/<slug>` and see the form with a valid certificate.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they add a valid subdomain, **Then** it is listed as "waiting for DNS" with exactly one record to add (type, name, value) and copy buttons.
2. **Given** a waiting domain whose record now exists, **When** the page is open, **Then** within 30 seconds the status advances without a click, first to "issuing certificate" if the host is not ready, then to "active".
3. **Given** a waiting domain whose record is missing or points elsewhere, **When** it is checked, **Then** the status stays waiting and says what was found instead ("no record found" or "points to X").
4. **Given** the hosting provider asks for an extra ownership record (the domain is used by another account there), **When** the domain is checked, **Then** that second record is shown the same way and the status says why.
5. **Given** two organizations add the same subdomain, **When** the owner of the DNS adds the record shown to one of them, **Then** only that organization's domain becomes active; the other stays waiting.
6. **Given** an active domain, **When** an admin removes it, **Then** the host stops serving the organization's forms and the name is released at the hosting provider.
7. **Given** an apex domain (`example.com`), a hub-owned name, an invalid name, or a sixth domain, **When** an admin adds it, **Then** the hub refuses and says why.
8. **Given** the hub has not been set up for domains (no hosting credentials), **When** an admin opens the section, **Then** it says linking domains is not available yet, and adding is refused.

---

### User Story 4 - A linked host serves only that organization's forms (Priority: P2)

A visitor opens `https://forms.example.com/d/<slug>`. They see the organization's form, can upload files and submit, and get the same thank-you state as on the hub's address. Any other address on that host, and any door of another organization, answers "not found".

**Why this priority**: without this guard, linking a host would expose the hub's login and every other page on the customer's name.

**Independent Test**: on an active linked host, load a form of the owning organization and submit it; then request the login page, an internal API endpoint, and a door of another organization, and get "not found" for each.

**Acceptance Scenarios**:

1. **Given** an active linked host, **When** a visitor opens a form page of the owning organization and submits it, **Then** the submission is stored as on the hub's address.
2. **Given** an active linked host, **When** any page or endpoint other than the form pages, their submit/upload/click endpoints and the files those pages load is requested, **Then** the answer is "not found".
3. **Given** an active linked host, **When** a door of another organization is requested, **Then** the answer is "not found".
4. **Given** a host that is listed but not active (waiting or removed), **When** anything is requested on it, **Then** the answer is "not found".
5. **Given** the hub's own address, **When** anything is requested, **Then** behaviour is unchanged.
6. **Given** an active linked host, **When** an admin looks at the door in the hub, **Then** the door's public link is offered on that host as well.

---

### Edge Cases

- The DNS provider hides the record (a proxy in front of it): the check reports "no record found" and the help text says to switch the proxy off for this record.
- The record is correct but the certificate is not issued yet: status "issuing certificate", not active.
- The record is removed after activation: the host stops resolving; the hub keeps listing the domain as active until an admin removes it (no periodic re-check in the base; named in Out of scope).
- The hosting provider is unreachable during add, check or removal: the admin sees a retryable error; no half-state is shown as active; removal can be repeated.
- A key is sent together with a browser `Origin` of another site: browsers cannot read the answer, as today; the hub does not add cross-origin permissions.
- The stated visitor address is not a valid IP address: the call is refused as a bad request (key valid) and nothing is stored.
- The same key is used for doors of two organizations: it works only for its own.
- A revoked key's name is reused for a new key: allowed.
- A very long or non-ASCII domain name: refused as invalid (ASCII host names only in the base).

## Requirements *(mandatory)*

### Functional Requirements

**Organization API keys**

- **FR-001**: Members with the settings-management permission MUST be able to create a named key, list keys, and revoke a key, on a Developers settings page. Others MUST be refused with a message that their role does not allow it.
- **FR-002**: The secret MUST be shown exactly once, at creation. Only a non-reversible form of it and its first characters MUST be stored.
- **FR-003**: A key MUST belong to the organization, record who created it, and keep working when that person leaves.
- **FR-004**: An organization MUST be limited to 10 active keys. Revocation MUST take effect on the next call and MUST NOT be reversible.
- **FR-005**: `submit` and `upload` MUST accept a key. With a valid key of the door's organization the call is processed; with any invalid, revoked, malformed or foreign key the call MUST be refused with one indistinguishable answer and nothing stored.
- **FR-006**: With a valid key, a caller MAY state the visitor's address. The per-visitor limits (5 submissions, 40 uploads per minute and door) MUST then count against that address. A per-key ceiling (60 submissions, 240 uploads per minute) MUST always apply. Without a valid key a stated address MUST be ignored.
- **FR-007**: Wrong-key attempts MUST be counted per caller address; beyond 10 in a minute the caller MUST be answered "too many requests". A malformed key MUST be refused without a database lookup.
- **FR-008**: The time a key was last used MUST be recorded, at most one minute stale.
- **FR-009**: Calls without a key MUST behave exactly as before this feature.
- **FR-010**: A key, or any part beyond its stored first characters, MUST never appear in a log, an error, or a response after creation.

**Linked domains**

- **FR-011**: Members with the settings-management permission MUST be able to add a subdomain, see its status and the record(s) it needs, trigger a check, and remove it. Limit: 5 domains per organization.
- **FR-012**: The hub MUST require one DNS record per domain in the normal case, whose value is unique to that organization's request, so the record both proves control of the name and routes visitors to the hub.
- **FR-013**: Activation MUST require that the record resolves to that request's own value. The same name requested by another organization MUST NOT become active through a record that carries the first organization's value. A name MUST be active for at most one organization.
- **FR-014**: While the settings page is open, waiting domains MUST be re-checked automatically at least every 30 seconds; a manual check MUST also exist. Checks MUST be limited per organization so the page cannot be used to flood DNS or the hosting provider.
- **FR-015**: After the record is confirmed the hub MUST register the host with its hosting so that a certificate is issued, and MUST show any extra record the hosting asks for. A domain is active only when the host is confirmed ready.
- **FR-016**: Each status MUST be shown in plain words with what was found and what to do next: waiting for DNS, issuing certificate, needs an extra record, active.
- **FR-017**: Removing a domain MUST stop serving on it and release the name at the hosting provider. Removal MUST be repeatable if the provider call fails.
- **FR-018**: The hub MUST refuse apex names, names under its own domains, malformed names, and names already active for another organization (the last one only at activation, without revealing which organization).
- **FR-019**: If the hub lacks the hosting credentials or the routing name, the section MUST say the feature is unavailable and adding MUST be refused.

**Serving on a linked host**

- **FR-020**: On a host that is listed as a linked domain, the hub MUST serve only: the hosted form pages of the owning organization, their submit/upload/click endpoints, and the files those pages load. Everything else MUST answer "not found". Hosts not active MUST answer "not found" for everything.
- **FR-021**: On a linked host, a door of another organization MUST answer "not found".
- **FR-022**: Behaviour on the hub's own addresses (production, preview and local) MUST be unchanged.
- **FR-023**: The door's admin page MUST offer the public link on each active linked domain of the organization.

**Cross-cutting**

- **FR-024**: Every new text MUST exist in English and Spanish. New screens MUST use the shared design tokens and components and pass the design lints.
- **FR-025**: New tables MUST be readable and writable only within their organization, except the two lookups that happen before an organization is known (key by its first characters, domain by host name).

### Key Entities

- **Organization API key**: a named secret of one organization; visible first characters; created by, created at; last used at; revoked by, revoked at.
- **Linked domain**: a host name requested by one organization; its unique record value; status (waiting, active); what the last check found; any extra record the hosting asked for; created by/at, activated at, removed by/at.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin creates a key and copies it in under 30 seconds, in 3 clicks or fewer after opening the page.
- **SC-002**: With one key, 20 visitors each submitting once within a minute through one server are all accepted (today the sixth is refused).
- **SC-003**: A revoked key is refused on the very next call.
- **SC-004**: Linking a subdomain needs one DNS record and zero clicks after adding it: once the record is visible on the public internet, the status reaches active within 2 minutes with the page open.
- **SC-005**: On a linked host, 100% of requests outside the form pages and their endpoints answer "not found" (checked against the login page, the home page, three internal API endpoints and a foreign organization's door).
- **SC-006**: The existing FACES forms pass the same live test as on 2026-11-14 with no change on the site.

## Assumptions

- "Per-org API key" means the key of parked spec 114 (story US3): its only use now is on the door `submit` and `upload` endpoints. One permission ("submit to doors") is implied by having a key; a list of scopes is stored for later but not offered as a choice.
- "The base for DNS validation" includes serving the organization's existing hosted form pages on the linked host. Without that the verification could not be tried end to end, and attaching a host without the guard of US4 would expose the hub.
- Subdomains only. An apex name cannot carry the kind of record used here.
- The home address (`/`) of a linked host answers "not found" in the base; choosing a default form for it belongs to the later form builder.
- "One click if possible": the base reaches zero clicks after the record exists (automatic checking). Having the DNS provider create the record for the customer in a popup (the Domain Connect protocol) is not in the base.
- The owner sets up once: a wildcard DNS name under the hub's domain that points at the hosting, and hosting credentials for the hub. Until then the domains section says "not available".
- The hosting accepts a customer host that reaches it through the hub's intermediate name. This is NOT verified; the plan starts with a test of it and names the two-record fallback.
- Key permission is the existing settings-management permission; no new role is added.

## Out of scope

Cross-origin (browser) use of keys; scopes beyond door submission; key expiry dates and rotation reminders; recording which key made a submission; a public read of a door's definition; provider-side one-click record creation (Domain Connect); apex domains and redirects; a default form at `/`; periodic re-checks of active domains and alerts when a record disappears; per-domain branding; e-mail sending domains; booking pages (`/book/<slug>`) on linked hosts; the form builder itself.
