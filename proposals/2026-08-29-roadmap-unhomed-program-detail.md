---
id: 2026-08-29-roadmap-unhomed-program-detail
title: Roadmap program detail with no committed home - the 2026-08-18 message and its three orphan labels (SDLC-CONTRACT.md, PR order 1-26, gates G0-G8)
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion-meta, minion-factory]
tags: [infra]
source: human
source_trust: human
risk_class: high
priority: medium
owner: human
---

# Roadmap program detail with no committed home

## Problem

`specs/2026-08-18-sdlc-transformation-roadmap.md` pass 1 ended with:

> Full milestone detail (M0–M9 deliverables, schemas, exit criteria, PR order
> 1–26, stage gates G0–G8) lives in the user's program message of 2026-08-18 and
> is reproduced in each milestone spec at implementation fidelity.

The second half of that sentence cannot be checked against the "M0–M9
deliverables, schemas, exit criteria" it names, because pass 1 never enumerates
any of them — it only asserts them, unverified, of the off-repo message. What
*is* checkable, and was checked (roadmap §1 item 4, a line-by-line diff of the
exact pass-1 blob): pass 1's own committed content — the critical path, the
twelve governing principles, the autonomy ladder, the proposal ordering, and
the twenty predicates — carries into pass 2/3 without loss, and ten of the
twelve ordered proposals resolve to real files (the other two are absorbed by
`2026-08-18-factory-orchestration-round7`, §8). Beyond that committed content,
there is nothing left to audit for "most milestones" against — only the three
named artifacts below, which is why this proposal's scope is exactly those
three rather than an open-ended claim about milestone completeness. The first
half of the quoted sentence is a dangling reference to an off-repo chat
message, which the `AGENTS.md` SDLC contract forbids as a state location. Pass
2 narrowed the delegation to "not binding until a spec adopts it" and this
proposal tracks what was left without a home — including the message itself.

Two different gaps live here, and they close differently. The three labels below
are *known* orphans: each is enumerable, and each can be decided today. The
message that named them is an *unknown* orphan: it may contain deliverables,
schemas or exit criteria that no committed artifact records, and no pass can
decide those without reading it. Until someone who can read it says otherwise,
the roadmap stays `status: review` / `verdict: pending` (its §1 *Disposition*
subsection) rather than approving a document whose authority rule touches content
nobody in this repository can enumerate.

## AS-IS (evidenced 2026-08-29)

Three named artifacts resolve to nothing in the repositories:

1. **`SDLC-CONTRACT.md`** — named as an M1 deliverable by
   `specs/2026-08-18-agent-instruction-parity-and-repo-policy-spec.md:42`. No file
   of that name exists in minion-meta or minion-factory; the only hit across the
   whole meta checkout is that one citation. The lifecycle contract it described
   does exist, as the "SDLC Contract (normative)" section of `AGENTS.md`, and the
   machine-readable registry exists as `repo-policy.yaml` + `scripts/repo-policy.mjs`.
   So the M1 *outcome* shipped under different names, and only the citation is stale.
2. **"PR order 1–26"** — no committed artifact enumerates 26 ordered PRs. The
   factory has merged well past PR #153 without ever referencing this sequence.
3. **"Stage gates G0–G8"** — no committed artifact defines G6, G7, or G8. The live
   ladder is G0–G5 in `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md`, whose
   semantics are not known to match. Two ladders sharing the `G0` label is a
   collision, not a synonym.

And the source that named all three is itself unreachable. Searched 2026-08-29,
all read-only, all negative:

- `git log --all -S` over this repository for `PR order 1`, `G0-G8` and
  `exit criteria` — the only hits are the roadmap and this branch's own text; the
  message was never pasted into a commit on any ref.
- The operator memory index and its topic files (`/memory/MINION`) — the roadmap
  program is not among them.
- 30,033 past-session observations (`claude-mem` full-text) for the program's own
  distinctive phrasings: `controller owns truth agents propose`, `prompts are not
  security boundaries`, `M0 M9 milestone deliverables schemas exit criteria`,
  `autonomy ladder L0 L5 bounded PR`, `46/100` — zero matches.

So the message exists only wherever the user's 2026-08-18 chat is retained. That
is a fact about tooling, not a judgement about the content: it means an agent
cannot close this item, and a human with that chat closes it in minutes.

## TO-BE

Either each item has a committed definition, or it is retired as a label. No third
state. And the message behind them is either recovered and compared requirement by
requirement, or its irrecoverability is recorded by someone who could have read it —
not assumed by an agent that could not. Invariant that must not change: the
roadmap's milestone ordering, principles, ladder and predicates stay exactly as
they are — this is about naming and homes, not about program content.

## DELTA

1. Decide `SDLC-CONTRACT.md`: create the file, or amend the parity spec's citation
   to point at `AGENTS.md` + `repo-policy.yaml`. Recommended: amend the citation,
   since the outcome already shipped and a second contract file would compete with
   `AGENTS.md` for authority.
2. Decide "PR order 1–26": reconstruct it from the merged factory PR history as a
   committed appendix, or retire the phrase. Recommended: retire — the milestone
   table in the roadmap's §4 already provides the ordering that the phrase implied,
   and reconstructing a sequence nobody followed adds no control.
3. Decide `G0–G8`: define G6–G8 in a milestone spec (and reconcile G0–G5 semantics
   against the phase-gates spec), or leave the roadmap's §10 disambiguation as the
   final answer. Recommended: leave §10 standing.
4. Decide the source message. Recover the 2026-08-18 program message and commit a
   requirement-level preservation map — every deliverable, schema and exit
   criterion it names, mapped to the milestone spec that carries it, with every
   unmatched item filed as its own proposal. If the message cannot be produced,
   record that a human who would have had it says so, and that the milestone specs
   in roadmap §4 are accepted as the whole of the program's fidelity. Either
   outcome unblocks the roadmap's approval; neither can be produced by an agent
   working from this repository alone (see AS-IS).

Decisions 1-3 are one edit plus a spec re-pass each; none of them touches product
code. Decision 4 needs a human with access to the 2026-08-18 chat.

**Out of scope:** changing any milestone, governing principle, autonomy rung, or
acceptance predicate; re-scoring the frozen 46/100 and 72/100 baselines; the
milestone-ordering deviation, which is
[`2026-08-29-roadmap-milestone-order-deviation`](2026-08-29-roadmap-milestone-order-deviation.md).

## Definition of done

- `grep -rn 'SDLC-CONTRACT' specs/ proposals/` either resolves to a real file or
  returns no stale citation.
- `grep -rn 'PR order 1' specs/ proposals/` returns either a committed enumeration
  or nothing.
- `grep -rnE '^#{1,4} *G[6-8]\b' --include='*.md' specs/ proposals/` — the same
  heading-scoped definition check the roadmap's §12 step 5 runs — exits non-zero
  (no match) if G6-G8 were retired, or names the file and heading that defines
  them if they were adopted. Record the command's exit status and output in the
  closing note. A bare `\bG[6-8]\b` grep is not a valid substitute: it matches
  this proposal's own title, problem statement and DELTA, plus the copied title
  text in the generated `proposals/index.json` (14 matches at the time of
  writing, none of them a definition), so it can never return "nothing" and
  cannot distinguish a definition from a discussion of one.
- The preservation map from DELTA 4 is committed, or the human statement that
  replaces it is committed, with every unmatched requirement filed.
- The roadmap spec's §1.3 list shrinks to the items still undecided, or the section
  is removed once all three are closed; the roadmap's §1 *Disposition* subsection
  is removed and the roadmap re-passed to `verdict: approved` only once DELTA 4 is
  closed too.
