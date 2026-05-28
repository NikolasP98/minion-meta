import { ChatAnthropic } from "@langchain/anthropic";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";

/**
 * Minimal LangGraph agent: a single LLM node that responds to the
 * conversation so far. Extend by adding tool nodes + conditional edges.
 */
const model = new ChatAnthropic({
  model: "claude-haiku-4-5-20251001",
  temperature: 0,
});

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

export const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__")
  .compile();
