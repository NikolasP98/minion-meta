import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
import { z } from "zod";

/**
 * Deep research agent (from LangChain's Deep Agents quickstart).
 *
 * Capabilities provided automatically by createDeepAgent:
 *   - planning via the built-in `write_todos` tool
 *   - a virtual filesystem (`write_file` / `read_file`) to offload large results
 *   - subagent spawning for delegated subtasks
 * Plus the `internet_search` tool below for gathering information.
 *
 * Web search uses Tavily and needs TAVILY_API_KEY. If it's missing the tool
 * degrades gracefully (returns a hint) so the graph still loads and the
 * planning / filesystem / subagent features remain usable.
 */
const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general",
    includeRawContent = false,
  }: {
    query: string;
    maxResults?: number;
    topic?: "general" | "news" | "finance";
    includeRawContent?: boolean;
  }) => {
    if (!process.env.TAVILY_API_KEY) {
      return [
        "Web search is unavailable: TAVILY_API_KEY is not set.",
        "Get a free key at https://tavily.com, add it to langgraph-server/.env,",
        "then restart the dev server. Answer from existing knowledge for now.",
      ].join(" ");
    }
    const tavilySearch = new TavilySearch({
      maxResults,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent,
      topic,
    });
    return await tavilySearch.invoke({ query });
  },
  {
    name: "internet_search",
    description: "Run a web search",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe("Search topic category"),
      includeRawContent: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include raw content"),
    }),
  },
);

const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

export const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
