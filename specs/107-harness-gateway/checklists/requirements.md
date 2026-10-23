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
- [x] Revision 1 closes raw cron/config-loader/strict-authority/queue-expiry/keyed-owner-reply review findings with source anchors and actual caller tests.
- [x] Existing provider crash checkpoint reuse, SDK invocation identity and best-effort analytics limits are explicit.
- [x] Independent technical pass 1 and pass 2 approve exact artifact hashes; final reports are registered in the top-level review sidecar.

Revision 1 plus the null-compatibility correction received independent pass-1 and pass-2 approval; the parent recorded the exact reviewed hashes and this subsequent workflow-marker update. Technical AS-IS anchors are required by Constitution II; implementation details otherwise live in plan/contracts. Checked technical review records SDD approval, not implementation completion.
