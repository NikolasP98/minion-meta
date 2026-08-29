---
id: 2026-08-17-factory-compose-tailnet-hardcode
title: docker-compose hardcodes the Netcup tailnet IP, breaking any-host setup
status: done
spawned_spec: 2026-08-17-factory-compose-tailnet-hardcode-spec
created: 2026-08-17
updated: 2026-08-28
repos: [minion-factory]
tags: [infra]
value: 7
effort: S
source: debt-sweep-2-2026-08-17
source_trust: trusted-automation
risk_class: high
priority: medium
owner: factory
---

# docker-compose hardcodes the Netcup tailnet IP, breaking any-host setup

## Problem

docker-compose.yml:12 literal 100.80.222.29 port bind vs setup.sh's any-Docker-host promise — compose up fails elsewhere.

## Definition of done

${FACTORY_TAILNET_IP:-100.80.222.29} interpolation mirroring FACTORY_PUBLIC_IP; docker compose config shows override.

## Out of scope

Multi-host orchestration.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Spec shipped; DoD string live at docker-compose.yml:44.
