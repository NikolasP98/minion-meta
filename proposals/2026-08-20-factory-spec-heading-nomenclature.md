---
id: 2026-08-20-factory-spec-heading-nomenclature
title: "dev CI is red: the factory spec generator emits `## 0. Problem` where the heading gate requires `## 0. Product`"
status: draft
created: 2026-08-20
updated: 2026-08-20
repos: [minion-meta]
tags: [infra, hygiene]
---

# The factory spec generator's section-0 heading does not match the heading gate

Filed from the develop-stage run that merged `origin/dev` into the
`2026-08-17-pkg-dev-crypto-failopen-spec` S2 branch (PR #97). The merge itself was
clean, but running the meta CI gate on the merge result surfaced that
**`origin/dev` is currently red on `node scripts/spec-index.mjs --check`**,
independently of anything in that PR.

## AS-IS (evidenced)

`node scripts/spec-index.mjs --check` at `origin/dev` (`b48d80d`) exits 1 with eight errors:

```
2026-08-20-handoff-minion-factory-1487584490-spec.md: missing "## 0. Product" section
2026-08-20-handoff-minion-factory-1487584490-spec.md: missing a verification section (a heading or a **Verification:** label)
2026-08-20-handoff-minion-hub-1323254565-spec.md: missing "## 0. Product" section
2026-08-20-handoff-minion-hub-2131866440-spec.md: missing "## 0. Product" section
2026-08-20-handoff-minion-hub-2785164896-spec.md: missing "## 0. Product" section
2026-08-20-handoff-minion-hub-3530856808-spec.md: missing "## 0. Product" section
2026-08-20-handoff-minion-hub-902723699-spec.md: missing "## 0. Product" section
2026-08-20-handoff-minion-meta-3518589653-spec.md: missing "## 0. Product" section
```

Evidence that this is inherited and not merge-induced: every input to the lint —
all seven spec files, `scripts/spec-heading-lint-baseline.json`,
`scripts/spec-supersede-baseline.json` and `scripts/spec-index.mjs` — is
byte-identical (same blob sha) between `origin/dev` and the merge result.

**These specs are not missing content — they are missing the *heading name*.**
The gate matches literally (`scripts/spec-index.mjs:161`):

```js
{ label: '"## 0. Product" section', re: /^##[ \t]+0\.[ \t]+Product[ \t]*(?:#+[ \t]*)?$/m }
```

Every one of the eight specs opens its section 0 with `## 0. Problem` (or
`## 0. Problem (from the approved proposal, …)`) and carries the substance the
convention asks for — the proposal quoted in the requester's words, AS-IS/TO-BE/DELTA,
an explicit out-of-scope section. The second failure on
`2026-08-20-handoff-minion-factory-1487584490-spec.md` is the same class: its
section is titled `## 9. End-to-end acceptance`, and the verification regex
(`scripts/spec-index.mjs:168`) requires the word `verification` or `verify` in the
heading — `acceptance` does not match.

So the corpus is substantively compliant and cosmetically non-compliant, and CI
cannot tell the difference.

**Why the existing backfill proposal does not cover this.**
`2026-08-18-spec-heading-lint-baseline-backfill` grandfathers *127 pre-existing*
specs and states explicitly that "every *new* or *hand-edited* spec is checked."
These eight are new (created 2026-08-20), so they are outside that baseline by
design. The ratchet is working as intended; the generator is what drifted.

## TO-BE

`node scripts/spec-index.mjs --check` exits 0 on `dev`, and newly generated specs
comply with the heading lint at generation time rather than after a red build.

Invariants that must NOT change: the heading baseline stays a one-way ratchet —
these eight ids must **not** be added to `scripts/spec-heading-lint-baseline.json`
(the gate rejects baseline growth in a PR, and grandfathering a brand-new spec
would defeat the check entirely).

## DELTA

1. **Rename the headings in the eight specs** — `## 0. Problem …` → `## 0. Product …`,
   and `## 9. End-to-end acceptance` → `## 9. End-to-end verification` on the
   factory-1487584490 spec. Content-preserving; no frontmatter change.
   *Proves it:* `node scripts/spec-index.mjs --check` exits 0.
2. **Fix the generator** so section 0 is emitted as `## 0. Product` and the
   acceptance section carries the word `verification`. The generator lives in the
   factory pipeline (spec pass-1/pass-2 agents), not in this repo — the fix belongs
   wherever that prompt/template is defined, and should quote `specs/TEMPLATE.md`
   §"Body convention" as the authority.
   *Proves it:* the next factory-generated spec passes `--check` unmodified.
3. **Consider making the gate's failure message actionable** — when a spec has a
   `## 0. <something>` section that is not `Product`, say so ("found `## 0. Problem`;
   the convention is `## 0. Product`") instead of reporting it as missing. Optional,
   but this run cost several minutes distinguishing "absent" from "misnamed".

## Out of scope

- The 127 grandfathered specs — that is `2026-08-18-spec-heading-lint-baseline-backfill` §1.
- The `pass > 1` / `revises` policy question — same proposal, §2.
- Any change to the lint's *rules*. The rules are correct; only the generator and
  eight files are wrong.

## Definition of done

`node scripts/spec-index.mjs --check` exits 0 on `dev` with
`scripts/spec-heading-lint-baseline.json` no larger than it is today, and a
subsequently generated handoff spec passes the gate without hand-editing.

## Why this was not fixed in the PR that found it

PR #97 is a `security`-tagged crypto slice whose diff is deliberately confined to
`packages/db` + its own proposal/changeset/env-doc surface. Renaming headings in
eight unrelated specs — six of which target `minion_hub` and are plausibly in
flight — would have widened a security PR into other agents' artifacts and risked
merge collisions. The gate's other failure class on that PR's merge (a stale
`specs/index.json`, itself pre-existing on `dev`) *was* fixed there, because
regenerating a committed index is mechanical and playbook-mandated.
