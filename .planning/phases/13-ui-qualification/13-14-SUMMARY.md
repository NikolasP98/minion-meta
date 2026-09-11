---
phase: 13-ui-qualification
plan: "14"
requirements: ["UI-05", "UI-07", "SDK-01", "SDK-02"]
requirements-completed: []
status: locally-qualified-release-integration-separate
---

# Portable Site UI acceptance

All four bounded local tasks are qualified. One native command compiles actual EN/ES Paraglide modules offline, runs the existing component/service tests, builds the three real-component fixtures and requires the exact 75-case browser matrix. It refuses skipped/retried/subset runs, ambient authentication and selector state, missing runtime/font/network evidence, changed source/artifact bytes and oversized retained evidence. The additive UI CI job pins action commits, Node22.23.2, Bun1.3.4 and Playwright1.61.1, retains existing baseline job behavior, and uploads bounded artifacts.

Final full entrypoint exited zero:22 tooling tests,56 ordinary tests,22 real-client gateway contracts,75 browser tests with25 per engine and zero skips/retries. Runtime attachments record Chromium149.0.7827.55, Firefox151.0 and WebKit26.5. Root independently repeated22 tooling controls, reviewed the runner/compiler/workflow, and rehashed all eight frozen files and the complete acceptance receipt. Final retained evidence totals16,000,622 bytes. Native formatting/design checks pass for this bounded slice.

Eight-file manifest SHA256:333ed08be8ca1762113b6f3f190ccc1d47034f6c4f67efc668b5e8330e757ca8. Acceptance receipt SHA256:8fdf965be2aaa3b3694c6fe6fd4a8ffd204b1eae159dbf6b737461109a5481ef. Portable source copies and receipt are preserved in `../../operations/360/checkpoint-2026-09-11/site-ci/`. The original candidate is `/home/nikolas/.cache/minion-qc/13-14-GBkGxWfg/minion_site`; its handoff preserves failed setup/reporting attempts and corrected negative controls. Input verification accounts for28,232 unchanged files and36 unchanged internal links.

The final artifact inventory excludes only runtime cache/temp/home/browser-cache directories, including native fontconfig links; actual evidence still rejects symlinks. The JSON test reporter uses unique file identities rather than assuming parameterized test titles are unique. Those fixes were tested and the entire entrypoint reran successfully.

The remote Site dev branch advanced to a23ee4b while this snapshot used the earlier7f4c3b2 baseline. User-authorized release integration is separate: it must preserve newer upstream CI scripts, changed-file formatting, error status behavior, tests and translations before production. This original candidate's CI job must not overwrite those newer gates. Stock Ubuntu execution, complete production build and authenticated application checks are not inferred from these local fixtures. Exact TODOs and the platform QC proposal retain outstanding gates.
