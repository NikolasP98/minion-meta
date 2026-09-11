---
phase: 13-ui-qualification
plan: "06"
requirements: ["UI-01", "UI-03", "UI-05"]
requirements-completed: []
status: locally-qualified
---

# Mandatory native component journeys — September 11

Eight new fixture/config/spec/reporter files are frozen in `/tmp/minion-13-03-nwojsyi9/hub`; exact manifest is `/tmp/minion-13-03-nwojsyi9/evidence/freeze-completion.json`. Root has copied them into the ordinary combined Hub snapshot. Integrated replay with the newer Home and Calendar source passed; current acceptance appears below.

The actual installed gateway client/service performs handshake, reconnect and send/pending transitions under synthetic local HTTP/WebSocket replies. Actual Calendar, SecretEditModal, ImageLightbox and native Dialog participate. The mandatory matrix contains six cases in each of five browser/input projects: desktop Chromium/Firefox/WebKit plus coarse Chromium/WebKit. Final snapshot run passed30/30 with private browser transform/temp directories and unchanged shared-cache receipts. Report SHA256: `9b41d4d96cbd0242635b9df9744d2d75f34959133dc5a2f6a75b7003cf7662f2`.

Independent review removed a hardcoded temporary server path and made the reporter reject a selected subset, missing/duplicate/skipped cases and missing receipts. Eight reporter controls and seven relocated-server controls pass; an actual six-case passing subset exits unsuccessfully because the mandatory matrix is incomplete. The server serves immutable hashed files on literal loopback and rejects other methods/paths. The builder records module/asset provenance and bounds output to550 files/50MiB; final original bundle was528 files,35,767,102 bytes, including all ten referenced local fonts.

Browser qualification uses Chromium149, Firefox151 and Linux WebKit26.5 with a private runtime-library wrapper. This does not certify native iOS hardware, assistive technology, production authentication, real providers, or deployed connectivity. Fixture page identity cannot certify authorization. Those requirements remain13-03; paired handoff is in the fixture README and `proposals/2026-09-08-platform-qc-remediation.md`.

## Root combined acceptance

The current combined Hub source passes30/30 mandatory native component journeys (all five browser/input projects), and full Svelte check returns0errors/0warnings after navigation and final Calendar toolbar integration. Report: `/home/nikolas/.cache/minion-qc/ui-integration-u8r6xtfh/evidence/critical-integrated-v2/critical-results.json`. Artifact manifest SHA256 `76d94b8544ffcb1d7e1959b357f03c54428c56e8ed978ab257df5e7ed3cdb267`;528files/35,756,428bytes.

Root removed optional compilation reuse because selected authority hashes did not cover all transitive source changes. An explicit reuse request now fails without creating output; control saved as critical-reuse-rejection.json. First fresh build compiled all three entries but failed because the evidence directory did not exist. Builder now creates it; a completely fresh second build and full matrix passed. No failed artifact was relabelled as accepted. Final root source manifest is critical-manifest-root.json; final whitespace formatting is recorded separately.

Local browser/build acceptance does not close authenticated routing, deployment or browser-CI provisioning in13-03.

Root combined report SHA256: `8d818ef4f7aa75ece4d90ec470d865bb02189e58316ba9f9ba33c4d3a06ff9d1`.
