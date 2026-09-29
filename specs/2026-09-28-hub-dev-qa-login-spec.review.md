---
spec: 2026-09-28-hub-dev-qa-login-spec
pass: 2
verdict: approved
reviewer: sol-guardians-dob-and-quick-add
created: 2026-09-28
---

# QA login specification review

- Requirements/UI: Sol quick_add APPROVED the toggle, lazy selectable profiles, explicit sign-in, normal-login preservation, localized states, and safe document navigation.
- Standards/security pass 1: Sol guardians_dob requested a loopback request-host guard, one exact eligibility predicate, non-enumerating failures, and explicit list bounds.
- Standards/security pass 2: APPROVED after all four amendments. Production-build and backend guards precede provider calls; real SSR sessions retain normal RBAC; the response excludes secrets and auth metadata.
- Session authorization: user requested the DEV-only feature and previously authorized Sol implementation, independent approval before merge, and deployment after verification.

Implementation, runtime and release qualification remain to be recorded.
