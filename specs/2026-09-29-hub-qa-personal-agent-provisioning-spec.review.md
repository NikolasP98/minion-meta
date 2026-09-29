---
spec: 2026-09-29-hub-qa-personal-agent-provisioning-spec
pass: 2
verdict: approved
reviewer: sol-guardians-dob
created: 2026-09-29
---

# QA personal-agent provisioning review

- Pass 1 requested an explicit fixture set, valid-active preservation, and atomic agent/profile-pointer repair with rollback and rerun-stability tests.
- Pass 2 approved after those amendments. The contract names all 16 ordinary personas, excludes the pending-agent and no-org scenarios, and forbids blanket namespace repair or external gateway calls.
- Local root-cause proof: UI Audit owner authenticated successfully, but `/en/home/__data.json` returned `{type: "redirect", location: "/onboarding"}`. HTML status 200 alone was not treated as route success because the app disables server rendering.
- Bounded local repair matched six exact profiles and repaired all six. A repeated dry run required zero changes. All 16 ordinary seeded personas have active personal agents with nonempty agent IDs; pending-agent remains pending and no-org remains without an agent.
- All six repaired personas completed fresh real QA sign-in and returned Home route data with no error nodes. UI Audit owner also returned POS catalog route data. The owner Home page visibly rendered after cold development imports completed; screenshot `/tmp/qa-agent-home-after.png`.
- Final exact-head review approved `b65a5d68efa6361f9f94070d73457bba2ca343c4` on requirements/spec and standards/security. The first pass requested blank-name detection in the repair CLI and nonempty-field assertions in the aggregate contract; both were implemented and reviewed.
- Focused tests: six pure detector tests and five real-PostgreSQL fixture tests passed. Coverage includes blank names/IDs, active-row preservation, pointer-only repair, error repair and transaction rollback. Formatting and diff checks passed.
- The enhanced repair found one existing active row with a blank display name; the bounded second repair fixed that row. A final dry run reports six matched and zero needing repair.
- The running dev checkout now contains the reviewed seed changes (cherry-picks `a8a4cda` and `2845e80`), so future seed runs in that checkout preserve the corrected setup. The dev server remains on port 5199.
- Final-head hosted CI is pending.
- Hub PR: https://github.com/NikolasP98/minion_hub/pull/407 . This changes local fixture scripts only; it does not provision live model workers or alter production onboarding.
