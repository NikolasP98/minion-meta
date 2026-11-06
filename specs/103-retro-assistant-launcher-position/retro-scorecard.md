# Retro Scorecard: hub PR #539 vs. the reconstructed SDD artifacts

PR: `fix(shell): assistant launcher always starts in its corner; a resize keeps it in place`
— https://github.com/NikolasP98/minion_hub/pull/539 — opened 2026-10-15T19:45:41Z, merged
2026-10-15T19:53:13Z (7m32s open→merge). One file, +25/-34 lines, no spec, no tests.

## 1. Functional requirement → diff hunk → test

| FR | Delivered by (diff hunk, `gh pr diff 539`) | Test that proves it |
|---|---|---|
| FR-001 (render in default corner on load) | `<script module>` block adding `let savedFrac: {...} \| null = null;` (new top-of-file hunk) — a fresh module evaluation always starts `null` | **None shipped.** |
| FR-002 (drag to any edge still works) | No hunk touches `onLauncherPointerDown/Move/Up` — unchanged by omission | **None shipped** (and none needed, nothing changed — but also no regression guard). |
| FR-003 (dragged spot survives in-app nav) | Same `savedFrac` module-scope declaration, plus `let frac = $state(savedFrac);` seeding each new component instance from it | **None shipped.** |
| FR-004 (reload resets to corner) | Removal of the `onMount` block's `localStorage.getItem('assistant-launcher-pos')` read and its `pos = {...}` assignment | **None shipped** — PR body states "Not browser-verified locally; verify on the preview." |
| FR-005 (resize keeps the same edge) | Removal of the `onResize` handler's `if (pos) snapToEdge();` call, replaced by the `$effect` that derives `pos` from `frac × free-area` | **None shipped.** |
| FR-006 (never off-screen after resize) | The `Math.max(0, vw - w - 2 * LAUNCH_MARGIN)` / vertical equivalent inside that same derivation `$effect` | **None shipped.** |

**The PR shipped zero automated tests for any of the six requirements.** Its only stated
verification is the "Gates" section's CI check list (prettier, svelte-check with 0 new
errors, `lint:design`) plus an explicit admission that the actual fix was not
browser-verified before merge.

## 2. Scoring the original artifact (the PR body), 0-5 each

| Axis | Score | Justification (≤2 lines) |
|---|---|---|
| Evidence anchors | **1/5** | Names the touched file and function names ("`snapToEdge` now writes `frac`"); zero file:line numbers, no before/after quotes, no screenshot/transcript. |
| Testable requirements | **1/5** | "How" is a mechanism narrative, not phrased as a MUST with acceptance criteria — nothing in it is independently falsifiable without re-reading the diff. |
| Measurable success criteria | **0/5** | None exist anywhere in the PR; the closest thing is "Not browser-verified locally" — an admitted absence of verification, not a criterion. |
| Task→commit traceability | **2/5** | Single commit, no task list ever existed to trace against; the "How" bullets happen to map ~1:1 to diff hunks, so a reader can reverse-engineer intent, but nothing was planned forward. |
| Open-items ledger | **1/5** | "Not browser-verified locally" is a real open end, but it lives only in PR-body prose — no in-code `TODO(handoff)`, no `proposals/` entry, i.e. zero of the two required ledger locations used. |

## 3. Would SDD have changed the outcome?

**Yes on the clarification.** The owner's ask literally contains both "stored in
local/sessionstorage" (implies reload survives) and "hard refreshes moves it back to its
corner spot" (implies reload does not survive) in consecutive sentences. The shipped code
resolves this correctly — it resets on reload — but nothing in the PR records that a
contradiction existed or that a judgment call was made. `/speckit-clarify`'s ambiguity scan
is purpose-built to surface exactly this kind of two-sentence conflict and would have forced
a one-line, ~30-second owner confirmation before any code was written, converting a silent
guess into a recorded decision (this retro's spec.md Clarifications section is that
confirmation, written after the fact and tagged `(ASSUMPTION — owner to confirm)` since no
live owner was available).

**Yes on the test requirement.** Constitution Principle II requires "the test that proves
each transition," which is a MUST, not a suggestion. This retro's `tasks.md` makes that
concrete — T006/T009/T012 each name a specific test for FR-001/FR-003/FR-005+FR-006, and even
surface the real Svelte module-scope testability friction that likely explains why the
original author skipped it. The actual PR shipped the opposite position explicitly ("Not
browser-verified locally").

**Honest take on overhead vs. value.** For a 25-line, single-file, non-security, non-data UI
positioning fix, this is a close call. The full SDD cycle (specify → clarify → plan → tasks →
analyze) took **7m34s** of agent wall-clock to produce five documents and zero code — almost
exactly as long as the **7m32s** the entire real PR took from open to merge, code included.
That is roughly a 2x total-time overhead for process alone, before weighing any of it against
the value delivered. Most of that value — the one real clarification — could have been
captured in three lines added to the PR body itself ("Ambiguity: the ask says both X and Y;
picked X because Z") without a 5-document tree. The one piece of value that could *not* have
been captured that cheaply is the test obligation (T006/T009/T012): a PR-body note doesn't
write a test, a task list item does.

**What a hotfix-compressed SDD cycle should minimally contain for a change this size:**
1. One paragraph of AS-IS behavior with the specific evidence (what this retro's plan.md
   "AS-IS evidence" section does) — enough to prove the bug was understood, not assumed.
2. The one genuine ambiguity, surfaced as a single explicit Q/A, not a 5-question loop.
3. One unit test for the one piece of non-trivial logic introduced (here: the fraction-to-
   pixel derivation) — skip tests for unchanged code paths (FR-002).
4. The open-items ledger entry, if and only if something ships unverified (here: "not
   browser-verified" would become a real `TODO(handoff)` + `proposals/` line instead of PR
   prose).
This is close to what Constitution Principle I already permits ("a hotfix may compress the
cycle but must still produce a spec.md that names what it bypassed and why") — the
full 5-artifact Spec Kit tree this retro produced is the overhead that exceeds the value for
a change this size; a 10-15 line compressed spec.md covering the four points above would
have captured nearly all of the real value in a few minutes, not 7m34s.

## 4. Overhead estimate

| | Duration |
|---|---|
| SDD phases (specify+clarify+plan+tasks+analyze), this retro | 7m34s |
| PR #539 open→merge (code + gates + owner merge decision) | 7m32s |
| Overhead ratio | **≈1.0x** — the retrospective paperwork alone took about as long as the entire real-world fix shipping. |

Caveat: this retro was written by an agent holding the finished diff as an answer key, which
is mechanically faster than writing a prospective spec before any code exists (no genuine
unknowns to research, no false starts, no owner round-trip latency). Read this 1.0x figure
as a **floor** on real prospective SDD overhead for a change this size, not a realistic
estimate of it — a prospective version would also need to wait on the owner's actual
clarify-question answer, which has unbounded latency this retro didn't pay.
