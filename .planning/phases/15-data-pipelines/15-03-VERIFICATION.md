# 15-03 Verification (goal-backward, executor self-check; independent verifier still required)

Snapshot: `/home/nikolas/.cache/claude-tmp/15-03-23abab23` — hub `origin/master 1df0a921`, meta `origin/dev 3f3375ee`. Receipts in `checks/`.

## Must-have truths

| Truth | Status | Evidence |
|---|---|---|
| Fixtures prove bounded retry-safe source identity and distinct failures; cursor writes require valid ownership | **Verified on the candidate** | `checks/vitest-task1.log`: 34 pass + 1 expected-fail, exit 0. Distinct failures: missing cursor / unknown kind / malformed JSON reject before any source call; a thrown reconcile finishes `failed` with the cursor untouched (retry resumes the same page). Bounded: 20 notes × ≤240 chars + persisted `truncatedFailures`. Ownership: rendered `where` params `['org-1','brain_corpus_conversations','conversations:dirty','queued']` for the read and `['queued-1','queued',<exact prior cursor>]` for the CAS write; a lost `claim` never runs the handler. Red run `checks/vitest-task1-red.log`: 4 new cases fail on the unmodified service. |
| Every discovered copy has a named owner and verified source path or explicit unresolved gate; no invented retention duration | **Verified on the inventory** | `checks/retention-inventory-validate.log`: 23 copies, 0 errors with all four roots supplied; the validator rejects an unresolved policy with a duration and a copy without owner (`checks/node-test-task2.log`, 6/6). The only durations present (180, 30, 7) are quoted with their defining source file. |

## Artifacts

| Path | Provides | Status |
|---|---|---|
| `minion_hub/src/server/services/brain-corpus-jobs.service.ts` | existing cursor paths exercised under interruption | present, hash `219e79d2…`, prettier clean |
| `.planning/phases/15-data-pipelines/15-RETENTION-INVENTORY.md` | copy/owner/decision map | present, hash `8b13bb00…`, validator exit 0 |
| `scripts/qc/retention-inventory.mjs` + `.test.mjs` | manifest validator + rejection tests | present in meta snapshot, 6/6 |

## Key links

- `brain-corpus-jobs.service.ts` → `brain-corpus.service.ts`: the job layer calls only `syncConversation`, `backfillConversations`, `markConversationSourceFailure` (mocked at that boundary); the runtime tests use the real `bg-runtime`. Read-first contract recorded in SUMMARY Task 1.
- `15-RETENTION-INVENTORY.md` → `brain-corpus.service.ts`: copies 2–4 cite `ensureConversationSource`, `markConversationSourceFailure`, `persistConversations`, `reconcileDeletedConversationDocuments` with the tombstone-vs-physical-delete distinction verified by grep (only `status = 'deleted'` updates; `delete from knowledge_chunks` at two sites).

## Not established by this plan

- DATA-01 / DATA-03 closure (requirements-completed is empty).
- Deployment, PR, CI, or any live-data behavior.
- Phase-10 revision contract adoption (not on master).
- Full `bun run check` green in a credential-free snapshot (two unowned `$env/static/public` errors; stub-env run: 0 errors 0 warnings, exit 0).
- Any retention duration, deletion, or backup-resurrection behavior — all 14 RET decisions open.
