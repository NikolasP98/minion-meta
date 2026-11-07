**What this proposes**

The document proposes isolated, tested candidates for eight gateway and Hub defects affecting memory extraction, personal-agent onboarding, booking validation and completeness, finance periods, output filtering, and secret redaction. It preserves existing authority checks and UI contracts while adding deterministic safeguards at assistant-facing boundaries. These candidates require further review and qualification before production adoption; passing their synthetic tests does not establish deployed behavior.

**How the existing system works, per this document**

The gateway assembles instructions, executes tools, stores messages, and sends replies; the Hub provides authenticated business data. The pinned gateway caller supplies too few messages for default memory extraction, while eligible overlapping extraction requests can exceed their budget. Other identified boundaries contain contradictory onboarding instructions, shallow booking previews, incomplete booking-list coverage information, permissive finance dates, and gaps in protocol filtering and secret redaction. The linked investigation distinguishes reproduced code defects from explanations of historical conversations and does not claim that every defect caused an observed answer.

## CP-1 — Major

Affected: C04 lines 62–70; Slice C lines 134–138; hub-candidate.md C04. Proposal requires continuation, stable paging and an empty later-page test. Candidate explicitly selects bounded list/count without cursor/next page, asking callers to narrow filters. Referring readers to candidate notes does not identify a changed design decision or unmet requirement. A fresh reader cannot tell whether continuation remains required. Reconcile the contract and tests, or explicitly record divergence and disposition.

Reviewer: /root/egm_comprehension, native fork_turns=none, read-only, completed Stage 6. Reviewed approaches-initial.md content and explicit candidate/context reading list. No document standard applied. Complete paraphrases retained above.
