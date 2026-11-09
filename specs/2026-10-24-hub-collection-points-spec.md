---
id: 2026-10-24-hub-collection-points-spec
title: Hub collection points — doors, attribution, follow-up, FAQ, offers
stage: spec
status: draft
pass: 1
created: 2026-10-24
updated: 2026-10-24
repos: [minion_hub, minion-meta]
tags: [security, data, crm, ui]
---

## 0. Product

Spec Kit feature: [`specs/041-hub-collection-points/`](041-hub-collection-points/spec.md), with plan.md, tasks.md and contracts/ alongside.

A business's customers reach it through single-purpose public "doors": the existing booking link plus new form, FAQ and offer pages under `/d/<slug>`. Every door writes into the business's own CRM, tagged with where the person came from. Form leads who do not buy get one automatic WhatsApp follow-up. A Doors view shows views → submissions → new contacts → customers per door, with an on/off switch. Contact pages gain a "what to offer next" panel. The first real door replaces the FACES intake form, which loses patient data today.

Seven hub slices. S0 (foundation) is the only serial gate; S3 is independent. Security and data tagged: the owner approves the spec and merges every slice.

**Out of scope:** online payment links (Culqi/Mercado Pago), a UI that writes opt-out, staff notifications for new submissions, a submissions retention policy (all in `proposals/2026-10-24-hub-collection-points-followups.md`).

**Verification:** each slice's live `dev:local` acceptance check is in the Spec Kit plan (§Slices). Post-merge checks (prod first-touch SQL, FACES intake cut-over, jobs-tick JSON) are in plan §Verification. Success criteria SC-001 to SC-006 are in the spec.
