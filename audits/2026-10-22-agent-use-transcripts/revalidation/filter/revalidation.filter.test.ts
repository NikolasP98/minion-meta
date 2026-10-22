import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { MinionPluginApi } from '../../src/plugins/types.js';
vi.mock('../../src/drones/host.js', () => ({ createGatewayDroneHost: vi.fn(() => ({})) }));
vi.mock('./src/classifier.js', () => ({ classifyMessage: vi.fn() }));
vi.mock('./src/destinations.js', () => ({ sendAlerts: vi.fn() }));
vi.mock('./src/reply-flow/suggestions-drone.js', () => ({ runSuggestionsDrone: vi.fn(async () => []) }));
vi.mock('./src/reply-flow/handle-reply.js', () => ({ handleOwnerReply: vi.fn(async () => ({ status: 'ignored' })) }));
import plugin from './index.js';
import { classifyMessage } from './src/classifier.js';
import { sendAlerts } from './src/destinations.js';
const classify = vi.mocked(classifyMessage);
const send = vi.mocked(sendAlerts);
type Handler = (event: Record<string, unknown>, context?: Record<string, unknown>) => Promise<unknown>;
async function setup(config: Record<string, unknown> = {}) {
  const hooks = new Map<string, Handler>();
  const methods = new Map<string, Handler>();
  let start: ((ctx: Record<string, unknown>) => Promise<void>) | undefined;
  const api = {
    config: {}, pluginConfig: { subscriptions: [{kind:'channel', channel:'telegram'}, {kind:'agent', agentId:'agent-a'}],
      destinations: [{channel:'telegram',to:'fake-owner'}], replyFlow:{enabled:false}, ...config },
    logger: { info:vi.fn(),warn:vi.fn(),error:vi.fn(),debug:vi.fn() }, runtime: {},
    registerService: (svc: {start: typeof start}) => { start = svc.start; },
    registerGatewayMethod: (name: string, fn: Handler) => methods.set(name,fn),
    on: (name: string, fn: Handler) => hooks.set(name,fn),
  };
  plugin.register(api as unknown as MinionPluginApi);
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(),'alert-offline-probe-'));
  await start?.({stateDir});
  return {hooks, methods, api};
}
const base = {channel:'telegram',accountId:'account-a',chatId:'chat-a',senderId:'sender-a',content:'your product is broken',isGroup:false,messageId:'7'};
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  delete (globalThis as unknown as Record<string,unknown>).__minion_alert_watcher_state__;
  classify.mockResolvedValue({is_complaint:true,severity:'high',category:'product_defect',summary:'Broken product'});
  send.mockResolvedValue({total:1,successCount:1,perDestination:[]});
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('Observed current watcher behavior, not desired regression expectations', () => {
  it('drops a different chat with same message ID before classification', async () => {
    const {hooks}=await setup(); const inbound=hooks.get('message_inbound')!;
    await inbound(base); await inbound({...base,chatId:'chat-b',senderId:'sender-b'});
    expect(classify).toHaveBeenCalledTimes(1); expect(send).toHaveBeenCalledTimes(1);
  });
  it('classifies duplicate inbound and actual dispatch-shaped received events twice', async () => {
    const {hooks}=await setup();
    await hooks.get('message_inbound')!(base);
    await hooks.get('message_received')!({from:'sender-a',content:base.content,metadata:{messageId:'7',senderId:'sender-a'}},
      {channelId:'telegram',accountId:'account-a',conversationId:'chat-a',agentId:'agent-a'});
    expect(classify).toHaveBeenCalledTimes(2); expect(send).toHaveBeenCalledTimes(2);
  });
  it('cooldown suppresses second notification but pays both classifier calls', async () => {
    const {hooks}=await setup({cooldown:{enabled:true,maxMessages:12,windowMinutes:30,allowEscalation:true}});
    await hooks.get('message_inbound')!(base);
    await hooks.get('message_inbound')!({...base,messageId:'8'});
    expect(classify).toHaveBeenCalledTimes(2); expect(send).toHaveBeenCalledTimes(1);
  });
  it('marks failed classification seen, so redelivery does not retry it', async () => {
    classify.mockRejectedValueOnce(new Error('synthetic provider outage'));
    const {hooks}=await setup();
    await hooks.get('message_inbound')!(base); await hooks.get('message_inbound')!(base);
    expect(classify).toHaveBeenCalledTimes(1); expect(send).not.toHaveBeenCalled();
  });
  it('no subscriptions means no hook classifier call', async () => {
    const {hooks}=await setup({subscriptions:[]});
    await hooks.get('message_inbound')!(base); expect(classify).not.toHaveBeenCalled();
  });
  it('flow classify repeats even for identical empty input and accepts custom matching rules', async () => {
    const {methods}=await setup(); const fn=methods.get('alertWatcher.classify')!;
    const respond=vi.fn();
    const request={params:{input:'',config:{systemPrompt:'Match every request for opening hours.'}},respond};
    await fn(request); await fn(request);
    expect(classify).toHaveBeenCalledTimes(2);
    expect(classify.mock.calls[0][5]?.systemPrompt).toBe('Match every request for opening hours.');
  });
  it('typed negative envelope is accepted downstream without summary or send', async () => {
    const {methods}=await setup();
    const reply=JSON.stringify({v:1,original:'hola',match:false,severity:'low',category:'other',summary:''});
    const respond=vi.fn();
    for(const name of ['alertWatcher.gate','alertWatcher.suggest','alertWatcher.sendAlert']) await methods.get(name)!({params:{input:reply},respond});
    expect(classify).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });
});
