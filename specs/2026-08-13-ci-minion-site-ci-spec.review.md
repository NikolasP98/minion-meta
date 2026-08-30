---
spec: 2026-08-13-ci-minion-site-ci-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-13
---

# Pass 2 review — CI red, keep minion-site@master green

Read the spec end to end against `proposals/ci-minion-site-ci.md` and the root `AGENTS.md`
(Project Map, Cross-Project Impact Zones table). No local checkout of `minion_site` exists
(excluded by the meta-repo's `.gitignore`, as the spec itself notes), so §1's GitHub-API-sourced
facts and the quoted `403` branch-protection response could not be independently re-verified in
this checkout — treated as trusted evidence per the spec's own sourcing discipline. Scope:
correctness and consistency only. Found five defects, all internal to the spec (no product
judgment required to fix any of them); fixed all five in place. Verdict is `approved`.

## Changes made

1. **Owner surface line (top of file) omitted two files the spec itself touches.** It listed
   only `.github/workflows/ci.yml`, `git-hooks/pre-push`, `.env.example`, `package.json` — but
   §4's own consolidated file table (and S1's/S2's/S4's per-slice "Files" lists) also touch
   `scripts/check-public-env.mjs` (new, S1) and `CLAUDE.md` (S2, S4). The summary line at the
   top is the first thing a reader/implementer scopes against; leaving two touched files off it
   contradicts the body six paragraphs later. Added both to the Owner surface line.

2. **S1's DoD asserted a log line format the "Do" section never specified.** DoD check 4 greps
   the CI log for a line matching `public env: PUBLIC_SUPABASE_URL`, but the "Do" bullet just
   said "echo the resolved names … to the log" — no format. As written, an implementer could
   satisfy the "Do" prose with any log format and then fail a DoD check that depends on wording
   never given to them. Added the exact format (`public env: <NAME>`, one per line, names only)
   to the "Do" bullet so the DoD check is actually derivable from the requirement.

3. **S1's DoD checked for the wrong placeholder string, so it couldn't have verified what it
   claimed to.** DoD check 4's second line asserted the log does *not* contain
   `ci-placeholder-anon-key` — but that string is the value from the **old**, already-superseded
   hardcoded `env:` block quoted earlier in the same slice (line ~187) as the thing being
   replaced. S1's own synthesis rule three lines above is `ci-placeholder-<lowercased-name>`,
   which for `PUBLIC_SUPABASE_ANON_KEY` produces `ci-placeholder-public_supabase_anon_key`, a
   different string. Since the new pattern never equals the old string being checked for, the
   assertion would pass trivially regardless of whether the new code actually leaked a value —
   it verified nothing. Corrected the grep target to the string the synthesis rule actually
   produces.

4. **S2's "postinstall is inert outside a work tree" DoD test used a command that cannot
   exercise `postinstall`.** `npm pack` runs `prepack`/`prepare`/`postpack` lifecycle hooks, never
   `postinstall` — `postinstall` only fires on `npm install`/`bun install`. The original command
   (`npm pack /tmp/ms`, with a `|| true` swallowing any exit code) would pass unconditionally
   without ever invoking the guard it claims to test. It also used `npm` in a project that this
   spec and the rest of Slice 0/§7 consistently install/run with `bun`. Replaced it with copying
   the checkout minus `.git` and running `bun install --frozen-lockfile` there — the literal
   "outside a git work tree" scenario the "Do" bullet describes, actually exercising the
   postinstall guard.

5. **S4's DoD depended on a `workflow_dispatch`/`force_fail` mechanism that S4's "Do" section
   never listed as a deliverable.** The DoD block (and the ⚠️ note right after it) both assume a
   `workflow_dispatch` trigger with a `force_fail` input exists so `notify-red` can be exercised
   without breaking real `master` CI — but the "Do" bullets only described the `notify-red` job
   and its green-run mirror, never the dispatch trigger/input itself. An implementer following
   only "Do" would ship a DoD they can't pass. Added a bullet to "Do" introducing the
   `workflow_dispatch` input and its gating behavior, consistent with the DoD and the existing
   ⚠️ keep-or-delete note.

6. **§7 step 4 (regression proof) pushed to an arbitrary branch and expected an automatic CI
   run, contradicting S3's own push-trigger scoping.** S3's "Do" section explicitly scopes
   `ci.yml`'s push trigger to `branches: [master, main, dev]` (that's the whole point of the S3
   DoD's `rg` check for that literal). The original §7 step 4 pushed to
   `ci-probe/undeclared-public-env` — a branch outside that list — and immediately ran
   `gh run list -b ci-probe/undeclared-public-env` expecting a run to already exist. Per S3 that
   push alone would never trigger `ci.yml`; `gh run list` would return nothing and the following
   `gh run watch ""` would fail on an empty run ID. Fixed by opening a PR (`gh pr create --base
   dev`) after the push, which trips the `pull_request` trigger (scoped to `master`/`main` per
   S3, and presumably `dev`'s inbound PRs land there too — the PR's *target*, not its source
   branch name, is what the trigger cares about), and added `gh pr close` to the cleanup so the
   probe doesn't leave a stale open PR after the branch is deleted.

## Verified, no change needed

- §0's verbatim quote of the proposal matches `proposals/ci-minion-site-ci.md` word for word,
  including the code block and the run URL/timestamp.
- §1's "24 consecutive red pushes" arithmetic and the "PR #9 had its own red run and was merged
  anyway" claim are internally consistent with the run table given (28 `master` runs listed,
  24 failures before the 2026-08-13 green one, 3 successes on 2026-04-21, 2 failures on
  2026-04-24 — the streak count is correct against the table as printed).
- §2's rationale for keeping (not retiring) the workflow is a defensible product argument, not a
  factual claim this pass can check independently — left as the spec author's call, consistent
  with the proposal's explicit "say which" requirement.
- §5's Cross-Project Impact Zones table checks its claims against the actual zone names in root
  `AGENTS.md` ("Gateway protocol", "DB schema change", "Auth changes", "Agent definition format",
  "Workshop/canvas", "Pixel office", "Paperclip adapters") — every zone the spec marks "None" is
  a zone this change genuinely doesn't touch (no `src/` edit, no schema file, no `.svelte` file).
  The one zone from `AGENTS.md`'s table not mentioned (channel extensions) doesn't apply to a
  SvelteKit site and its omission isn't a gap.
- A1 (no branch protection) is treated as a hard constraint threading through S2/S4/§5 — checked
  that no slice's "Do" or DoD contradicts it (e.g., nothing proposes a required status check).
  Consistent throughout.
- The slice dependency diagram ("S1–S4 independent, converge on §7") matches each slice's actual
  file list — no two slices edit the same file in a way that would force ordering (S1 and S3 both
  touch `ci.yml` but in disjoint sections: env-derivation vs. toolchain/trigger/notify).
- §6 "Out of scope" items don't overlap with anything actually required by S1–S4's "Do" sections
  (checked each bullet against the four slices for contradiction — none found).

## Flagged for the human

None. All six defects found were self-contained inconsistencies within the spec (a DoD checking
a string its own "Do" section never produces, a verification command that can't exercise what it
claims to, an E2E step that contradicts a scoping rule two sections earlier) and were corrected
without any product-judgment call.
