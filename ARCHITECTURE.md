# Minion - Solution Architecture

> Generated 2026-05-29. Grounded against the live meta-repo (`packages/`, `minion/`, `minion_hub/`, `minion_site/`, `paperclip-minion/`, `langgraph-server/`, `supabase/`) and recent project memory.
> Diagrams are Mermaid - they render in Obsidian and GitHub. Open this file in Obsidian preview for the best view.

The Minion platform is a **self-hosted multi-channel AI gateway** wrapped in a meta-repo of independent subprojects bound together by shared `@minion-stack/*` packages. The **gateway** is the runtime core; everything else is a frontend, a control plane, an execution engine, or shared library code.

---

## 1. System Context - how the pieces fit

```mermaid
%%{init: {'themeVariables': {'fontFamily': 'monospace'}}}%%
graph TB
    subgraph users["People & Channels"]
        U["End users<br/>(WhatsApp, Telegram, Discord,<br/>Slack, iMessage, Signal, Matrix...)"]
        OPS["Operators / Admins"]
        VIS["Marketing visitors"]
    end

    subgraph edge["Edge / Reverse Proxy"]
        CADDY["Caddy<br/>(caddy/Caddyfile)"]
    end

    subgraph core["Runtime Core - netcup VPS"]
        GW["Minion Gateway<br/>WS server + REST + CLI<br/>(minion/ / @nikolasp98/minion)"]
        FLOWS["LangGraph Flows Server<br/>(langgraph-server/ / :2024)"]
    end

    subgraph apps["Web Apps - Vercel"]
        HUB["Minion Hub<br/>operator dashboard<br/>(minion_hub/ / SvelteKit)"]
        SITE["Minion Site<br/>marketing + members<br/>(minion_site/ / SvelteKit)"]
    end

    subgraph control["Control Plane"]
        PAPER["Paperclip<br/>AI-agent company control plane<br/>(paperclip-minion/ / Express+React)"]
    end

    subgraph data["Data & Identity"]
        SUPA["Supabase Postgres<br/>PRIMARY IdP + identity vault<br/>+ migrating relational core"]
        TURSO["Turso / LibSQL<br/>hub+site app DB<br/>(logs, events, agents...)"]
        GWFILES["Gateway local stores<br/>message-ledger.db / sessions/*.jsonl<br/>brain.db / LanceDB vectors"]
    end

    U --> CADDY --> GW
    OPS --> HUB
    VIS --> SITE

    HUB <-->|"WS frame protocol<br/>req/res/event"| GW
    SITE <-->|WS frame protocol| GW
    HUB -->|HTTP proxy| PAPER
    PAPER -->|minion_gateway adapter<br/>shared WS client| GW

    GW <-->|"flows.run WS RPC<br/>signed device handshake"| FLOWS

    HUB --> SUPA
    HUB --> TURSO
    SITE --> SUPA
    SITE --> TURSO
    GW --> GWFILES
    GW -.->|identity / auth| SUPA
    PAPER --> PGLITE["PGlite / Postgres<br/>(paperclip Drizzle schema)"]

    classDef star fill:#ffe9a8,stroke:#b8860b,stroke-width:2px;
    class GW star;
```

**Reading it:** every frontend talks to the gateway over the **same custom WebSocket frame protocol** (`req` / `res` / `event`), whose types live in `@minion-stack/shared`. The gateway is the only thing channels touch. Identity is consolidating on **Supabase Postgres** (primary IdP); per-tenant app data still lives in **Turso**; the gateway keeps its own **flat-file/SQLite stores** on the VPS.

---

## 2. Component & Integration Map - the detailed view

