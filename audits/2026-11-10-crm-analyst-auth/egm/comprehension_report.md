# EGM Stage 6 — Comprehension

Reviewer: `/root/crm_egm_comprehension`, fresh context. Completed. No Blocker or
Major; one Nit, COMP-001, repaired before critique. Parent preserves full
paraphrase and findings below. No runtime qualification is claimed.

## What this proposes

Restore gateway authentication for exactly two existing CRM conversation
endpoints, allowing assigned personal agents to use the current member's CRM
authority. Keep the existing principal, organization, membership, CRM-view and
search-entitlement checks, and reject roles whose record or sensitive-field
restrictions cannot currently be enforced by these tools. Qualify the resolver
and real handlers with synthetic tests, then separately record implementation
review, CI, deployment and bounded runtime verification.

## How the existing system works, per this document

Hub recognizes gateway Bearer credentials only on explicitly admitted routes;
the two conversation endpoints are missing, so machine requests fall through to
browser-session authentication and receive 401. The handlers already resolve
the assistant's trusted principal and enforce CRM view, while search additionally
checks its AI entitlement. Their existing aggregate and semantic-search operations
do not reliably enforce restricted CRM scopes. The gateway already sends its
configured server identity, so the proposed repair changes Hub alone.

## Findings and resolution

COMP-001 — Nit — Required review workflow lacks a definition or reference.
Affected original lines 33–35,180,202–206. The spec requires EGM, Standards/Spec
and a five-stage flow without defining or linking the governing process.
PROPOSE FIX accepted: expand the acronym, name all five stages, link the
governing workflow and define post-code Standards/Spec review. Applied before
the next stage. No Blocker or Major comprehension findings.

Completed reads: comprehension persona; entire spec; Hub AGENTS; originating
proposal; identity resolver, assistant principal and both handlers; relevant
permission/RBAC definitions. No tests, builds, browser, production, credentials,
history or memory; no file or git changes by reviewer.
