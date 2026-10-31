---
id: 2026-10-29-site-clinic-journeys-spec
title: Site — clinical-chart aesthetic + one patient's week as the demo
stage: done
status: shipped
pass: 1
created: 2026-10-29
updated: 2026-10-29
repos: [minion_site, minion-meta]
tags: [ui, ux]
---

## 0. Product

Spec Kit feature: [`specs/044-site-clinic-journeys/`](044-site-clinic-journeys/spec.md), with plan.md, tasks.md, evidence/taste (jane.app, pabau.com, parsleyhealth.com) and evidence/screens alongside.

The landing replaces the split-flap concourse with the clinical chart (paper-bone canvas, white sheets, one clinic teal, serif headline voice, rubber-stamp states), keeping every section's content, and rewrites the "What changes in your week" demo as seven chapters of one patient's week, each a working interaction on a real Minion feature (WhatsApp inbox + slot offer, automatic reminder, visit completion with consumption confirmation cascading to stock/till/receipt, approval gate, AI stock alert and AI FAQ draft marked premium, the week on one chart). Two themes (`clinic`, `clinic-night`) land in the shared token contract; the site vendors the new durability archive.

One site PR to `master` (scoped release) and this meta PR to `dev`. No data, auth or security surface; the owner reviews on a phone and merges.

**Out of scope:** `/members` (inherits fonts and plates through shared classes, not reviewed), product screenshots in place of the interactive demo, a newsletter or updates list (proposal `2026-10-24-site-stay-in-touch-updates`), dropping the night theme.

**Verification:** site gates (check, lint:design, lint:tokens, test, build, Prettier) and headless screenshots at 1440/390 × es/en × light/night in the Spec Kit plan; success criteria SC-001 to SC-005 in the spec.
