# Agent transcript audit: public review overview

This overview preserves aggregate coverage and code-review conclusions. Raw message ledgers, source windows, tenant/agent/session identifiers and historical credentials remain in private local evidence and are excluded from this PR.

The read-only collection reconciled 723,032 canonical channel messages and 85,333 local ledger rows. These sources overlap and must not be added. It collected 1,797 retained transcript files, removed 31 byte-identical copies, and mechanically processed 43,377 message events, 10,697 tool calls and 11,075 user-role episodes across 41 gateway/agent cohorts. User-role events include automation and synthetic work; channel rows are not all agent-written.

Collection covered the two inspected running gateway containers and accessible retained local history. Legacy/inaccessible hosts, deleted history, Paperclip runs and Claude/Codex development sessions are outside this scope. Organization-filtered read-only REST exports used a fixed cutoff and reconciled counts, but were not a transaction-wide snapshot. No source-system writes, provider eval calls or outbound messages were made.

Qualitative analysis inspected targeted sequences, screened 74 recent conversation-like episodes, and sampled each cohort; it did not semantically grade every message or estimate an unbiased failure rate. The most useful improvements involve explicit dates/metrics/coverage, access states separate from onboarding, checked outcomes before completion claims, usable booking prerequisites, bounded discovery, output validation and scoped secret access. Existing correct answers and useful abstentions also supply positive controls.

[The code review](code-review/README.md) links eight concrete defects to current pinned source, distinguishing direct transcript matches from adjacent findings. [The EGM report](egm/consolidated_review_report.md) records proposed approaches, fresh reviewers, executable proof and remaining boundaries. Its 253-test prototype proof is separate from the [superseding release drafts and current qualification](egm/release-status.json).

Fine-tuning and live per-request model judging are not prerequisites for these deterministic corrections. This audit does not establish current production behavior. Changes are not live; signing, final qualification, independent review, human security/data approval and merge, and deployment/runtime verification remain open.
