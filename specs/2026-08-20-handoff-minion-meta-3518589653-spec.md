---
id: 2026-08-20-handoff-minion-meta-3518589653-spec
title: "Remove the onEventError TODO(handoff) marker in packages/shared/src/gateway/client.ts"
stage: spec
status: done
pass: 2
created: 2026-08-20
updated: 2026-08-20
repos: [minion-meta]
proposal: handoff-minion-meta-3518589653
verdict: approved
relationship: depends-on
related: [2026-08-19-gateway-client-error-hook-consumer-adoption-spec, 2026-08-17-gateway-client-error-hook-consumer-adoption, 2026-08-17-pkg-gateway-client-onevent-errors-spec]
tags: [infra, docs]
slice_tags: [1:infra, 2:docs]
type: fix
done_reason: "Zero-diff dev run confirms the open end is already resolved on base (sibling merges covered it); husk PR closed."
---

# Remove the `onEventError` `TODO(handoff)` marker in `packages/shared/src/gateway/client.ts`

## 0. Product

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
in-spec, off-limits to edit"). This spec records the relationship recommendation the note stopped
short of and scopes the one piece of work neither existing artifact currently owns: deleting the
comment itself.

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
  it does not gate this spec because the source option, handoff marker, and consumer-adoption
  proposal it owns are already present on `dev`. It never claimed ownership of the marker's
  *removal*, only its authorship and the release/adoption handoff now owned by the dependent spec.

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
- This is the **only** `TODO(handoff):` marker currently in `client.ts` (`rg -n
  'TODO\(handoff\)' packages/shared/src/gateway/client.ts` returns only line 36). The lifecycle-hook
  markers cited by the 2026-08-19 adoption spec have since been removed; the corresponding
  `onReconnectError` and `onSocketError` options are present in the current checkout.
- **The release-side prerequisite described by the comment is still unmet today**, so this is not a
  marker that may be deleted merely because the shared-client code landed:
  - `gh api repos/NikolasP98/minion-meta/contents/packages/shared/src/gateway/client.ts?ref=main`
    (raw) contains no `onEventError` match — the hook is still only on `dev` (via PR #29, merged
    2026-08-19), not promoted to `main`.
  - `gh pr list --repo NikolasP98/minion-meta --state merged --json number,title,mergedAt -q
    '.[] | select(.title=="chore: version packages")'` shows `#18` (merged 2026-08-13, an unrelated
    shared-package change) as the most recent Version-Packages PR — none has merged after `#29`.
    Per the parent onevent-errors spec's own AS-IS (§2), publishing is two merges to `main`; neither
    has happened. `@minion-stack/shared` on npm therefore still does not export `onEventError`.
  - The three consumer repos are absent from this checkout, so their current dependency pins and
    reporting postures are **unverified here**; an unpublished registry version proves they cannot
    yet satisfy the adoption spec's published-version DoD, but it does not by itself prove every
    local consumer detail asserted by the comment. The marker must remain because its tracked
    adoption proposal is still `status: in-spec` and its required evidence is incomplete.
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
4. This spec does not perform or re-litigate the hub/site/paperclip adoption work — that is entirely
   `2026-08-19-gateway-client-error-hook-consumer-adoption-spec`'s job. This spec verifies only that
   work's recorded completion evidence as a gate.
5. S0 must still find exactly the one expected marker block. If another `TODO(handoff):` marker is
   added to `client.ts` before implementation, stop and route that marker through its own ledger
   work; S1 must not delete it to satisfy a whole-file zero-count check. This preserves the
   file-granularity sweep contract recorded in
   `/memory/MINION/factory/2026-08-20-933c20e9.md` and the marker-plus-proposal constraint in
   `/memory/MINION/sdlc-board-triage-and-phase-gates.md` ("Handoff clause").

## 4. DELTA

| # | Transition | Slice | Proving test / evidence |
|---|---|---|---|
| 1 | The adoption spec's full lifecycle (S0-S4) is confirmed complete, not merely approved/in-progress, and the expected marker is still the file's only handoff marker | S0 | the adoption proposal's frontmatter is exactly `status: done`; its three named consumer rows contain three distinct merged consumer PRs; no `unverified — repo absent` remains; `client.ts` contains exactly the expected marker block and no second marker |
| 2 | The two-line `TODO(handoff):` comment is removed from `client.ts` | S1 | the branch diff against its base contains exactly 0 additions/2 deletions in `packages/shared/src/gateway/client.ts`, and the deleted lines are the expected marker block |
| 3 | Package build/typecheck is unaffected by the comment removal | S1 | `pnpm --filter @minion-stack/shared build` and `pnpm --filter @minion-stack/shared typecheck` succeed |
| 4 | This handoff proposal's own Definition of Done is met and the sweep closes it after the deletion lands | — (post-merge sweep-owned, not a slice) | after the merged change is visible on the watched branch and a conclusive rescan runs, `proposals/handoff-minion-meta-3518589653.md` reads `status: closed`; no manual proposal-status edit is part of S1 |

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
proposal=proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md

# Frontmatter status, not an incidental body mention.
awk '
  NR == 1 && $0 == "---" { in_fm=1; next }
  in_fm && $0 == "---" { exit }
  in_fm && $0 == "status: done" { found=1 }
  END { exit(found ? 0 : 1) }
' "$proposal"

# S4 must have replaced every unknown with real evidence.
if rg -n 'unverified — repo absent' "$proposal"; then exit 1; fi

