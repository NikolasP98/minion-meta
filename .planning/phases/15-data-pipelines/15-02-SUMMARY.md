---
phase: 15-data-pipelines
plan: "02"
status: partially_delivered_task2_blocked
plan_sha256: 11e1b2f14ccfe0d860438005a4590cce4e94c89504f83686872f5978f11714a1
requirements_completed: []
completed: 2026-09-10
pr: NikolasP98/minion_hub#246
key-files:
  modified:
    - minion_hub/src/server/services/finance-statement-parser.ts
    - minion_hub/src/server/services/finance-statement-parser.test.ts
  not_modified_deliberately:
    - minion_hub/src/server/services/finance-statements.service.ts
    - minion_hub/src/server/services/finance-statements.service.test.ts
---

# 15-02 finance parser provenance and bounded ingestion (DATA-01)

**Task 1 delivered. Task 2 stopped on a missing prerequisite** — its foundation is a
frozen private candidate that is not on `origin/master`. `requirements_completed` is
empty: DATA-01 cannot close while half its named behavior is unimplemented.

## Identities

- Base: `minion_hub` `origin/master` `1df0a921`.
- Branch `feat/observability-identity-finance-parser-bounds`, commit `99715f50109fe5785009d23544166e3d79bc0ce2`, authored `Nikolas Pinon <nikolas.pinon98@gmail.com>`. Shares PR #246 with 16-01 (disjoint files).
- Worktree `/home/nikolas/.cache/claude-tmp/hub-16-01-15-02`; Node 22.23.2, Bun 1.3.4, Vitest 4.1.10.
- Decisions honored: D360-01, D360-05 (validated the *actual* master state rather than trusting plan/summary prose), D360-06.

## Task 2 blocking gap — exact evidence

