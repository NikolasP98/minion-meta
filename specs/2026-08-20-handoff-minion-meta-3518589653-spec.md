---
id: 2026-08-20-handoff-minion-meta-3518589653-spec
title: "Remove the onEventError TODO(handoff) marker in packages/shared/src/gateway/client.ts"
stage: spec
status: draft
pass: 1
created: 2026-08-20
updated: 2026-08-20
repos: [minion-meta]
proposal: handoff-minion-meta-3518589653
verdict: pending
relationship: depends-on
related: [2026-08-19-gateway-client-error-hook-consumer-adoption-spec, 2026-08-17-gateway-client-error-hook-consumer-adoption, 2026-08-17-pkg-gateway-client-onevent-errors-spec]
type: fix
---

# Remove the `onEventError` `TODO(handoff)` marker in `packages/shared/src/gateway/client.ts`

## 0. Problem

Quoting the proposal (`proposals/handoff-minion-meta-3518589653.md`), filed by the factory
handoff-ledger sweep against a real `TODO(handoff):` comment in repository source:

> `NikolasP98/minion-meta@dev packages/shared/src/gateway/client.ts:36` — hub, site and paperclip
> still run the console.error default and are [unbumped]
>
> **Definition of done:** the marker's open end is resolved and the `TODO(handoff):` comment
> removed; the sweep closes this proposal automatically once the file carries no more markers.

