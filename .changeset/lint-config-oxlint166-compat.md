---
"@minion-stack/lint-config": patch
---

Remove the `unicorn/prevent-abbreviations` rule from the oxlint preset. oxlint 1.66 dropped that rule, so referencing it (even as `"off"`) makes the config fail to parse for any consumer on oxlint 1.66+. The rule was redundant anyway — the `style`/`pedantic` categories it belongs to are already disabled.
