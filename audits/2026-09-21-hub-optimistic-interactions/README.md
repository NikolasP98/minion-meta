# Hub optimistic interactions and async motion

[Normative draft spec](../../specs/2026-09-21-hub-optimistic-interactions-motion-spec.md) · [Independent review](../../specs/2026-09-21-hub-optimistic-interactions-motion-spec.review.md) · [43-family catalogue](CATALOG.md)

The specification covers immediate local feedback, asynchronous reads, optimistic reversible edits, coherent forms, confirmed commands and long-running jobs. It defines 15 motion patterns, Save-button decisions, pending/saved/error/conflict/unknown-outcome states, versioned writes, cross-view propagation, accessibility and test requirements. It is a specification, not an implementation or production qualification.

## Evidence index

- [Calendar and POS](calendar.md): navigation, slot reads, drag/resize, notes, creation, status/stock effects and charging.
- [Components and existing motion](components.md): controls, preference sync, dialogs, animations, accessibility and builder/profile/security interactions.
- [Mutation families](mutations.md): CRM, stock, socials, notes, flows, dashboard, gateway and shared infrastructure.
- [Source index](SOURCE-INDEX.md): 1,055 scanned client files, including files without lexical matches.
- [Source manifest](source-inventory.json): per-file hashes and line-level signals. Signals appear in 507 files; patterns include comments and overlapping categories, so counts are discovery evidence rather than defect or button totals.
- [Machine-readable catalogue](catalog.json): 43 family policies and source anchors; operation-level qualification remains required before rollout.

Snapshot: Hub `master` at `0acd6282df74d18eacd27673fcf238cd16a29e56` plus working-tree changes. No Hub source, database, branch or deployment changed. Existing Claude table and POS work is preserved. The table cell overlay is described by its concurrent handoff, not assumed present in the scanned checkout.

## Reproduce

From the meta-repo, run:

```bash
python3 audits/2026-09-21-hub-optimistic-interactions/scan.py
python3 audits/2026-09-21-hub-optimistic-interactions/build-catalog.py
python3 audits/2026-09-21-hub-optimistic-interactions/build-review.py
node audits/2026-09-21-hub-optimistic-interactions/verify.mjs
node scripts/spec-index.mjs --check
node scripts/proposal-index.mjs --check
```

The scanner/builders overwrite only this audit's generated artifacts and its `.lavish` review. Source scan excludes generated messages, server routes and recognized tests/fixtures; server contracts were inspected separately in the domain reports. The review builder uses Minion tokens/midnight-ocean, a local supplied screenshot and fictional demo records. It requires the screenshot in `.lavish/optimistic-current-calendar.png` or its original temporary path. The portable exported review embeds the image and needs neither source file nor server.

“All” means the catalogue supplies a policy for every discovered interaction family and the file index preserves all scanned candidates. It does not mean every runtime callback or external plugin was proven safe to optimistically mutate. The spec requires operation-level dispositions during implementation and defaults unclassified writes to confirmed feedback.

## Verification outcome

[Static verification](verification.json) passed local Markdown source links/anchors, captured-source drift and review JavaScript syntax. Spec and proposal index checks passed. [Prototype checks](prototype-check.json) confirmed immediate local intent with old remote baseline, success convergence, rejection rollback, and unknown-outcome retention. Search returned two tag-related families; all 43 families rendered. At 390px and 780px viewports the document had no horizontal overflow; reduced-motion toggle produced zero transition duration.

The first background-headless timing sample was throttled; the repeated foreground-within-headless run passed. This did not activate the user's visible browser. Header screenshots were visually inspected. These bounded checks validate the isolated review prototype, not production performance, actual booking mutations, pointer-drag accessibility or full assistive-technology behavior.

[Portable interactive review](review.html) uses Minion's design tokens and midnight-ocean preset and embeds the supplied screenshot. It contains fictional records and makes no application requests.
