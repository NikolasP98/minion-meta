# Contract: `bun run a11y`

## Invocation

```
bun run a11y [--all | --only <gates>] [--ci] [--update-baseline]
             [--stories <file filter>] [--routes <a,b>] [--artifacts <dir>] [--verbose]
```

| Flag | Meaning |
|---|---|
| (none) | gates `suppressions, patterns, specs, stories` (no backend needed) |
| `--all` | also `pages` (runs the page sweep; needs the QA stack) |
| `--only a,b` | exactly these gates |
| `--ci` | a fallen count does not fail; the sweep never starts a server (`E2E_BASE_URL` required) |
| `--update-baseline` | rewrite the baselines for what this run measured; refused for a gate that regressed |
| `--stories <filter>` | story-file name filter |
| `--routes <a,b>` | page subset |
| `--artifacts <dir>` | judge `run-sweep--*.json` files from that directory instead of sweeping |
| `--verbose` | stdout carries every row |

Exit code: 0 all selected gates pass; 1 a gate failed or errored; 2 bad usage or crash.

## Output

stdout: exactly one JSON document. stderr: progress and child output. File: `test-results/a11y/report.json` (every row).

```ts
interface A11yReport {
  schemaVersion: 1;
  command: string;
  ok: boolean;
  tags: string[];
  gates: {
    suppressions: Skipped | { status: Status; count: number; baseline: number | null;
                              regressions: { file: string; rule: 'a11y-ignore'; before: number; now: number }[] };
    patterns: Skipped | { status: Status; files: number; tests: number;
                          failures: { file: string; test: string; message: string }[] };
    specs: Skipped | { status: Status;
                       suites: { name: string; status: Status; passed?: number; failures: string[] }[] };
    stories: Skipped | LedgerGate & { unmeasured: { id: string; message: string }[]; coldCacheRerun: boolean };
    pages: Skipped | LedgerGate & { scenarios: string[]; sweepExit: number };
  };
  rows: Row[];           // stdout: rows with status !== 'same' unless --verbose
  rowsOmitted?: number;  // stdout only
  report?: string;       // stdout only: path of the full report
}
type Status = 'pass' | 'fail' | 'error';
type Skipped = { status: 'skipped' };
interface LedgerGate {
  status: Status; hint?: string; message?: string;
  measured: number;      // ids measured in this run
  violations: number;    // elements counted in this run
  baseline: number;      // their baseline
  regressions: number; improvements: number;
}
interface Row {
  kind: 'page' | 'story';
  id: string;            // story id, or "<route pattern> @ <viewport>:<pointer>"
  rule: string;          // axe rule id, or "(unmeasured)"
  count: number; baseline: number;
  status: 'regression' | 'improvement' | 'same' | 'ungated';
  offenders?: string[];  // up to 5 selectors
}
```

## `assertPattern`

```ts
type Pattern = 'listbox' | 'menu' | 'tabs' | 'dialog' | 'alertdialog' | 'combobox' | 'grid';
function assertPattern(root: Element, pattern: Pattern, options?: PatternOptions): Promise<void>; // throws
function checkPattern(root: Element, pattern: Pattern, options?: PatternOptions): Promise<PatternProblem[]>;
interface PatternOptions {
  orientation?: 'vertical' | 'horizontal';
  opener?: HTMLElement | null;
  typeahead?: boolean;
  skip?: readonly string[];
  press?: (key: string) => void | Promise<void>;
}
interface PatternProblem { rule: string; expected: string; element: string }
```

Error message: `assertPattern(<pattern>): <n> problem(s)` followed by one line per problem, `  - [<rule>] <expected> — got <element>`.
