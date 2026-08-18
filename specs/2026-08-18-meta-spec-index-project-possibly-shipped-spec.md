---
id: 2026-08-18-meta-spec-index-project-possibly-shipped-spec
title: Project G0 reconciliation metadata into the committed spec index
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-meta-spec-index-project-possibly-shipped
verdict: pending
repos: [minion-meta]
relationship: extends
related: [2026-08-17-sdlc-phase-gates-scoring-spec, 2026-08-18-base-kanban-possibly-shipped-surface-spec]
---

# Project G0 reconciliation metadata into the committed spec index

## 0. Product

The G0 backward-staleness reconciler already records medium-confidence shipment and link-review
signals in raw spec frontmatter, but the committed projection consumed by the board drops those
signals. This spec closes the remaining minion-meta data-contract gap without changing G0's
classification or the downstream board interaction.

Quoted from the approved proposal:

> `scripts/spec-index.mjs` (this repo, `dev` branch) only projects a fixed field list into
> `specs/index.json`:
>
> ```
> id, title, stage, status, pass, created, updated, repos, revises, supersedes,
> proposal, verdict, pr, type, tags
> ```
>
> `possibly_shipped`, `evidence`, and `link_review` are absent. Since the
> minion-base board reads only the generated `index.json` (not raw markdown), these
> fields are invisible downstream no matter how correctly G0 sets them — the amber
> chip in spec §7 (board slice, minion-base) has nothing to render.

The proposal's delegated gate decision supersedes its earlier cross-repo wording for planning
purposes: the base surface shipped in base PR #13, and this spec owns only the outstanding
minion-meta projector work.

## 1. Relationship recommendation

**Recommended classification: `extends`.** The proposal implements a missing projection step in
an existing G0 design; it does not replace or retire either related artifact.

- `2026-08-17-sdlc-phase-gates-scoring-spec` — extends its §3 G0 write contract by making the three
  reconciliation fields available in the committed read model consumed downstream.
- `2026-08-18-base-kanban-possibly-shipped-surface-spec` — complements its shipped board consumer;
  that spec also described this projector as a cross-repo prerequisite, but the delegated gate
  split the still-open minion-meta work into this independently executable spec.

No resolver action on either related artifact is part of this spec.

## 2. AS-IS → TO-BE → DELTA

### AS-IS — verified current behavior

- `scripts/spec-index.mjs` parses every non-template, non-review `specs/*.md` file through
  `scripts/spec-frontmatter.mjs`, validates required lifecycle fields, and constructs a fixed
  projection before writing `specs/index.json`.
- The projection at `scripts/spec-index.mjs`'s `specs.push({...})` includes conditional spreads for
  `revises`, `supersedes`, `proposal`, `verdict`, `pr`, `type`, and `tags`. It has no projection for
  `possibly_shipped`, `evidence`, or `link_review`.
- `specs/TEMPLATE.md` says `specs/index.json` is the committed machine-readable source used by the
  base board, but its frontmatter table does not document the three G0 fields.
- There is no test covering `scripts/spec-index.mjs`; the root `package.json` has no script-level
  unit-test command. Current verification is a direct `node scripts/spec-index.mjs` run, which
  rewrites the committed index.
- `2026-08-17-sdlc-phase-gates-scoring-spec` §3 defines G0 as the writer of
  `possibly_shipped`, `evidence`, and `link_review`. The approved pass-2 base consumer spec defines
  these values as optional fields and requires absent values to remain absent rather than being
  serialized as empty placeholders.
- Operator memory `/memory/MINION/sdlc-board-triage-and-phase-gates.md` states that the board's Spec
  column is sourced from the committed `specs/index.json`. That decision makes projection coverage
  a required compatibility boundary, not merely a documentation concern.

### TO-BE — target behavior and invariants

- When a parsed spec has a truthy `possibly_shipped`, `evidence`, or `link_review` frontmatter
  value, `scripts/spec-index.mjs` copies that value unchanged to the corresponding index entry.
- When any of those fields is absent or falsy, the generated entry omits the key, matching the
  existing conditional-spread convention; the generator must not emit `null` or an empty string.
- All existing projected fields, validation, sorting, file selection, and JSON formatting remain
  byte-for-byte behaviorally compatible.
- The template documents each new optional read-model field and identifies G0 as its writer.
- A hermetic Node test proves present and absent behavior without reading or rewriting the real
  `specs/index.json`.
- The checked-in `specs/index.json` is regenerated once from real repository inputs after the
  implementation. It must contain no synthetic fixture entry.

### DELTA — transitions, slices, and proof

1. **D1 / Slice 1:** extend the fixed projector with the three optional fields. **Proof:** the
   hermetic fixture test asserts exact preserved values for all three keys and asserts their
   absence on a second fixture.
2. **D2 / Slice 1:** document the optional fields as part of the spec frontmatter/read-model
   contract. **Proof:** a test assertion or explicit `rg` check finds all three rows in
   `specs/TEMPLATE.md`, each marked optional and tied to G0.
3. **D3 / Slice 1:** regenerate the production index with the updated generator while preserving
   all unrelated entries and index conventions. **Proof:** `node scripts/spec-index.mjs` succeeds,
   a JSON assertion confirms the new spec entry and absence of fixture ids, and the hermetic test
   remains green after regeneration.

Every transition belongs to Slice 1; work not tracing to D1–D3 is outside this spec.

## 3. Approach — vertical slices

### Slice 1 — project, document, and prove the G0 fields

**Estimate:** 4–6 focused hours. **Repo:** `minion-meta`. **Tags:** `logic`, `docs`, `test`.

