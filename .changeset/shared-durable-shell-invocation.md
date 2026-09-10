---
"@minion-stack/shared": minor
---

Add the required-durable Shells invocation contract: `shells.invoke_durable` in `SHELLS_METHODS`, the frozen `SHELL_DURABLE_V1_INPUT_POLICY` / `SHELL_DURABLE_V1_OUTCOME_LIMITS` / `SHELL_DURABLE_V1_PROFILE`, `ShellsInvokeDurableParams` / `ShellsInvokeDurableResponse`, `normalizeShellsInvokeDurableResponse()`, and the canonical outcome/receipt validators. Additive; legacy `shells.invoke` is unchanged.