```mermaid
%%{init: {'themeVariables': {'fontFamily': 'monospace'}}}%%
graph LR
    subgraph CH["Channel Extensions (45+) - minion/extensions/*"]
        direction TB
        WA[whatsapp] 
        TG[telegram]
        DC[discord]
        SL[slack]
        IM[imessage]
        SIG[signal]
        MX[matrix]
        ETC["line / irc / nostr / msteams<br/>feishu / zalo / wati / ..."]
    end

    subgraph GW["Minion Gateway - minion/src/*"]
        direction TB
        WSS["gateway/ - WS server<br/>frame protocol + sessions"]
        ROUTE["routing/ + dispatch/"]
        AGENTS["agents/ - agent runtime<br/>+ sessions/*.jsonl"]
        TOOLS["tools/ / hooks/ / skills"]
        RUNTIME["plugins/runtime - channel SDK<br/>runtime.channel.[id].*"]
        LEDGER["infra/message-ledger.ts<br/>(SQLite delivery log)"]
        MEM["memory-core / memory-lancedb<br/>(vector recall)"]
        VOICE["voice/ / tts/ - voice calls"]
        REST["web/ - REST API"]
    end

    subgraph SHARED["@minion-stack/* shared packages"]
        direction TB
        S_SHARED["shared<br/>protocol types + WS client"]
        S_DB["db<br/>Drizzle schema (sqlite + pg)"]
        S_AUTH["auth<br/>Better Auth factory"]
        S_CACHE["cache / env / cli<br/>shells-bridge / paperclip-client"]
    end

    subgraph HUB["Minion Hub (SvelteKit)"]
        direction TB
        H_FLOW["flow-editor + workshop<br/>(PixiJS + Rapier physics)"]
        H_MKT["marketplace / agents / sessions"]
        H_REL["reliability / config / users"]
    end

    subgraph SITE["Minion Site (SvelteKit)"]
        S_MKT["(marketing) landing"]
        S_MEM["(app) members area"]
    end

    subgraph FLOWS["LangGraph Flows Server"]
        F_COMPILE["compile-flow.ts<br/>StateGraph per request"]
        F_GRAPHS["graphs: agent / research"]
        F_GWCLIENT["gateway/client.ts<br/>+ device-identity.ts"]
    end

    subgraph PAPER["Paperclip Control Plane"]
        P_ADAPT["adapters: Claude / Codex / Cursor"]
        P_SRV["Express orchestration server"]
        P_UI["React + Vite board UI"]
    end

    subgraph DATA["Databases & Stores"]
        D_SUPA[(Supabase PG<br/>identity + core)]
        D_TURSO[(Turso/LibSQL<br/>app data + logs)]
        D_GW[(Gateway files<br/>ledger / jsonl / brain.db)]
        D_LANCE[(LanceDB vectors)]
        D_PG[(PGlite / PG<br/>paperclip)]
    end

    CH -->|inbound msgs| RUNTIME
    RUNTIME --> WSS
    WSS --> ROUTE --> AGENTS
    AGENTS --> TOOLS
    AGENTS --> LEDGER --> D_GW
    AGENTS --> MEM --> D_LANCE
    AGENTS --> VOICE

    WSS <-->|WS frames| H_FLOW
    WSS <-->|WS frames| S_MEM
    REST --> H_REL

    WSS <-->|flows.run RPC| F_GWCLIENT
    F_GWCLIENT --> F_COMPILE --> F_GRAPHS

    HUB -->|HTTP| P_SRV
    P_SRV -->|minion_gateway adapter| WSS
    P_ADAPT --> P_SRV
    P_UI --> P_SRV
    P_SRV --> D_PG

    S_SHARED -.consumed by.-> HUB
    S_SHARED -.-> SITE
    S_SHARED -.-> PAPER
    S_SHARED -.-> FLOWS
    S_DB -.-> HUB
    S_DB -.-> SITE
    S_AUTH -.-> HUB
    S_AUTH -.-> SITE

    HUB --> D_TURSO
    HUB --> D_SUPA
    SITE --> D_TURSO
    SITE --> D_SUPA
    AGENTS -.identity.-> D_SUPA
```

---

## 3. Data & Identity Layer - what lives where

The data story is mid-**strangler-fig migration**: identity is moving Turso -> Supabase Postgres; app/log data stays on Turso; the gateway is deliberately file-based for portability.

