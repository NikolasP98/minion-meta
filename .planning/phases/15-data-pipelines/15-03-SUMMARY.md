---
phase: 15-data-pipelines
plan: "03"
status: complete-private-candidate
requirements-completed: []
requirements: ["DATA-01", "DATA-03"]
completed: 2026-09-11
snapshot: /home/nikolas/.cache/claude-tmp/15-03-23abab23
snapshot_identities:
  hub: "origin/master 1df0a9216ad3f7f85d989eb59cfccb779d9f7285 (worktree /home/nikolas/.cache/claude-tmp/15-03-23abab23/minion_hub)"
  meta: "origin/dev 3f3375ee810fd4c04d62a0b4811d15b41b346acb (worktree /home/nikolas/.cache/claude-tmp/15-03-23abab23/minion-meta)"
  gateway: "origin/DEV 8499d8fddc4afdd22f6160e3f3e6e448b6befe73 (read-only worktree, removed after validation)"
  site: "origin/master 0ed4e1b16cef4ca9287314df5af58a8af17f537c (read-only worktree, removed after validation)"
owned_files:
  - path: minion_hub/src/server/services/brain-corpus-jobs.service.ts
    before: ec8778cc07f595735096887474360262c7ddf3da71cb42960f78fdfe9fea755b
    after: 219e79d240a84bcc9b2cdaedfffcc3e960b4e35e76c7ea6c29d69a8e14a52eb9
  - path: minion_hub/src/server/services/brain-corpus-jobs.service.test.ts
    before: c6d6c7305250b5301e04f3fa729f4e58b7051c36201a1ae5dd5e2217f1061bf8
    after: 6ff415780eb66f6bcb2a6fbe3f4df16210a8217671adbfcc8ad2ef556c9d432a
  - path: minion_hub/src/server/services/brain-business-corpus-jobs.service.test.ts
    before: 36706246f9cb727877a5f842ebc91f637c746d08b53ae23eae03d2787fe17a3c
    after: f852ad2d8465e927a5a5d550b016a6cdbc4f31fffd64bdad4a9e29b47611123d
  - path: scripts/qc/retention-inventory.mjs
    before: absent
    after: da26d840f243e97fdc9337b258cc6622ca647449d4764925dad028ddff7c7d85
  - path: scripts/qc/retention-inventory.test.mjs
    before: absent
    after: 6606e6591284381d16074457398bb7be714d4a59af01d3617471f6c30f134e83
  - path: .planning/phases/15-data-pipelines/15-RETENTION-INVENTORY.md
    before: absent
    after: 8b13bb0072c8f0ff586d2bc2dd4a9971c4f6212b717305b9003ffe77b218ca5c
decisions_requested: [RET-01, RET-02, RET-03, RET-04, RET-05, RET-06, RET-07, RET-08, RET-09, RET-10, RET-11, RET-12, RET-13, RET-14]
---

# 15-03 Brain ingestion cursor qualification and retained-copy inventory

Both tasks executed on private snapshots. `requirements-completed` is empty: DATA-01 still has the
15-02 Task 2 gap and the parsing seams listed at the end of the inventory; DATA-03 is an admission
gate whose 14 retention decisions are unresolved by design (root gate note: durations, backup
resurrection and retention acceptance are decisions, not inferences). Nothing was committed, staged,
pushed or deployed; no database, bucket, vector store or backup was opened; no credentials or
`.env` were read.

## Task 1 — brain cursor paths under interruption (hub)

Read first: `brain-corpus.service.ts` (`syncConversation`, `backfillConversations`,
`markConversationSourceFailure`, `decodeConversationCursor`), `bg-runtime.ts`,
`brain-business-corpus-jobs.service.ts`. Finding: master's brain jobs have **no source-version
field**; the "semantic request revision" concept exists only in the frozen, unlanded 10-09/10-10
candidates (15-02 SUMMARY documents that none of the phase-10 envelope is on `origin/master`).
Nothing from that envelope was re-implemented (D360-01/-06); the plan's "adopt where needed"
resolves to "not adoptable on this base" and is recorded as an open gate below.

Source change (`brain-corpus-jobs.service.ts`, +82/−31, receipt `checks/hub-candidate.patch`):

