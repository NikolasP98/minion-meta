# Phase 1 Data Model: Hub assistant JEV turn router — follow-up defects

No persisted schema changes. This feature touches three in-memory/wire shapes already defined
by the shipped router (`src/lib/assistant/turn-router.ts`, post hub #540) — extending two of
them, and adding one new tool-result shape.

## `RouteDecision` (existing type, unchanged shape)

```ts
interface RouteDecision {
  mode: RouteMode;
  probabilities: Partial<Record<RouteMode, number>>;
  manifests: Partial<Record<ManifestId, number>>;
  ms: number;
  cost: number;
}
```

No field changes. D3 changes what produces `manifests.brain` (the question text sent to the
classifier), not the decision's shape.

## Classifier input (extended)

**Before** (`buildState`, `assistant-router.service.ts:45-47`):

```ts
function buildState(text: string, locale: string | undefined): string
// → "ui_locale: <locale>\n\nREQUEST:\n<text>"
```

**After** (D7, FR-003):

```ts
function buildState(
  text: string,
  locale: string | undefined,
  priorMode?: RouteMode,
): string
// → "ui_locale: <locale>\n" + (priorMode ? `prior_mode: ${priorMode}\n` : '') + "\nREQUEST:\n<text>"
```

- `priorMode` is optional and absent on a session's first turn (FR-004) — no behavior change
  when absent.
- Carries only the mode label, never the prior turn's text (scope boundary, FR-011).
- Threaded through: `requestRouteDecision(text, locale, priorMode?)` (client,
  `turn-router.ts`) → `POST /api/assistant/route` body `{text, locale, priorMode?}` → `+server.ts`
  → `classifyAssistantTurn({text, locale, priorMode}, deps)` → `buildState`.

## `hub.pages` tool result (extended)

**Before** (`global-tools.ts`, `execute` for `hub.pages`):

```ts
{ pages: Array<{ path: string; title: string; description: string }> }
| { pages: []; note: string }
```

**After** (D5, FR-005):

```ts
{
  pages: Array<{
    path: string;
    title: string;
    description: string;
    /** true when this hit matched ONLY a `~`-prefixed keyword (a module that does
     *  not exist here — this page is merely the nearest one). Mirrors the
     *  "NO MODULE HERE for" distinction `describePages()` renders for the full
     *  list, so the anti-hallucination rule (briefing.ts rule 5) has evidence
     *  even when the `pages` manifest was withheld. */
    moduleMissing: boolean;
  }>;
}
| { pages: []; note: string }  // unchanged — no hits at all
```

- Backing data: `rankPages()` (`site-map.ts:148-171`) already computes a `weak` flag internally
  per matched token; this surfaces it per-page rather than discarding it in `searchPages()`.
- A page is `moduleMissing: true` only when **every** matched query token hit a `~`-keyword for
  that page and none hit a strong (non-`~`) keyword or the path/title/description — i.e. the
  same condition `describePages()` already uses to decide whether to print "NO MODULE HERE for"
  at all (`site-map.ts:220-226`).

## Rate-limit key (D8, FR-006)

Not a persisted entity — an in-memory key in the existing `checkRateLimit` map
(`src/server/auth/rate-limit.ts`), scoped as:

```
key = `assistant-route:${userId}`
limit = 20
windowMs = 60_000
```

The `assistant-route:` prefix keeps this endpoint's bucket independent of the password-login/
forgot-password buckets that already use the same shared `attempts` map with their own keys.

## Probe-set fixture (D10, new)

One new fixture file (exact path decided at task time, e.g.
`src/lib/assistant/jev-probe-fixtures.ts`), shape:

```ts
interface ProbeCase {
  id: string;            // e.g. "nav-en"
  locale: 'en' | 'es';
  request: string;       // the exact user text probed
  needed: ManifestId[];  // audit's judgement of what the agent must have
}
export const PROBE_CASES: readonly ProbeCase[]; // the 46 rows from B-jev-router.md
```

No relationships, no lifecycle — a static, versioned fixture. Changing it (adding/removing a
probe case) is itself a reviewable diff, which is the point: today the 46 cases exist only
inside a markdown report.
