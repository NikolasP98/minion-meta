---
id: 2026-10-24-site-stay-in-touch-updates
title: minion_site: open ends from spec 040 (stay-in-touch list, light-theme mascot, real proof)
status: draft
created: 2026-10-24
updated: 2026-10-24
repos: [minion_site]
effort: M
source: specs/040-site-storytelling
---

# minion_site: open ends from spec 040

Spec 040 retold the landing (problem → method → week → how to start → plans → FAQ → close). These ends were left open on purpose.

**AS-IS → TO-BE**

1. **No opt-in updates list.** A visitor who is not ready can only save the WhatsApp number (`src/lib/components/sections/FinalCTA.svelte`, `TODO(handoff)` above `#stay`). `/api/leads` writes a CRM *lead*, which is the wrong consent for "send me news". TO-BE: a consented subscriber store (email, or a WhatsApp broadcast opt-in with its own consent text), a Minion-branded sender address, and an unsubscribe path; then a one-field form in `#stay`. Needs the owner to pick the channel.
2. **Light theme mascot disappears.** Navbar and Footer paint `/mascot.png` / `/mascot-nav.png` with `filter: grayscale(1) brightness(2.2)`, so on `concourse-day` the mark is near-white on pale steel (screens show it). Dark is the default, so it was left. TO-BE: a dark-ink mascot asset selected by theme in `app.css` (theme layer), or a single SVG that inherits `currentColor`.
3. **No real proof yet.** PRODUCT.md §Evidence on Hand: there are no real testimonials, logos, metrics or case studies, so the landing proves itself only with labelled demonstrations. TO-BE: one real, consented case study (the owner's own clinic is the obvious candidate) written as before/after of their week, with numbers the owner can stand behind, placed between Week and How to start.
4. **Pricing shows no amount.** Business and Scale still read "A medida". The taste baseline and the 2026-06 buyer simulation both flag this. TO-BE: a "desde S/ X al mes" anchor once the owner sets one; no invented number until then.
5. **Dead marketing message keys.** `testimonials_*`, `stats_*`, `features_*`, `dashboard_*`, `channels_*`, `unified_in/out/core_*` have no consumer since the August redesign. TO-BE: delete them from both locales in one commit after confirming `grep` finds no consumer.

**DELTA**: one PR per item; items 1, 3 and 4 need an owner decision first. Tests: item 1 a consent + unsubscribe round trip; item 2 a light-theme screenshot showing the mark; item 5 `check` stays 0/0 and key parity holds.
