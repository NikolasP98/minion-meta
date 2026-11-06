# Research: Design-system baseline and conformance

Sources: feature 012 evidence (`../012-design-system-durability/evidence/`), the Lavish audit rules PAT-01…PAT-14 (`.lavish/design-system-audit-2026-10-16/evidence/public-systems.json`), governance skill (`.claude/skills/ui-design-governance/SKILL.md`), and measurements on minion_hub master `48976586` (2026-10-16).

## Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Runtime baseline keyed by ROLE (`button`, `[role=…]`, form fields), scoped outside `[data-density="dense"]` | PAT-04 "density is a coordinated mode"; 012 proved role-based toolbar floors (`aed995b8`) work; decoration-by-element was rejected by DS-08 but a sizing baseline does not change look, only hit area | Per-component patches (what 012 did for three components — does not scale); lint-only (detects, never corrects) |
| Density is a user preference (comfortable default = today) | No visual change for existing users; follows across devices like nav order | Org-wide density (surprises other users); localStorage-only (does not follow) |
| Exact-equivalent sweeps only, with a listed non-equivalent set | PAT-08 "generate once, validate in context": mechanical where lossless, reviewed where not | Blanket rewrite (visual regressions) |
| Archetype manifest + conformance test | PAT-01 "name the task before the container"; makes similar pages alike by construction | Convention only (today: 92/145 use PageShell) |
| DataView wrapper owns collection states | PAT-09/PAT-11 and the audit's wrapper responsibilities table | Per-page empty/error markup (today) |
| Collapse by purpose on pilots first | PAT-02; archetype test then carries the rule to other pages | Global media-query hacks |
| Action-scope declarations | PAT-03; one dominant header action is already governance | Ad-hoc header buttons |
| Content contract as a catalog section + test | PAT-14; EN/ES append-only catalogs already exist | Free-text labels per page |

## AS-IS counts (master `48976586`)

raw-control-height 302 (reporting only), raw-icon-size 1,051 (off-scale: 13×124, 11×95, 15×63, 10×33), raw-color 197, raw-shadow 33, raw-layer 25 (z 2/3/5/15/20/22), raw-motion 7, raw-type-size 8; 145 app pages: PageShell 92, PageHeader 113, DataView 5, DataTable 21, native table 4, FormField 2, ConfirmDialog 6; global focus ring exists, no coarse baseline.

## Unknowns carried into implementation

How many raw heights sit inside intentionally dense surfaces (stream B lists them); whether every collection pilot can collapse its sidebar into a parent route without a new route (stream C must not add routes — use the existing parent).