# Read one consumer PR from each named recon row. Release/source PR links elsewhere in the
# proposal do not count, and the three consumer links must be distinct.
consumer_pr_urls="$({
  for consumer in minion_hub minion_site paperclip-minion; do
    rg -m1 "^\\|[^|]*${consumer}[^|]*\\|.*https://github\\.com/.*/pull/[0-9]+" \
      "$proposal" | rg -o 'https://github\.com/[^ )|]+/pull/[0-9]+'
  done
} | sort -u)"
test "$(printf '%s\n' "$consumer_pr_urls" | sed '/^$/d' | wc -l)" -eq 3
while IFS= read -r pr_url; do
  test -n "$pr_url"
  gh pr view "$pr_url" --json state,mergedAt -q '.state' | rg -x MERGED
done <<EOF
$consumer_pr_urls
EOF

# Guard the file-granularity ledger: this slice owns only the expected two-line block.
test "$(rg -c 'TODO\(handoff\)' packages/shared/src/gateway/client.ts)" -eq 1
rg -n -F '// TODO(handoff): hub, site and paperclip still run the console.error default and are' \
  packages/shared/src/gateway/client.ts
rg -n -F '// unbumped; adoption tracked in proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md' \
  packages/shared/src/gateway/client.ts
```

**Definition of done (machine-checkable):** every command above succeeds. If the proposal is not yet
`status: done`, any named consumer row lacks a distinct merged PR, any unknown remains, or the source
file contains a different/additional handoff marker, **stop** — S1 does not start. Re-run this gate
rather than caching a stale "yes" from an earlier check, since the three consumer PRs can land on
different days and the source file can change independently.

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
base_ref="${BASE_REF:-origin/dev}"
if rg -n 'TODO\(handoff\)' packages/shared/src/gateway/client.ts; then exit 1; fi
git diff --numstat "$base_ref"...HEAD -- packages/shared/src/gateway/client.ts \
  | rg -x '0[[:space:]]+2[[:space:]]+packages/shared/src/gateway/client\.ts'
test "$(git diff --name-only "$base_ref"...HEAD | wc -l)" -eq 1
git diff --name-only "$base_ref"...HEAD | rg -x 'packages/shared/src/gateway/client\.ts'
git diff --check "$base_ref"...HEAD
pnpm --filter @minion-stack/shared build
pnpm --filter @minion-stack/shared typecheck
```

## 6. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones." This spec is the narrow tail end of the row
*"Gateway protocol (frame types, events) → `packages/shared/` → `minion_hub` + `minion_site` +
`paperclip-minion`"* — but unlike that row's real work (owned entirely by
`2026-08-19-gateway-client-error-hook-consumer-adoption-spec`), this spec makes zero functional or
type-level change to `packages/shared`, so it has no downstream effect on any consumer.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `packages/shared/src/gateway/client.ts` | Comment-only deletion; no export, type, or runtime behavior changes | §3 invariants 1-2; S1 exact branch-diff check |
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
- **Any different or newly-added `TODO(handoff):` marker in `client.ts`.** The lifecycle markers
  cited by the adoption spec's older AS-IS are already absent in the current checkout. If another
  marker appears before S1, S0 fails and this spec does not delete it; this spec touches only the
  single two-line marker currently at `:36-37`.
- **Re-classifying or merging** `proposals/handoff-minion-meta-3518589653.md` against
  `2026-08-17-gateway-client-error-hook-consumer-adoption.md`. §1 records the recommendation; the
  resolver/human applies it, not this spec.

## 8. End-to-end verification

```bash
# 1. Gate (runnable anytime from minion-meta; must be re-run, not cached, since the dependency
#    can complete on a different day than this slice runs): execute every S0 command, including
#    frontmatter-only status, the three named/distinct merged consumer PRs, zero unknown rows, and
#    the exact-one-marker source guard.

# 2. Edit + build (only after step 1 passes)
base_ref="${BASE_REF:-origin/dev}"
if rg -n 'TODO\(handoff\)' packages/shared/src/gateway/client.ts; then exit 1; fi
git diff --numstat "$base_ref"...HEAD -- packages/shared/src/gateway/client.ts \
  | rg -x '0[[:space:]]+2[[:space:]]+packages/shared/src/gateway/client\.ts'
test "$(git diff --name-only "$base_ref"...HEAD | wc -l)" -eq 1
pnpm --filter @minion-stack/shared build
pnpm --filter @minion-stack/shared typecheck

# 3. No collateral damage
git diff --name-only "$base_ref"...HEAD                         # → only client.ts listed
git diff --name-only "$base_ref"...HEAD -- '.changeset'         # → empty (no changeset authored)

# 4. Post-merge/post-rescan lifecycle evidence (read-only; sweep-owned)
gh api -X GET repos/NikolasP98/minion-meta/contents/proposals/handoff-minion-meta-3518589653.md \
  -f ref=dev -H 'Accept: application/vnd.github.raw+json' \
  | awk 'NR == 1 && $0 == "---" { in_fm=1; next }
         in_fm && $0 == "---" { exit }
         in_fm && $0 == "status: closed" { found=1 }
         END { exit(found ? 0 : 1) }'
```

**Ship gate:**

1. S0 green, re-confirmed at S1 start time (not reused from an earlier stale check).
2. S1's branch diff touches exactly `packages/shared/src/gateway/client.ts`, removing exactly the
   expected two `TODO(handoff):` lines and nothing else.
3. No changeset authored; no `proposals/index.json` or `specs/index.json` edit.
4. Package build (and typecheck, if defined) for `@minion-stack/shared` still succeeds.
5. After merge and a conclusive factory rescan, the sweep-owned handoff proposal is `status: closed`.
