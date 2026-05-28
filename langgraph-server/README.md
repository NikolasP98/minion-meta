# langgraph-server

Local LangGraph **JS** dev server. Two graphs registered in `langgraph.json`:

| Graph id   | File                     | What |
|------------|--------------------------|------|
| `agent`    | `src/agent.ts`           | Minimal single-node graph calling Claude via `ChatAnthropic`. |
| `research` | `src/research-agent.ts`  | Deep research agent (`deepagents`): planning (`write_todos`), virtual filesystem, subagents, + `internet_search` (Tavily). Model `anthropic:claude-sonnet-4-6`. |

## Run

```bash
npm install
npm run dev      # API only,  http://localhost:2024  (no browser)
npm run studio   # same, but opens the hosted Studio UI
```

- API: http://localhost:2024 (JSON only — `GET /` is 404 by design; health is `GET /ok`)
- Studio UI: https://smith.langchain.com/studio/?baseUrl=http://localhost:2024 (pick the graph in the top-left dropdown; hit `+` for a new thread if you see a stale-thread 500)

## Local chat UI (preferred over hosted Studio)

`../agent-chat-ui` is LangChain's open-source chat UI, cloned + installed locally
(installed with `pnpm install --ignore-workspace` because the MINION root is a pnpm
workspace). It runs fully local — open **http://localhost:3000**, no smith.langchain.com.

```bash
cd ../agent-chat-ui && pnpm dev   # http://localhost:3000
```

Its `.env` sets `NEXT_PUBLIC_API_URL=http://localhost:2024` and
`NEXT_PUBLIC_ASSISTANT_ID=research` (change to `agent` + restart to use the simple graph;
`NEXT_PUBLIC_*` vars only bake in at dev-server start).

## Deep Agents UI (best view for the `research` agent)

`../deep-agents-ui` is LangChain's purpose-built deep-agent frontend — renders the
agent's todo plan, virtual filesystem, and subagent activity (the generic chat UI only
shows messages). Cloned from `github.com/langchain-ai/deep-agents-ui`. It uses yarn
upstream but installs fine with npm:

```bash
cd ../deep-agents-ui
npm install --legacy-peer-deps   # repo's eslint devDeps conflict; runtime unaffected
PORT=3001 npm run dev            # http://localhost:3001 (3000 is the chat UI)
```

Connection is entered in the UI's **Settings**, not env: Deployment URL
`http://localhost:2024`, Assistant ID `research` (LangSmith key optional for local).

| Port | Surface | Notes |
|------|---------|-------|
| 2024 | LangGraph graph API | headless JSON; `GET /` 404 by design |
| 3000 | Agent Chat UI | generic chat |
| 3001 | Deep Agents UI | todos / files / subagents — best for `research` |

## Web search (Tavily) for the `research` agent

`internet_search` needs `TAVILY_API_KEY` (free at https://tavily.com). Without it the
agent still runs — planning/filesystem/subagents work and the tool returns an
"unavailable" hint so the graph never crashes. Add the key to `.env` and restart to
enable real search.

## Tracing (LangSmith)

Configured in `.env` but inert until you supply a real key:
1. Get a key at https://smith.langchain.com → Settings → API Keys (`lsv2_pt_...`)
2. Replace `PASTE_YOUR_KEY_HERE` in `.env`
3. Restart `npm run dev`. Runs appear under the `langgraph-server` project.

Until then the server logs harmless `403 Forbidden /sessions` warnings — that's the
placeholder key being rejected, not a real failure.

## Version pin — DO NOT bump blindly

`@langchain/langgraph` is pinned to **exactly `1.3.1`** (not `^1.3.1`). Why:

- `@langchain/langgraph-cli@1.2.2` bundles `@langchain/langgraph-api@1.2.2`, which
  imports `STREAM_EVENTS_V3_MODES` from `@langchain/langgraph/web`. That export only
  exists in `1.3.x`, so anything `< 1.3.0` **crashes on boot**.
- `1.3.2` **500s** on `POST /threads/:id/history` (`TypeError: reading 'length' at
  Topic.isAvailable`) — breaks Studio's thread-history panel.
- `1.3.1` is the only version that both boots and serves history correctly.

If you upgrade the CLI, re-test `GET /ok`, a thread run, and `POST /threads/:id/history`
before un-pinning.
