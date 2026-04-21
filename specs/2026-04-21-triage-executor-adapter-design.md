# Triage + Executor Adapter Architecture

**Date:** 2026-04-21
**Status:** Approved — pending implementation plan
**Scope:** Minion gateway refactor + new triage layer + executor plugin system

---

## Problem

The Minion gateway grew a full embedded LLM runtime (`pi-embedded`, ~70 files) to handle inference internally. As Claude Code and other CLI-based executors matured with native tools, skills, and hooks, the gateway's internal runtime became the wrong place to run non-trivial agent work. The routing layer (complexity-scorer, intent-classifier, multi-llm-router) correctly classifies requests but always dispatches to the same internal runner — it doesn't route to different *execution environments*.

The gateway also lacks an agent selection layer: there is no mechanism to match an incoming request to a specific agent personality, capability set, or memory context.

---

## Solution Overview

Split the gateway into a permanent **core** and a swappable **executor tier**, add a **triage layer** that routes requests to the right agent and adapter, and back the whole thing with a **self-improving knowledge graph** of agent templates.

---

## Architecture

```
Channel (WhatsApp, Telegram, Discord, ...)
        │
        ▼
┌─────────────────────┐
│   Transport Layer   │  ← channel extensions, unchanged
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│   Session Manager   │  ← session-key, history, continuity, unchanged
└─────────────────────┘
        │
        ▼
┌───────────────────────────────────────────┐
│              Dispatcher                   │
│  ┌─────────────────┐  ┌────────────────┐  │
│  │complexity-scorer│  │intent-classif. │  │  ← existing, unchanged
│  └────────┬────────┘  └───────┬────────┘  │
│           └─────────┬─────────┘           │
│               ┌─────▼──────┐              │
│               │  KG Triage │              │  ← NEW
│               └─────┬──────┘              │
│               ┌─────▼──────────┐          │
│               │Adapter Registry│          │  ← NEW
│               └─────┬──────────┘          │
└─────────────────────┼─────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
┌──────────────┐           ┌──────────────────┐
│    Drone     │           │   Claude Code    │
│@minion-stack │           │ executor plugin  │
│   /drone     │           │  (tmux spawn)    │
└──────────────┘           └──────────────────┘
  nano/micro tier            base/expert tier

        │                            │
        └─────────────┬──────────────┘
                      ▼
             Response → session → transport → user
```

---

## Components

### 1. Gateway Core (unchanged)

Transport and Session Manager are not touched. The 45+ channel extensions continue to function as-is.

The existing `complexity-scorer`, `intent-classifier`, and `multi-llm-router` are preserved and become inputs to the Dispatcher.

---

### 2. Adapter Plugin System

Replaces the hardcoded pi-embedded invocation. Adapters are self-describing executor plugins registered via a new `registerAdapter` method on `MinionPluginApi`.

#### Type additions to `src/plugins/types.ts`

```typescript
type PluginKind = "memory" | "adapter"

type AdapterRunContext = {
  message: string
  sessionKey: string
  agentId: string
  persona?: string          // injected from KG template
  memoryPath?: string       // agent's memory directory
  tier: ModelTier
  taskType: TaskType
  agentType: AgentType
}

type AdapterPlugin = {
  id: string
  name: string
  description: string       // published: what this adapter handles well
  instructions: string      // published: how agents invoke it as a subagent
  execute: (ctx: AdapterRunContext) => AsyncIterable<string>
}

// Added to MinionPluginApi:
registerAdapter(adapter: AdapterPlugin): void
```

#### Session adapter config

Each session declares its allowed adapter surface:

```typescript
type SessionAdapterConfig = {
  default: string     // "drone" — used when no template match
  fallback: string    // "claude-code" — used when default fails
  allowed: string[]   // adapters this session may invoke
}
```

#### Adapter resolution order

1. KG template found → use `template.adapter`
2. No template match → use `session.default` (Drone)
3. Adapter execution fails → use `session.fallback` (Claude Code)

No priority numbers. No `canHandle` predicates. The template declares, the session defaults, the registry dispatches.

---

### 3. `@minion-stack/drone`

The pi-embedded runner extracted into a standalone package and re-registered as a bundled adapter plugin. It handles nano/micro tier requests inline — fast, cheap, no subprocess overhead.

- **Extracted from:** `minion/src/agents/pi-embedded/`
- **Package:** `@minion-stack/drone`
- **Registers as:** default adapter at gateway startup
- **Handles:** simple chat, quick answers, summarization, lightweight reasoning
- **Does not handle:** file I/O, code execution, tool use, multi-step work

The gateway imports Drone as a bundled plugin the same way it imports any channel extension.

---

### 4. Claude Code Executor Extension

A new extension (`minion/extensions/claude-code/`) that registers as an adapter plugin. On invocation, it spawns a Claude Code session in a managed tmux pane, injects the agent's persona + memory context via CLAUDE.md and skills, pipes I/O, and streams the response back through the gateway.