This is one vertical slice because it delivers the complete producer-to-committed-read-model
contract: implementation, schema documentation, isolated regression coverage, and generation of
the real artifact.

**Exact files to touch:**

- `scripts/spec-index.mjs` — add conditional projections for `possibly_shipped`, `evidence`, and
  `link_review` beside the existing optional-field spreads.
- `scripts/spec-index.test.mjs` — new `node:test` regression test. Create a temporary working tree,
  copy `scripts/spec-index.mjs` and `scripts/spec-frontmatter.mjs`, write minimal valid fixture
  specs under its `specs/`, execute the copied indexer with the temporary directory as `cwd`, and
  assert the temporary `specs/index.json` contents. Clean up through test teardown.
- `specs/TEMPLATE.md` — add optional-field rows for the three projected G0 fields, including their
  value meaning and a pointer to `2026-08-17-sdlc-phase-gates-scoring-spec` §3 G0.
- `specs/index.json` — regenerate from repository source after implementation; do not hand-edit.

Do not refactor the parser or export new production APIs merely to enable the test. The temporary
working-directory test exercises the command exactly as operators and CI do and prevents fixture
residue in the committed index.

**Machine-checkable definition of done:**

```bash
node --test scripts/spec-index.test.mjs
node scripts/spec-index.mjs
node - <<'NODE'
const { readFileSync } = require('node:fs');
const { specs } = JSON.parse(readFileSync('specs/index.json', 'utf8'));
if (!specs.some((spec) => spec.id === '2026-08-18-meta-spec-index-project-possibly-shipped-spec')) process.exit(1);
if (specs.some((spec) => spec.id.startsWith('_tmp-possibly-shipped'))) process.exit(1);
NODE
rg -n '^\| `(?:possibly_shipped|evidence|link_review)` \| no \|' specs/TEMPLATE.md
```

The test must additionally fail if any of these regressions is introduced:

- one or more of the three populated fixture values is missing or altered;
- an absent field is emitted as a key, including as `null` or `""`;
- an unrelated optional fixture field such as `verdict` stops projecting;
- the fixture is written to the repository's real `specs/index.json`.

## 4. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `minion-meta` | Owns the source frontmatter contract and committed projection. | Hermetic regression coverage plus a clean real regeneration makes the contract reviewable. |
| `minion-base` | Read-only downstream consumer receives three additional optional keys. | Additive JSON fields are backward-compatible. Base PR #13 is reported shipped by the approved proposal's gate decision; do not modify or re-verify base code in this slice. Alert if current base types reject unknown JSON keys at runtime, though existing plain JSON parsing is expected to tolerate them. |
| `minion-factory` | Existing G0 writer becomes visible through the index. | No writer change. Preserve values without normalization so the writer remains authoritative. Alert if implementation discovers non-scalar values, because the template permits only flat scalars/string arrays and this spec assumes these three are scalar strings. |
| Other gateway, hub, site, docs, paperclip, and pixel-agent surfaces | No protocol, database, auth, agent-format, workshop, or pixel-office contract changes. | No action required under AGENTS.md's Cross-Project Impact Zones. |

The change is additive and does not enter any named gateway-protocol, database-schema, auth,
agent-definition, workshop, pixel-office, or Paperclip-adapter impact zone.

## 5. Out of scope

- Changing `agent/reconcile.sh`, G0 confidence scoring, evidence discovery, or its write-side field
  values in `minion-factory`.
- Changing minion-base rendering, action controls, lifecycle endpoints, write-back behavior, or
  deploying/re-verifying base PR #13.
- Adding `reconcile_ignore` or any other field to `specs/index.json`.
- Adding new board columns or rescoring specs already marked done.
- Generalizing `spec-index.mjs` into a schema-driven projector, changing frontmatter parsing, or
  introducing a test framework dependency.
- Editing either `specs/index.json` or `proposals/index.json` during this planning pass. The former
  is an implementation output; the latter is outside this spec's implementation scope.

## 6. End-to-end verification

After Slice 1 is implemented, run from the `minion-meta` repository root:

```bash
node --test scripts/spec-index.test.mjs
node scripts/spec-index.mjs
node - <<'NODE'
const { mkdtempSync, cpSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'minion-spec-index-e2e-'));
try {
  mkdirSync(join(dir, 'scripts'));
  mkdirSync(join(dir, 'specs'));
  cpSync(join(root, 'scripts/spec-index.mjs'), join(dir, 'scripts/spec-index.mjs'));
  cpSync(join(root, 'scripts/spec-frontmatter.mjs'), join(dir, 'scripts/spec-frontmatter.mjs'));
  writeFileSync(join(dir, 'specs/example.md'), `---
id: example
title: Example
stage: spec
status: draft
created: 2026-08-18
possibly_shipped: https://example.invalid/pr/1
evidence: https://example.invalid/check/1
link_review: inspect ambiguous supersedes link
---
`);
  const run = spawnSync(process.execPath, ['scripts/spec-index.mjs'], { cwd: dir, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout);
  const item = JSON.parse(readFileSync(join(dir, 'specs/index.json'), 'utf8')).specs[0];
  for (const key of ['possibly_shipped', 'evidence', 'link_review']) {
    if (!item[key]) throw new Error(`missing ${key}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
NODE
node -e "const {specs}=require('./specs/index.json'); if(specs.some(s=>s.id.startsWith('_tmp-possibly-shipped'))) process.exit(1)"
```

Pass means the isolated raw-frontmatter input reaches an isolated generated index with all three
values intact, the repository generator accepts the complete real corpus, the committed output
contains no fixture residue, and no cross-repo mutation was needed.

