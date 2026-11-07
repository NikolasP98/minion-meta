# Implementation Plan: Checked assistant outcomes

**Branch**: `spec/agent-transcript-guardrails-20261106` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

## Summary

Apply the owner-approved Gateway corrections F1–F4 and F6, retain the Hub review fixes and request-to-SQL regressions, then qualify the exact final source and production deployment. Keep backup work separate. Source changes remain in their gate-owned repositories; this meta branch owns specification and evidence.

## Technical Context

**Language/Version**: Existing strict TypeScript, Node 22; Hub uses Bun.
**Primary Dependencies**: Existing Gateway WS/auth, assistant extraction, reply normalization, TTS and transcript guards; existing Hub scheduling, finance and organization scoping.
**Storage**: Existing session/transcript state and business SQL; no schema change.
**Testing**: Executable Vitest boundaries, native session serialization, synthetic SQL/request fixtures, mutation controls and required repository/remote CI. No live provider calls or production writes.
**Target Platform**: Existing Gateway Docker production fleet and Hub Vercel production deployment.
**Project Type**: Cross-repository runtime correction.
**Performance Goals**: Preserve bounded extraction/admission and large-output redaction behavior; no new latency target or speculative performance claim.
**Constraints**: Required signed commits, real authorization, semantic preview without effects, preserved channel controls/media, canonical PR bases and human merge.
**Scale/Scope**: Eight original findings plus the explicitly approved five Gateway review corrections. Backup changes and universal bypass coverage remain outside this slice.

## Constitution Check

- Owner approved F1–F4 and F6 before this corrective implementation. Earlier candidate evidence and the later Spec Kit layout transition remain disclosed in spec.md.
- Exact AS-IS/TO-BE/DELTA and acceptance cases remain linked to the registered release spec and review findings.
- Gateway and Hub gates own their source branches; no root edits around active runs. Preserve all prior pipeline commits and signing.
- No new UI/page/schema/permission grant is introduced. F1 narrows device-free JWT admission to the approved operator role while preserving legitimate paired-node/shared-auth behavior.
- Security/data review and human merge remain release gates. This plan does not approve protected-branch writes or deployment.

## Project Structure

Feature documents: spec.md, research.md, data-model.md, contracts/outcomes.md, quickstart.md and tasks.md in this directory.

Gateway source: src/gateway/server/ws-connection/message-handler.ts; actual extractAssistantText implementation; src/tts/tts.ts; src/agents/sessions/session-tool-result-guard.ts; shared normalization/redaction helpers and their executable tests.

Hub source: src/server/services/scheduling-bookings.service.ts; shared HR availability and finance series helpers; assistant routes and their request/SQL regressions.

## Delivery sequence

1. Record the owner decision and correction contracts here.
2. Ask the Gateway gate to fix exactly F1–F4/F6 with regressions; preserve F5/F7 backup work as separate scope. Ensure the eventual PR range is canonical DEV without dropping prior commits. An ancestry-preserving upstream integration is preferable to a destructive reset or tool/global-default change; unsupported routing remains a publication blocker.
3. Preserve Hub's reviewed fixes and failed-phase test/doc changes through supported custody recovery; sign the follow-up once the agent is available.
4. Run required checks and independent review at the exact final source. A clean static review, local build or old prototype count is not final CI.
5. Prepare concrete PRs and promotion scope for owner merge, then execute the bounded production verification plan.

## Complexity Tracking

The release tool's non-default validation-range limitation is an operational blocker, not grounds to change GitHub defaults, mutate its daemon database, waive findings or promote unrelated history. The historical exploratory/layout transition and approvals are recorded explicitly; no completed phase is fabricated.
