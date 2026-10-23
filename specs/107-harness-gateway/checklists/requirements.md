# Specification Quality Checklist: Gateway receipts and binding

**Created**: 2026-10-23. **Feature**: [spec.md](../spec.md).

- [x] Prioritized user stories, measurable outcomes and concrete edge cases are defined.
- [x] AS-IS revalidates current source and later WhatsApp code; Telegram certification is bounded.
- [x] Every FR-C01–FR-C09 and A11–A16/A20gateway/A30gateway maps to executable tasks.
- [x] Actual installed Drone0.6.0 signatures/hashes are recorded; success/failure/fallback limits are explicit.
- [x] Two receipt tables, generation checks, durable negative/error/unknown states and real SQLite process tests are specified.
- [x] Source hashes preserve exact original units; edits and explicit reevaluation are distinct.
- [x] Recipient queue crash windows, suggestion recovery, legacy cutover, retention and tombstones are covered.
- [x] Shared D/F interfaces, caller wiring and compatibility boundaries are explicit.
- [x] Shadow/census disabled default, no paid holdout, no active classifier change and human release gates remain.
- [ ] Independent technical pass 1 and pass 2 approve exact artifact hashes.

Technical AS-IS anchors are required by Constitution II; implementation details otherwise live in plan/contracts. Unchecked technical review is a workflow gate, not claimed implementation completion.
