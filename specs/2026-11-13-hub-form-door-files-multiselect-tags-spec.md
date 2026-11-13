---
id: 2026-11-13-hub-form-door-files-multiselect-tags-spec
title: Form doors take photos and files, multiple-choice answers and tag the contact
stage: dev
status: implementing
pass: 1
created: 2026-11-13
updated: 2026-11-13
repos: [minion_hub]
type: feature
pr: 657
related: [2026-10-24-hub-collection-points-spec]
tags: [crm, security, data]
---

# Form doors take photos and files, multiple-choice answers and tag the contact

Requested directly by the owner on 2026-11-13 for a FACES model-casting form on
facesculptors.net. Skipped stages, stated here: no separate proposal, and no FigCraft
as-is/to-be proposal for the editor and public-page additions. `security` + `data` tags keep the
human gates at approval and merge: this adds an anonymous file upload.

## 0. Product

A business owner can ask for photos, files and "pick several" answers on a public form, and
have everyone who submits it tagged in the CRM, without leaving the form door they already
use for leads.

## AS-IS (hub `origin/master` 67bb91cf)

- Form door field types: `text`, `textarea`, `phone`, `email`, `select`, `date`, `checkbox`
  (`src/lib/doors/kinds/form.ts`). A submission value is a string or a boolean.
- No way to attach a file to a submission. Staff attachments exist
  (`attachments.service.ts`, `attachment_links`, object type `crm_contact`) but every path
  needs a signed-in profile.
- A submission finds or creates a CRM contact (`ensureCrmContact`, DNI match from hub #655).
  It never tags the contact.
- The 20-field cap is already gone (hub #655, merged 2026-11-12).

## TO-BE

1. Field type `multiselect`: the answer is a list of distinct configured options. Required
   means at least one.
2. Field type `file` with `accept: 'image' | 'any'` (default any) and `maxFiles` 1–10
   (default 1): the answer is a list of uploaded file ids.
3. `POST /api/doors/public/[slug]/upload?field=<key>&name=<file name>`, body = the file,
   `Content-Type` = its MIME type, at most 4 MB → `{ fileId }`. Errors `{ error }`:
   400 `invalid_field` | `mime_not_allowed` | `invalid_body`, 404 `not_found`,
   413 `too_large`, 429 `too_many`, 507 `quota_exceeded`, 500 `server_error`.
4. On submit, each file id is linked to the submission's CRM contact as an attachment.
5. Door config `tagIds` (≤ 10 manual customer tags): applied to the submission's contact,
   new or matched.
6. `/d/<slug>`, the door editor and the submissions panel handle the two types and the tags.

### Invariants

- I1. An upload is accepted only for a `file` field of an active form door, within the MIME
  allowlist (image fields: jpeg, png, webp, heic, gif), 4 MB, and the org storage quota.
- I2. An uploaded file is invisible to staff until a submission claims it; an unclaimed
  upload is deleted by the existing attachment sweeper (24 h).
- I3. A submission can only claim a file that a door upload of the same org stored: no
  uploader, CRM-only, never linked or trashed, under 23 h old. Any other id rejects the
  whole submission and nothing is written, including a contact created in that request.
- I4. A submission with files and no contact (no phone or email) is rejected.
- I5. Tag ids that are not manual customer tags of the door's org are skipped, never applied.
- I6. No response, log line or notification carries a file name, file content or answer.

## DELTA

| Transition | Proof |
|---|---|
| `multiselect` / `file` validate per field | `form.test.ts` "multiselect and file fields" |
| Upload refusals and stored row shape (I1, I6) | `doors-form.service.test.ts` "uploadDoorFile", `upload/server.test.ts` |
| Claim scope and rollback (I3, I4) | `doors-form.service.test.ts` "door tags and files"; the statement planned with `EXPLAIN` on the production schema |
| Tag scope (I5) | same file, tag SQL + params |
| End to end on a real database and bucket | preview run on hub #657 before merge (open) |

## Out of scope / open ends

- Files over 4 MB: needs a presigned intent and a bucket CORS rule for the embedding site
  (`shortcut:` comment in `uploadDoorFile`).
- Virus scanning of uploads (staff uploads have none either).
- An audit-log row for the attachment link.
