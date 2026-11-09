export interface Dedup {
  markSeen(id: string | undefined): boolean;
  /**
   * Fallback dedup key for events that don't carry a messageId (some
   * channel/event shapes drop it). Hashes channel+account+chat+content into
   * a stable per-message token so dual-hook firing on the same event can't
   * triple-process. Coarse timestamp bucket (10s) prevents accidental
   * collisions across legitimately-repeated messages.
   */
  markSeenFallback(parts: {
    channel: string;
    accountId: string;
    chatId: string;
    sender: string;
    content: string;
  }): boolean;
}

function hash(s: string): string {
  // FNV-1a 32-bit — good enough for in-process dedup. We're not defending
  // against adversaries, just absorbing dual-fire from the plugin hook system.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function createDedup(capacity: number): Dedup {
  const order: string[] = [];
  const set = new Set<string>();

  function trackToken(token: string): boolean {
    if (set.has(token)) return true;
    set.add(token);
    order.push(token);
    if (order.length > capacity) {
      const evict = order.shift();
      if (evict !== undefined) set.delete(evict);
    }
    return false;
  }

  return {
    markSeen(id: string | undefined): boolean {
      if (id === undefined) return false;
      return trackToken(`id:${id}`);
    },
    markSeenFallback(p): boolean {
      // 10s bucket — same channel+chat+sender+content within 10s = same event.
      const bucket = Math.floor(Date.now() / 10_000);
      const key = `fb:${p.channel}:${p.accountId}:${p.chatId}:${p.sender}:${hash(p.content)}:${bucket}`;
      return trackToken(key);
    },
  };
}
