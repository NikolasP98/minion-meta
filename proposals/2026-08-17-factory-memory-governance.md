---
id: 2026-08-17-factory-memory-governance
title: Factory memory governance — quarantined write-back, provenance, snapshots
status: approved
created: 2026-08-17
updated: 2026-08-18
repos: [minion-factory]
tags: [security, infra]
source: audit-2026-08-17
value: high
---

# Memory is evidence, not instruction

Audit 2026-08-17 memory P0 (memory rating 2/5). Agent MEMORY_NOTE write-backs
land in canonical memory unreviewed with the same GitHub credential — an agent
can poison future agents' context. The sqlite mirror is agent-writable; no
retrieval telemetry proves memory influenced outcomes; runs carry no memory
snapshot version.

**Definition of done:** write-backs go to a quarantined candidate area
(separate credential) with schema/size validation and secret+injection
scanning; promotion to canonical memory requires review; run provenance
records a memory snapshot hash; operator ★★★ policy and agent observations
live in visibly separate trust domains (factory/ subdir already separates
files — enforce read-side labeling in prompts).

**Out of scope:** unified retrieval service ranking (follow-up once
quarantine exists).

---

**Gate decision 2026-08-18 (delegated):** Approved for SPEC (M8 planning — quarantine model can be designed now). Merge human-gated.
