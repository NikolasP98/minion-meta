---
spec: 2026-10-18-assistant-navigation-confirmation-spec
pass: 1
verdict: approved
created: 2026-10-18
reviewer: codex-independent-reviewers
---

# Review

Behavior pass (dynamic_catalog): approved after requiring whole-batch prescan, pending-action precedence over all follow-up triggers, truthful rendering of skipped actions, and update of navigation-dependent prompts.

Boundary pass (authority_models): approved after requiring one pure destination resolver, current RBAC checks at render and click, hostile path/query regression coverage, actual native callback tests, and explicit native-independent-effect scope. These requirements were incorporated into the specification before implementation.

The design requires a deliberate click even for an explicit open request. It does not restore disabled SQL or deploy the gateway. Source, focused tests, hosted checks, browser proof and production adoption remain separate evidence.

## Implementation review and qualification

Independent implementation reviewer authority_models approved the scoped repair with no blockers. The reviewer ran seven focused suites: 42 tests passed. The two clarity findings (navigation-batch exception in protocol prose and string query-parameter example) were corrected. Root independently inspected the common resolver, native execution, legacy batch handling and renderer diff.

Hub typecheck passed with zero errors/warnings; design/token gates and related assistant tests passed. Browser proof exercised the actual MarkdownMessage/global-tools/runner in a standalone loopback fixture: native and legacy proposals are inert, pointer and keyboard clicks navigate once, current permission revocation blocks the click, and 390px layout has no overflow. The fixture uses synthetic price data and a history.pushState navigation transport; it does not establish authenticated full-Hub or model E2E. At exact Hub head fce1bda7a0c37cb741373d0d8aba6054bbb18e7a, hosted CI run39091942826 passed the full test job: 882 files passed and 5 skipped; 7,773 tests passed and 263 skipped. Architecture checks passed (3 tests), as did typecheck and production build. The command retains the repository's existing retry=2 setting; no retry/failure lines were found in its log. The initial local full-suite run found a real briefing-size regression; three new sentences were shortened without changing the 35% budget. Final CI measured 34.1%. That older local run was stopped after the authoritative hosted test passed and is recorded as interrupted, not passed. The final change after browser proof affects briefing prose only. QA-stack remained pending at this checkpoint; Vercel preview passed.

Source TODOs in global-tools.ts and forms.ts point to the proposal for independent native effect authorization. No protected branch was merged and no production runtime was changed.
