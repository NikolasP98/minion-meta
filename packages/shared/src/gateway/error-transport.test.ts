import { afterEach, describe, expect, it, vi } from "vitest";
import { GatewayClient } from "./client.js";
import { GatewayError, canRetry } from "./errors.js";
import { sendRequest } from "./protocol.js";

class Transport {
  static OPEN = 1;
  readyState = 1;
  sent: string[] = [];
  listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  on(event: string, handler: (...args: unknown[]) => void) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), handler]);
  }
  send(value: string) {
    this.sent.push(value);
  }
  emit(event: string, value: unknown) {
    for (const handler of this.listeners.get(event) ?? []) handler(value);
  }
  close() {
    this.readyState = 3;
    this.emit("close", 1000);
  }
}

async function connected() {
  const socket = new Transport();
  const client = new GatewayClient({
    url: "ws://fixture.invalid",
    WebSocketImpl: function FixtureTransport() {
      return socket;
    },
    onChallenge: async () => ({ minProtocol: 3, maxProtocol: 3 }),
  });
  const ready = client.connect();
  socket.emit(
    "message",
    JSON.stringify({
      type: "event",
      event: "connect.challenge",
      payload: { nonce: "fixture" },
    }),
  );
  await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
  const request = JSON.parse(socket.sent[0]!);
  socket.emit(
    "message",
    JSON.stringify({
      type: "res",
      id: request.id,
      ok: true,
      payload: { type: "hello-ok", protocol: 3 },
    }),
  );
  await ready;
  socket.sent.length = 0;
  return { socket, client };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("transport evidence for write recovery", () => {
  it("distinguishes no connection from dispatched uncertainty", async () => {
    const client = new GatewayClient({
      url: "ws://fixture.invalid",
      onChallenge: async () => ({}),
    });
    const error = await client
      .request("write")
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GatewayError);
    expect(error).toMatchObject({
      source: "client",
      code: "NOT_CONNECTED",
      dispatch: "not-sent",
    });
    expect(canRetry(error, { idempotent: false })).toBe(true);
  });

  it("does not authorize write replay when send accepted the frame before throwing", async () => {
    const { socket, client } = await connected();
    socket.send = (value) => {
      socket.sent.push(value);
      throw new Error("after accepting");
    };
    const error = await client
      .request("write")
      .catch((value: unknown) => value);
    expect(socket.sent).toHaveLength(1);
    expect(error).toMatchObject({
      source: "client",
      code: "SEND_FAILED",
      dispatch: "unknown",
    });
    expect(canRetry(error, { idempotent: false })).toBe(false);
    socket.send = (value) => {
      socket.sent.push(value);
    };
    const read = client.request("read");
    const request = JSON.parse(socket.sent.at(-1)!);
    socket.emit(
      "message",
      JSON.stringify({
        type: "res",
        id: request.id,
        ok: true,
        payload: "recovered",
      }),
    );
    await expect(read).resolves.toBe("recovered");
    client.close();
  });

  it.each(["CONFLICT", "METHOD_NOT_FOUND", "INVALID_REQUEST"])(
    "preserves server %s without parsing its message",
    async (code) => {
      const { socket, client } = await connected();
      const request = client.request("write").catch((value: unknown) => value);
      const sent = JSON.parse(socket.sent[0]!);
      socket.emit(
        "message",
        JSON.stringify({
          type: "res",
          id: sent.id,
          ok: false,
          error: {
            code,
            message: "opaque localized text",
            details: { revision: "a" },
          },
        }),
      );
      const error = await request;
      expect(error).toBeInstanceOf(GatewayError);
      expect(error).toMatchObject({
        source: "server",
        code,
        dispatch: "responded",
        details: { revision: "a" },
      });
      expect(canRetry(error, { idempotent: false })).toBe(false);
      client.close();
    },
  );

  it("rejects unserializable input before calling the transport", async () => {
    const { socket, client } = await connected();
    await expect(client.request("write", { amount: 1n })).rejects.toMatchObject(
      { code: "INVALID_REQUEST", dispatch: "not-sent" },
    );
    expect(socket.sent).toEqual([]);
    client.close();
  });

  it("preserves unknown outcome after deadline or disconnect", async () => {
    const { socket, client } = await connected();
    vi.useFakeTimers();
    const timed = client
      .request("write", {}, { timeoutMs: 10 })
      .catch((value: unknown) => value);
    await vi.advanceTimersByTimeAsync(11);
    expect(await timed).toMatchObject({ code: "TIMEOUT", dispatch: "unknown" });
    const disconnected = client
      .request("write")
      .catch((value: unknown) => value);
    socket.close();
    expect(await disconnected).toMatchObject({
      code: "DISCONNECTED",
      dispatch: "unknown",
    });
    expect(socket.sent).toHaveLength(2);
  });

  it("applies the same serialization and send boundaries to the lower-level helper", async () => {
    vi.stubGlobal("WebSocket", Transport);
    const socket = new Transport();
    const pending = new Map();
    await expect(
      sendRequest(socket as unknown as WebSocket, pending, "write", 1n),
    ).rejects.toMatchObject({ dispatch: "not-sent", code: "INVALID_REQUEST" });
    expect(socket.sent).toHaveLength(0);
    socket.send = (value) => {
      socket.sent.push(value);
      throw new Error("accepted");
    };
    const error = await sendRequest(
      socket as unknown as WebSocket,
      pending,
      "write",
    ).catch((value: unknown) => value);
    expect(error).toMatchObject({ dispatch: "unknown", code: "SEND_FAILED" });
    expect(pending.size).toBe(0);
    expect(socket.sent).toHaveLength(1);
    expect(canRetry(error, { idempotent: false })).toBe(false);
  });
});
