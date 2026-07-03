import postgres from 'postgres';

const CHANNEL = 'hub_events';
const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

/** Exponential backoff starting at 1s, doubling, capped at 30s. */
export function nextBackoffMs(attempt: number): number {
  return Math.min(MIN_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
}

/** Parse a NOTIFY payload; never throws — bad payloads are logged and dropped. */
export function parseHubEventPayload(payload: string): unknown | undefined {
  try {
    return JSON.parse(payload);
  } catch (err) {
    console.error('[hub-events] failed to parse NOTIFY payload', payload, err);
    return undefined;
  }
}

/**
 * POST a parsed event to the hub's callback endpoint. Fire-and-forget: logs
 * failures but never retries — the cron tick is the durability fallback, and
 * the runner may redeliver the same event on reconnect so the handler must be
 * idempotent (that's the hub's responsibility, not this dispatcher's).
 */
export async function dispatchHubEvent(event: unknown): Promise<void> {
  const HUB_URL = process.env.HUB_URL ?? 'http://localhost:5173';
  const HUB_API_TOKEN = process.env.HUB_API_TOKEN ?? '';
  try {
    const res = await fetch(`${HUB_URL}/api/internal/events/handle`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(HUB_API_TOKEN ? { Authorization: `Bearer ${HUB_API_TOKEN}` } : {}),
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      console.error(`[hub-events] hub returned ${res.status} for event`, event);
    }
  } catch (err) {
    console.error('[hub-events] failed to reach hub', err);
  }
}

/** postgres.js NOTIFY callback: parse, dispatch, never throw (would kill the listener). */
function onEvent(payload: string): void {
  const event = parseHubEventPayload(payload);
  if (event === undefined) return;
  // hub:* flow triggers hook here
  void dispatchHubEvent(event);
}

/**
 * Starts the `hub_events` LISTEN connection against the DIRECT (session-mode,
 * port 5432) Postgres URL — LISTEN does not work through Supabase's
 * transaction-mode pooler (pgbouncer, 6543). No-ops with a warning if unset;
 * the runner is fully functional without the event bus, cron ticks remain the
 * fallback delivery path.
 *
 * postgres.js's dedicated listen connection already reconnects+backs off
 * internally once LISTEN is established; the retry loop here only covers the
 * outer connect/listen call itself failing (bad URL, auth, host down at
 * startup) so it doesn't wedge — same 1s→30s capped backoff, logged, forever.
 */
export function startHubEventListener(): void {
  const directUrl = process.env.SUPABASE_DB_DIRECT_URL?.trim();
  if (!directUrl) {
    console.warn('[hub-events] SUPABASE_DB_DIRECT_URL unset — event bus disabled, cron ticks are the fallback.');
    return;
  }

  let attempt = 0;

  const connect = (): void => {
    const sql = postgres(directUrl, { max: 1 });
    sql
      .listen(CHANNEL, onEvent, () => {
        const reconnected = attempt > 0;
        attempt = 0;
        console.log(`[hub-events] listening on "${CHANNEL}"${reconnected ? ' (reconnected)' : ''}`);
      })
      .catch((err) => {
        console.error('[hub-events] failed to establish listener', err);
        void sql.end({ timeout: 0 }).catch(() => {});
        const delay = nextBackoffMs(attempt++);
        console.log(`[hub-events] retrying in ${delay}ms`);
        setTimeout(connect, delay);
      });
  };

  connect();
}
