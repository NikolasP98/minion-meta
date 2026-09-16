---
phase: 10-durable-jobs-stock
plan: 10-10
status: synthetic_capacity_observed_root_selection_pending
execution_ready: false
verified_at: 2026-09-09T20:42:06.816Z
scope: plain_node_synthetic_memory_and_serialization_only
---

# 10-10 synthetic capacity receipt

Two sequential plain-Node processes completed 27 scenarios each. The smaller foreign-closure experiment peaked at 33.57 MiB additional JavaScript heap and 53.03 MiB additional heap plus live ArrayBuffer bytes. This supports a bounded implementation candidate; it does not establish a production memory ceiling, database lock budget, provider response bound, or acceptance of source implementation.

The root selected never-admitted abandonment/repacking with immutable tombstones, nonblocking foreign-owner prelocks before semantic heads, historical per-index projection, and concurrency four for the new page API. This receipt measures allocation shapes relevant to that direction. It does not modify or admit the PLAN, API packet, source, schema, migration, configuration or legacy corpus concurrency settings.

## Execution and provenance

All files created by this experiment are in private mode-0700 `/tmp/minion-360-10-10-capacity/`, except this receipt. The scripts import only Node builtins. They do not import application modules or load environment files. No database, provider, network, application server, build, dependency installation or fault injection ran.

Runtime: `/usr/bin/node`, Node 22.23.2, Linux x64. Binary SHA-256: `45b7e2ad792e6968e3f69c85864d19d29f010b39c55b33e0b0c27e2f22d8ddda`. The JSON results include all `process.versions` values, runtime flags, timestamps, heap limit and stage observations.

Exact commands, executed sequentially:

```sh
env -i PATH=/usr/bin:/bin LANG=C.UTF-8 /usr/bin/node --max-old-space-size=224 --max-semi-space-size=8 --expose-gc /tmp/minion-360-10-10-capacity/capacity.mjs
env -i PATH=/usr/bin:/bin LANG=C.UTF-8 /usr/bin/node --max-old-space-size=224 --max-semi-space-size=8 --expose-gc /tmp/minion-360-10-10-capacity/capacity-bounded.mjs
```

Both exited zero. The measured total V8 heap limit was 260,046,848 bytes (248 MiB), below the requested 256 MiB. An initial invocation with only `--max-old-space-size=256` failed the preallocation heap-limit assertion: total V8 heap includes young-generation space. It constructed no synthetic scenario. The successful runs use the corrected flags above; this was an instrumentation correction, not an application failure.

| Artifact | SHA-256 |
| --- | --- |
| `capacity.mjs` | `dd9604f6777561cd5a8e95699c654c83bb05eee0061a074f141775a722f9e221` |
| `results.json` | `010f0cdcf2d518e8fd9637bf9d78ff82e8c4a6d3958b9f4d0da493f8397f18ad` |
| `capacity-bounded.mjs` | `92f9e1b2127d78b2a9110076d114bcf60be27692c324067bf0c4f18834628ebc` |
| `results-bounded.json` | `a7a1afed097ef1a5ff7d778053ba84bbd870f6c4e1c4152541eac1d3dacbf256` |

Stress run: 20:41:20.892–20:41:24.240 UTC. Smaller-closure run: 20:42:04.051–20:42:06.816 UTC. These durations describe this synthetic process only.

## Shapes and copy stages

Each run covers the Cartesian product of 16/32/64 current-page heads, 0/64/256 required embedding units, and short/8,000-code-unit ASCII/8,000-code-unit escape-heavy text. Every scenario has 256 canonical units, including the zero-required, all-unchanged case. Short strings have 96 UTF-16 code units. Escape-heavy strings contain predominantly NUL plus a unique source prefix, quote, backslash and newline. Exact input cardinalities and text shapes are checked before construction.

The first run uses up to 16,384 foreign unit metadata entries, representing the closure from 256 required units each touching a distinct full 64-unit historical batch. The second run caps metadata at 1,024 entries. **The second run is an allocation envelope for a proposed smaller closure; it does not claim that a 16,384-entry semantic closure may be truncated to 1,024. A real oversize closure must be rejected before reservation/admission.**

