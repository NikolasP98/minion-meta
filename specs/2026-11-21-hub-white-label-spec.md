---
id: 2026-11-21-hub-white-label-spec
title: Organization names throughout Hub
stage: spec
status: review
pass: 1
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub]
proposal: 2026-11-21-hub-white-label
verdict: pending
pr: 1074
type: feature
tags: [data, security]
---

# Organization names throughout Hub

## 0. Product

Make the MINION part of Hub's identity configurable per organization. Faces should see Faces Hub. Keep Hub fixed, default to MINION without a valid organization name, and propose the organization name during organization creation. Fifteen visible characters is the proposed limit, with measured layout proof required.

## 1. Specification package

- [Specification and user scenarios](145-hub-white-label/spec.md)
- [Implementation plan and approval gates](145-hub-white-label/plan.md)
- [Dependency-ordered tasks](145-hub-white-label/tasks.md)
- [Observed current state, desired state and transitions](145-hub-white-label/research.md)
- [Branding coverage](145-hub-white-label/coverage.md)
- [Data model](145-hub-white-label/data-model.md)
- [Endpoint and UI contracts](145-hub-white-label/contracts/branding.md)
- [Qualification runbook](145-hub-white-label/quickstart.md)

## 2. Approval and delivery

Speckit/EGM document work only. No Hub implementation, production mutation, migration, merge, deployment or runtime qualification is implied. This data/security-tagged spec requires owner approval before code and human merge. EGM evidence is recorded in the feature directory; its status does not substitute for owner approval.

## 3. Out of scope

Logo/favicons/colors, custom domains, native installer/OS identity, external messages and marketing-site changes. Technical identifiers, distinct service names and user/historical content retain their meaning.

## 4. Verification

Run the [qualification runbook](145-hub-white-label/quickstart.md) on an isolated implementation candidate and local QA stack. Close the full branding inventory, owner/staff/two-org boundaries, both creation paths, retries, Unicode/layout/a11y checks, localization, design/token lints and existing application gates. Specification checks and EGM review do not establish application runtime or deployment.

## 5. EGM review result

The full EGM run passed. Feature critics converged in rounds 4–5; implementation-readiness reviewers converged in rounds 4–5, with no findings in the final round. See the [consolidated report](145-hub-white-label/egm/consolidated_review_report.md), [exact final reviewed package](145-hub-white-label/egm/final-review-package.zip), and [interactive proposal preview](145-hub-white-label/review.html). The preview uses the Hub's shared design tokens; it is illustrative rather than application runtime evidence.

Owner approval is still pending. EGM readiness is not owner approval of this data/security-tagged implementation.
