# Contract — block grammar additions (`src/lib/sandbox/blocks/schema.ts`)
```ts
filter:  { v:1, type:'filter', var, control:'date_range'|'select'|'multi_select', options?:{dataset,col,label?}, default?: PageValue }
listens: Array<{ var: string; col: string }>   // optional on kpi|chart|table|list; max 6; unique var
```
Tool JSON Schemas stay derived from this single zod definition (`blockToolSchemas()`), so tools, MCP and server validation cannot drift.
