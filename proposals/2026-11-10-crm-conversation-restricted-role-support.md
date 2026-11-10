---
id: 2026-11-10-crm-conversation-restricted-role-support
title: Support CRM conversation analysis within record and sensitive-field restrictions
status: draft
created: 2026-11-10
updated: 2026-11-10
repos: [minion_hub]
tags: [auth]
effort: M
source: bounded follow-up from CRM analyst authentication repair
---

# CRM conversation analysis for restricted roles

## AS-IS

The CRM analyst authentication repair explicitly rejects conversation themes and
semantic search for roles with CRM owner-only scope or field level below the
canonical sensitive-field threshold. This preserves data restrictions while
restoring the existing tools for unrestricted authorized roles. The guards and
their `TODO(handoff)` comments are in the two existing handlers under
`src/routes/api/gateway/{crm-conversation-themes,search-crm-conversations}/+server.ts`.

The themes service already accepts `ownerId`, but the semantic search service
filters only by organization and returns unstructured content. Applying an owner
filter to one service alone does not qualify both tools or sensitive-field
handling. See the originating authentication proposal/spec and EGM evidence at
`audits/2026-11-10-crm-analyst-auth/`.

## TO-BE

After a separately approved design, authorized restricted roles can use these
tools only over records and fields their current CRM permissions allow. Records
with unresolved ownership never become an organization-wide fallback. Neither
summaries nor unstructured snippets expose information hidden by the effective
field-level policy.

## DELTA

Design both retrieval paths' owner and sensitive-field contracts before removing
either guard. Qualify owned versus foreign/unresolved/deleted contacts,
organization isolation, current membership/policy changes, aggregate counts and
semantic result content, including embedded phone/email/name references. Specify
the treatment of unstructured summaries before claiming reliable masking.

The definition of done is separately approved scoped/masked behavior and real
query-boundary privacy tests for both endpoints. Current guards remain in place
until that evidence exists. This capture does not authorize implementation,
permission expansion or production configuration changes.

## Out of scope

This follow-up does not block delivery of the authenticated unrestricted-role
repair, and it does not expand the currently approved release. No schema, query,
masking or permission change is implemented by this proposal.
