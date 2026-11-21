---
id: 2026-11-21-hub-mcp-login-spec
title: Log in to the hub's MCP endpoint — tools run as you, with your role, in one organization
stage: spec
status: draft
pass: 1
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub]
verdict: pending
type: feature
tags: [security, auth, permissions]
---

# MCP login

## 0. Product

A person adds the hub to an agent harness with only its address, signs in through the browser,
picks an organization and approves. Tool calls then run as that person with that person's role,
and the person can end the connection from Settings. API keys stay for unattended automation.

The canonical [Spec Kit specification](143-mcp-login/spec.md), [plan](143-mcp-login/plan.md) and
[tasks](143-mcp-login/tasks.md) hold AS-IS evidence, invariants, alternatives and risks. Slice S6 of
`proposals/2026-11-20-hub-org-pages-on-the-fly.md`.

## Verification

- Tests per plan; a local end-to-end sign-in; a live connection from Claude Code after rollout.

## Out of scope

Open client registration; tightening data-API grants; changing the gateway `/mcp`.

## Human gates

Tagged `security`. Owner asked for implementation on 2026-11-20 and enables the sign-in service in the Supabase dashboard.
