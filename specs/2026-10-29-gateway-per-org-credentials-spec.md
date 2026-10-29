---
id: 2026-10-29-gateway-per-org-credentials-spec
title: Gateway per-org credentials — no shared operator token in any browser
stage: spec
status: review
verdict: pending
type: feature
pass: 1
created: 2026-10-29
updated: 2026-10-29
repos: [minion_hub, minion, minion_site, minion-meta]
tags: [security, permissions]
---

## 0. Product

**Spec Kit feature:** [`specs/045-gateway-per-org-credentials/`](045-gateway-per-org-credentials/spec.md), with plan.md, tasks.md and the source design (design.md, goldfish-reviewed) alongside. Status: spec, awaiting owner approval.

**Owner rule (2026-10-29):** no one holds the gateway's master key. Browsers connect only with a hub-issued JWT:
- checked against DB membership at every issue;
- bound to one gateway by its audience;
- 15-minute TTL, renewed over the socket;
- expired sockets closed.

Only platform admins get gateway admin. The shared token stays server-side and is rotated after a 7-day bake.

**Slices:**
- A0: site leak fix, draft PR #39;
- A1: gateway;
- A2/A3: hub issuance and client;
- A4: delete the token endpoint.

Security-tagged: the owner approves the spec and merges every PR.

**Out of scope:** hub-sent revocation, tailscale roles, org filters on read methods and org-admin channel setup (both spec 042), and the site members JWT. All are in `proposals/2026-10-29-gateway-per-org-credentials-followups.md`.

**Verification:** each slice's tests are in tasks.md. The launch probe and acceptance are in design.md §5. Success criteria SC-001 to SC-004 are in the spec.