```mermaid
%%{init: {'themeVariables': {'fontFamily': 'monospace'}}}%%
graph TB
    subgraph supa["Supabase Postgres - PRIMARY identity (cloud IdP)"]
        SU1["user_identities vault<br/>(OAuth tokens, providers)"]
        SU2["profiles<br/>(legacy_user_id bridge)"]
        SU3["relational core (~15 tables)<br/>migrating Turso->PG, per-table flags"]
        SU4["RLS policies + org membership"]
    end

    subgraph turso["Turso / LibSQL (SQLite) - hub+site shared app DB"]
        T1["agents / sessions / chat-messages"]
        T2["servers / channels / skills"]
        T3["reliability-events / missions / tasks"]
        T4["marketplace / workshop-saves"]
        T5["flow_groups / flows / flow_runs"]
        T6["logs + high-volume events<br/>(stay on Turso, not migrated)"]
    end

    subgraph gw["Gateway local stores - netcup VPS filesystem"]
        G1["message-ledger.db<br/>(SQLite - delivery dedupe/log)"]
        G2["sessions/*.jsonl<br/>(per-conversation transcripts)"]
        G3[".claude/brain.db"]
        G4["LanceDB<br/>(memory-lancedb vector store)"]
    end

    subgraph paper["Paperclip"]
        P1["PGlite (dev) / Postgres (prod)<br/>Drizzle schema"]
    end

    subgraph auth["Auth layer - AUTH_PROVIDER switch"]
        A1["Supabase Auth - default/cloud"]
        A2["Better Auth - self-host option<br/>(@minion-stack/auth factory)"]
    end

    A1 --> supa
    A2 --> turso
    SU2 -.legacy_user_id.-> T1
```

**Key facts**
- **Schema source of truth:** `@minion-stack/db` holds Drizzle schema for *both* SQLite (`src/schema/`) and Postgres (`src/pg/`) - hub & site import it; the dual schema is what enables the Turso->PG migration.
- **Hub local dev** points `.env` at **prod Turso**, but `.env.local` (`file:./data/minion_hub.db`) overrides it, so the dev server actually runs a **local SQLite file**. Schema is hand-managed via `CREATE TABLE IF NOT EXISTS` - never `drizzle-kit push` against prod.
- **Gateway state never touches Turso/Supabase** for message content - it's flat files + SQLite on the VPS, which is why recon work reads `message-ledger.db` and `sessions/*.jsonl` directly.

---

## 4. Shared Packages - the dependency spine

```mermaid
%%{init: {'themeVariables': {'fontFamily': 'monospace'}}}%%
graph TD
    CLI["@minion-stack/cli<br/>(the 'minion' bin)"]
    ENV["@minion-stack/env<br/>6-layer resolver + Infisical"]
    TSC["@minion-stack/tsconfig"]
    LINT["@minion-stack/lint-config"]
    SHARED["@minion-stack/shared<br/>protocol types + WS client"]
    DB["@minion-stack/db<br/>Drizzle schema sqlite+pg"]
    AUTH["@minion-stack/auth<br/>Better Auth factory"]
    CACHE["@minion-stack/cache<br/>read-aside, TTL+SWR"]
    SHELLS["@minion-stack/shells-bridge<br/>in-VM ACP/JSON-RPC bridge"]
    PCLIENT["@minion-stack/paperclip-client<br/>typed Paperclip HTTP client"]

    CLI --> ENV
    HUB["minion_hub"] --> SHARED & DB & AUTH & CACHE
    SITE["minion_site"] --> SHARED & DB & AUTH
    PAPER["paperclip-minion<br/>(minion_gateway adapter)"] --> SHARED
    HUB --> PCLIENT --> PAPER
    GW["minion gateway"] --> SHELLS
    FLOWS["langgraph-server"] --> SHARED

    classDef pkg fill:#e8f0fe,stroke:#4285f4;
    class CLI,ENV,TSC,LINT,SHARED,DB,AUTH,CACHE,SHELLS,PCLIENT pkg;
```

Published to npm under `@minion-stack`, independent semver via Changesets. The `minion` CLI orchestrates every subproject with the **6-layer env merge** (defaults -> Infisical shared -> sub defaults -> Infisical sub -> `.env.local` -> `process.env`).

---

## 5. Flow Execution - how a flow-editor graph runs

```mermaid
%%{init: {'themeVariables': {'fontFamily': 'monospace'}}}%%
sequenceDiagram
    participant Hub as Hub flow-editor
    participant GW as Gateway (WS)
    participant FS as LangGraph Flows Server
    participant LLM as LLM provider(s)
    participant CH as Channel (e.g. WhatsApp)

    Note over Hub,GW: Trigger may also be inbound channel message
    Hub->>GW: flows.run (WS RPC, frame protocol)
    GW->>FS: forward run + signed device-identity handshake
    FS->>FS: compile-flow.ts -> StateGraph (per request)
    loop per node
        FS->>LLM: LLM / router / agent node
        LLM-->>FS: completion
    end
    FS-->>GW: per-node lifecycle events (live Test Run)
    GW-->>Hub: stream node events -> canvas
    FS->>GW: sendAlert / pluginAction node -> gateway method
    GW->>CH: outbound message
```