Each scenario retains these stages through its final observation:

1. Full source strings, including unchanged units.
2. Canonical unit descriptors, source/normalized/manifest hashes, a synthetic pinned provider descriptor and the serialized full descriptor.
3. Cross-document prepared JSON bodies of at most 64 inputs each, plus a Buffer copy of every body. Four slots are recorded; no outbound calls occur.
4. Foreign owner/head/unit/batch metadata objects and their JSON serialization.
5. At most 256 deterministic finite-number vectors of 1,536 dimensions; historical per-index projections reference these vectors.
6. Receipt JSON, publication JSON and a publication Buffer copy.

The normalization/body shape mirrors `minion_hub/src/server/services/embeddings.ts:62`: `text.slice(0, 8000)` and `JSON.stringify({ model, input })`. No product function is invoked. No full historical 64-vector batch is loaded for one requested index. No second parsed vector graph is constructed, so live vector count remains at most 256; JSON strings and buffers deliberately model some additional copy costs.

Each stage records heap used/total, external bytes, ArrayBuffer bytes, RSS and elapsed time. The scripts stop before the next stage if observed heap or per-scenario RSS growth reaches 112 MiB; neither did. A fixed input-envelope screening constant is also below that threshold. This screening constant is not a formal JavaScript allocation bound. The post-run maximum observed heap growth plus live ArrayBuffer growth stayed below 66 MiB. Garbage collection runs before and after each scenario; the results retain observations, not source/vector graphs.

## Measurements

MiB means 1,048,576 bytes. Per-scenario deltas use that scenario's post-GC baseline.

| Observation | Up to 16,384 closure units | Up to 1,024 closure units |
| --- | ---: | ---: |
| Completed scenarios | 27 | 27 |
| Peak heap growth | 46.30 MiB | 33.57 MiB |
| Peak heap plus live ArrayBuffer growth | 65.77 MiB | 53.03 MiB |
| Largest per-scenario RSS growth | 63.43 MiB | 55.52 MiB |
| Initial process RSS | 63.73 MiB | 64.32 MiB |
| Peak process RSS | 174.52 MiB | 154.38 MiB |
| Largest closure JSON | 5,903,259 bytes | 365,067 bytes |

Process RSS remained elevated between scenarios after GC. The initial-to-peak RSS increases were 110.80 MiB and 90.07 MiB, respectively. Peak RSS includes Node baseline, allocator retention, live allocations and other runtime memory; it is not retained object size. `external` can also lag collection, so it must not be added to `arrayBuffers` as if they were disjoint. The heap-plus-ArrayBuffer figure is an observed proxy, not total process accounting.

The 64-head, 256-required-unit cases produced:

| Text shape | Source UTF-16 bytes | Prepared JSON total | Largest 64-input body | Smaller-closure peak heap growth |
| --- | ---: | ---: | ---: | ---: |
| 96 code units | 49,152 | 25,488 | 6,372 | 19.71 MiB |
| 8,000 ASCII code units | 4,096,000 | 2,048,912 | 512,228 | 23.63 MiB |
| 8,000 escape-heavy code units | 4,096,000 | 12,263,550 | 3,066,120 | 33.52 MiB |

All three had a 134,913-byte canonical descriptor, 8,122,261-byte receipt JSON and 8,147,556-byte publication JSON. The all-unchanged 64-head cases still serialized a 134,657-byte descriptor and retained the full source; they prepared zero bodies and zero vectors. Counting paid units alone would miss this work.

Vector arithmetic: 256 × 1,536 × 4 = 1,572,864 bytes in raw float32; using eight-byte numeric payload arithmetic gives 3,145,728 bytes before object/array overhead. The measured decimal receipt JSON is much larger. Loading all 64 vectors from each of 256 historical batches would require 16,384 vectors: 96 MiB raw float32 or 192 MiB eight-byte numeric payload before any JSON or object overhead. That rejected shape was calculated, not allocated.

## Proposed limits for root selection

These are proposed constants for the new page API only. They require root selection, exact schema/API amendment and later actual-engine tests. They do not alter current corpus settings or silently split a page.