- Failure notes stay bounded (`MAX_FAILURE_NOTES = 20`) and each note is now capped at
  `FAILURE_NOTE_MAX_CHARS = 240` (previously an unbounded `cause.message` per note).
- New durable `truncatedFailures` counter on the dirty cursor: notes dropped by the bound are
  counted, persisted, carried through coalescing, and surfaced in the terminal `bg_jobs.error` as
  `(+N earlier failure notes truncated; per-source detail retained in knowledge_sources.last_error)`
  — the durable rejected-source reference is the existing `markConversationSourceFailure` write.
- Malformed dirty entries dropped at parse are counted into one note
  (`cursor: dropped N malformed conversation entries`) instead of vanishing.
- `RECONCILE_BATCH = 25` unchanged; no embeddings synthesized; failed sources are never marked
  indexed (the job layer never touches `knowledge_*` status except through the existing
  failure marker).

Tests (`brain-corpus-jobs.service.test.ts`, 9 → 26 cases): the fake `bg_jobs` row store applies
`set()` patches and captures `where` clauses, so the **actual** `bg-runtime` is exercised — the
service's own `registerJobHandler` calls are replayed into the real runtime (both job types
register the same handler). Covered: missing/unknown-kind/malformed-JSON cursors reject with
distinct errors before any source call; malformed entries, month filtering, negative `next`,
non-string notes and string `truncatedFailures`; reconcile cursor passed through verbatim (a
non-string cursor restarts page 0 — documented, idempotent); one failing source continues to the
next and reports on completion; failure-marker failure does not stop the job; note bound +
truncation count + terminal message; coalescing drops processed work and preserves notes/count;
ownership — the queued-job read is scoped by `(tenant, type, ref, 'queued')` and the CAS write by
`(id, 'queued', exact prior cursor)` (asserted by rendering the drizzle `where` via `PgDialect`);
non-dirty queued rows are never mutated; real runtime: claim → per-step cursor persist → done;
lost claim never runs the handler; cancellation mid-flight stops after the current step; a thrown
reconcile page finishes `failed` with the cursor untouched (retry resumes the same page); zero
budget leaves the job `running` under lease; last-item failure finishes `failed` with notes.

`brain-business-corpus-jobs.service.test.ts` (6 → 9): malformed JSON rejects; numeric clamps;
and one `it.fails` documenting a real gap — an out-of-range `domainIndex` completes silently and
loses `failedDomains`. The service file is outside this plan's ownership, so the gap is recorded
here (Open items 2) rather than patched.

### Gate results (Task 1)

| Command (hub snapshot, `env -i`) | Result | Log |
|---|---|---|
| `node node_modules/vitest/vitest.mjs run src/server/services/brain-corpus-jobs.service.test.ts src/server/services/brain-business-corpus-jobs.service.test.ts` | **2 files, 34 passed, 1 expected-fail (35), exit 0** | `checks/vitest-task1.log` |
| Red run: same tests against the unmodified service (`git show HEAD:`) | **4 failed / 22 passed, exit 1** — the four new behavior cases go red; service restored and hash re-verified | `checks/vitest-task1-red.log` |
| `prettier --check` (3 owned files) | clean, exit 0 | `checks/prettier.log` |
| `git diff --check` (hub + meta snapshots) | clean, exit 0 | — |
| `bun run check` (no env) | **2 errors in 1 unowned file** (`src/hooks.client.ts`: `PUBLIC_POSTHOG_KEY/HOST` missing from `$env/static/public` because the credential-free snapshot has no public env), 0 in owned files, exit 1 | `checks/bun-check.log` |
| `bun run check` with shell stubs `PUBLIC_POSTHOG_KEY=stub PUBLIC_POSTHOG_HOST=http://127.0.0.1` (no file written) | **0 errors, 0 warnings, exit 0** | `checks/bun-check-stubenv.log` |

## Task 2 — retained-copy inventory (meta)

`15-RETENTION-INVENTORY.md`: 23 copies across Supabase PG (12), B2/S3 objects (1), Qdrant points
and snapshots (2), gateway filesystem/SQLite (4), site LibSQL (1), managed backups (2) and one
local untracked dump; each with owner, write/read/delete authority (code path or `none-found`),
source ids, restore interaction and policy. **5 established** policies quoted from source
(email ledger 180-day default, backup `retention_count` 7 ×2, chunk derivation rule, 30-day
session prune); **18 unresolved**, each bound to one of **14 decision requests** RET-01…RET-14
with decider and blocked copies. Proposed policy matrix is labelled proposal-only. Metadata only.