Flows are shipped as a **gateway plugin**; plugins can also contribute **flow templates** and **channel-scoped trigger nodes** (e.g. whatsapp/telegram "message" triggers). The router node supports **per-branch descriptions** for rubric-based LLM classification (e.g. alert-watcher's 4-level severity routing). The Flows server **binds to loopback** (`FLOWS_HOST ?? 127.0.0.1`) - only the gateway reaches it.

---

## 6. Deployment & Infrastructure Topology

```mermaid
%%{init: {'themeVariables': {'fontFamily': 'monospace'}}}%%
graph TB
    subgraph netcup["netcup VPS - 152.53.91.108"]
        direction TB
        SYSD["systemd --user<br/>minion-gateway.service"]
        GWD["Gateway (dist) +<br/>extensions (npm-pack)"]
        FSD["LangGraph Flows :2024<br/>(loopback only)"]
        CADD["Caddy reverse proxy"]
        SYSD --> GWD
        CADD --> GWD
        GWD <--> FSD
    end

    subgraph vercel["Vercel"]
        HUBV["minion_hub<br/>(adapter-vercel)"]
        SITEV["minion_site<br/>(adapter-vercel)"]
    end

    subgraph cloud["Managed cloud"]
        SUPAC[(Supabase Postgres)]
        TURSOC[(Turso edge DB)]
    end

    subgraph cicd["CI / Release"]
        GHA["GitHub Actions<br/>ci.yml / release.yml<br/>thermonuclear-review.yml"]
        GHCR["GHCR Docker images<br/>(main -> docker pipeline)"]
        NPM["npm @minion-stack/*<br/>(Changesets auto-publish)"]
    end

    DEPLOY["setup/utilities/<br/>deploy-bot-prd.sh<br/>(dist-rsync over SSH)"]

    DEV["Developer"] -->|git push| GHA
    GHA --> NPM
    GHA --> GHCR
    DEV -->|deploy| DEPLOY --> SYSD
    GHA -->|deploy| HUBV
    GHA -->|deploy| SITEV
    HUBV --> SUPAC & TURSOC
    SITEV --> SUPAC & TURSOC

    classDef warn fill:#fff3cd,stroke:#cc8800;
    class DEPLOY warn;
```

> (!) **Deploy gotcha:** the netcup `deploy-bot-prd.sh` path is **dist-only** - it does *not* ship `extensions/`. New/changed channel extensions need an npm-pack step before activating on prod (skew rule from deploy memory). The gateway also has a separate `main -> GHCR` Docker pipeline; the two are distinct.

---

## Subproject <-> Role quick reference

| Subproject | Role in the solution | Talks to |
|---|---|---|
| `minion/` | **Gateway core** - WS server, channels, agents, tools, plugin SDK | channels, hub, site, paperclip, flows, local stores |
| `minion_hub/` | Operator **dashboard** - flows, workshop, marketplace, reliability | gateway (WS), paperclip (HTTP), Turso + Supabase |
| `minion_site/` | **Marketing + members** area | gateway (WS), Turso + Supabase |
| `paperclip-minion/` | **Control plane** for AI-agent companies | gateway (adapter), own PG, hub (HTTP client) |
| `langgraph-server/` | **Flow execution** engine (StateGraph compiler) | gateway only (loopback, signed handshake), LLMs |
| `packages/*` | **Shared spine** - protocol, DB schema, auth, cache, env, CLI | consumed by all above |
| `pixel-agents/` | VS Code extension (pixel office for Claude agents) | local Claude Code JSONL transcripts (standalone) |
| `docs/` | Agent registry (1,350+ defs), profiles, sprints | feeds hub marketplace + gateway runtime |

---

### Notes on accuracy
- Grounded against the working tree on 2026-05-29; the identity/DB migration is **in progress**, so the Supabase <-> Turso boundary will keep shifting per-table.
- `langgraph-server/`, `@minion-stack/cache`, `shells-bridge`, and `paperclip-client` are **newer than the root `CLAUDE.md` project map** and are reflected here from the live tree.
- I'm confident about the component topology and protocol; exact per-table migration status (which of the ~15 relational tables are already on PG vs still Turso) changes frequently - verify against `packages/db/src/pg/` flags before relying on it.