The proposal's own frontmatter names a `duplicate_candidate`:
`2026-08-17-gateway-client-error-hook-consumer-adoption`, and its body's 2026-08-20 reconciliation
note observes the two describe the same underlying gap but declines to merge them ("canonical is
in-spec, off-limits to edit"). This spec performs the classification the note stopped short of and
scopes the one piece of work neither existing artifact currently owns: deleting the comment itself.

## 1. Relationship recommendation

- **`2026-08-19-gateway-client-error-hook-consumer-adoption-spec`** (`status: approved`,
  `verdict: approved`, pass 2, `repos: [minion_hub, minion_site, paperclip]`) — **depends-on**. This
  is the spec that actually does the work the TODO comment describes (hub/site/paperclip bumping
  `@minion-stack/shared` and deciding how to wire or accept `onEventError`). Its own §3 invariant 4
  states plainly: *"No slice here edits `packages/shared/**` — that surface is owned and closed by
  the parent spec"* (the onevent-errors spec below). So that spec's five slices (S0–S4) will finish
  the underlying migration but will never touch, let alone delete, the comment at `client.ts:36-37`.
  This spec's single code slice is gated on that one's S4 closeout actually landing — verified the
  same way, not assumed.
- **`2026-08-17-gateway-client-error-hook-consumer-adoption`** (proposal, `status: in-spec`,
  `spawned_spec: 2026-08-19-gateway-client-error-hook-consumer-adoption-spec`) — **related, not
  depends-on** (the dependency is on its spawned spec, not the proposal record itself). This is the
  `duplicate_candidate` the handoff sweep flagged. It is not a duplicate of *this* spec: that
  proposal's own Definition of Done ("recon table filled in… all three consumers on a published
  version… linked PR per consumer") never mentions deleting the `client.ts` comment either — the
  comment is source text the proposal quotes as its provenance, not a file it edits. The two
  artifacts are complementary, not overlapping: that one ships the behavior, this one retires the
  stale marker once it has.
- **`2026-08-17-pkg-gateway-client-onevent-errors-spec`** (the parent, `repos: [minion-meta]`,
  already merged to `dev` per PR #29) — **related, not depends-on**. This is the spec whose own S1
  *wrote* the comment (its lines 419/442 record "`packages/shared/src/gateway/client.ts` | S1, S2,
  S3 | ... JSDoc; one `TODO(handoff):`"), per the AGENTS.md open-items ledger clause requiring a
  paired in-code marker + proposal for any open end left at handoff. Named here only for provenance;
  it does not gate this spec because its own scope closed when S1 landed — it never claimed
  ownership of the marker's *removal*, only its authorship.

No existing spec or proposal already covers deleting this comment — every artifact that touches
this exact text either authored it or explicitly declines to edit `packages/shared/**`. This is new,
narrowly-scoped work, not a duplicate.

## 2. AS-IS

Verified in this checkout and against GitHub as of 2026-08-20:

- `packages/shared/src/gateway/client.ts:36-37` currently reads:
  ```
  // TODO(handoff): hub, site and paperclip still run the console.error default and are
  // unbumped; adoption tracked in proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md
  ```
  immediately above the `onEventError?: (err: unknown, frame: EventFrame) => void | Promise<void>;`
  declaration (line 38). The JSDoc block above it (lines 28-35) documents the hook's contract and is
  untouched by this spec.
- **The claim in the comment is still factually true today**, i.e. this is not a stale marker that
  merely forgot to get deleted after the real fix shipped:
  - `gh api repos/NikolasP98/minion-meta/contents/packages/shared/src/gateway/client.ts?ref=main`
    (raw) contains no `onEventError` match — the hook is still only on `dev` (via PR #29, merged
    2026-08-19), not promoted to `main`.
  - `gh pr list --repo NikolasP98/minion-meta --state merged --json number,title,mergedAt -q
    '.[] | select(.title=="chore: version packages")'` lists only `#18` (merged 2026-08-13, an
    unrelated shared-package change), `#17`, `#15` — no Version-Packages PR has merged after `#29`.
    Per the parent onevent-errors spec's own AS-IS (§2), publishing is two merges to `main`; neither
    has happened. `@minion-stack/shared` on npm therefore still does not export `onEventError`.
  - Since the release has not published, none of `minion_hub`, `minion_site`, or `paperclip-minion`
    can have bumped to it yet (the adoption spec's own S0 is a hard gate for exactly this reason).
    "Hub, site and paperclip still run the console.error default and are unbumped" is accurate.
- The full remediation path is already fully specified and approved
  (`2026-08-19-gateway-client-error-hook-consumer-adoption-spec`, S0 → S1/S2/S3 → S4), but as shown
  in §1, none of its five slices edits `client.ts`. Nothing in the current spec graph currently
  deletes this comment once the work it describes is done.

## 3. TO-BE

Once — and only once — `2026-08-19-gateway-client-error-hook-consumer-adoption-spec`'s S4 closeout
has actually landed (proposal `2026-08-17-gateway-client-error-hook-consumer-adoption` reads
`status: done` with three linked, merged consumer PRs and zero "unverified — repo absent" rows, per
that spec's own §8 verification step 3), the two-line `// TODO(handoff):` comment at
`client.ts:36-37` is deleted from `packages/shared/src/gateway/client.ts`.

**Invariants that must not change:**

1. The JSDoc block for `onEventError` (lines 28-35) is unchanged — only the two `TODO(handoff):`
   comment lines are removed.
2. The `onEventError` declaration, its type, and its runtime behavior (sync/async two-arm
   containment, never-throw reporter) are byte-identical before and after this edit.
3. No changeset is authored for this change — it is a comment-only, non-functional edit; nothing in
   `dist/` or the published `.d.ts` differs.
4. This spec does not itself perform, verify, or re-litigate the hub/site/paperclip adoption work —
   that is entirely `2026-08-19-gateway-client-error-hook-consumer-adoption-spec`'s job. This spec
   only reads that work's completion evidence as a gate.

## 4. DELTA

| # | Transition | Slice | Proving test / evidence |
|---|---|---|---|
| 1 | The adoption spec's full lifecycle (S0-S4) is confirmed complete, not merely approved/in-progress | S0 | `proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` reads `status: done`, contains three `https://github.com/.../pull/...` links, and no `unverified — repo absent` text remains |
| 2 | The two-line `TODO(handoff):` comment is removed from `client.ts` | S1 | `grep -c 'TODO(handoff)' packages/shared/src/gateway/client.ts` → 0; `git diff` for the commit touches only lines 36-37 (deletion) in that one file |
| 3 | Package build/typecheck is unaffected by the comment removal | S1 | `pnpm --filter @minion-stack/shared build` and `pnpm --filter @minion-stack/shared typecheck` (or root `pnpm run build-all` / `typecheck-all` scoped to the package) succeed, matching pre-edit output |
| 4 | This handoff proposal's own Definition of Done is met and the sweep can auto-close it | — (sweep-owned, not a slice) | proposal text itself: "the sweep closes this proposal automatically once the file carries no more markers" — no manual proposal-status edit is this spec's job beyond what the pipeline stage always requires |

S0 and S1 are strictly sequential — S1 must not start until S0's evidence is gathered, because
deleting the comment before the underlying work is real would make the ledger silently lie (an open
end with no marker and no fix).

---

## 5. Approach — two vertical slices

```
S0 (gate: confirm adoption spec fully closed) ─▶ S1 (delete the two-line comment)
```

### S0 — Confirm the adoption work is actually done, not just planned

**Tags:** `infra` · **Estimate:** ≤ 1 h · **Files:** none (read-only verification; no edits in this
slice)

**Goal:** a hard, machine-checkable gate that stops S1 from deleting a marker whose underlying claim
is still true. Mirrors the discipline the adoption spec's own S0 uses for the npm-publish gate.

**Do:**

```bash
cd /home/agent/work
rg -n 'status:' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md
#   → must read "status: done" (not approved/in-spec/review)
rg -n 'unverified — repo absent' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md
#   → must have zero matches
rg -n 'https://github\.com/.*/pull/' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md
#   → must find exactly three links, one per consumer (hub, site, paperclip)
for pr_url in $(rg -o 'https://github\.com/[^ )]*?/pull/[0-9]+' \
    proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md); do
  gh pr view "$pr_url" --json state,mergedAt -q '.state' | rg -x MERGED
done
#   → every linked PR is independently confirmed MERGED via the GitHub API, not just present as text
```

**Definition of done (machine-checkable):** every command above succeeds. If the proposal is not yet
`status: done`, or any linked PR is not independently confirmed `MERGED`, **stop** — S1 does not
start. Re-run this gate rather than caching a stale "yes" from an earlier check, since the three
consumer PRs can land on different days.

---

### S1 — Delete the `TODO(handoff):` comment

**Tags:** `docs` · **Estimate:** ≤ 1 h · **Files:** `packages/shared/src/gateway/client.ts` only

**Goal:** the file carries no more handoff markers for this resolved item, matching the proposal's
own Definition of Done verbatim.

**Do:**

- Delete exactly the two lines:
  ```
  // TODO(handoff): hub, site and paperclip still run the console.error default and are
  // unbumped; adoption tracked in proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md
  ```
  Leave the preceding JSDoc block and the `onEventError?: ...` declaration line untouched.
- Do not touch any other part of `client.ts`, any other file under `packages/shared/**`, or author a
  changeset — this is a non-functional comment removal (§3 invariant 3).
- Do not edit `proposals/index.json` or `specs/index.json` — generator-owned.

**Definition of done (machine-checkable):**

```bash
grep -c 'TODO(handoff)' packages/shared/src/gateway/client.ts   # → 0
git diff --stat -- packages/shared/src/gateway/client.ts        # → exactly 2 deletions, 0 additions
pnpm --filter @minion-stack/shared build                        # → succeeds
pnpm --filter @minion-stack/shared typecheck                    # → succeeds, if the package defines it
```

## 6. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones." This spec is the narrow tail end of the row
*"Gateway protocol (frame types, events) → `packages/shared/` → `minion_hub` + `minion_site` +
`paperclip-minion`"* — but unlike that row's real work (owned entirely by
`2026-08-19-gateway-client-error-hook-consumer-adoption-spec`), this spec makes zero functional or
type-level change to `packages/shared`, so it has no downstream effect on any consumer.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `packages/shared/src/gateway/client.ts` | Comment-only deletion; no export, type, or runtime behavior changes | §3 invariants 1-2; S1 DoD diff-stat check |
| `minion_hub`, `minion_site`, `paperclip-minion` | **None.** No manifest, lockfile, or source file in any of the three is touched | this spec has `repos: [minion-meta]` only; the consumer work is entirely the other spec's |
| `@minion-stack/shared` package version / npm | **None.** No changeset is authored (§3 invariant 3); this edit does not warrant or trigger a release | S1 "Do not... author a changeset" |
| `minion/` gateway (server) | **None** — server-side frame handling untouched | no file in `minion/` named by any slice |

### ⚠️ Alert — this spec's S0 depends on evidence this spec cannot itself produce

S0 reads the outcome of `2026-08-19-gateway-client-error-hook-consumer-adoption-spec`'s S1-S4, which
in turn requires PRs merged inside `minion_hub`, `minion_site`, and `paperclip-minion` — repos absent
from this workspace (`.gitignore` excludes them; same structural condition that spec's own §6 alert
already records). This spec cannot accelerate, verify mid-flight, or substitute for that work; it can
only confirm the finished state via GitHub API calls that work from any checkout. If that spec's
work stalls or is abandoned, this spec's S0 simply never turns green, and the marker correctly stays
in place — that is the intended behavior, not a defect to route around.

## 7. Out of scope (explicit)

- **Any of the hub/site/paperclip adoption work itself** (bumping `@minion-stack/shared`, wiring or
  accepting `onEventError`, the npm-publish gate). That is entirely
  `2026-08-19-gateway-client-error-hook-consumer-adoption-spec`'s S0-S4; this spec only reads its
  completion evidence.
- **Editing or closing `proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md`.** That
  proposal's own S4 closeout (in the other spec) owns setting its `status: done`; this spec's S0 only
  reads it.
- **Editing `proposals/index.json` or `specs/index.json`.** Generator-owned.
- **Any other `TODO(handoff):` marker in `client.ts`** — specifically the S2 lifecycle markers at
  (per the adoption spec's AS-IS) `:251-255` and `:330-335` for `onReconnectError`/`onSocketError`,
  tracked by the separate, unrelated
  `2026-08-19-gateway-client-lifecycle-swallows-handoff-spec`. This spec touches only the single
  two-line marker at `:36-37`.
- **Re-classifying or merging** `proposals/handoff-minion-meta-3518589653.md` against
  `2026-08-17-gateway-client-error-hook-consumer-adoption.md`. §1 records the recommendation; the
  resolver/human applies it, not this spec.

## 8. End-to-end verification

```bash
# 1. Gate (runnable anytime from minion-meta; must be re-run, not cached, since the dependency
#    can complete on a different day than this slice runs):
rg -n 'status: done' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md
rg -c 'unverified — repo absent' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md
#   → 0 matches (grep -c on zero matches exits 1; treat "no output" as pass, not a script failure)

# 2. Edit + build (only after step 1 passes)
grep -c 'TODO(handoff)' packages/shared/src/gateway/client.ts   # → 0
git diff --stat -- packages/shared/src/gateway/client.ts        # → 2 deletions, 0 additions
pnpm --filter @minion-stack/shared build

# 3. No collateral damage
git status --porcelain -- packages/shared                       # → only client.ts listed
git diff --stat -- '.changeset'                                 # → empty (no changeset authored)
```

**Ship gate:**

1. S0 green, re-confirmed at S1 start time (not reused from an earlier stale check).
2. S1's diff touches exactly `packages/shared/src/gateway/client.ts`, removing exactly the two
   `TODO(handoff):` lines and nothing else.
3. No changeset authored; no `proposals/index.json` or `specs/index.json` edit.
4. Package build (and typecheck, if defined) for `@minion-stack/shared` still succeeds.