| Boundary | Proposed ceiling | Rationale and acceptance behavior |
| --- | ---: | --- |
| Current-page semantic heads | 64 | All requested head shapes measured. Count every current-page head, including unchanged/disabled sources. |
| Canonical units | 256 | Full manifest is bounded even with zero paid units. Reject before hashing/serializing additional units; do not silently truncate. |
| Required embedding units | 256 | At most four newly packed 64-input requests for a fully missing page. Overlap reuse can reduce this count. |
| Full canonical text | 2,097,152 UTF-16 code units (4 MiB arithmetic) | Includes text before normalization and unchanged text; measured 2,048,000-code-unit pages fit. Count before constructing prepared copies. |
| Full canonical source UTF-8 bytes | 6 MiB | Additional transport/hash accounting bound, consistent with at most three UTF-8 bytes per UTF-16 code unit. Non-ASCII worst-case strings were not measured here; native/source qualification must cover them. |
| Serialized canonical descriptor | 256 KiB | Roughly twice the measured 135 KiB; constrain actual identifier/provider fields and reject oversize metadata before persistence. |
| Prepared request JSON | 3 MiB per batch; 12 MiB per page | Measured worst escape-heavy body 3,066,120 bytes fits. Measure actual JSON bytes, including model/body overhead, before any admission. |
| Concurrent new outbound attempts | 4 | Explicit new API cap; does not multiply requests per document or rewrite legacy environment settings. |
| Foreign membership closure | 1,024 units and at most 1,024 distinct foreign heads | Qualified smaller allocation shape. This is a memory proposal, not evidence that 1,024 row locks are performant. Native contention tests must qualify the final lock behavior. |
| Foreign batches / owner rows | 256 each | No need to discover more distinct batches than required units in the bounded direct lookup; any transitive frontier that exceeds the cap fails before writes. |
| Serialized foreign metadata | 1 MiB | Measured 365,067 bytes at 1,024 entries; fetch bounded fields and at most limit+1 records, not an unbounded JSON aggregate. |
| Historical projected vectors | 256 at 1,536 dimensions | Retrieve required indices only. This does not prevent the current dispatch owner from retaining its complete admitted batch response of at most 64 vectors. |

A 256-unit sparse overlap with 256 distinct full foreign batches exceeds the proposed 1,024-unit closure and must fail explicitly without remote admission or partial reservation. A retryable busy outcome applies to a temporarily locked/live foreign owner; a deterministic capacity rejection is a different result. Admitted-without-receipt remains indeterminate. Neither state may trigger fresh paid work.

For M missing units with no preexisting transport constraints, request count stays `ceil(M / 64)` and active requests stay `min(4, ceil(M / 64))`. Current 25/50-source reconciliation pages fit the head cap only when their actual expanded head count stays at most 64; monthly conversation expansion and large source/chunk distributions can exceed either head or unit caps. Consumer adoption must report that incompatibility explicitly. This receipt does not authorize a smaller automatic page, per-document dispatch, source truncation or a change to page-atomic publication.

## Remaining qualification and handoff

No source implementation exists for these proposed limits yet. Root owns their selection and the PLAN/API/proposal updates. Existing phase-15 source TODOs and the 10-10 decision gate remain the handoff location; this documentation-only experiment adds no product source site to annotate.

The retained target was below 128 MiB for these observed synthetic shapes. Real provider responses, JSON parsing, SQL-driver parameter encoding, PostgreSQL JSONB storage, framework request state, production concurrency, delayed GC and duplicate parsed vector graphs are not measured. Existing `pg_column_size` guards are not JavaScript or HTTP byte limits. Before-read/source-loading limits remain phase 15; checks on already-loaded arrays cannot constrain previous loading allocations. Native tests must prove ordered nonblocking locks, exact frontier revalidation, abandonment tombstones, no stale dispatch permission, complete-response retention and current-head publication authority independently of these measurements.

The executor wrote this probe and receipt; this is not an independent review of the same work. No whole-phase, runtime rollout, installed package, deployment or production-capacity claim is made.
