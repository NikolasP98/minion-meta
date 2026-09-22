# Table discovery and concurrent ownership

The table migration belongs to the concurrent Claude session. These are raw `<table` text matches in the scanned checkout, including strings/comments. They are neither a migration checklist nor confirmed defects. Re-run the scan after the cell-edit work lands.

| Source | Lines | Disposition |
|---|---|---|
| [minion_hub/src/lib/components/agents/AgentMemoryPanel.svelte](../../minion_hub/src/lib/components/agents/AgentMemoryPanel.svelte) | 304 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/lib/components/agents/PiAgentOrchestrations.svelte](../../minion_hub/src/lib/components/agents/PiAgentOrchestrations.svelte) | 121 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/lib/components/brains/BrainDocumentsTable.svelte](../../minion_hub/src/lib/components/brains/BrainDocumentsTable.svelte) | 83 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/lib/components/charts/Chart.svelte](../../minion_hub/src/lib/components/charts/Chart.svelte) | 386 | Shared renderer or specialized generated/accessibility surface; preserve unless semantic review proves otherwise |
| [minion_hub/src/lib/components/chat/MarkdownMessage.svelte](../../minion_hub/src/lib/components/chat/MarkdownMessage.svelte) | 78, 81 | Shared renderer or specialized generated/accessibility surface; preserve unless semantic review proves otherwise |
| [minion_hub/src/lib/components/crm/CrmMergeResolver.svelte](../../minion_hub/src/lib/components/crm/CrmMergeResolver.svelte) | 168 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/lib/components/data-table/DataTable.svelte](../../minion_hub/src/lib/components/data-table/DataTable.svelte) | 1349 | Shared renderer or specialized generated/accessibility surface; preserve unless semantic review proves otherwise |
| [minion_hub/src/lib/components/reliability/ActivityLogTable.svelte](../../minion_hub/src/lib/components/reliability/ActivityLogTable.svelte) | 566 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/lib/components/reliability/AgentActivityPanel.svelte](../../minion_hub/src/lib/components/reliability/AgentActivityPanel.svelte) | 457 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/lib/components/settings/BackupsTab.svelte](../../minion_hub/src/lib/components/settings/BackupsTab.svelte) | 417 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/lib/components/ui/Picker.svelte](../../minion_hub/src/lib/components/ui/Picker.svelte) | 622 | Shared renderer or specialized generated/accessibility surface; preserve unless semantic review proves otherwise |
| [minion_hub/src/lib/components/users/TeamTab.svelte](../../minion_hub/src/lib/components/users/TeamTab.svelte) | 271, 481, 545 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/lib/components/workshop/experiments/LeaderboardTab.svelte](../../minion_hub/src/lib/components/workshop/experiments/LeaderboardTab.svelte) | 39 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/finances/invoices/[id]/+page.svelte](../../minion_hub/src/routes/(app)/finances/invoices/[id]/+page.svelte) | 447, 480, 622 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/finances/purchases/+page.svelte](../../minion_hub/src/routes/(app)/finances/purchases/+page.svelte) | 141 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/reliability/+page.svelte](../../minion_hub/src/routes/(app)/reliability/+page.svelte) | 1307 | HTML tooltip string; not an interactive data-table migration |
| [minion_hub/src/routes/(app)/stock/+page.svelte](../../minion_hub/src/routes/(app)/stock/+page.svelte) | 152, 178 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/stock/commitments/+page.svelte](../../minion_hub/src/routes/(app)/stock/commitments/+page.svelte) | 59, 94 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/stock/entries/+page.svelte](../../minion_hub/src/routes/(app)/stock/entries/+page.svelte) | 180 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/stock/entries/[id]/+page.svelte](../../minion_hub/src/routes/(app)/stock/entries/[id]/+page.svelte) | 121 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/stock/entries/new/+page.svelte](../../minion_hub/src/routes/(app)/stock/entries/new/+page.svelte) | 463 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/stock/items/[id]/+page.svelte](../../minion_hub/src/routes/(app)/stock/items/[id]/+page.svelte) | 550, 577, 602 | Reserved for Claude; classify display, editor, comparison or matrix before migration |
| [minion_hub/src/routes/(app)/workforce/reliability/+page.svelte](../../minion_hub/src/routes/(app)/workforce/reliability/+page.svelte) | 120 | HTML tooltip string; not an interactive data-table migration |

Server email tables are excluded from this UI ledger. The broad inventory retains their matches for transparent counting. No table source was modified.