Plan Task 2 requires binding retry identity and the ingest cursor to the **phase 10
owner/effect envelope** ("Use phase 10 owner/effect envelope where this service is a
consumer"). That envelope does not exist on `origin/master`:

| Check | Result |
|---|---|
| `git log origin/master -- src/server/services/finance-statements.service.ts` | one commit: `71f0ab78 feat(finances): bank statement imports (#90)`. Nothing from 10-04. |
| `ls src/server/services/ \| grep job-effects` | no match — `job-effects.service.ts` is absent |
| `grep -rl 'createJobRequest\|withJobRequest\|jobRequestAdvanceResult' src/` | no match |
| `sha256sum src/server/services/finance-statements.service.ts` on master | `11db25ea…` — equal to **neither** 10-04's before-image (`75b444bb…`) **nor** its candidate (`70ce7429…`) |
| `sha256sum src/server/services/finance-statements.service.test.ts` on master | `1ed7b740…` — byte-identical to 10-04's recorded **before**-image |

Reading `10-04-SUMMARY.md` and `10-07-SUMMARY.md` confirms why: 10-04 was built on
branch `feat/level-2026-07-30` at `a25528b603…`, is `status: candidate_frozen_pending_independent_checks`,
and 10-07's nine-file foundation is likewise frozen and unlanded. Master's service is
the pre-10-04 code, and its `finance-statements.service.ts` has diverged from the base
10-04 was cut against.

Implementing Task 2 on master would therefore mean **re-implementing 10-04** (request
revisions, head/domain lock order, cursor CAS, revision-scoped retry) against a
different base, producing a second, conflicting implementation of the same behavior
and guaranteeing a merge conflict with a frozen candidate under independent review.
Per root's dispatch instruction, that work stopped and is reported instead.
`finance-statements.service.ts` and `finance-statements.service.test.ts` were **not
edited** — the file hashes above are master's, unchanged.

## Task 1 — parser boundary, provenance and bounds (delivered)

| File (relative to minion_hub) | Before | After |
|---|---|---|
| src/server/services/finance-statement-parser.ts | 43c384864ab385bae7991dd27449e736d467e2b3148ec165eb9c3068d6a16ac8 | 0ec8e1852a110d56d9830c7f5aae0ffab5676c09f9674f3986342c41caf3158e |
| src/server/services/finance-statement-parser.test.ts | 92241135a160c6d2cb5ae45f026db920e0735b849b5f4ce723590ef79f2065e2 | 691ebe43c47dcb885b9852d15c0c924a9a1d41b3dcb1167e1396373cb4eb451d |

**Provenance.** `StatementParseResult` gains `provenance: { parserVersion, sourceSha256,
sourceChars, dataRows }`. The hash is of the **normalized** text actually parsed, so
the same statement pasted with CRLF and with LF produces the same identity (matching
the service's existing content-dedupe convention). `STATEMENT_PARSER_VERSION` is
exported and bumped to **2** because accepted/rejected semantics changed — a stored
parse is only reproducible against the version that produced it.

**Bounds** (`STATEMENT_LIMITS`, all exported and documented as hostile-input bounds,
not business policy):

| Limit | Value | Behavior |
|---|---|---|
| `maxInputChars` | 8,000,000 | throws `StatementParseLimitError('input-too-large')` |
| `maxDataRows` | 100,000 | throws `StatementParseLimitError('too-many-rows')` from the tokenizer, before the rest is materialized |
| `maxFieldChars` | 4,096 | rejects that record: `record-too-large`; surplus characters are never accumulated |
| `maxColumns` | 256 | rejects that record: `record-too-large`; surplus cells are never pushed |

Whole-input breaches throw because no single record owns them and continuing would be
unbounded memory; the thrown message is numeric and content-free (asserted < 120
chars, and asserted not to echo input), which matters because the existing service
persists it into `fin_statement_imports.error_message` via the unchanged
`parse_failed` path. Per-record breaches reject one record and keep the rest of the
statement — one corrupt line must not discard a year of transactions.

**New rejection reasons:** `record-too-large`, `invalid-encoding` (a cell containing
U+FFFD: the decode already failed upstream, so the cell's financial meaning is
unrecoverable — reject, keep `raw`).

**Duplicates stay accepted.** Identical `(date, description, amount)` rows get a
`duplicate-of-row-N` warning instead of a rejection. Two identical coffees on one day
are legitimate money; rejecting them would be an accounting policy decision the parser
has no authority to make.

**Untouched, deliberately:** sign/currency semantics, the fixed(2) money-string
convention, date/amount ambiguity resolution and the column-wide decimal-convention
inference, `needs-llm` policy, `sourceRow` identity, `raw` retention, the
accepted/rejected partition invariant, and all accounting behavior. Nothing ambiguous
is coerced to a fabricated default — verified by a case where no column convention
exists and `1.234` stays `ambiguous-amount`.

## Commands and results

`bunx svelte-kit sync` first — a fresh worktree without the generated
`.svelte-kit/tsconfig.json` makes Vitest 4 fail at dependency optimization
(`Could not resolve 'node:module' … Tsconfig not found`); that is environment, not test.

| Command | Result |
|---|---|
| `node node_modules/vitest/vitest.mjs run src/server/services/finance-statement-parser.test.ts` | **47 passed** (34 pre-existing + 13 new), exit 0 |
| `node node_modules/vitest/vitest.mjs run …finance-statements.service.test.ts` | passes unchanged against the extended parser result (additive field, no consumer break) |
| three focused files together | 85 passed, exit 0 |
| `bun run check` | 0 errors 0 warnings, exit 0 |
| `bun run lint:tokens` / `lint:design` (base `origin/master`) | 0 violations / no debt increase, exit 0 |
| `prettier --check` (changed files) | exit 0 |
| `git diff --check` | clean |
| PR #246 CI (`test`, `check-and-build`, `crm-deposit-rule-postgres`, `crm-funnel-concurrent-postgres`, Vercel preview) | all **SUCCESS** |

Red evidence: raising all four limits to `Number.MAX_SAFE_INTEGER` and disabling the
decode check turned **6 of 47** cases red (both throw cases, the at-limit case, the
oversized-field and wide-record rejections, and `invalid-encoding`). Reverted before
the final run.

One pre-existing test changed: `returns empty result for empty input` moved from
`toEqual` to `toMatchObject` plus an explicit provenance assertion, because
`provenance` is a new required field. No assertion was weakened — the empty-parse case
now asserts strictly more.

## Open items

1. **Task 2 unimplemented** (blocking gap above). DATA-01's second must-have —
   "interrupted replay neither loses nor duplicates records; source version change is
   explicit" — has **no** implementation on master. It should be executed as an
   adoption slice *after* 10-07 + 10-04 land, not re-derived.
2. **`TODO(handoff)` at `finance-statement-parser.ts`**: the service keeps its own
   private `PARSER_VERSION = 1` and writes it to `fin_statement_imports.parser_version`,
   now out of step with `STATEMENT_PARSER_VERSION = 2`. Whoever lands 10-04 must source
   the stored version from the parser export and invalidate cursors whose stored version
   differs. Matching proposal:
   `proposals/2026-09-10-hub-finance-parser-version-binding.md`.
3. `getImportStatus` still re-parses stored content on every status read (bounded now
   by `MAX_REJECTIONS_IN_STATUS` and by the new input limits, but still repeated work).
   Documented in the 10-04 summary as an existing open end; not fixed here.
4. No live finance import, no historical correction, no production data read, no SQL
   integration test run.

## Next gated plan

An adoption slice for `finance-statements.service.ts` that consumes the parser's
`provenance` and the phase-10 effect envelope, admitted **after** 10-07 and 10-04 land
on master.
