# Spec 040 evidence

All captures: private headless Chromium (Playwright driving `/usr/bin/chromium`), 2026-10-24, locale `es-PE` unless noted, dark colour scheme, device scale 1.

- `taste/minion-ai.org.{md,json}` + `minion-ai.org-{1440,390}-{viewport,full}.jpeg` + `-dom.json`: **BEFORE**, production `https://www.minion-ai.org/` (same composition as `minion_site` `origin/dev` 4edd54f).
- `taste/basecamp.com.*`, `taste/holded.com.*`, `taste/waveapps.com.*`: reference analyses (taste skill, 4 steps + "Storytelling lens"). gusto.com served a Cloudflare challenge, so waveapps.com replaced it. Third-party full-page captures were dropped for size except basecamp's (its analysis cites them).
- `screens/after-{1440,390}-{viewport,full}.jpeg`: **AFTER**, `feat/site-storytelling` on a local dev server (`localhost:5231`), Spanish.

Reference choice, one line each:
- basecamp.com: tells a problem-first story in an owner's voice with one filled button and no counters as proof.
- holded.com: Spanish-first ERP for small businesses, the same buyer and promise ("organize your business").
- waveapps.com: calm trust for non-technical small-business owners, with an FAQ written as the owner's fears.
