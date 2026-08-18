---
id: 2026-08-18-factory-g0-ci-watch-auto-close
title: G0 reconciler should auto-close CI-watch proposals once the watched workflow goes green
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory]
source: factory-run-8af03178
---

# G0 reconciler should auto-close CI-watch proposals once the watched workflow goes green

`2026-08-17-sdlc-phase-gates-scoring-spec.md` §3 G0 (Slice 1) bundles three things under
one slice: the spec-sweep (walk active specs, flip frontmatter on shipped evidence — code
exists on minion-factory branch `factory/449b2bf2-gates-g0-backward-staleness-reco`, open
as **PR #2**, human-escalated on a design disagreement per operator memory — **not yet
merged to main**, correcting this proposal's earlier claim that it was "already built"),
link hygiene (shipped in minion-meta — see `factory/8af03178`, `scripts/spec-index.mjs`'s
`checkLinkHygiene`, now covering both the `supersedes` case and, as of this run's
review-fix round, the `pass > 1` without `revises`/`supersedes` case), and **CI-watch
proposal auto-close**:

> Source hygiene (small, do with G0): ... CI-watch proposals auto-close when the watched
> workflow goes green again (reconciler checks).

**Verified against minion-factory `main` @ `6ee39279b698262c3ec39d41b5416ba4b9e24534`**
(`agent/reconcile.sh`, read-only `gh repo clone` for verification only — this run's
harness contract scopes it to the `minion-meta` checkout, so it cannot commit, push, or
open a PR against minion-factory; the patch below is unapplied, ready for a
minion-factory-scoped run to apply): CI-watch's filing loop (lines 51-120) creates or
refreshes a red proposal per repo+workflow but has no counterpart that closes it. The G0
spec-sweep PR #2 branch also does not add this — confirmed via `git diff main..
factory/449b2bf2-gates-g0-backward-staleness-reco -- agent/reconcile.sh`, which only adds
the spec sweep after the (unchanged) CI-watch loop.

**Problem:** CI-watch files a proposal (e.g. `proposals/ci-minion-meta-claude-code-review.md`)
the first time a fleet workflow's latest completed run on its deploy branch fails. Nothing
currently reconciles these back to `closed`/`rejected` once the underlying workflow is
green again — they stay open indefinitely even after the human (or an unrelated commit)
fixes the red, becoming exactly the kind of stale board noise G0 exists to kill.

**Definition of done:** during the reconcile sweep, for every open CI-watch proposal
(`source` field or filename prefix identifies it), re-check the watched workflow's latest
completed run on its deploy branch; if green, set `status: closed` with a short reason
("workflow green again as of <date>, run <url>") and regenerate `proposals/index.json`.
Cadence matches the existing sweep (post-merge + daily) — no new scheduling needed, this
runs inside the same `for entry in ${FACTORY_CI_WATCH:-}` loop reconcile.sh already
executes on every sweep.

## Ready-to-apply patch (`agent/reconcile.sh`, verified against the real file, untested in
## the container — the applying run should dry-run before merging)

Insert immediately after the existing failure-filing `while`/`done` block (current lines
118-119, `echo "[reconcile] ci-watch: ${slug} (red: ${run_url})"` / `done`), still inside
the `for entry in ${FACTORY_CI_WATCH:-}; do ... done` loop so `${repo}`, `${branch}`,
`${runs_json}`, `${today}` stay in scope. No other file needs to change — the existing
post-loop block (`if [ -n "$(git status --porcelain proposals/)" ]; then node
scripts/proposal-index.mjs ...`) already regenerates `proposals/index.json` and commits
+ pushes whatever this adds, since it diffs the whole `proposals/` directory, not just
the filing loop's own edits.

```diff
--- a/agent/reconcile.sh
+++ b/agent/reconcile.sh
@@ -116,6 +116,25 @@
    echo "[reconcile] ci-watch: ${slug} (red: ${run_url})"
  done
+
+	# Auto-close: the same workflow's latest completed run on this branch is now
+	# green — the red that justified the proposal no longer exists. Only closes
+	# proposals still in draft/review (an existing human disposition, e.g.
+	# approved/rejected, is left alone — same rule the refresh-vs-leave-alone
+	# check above already applies to the red case).
+	jq -c '[.[] | select(.status=="completed")] | group_by(.workflowName) | map(.[0]) | map(select(.conclusion=="success")) | .[]' <<<"${runs_json}" 2>/dev/null |
+	while IFS= read -r ok; do
+		wf="$(jq -r .workflowName <<<"${ok}")"
+		run_url="$(jq -r .url <<<"${ok}")"
+		slug="ci-$(basename "${repo}")-$(tr '[:upper:] ' '[:lower:]-' <<<"${wf}" | tr -cd 'a-z0-9-')"
+		f="proposals/${slug}.md"
+		[ -f "${f}" ] || continue
+		st="$(sed -n 's/^status: //p' "${f}" | head -1)"
+		case "${st}" in draft|review) ;; *) continue ;; esac
+		sed -i "0,/^status: .*/s//status: closed/" "${f}"
+		sed -i "0,/^updated: .*/s//updated: ${today}/" "${f}"
+		grep -q '^closed_reason:' "${f}" ||
+			sed -i "/^updated: ${today}/a closed_reason: \"workflow green again as of ${today}, run ${run_url}\"" "${f}"
+		echo "[reconcile] ci-watch: ${slug} auto-closed (green: ${run_url})"
+	done
 done

 cat > /tmp/reconcile.md <<'EOF'
```

(The two unchanged context lines right after the hunk header are shown with space
indentation here, not the file's real tabs — `git diff --check` on this markdown file
flags a literal space-then-tab as mixed-indent noise; the four added-line blocks below
them are exact, tab-indented, ready to paste into `agent/reconcile.sh`.)

Why `group_by(.workflowName) | map(.[0]) | map(select(.conclusion=="success"))` mirrors
the failure query exactly (line 57) rather than inverting the `select`: `gh run list`
returns newest-first, and `group_by` (a stable sort by key) preserves each group's
original relative order, so `.[0]` is still "most recent completed run of this workflow"
— the query differs only in which `conclusion` it keeps. The `slug` construction is
copy-identical to the filing loop (line 62) so it resolves to the exact same proposal
filename.

**Out of scope:** the spec-sweep and link-hygiene pieces (spec-sweep = PR #2, awaiting
human resolution of its design disagreement, unrelated to this patch and not a
dependency of it; link-hygiene shipped in minion-meta this run); upstream-monitor noise
thresholds (separate slice, `2026-08-17-sdlc-phase-gates-scoring-spec.md` §5 slice 6,
`minion` repo).

**Handoff note:** this proposal is the required artifact for an open end this run
(`factory/8af03178`) could not close directly — its harness contract scopes it to a
single `minion-meta` checkout with no push/PR access to any other repo, so the actual
missing-implementation site (`minion-factory`'s `agent/reconcile.sh`) has no file in this
checkout to carry an in-code `TODO(handoff)` comment. The closest reachable analog —
`scripts/spec-index.mjs`'s `checkLinkHygiene` (the minion-meta-side half of the same G0
gap: detection without persistence) — now carries a `TODO(handoff)` pointing back to this
proposal, per the repo playbook's two-artifact requirement. This proposal, carrying a
verified, ready-to-apply patch rather than only a problem description, is the
maximum-complete substitute reachable from this sandbox. A minion-factory-scoped run (or
a human) should apply the patch above, dry-run it against a fixture proposal, and merge.