- **Handles:** base/expert tier, code, file I/O, multi-step agents, skills
- **Spawn strategy:** one tmux pane per session-key, reused across turns in the same conversation
- **Context injection:** agent persona → CLAUDE.md, memory path → `--memory` flag or CLAUDE.md include

---

### 5. KG Triage Layer

Sits inside the Dispatcher. Per-request, stateless. Uses the output of complexity-scorer and intent-classifier as tag generation inputs.

#### Agent Template (KG node)

```typescript
type AgentTemplate = {
  id: string
  name: string
  description: string
  tags: string[]              // controlled vocabulary — see Tag Ontology below
  adapter: string             // "drone" | "claude-code" | any registered adapter id
  persona: string             // system prompt / personality
  memoryPath?: string         // persistent memory directory for this agent
  subagents?: SubagentSpec[]  // agents this agent is allowed to spawn
  exampleQueries?: string[]   // real queries that matched this agent (learning)
}

type SubagentSpec = {
  id: string
  adapter: string
}
```

#### Triage flow (per request)

```
1. Classify input → tags (via complexity-scorer + intent-classifier + KG tag mapper)
2. Exact tag match against KG nodes → found?
   YES → invoke template.adapter with template context
   NO  → fuzzy/tag-overlap search → find top 3–5 closest agents
3. Present to user:
   "No exact match. Agents that might help:
    • [agent-name] — description
    • ...
   Pick one, or I'll build a new agent for this."
4a. User picks existing → invoke that adapter
    → patch agent metadata (see Self-Improvement below)
4b. User confirms new build → invoke agent-builder skill
    → new KG node saved → invoke its adapter
```

---

### 6. Tag Ontology

Tags are a **controlled vocabulary** — bounded, curated, no free-form appending. The ontology lives as a KG artifact (a vocabulary node) read by the triage before tagging and checked by the agent-builder before proposing new terms.

Each tag has:
```typescript
type OntologyTag = {
  id: string          // canonical slug, e.g. "code-review"
  label: string       // human label, e.g. "Code Review"
  description: string // what requests belong to this tag
  aliases: string[]   // common phrasings that map to this tag
}
```

New tags are only added when a genuine ontology gap is detected (no existing tag covers the concept). When a new tag is added, a retroactive scan applies it to all agents that logically belong to that concept.

---

### 7. Self-Improving Metadata

When a user selects an existing agent from the fuzzy-match list (not a direct match), the system treats the pick as a training signal:

```
On user picks agent from fuzzy list:
1. Map failed query terms → nearest existing controlled tags
2a. Good mapping exists → add canonical tags to agent's tag list
2b. No mapping → ontology gap:
    - Propose + add new canonical tag to vocabulary
    - Tag the picked agent
    - Retroactively scan other agents for same gap
3. Append original query to agent's exampleQueries[]
4. Log miss + resolution for pattern review
```

Result: the KG gets more accurate with use. Repeat queries for the same intent hit directly on the next attempt.

---

### 8. Agent-Builder Skill

A Claude Code skill available to the triage agent — **not invoked on every request**. Only fires when the user confirms they want a new agent built.

Responsibilities:
- Consult user or make reasonable assumptions
- Select appropriate adapter based on request type + adapter docs
- Write a new `AgentTemplate` KG node
- Assign tags from controlled vocabulary (or propose new canonical tag if gap detected)
- Initialize memory directory if needed

The builder reads each adapter's `description` and `instructions` fields to decide which adapter to assign to the new template. This makes adapter selection data-driven rather than hardcoded.

---

## Implementation Order (API-first)

1. **Type additions** — `PluginKind`, `AdapterPlugin`, `AdapterRunContext`, `SessionAdapterConfig`, `registerAdapter` in `src/plugins/types.ts`
2. **Adapter registry** — `src/plugins/adapter-registry.ts`
3. **Extract Drone** — move `src/agents/pi-embedded/` to `@minion-stack/drone`, register as bundled adapter
4. **Claude Code extension** — `extensions/claude-code/` adapter plugin
5. **Dispatcher update** — wire complexity-scorer + intent-classifier into adapter resolution
6. **KG triage** — tag mapper, template store, fuzzy search
7. **Agent-builder skill** — Claude Code skill for template creation
8. **Self-improvement loop** — metadata patching on fuzzy pick
9. **Tag ontology** — vocabulary node, gap detection, retroactive scan

Phases 6–9 are a separate milestone from 1–5. Phases 1–5 deliver the executor plugin architecture. Phases 6–9 deliver the intelligent triage layer.

---

## What Stays Unchanged

- All 45+ channel extensions
- `complexity-scorer.ts` — keep as-is, feeds Dispatcher
- `intent-classifier.ts` — keep as-is, feeds Dispatcher
- `multi-llm-router.ts` — keep as-is, used inside Drone for model selection
- Session management, auth, voice-call extension, all channel-specific logic

---

## What Gets Removed from Gateway Core

- Direct pi-embedded invocation in the main agent dispatch path
- Hardcoded model/executor selection logic (replaced by adapter registry + session config)
