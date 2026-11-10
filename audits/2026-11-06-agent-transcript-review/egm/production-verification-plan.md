# Production testability verification plan

Status: not executed. No production deployment or live behavior is claimed. Owner review decisions, approved source scope and required merge gates remain open.

## Release scope

Gateway feature review targets `DEV`; production releases come from `main`. A DEV merge/build proves the dev channel only. The installed release tool selected the wrong validation range and included unrelated JWT/backup commits; correct that range before publication. Do not promote unrelated DEV history merely to ship this slice. Determine the supported production-promotion path against the approved source and preserve the human approval/merge gates.

Hub targets `master`. Meta PR954 targets `dev` and contains evidence/specification only; merging it does not deploy the runtime fixes. Branch merges can trigger Docker/npm or Vercel release automation, so their consequences belong in the final review packet. No manual publish, version bump or workflow/flag change is included in this plan.

## Required proof

| Surface | Source of truth | Required acceptance | Current proof |
| --- | --- | --- | --- |
| Hub | Approved merged source plus Vercel production deployment/alias | Deployment identity matches approved source; authenticated app loads; safe read-only/request-validation smoke passes | Local build/check and synthetic request/SQL evidence only |
| Gateway | Approved `main` source and immutable Docker release receipt | Receipt source SHA and image digest match the deployed image/revision on every enabled production target | No production receipt or deployment |
| Fleet coverage | Server registry from that exact production source | Inspect every row enabled for `prd`; record health/version/auth results per target; missing proof remains incomplete | Retained transcript hosts are historical scope, not a current fleet inventory |
| Behavior | Agreed acceptance cases and authorized synthetic QA identity/data | Correct permission denials, bounded counts and business-calendar labels; no unsupported protocol/receipt/credential in protected output | Repository/fixture proof; live-model interpretation and production RLS are not inferred |

The existing Gateway workflow validates immutable source/digest identity before checkout or SSH and separates dev/prd targets. Retain those checks and native/edge authentication. Confirm release lane flags and the exact target registry at the approved release step; do not infer that a green build deployed anything.

## Safe post-deployment checks

1. Record the exact Hub deployment identity and confirmed production alias. The repository example names `https://hub.minion-ai.org`; verify the live production alias rather than treating that example as proof.
2. Verify Gateway release receipt, deployed image/revision and authenticated health on every enabled production target. Never print token values or container environment dumps.
3. Load the authenticated Hub assistant surface and verify its deployed source. Use safe read-only scope and invalid-input checks with an approved QA identity; no real appointment or finance mutation is part of this plan.
4. Provide the owner the verified production URL, deployed identities and short test instructions for count coverage, business-local periods and advisory booking preview. Mark any behavior not exercised in production explicitly.

No outbound business message, provider/model evaluation call, real booking confirmation, production-data fixture seeding, credential rotation or global auth/configuration change is authorized by this document. If additional mutation/model smoke is needed, prepare its exact target/input/effect first and obtain owner authorization.

## Production completion condition

Call the changes **live and testable** only after source decisions and checks are complete, the approved release is deployed, every required identity/health/auth check passes, and the owner has a verified URL and bounded test steps. A prototype count, local build, draft PR or dev-channel deployment is not that result.
