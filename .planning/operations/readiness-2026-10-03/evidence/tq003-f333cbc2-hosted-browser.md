# Dependency security required-lane qualification

Source checkpoint: `f333cbc29e4eb7c70854ec0f1ee4c22b7ac86f85` on Hub draft PR431.

[Hosted job111150272912](https://github.com/NikolasP98/minion_hub/actions/runs/37104496343/job/111150272912) passed on 2026-10-03. Parent inspected its completed log.

- Unmodified production fixture: DS1 prototype attributes, DS2 editor paste/Markdown, DS3 ordinary sanitizer, DS4 detached subtree all passed (4/4, zero pending).
- Editor-paste mutant: DS2 failed for the required invariant; DS1/3/4 passed.
- Ordinary-sanitizer mutant: DS3 failed for the required invariant; DS1/2/4 passed.
- The exact failure qualifier completed successfully; it inspects structured assertions, runtime identity, network evidence, failure cause and clean fixture shutdown.

This is the exact required Playwright lane, complementing the earlier independent Browser Harness check. It qualifies these four security behaviors at this source checkpoint. It does not establish authenticated customer journeys or production rollout.
