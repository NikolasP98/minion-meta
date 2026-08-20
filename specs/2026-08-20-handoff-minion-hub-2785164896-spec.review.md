---
spec: 2026-08-20-handoff-minion-hub-2785164896-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-20
---

# Pass 2 review — CRM finance deposit-rule handoff

## Changes made

1. Set frontmatter to pass 2, `status: approved`, `updated: 2026-08-20`, and
   `verdict: approved` because the correctness gaps were resolvable from existing code and the
   approved canonical contract.
2. Changed the title and `relationship` from `already-satisfied` to `extends`; canonical S2 owns
   the rule/config design but omits downstream and cache work required by the S1 code now on disk.
3. Limited `related` to the canonical spec because the scalar `extends` relationship does not
   accurately describe the two sibling proposals; retained them as coordination notes in the body.
4. Replaced the unverified “Hub is not checked out, therefore S1 is inferred” language with
   read-only evidence from `minion_hub/master` commit
   `5e77bbe7a15aec126651f6cdac76672020153abd`, while keeping current-branch reconciliation mandatory.
5. Corrected the claim that the marker's finance query controls revenue: current SQL always sums
   invoice totals, while the rule controls purchase/reservation/loyalty flags and item selection.
6. Added `crm-contacts.service.ts::runRankQuery` as a required downstream consumer because it imports
   finance's rule-dependent `CONTACT_INVOICE_CLASS` and exposes its classification in roster/funnel
   results.
7. Prohibited module-initialized rule-dependent SQL and required one resolved rule per call because
   the current exported constants permanently capture `DEFAULT_DEPOSIT_RULE`.
8. Added the `contactFinanceMap` freshness invariant and public-function test because its current
   tenant-only, two-minute cache can return classification produced under an earlier rule.
9. Added explicit default, custom, empty-keyword, polarity, and rule-independent arithmetic proofs
   so marker deletion cannot pass from a grep alone.
10. Added Slice 0 reconciliation against both Hub integration and watched branches, preventing a
    duplicate implementation if canonical S2 has advanced since the reviewed master commit.
11. Added production-compatible `text` `org_id` and non-skipped SQL-integration requirements based
    on `/memory/MINION/factory/2026-08-20-2f403efa.md`, which records the prior fixture-type drift and
    the risk of DB-dependent suites silently skipping.
12. Replaced ambiguous zero-hit greps with explicit fail-on-match guards and bounded marker removal
    to the exact finance marker, preserving independently owned sibling markers.
13. Expanded the impact section to include the Hub contacts consumer and cache while retaining the
    canonical no-DDL, no-shared-package, and no-gateway-protocol conclusions.
14. Made sweep-owned post-merge proposal closure observable and prohibited manual proposal/index
    edits, so the source Definition of Done is verifiable end to end.

## Memory and evidence notes

- `/memory/MINION/factory/2026-08-20-2f403efa.md` shaped the fixture-schema and no-skip test gates.
- `/memory/MINION/factory/2026-08-20-2feeffb8.md` confirms `minion_hub` is the canonical fleet id,
  so the corrected spec retains that frontmatter value despite the source proposal's hyphenated id.
- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` confirms handoff markers require paired
  proposal lifecycle handling and that tests remain a development sub-stage, not a new board stage.
- The requested SQLite observation database was unavailable at
  `/home/agent/.claude-mem/claude-mem.db`, and no semantic memory-search MCP tool was exposed in
  this session; neither limitation blocks the source-anchored corrections.
- The Hub checkout is absent from this workspace. `minion_hub/CLAUDE.md` and the cited source files
  were read through the public GitHub contents API without modifying Git state.

## Flagged for the human

None. The canonical rule contract and current consumer graph determine the correction without a
new product or security decision.
