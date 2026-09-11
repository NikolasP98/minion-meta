---
id: 2026-09-10-hub-finance-parser-version-binding
title: Bind stored statement parser_version to the parser's own exported version
status: draft
created: 2026-09-10
updated: 2026-09-11
repos: [minion_hub]
---

# Bind stored `parser_version` to the parser's exported version

Open end left by GSD 15-02 Task 1 (PR NikolasP98/minion_hub#246). Matching
`TODO(handoff)` at the top of `src/server/services/finance-statement-parser.ts`.

## What is out of step

The qualified private candidate now exports `STATEMENT_PARSER_VERSION = 3` and stamps
every `StatementParseResult` with `provenance: { parserVersion, sourceSha256,
sourceChars, dataRows }`. Version 2 is the bounded parser: input/record limits, the
`record-too-large` and `invalid-encoding` rejection reasons, and `duplicate-of-row-N`
warnings. Version 3 additionally rejects unusable headers and excludes genuine blank records before counting data-row capacity.

`finance-statements.service.ts` keeps a **private copy**, `const PARSER_VERSION = 1`,
and writes it to `fin_statement_imports.parser_version` at import creation. Without integration, an import using the new parser would still record `parser_version = 1` even though the candidate parser is v3. The stored provenance is wrong, which is exactly what the provenance work exists
to prevent.

## Why 15-02 did not just fix it

`finance-statements.service.ts` is owned by the frozen 10-04 candidate
(`.planning/phases/10-durable-jobs-stock/10-04-SUMMARY.md`,
`status: candidate_frozen_pending_independent_checks`), which is **not on
`origin/master`** and was cut against a different base
(`feat/level-2026-07-30 @ a25528b6`, service before-image `75b444bb…`; master's is
`11db25ea…`). Editing it here would conflict with a candidate under independent
review and would duplicate 10-04's own scope.

## Proposed change, once 10-07 + 10-04 land

1. Delete the private `PARSER_VERSION` constant; import `STATEMENT_PARSER_VERSION`
   from the parser and store that.
2. Store `provenance.sourceSha256` alongside the existing `content_sha256`, or assert
   they agree for `sourceKind: 'text'` — they are computed over the same normalized
   text, so a disagreement means the stored file and the parsed text diverged.
3. **Invalidate a stale cursor on a version change.** `persistImportChunk` resumes at
   `row.nextChunk` against a freshly re-parsed entry list. If `row.parserVersion !==
   STATEMENT_PARSER_VERSION`, the entry list the cursor indexes into is not the one it
   was computed for — v2 rejects records v1 accepted, so a resumed import can skip or
   double-count rows. The import must not silently continue: reject it back to the
   explicit-retry path (10-04's `createJobRequest` revision replacement is the right
   mechanism) rather than advancing.
4. A migration/backfill decision for existing rows is **not** proposed here. Rewriting
   historical `parser_version` values would assert a provenance nobody verified. The
   honest options are to leave them as recorded, or to add a nullable
   `parser_version_verified_at`. That is a data-authority decision for the owner.

## Not in scope

No accounting, sign, currency or dedupe-policy change. No re-ingest of existing
imports.

## September 11 corrective parser v3

Plan 15-06 now exports STATEMENT_PARSER_VERSION = 3 in the same private PR246 candidate. It rejects unusable headers before mapping and excludes genuine blank records before the data-row capacity limit. Root independently reviewed and repeated all 60 native tests. The service remains version 1; the integration steps above must bind the current exported version rather than hardcode version 2. Preserve historical provenance and reject stale resumable cursors. Parser v3 introduces content-free StatementParseHeaderError; the combined service/route acceptance must retain that safe failure classification. No live import or persisted row was changed.


## Qualified binding candidate and remaining pipeline bounds

15-07 combines the preserved 10x durable service with parser v3. Root's selected historical policy is D360-20: reject stale-version resumable retries, preserve historical rows/cursors/counts, and return existing exact terminal outcomes without recomputing them under a new parser. It is not a historical recovery workflow. Raw uploaded bytes and normalized decoded parser text have distinct digests for BOM/CRLF inputs; validate each projection separately. Corrupt bytes never reach parsing/accounting rows, while the existing fenced failed-import status may be recorded. Invalid returned parser provenance remains outside failure persistence. Native qualification and independent acceptance remain in the plan's own receipts.

The exact service call to `Response.arrayBuffer()` still materializes a stored response before the parser's input bound. Its paired TODO requires a bounded streamed-byte reader, actual response/cancellation fixtures and content integrity without silently truncating financial input. A write chunk of 500 rows also does not bound repeated full-source fetch/parse work across chunks and status requests. Measure that amplification before selecting a streaming or persisted-parse design; preserve source/version/cursor identity, logical row numbers, duplicate semantics, tenant scope and retry behavior. These are separate pipeline changes, not hidden additions to the version-binding repair. No historical backfill, re-ingest or live source mutation is implied.

## 2026-09-11 independent binding qualification

15-07 now independently passes102 unit/parser and41 native PostgreSQL cases on final source. The five-file checkpoint preserves the correction; production adoption still requires the staged10x foundation and canonical test-lane integration. Full-file fetch buffering and repeated parsing remain open. No historical backfill or customer mutation was performed.
