// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { flushSync, tick, type ComponentProps } from 'svelte';
import { page } from '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat/tests/fixtures/pending-submission/page.svelte.ts';
import Home from '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat/src/routes/(app)/home/+page.svelte';
import Floating from '$lib/components/layout/FloatingAssistant.svelte';
import { assistant } from '$lib/state/features/assistant.svelte';
import { conn } from '$lib/state/gateway/connection.svelte';
import { ensureAgentChat } from '$lib/state/chat/chat.svelte';
import { requestRouteDecision, type RouteDecision } from '$lib/assistant/turn-router';
import { decisionEvents } from '$lib/assistant/decision-events';
import { getClient, sendRequest } from '$lib/services/gateway-rpc';
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock('$app/state', async () => import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat/tests/fixtures/pending-submission/page.svelte.ts'));
const routeMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/assistant/turn-router', async (original) => ({
  ...(await original<typeof import('$lib/assistant/turn-router')>()),
  requestRouteDecision: routeMock,
  requestRouteDecisionWithEvidence: async (...args: unknown[]) => ({
    decision: await routeMock(...args),
    attempt: null,
  }),
}));
vi.mock('$lib/services/gateway.svelte', async () => ({
  ...(await import('$lib/services/gateway/chat-rpc')),
  sendRequest: (await import('$lib/services/gateway-rpc')).sendRequest,
}));
vi.mock('$lib/services/gateway-rpc', () => ({
  getClient: vi.fn(() => ({
    beginRequest: (...args: Parameters<typeof sendRequest>) => sendRequest(...args),
  })),
  sendRequest: vi.fn(async (method: string) => (method === 'chat.history' ? { messages: [] } : {})),
  gwTrace: vi.fn(),
}));
vi.mock('$lib/state/features/voice-call.svelte', () => ({
  voiceCall: { active: false },
  mouth: {},
  startCall: vi.fn(),
  endCall: vi.fn(),
  toggleMute: vi.fn(),
}));
let release!: (value: RouteDecision | null) => void;
beforeEach(() => {
  flushSync(() => {
    page.data.user.id = 'actor-a';
    page.data.activeOrgId = 'org-a';
    page.data.personalAgent.agent.agentId = 'agent-a';
    page.url = new URL('http://localhost/home');
    conn.connected = true;
    assistant.open = true;
  });
  for (const id of ['agent-a', 'agent-b']) {
    const chat = ensureAgentChat(id);
    chat.sending = false;
    chat.stream = null;
    chat.runId = null;
    chat.sessionKey = `agent:${id}:main`;
    chat.messages.splice(0);
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ aliases: {}, notes: [] })),
  );
  vi.mocked(requestRouteDecision).mockClear();
  vi.mocked(requestRouteDecision).mockImplementation(
    () =>
      new Promise((done) => {
        release = done;
      }),
  );
  vi.mocked(getClient).mockReturnValue({
    beginRequest: (...args: Parameters<typeof sendRequest>) => sendRequest(...args),
  } as unknown as ReturnType<typeof getClient>);
  vi.mocked(sendRequest).mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  if (!Element.prototype.animate)
    Element.prototype.animate = (() => ({
      cancel() {},
      finished: Promise.resolve(),
    })) as unknown as typeof Element.prototype.animate;
});
afterEach(() => {
  cleanup();
  decisionEvents.setOwner({ actorId: '', orgId: '' });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function mount(surface: 'Home' | 'Floating') {
  if (surface === 'Floating')
    flushSync(() => {
      page.url = new URL('http://localhost/crm');
    });
  const view =
    surface === 'Home'
      ? render(Home, {
          data: { userName: 'Fixture', greeting: 'Hello', openedIds: [] } as ComponentProps<
            typeof Home
          >['data'],
        })
      : render(Floating);
  const input = await waitFor(() => view.getByRole('textbox') as HTMLTextAreaElement);
  await fireEvent.input(input, { target: { value: 'keep my draft' } });
  await fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(requestRouteDecision).toHaveBeenCalled());
  return { view, input };
}

it('a callback from an unknown merged live-tool source must not borrow the bound stream parent', async () => {
 const {getAcceptedRun,claimRunFinal,associateRunMessage}=await import('$lib/assistant/accepted-runs');
 const seen: Array<{kind:string;origin?:unknown;parentRunId?:unknown;taskRootId?:unknown}>=[];
 const off=decisionEvents.subscribe(event=>seen.push(event));
 try {
 const {view,input}=await mount('Home');release(null);
 await waitFor(()=>expect(input.value).toBe(''));
 const sent=vi.mocked(sendRequest).mock.calls.find(([method])=>method==='chat.send');
 const params=sent![1] as {idempotencyKey:string;sessionKey:string};
 const binding=getAcceptedRun(params.idempotencyKey)!;expect(claimRunFinal(binding.runId,params.sessionKey)).toBe(binding);
 flushSync(()=>{
 const chat=ensureAgentChat('agent-a');chat.sending=false;chat.runId=null;
 chat.liveTools=[{id:'unknown-artifact',name:'chat_artifact',input:{html:'',buttons:[{text:'Unknown live artifact',callback_data:'UNKNOWN_LIVE_CALLBACK'}]},done:false}];
 chat.stream='Known answer';chat.streamDisplay='Known answer';
 chat.streamMessage={role:'assistant',content:[{type:'text',text:'Known answer'}],timestamp:Date.now()};
 associateRunMessage(chat.streamMessage,binding);
 });
 await fireEvent.click(await view.findByRole('button',{name:'Unknown live artifact'}));
 await waitFor(()=>expect(vi.mocked(sendRequest).mock.calls.filter(([method])=>method==='chat.send')).toHaveLength(2));
 const child=seen.find(event=>event.kind==='run_relation'&&event.origin==='artifact');
 console.log('UNKNOWN_SOURCE_RELATION',JSON.stringify(child));
 expect(child).toBeDefined();expect(child?.parentRunId).toBeUndefined();expect(child?.taskRootId).not.toBe(binding.taskRootId);
 }finally{off();}
});