`scripts/qc/retention-inventory.mjs` parses the manifest embedded in the markdown and rejects:
missing owner/store/authority/source path/data classes, unresolved policy carrying a duration
(invented retention), dangling decision id, established policy without reference, duplicate ids,
credential-looking strings (`ya29.`, JWT, `sk-`, `scheme://user:pw@`, PEM private key), env-file
references, and (when `--root repo=path` is supplied) source paths that do not resolve inside the
root. Zero dependencies; node builtins only.

### Gate results (Task 2)

| Command | Result | Log |
|---|---|---|
| `node --test scripts/qc/retention-inventory.test.mjs` (meta snapshot) | **6 tests, 6 pass, 0 fail, exit 0** (accepted fixture + 5 rejection groups) | `checks/node-test-task2.log` |
| `node scripts/qc/retention-inventory.mjs --inventory <md> --root hub=… gateway=… site=… meta=…` | **23 copies (5 established, 18 unresolved), 14 open decisions, 0 errors, exit 0** — every `sourcePaths` entry resolved inside its snapshot | `checks/retention-inventory-validate.log` |

## Security finding (recorded, not acted on)

Listing `ops/backups/` (meta, gitignored line 155, untracked) showed the local Turso dump
`turso-ba-tables-backup-20260610.sql` contains auth-table rows with session tokens, OAuth
access/id tokens, password hashes and a JWKS private key. Nothing was copied into any artifact.
Decision RET-14: delete the dumps and rotate the contained credentials. No history purge needed
(never tracked), but the files exist on the working machine now.

## Deviations

- Test-file fake was upgraded from static mocks to a one-row stateful store so the real
  `bg-runtime` could be used; existing 9 cases kept their assertions (one `mockResolvedValue`
  default replaced by the store default with identical empty behavior).
- The `.planning` inventory file was written to the main checkout (root-owned planning tree,
  untracked there), the two `scripts/qc/*.mjs` files to the meta `origin/dev` snapshot. The meta
  snapshot needed no dependency install (node builtins only) so `pnpm install` was skipped.
- `origin/dev` `scripts/qc/` does not contain `repo-truth.mjs` (it is untracked in the main
  checkout), so the validator carries its own 6-line path-safety check instead of importing it.

## Open items / gaps

1. **Phase-10 generation/effect contract not adoptable on master** (same root cause as 15-02
   Task 2): no request-revision/source-version field exists for brain jobs on `origin/master`.
   "Source version drift" is therefore qualified only as: legacy channel-less cursor entries are
   accepted for the legacy job type and dropped-with-note for the new type. Needs an adoption slice
   after 10-07/10-09/10-10 land.
2. `brain-business-corpus-jobs.service.ts` out-of-range `domainIndex` loses `failedDomains`
   (documented by `it.fails`). File outside ownership; TODO(handoff) cannot be placed there —
   root to add to the matching proposal.
3. `bg_jobs.attempts` is never incremented anywhere (`bg-runtime.ts:60` only); a thrown advance
   is terminal (`failed`). "Retry" on master means re-enqueue with the persisted cursor, which is
   what the runtime test proves. No automatic retry policy was invented.
4. A non-string reconcile cursor decodes to `null` in the service and restarts page 0 (idempotent,
   not lossy) — no validation added at the job layer because decode authority lives in the service.
5. `bun run check` cannot be green in a credential-free snapshot without the two public PostHog
   variables; see the stub-env run for the type result of owned files.
6. Parsing seams outside this evidence (listed at the end of the inventory) still need exact plans
   before platform-wide DATA-01: `brain-corpus.service` page cursor, `brain-business-corpus.service`,
   `finance-sync.service`, `meta/meta-sync.service`, gateway `message-ledger`.
7. DATA-03 requires RET-01…RET-14 decisions before any cross-store deletion or 19-03 policy
   validation can run. No deletion, migration or live data change occurred.

## Next gated plan

An adoption slice binding brain job cursors to the phase-10 revision contract once 10-07/10-09/10-10
are on master, and a 19-03 policy-validation run fed by the RET-* decisions.
