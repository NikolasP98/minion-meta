# Async and motion source index

Every scanned client file is listed below; zero signals does not prove synchronous behavior. Counts are lexical signals, including comments. This snapshot is not measured latency or exhaustive runtime coverage. See the spec catalogue for policy and manual evidence.

| Source | Domain | Signals and line anchors |
|---|---|---|
| [minion_hub/src/lib/access/can.svelte.ts](../../minion_hub/src/lib/access/can.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/access/policy.ts](../../minion_hub/src/lib/access/policy.ts) | shared | No lexical signal |
| [minion_hub/src/lib/access/super-views.ts](../../minion_hub/src/lib/access/super-views.ts) | shared | No lexical signal |
| [minion_hub/src/lib/actions/autosize.ts](../../minion_hub/src/lib/actions/autosize.ts) | shared | No lexical signal |
| [minion_hub/src/lib/actions/holo.ts](../../minion_hub/src/lib/actions/holo.ts) | shared | No lexical signal |
| [minion_hub/src/lib/actions/persist-scroll.ts](../../minion_hub/src/lib/actions/persist-scroll.ts) | shared | imperative-motion: 18, 27 |
| [minion_hub/src/lib/actions/portal.ts](../../minion_hub/src/lib/actions/portal.ts) | shared | No lexical signal |
| [minion_hub/src/lib/ads/metric-labels.ts](../../minion_hub/src/lib/ads/metric-labels.ts) | shared | save-gesture: 17 |
| [minion_hub/src/lib/agents/artifacts.ts](../../minion_hub/src/lib/agents/artifacts.ts) | shared | No lexical signal |
| [minion_hub/src/lib/agents/autonomous.ts](../../minion_hub/src/lib/agents/autonomous.ts) | shared | No lexical signal |
| [minion_hub/src/lib/animations.ts](../../minion_hub/src/lib/animations.ts) | shared | svelte-motion: 9, 74, 94, 113, 131, 150, 163, 183; css-motion: 9, 74, 94, 113, 131, 150, 163, 183 |
| [minion_hub/src/lib/api/fetch-json.ts](../../minion_hub/src/lib/api/fetch-json.ts) | shared | async-function: 41, 49; network: 49, 52 |
| [minion_hub/src/lib/api/json-mutation.ts](../../minion_hub/src/lib/api/json-mutation.ts) | shared | async-function: 14; network: 14, 19; optimistic: 12 |
| [minion_hub/src/lib/assistant/briefing.ts](../../minion_hub/src/lib/assistant/briefing.ts) | shared | No lexical signal |
| [minion_hub/src/lib/assistant/catalog.ts](../../minion_hub/src/lib/assistant/catalog.ts) | shared | save-gesture: 124 |
| [minion_hub/src/lib/assistant/dispatch.ts](../../minion_hub/src/lib/assistant/dispatch.ts) | shared | async-function: 18 |
| [minion_hub/src/lib/assistant/forms.ts](../../minion_hub/src/lib/assistant/forms.ts) | shared | async-function: 102 |
| [minion_hub/src/lib/assistant/fuzzy.ts](../../minion_hub/src/lib/assistant/fuzzy.ts) | shared | No lexical signal |
| [minion_hub/src/lib/assistant/global-tools.ts](../../minion_hub/src/lib/assistant/global-tools.ts) | shared | async-function: 38, 114 |
| [minion_hub/src/lib/assistant/guide.svelte.ts](../../minion_hub/src/lib/assistant/guide.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/assistant/model-context.ts](../../minion_hub/src/lib/assistant/model-context.ts) | shared | async-function: 60, 104 |
| [minion_hub/src/lib/assistant/runner.ts](../../minion_hub/src/lib/assistant/runner.ts) | shared | async-function: 47 |
| [minion_hub/src/lib/assistant/site-map.ts](../../minion_hub/src/lib/assistant/site-map.ts) | shared | No lexical signal |
| [minion_hub/src/lib/assistant/ui-blocks.ts](../../minion_hub/src/lib/assistant/ui-blocks.ts) | shared | No lexical signal |
| [minion_hub/src/lib/assistant/use-cases.ts](../../minion_hub/src/lib/assistant/use-cases.ts) | shared | No lexical signal |
| [minion_hub/src/lib/attachments/limits.ts](../../minion_hub/src/lib/attachments/limits.ts) | shared | No lexical signal |
| [minion_hub/src/lib/attachments/preview-mode.svelte.ts](../../minion_hub/src/lib/attachments/preview-mode.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/attachments/upload.ts](../../minion_hub/src/lib/attachments/upload.ts) | shared | async-function: 95, 148, 171, 189, 200, 205, 214, 224, 234; network: 95, 109, 130, 136, 159, 176, 194, 201, 206, 215, 225, 235; mutation-method: 110, 130, 137, 160, 207, 216, 226, 235 |
| [minion_hub/src/lib/automations/system-automations.ts](../../minion_hub/src/lib/automations/system-automations.ts) | shared | No lexical signal |
| [minion_hub/src/lib/brains/brain-search-state.ts](../../minion_hub/src/lib/brains/brain-search-state.ts) | shared | No lexical signal |
| [minion_hub/src/lib/brains/enrichment-config.ts](../../minion_hub/src/lib/brains/enrichment-config.ts) | shared | No lexical signal |
| [minion_hub/src/lib/canonical-path.ts](../../minion_hub/src/lib/canonical-path.ts) | shared | No lexical signal |
| [minion_hub/src/lib/catalog/code.ts](../../minion_hub/src/lib/catalog/code.ts) | shared | No lexical signal |
| [minion_hub/src/lib/catalog/grouping.ts](../../minion_hub/src/lib/catalog/grouping.ts) | shared | No lexical signal |
| [minion_hub/src/lib/catalog/taxonomy.ts](../../minion_hub/src/lib/catalog/taxonomy.ts) | shared | No lexical signal |
| [minion_hub/src/lib/chat/ChatBlocks.svelte](../../minion_hub/src/lib/chat/ChatBlocks.svelte) | shared | svelte-motion: 371, 509; css-motion: 371, 406, 408, 446, 448, 509; pending-feedback: 205 |
| [minion_hub/src/lib/chat/blocks.ts](../../minion_hub/src/lib/chat/blocks.ts) | shared | No lexical signal |
| [minion_hub/src/lib/chat/chat-suggest.ts](../../minion_hub/src/lib/chat/chat-suggest.ts) | shared | No lexical signal |
| [minion_hub/src/lib/chat/response-tree.ts](../../minion_hub/src/lib/chat/response-tree.ts) | shared | No lexical signal |
| [minion_hub/src/lib/components/LiveIndicator.svelte](../../minion_hub/src/lib/components/LiveIndicator.svelte) | shared | No lexical signal |
| [minion_hub/src/lib/components/Sparkline.svelte](../../minion_hub/src/lib/components/Sparkline.svelte) | shared | No lexical signal |
| [minion_hub/src/lib/components/ads/AdsNav.svelte](../../minion_hub/src/lib/components/ads/AdsNav.svelte) | ads | No lexical signal |
| [minion_hub/src/lib/components/agents/AgentCapabilitiesPanel.svelte](../../minion_hub/src/lib/components/agents/AgentCapabilitiesPanel.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/AgentDashboard.svelte](../../minion_hub/src/lib/components/agents/AgentDashboard.svelte) | agents | async-function: 23 |
| [minion_hub/src/lib/components/agents/AgentDetail.svelte](../../minion_hub/src/lib/components/agents/AgentDetail.svelte) | agents | css-motion: 136 |
| [minion_hub/src/lib/components/agents/AgentFiles.svelte](../../minion_hub/src/lib/components/agents/AgentFiles.svelte) | agents | async-function: 98, 125, 153, 169, 200; save-gesture: 256; pending-feedback: 50, 99, 121, 129, 149, 202, 215 |
| [minion_hub/src/lib/components/agents/AgentGroupHeader.svelte](../../minion_hub/src/lib/components/agents/AgentGroupHeader.svelte) | agents | imperative-motion: 36 |
| [minion_hub/src/lib/components/agents/AgentHealthMetrics.svelte](../../minion_hub/src/lib/components/agents/AgentHealthMetrics.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/AgentMemoryPanel.svelte](../../minion_hub/src/lib/components/agents/AgentMemoryPanel.svelte) | agents | async-function: 75, 80, 112, 130; network: 76, 81, 136; mutation-method: 137; pending-feedback: 102 |
| [minion_hub/src/lib/components/agents/AgentPromptSimulator.svelte](../../minion_hub/src/lib/components/agents/AgentPromptSimulator.svelte) | agents | async-function: 92, 278, 288, 311, 352, 362, 379; save-gesture: 696; optimistic: 378; css-motion: 704, 706; pending-feedback: 58, 191, 312, 348 |
| [minion_hub/src/lib/components/agents/AgentRow.svelte](../../minion_hub/src/lib/components/agents/AgentRow.svelte) | agents | async-function: 104; svelte-motion: 2 |
| [minion_hub/src/lib/components/agents/AgentSettingsNav.svelte](../../minion_hub/src/lib/components/agents/AgentSettingsNav.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/AgentSettingsPanel.svelte](../../minion_hub/src/lib/components/agents/AgentSettingsPanel.svelte) | agents | save-gesture: 501, 513, 527 |
| [minion_hub/src/lib/components/agents/AgentSidebar.svelte](../../minion_hub/src/lib/components/agents/AgentSidebar.svelte) | agents | imperative-motion: 158; pending-feedback: 265, 267, 268 |
| [minion_hub/src/lib/components/agents/AgentSkillsPanel.svelte](../../minion_hub/src/lib/components/agents/AgentSkillsPanel.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/AgentToolsPanel.svelte](../../minion_hub/src/lib/components/agents/AgentToolsPanel.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/AgentWindowLayer.svelte](../../minion_hub/src/lib/components/agents/AgentWindowLayer.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/AutonomousAgentCard.svelte](../../minion_hub/src/lib/components/agents/AutonomousAgentCard.svelte) | agents | async-function: 116, 138, 155; network: 117; mutation-method: 117; refresh: 118, 126, 140, 156; pending-feedback: 57 |
| [minion_hub/src/lib/components/agents/DreamActivity.svelte](../../minion_hub/src/lib/components/agents/DreamActivity.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/PiAgentControls.svelte](../../minion_hub/src/lib/components/agents/PiAgentControls.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/PiAgentOrchestrations.svelte](../../minion_hub/src/lib/components/agents/PiAgentOrchestrations.svelte) | agents | async-function: 42 |
| [minion_hub/src/lib/components/agents/PiAgentTab.svelte](../../minion_hub/src/lib/components/agents/PiAgentTab.svelte) | agents | poll-or-debounce: 29 |
| [minion_hub/src/lib/components/agents/PiAgentTemplates.svelte](../../minion_hub/src/lib/components/agents/PiAgentTemplates.svelte) | agents | async-function: 21 |
| [minion_hub/src/lib/components/agents/SectionProseEditor.svelte](../../minion_hub/src/lib/components/agents/SectionProseEditor.svelte) | agents | async-function: 60, 123, 176; save-gesture: 30, 41, 201, 516; pending-feedback: 101, 102, 124, 172, 179, 224 |
| [minion_hub/src/lib/components/agents/StatusBadge.svelte](../../minion_hub/src/lib/components/agents/StatusBadge.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/SubagentCard.svelte](../../minion_hub/src/lib/components/agents/SubagentCard.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/SubagentDetail.svelte](../../minion_hub/src/lib/components/agents/SubagentDetail.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/SubagentEmptyState.svelte](../../minion_hub/src/lib/components/agents/SubagentEmptyState.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/SubagentList.svelte](../../minion_hub/src/lib/components/agents/SubagentList.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/SubagentMeta.svelte](../../minion_hub/src/lib/components/agents/SubagentMeta.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/SubagentTimeline.svelte](../../minion_hub/src/lib/components/agents/SubagentTimeline.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/SubagentTree.svelte](../../minion_hub/src/lib/components/agents/SubagentTree.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/SubagentTreeNode.svelte](../../minion_hub/src/lib/components/agents/SubagentTreeNode.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/ViewSwitcher.svelte](../../minion_hub/src/lib/components/agents/ViewSwitcher.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/_agent-prompt-simulator/ClassicDetail.svelte](../../minion_hub/src/lib/components/agents/_agent-prompt-simulator/ClassicDetail.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/_agent-prompt-simulator/ContextWindowBar.svelte](../../minion_hub/src/lib/components/agents/_agent-prompt-simulator/ContextWindowBar.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/_agent-prompt-simulator/PipelineSidebar.svelte](../../minion_hub/src/lib/components/agents/_agent-prompt-simulator/PipelineSidebar.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/_agent-prompt-simulator/SectionDetail.svelte](../../minion_hub/src/lib/components/agents/_agent-prompt-simulator/SectionDetail.svelte) | agents | No lexical signal |
| [minion_hub/src/lib/components/agents/_agent-prompt-simulator/types.ts](../../minion_hub/src/lib/components/agents/_agent-prompt-simulator/types.ts) | agents | No lexical signal |
| [minion_hub/src/lib/components/artifacts/ArtifactCreateModal.svelte](../../minion_hub/src/lib/components/artifacts/ArtifactCreateModal.svelte) | artifacts | async-function: 52, 83; network: 57, 89; mutation-method: 58, 90; save-gesture: 240, 251; pending-feedback: 26, 47, 54, 79, 237 |
| [minion_hub/src/lib/components/artifacts/ArtifactGallery.svelte](../../minion_hub/src/lib/components/artifacts/ArtifactGallery.svelte) | artifacts | No lexical signal |
| [minion_hub/src/lib/components/artifacts/ArtifactHistory.svelte](../../minion_hub/src/lib/components/artifacts/ArtifactHistory.svelte) | artifacts | async-function: 27, 44; network: 31, 49; mutation-method: 50; pending-feedback: 23, 28, 40, 98, 130 |
| [minion_hub/src/lib/components/artifacts/ArtifactHost.svelte](../../minion_hub/src/lib/components/artifacts/ArtifactHost.svelte) | artifacts | async-function: 55; network: 58; pending-feedback: 99 |
| [minion_hub/src/lib/components/artifacts/ArtifactRegenerateModal.svelte](../../minion_hub/src/lib/components/artifacts/ArtifactRegenerateModal.svelte) | artifacts | async-function: 37; network: 43; mutation-method: 44; pending-feedback: 104 |
| [minion_hub/src/lib/components/artifacts/read-build-stream.ts](../../minion_hub/src/lib/components/artifacts/read-build-stream.ts) | artifacts | async-function: 10 |
| [minion_hub/src/lib/components/assistant/AssistChoice.svelte](../../minion_hub/src/lib/components/assistant/AssistChoice.svelte) | assistant | No lexical signal |
| [minion_hub/src/lib/components/assistant/AssistGuide.svelte](../../minion_hub/src/lib/components/assistant/AssistGuide.svelte) | assistant | svelte-motion: 244; css-motion: 244; poll-or-debounce: 125 |
| [minion_hub/src/lib/components/attachments/AttachmentButton.svelte](../../minion_hub/src/lib/components/attachments/AttachmentButton.svelte) | attachments | async-function: 70; network: 96 |
| [minion_hub/src/lib/components/attachments/AttachmentList.svelte](../../minion_hub/src/lib/components/attachments/AttachmentList.svelte) | attachments | async-function: 61, 89, 99, 109, 123; refresh: 25 |
| [minion_hub/src/lib/components/attachments/AttachmentPreviewSwitch.svelte](../../minion_hub/src/lib/components/attachments/AttachmentPreviewSwitch.svelte) | attachments | No lexical signal |
| [minion_hub/src/lib/components/attachments/AttachmentTile.svelte](../../minion_hub/src/lib/components/attachments/AttachmentTile.svelte) | attachments | async-function: 63; svelte-motion: 221; css-motion: 221; pending-feedback: 89 |
| [minion_hub/src/lib/components/attachments/index.ts](../../minion_hub/src/lib/components/attachments/index.ts) | attachments | No lexical signal |
| [minion_hub/src/lib/components/brains/AddSourceDialog.svelte](../../minion_hub/src/lib/components/brains/AddSourceDialog.svelte) | brains | async-function: 74, 98, 106, 114, 125, 159; network: 78, 164; mutation-method: 79; refresh: 88; save-gesture: 323, 327, 337; svelte-motion: 358; css-motion: 358; pending-feedback: 34, 75, 94, 322, 326, 334 |
| [minion_hub/src/lib/components/brains/BrainAccessPanel.svelte](../../minion_hub/src/lib/components/brains/BrainAccessPanel.svelte) | brains | async-function: 38, 60; network: 41, 67; mutation-method: 42, 68; refresh: 46, 77; save-gesture: 165; pending-feedback: 165 |
| [minion_hub/src/lib/components/brains/BrainAgentPanel.svelte](../../minion_hub/src/lib/components/brains/BrainAgentPanel.svelte) | brains | async-function: 13, 29; network: 17, 34; mutation-method: 17, 34; refresh: 23, 40; pending-feedback: 10, 14, 25, 31, 42, 80, 82 |
| [minion_hub/src/lib/components/brains/BrainCard.svelte](../../minion_hub/src/lib/components/brains/BrainCard.svelte) | brains | pending-feedback: 18 |
| [minion_hub/src/lib/components/brains/BrainCreateDialog.svelte](../../minion_hub/src/lib/components/brains/BrainCreateDialog.svelte) | brains | async-function: 27; network: 32; mutation-method: 33; refresh: 42; save-gesture: 107; pending-feedback: 15, 29, 49, 104 |
| [minion_hub/src/lib/components/brains/BrainDocumentsTable.svelte](../../minion_hub/src/lib/components/brains/BrainDocumentsTable.svelte) | brains | async-function: 40, 54; network: 43, 58; mutation-method: 44, 59; refresh: 46, 61 |
| [minion_hub/src/lib/components/brains/BrainKnowledgeCard.svelte](../../minion_hub/src/lib/components/brains/BrainKnowledgeCard.svelte) | brains | pending-feedback: 33 |
| [minion_hub/src/lib/components/brains/BrainKnowledgeSources.svelte](../../minion_hub/src/lib/components/brains/BrainKnowledgeSources.svelte) | brains | async-function: 68; network: 73; refresh: 76; pending-feedback: 184 |
| [minion_hub/src/lib/components/brains/BrainOverviewPanel.svelte](../../minion_hub/src/lib/components/brains/BrainOverviewPanel.svelte) | brains | No lexical signal |
| [minion_hub/src/lib/components/brains/BrainSearchPanel.svelte](../../minion_hub/src/lib/components/brains/BrainSearchPanel.svelte) | brains | async-function: 123; network: 133; mutation-method: 134; save-gesture: 178, 194, 200; pending-feedback: 198 |
| [minion_hub/src/lib/components/brains/BrainsNav.svelte](../../minion_hub/src/lib/components/brains/BrainsNav.svelte) | brains | No lexical signal |
| [minion_hub/src/lib/components/builder/AgentCreateWizard.svelte](../../minion_hub/src/lib/components/builder/AgentCreateWizard.svelte) | builder | async-function: 173; network: 111, 178, 191, 204; mutation-method: 179, 192, 204; svelte-motion: 425, 465, 484, 502, 578; css-motion: 425, 465, 484, 502, 578, 606, 609 |
| [minion_hub/src/lib/components/builder/AgentRegistry.svelte](../../minion_hub/src/lib/components/builder/AgentRegistry.svelte) | builder | svelte-motion: 289, 398, 486; css-motion: 289, 398, 436, 444, 486 |
| [minion_hub/src/lib/components/builder/BuilderHub.svelte](../../minion_hub/src/lib/components/builder/BuilderHub.svelte) | builder | async-function: 56, 91, 214, 224; network: 96, 231; mutation-method: 96, 232; svelte-motion: 408; css-motion: 408, 427, 435 |
| [minion_hub/src/lib/components/builder/ChapterDAG.svelte](../../minion_hub/src/lib/components/builder/ChapterDAG.svelte) | builder | svelte-motion: 403, 425, 508, 558; css-motion: 403, 425, 467, 470, 508, 558 |
| [minion_hub/src/lib/components/builder/ChapterEditor.svelte](../../minion_hub/src/lib/components/builder/ChapterEditor.svelte) | builder | async-function: 66, 172; network: 69, 177; mutation-method: 70, 178; save-gesture: 21, 39, 255, 356; svelte-motion: 411, 429, 459, 497, 521; css-motion: 369, 372, 411, 429, 459, 497, 521, 533, 535; pending-feedback: 291 |
| [minion_hub/src/lib/components/builder/ConditionNode.svelte](../../minion_hub/src/lib/components/builder/ConditionNode.svelte) | builder | No lexical signal |
| [minion_hub/src/lib/components/builder/DryRunPanel.svelte](../../minion_hub/src/lib/components/builder/DryRunPanel.svelte) | builder | svelte-motion: 255, 288, 310, 331, 397; css-motion: 255, 288, 310, 331, 397, 525, 527 |
| [minion_hub/src/lib/components/builder/EmojiPicker.svelte](../../minion_hub/src/lib/components/builder/EmojiPicker.svelte) | builder | svelte-motion: 59, 138; css-motion: 59, 138 |
| [minion_hub/src/lib/components/builder/McpPanel.svelte](../../minion_hub/src/lib/components/builder/McpPanel.svelte) | builder | async-function: 29; css-motion: 158, 164; pending-feedback: 17, 31, 39 |
| [minion_hub/src/lib/components/builder/SkillCreateWizard.svelte](../../minion_hub/src/lib/components/builder/SkillCreateWizard.svelte) | builder | async-function: 23; network: 28; mutation-method: 29; svelte-motion: 159, 187, 202, 231; css-motion: 159, 187, 202, 231, 250, 252 |
| [minion_hub/src/lib/components/builder/ValidationPanel.svelte](../../minion_hub/src/lib/components/builder/ValidationPanel.svelte) | builder | svelte-motion: 154, 206, 271; css-motion: 154, 206, 271 |
| [minion_hub/src/lib/components/builder/_agent-create-wizard/CursorTooltip.svelte](../../minion_hub/src/lib/components/builder/_agent-create-wizard/CursorTooltip.svelte) | builder | svelte-motion: 45; css-motion: 44, 45, 48 |
| [minion_hub/src/lib/components/builder/_agent-create-wizard/Step0Identity.svelte](../../minion_hub/src/lib/components/builder/_agent-create-wizard/Step0Identity.svelte) | builder | svelte-motion: 108; css-motion: 108 |
| [minion_hub/src/lib/components/builder/_agent-create-wizard/Step1SkillsTools.svelte](../../minion_hub/src/lib/components/builder/_agent-create-wizard/Step1SkillsTools.svelte) | builder | svelte-motion: 201; css-motion: 201 |
| [minion_hub/src/lib/components/builder/_builder-hub/AgentsGrid.svelte](../../minion_hub/src/lib/components/builder/_builder-hub/AgentsGrid.svelte) | builder | svelte-motion: 51, 158; css-motion: 51, 158 |
| [minion_hub/src/lib/components/builder/_builder-hub/DeleteConfirmModal.svelte](../../minion_hub/src/lib/components/builder/_builder-hub/DeleteConfirmModal.svelte) | builder | svelte-motion: 75; css-motion: 75 |
| [minion_hub/src/lib/components/builder/_builder-hub/EmptyCard.svelte](../../minion_hub/src/lib/components/builder/_builder-hub/EmptyCard.svelte) | builder | svelte-motion: 44; css-motion: 44 |
| [minion_hub/src/lib/components/builder/_builder-hub/RegistryAgentSheet.svelte](../../minion_hub/src/lib/components/builder/_builder-hub/RegistryAgentSheet.svelte) | builder | async-function: 15; network: 16; mutation-method: 17; svelte-motion: 229; css-motion: 229 |
| [minion_hub/src/lib/components/builder/_builder-hub/SkillsGrid.svelte](../../minion_hub/src/lib/components/builder/_builder-hub/SkillsGrid.svelte) | builder | svelte-motion: 48, 146; css-motion: 48, 146 |
| [minion_hub/src/lib/components/builder/_builder-hub/TabBar.svelte](../../minion_hub/src/lib/components/builder/_builder-hub/TabBar.svelte) | builder | svelte-motion: 64; css-motion: 64 |
| [minion_hub/src/lib/components/builder/_builder-hub/ToolsGrid.svelte](../../minion_hub/src/lib/components/builder/_builder-hub/ToolsGrid.svelte) | builder | svelte-motion: 121, 307; css-motion: 121, 307 |
| [minion_hub/src/lib/components/builder/_builder-hub/utils.ts](../../minion_hub/src/lib/components/builder/_builder-hub/utils.ts) | builder | No lexical signal |
| [minion_hub/src/lib/components/builder/_chapter-editor/AdvancedFields.svelte](../../minion_hub/src/lib/components/builder/_chapter-editor/AdvancedFields.svelte) | builder | svelte-motion: 144; css-motion: 144; pending-feedback: 54, 70, 86 |
| [minion_hub/src/lib/components/builder/_chapter-editor/AiWandButton.svelte](../../minion_hub/src/lib/components/builder/_chapter-editor/AiWandButton.svelte) | builder | No lexical signal |
| [minion_hub/src/lib/components/builder/_chapter-editor/ConflictBox.svelte](../../minion_hub/src/lib/components/builder/_chapter-editor/ConflictBox.svelte) | builder | svelte-motion: 61; css-motion: 61 |
| [minion_hub/src/lib/components/builder/_chapter-editor/DrawerFooter.svelte](../../minion_hub/src/lib/components/builder/_chapter-editor/DrawerFooter.svelte) | builder | save-gesture: 9, 12, 17, 19; svelte-motion: 45; css-motion: 45 |
| [minion_hub/src/lib/components/builder/_chapter-editor/DrawerHeader.svelte](../../minion_hub/src/lib/components/builder/_chapter-editor/DrawerHeader.svelte) | builder | svelte-motion: 67; css-motion: 67 |
| [minion_hub/src/lib/components/builder/_chapter-editor/ToolsPanel.svelte](../../minion_hub/src/lib/components/builder/_chapter-editor/ToolsPanel.svelte) | builder | svelte-motion: 88; css-motion: 88 |
| [minion_hub/src/lib/components/builder/_chapter-editor/types.ts](../../minion_hub/src/lib/components/builder/_chapter-editor/types.ts) | builder | No lexical signal |
| [minion_hub/src/lib/components/channels/ChannelAssignmentPicker.svelte](../../minion_hub/src/lib/components/channels/ChannelAssignmentPicker.svelte) | channels | async-function: 22, 38, 52; save-gesture: 97, 110; pending-feedback: 16, 23, 30, 113 |
| [minion_hub/src/lib/components/channels/ChannelBrandIcon.svelte](../../minion_hub/src/lib/components/channels/ChannelBrandIcon.svelte) | channels | No lexical signal |
| [minion_hub/src/lib/components/channels/ChannelCard.svelte](../../minion_hub/src/lib/components/channels/ChannelCard.svelte) | channels | async-function: 71, 157, 219, 268, 328, 382, 666; network: 75, 167, 223; mutation-method: 76, 168, 224; save-gesture: 241, 243, 251, 596; pending-feedback: 592, 740, 758 |
| [minion_hub/src/lib/components/channels/ChannelEditForm.svelte](../../minion_hub/src/lib/components/channels/ChannelEditForm.svelte) | channels | save-gesture: 34, 64 |
| [minion_hub/src/lib/components/channels/ChannelGroup.svelte](../../minion_hub/src/lib/components/channels/ChannelGroup.svelte) | channels | async-function: 54 |
| [minion_hub/src/lib/components/channels/ChannelSetupWizard.svelte](../../minion_hub/src/lib/components/channels/ChannelSetupWizard.svelte) | channels | async-function: 65, 85, 139, 146, 221; network: 170; mutation-method: 171; pending-feedback: 305, 381 |
| [minion_hub/src/lib/components/channels/ChannelStatusPill.svelte](../../minion_hub/src/lib/components/channels/ChannelStatusPill.svelte) | channels | No lexical signal |
| [minion_hub/src/lib/components/channels/ChannelSyncStatus.svelte](../../minion_hub/src/lib/components/channels/ChannelSyncStatus.svelte) | channels | async-function: 110; pending-feedback: 41, 144, 177, 188, 235; poll-or-debounce: 124 |
| [minion_hub/src/lib/components/channels/ChannelsNav.svelte](../../minion_hub/src/lib/components/channels/ChannelsNav.svelte) | channels | No lexical signal |
| [minion_hub/src/lib/components/channels/ChannelsTab.svelte](../../minion_hub/src/lib/components/channels/ChannelsTab.svelte) | channels | async-function: 38, 209, 288, 301; network: 42, 211; mutation-method: 42; pending-feedback: 334 |
| [minion_hub/src/lib/components/channels/HistorySyncControl.svelte](../../minion_hub/src/lib/components/channels/HistorySyncControl.svelte) | channels | async-function: 72, 77; save-gesture: 91, 108, 116; pending-feedback: 48, 85, 119 |
| [minion_hub/src/lib/components/channels/WhatsAppQrPairing.svelte](../../minion_hub/src/lib/components/channels/WhatsAppQrPairing.svelte) | channels | async-function: 104 |
| [minion_hub/src/lib/components/channels/history-sync.ts](../../minion_hub/src/lib/components/channels/history-sync.ts) | channels | No lexical signal |
| [minion_hub/src/lib/components/channels/wizard-intent.ts](../../minion_hub/src/lib/components/channels/wizard-intent.ts) | channels | No lexical signal |
| [minion_hub/src/lib/components/charts/Chart.svelte](../../minion_hub/src/lib/components/charts/Chart.svelte) | charts | css-motion: 188, 191, 195, 199, 204; imperative-motion: 307, 314, 333, 360; reduced-motion: 63, 294 |
| [minion_hub/src/lib/components/charts/EChartsSparkline.svelte](../../minion_hub/src/lib/components/charts/EChartsSparkline.svelte) | charts | css-motion: 66; imperative-motion: 102 |
| [minion_hub/src/lib/components/charts/Sparkline.svelte](../../minion_hub/src/lib/components/charts/Sparkline.svelte) | charts | No lexical signal |
| [minion_hub/src/lib/components/chat/AIDisclosureBadge.svelte](../../minion_hub/src/lib/components/chat/AIDisclosureBadge.svelte) | chat | No lexical signal |
| [minion_hub/src/lib/components/chat/ChatMessage.svelte](../../minion_hub/src/lib/components/chat/ChatMessage.svelte) | chat | No lexical signal |
| [minion_hub/src/lib/components/chat/ChatPanel.svelte](../../minion_hub/src/lib/components/chat/ChatPanel.svelte) | chat | pending-feedback: 52, 53, 54, 57, 58, 61, 62 |
| [minion_hub/src/lib/components/chat/MarkdownMessage.svelte](../../minion_hub/src/lib/components/chat/MarkdownMessage.svelte) | chat | svelte-motion: 263; css-motion: 263; poll-or-debounce: 35 |
| [minion_hub/src/lib/components/cloud/CloudEmpty.svelte](../../minion_hub/src/lib/components/cloud/CloudEmpty.svelte) | cloud | No lexical signal |
| [minion_hub/src/lib/components/cloud/CloudHeader.svelte](../../minion_hub/src/lib/components/cloud/CloudHeader.svelte) | cloud | pending-feedback: 65 |
| [minion_hub/src/lib/components/cloud/CloudNav.svelte](../../minion_hub/src/lib/components/cloud/CloudNav.svelte) | cloud | svelte-motion: 100; css-motion: 100 |
| [minion_hub/src/lib/components/cloud/ProvisionWorkspaceDialog.svelte](../../minion_hub/src/lib/components/cloud/ProvisionWorkspaceDialog.svelte) | cloud | async-function: 53; save-gesture: 99, 180; pending-feedback: 185 |
| [minion_hub/src/lib/components/cloud/RemoteDesktop.svelte](../../minion_hub/src/lib/components/cloud/RemoteDesktop.svelte) | cloud | async-function: 49; pending-feedback: 14, 51, 62 |
| [minion_hub/src/lib/components/cloud/RemoteTerminal.svelte](../../minion_hub/src/lib/components/cloud/RemoteTerminal.svelte) | cloud | async-function: 48; pending-feedback: 147 |
| [minion_hub/src/lib/components/cloud/access-session.ts](../../minion_hub/src/lib/components/cloud/access-session.ts) | cloud | No lexical signal |
| [minion_hub/src/lib/components/config/ConfigField.svelte](../../minion_hub/src/lib/components/config/ConfigField.svelte) | config | No lexical signal |
| [minion_hub/src/lib/components/config/ConfigJsonEditor.svelte](../../minion_hub/src/lib/components/config/ConfigJsonEditor.svelte) | config | No lexical signal |
| [minion_hub/src/lib/components/config/ConfigSaveBar.svelte](../../minion_hub/src/lib/components/config/ConfigSaveBar.svelte) | config | save-gesture: 13, 17, 18, 29, 39; css-motion: 45, 50; pending-feedback: 35 |
| [minion_hub/src/lib/components/config/ConfigSection.svelte](../../minion_hub/src/lib/components/config/ConfigSection.svelte) | config | No lexical signal |
| [minion_hub/src/lib/components/config/ConfigSidebar.svelte](../../minion_hub/src/lib/components/config/ConfigSidebar.svelte) | config | No lexical signal |
| [minion_hub/src/lib/components/config/NavigationGuardModal.svelte](../../minion_hub/src/lib/components/config/NavigationGuardModal.svelte) | config | save-gesture: 36, 38, 45, 48 |
| [minion_hub/src/lib/components/config/ToggleSwitch.svelte](../../minion_hub/src/lib/components/config/ToggleSwitch.svelte) | config | No lexical signal |
| [minion_hub/src/lib/components/crm/ColumnFilter.svelte](../../minion_hub/src/lib/components/crm/ColumnFilter.svelte) | crm | svelte-motion: 150; css-motion: 150 |
| [minion_hub/src/lib/components/crm/Connections.svelte](../../minion_hub/src/lib/components/crm/Connections.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/ContactChat.svelte](../../minion_hub/src/lib/components/crm/ContactChat.svelte) | crm | async-function: 98; network: 100; mutation-method: 101; refresh: 108; optimistic: 29, 36, 77, 83; svelte-motion: 279; css-motion: 279; imperative-motion: 64; pending-feedback: 32, 95, 121 |
| [minion_hub/src/lib/components/crm/CrmFunnel.svelte](../../minion_hub/src/lib/components/crm/CrmFunnel.svelte) | crm | async-function: 50, 68; network: 54, 72; mutation-method: 55, 72; refresh: 61, 77; svelte-motion: 250; css-motion: 250; pending-feedback: 44, 52, 64 |
| [minion_hub/src/lib/components/crm/CrmFunnelRibbon.svelte](../../minion_hub/src/lib/components/crm/CrmFunnelRibbon.svelte) | crm | svelte-motion: 106; css-motion: 106 |
| [minion_hub/src/lib/components/crm/CrmHygiene.svelte](../../minion_hub/src/lib/components/crm/CrmHygiene.svelte) | crm | async-function: 145, 177, 211, 282; network: 159, 181, 216; mutation-method: 160, 182, 217; svelte-motion: 681; css-motion: 681; pending-feedback: 105, 640 |
| [minion_hub/src/lib/components/crm/CrmInsightsChat.svelte](../../minion_hub/src/lib/components/crm/CrmInsightsChat.svelte) | crm | css-motion: 297, 299 |
| [minion_hub/src/lib/components/crm/CrmMergeResolver.svelte](../../minion_hub/src/lib/components/crm/CrmMergeResolver.svelte) | crm | svelte-motion: 515; css-motion: 515; pending-feedback: 20 |
| [minion_hub/src/lib/components/crm/CrmNav.svelte](../../minion_hub/src/lib/components/crm/CrmNav.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/CrmSentimentTrend.svelte](../../minion_hub/src/lib/components/crm/CrmSentimentTrend.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/CrmSimilarWins.svelte](../../minion_hub/src/lib/components/crm/CrmSimilarWins.svelte) | crm | async-function: 18; network: 22; pending-feedback: 15, 20, 25 |
| [minion_hub/src/lib/components/crm/CrmWordCloud.svelte](../../minion_hub/src/lib/components/crm/CrmWordCloud.svelte) | crm | svelte-motion: 157; css-motion: 157; imperative-motion: 32 |
| [minion_hub/src/lib/components/crm/ExportDialog.svelte](../../minion_hub/src/lib/components/crm/ExportDialog.svelte) | crm | svelte-motion: 171; css-motion: 171 |
| [minion_hub/src/lib/components/crm/FunnelStagePill.svelte](../../minion_hub/src/lib/components/crm/FunnelStagePill.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/Highlight.svelte](../../minion_hub/src/lib/components/crm/Highlight.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/JourneyTimeline.svelte](../../minion_hub/src/lib/components/crm/JourneyTimeline.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/PartyCreateForm.svelte](../../minion_hub/src/lib/components/crm/PartyCreateForm.svelte) | crm | async-function: 60, 146; network: 65, 152; mutation-method: 66, 153; save-gesture: 196, 298; pending-feedback: 45, 149, 191, 236, 301 |
| [minion_hub/src/lib/components/crm/PartyPicker.svelte](../../minion_hub/src/lib/components/crm/PartyPicker.svelte) | crm | async-function: 105, 114, 165; network: 108, 172, 177, 192; mutation-method: 173, 178, 193; poll-or-debounce: 11, 113 |
| [minion_hub/src/lib/components/crm/ScopeBanner.svelte](../../minion_hub/src/lib/components/crm/ScopeBanner.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/ScoreBadge.svelte](../../minion_hub/src/lib/components/crm/ScoreBadge.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/ScoreCell.svelte](../../minion_hub/src/lib/components/crm/ScoreCell.svelte) | crm | svelte-motion: 58; css-motion: 58 |
| [minion_hub/src/lib/components/crm/StagePill.svelte](../../minion_hub/src/lib/components/crm/StagePill.svelte) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/crm-format.ts](../../minion_hub/src/lib/components/crm/crm-format.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/crm-funnel.ts](../../minion_hub/src/lib/components/crm/crm-funnel.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/crm-i18n.ts](../../minion_hub/src/lib/components/crm/crm-i18n.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/crm-insights.ts](../../minion_hub/src/lib/components/crm/crm-insights.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/crm-merge.ts](../../minion_hub/src/lib/components/crm/crm-merge.ts) | crm | async-function: 40; network: 53; mutation-method: 54 |
| [minion_hub/src/lib/components/crm/crm-meta.ts](../../minion_hub/src/lib/components/crm/crm-meta.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/crm-relationship.ts](../../minion_hub/src/lib/components/crm/crm-relationship.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/crm-similarity.ts](../../minion_hub/src/lib/components/crm/crm-similarity.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/customer-page-cache.ts](../../minion_hub/src/lib/components/crm/customer-page-cache.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/customer-query.ts](../../minion_hub/src/lib/components/crm/customer-query.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/party-picker.ts](../../minion_hub/src/lib/components/crm/party-picker.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/sentiment-tooltip.ts](../../minion_hub/src/lib/components/crm/sentiment-tooltip.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/crm/tag-colors.ts](../../minion_hub/src/lib/components/crm/tag-colors.ts) | crm | No lexical signal |
| [minion_hub/src/lib/components/dashboard/DateRangeControls.svelte](../../minion_hub/src/lib/components/dashboard/DateRangeControls.svelte) | dashboard | svelte-motion: 284, 354; css-motion: 284, 354 |
| [minion_hub/src/lib/components/dashboard/EditableGrid.svelte](../../minion_hub/src/lib/components/dashboard/EditableGrid.svelte) | dashboard | async-function: 85; network: 88; mutation-method: 89; save-gesture: 165, 168; svelte-motion: 271; css-motion: 271 |
| [minion_hub/src/lib/components/dashboard/dashboard-layout-cache.ts](../../minion_hub/src/lib/components/dashboard/dashboard-layout-cache.ts) | dashboard | async-function: 23 |
| [minion_hub/src/lib/components/dashboard/date-range/index.ts](../../minion_hub/src/lib/components/dashboard/date-range/index.ts) | dashboard | No lexical signal |
| [minion_hub/src/lib/components/dashboard/date-range/periods.ts](../../minion_hub/src/lib/components/dashboard/date-range/periods.ts) | dashboard | No lexical signal |
| [minion_hub/src/lib/components/dashboard/date-range/ranges.ts](../../minion_hub/src/lib/components/dashboard/date-range/ranges.ts) | dashboard | No lexical signal |
| [minion_hub/src/lib/components/dashboard/date-range/storage.ts](../../minion_hub/src/lib/components/dashboard/date-range/storage.ts) | dashboard | No lexical signal |
| [minion_hub/src/lib/components/dashboard/date-range/url.ts](../../minion_hub/src/lib/components/dashboard/date-range/url.ts) | dashboard | No lexical signal |
| [minion_hub/src/lib/components/dashboard/editable-grid.ts](../../minion_hub/src/lib/components/dashboard/editable-grid.ts) | dashboard | No lexical signal |
| [minion_hub/src/lib/components/data-table/DataTable.svelte](../../minion_hub/src/lib/components/data-table/DataTable.svelte) | data-table | async-function: 898, 1046; save-gesture: 59, 71, 178, 224, 257, 1048, 1052, 1053, 1056, 1593; svelte-motion: 1757, 1790, 1813, 1834, 1961, 1985, 2064, 2099, 2144; css-motion: 1757, 1790, 1813, 1834, 1961, 1985, 2064, 2099, 2144; imperative-motion: 956; poll-or-debounce: 644, 651 |
| [minion_hub/src/lib/components/debug/StepStateView.svelte](../../minion_hub/src/lib/components/debug/StepStateView.svelte) | debug | No lexical signal |
| [minion_hub/src/lib/components/debug/StepView.svelte](../../minion_hub/src/lib/components/debug/StepView.svelte) | debug | No lexical signal |
| [minion_hub/src/lib/components/decorations/BgPattern.svelte](../../minion_hub/src/lib/components/decorations/BgPattern.svelte) | decorations | No lexical signal |
| [minion_hub/src/lib/components/decorations/CornerAccent.svelte](../../minion_hub/src/lib/components/decorations/CornerAccent.svelte) | decorations | No lexical signal |
| [minion_hub/src/lib/components/decorations/DotGrid.svelte](../../minion_hub/src/lib/components/decorations/DotGrid.svelte) | decorations | No lexical signal |
| [minion_hub/src/lib/components/decorations/HudBorder.svelte](../../minion_hub/src/lib/components/decorations/HudBorder.svelte) | decorations | css-motion: 27 |
| [minion_hub/src/lib/components/decorations/LoginShader.svelte](../../minion_hub/src/lib/components/decorations/LoginShader.svelte) | decorations | imperative-motion: 15, 292, 298 |
| [minion_hub/src/lib/components/decorations/ScanLine.svelte](../../minion_hub/src/lib/components/decorations/ScanLine.svelte) | decorations | css-motion: 12, 16, 21 |
| [minion_hub/src/lib/components/decorations/VoxelShader.svelte](../../minion_hub/src/lib/components/decorations/VoxelShader.svelte) | decorations | imperative-motion: 11, 132, 144, 154 |
| [minion_hub/src/lib/components/finance/FinanceNav.svelte](../../minion_hub/src/lib/components/finance/FinanceNav.svelte) | finance | No lexical signal |
| [minion_hub/src/lib/components/finance/FinanceSyncBadge.svelte](../../minion_hub/src/lib/components/finance/FinanceSyncBadge.svelte) | finance | css-motion: 32, 33 |
| [minion_hub/src/lib/components/finance/PurchaseFormDialog.svelte](../../minion_hub/src/lib/components/finance/PurchaseFormDialog.svelte) | finance | async-function: 114; network: 131, 137; mutation-method: 132, 138; refresh: 143; save-gesture: 256; pending-feedback: 53, 116, 148, 253 |
| [minion_hub/src/lib/components/finances/InvoicePickerField.svelte](../../minion_hub/src/lib/components/finances/InvoicePickerField.svelte) | finances | async-function: 66; network: 67 |
| [minion_hub/src/lib/components/flow-editor/ConsolePanel.svelte](../../minion_hub/src/lib/components/flow-editor/ConsolePanel.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/FlowActionIsland.svelte](../../minion_hub/src/lib/components/flow-editor/FlowActionIsland.svelte) | flow-editor | async-function: 12 |
| [minion_hub/src/lib/components/flow-editor/FlowCanvas.svelte](../../minion_hub/src/lib/components/flow-editor/FlowCanvas.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/FlowCopilotPanel.svelte](../../minion_hub/src/lib/components/flow-editor/FlowCopilotPanel.svelte) | flow-editor | async-function: 30, 58; mutation-method: 43; pending-feedback: 25, 35, 54, 60, 71, 100, 114 |
| [minion_hub/src/lib/components/flow-editor/FlowExports.svelte](../../minion_hub/src/lib/components/flow-editor/FlowExports.svelte) | flow-editor | async-function: 31; network: 36; mutation-method: 37; svelte-motion: 153, 174; css-motion: 153, 174 |
| [minion_hub/src/lib/components/flow-editor/FlowGroupSection.svelte](../../minion_hub/src/lib/components/flow-editor/FlowGroupSection.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/FlowHistoryPanel.svelte](../../minion_hub/src/lib/components/flow-editor/FlowHistoryPanel.svelte) | flow-editor | async-function: 25; network: 31; pending-feedback: 21, 28, 38 |
| [minion_hub/src/lib/components/flow-editor/FlowRunStatusLayer.svelte](../../minion_hub/src/lib/components/flow-editor/FlowRunStatusLayer.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/FlowSidebar.svelte](../../minion_hub/src/lib/components/flow-editor/FlowSidebar.svelte) | flow-editor | async-function: 64 |
| [minion_hub/src/lib/components/flow-editor/MasterFlowCanvas.svelte](../../minion_hub/src/lib/components/flow-editor/MasterFlowCanvas.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/MasterFlowsSection.svelte](../../minion_hub/src/lib/components/flow-editor/MasterFlowsSection.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/MasterNode.svelte](../../minion_hub/src/lib/components/flow-editor/MasterNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/NewFromTemplateMenu.svelte](../../minion_hub/src/lib/components/flow-editor/NewFromTemplateMenu.svelte) | flow-editor | async-function: 24; network: 29; mutation-method: 30; pending-feedback: 22, 26, 47 |
| [minion_hub/src/lib/components/flow-editor/edges/ContextEdge.svelte](../../minion_hub/src/lib/components/flow-editor/edges/ContextEdge.svelte) | flow-editor | svelte-motion: 32; css-motion: 32 |
| [minion_hub/src/lib/components/flow-editor/edges/FlowEdge.svelte](../../minion_hub/src/lib/components/flow-editor/edges/FlowEdge.svelte) | flow-editor | svelte-motion: 31; css-motion: 31 |
| [minion_hub/src/lib/components/flow-editor/nodes/AgentNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/AgentNode.svelte) | flow-editor | async-function: 44, 58; network: 48 |
| [minion_hub/src/lib/components/flow-editor/nodes/BranchEditorField.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/BranchEditorField.svelte) | flow-editor | async-function: 34 |
| [minion_hub/src/lib/components/flow-editor/nodes/ChannelNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/ChannelNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/ChannelNodeConfig.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/ChannelNodeConfig.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/DatabaseNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/DatabaseNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/DatabaseNodeConfig.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/DatabaseNodeConfig.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/DestinationListField.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/DestinationListField.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/FileWriteNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/FileWriteNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/FileWriteNodeConfig.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/FileWriteNodeConfig.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/HandoffNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/HandoffNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/HandoffNodeConfig.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/HandoffNodeConfig.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/LLMNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/LLMNode.svelte) | flow-editor | async-function: 23 |
| [minion_hub/src/lib/components/flow-editor/nodes/NodeConfigPanel.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/NodeConfigPanel.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/PluginNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/PluginNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/PromptBoxNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/PromptBoxNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/ReactionNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/ReactionNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/ReactionNodeConfig.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/ReactionNodeConfig.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/RouterNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/RouterNode.svelte) | flow-editor | async-function: 24, 36 |
| [minion_hub/src/lib/components/flow-editor/nodes/ScheduleNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/ScheduleNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/ScheduleNodeConfig.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/ScheduleNodeConfig.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/StructuredNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/StructuredNode.svelte) | flow-editor | async-function: 20 |
| [minion_hub/src/lib/components/flow-editor/nodes/SubflowNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/SubflowNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/SubflowNodeConfig.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/SubflowNodeConfig.svelte) | flow-editor | async-function: 22; network: 24 |
| [minion_hub/src/lib/components/flow-editor/nodes/ToolAgentNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/ToolAgentNode.svelte) | flow-editor | async-function: 21 |
| [minion_hub/src/lib/components/flow-editor/nodes/TransformNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/TransformNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/TriggerNode.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/TriggerNode.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/flow-editor/nodes/TriggerNodeConfig.svelte](../../minion_hub/src/lib/components/flow-editor/nodes/TriggerNodeConfig.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/lib/components/hosts/HostPill.svelte](../../minion_hub/src/lib/components/hosts/HostPill.svelte) | hosts | svelte-motion: 30; css-motion: 30 |
| [minion_hub/src/lib/components/hosts/HostsOverlay.svelte](../../minion_hub/src/lib/components/hosts/HostsOverlay.svelte) | hosts | async-function: 71, 103; save-gesture: 227, 282, 283 |
| [minion_hub/src/lib/components/hosts/host-label.ts](../../minion_hub/src/lib/components/hosts/host-label.ts) | hosts | No lexical signal |
| [minion_hub/src/lib/components/hosts/host-scope.ts](../../minion_hub/src/lib/components/hosts/host-scope.ts) | hosts | No lexical signal |
| [minion_hub/src/lib/components/layout/BugReporter.svelte](../../minion_hub/src/lib/components/layout/BugReporter.svelte) | layout | save-gesture: 205; css-motion: 50, 68 |
| [minion_hub/src/lib/components/layout/CommandPalette.svelte](../../minion_hub/src/lib/components/layout/CommandPalette.svelte) | layout | css-motion: 161, 251; poll-or-debounce: 132 |
| [minion_hub/src/lib/components/layout/CompanySwitcher.svelte](../../minion_hub/src/lib/components/layout/CompanySwitcher.svelte) | layout | async-function: 32; network: 33; mutation-method: 34; refresh: 41 |
| [minion_hub/src/lib/components/layout/ConnectionStatusIndicator.svelte](../../minion_hub/src/lib/components/layout/ConnectionStatusIndicator.svelte) | layout | network: 45; mutation-method: 46; pending-feedback: 196, 208; poll-or-debounce: 57 |
| [minion_hub/src/lib/components/layout/DetailHeader.svelte](../../minion_hub/src/lib/components/layout/DetailHeader.svelte) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/DetailPanel.svelte](../../minion_hub/src/lib/components/layout/DetailPanel.svelte) | layout | css-motion: 19 |
| [minion_hub/src/lib/components/layout/DevUserSwitcher.svelte](../../minion_hub/src/lib/components/layout/DevUserSwitcher.svelte) | layout | async-function: 51, 70; network: 55, 75; mutation-method: 76; refresh: 86; pending-feedback: 29, 52, 66, 142, 193 |
| [minion_hub/src/lib/components/layout/EnvBadge.svelte](../../minion_hub/src/lib/components/layout/EnvBadge.svelte) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/FloatingAssistant.svelte](../../minion_hub/src/lib/components/layout/FloatingAssistant.svelte) | layout | async-function: 219, 236; network: 221, 246; mutation-method: 247; save-gesture: 1072; svelte-motion: 652; css-motion: 584, 652, 1112; imperative-motion: 77, 292, 300; pending-feedback: 1010; poll-or-debounce: 635 |
| [minion_hub/src/lib/components/layout/GNav.svelte](../../minion_hub/src/lib/components/layout/GNav.svelte) | layout | css-motion: 107, 119 |
| [minion_hub/src/lib/components/layout/MinionLogo.svelte](../../minion_hub/src/lib/components/layout/MinionLogo.svelte) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/ModuleSwitcher.svelte](../../minion_hub/src/lib/components/layout/ModuleSwitcher.svelte) | layout | svelte-motion: 116, 146; css-motion: 116, 146 |
| [minion_hub/src/lib/components/layout/NavIcon.svelte](../../minion_hub/src/lib/components/layout/NavIcon.svelte) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/NotificationsPopup.svelte](../../minion_hub/src/lib/components/layout/NotificationsPopup.svelte) | layout | async-function: 34, 49; network: 37; css-motion: 213, 215; pending-feedback: 29, 35, 45 |
| [minion_hub/src/lib/components/layout/OrgPicker.svelte](../../minion_hub/src/lib/components/layout/OrgPicker.svelte) | layout | async-function: 46; network: 54; mutation-method: 55; refresh: 63, 69; pending-feedback: 106 |
| [minion_hub/src/lib/components/layout/ParticleCanvas.svelte](../../minion_hub/src/lib/components/layout/ParticleCanvas.svelte) | layout | imperative-motion: 83 |
| [minion_hub/src/lib/components/layout/ProfileMenu.svelte](../../minion_hub/src/lib/components/layout/ProfileMenu.svelte) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/ShortcutsOverlay.svelte](../../minion_hub/src/lib/components/layout/ShortcutsOverlay.svelte) | layout | css-motion: 100, 142 |
| [minion_hub/src/lib/components/layout/Sidebar.svelte](../../minion_hub/src/lib/components/layout/Sidebar.svelte) | layout | async-function: 110, 208; network: 113, 212; mutation-method: 114, 213; refresh: 118; svelte-motion: 580, 634, 649, 657, 802, 834; css-motion: 580, 634, 649, 657, 694, 705, 712, 756, 802, 834, 845; reduced-motion: 710 |
| [minion_hub/src/lib/components/layout/SidebarUtilities.svelte](../../minion_hub/src/lib/components/layout/SidebarUtilities.svelte) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/Splitter.svelte](../../minion_hub/src/lib/components/layout/Splitter.svelte) | layout | svelte-motion: 222, 238, 263; css-motion: 222, 238, 263 |
| [minion_hub/src/lib/components/layout/ToastItem.svelte](../../minion_hub/src/lib/components/layout/ToastItem.svelte) | layout | svelte-motion: 93, 151; css-motion: 93, 151 |
| [minion_hub/src/lib/components/layout/Toaster.svelte](../../minion_hub/src/lib/components/layout/Toaster.svelte) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/Topbar.svelte](../../minion_hub/src/lib/components/layout/Topbar.svelte) | layout | svelte-motion: 427, 434, 501, 551; css-motion: 427, 434, 501, 530, 532, 550, 551; reduced-motion: 432, 547 |
| [minion_hub/src/lib/components/layout/WelcomePanel.svelte](../../minion_hub/src/lib/components/layout/WelcomePanel.svelte) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/dev-user-switcher.logic.ts](../../minion_hub/src/lib/components/layout/dev-user-switcher.logic.ts) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/nav-order.ts](../../minion_hub/src/lib/components/layout/nav-order.ts) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/sections.ts](../../minion_hub/src/lib/components/layout/sections.ts) | layout | No lexical signal |
| [minion_hub/src/lib/components/layout/utility-links.ts](../../minion_hub/src/lib/components/layout/utility-links.ts) | layout | No lexical signal |
| [minion_hub/src/lib/components/marketplace/AgentCard.svelte](../../minion_hub/src/lib/components/marketplace/AgentCard.svelte) | marketplace | svelte-motion: 119, 192, 198, 254, 280; css-motion: 119, 192, 198, 254, 280 |
| [minion_hub/src/lib/components/marketplace/AgentCreatorWizard.svelte](../../minion_hub/src/lib/components/marketplace/AgentCreatorWizard.svelte) | marketplace | async-function: 71; network: 76; mutation-method: 77 |
| [minion_hub/src/lib/components/marketplace/MarketplaceNav.svelte](../../minion_hub/src/lib/components/marketplace/MarketplaceNav.svelte) | marketplace | No lexical signal |
| [minion_hub/src/lib/components/marketplace/_agent-card/CardBack.svelte](../../minion_hub/src/lib/components/marketplace/_agent-card/CardBack.svelte) | marketplace | No lexical signal |
| [minion_hub/src/lib/components/marketplace/_agent-card/IdBadgeClip.svelte](../../minion_hub/src/lib/components/marketplace/_agent-card/IdBadgeClip.svelte) | marketplace | No lexical signal |
| [minion_hub/src/lib/components/marketplace/_agent-card/IdFooter.svelte](../../minion_hub/src/lib/components/marketplace/_agent-card/IdFooter.svelte) | marketplace | svelte-motion: 74; css-motion: 74 |
| [minion_hub/src/lib/components/marketplace/_agent-card/IdHeader.svelte](../../minion_hub/src/lib/components/marketplace/_agent-card/IdHeader.svelte) | marketplace | No lexical signal |
| [minion_hub/src/lib/components/marketplace/_agent-card/IdInfo.svelte](../../minion_hub/src/lib/components/marketplace/_agent-card/IdInfo.svelte) | marketplace | No lexical signal |
| [minion_hub/src/lib/components/marketplace/_agent-card/IdPhoto.svelte](../../minion_hub/src/lib/components/marketplace/_agent-card/IdPhoto.svelte) | marketplace | pending-feedback: 11 |
| [minion_hub/src/lib/components/my-agent/AgentGreeting.svelte](../../minion_hub/src/lib/components/my-agent/AgentGreeting.svelte) | my-agent | No lexical signal |
| [minion_hub/src/lib/components/my-agent/CallControls.svelte](../../minion_hub/src/lib/components/my-agent/CallControls.svelte) | my-agent | svelte-motion: 130, 161, 219, 259; css-motion: 130, 161, 205, 219, 255, 259, 263; reduced-motion: 253 |
| [minion_hub/src/lib/components/my-agent/ChatHistoryPopover.svelte](../../minion_hub/src/lib/components/my-agent/ChatHistoryPopover.svelte) | my-agent | async-function: 50, 123; svelte-motion: 181; css-motion: 181; pending-feedback: 30, 52, 112 |
| [minion_hub/src/lib/components/my-agent/ChatInput.svelte](../../minion_hub/src/lib/components/my-agent/ChatInput.svelte) | my-agent | async-function: 232; save-gesture: 22, 31, 75; svelte-motion: 431; css-motion: 431 |
| [minion_hub/src/lib/components/my-agent/ChatTurn.svelte](../../minion_hub/src/lib/components/my-agent/ChatTurn.svelte) | my-agent | No lexical signal |
| [minion_hub/src/lib/components/my-agent/EaselBoard.svelte](../../minion_hub/src/lib/components/my-agent/EaselBoard.svelte) | my-agent | async-function: 218, 234, 267; save-gesture: 370, 381; svelte-motion: 542; css-motion: 542; pending-feedback: 42, 220, 230, 237, 246, 275, 280 |
| [minion_hub/src/lib/components/my-agent/EmailCard.svelte](../../minion_hub/src/lib/components/my-agent/EmailCard.svelte) | my-agent | svelte-motion: 133; css-motion: 133 |
| [minion_hub/src/lib/components/my-agent/EmailModal.svelte](../../minion_hub/src/lib/components/my-agent/EmailModal.svelte) | my-agent | async-function: 88, 144, 159; save-gesture: 314; svelte-motion: 409, 667, 699; css-motion: 409, 498, 500, 550, 552, 667, 699 |
| [minion_hub/src/lib/components/my-agent/EventCard.svelte](../../minion_hub/src/lib/components/my-agent/EventCard.svelte) | my-agent | svelte-motion: 180; css-motion: 180 |
| [minion_hub/src/lib/components/my-agent/EventModal.svelte](../../minion_hub/src/lib/components/my-agent/EventModal.svelte) | my-agent | svelte-motion: 232, 296, 337, 364; css-motion: 232, 296, 337, 364 |
| [minion_hub/src/lib/components/my-agent/FeedCard.svelte](../../minion_hub/src/lib/components/my-agent/FeedCard.svelte) | my-agent | svelte-motion: 101, 143; css-motion: 101, 143 |
| [minion_hub/src/lib/components/my-agent/FeedSection.svelte](../../minion_hub/src/lib/components/my-agent/FeedSection.svelte) | my-agent | svelte-motion: 7, 8, 95, 99, 148, 157, 219; css-motion: 95, 99, 148, 157, 219 |
| [minion_hub/src/lib/components/my-agent/IconPicker.svelte](../../minion_hub/src/lib/components/my-agent/IconPicker.svelte) | my-agent | svelte-motion: 152, 229; css-motion: 152, 229 |
| [minion_hub/src/lib/components/my-agent/ImageLightbox.svelte](../../minion_hub/src/lib/components/my-agent/ImageLightbox.svelte) | my-agent | No lexical signal |
| [minion_hub/src/lib/components/my-agent/MessageActions.svelte](../../minion_hub/src/lib/components/my-agent/MessageActions.svelte) | my-agent | svelte-motion: 68; css-motion: 68 |
| [minion_hub/src/lib/components/my-agent/NoteBlocks.svelte](../../minion_hub/src/lib/components/my-agent/NoteBlocks.svelte) | my-agent | svelte-motion: 4, 207, 241, 246, 352, 384, 535, 562, 576, 602; css-motion: 207, 241, 246, 352, 384, 419, 421, 460, 462, 535, 562, 576, 602; pending-feedback: 157 |
| [minion_hub/src/lib/components/my-agent/NoteEditor.svelte](../../minion_hub/src/lib/components/my-agent/NoteEditor.svelte) | my-agent | async-function: 141, 209, 371, 576; network: 395; mutation-method: 396; svelte-motion: 914, 933, 977, 1125; css-motion: 892, 895, 914, 933, 977, 1125; pending-feedback: 121, 147, 193, 215, 232 |
| [minion_hub/src/lib/components/my-agent/NoteIconButton.svelte](../../minion_hub/src/lib/components/my-agent/NoteIconButton.svelte) | my-agent | svelte-motion: 74; css-motion: 74 |
| [minion_hub/src/lib/components/my-agent/NoteImageStrip.svelte](../../minion_hub/src/lib/components/my-agent/NoteImageStrip.svelte) | my-agent | svelte-motion: 108; css-motion: 108; pending-feedback: 43 |
| [minion_hub/src/lib/components/my-agent/NotesPanel.svelte](../../minion_hub/src/lib/components/my-agent/NotesPanel.svelte) | my-agent | async-function: 83, 129; svelte-motion: 461, 488, 510, 591, 679, 722, 767, 815, 834, 885; css-motion: 461, 488, 510, 591, 679, 722, 767, 815, 834, 885; pending-feedback: 290 |
| [minion_hub/src/lib/components/my-agent/OmnichatDock.svelte](../../minion_hub/src/lib/components/my-agent/OmnichatDock.svelte) | my-agent | async-function: 79, 100, 121, 167; network: 81, 104, 131, 186; mutation-method: 187; optimistic: 181, 182, 183, 192, 197; svelte-motion: 512, 659, 764, 785; css-motion: 512, 659, 764, 785; pending-feedback: 297, 304, 399; poll-or-debounce: 209, 213 |
| [minion_hub/src/lib/components/my-agent/OpenHumanAvatar.svelte](../../minion_hub/src/lib/components/my-agent/OpenHumanAvatar.svelte) | my-agent | imperative-motion: 115, 117 |
| [minion_hub/src/lib/components/my-agent/PolishMenu.svelte](../../minion_hub/src/lib/components/my-agent/PolishMenu.svelte) | my-agent | svelte-motion: 87; css-motion: 87 |
| [minion_hub/src/lib/components/my-agent/ProviderIcon.svelte](../../minion_hub/src/lib/components/my-agent/ProviderIcon.svelte) | my-agent | No lexical signal |
| [minion_hub/src/lib/components/my-agent/TodoChecklist.svelte](../../minion_hub/src/lib/components/my-agent/TodoChecklist.svelte) | my-agent | async-function: 79; svelte-motion: 217, 275, 295, 322; css-motion: 217, 275, 295, 322; pending-feedback: 48, 84, 95 |
| [minion_hub/src/lib/components/my-agent/TranscribeButton.svelte](../../minion_hub/src/lib/components/my-agent/TranscribeButton.svelte) | my-agent | async-function: 161, 216, 234, 261, 314, 328; network: 221; mutation-method: 221; svelte-motion: 5, 491, 522, 541, 565, 608, 760; css-motion: 491, 522, 541, 553, 565, 608, 684, 686, 691, 724, 727, 760; imperative-motion: 278, 280; pending-feedback: 55, 162, 169, 178, 188 |
| [minion_hub/src/lib/components/my-agent/ZenMode.svelte](../../minion_hub/src/lib/components/my-agent/ZenMode.svelte) | my-agent | svelte-motion: 313, 335, 377, 387; css-motion: 313, 335, 377, 387 |
| [minion_hub/src/lib/components/my-agent/ZenSettingsMenu.svelte](../../minion_hub/src/lib/components/my-agent/ZenSettingsMenu.svelte) | my-agent | svelte-motion: 137, 170; css-motion: 137, 170 |
| [minion_hub/src/lib/components/my-agent/note-icons.ts](../../minion_hub/src/lib/components/my-agent/note-icons.ts) | my-agent | No lexical signal |
| [minion_hub/src/lib/components/my-agent/omnichat-thread-cache.ts](../../minion_hub/src/lib/components/my-agent/omnichat-thread-cache.ts) | my-agent | No lexical signal |
| [minion_hub/src/lib/components/my-agent/provider.ts](../../minion_hub/src/lib/components/my-agent/provider.ts) | my-agent | No lexical signal |
| [minion_hub/src/lib/components/my-agent/tiptap-autofill.ts](../../minion_hub/src/lib/components/my-agent/tiptap-autofill.ts) | my-agent | No lexical signal |
| [minion_hub/src/lib/components/onboarding/OrbAnimation.svelte](../../minion_hub/src/lib/components/onboarding/OrbAnimation.svelte) | onboarding | css-motion: 67, 91, 105, 116, 139, 174, 183, 194, 200, 214; reduced-motion: 209 |
| [minion_hub/src/lib/components/onboarding/StepAwaken.svelte](../../minion_hub/src/lib/components/onboarding/StepAwaken.svelte) | onboarding | No lexical signal |
| [minion_hub/src/lib/components/onboarding/StepConnect.svelte](../../minion_hub/src/lib/components/onboarding/StepConnect.svelte) | onboarding | pending-feedback: 26, 76 |
| [minion_hub/src/lib/components/onboarding/StepIndicator.svelte](../../minion_hub/src/lib/components/onboarding/StepIndicator.svelte) | onboarding | svelte-motion: 51, 64, 92; css-motion: 51, 64, 92 |
| [minion_hub/src/lib/components/onboarding/StepRemember.svelte](../../minion_hub/src/lib/components/onboarding/StepRemember.svelte) | onboarding | No lexical signal |
| [minion_hub/src/lib/components/overview/OverviewGraph.svelte](../../minion_hub/src/lib/components/overview/OverviewGraph.svelte) | overview | async-function: 220; refresh: 69; imperative-motion: 122, 263, 265; reduced-motion: 176, 178, 179, 213, 215, 246 |
| [minion_hub/src/lib/components/overview/graph/build-graph.ts](../../minion_hub/src/lib/components/overview/graph/build-graph.ts) | overview | No lexical signal |
| [minion_hub/src/lib/components/overview/graph/renderer.ts](../../minion_hub/src/lib/components/overview/graph/renderer.ts) | overview | async-function: 158 |
| [minion_hub/src/lib/components/overview/graph/simulation.ts](../../minion_hub/src/lib/components/overview/graph/simulation.ts) | overview | optimistic: 70; reduced-motion: 34, 88 |
| [minion_hub/src/lib/components/pos/ClientAccountDrawer.svelte](../../minion_hub/src/lib/components/pos/ClientAccountDrawer.svelte) | pos | async-function: 113, 187, 208, 229, 234, 369, 427; network: 120, 191; mutation-method: 212, 231, 236; refresh: 79; pending-feedback: 97, 99, 117, 130, 188, 204, 248 |
| [minion_hub/src/lib/components/pos/CustomerPicker.svelte](../../minion_hub/src/lib/components/pos/CustomerPicker.svelte) | pos | async-function: 94, 117, 197; network: 24, 97, 123, 204; mutation-method: 124, 205; save-gesture: 210, 217, 278, 313; pending-feedback: 312 |
| [minion_hub/src/lib/components/pos/CustomerQuickAdd.svelte](../../minion_hub/src/lib/components/pos/CustomerQuickAdd.svelte) | pos | async-function: 87, 145; network: 98, 108, 157; mutation-method: 109, 158; save-gesture: 195, 213, 250; pending-feedback: 52, 94, 134, 153, 186, 213, 250 |
| [minion_hub/src/lib/components/pos/PackageEditor.svelte](../../minion_hub/src/lib/components/pos/PackageEditor.svelte) | pos | async-function: 73, 102; network: 75, 107; mutation-method: 108; save-gesture: 117, 120, 188; pending-feedback: 41, 42, 72, 87, 103, 123, 132 |
| [minion_hub/src/lib/components/pos/PaymentPanel.svelte](../../minion_hub/src/lib/components/pos/PaymentPanel.svelte) | pos | No lexical signal |
| [minion_hub/src/lib/components/pos/PaymentStep.svelte](../../minion_hub/src/lib/components/pos/PaymentStep.svelte) | pos | pending-feedback: 105 |
| [minion_hub/src/lib/components/pos/PlanOpenForm.svelte](../../minion_hub/src/lib/components/pos/PlanOpenForm.svelte) | pos | async-function: 56; network: 61; mutation-method: 62; pending-feedback: 48, 58, 86 |
| [minion_hub/src/lib/components/pos/PosNav.svelte](../../minion_hub/src/lib/components/pos/PosNav.svelte) | pos | No lexical signal |
| [minion_hub/src/lib/components/pos/RecipeEditor.svelte](../../minion_hub/src/lib/components/pos/RecipeEditor.svelte) | pos | async-function: 97, 124; network: 101, 126, 133; mutation-method: 102, 134; save-gesture: 116, 127, 139; pending-feedback: 85, 99, 120 |
| [minion_hub/src/lib/components/pos/ScheduleStep.svelte](../../minion_hub/src/lib/components/pos/ScheduleStep.svelte) | pos | async-function: 68, 107; network: 72; refresh: 110; pending-feedback: 51, 60, 70, 91, 131 |
| [minion_hub/src/lib/components/pos/SellCart.svelte](../../minion_hub/src/lib/components/pos/SellCart.svelte) | pos | No lexical signal |
| [minion_hub/src/lib/components/pos/SellableEditorPage.svelte](../../minion_hub/src/lib/components/pos/SellableEditorPage.svelte) | pos | save-gesture: 78 |
| [minion_hub/src/lib/components/pos/SellableWizard.svelte](../../minion_hub/src/lib/components/pos/SellableWizard.svelte) | pos | async-function: 303, 347; network: 348, 362; mutation-method: 363; save-gesture: 78, 92, 369, 370, 372, 378, 560, 567, 577, 581; pending-feedback: 134, 305, 382 |
| [minion_hub/src/lib/components/pos/ShiftBanner.svelte](../../minion_hub/src/lib/components/pos/ShiftBanner.svelte) | pos | async-function: 73, 75, 110, 140, 142; network: 76, 116, 143; mutation-method: 77, 144; refresh: 86, 94, 124, 153, 161; poll-or-debounce: 19 |
| [minion_hub/src/lib/components/pos/booking-checkout.ts](../../minion_hub/src/lib/components/pos/booking-checkout.ts) | pos | No lexical signal |
| [minion_hub/src/lib/components/pos/checkout-money.ts](../../minion_hub/src/lib/components/pos/checkout-money.ts) | pos | No lexical signal |
| [minion_hub/src/lib/components/pos/customer-storage.ts](../../minion_hub/src/lib/components/pos/customer-storage.ts) | pos | No lexical signal |
| [minion_hub/src/lib/components/pos/drawable-grants.ts](../../minion_hub/src/lib/components/pos/drawable-grants.ts) | pos | No lexical signal |
| [minion_hub/src/lib/components/pos/schedule-lines.ts](../../minion_hub/src/lib/components/pos/schedule-lines.ts) | pos | No lexical signal |
| [minion_hub/src/lib/components/prompt/AgentAvatarStack.svelte](../../minion_hub/src/lib/components/prompt/AgentAvatarStack.svelte) | prompt | svelte-motion: 92, 109, 165; css-motion: 92, 109, 165 |
| [minion_hub/src/lib/components/prompt/AgentSelector.svelte](../../minion_hub/src/lib/components/prompt/AgentSelector.svelte) | prompt | svelte-motion: 65; css-motion: 65 |
| [minion_hub/src/lib/components/prompt/AssembledPromptPane.svelte](../../minion_hub/src/lib/components/prompt/AssembledPromptPane.svelte) | prompt | css-motion: 126, 128; pending-feedback: 9; poll-or-debounce: 16 |
| [minion_hub/src/lib/components/prompt/BreakdownTree.svelte](../../minion_hub/src/lib/components/prompt/BreakdownTree.svelte) | prompt | async-function: 17, 52, 122; optimistic: 33 |
| [minion_hub/src/lib/components/prompt/EmptyState.svelte](../../minion_hub/src/lib/components/prompt/EmptyState.svelte) | prompt | No lexical signal |
| [minion_hub/src/lib/components/prompt/MarkdownView.svelte](../../minion_hub/src/lib/components/prompt/MarkdownView.svelte) | prompt | No lexical signal |
| [minion_hub/src/lib/components/prompt/PromptShell.svelte](../../minion_hub/src/lib/components/prompt/PromptShell.svelte) | prompt | async-function: 45; poll-or-debounce: 43, 71, 72, 73, 83, 84, 85, 108, 109, 110 |
| [minion_hub/src/lib/components/prompt/PromptTopbarChip.svelte](../../minion_hub/src/lib/components/prompt/PromptTopbarChip.svelte) | prompt | No lexical signal |
| [minion_hub/src/lib/components/prompt/SectionCheckbox.svelte](../../minion_hub/src/lib/components/prompt/SectionCheckbox.svelte) | prompt | No lexical signal |
| [minion_hub/src/lib/components/prompt/SelectionDetail.svelte](../../minion_hub/src/lib/components/prompt/SelectionDetail.svelte) | prompt | async-function: 60, 78, 108, 125; save-gesture: 143, 192, 194; pending-feedback: 42, 80, 104 |
| [minion_hub/src/lib/components/prompt/ValidationErrors.svelte](../../minion_hub/src/lib/components/prompt/ValidationErrors.svelte) | prompt | No lexical signal |
| [minion_hub/src/lib/components/prompt/preview-sync.ts](../../minion_hub/src/lib/components/prompt/preview-sync.ts) | prompt | poll-or-debounce: 5, 8, 9 |
| [minion_hub/src/lib/components/provision/ProvisionConfigForm.svelte](../../minion_hub/src/lib/components/provision/ProvisionConfigForm.svelte) | provision | async-function: 15; save-gesture: 208; pending-feedback: 13, 16, 18 |
| [minion_hub/src/lib/components/provision/ProvisionLogViewer.svelte](../../minion_hub/src/lib/components/provision/ProvisionLogViewer.svelte) | provision | imperative-motion: 18 |
| [minion_hub/src/lib/components/provision/ProvisionStepper.svelte](../../minion_hub/src/lib/components/provision/ProvisionStepper.svelte) | provision | No lexical signal |
| [minion_hub/src/lib/components/reliability/ActivityLogTable.svelte](../../minion_hub/src/lib/components/reliability/ActivityLogTable.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/AgentActivityPanel.svelte](../../minion_hub/src/lib/components/reliability/AgentActivityPanel.svelte) | reliability | save-gesture: 323 |
| [minion_hub/src/lib/components/reliability/AgentLlmAnalytics.svelte](../../minion_hub/src/lib/components/reliability/AgentLlmAnalytics.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/ConnectionEventsPanel.svelte](../../minion_hub/src/lib/components/reliability/ConnectionEventsPanel.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/GatewayHealthPanel.svelte](../../minion_hub/src/lib/components/reliability/GatewayHealthPanel.svelte) | reliability | async-function: 184; network: 188; pending-feedback: 47, 185, 197; poll-or-debounce: 203 |
| [minion_hub/src/lib/components/reliability/InsightsPanel.svelte](../../minion_hub/src/lib/components/reliability/InsightsPanel.svelte) | reliability | pending-feedback: 107 |
| [minion_hub/src/lib/components/reliability/KpiRow.svelte](../../minion_hub/src/lib/components/reliability/KpiRow.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/KpiSparkline.svelte](../../minion_hub/src/lib/components/reliability/KpiSparkline.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/LatencyPanel.svelte](../../minion_hub/src/lib/components/reliability/LatencyPanel.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/MetricCard.svelte](../../minion_hub/src/lib/components/reliability/MetricCard.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/PanelHeader.svelte](../../minion_hub/src/lib/components/reliability/PanelHeader.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/PerformanceMonitorPanel.svelte](../../minion_hub/src/lib/components/reliability/PerformanceMonitorPanel.svelte) | reliability | async-function: 47; network: 44; pending-feedback: 34, 42, 56, 245 |
| [minion_hub/src/lib/components/reliability/PluginHealthPanel.svelte](../../minion_hub/src/lib/components/reliability/PluginHealthPanel.svelte) | reliability | poll-or-debounce: 221, 225 |
| [minion_hub/src/lib/components/reliability/ProposedActionsFeed.svelte](../../minion_hub/src/lib/components/reliability/ProposedActionsFeed.svelte) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/architecture/ArchitectureGraph.svelte](../../minion_hub/src/lib/components/reliability/architecture/ArchitectureGraph.svelte) | reliability | async-function: 139, 454; network: 141; svelte-motion: 1132; css-motion: 1132; imperative-motion: 166, 281, 505, 507; pending-feedback: 68, 148, 647; reduced-motion: 117, 119, 120, 415, 417, 418, 444, 446, 491; poll-or-debounce: 450 |
| [minion_hub/src/lib/components/reliability/architecture/build-architecture-graph.ts](../../minion_hub/src/lib/components/reliability/architecture/build-architecture-graph.ts) | reliability | No lexical signal |
| [minion_hub/src/lib/components/reliability/architecture/build-c4-architecture-graph.ts](../../minion_hub/src/lib/components/reliability/architecture/build-c4-architecture-graph.ts) | reliability | pending-feedback: 107 |
| [minion_hub/src/lib/components/scheduling/AppointmentForm.svelte](../../minion_hub/src/lib/components/scheduling/AppointmentForm.svelte) | scheduling | async-function: 173, 198; network: 183, 207; mutation-method: 208; pending-feedback: 93, 175, 194, 203, 253 |
| [minion_hub/src/lib/components/scheduling/AvailabilityEditor.svelte](../../minion_hub/src/lib/components/scheduling/AvailabilityEditor.svelte) | scheduling | async-function: 55, 71; network: 64; mutation-method: 67; refresh: 74; save-gesture: 91, 96; pending-feedback: 45, 56, 80 |
| [minion_hub/src/lib/components/scheduling/BookingCalendar.svelte](../../minion_hub/src/lib/components/scheduling/BookingCalendar.svelte) | scheduling | async-function: 511; svelte-motion: 1093; css-motion: 1093 |
| [minion_hub/src/lib/components/scheduling/BookingCreateForm.svelte](../../minion_hub/src/lib/components/scheduling/BookingCreateForm.svelte) | scheduling | async-function: 98, 140, 220; network: 106, 188, 228, 259; mutation-method: 229, 260; pending-feedback: 71, 100, 120, 225, 269 |
| [minion_hub/src/lib/components/scheduling/BookingDetailDrawer.svelte](../../minion_hub/src/lib/components/scheduling/BookingDetailDrawer.svelte) | scheduling | async-function: 197, 277, 312, 351, 565; network: 199, 282, 293, 321, 337, 357, 567; mutation-method: 283, 322, 358; refresh: 134; save-gesture: 439, 654, 656; pending-feedback: 156, 158, 190, 212, 279, 299, 318, 343, 353, 368, 381 |
| [minion_hub/src/lib/components/scheduling/BookingEditForm.svelte](../../minion_hub/src/lib/components/scheduling/BookingEditForm.svelte) | scheduling | async-function: 116, 182, 195; network: 128, 151, 184, 196; mutation-method: 129, 152, 184, 197; save-gesture: 258; pending-feedback: 113, 121, 162 |
| [minion_hub/src/lib/components/scheduling/BookingsView.svelte](../../minion_hub/src/lib/components/scheduling/BookingsView.svelte) | scheduling | async-function: 69, 102, 127, 169; network: 70, 108, 133, 172; mutation-method: 71, 134, 172; refresh: 75, 160, 369 |
| [minion_hub/src/lib/components/scheduling/EventTypeEditor.svelte](../../minion_hub/src/lib/components/scheduling/EventTypeEditor.svelte) | scheduling | async-function: 125; network: 138, 145; mutation-method: 146; save-gesture: 290; pending-feedback: 96, 130, 154 |
| [minion_hub/src/lib/components/scheduling/MemberCalendarStrip.svelte](../../minion_hub/src/lib/components/scheduling/MemberCalendarStrip.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/ProcedurePickerField.svelte](../../minion_hub/src/lib/components/scheduling/ProcedurePickerField.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/ResourcePickerField.svelte](../../minion_hub/src/lib/components/scheduling/ResourcePickerField.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/RevenueByResource.svelte](../../minion_hub/src/lib/components/scheduling/RevenueByResource.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/SchedulingNav.svelte](../../minion_hub/src/lib/components/scheduling/SchedulingNav.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/ServicePickerField.svelte](../../minion_hub/src/lib/components/scheduling/ServicePickerField.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/UtilizationHeatmap.svelte](../../minion_hub/src/lib/components/scheduling/UtilizationHeatmap.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/WeekHoursEditor.svelte](../../minion_hub/src/lib/components/scheduling/WeekHoursEditor.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/bookings-view.ts](../../minion_hub/src/lib/components/scheduling/bookings-view.ts) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/calendar/CalendarToolbar.svelte](../../minion_hub/src/lib/components/scheduling/calendar/CalendarToolbar.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/calendar/EventHoverCard.svelte](../../minion_hub/src/lib/components/scheduling/calendar/EventHoverCard.svelte) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/calendar/MoveConfirmDialog.svelte](../../minion_hub/src/lib/components/scheduling/calendar/MoveConfirmDialog.svelte) | scheduling | async-function: 66; network: 70; mutation-method: 73; save-gesture: 24, 38, 84, 143; optimistic: 4, 58, 62, 107; pending-feedback: 41, 68, 110, 142 |
| [minion_hub/src/lib/components/scheduling/calendar/SchedulingCalendar.svelte](../../minion_hub/src/lib/components/scheduling/calendar/SchedulingCalendar.svelte) | scheduling | save-gesture: 297 |
| [minion_hub/src/lib/components/scheduling/calendar/calendar.svelte.ts](../../minion_hub/src/lib/components/scheduling/calendar/calendar.svelte.ts) | scheduling | network: 154; pending-feedback: 80 |
| [minion_hub/src/lib/components/scheduling/calendar/ec-skin.css](../../minion_hub/src/lib/components/scheduling/calendar/ec-skin.css) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/calendar/types.ts](../../minion_hub/src/lib/components/scheduling/calendar/types.ts) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/calendar-window.ts](../../minion_hub/src/lib/components/scheduling/calendar-window.ts) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/scheduling/service-rows.ts](../../minion_hub/src/lib/components/scheduling/service-rows.ts) | scheduling | No lexical signal |
| [minion_hub/src/lib/components/sessions/LiveRunWidget.svelte](../../minion_hub/src/lib/components/sessions/LiveRunWidget.svelte) | sessions | poll-or-debounce: 27 |
| [minion_hub/src/lib/components/sessions/SessionDropdown.svelte](../../minion_hub/src/lib/components/sessions/SessionDropdown.svelte) | sessions | No lexical signal |
| [minion_hub/src/lib/components/sessions/SessionKanban.svelte](../../minion_hub/src/lib/components/sessions/SessionKanban.svelte) | sessions | async-function: 50; network: 63; mutation-method: 66 |
| [minion_hub/src/lib/components/sessions/SessionMonitor.svelte](../../minion_hub/src/lib/components/sessions/SessionMonitor.svelte) | sessions | async-function: 63; network: 69; pending-feedback: 25, 64, 88 |
| [minion_hub/src/lib/components/sessions/SessionViewer.svelte](../../minion_hub/src/lib/components/sessions/SessionViewer.svelte) | sessions | async-function: 74; network: 81, 104, 115; mutation-method: 105; imperative-motion: 177; pending-feedback: 48, 75, 88, 143 |
| [minion_hub/src/lib/components/sessions/SessionsList.svelte](../../minion_hub/src/lib/components/sessions/SessionsList.svelte) | sessions | No lexical signal |
| [minion_hub/src/lib/components/settings/BackupsTab.svelte](../../minion_hub/src/lib/components/settings/BackupsTab.svelte) | settings | async-function: 81, 100, 129, 146, 161, 188, 219, 236; network: 84, 104, 133, 151, 169, 196, 223; mutation-method: 107, 134, 169, 197, 225; refresh: 119; save-gesture: 364; imperative-motion: 256; pending-feedback: 51, 101, 124, 362, 369, 401 |
| [minion_hub/src/lib/components/settings/CRTConfigModal.svelte](../../minion_hub/src/lib/components/settings/CRTConfigModal.svelte) | settings | save-gesture: 250; css-motion: 219, 224, 239 |
| [minion_hub/src/lib/components/settings/DynamicSecretGroup.svelte](../../minion_hub/src/lib/components/settings/DynamicSecretGroup.svelte) | settings | async-function: 29, 39; pending-feedback: 21, 91, 108 |
| [minion_hub/src/lib/components/settings/GatewayUpdateCard.svelte](../../minion_hub/src/lib/components/settings/GatewayUpdateCard.svelte) | settings | async-function: 83, 107, 141, 164, 198, 225, 244; network: 84, 200, 248; mutation-method: 85, 249; pending-feedback: 353, 363, 481; poll-or-debounce: 110, 311 |
| [minion_hub/src/lib/components/settings/PatternSettings.svelte](../../minion_hub/src/lib/components/settings/PatternSettings.svelte) | settings | No lexical signal |
| [minion_hub/src/lib/components/settings/SecretEditModal.svelte](../../minion_hub/src/lib/components/settings/SecretEditModal.svelte) | settings | async-function: 33; save-gesture: 13, 16, 38, 88; pending-feedback: 19, 29, 35, 42, 87 |
| [minion_hub/src/lib/components/settings/SecretStatusPill.svelte](../../minion_hub/src/lib/components/settings/SecretStatusPill.svelte) | settings | No lexical signal |
| [minion_hub/src/lib/components/settings/SecretsSection.svelte](../../minion_hub/src/lib/components/settings/SecretsSection.svelte) | settings | async-function: 50, 92, 94, 107, 110, 120, 139, 141, 158, 160, 173, 197; save-gesture: 333; pending-feedback: 26, 52, 67 |
| [minion_hub/src/lib/components/settings/SettingsNav.svelte](../../minion_hub/src/lib/components/settings/SettingsNav.svelte) | settings | No lexical signal |
| [minion_hub/src/lib/components/settings/SettingsScrollspy.svelte](../../minion_hub/src/lib/components/settings/SettingsScrollspy.svelte) | settings | svelte-motion: 116, 132, 163; css-motion: 116, 132, 163 |
| [minion_hub/src/lib/components/settings/SettingsSkeleton.svelte](../../minion_hub/src/lib/components/settings/SettingsSkeleton.svelte) | settings | css-motion: 48, 51 |
| [minion_hub/src/lib/components/settings/SparklineStyleSettings.svelte](../../minion_hub/src/lib/components/settings/SparklineStyleSettings.svelte) | settings | No lexical signal |
| [minion_hub/src/lib/components/shared/DocTimeline.svelte](../../minion_hub/src/lib/components/shared/DocTimeline.svelte) | shared | async-function: 17; pending-feedback: 15, 20, 25 |
| [minion_hub/src/lib/components/shells/ProvisionForm.svelte](../../minion_hub/src/lib/components/shells/ProvisionForm.svelte) | shells | async-function: 19; save-gesture: 56, 129; pending-feedback: 129 |
| [minion_hub/src/lib/components/shells/QuotaStrip.svelte](../../minion_hub/src/lib/components/shells/QuotaStrip.svelte) | shells | No lexical signal |
| [minion_hub/src/lib/components/shells/ShellRow.svelte](../../minion_hub/src/lib/components/shells/ShellRow.svelte) | shells | No lexical signal |
| [minion_hub/src/lib/components/socials/PlatformIcon.svelte](../../minion_hub/src/lib/components/socials/PlatformIcon.svelte) | socials | No lexical signal |
| [minion_hub/src/lib/components/socials/VideoPlayer.svelte](../../minion_hub/src/lib/components/socials/VideoPlayer.svelte) | socials | async-function: 47; svelte-motion: 244; css-motion: 244 |
| [minion_hub/src/lib/components/socials/video-time.ts](../../minion_hub/src/lib/components/socials/video-time.ts) | socials | No lexical signal |
| [minion_hub/src/lib/components/stock/ConsumptionGauge.svelte](../../minion_hub/src/lib/components/stock/ConsumptionGauge.svelte) | stock | No lexical signal |
| [minion_hub/src/lib/components/stock/ShapePicker.svelte](../../minion_hub/src/lib/components/stock/ShapePicker.svelte) | stock | No lexical signal |
| [minion_hub/src/lib/components/stock/StockItemCreateForm.svelte](../../minion_hub/src/lib/components/stock/StockItemCreateForm.svelte) | stock | async-function: 55; network: 61; mutation-method: 62; save-gesture: 72, 78, 85, 121, 126; pending-feedback: 35, 58, 80, 124 |
| [minion_hub/src/lib/components/stock/StockItemPicker.svelte](../../minion_hub/src/lib/components/stock/StockItemPicker.svelte) | stock | No lexical signal |
| [minion_hub/src/lib/components/stock/StockNav.svelte](../../minion_hub/src/lib/components/stock/StockNav.svelte) | stock | No lexical signal |
| [minion_hub/src/lib/components/stock/UnitDiagram.svelte](../../minion_hub/src/lib/components/stock/UnitDiagram.svelte) | stock | No lexical signal |
| [minion_hub/src/lib/components/stock/stock-svg.ts](../../minion_hub/src/lib/components/stock/stock-svg.ts) | stock | No lexical signal |
| [minion_hub/src/lib/components/stock/stock-ui.ts](../../minion_hub/src/lib/components/stock/stock-ui.ts) | stock | No lexical signal |
| [minion_hub/src/lib/components/support/support-format.ts](../../minion_hub/src/lib/components/support/support-format.ts) | support | No lexical signal |
| [minion_hub/src/lib/components/tags/TagChip.svelte](../../minion_hub/src/lib/components/tags/TagChip.svelte) | tags | svelte-motion: 101; css-motion: 101 |
| [minion_hub/src/lib/components/tags/TagDot.svelte](../../minion_hub/src/lib/components/tags/TagDot.svelte) | tags | No lexical signal |
| [minion_hub/src/lib/components/tags/TagsField.svelte](../../minion_hub/src/lib/components/tags/TagsField.svelte) | tags | async-function: 55; network: 61; mutation-method: 62; pending-feedback: 42, 58, 73 |
| [minion_hub/src/lib/components/tags/index.ts](../../minion_hub/src/lib/components/tags/index.ts) | tags | No lexical signal |
| [minion_hub/src/lib/components/tags/tag-summary.ts](../../minion_hub/src/lib/components/tags/tag-summary.ts) | tags | No lexical signal |
| [minion_hub/src/lib/components/tasks/KanbanCol.svelte](../../minion_hub/src/lib/components/tasks/KanbanCol.svelte) | tasks | No lexical signal |
| [minion_hub/src/lib/components/tasks/TaskCard.svelte](../../minion_hub/src/lib/components/tasks/TaskCard.svelte) | tasks | No lexical signal |
| [minion_hub/src/lib/components/team/PeopleView.svelte](../../minion_hub/src/lib/components/team/PeopleView.svelte) | team | async-function: 257, 272, 337, 347, 383, 395; network: 260, 275; mutation-method: 262, 277; refresh: 263, 278; save-gesture: 738; optimistic: 422; pending-feedback: 294, 338, 344, 349, 356, 385, 392, 397, 399 |
| [minion_hub/src/lib/components/team/ResourcesTab.svelte](../../minion_hub/src/lib/components/team/ResourcesTab.svelte) | team | async-function: 57, 74, 92; network: 61; refresh: 64; optimistic: 7, 86; pending-feedback: 48, 59, 71, 147 |
| [minion_hub/src/lib/components/team/RosterTimelineHeader.svelte](../../minion_hub/src/lib/components/team/RosterTimelineHeader.svelte) | team | No lexical signal |
| [minion_hub/src/lib/components/team/RosterTimelineRow.svelte](../../minion_hub/src/lib/components/team/RosterTimelineRow.svelte) | team | No lexical signal |
| [minion_hub/src/lib/components/team/TeamNav.svelte](../../minion_hub/src/lib/components/team/TeamNav.svelte) | team | No lexical signal |
| [minion_hub/src/lib/components/team/TeamSettingsView.svelte](../../minion_hub/src/lib/components/team/TeamSettingsView.svelte) | team | async-function: 59, 95, 168, 182, 220, 287; network: 63, 97; mutation-method: 100; refresh: 66, 104; save-gesture: 409, 506, 565; optimistic: 7, 173; pending-feedback: 56, 61, 73, 353 |
| [minion_hub/src/lib/components/team/TimeOffCalendar.svelte](../../minion_hub/src/lib/components/team/TimeOffCalendar.svelte) | team | No lexical signal |
| [minion_hub/src/lib/components/team/TimeOffView.svelte](../../minion_hub/src/lib/components/team/TimeOffView.svelte) | team | async-function: 145, 215; network: 149, 211, 219; mutation-method: 151, 222; refresh: 152, 233; pending-feedback: 72, 147, 157, 217, 241 |
| [minion_hub/src/lib/components/team/balances.ts](../../minion_hub/src/lib/components/team/balances.ts) | team | pending-feedback: 46 |
| [minion_hub/src/lib/components/team/hr-error.ts](../../minion_hub/src/lib/components/team/hr-error.ts) | team | svelte-motion: 14 |
| [minion_hub/src/lib/components/team/tabs.ts](../../minion_hub/src/lib/components/team/tabs.ts) | team | No lexical signal |
| [minion_hub/src/lib/components/team/timeline.svelte.ts](../../minion_hub/src/lib/components/team/timeline.svelte.ts) | team | No lexical signal |
| [minion_hub/src/lib/components/team/types.ts](../../minion_hub/src/lib/components/team/types.ts) | team | No lexical signal |
| [minion_hub/src/lib/components/ui/Avatar.svelte](../../minion_hub/src/lib/components/ui/Avatar.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/Chip.svelte](../../minion_hub/src/lib/components/ui/Chip.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/Combobox.svelte](../../minion_hub/src/lib/components/ui/Combobox.svelte) | ui | svelte-motion: 212, 251, 260, 296; css-motion: 212, 251, 260, 296 |
| [minion_hub/src/lib/components/ui/DraggableDialog.svelte](../../minion_hub/src/lib/components/ui/DraggableDialog.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/Dropdown.svelte](../../minion_hub/src/lib/components/ui/Dropdown.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/EmptyState.svelte](../../minion_hub/src/lib/components/ui/EmptyState.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/EntityChip.svelte](../../minion_hub/src/lib/components/ui/EntityChip.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/MathFormula.svelte](../../minion_hub/src/lib/components/ui/MathFormula.svelte) | ui | imperative-motion: 38 |
| [minion_hub/src/lib/components/ui/Modal.svelte](../../minion_hub/src/lib/components/ui/Modal.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/MultiSelectFilter.svelte](../../minion_hub/src/lib/components/ui/MultiSelectFilter.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/PageHeader.svelte](../../minion_hub/src/lib/components/ui/PageHeader.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/Picker.svelte](../../minion_hub/src/lib/components/ui/Picker.svelte) | ui | async-function: 209; svelte-motion: 907, 936; css-motion: 907, 936; pending-feedback: 123, 212, 227, 589; poll-or-debounce: 207, 234, 235, 257 |
| [minion_hub/src/lib/components/ui/PickerCombobox.svelte](../../minion_hub/src/lib/components/ui/PickerCombobox.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/Popover.svelte](../../minion_hub/src/lib/components/ui/Popover.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/ProgressBar.svelte](../../minion_hub/src/lib/components/ui/ProgressBar.svelte) | ui | svelte-motion: 122, 130; css-motion: 122, 130, 131, 133, 143; reduced-motion: 141 |
| [minion_hub/src/lib/components/ui/SegmentedControl.svelte](../../minion_hub/src/lib/components/ui/SegmentedControl.svelte) | ui | svelte-motion: 89; css-motion: 89 |
| [minion_hub/src/lib/components/ui/Select.svelte](../../minion_hub/src/lib/components/ui/Select.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/SideNav.svelte](../../minion_hub/src/lib/components/ui/SideNav.svelte) | ui | svelte-motion: 219, 230; css-motion: 219, 230 |
| [minion_hub/src/lib/components/ui/Skeleton.svelte](../../minion_hub/src/lib/components/ui/Skeleton.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/Spinner.svelte](../../minion_hub/src/lib/components/ui/Spinner.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/StatusDot.svelte](../../minion_hub/src/lib/components/ui/StatusDot.svelte) | ui | svelte-motion: 88; css-motion: 88; reduced-motion: 86 |
| [minion_hub/src/lib/components/ui/Tabs.svelte](../../minion_hub/src/lib/components/ui/Tabs.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/Toggle.svelte](../../minion_hub/src/lib/components/ui/Toggle.svelte) | ui | optimistic: 13; pending-feedback: 12, 35, 56, 67 |
| [minion_hub/src/lib/components/ui/Tooltip.svelte](../../minion_hub/src/lib/components/ui/Tooltip.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/AppViewport.svelte](../../minion_hub/src/lib/components/ui/foundations/AppViewport.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/AsyncBoundary.svelte](../../minion_hub/src/lib/components/ui/foundations/AsyncBoundary.svelte) | ui | pending-feedback: 45, 55 |
| [minion_hub/src/lib/components/ui/foundations/ConfirmDialog.svelte](../../minion_hub/src/lib/components/ui/foundations/ConfirmDialog.svelte) | ui | async-function: 52; pending-feedback: 43, 54, 63, 95 |
| [minion_hub/src/lib/components/ui/foundations/Dialog.svelte](../../minion_hub/src/lib/components/ui/foundations/Dialog.svelte) | ui | svelte-motion: 314; css-motion: 314, 339, 342, 350, 353, 358, 362, 366, 370, 374, 378, 415, 425, 435, 443, 451, 459, 467, 475, 483, 491; reduced-motion: 517 |
| [minion_hub/src/lib/components/ui/foundations/DraggableWindow.svelte](../../minion_hub/src/lib/components/ui/foundations/DraggableWindow.svelte) | ui | svelte-motion: 444; css-motion: 444; reduced-motion: 442 |
| [minion_hub/src/lib/components/ui/foundations/FieldGroup.svelte](../../minion_hub/src/lib/components/ui/foundations/FieldGroup.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/FormField.svelte](../../minion_hub/src/lib/components/ui/foundations/FormField.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/FormFieldset.svelte](../../minion_hub/src/lib/components/ui/foundations/FormFieldset.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/Layer.svelte](../../minion_hub/src/lib/components/ui/foundations/Layer.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/PageBody.svelte](../../minion_hub/src/lib/components/ui/foundations/PageBody.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/PageShell.svelte](../../minion_hub/src/lib/components/ui/foundations/PageShell.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/Portal.svelte](../../minion_hub/src/lib/components/ui/foundations/Portal.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/PublicTaskShell.svelte](../../minion_hub/src/lib/components/ui/foundations/PublicTaskShell.svelte) | ui | css-motion: 135, 325, 363; reduced-motion: 361 |
| [minion_hub/src/lib/components/ui/foundations/SectionNav.svelte](../../minion_hub/src/lib/components/ui/foundations/SectionNav.svelte) | ui | svelte-motion: 232; css-motion: 232 |
| [minion_hub/src/lib/components/ui/foundations/SectionShell.svelte](../../minion_hub/src/lib/components/ui/foundations/SectionShell.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/Sheet.svelte](../../minion_hub/src/lib/components/ui/foundations/Sheet.svelte) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/dialog-scroll-lock.ts](../../minion_hub/src/lib/components/ui/foundations/dialog-scroll-lock.ts) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/dialog.ts](../../minion_hub/src/lib/components/ui/foundations/dialog.ts) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/draggable-window.ts](../../minion_hub/src/lib/components/ui/foundations/draggable-window.ts) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/index.ts](../../minion_hub/src/lib/components/ui/foundations/index.ts) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/foundations/layer.ts](../../minion_hub/src/lib/components/ui/foundations/layer.ts) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/icon-sizes.ts](../../minion_hub/src/lib/components/ui/icon-sizes.ts) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/index.ts](../../minion_hub/src/lib/components/ui/index.ts) | ui | No lexical signal |
| [minion_hub/src/lib/components/ui/picker.ts](../../minion_hub/src/lib/components/ui/picker.ts) | ui | No lexical signal |
| [minion_hub/src/lib/components/users/AccountNav.svelte](../../minion_hub/src/lib/components/users/AccountNav.svelte) | users | No lexical signal |
| [minion_hub/src/lib/components/users/AvatarMenu.svelte](../../minion_hub/src/lib/components/users/AvatarMenu.svelte) | users | No lexical signal |
| [minion_hub/src/lib/components/users/BindingsTab.svelte](../../minion_hub/src/lib/components/users/BindingsTab.svelte) | users | save-gesture: 178, 213, 233, 241, 248; pending-feedback: 85 |
| [minion_hub/src/lib/components/users/ChannelAccountStateBadge.svelte](../../minion_hub/src/lib/components/users/ChannelAccountStateBadge.svelte) | users | No lexical signal |
| [minion_hub/src/lib/components/users/ChannelLinking.svelte](../../minion_hub/src/lib/components/users/ChannelLinking.svelte) | users | async-function: 114, 136, 162, 270; network: 140; mutation-method: 141; refresh: 145, 170, 271; pending-feedback: 103, 116, 126 |
| [minion_hub/src/lib/components/users/ConnectedIdentities.svelte](../../minion_hub/src/lib/components/users/ConnectedIdentities.svelte) | users | async-function: 31, 43, 61; network: 34, 64; mutation-method: 34, 64; refresh: 37, 66 |
| [minion_hub/src/lib/components/users/EditableName.svelte](../../minion_hub/src/lib/components/users/EditableName.svelte) | users | save-gesture: 15, 19, 38, 67; pending-feedback: 22, 37, 39 |
| [minion_hub/src/lib/components/users/IdentityLinkPopover.svelte](../../minion_hub/src/lib/components/users/IdentityLinkPopover.svelte) | users | async-function: 18, 37, 57; network: 21, 40, 61; mutation-method: 22, 41, 62; pending-feedback: 13, 19, 33, 38, 53, 59, 73 |
| [minion_hub/src/lib/components/users/IdentityList.svelte](../../minion_hub/src/lib/components/users/IdentityList.svelte) | users | async-function: 29, 43; network: 32, 45; mutation-method: 45; pending-feedback: 19, 30, 39 |
| [minion_hub/src/lib/components/users/JoinLinkForm.svelte](../../minion_hub/src/lib/components/users/JoinLinkForm.svelte) | users | async-function: 37, 65; network: 46; mutation-method: 47; save-gesture: 76, 120 |
| [minion_hub/src/lib/components/users/MemberAccessControls.svelte](../../minion_hub/src/lib/components/users/MemberAccessControls.svelte) | users | async-function: 34, 52; network: 39, 56; mutation-method: 40, 57; refresh: 45, 62 |
| [minion_hub/src/lib/components/users/PasswordCard.svelte](../../minion_hub/src/lib/components/users/PasswordCard.svelte) | users | async-function: 21; network: 36; mutation-method: 37; refresh: 58; save-gesture: 49, 53, 60, 104; pending-feedback: 12, 34, 62, 104 |
| [minion_hub/src/lib/components/users/ProfileCard.svelte](../../minion_hub/src/lib/components/users/ProfileCard.svelte) | users | async-function: 19; network: 21; mutation-method: 22; refresh: 28; save-gesture: 49 |
| [minion_hub/src/lib/components/users/RbacRolesSection.svelte](../../minion_hub/src/lib/components/users/RbacRolesSection.svelte) | users | async-function: 72, 99, 215, 234, 257, 286, 310, 327, 344, 367, 383, 397; network: 76, 103, 221, 235; mutation-method: 77, 103, 222, 236; refresh: 93, 113, 275, 278, 300, 303, 317, 320, 335, 338, 357, 360, 379, 392, 413; save-gesture: 92, 917; optimistic: 204; pending-feedback: 54, 264, 280, 289, 305, 312, 322, 330, 340, 352, 362, 369, 378, 385, 391, 401, 412, 455, 541, 553, 578, 597, 821 |
| [minion_hub/src/lib/components/users/SharedAccountsPanel.svelte](../../minion_hub/src/lib/components/users/SharedAccountsPanel.svelte) | users | async-function: 28, 41, 60, 76; network: 31, 44, 61, 79; mutation-method: 45, 80; pending-feedback: 23, 26, 29, 37, 42, 56, 77, 92, 131, 164 |
| [minion_hub/src/lib/components/users/SharedInboxes.svelte](../../minion_hub/src/lib/components/users/SharedInboxes.svelte) | users | async-function: 22; network: 26, 27; mutation-method: 26, 28; refresh: 34; pending-feedback: 20, 23, 38, 68 |
| [minion_hub/src/lib/components/users/TeamTab.svelte](../../minion_hub/src/lib/components/users/TeamTab.svelte) | users | async-function: 79, 108, 123, 140, 155, 163, 179, 214; network: 80, 112, 125, 143, 165, 192, 198, 216, 223; mutation-method: 81, 143, 165, 193, 198, 217; refresh: 95, 206; save-gesture: 428; pending-feedback: 70, 109, 119 |
| [minion_hub/src/lib/components/users/TelegramClaimCard.svelte](../../minion_hub/src/lib/components/users/TelegramClaimCard.svelte) | users | async-function: 53, 78; network: 56, 82; mutation-method: 83; refresh: 63; pending-feedback: 185, 198; poll-or-debounce: 96 |
| [minion_hub/src/lib/components/users/UserAvatar.svelte](../../minion_hub/src/lib/components/users/UserAvatar.svelte) | users | No lexical signal |
| [minion_hub/src/lib/components/users/UserEditor.svelte](../../minion_hub/src/lib/components/users/UserEditor.svelte) | users | async-function: 59, 87; network: 61; save-gesture: 21, 25, 91, 145; pending-feedback: 37, 89, 98; poll-or-debounce: 7, 58 |
| [minion_hub/src/lib/components/users/UsernameCard.svelte](../../minion_hub/src/lib/components/users/UsernameCard.svelte) | users | async-function: 21; network: 26; mutation-method: 27; refresh: 41; save-gesture: 39, 43, 70; optimistic: 12; pending-feedback: 15, 23, 45, 69 |
| [minion_hub/src/lib/components/users/WhatsAppClaimCard.svelte](../../minion_hub/src/lib/components/users/WhatsAppClaimCard.svelte) | users | async-function: 71, 106; network: 80, 114; mutation-method: 81, 115; refresh: 130; poll-or-debounce: 65 |
| [minion_hub/src/lib/components/users/avatar/AvatarEditorModal.svelte](../../minion_hub/src/lib/components/users/avatar/AvatarEditorModal.svelte) | users | async-function: 77, 92, 101, 122; network: 81, 84, 93; mutation-method: 81, 85, 94; refresh: 113, 127; save-gesture: 111, 245; pending-feedback: 35, 102, 118, 123, 132, 219 |
| [minion_hub/src/lib/components/users/avatar/dicebear.ts](../../minion_hub/src/lib/components/users/avatar/dicebear.ts) | users | No lexical signal |
| [minion_hub/src/lib/components/users/button-props.ts](../../minion_hub/src/lib/components/users/button-props.ts) | users | No lexical signal |
| [minion_hub/src/lib/components/users/channel-account-state.ts](../../minion_hub/src/lib/components/users/channel-account-state.ts) | users | No lexical signal |
| [minion_hub/src/lib/components/workforce/ApprovalPayload.svelte](../../minion_hub/src/lib/components/workforce/ApprovalPayload.svelte) | workforce | No lexical signal |
| [minion_hub/src/lib/components/workforce/FactoryIntakeCard.svelte](../../minion_hub/src/lib/components/workforce/FactoryIntakeCard.svelte) | workforce | css-motion: 167, 262, 269; pending-feedback: 8; reduced-motion: 267 |
| [minion_hub/src/lib/components/workforce/FactoryRoutingDecision.svelte](../../minion_hub/src/lib/components/workforce/FactoryRoutingDecision.svelte) | workforce | async-function: 72; network: 101; mutation-method: 104; save-gesture: 110, 115, 235; pending-feedback: 63, 98, 117 |
| [minion_hub/src/lib/components/workforce/JsonView.svelte](../../minion_hub/src/lib/components/workforce/JsonView.svelte) | workforce | No lexical signal |
| [minion_hub/src/lib/components/workforce/KanbanNavRail.svelte](../../minion_hub/src/lib/components/workforce/KanbanNavRail.svelte) | workforce | No lexical signal |
| [minion_hub/src/lib/components/workforce/OrgChartNode.svelte](../../minion_hub/src/lib/components/workforce/OrgChartNode.svelte) | workforce | pending-feedback: 63 |
| [minion_hub/src/lib/components/workforce/OrgFitController.svelte](../../minion_hub/src/lib/components/workforce/OrgFitController.svelte) | workforce | imperative-motion: 15 |
| [minion_hub/src/lib/components/workforce/PipelineGateControls.svelte](../../minion_hub/src/lib/components/workforce/PipelineGateControls.svelte) | workforce | async-function: 107; network: 120; mutation-method: 121; save-gesture: 126; pending-feedback: 36, 117, 135 |
| [minion_hub/src/lib/components/workforce/PipelineStepper.svelte](../../minion_hub/src/lib/components/workforce/PipelineStepper.svelte) | workforce | No lexical signal |
| [minion_hub/src/lib/components/workforce/PipelineTrace.svelte](../../minion_hub/src/lib/components/workforce/PipelineTrace.svelte) | workforce | No lexical signal |
| [minion_hub/src/lib/components/workforce/pipeline-columns.ts](../../minion_hub/src/lib/components/workforce/pipeline-columns.ts) | workforce | No lexical signal |
| [minion_hub/src/lib/components/workforce/pipeline-draft.ts](../../minion_hub/src/lib/components/workforce/pipeline-draft.ts) | workforce | No lexical signal |
| [minion_hub/src/lib/components/workshop/AgentActionBar.svelte](../../minion_hub/src/lib/components/workshop/AgentActionBar.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/ChatPanel.svelte](../../minion_hub/src/lib/components/workshop/ChatPanel.svelte) | workshop | svelte-motion: 4, 80; css-motion: 80 |
| [minion_hub/src/lib/components/workshop/ContextMenu.svelte](../../minion_hub/src/lib/components/workshop/ContextMenu.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/ConversationIndicator.svelte](../../minion_hub/src/lib/components/workshop/ConversationIndicator.svelte) | workshop | css-motion: 46, 54, 57, 68 |
| [minion_hub/src/lib/components/workshop/ConversationSidebar.svelte](../../minion_hub/src/lib/components/workshop/ConversationSidebar.svelte) | workshop | async-function: 108; svelte-motion: 9, 116; css-motion: 116 |
| [minion_hub/src/lib/components/workshop/DebugOverlay.svelte](../../minion_hub/src/lib/components/workshop/DebugOverlay.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/ElementContextMenu.svelte](../../minion_hub/src/lib/components/workshop/ElementContextMenu.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/InboxOverlay.svelte](../../minion_hub/src/lib/components/workshop/InboxOverlay.svelte) | workshop | async-function: 137; network: 149; mutation-method: 150 |
| [minion_hub/src/lib/components/workshop/MessageBoardOverlay.svelte](../../minion_hub/src/lib/components/workshop/MessageBoardOverlay.svelte) | workshop | poll-or-debounce: 3, 18 |
| [minion_hub/src/lib/components/workshop/PinboardOverlay.svelte](../../minion_hub/src/lib/components/workshop/PinboardOverlay.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/PortalOverlay.svelte](../../minion_hub/src/lib/components/workshop/PortalOverlay.svelte) | workshop | poll-or-debounce: 3, 26 |
| [minion_hub/src/lib/components/workshop/RelationshipPrompt.svelte](../../minion_hub/src/lib/components/workshop/RelationshipPrompt.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/RulebookOverlay.svelte](../../minion_hub/src/lib/components/workshop/RulebookOverlay.svelte) | workshop | poll-or-debounce: 3, 18 |
| [minion_hub/src/lib/components/workshop/SpeechBubble.svelte](../../minion_hub/src/lib/components/workshop/SpeechBubble.svelte) | workshop | css-motion: 29, 45 |
| [minion_hub/src/lib/components/workshop/WorkshopAgentPill.svelte](../../minion_hub/src/lib/components/workshop/WorkshopAgentPill.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/WorkshopCanvas.svelte](../../minion_hub/src/lib/components/workshop/WorkshopCanvas.svelte) | workshop | async-function: 331, 663, 1269, 1584, 1628; network: 343; imperative-motion: 248, 250, 354, 524; reduced-motion: 437, 439 |
| [minion_hub/src/lib/components/workshop/WorkshopNav.svelte](../../minion_hub/src/lib/components/workshop/WorkshopNav.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/WorkshopPalette.svelte](../../minion_hub/src/lib/components/workshop/WorkshopPalette.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/WorkshopToolbar.svelte](../../minion_hub/src/lib/components/workshop/WorkshopToolbar.svelte) | workshop | save-gesture: 138 |
| [minion_hub/src/lib/components/workshop/_workshop-canvas/CanvasHtmlOverlays.svelte](../../minion_hub/src/lib/components/workshop/_workshop-canvas/CanvasHtmlOverlays.svelte) | workshop | css-motion: 171, 175, 178, 190 |
| [minion_hub/src/lib/components/workshop/_workshop-canvas/ConversationsToggleButton.svelte](../../minion_hub/src/lib/components/workshop/_workshop-canvas/ConversationsToggleButton.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/_workshop-canvas/TaskPromptDialog.svelte](../../minion_hub/src/lib/components/workshop/_workshop-canvas/TaskPromptDialog.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/_workshop-canvas/WorkshopAgentControls.svelte](../../minion_hub/src/lib/components/workshop/_workshop-canvas/WorkshopAgentControls.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/_workshop-canvas/WorkshopConfigPanel.svelte](../../minion_hub/src/lib/components/workshop/_workshop-canvas/WorkshopConfigPanel.svelte) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/_workshop-canvas/types.ts](../../minion_hub/src/lib/components/workshop/_workshop-canvas/types.ts) | workshop | No lexical signal |
| [minion_hub/src/lib/components/workshop/experiments/CompareTab.svelte](../../minion_hub/src/lib/components/workshop/experiments/CompareTab.svelte) | workshop | async-function: 50, 95, 116, 184; save-gesture: 284, 297, 511, 513, 514 |
| [minion_hub/src/lib/components/workshop/experiments/GroupChatTab.svelte](../../minion_hub/src/lib/components/workshop/experiments/GroupChatTab.svelte) | workshop | async-function: 43, 59, 79, 107, 127 |
| [minion_hub/src/lib/components/workshop/experiments/LeaderboardStrip.svelte](../../minion_hub/src/lib/components/workshop/experiments/LeaderboardStrip.svelte) | workshop | refresh: 13 |
| [minion_hub/src/lib/components/workshop/experiments/LeaderboardTab.svelte](../../minion_hub/src/lib/components/workshop/experiments/LeaderboardTab.svelte) | workshop | pending-feedback: 10 |
| [minion_hub/src/lib/components/workshop/experiments/leaderboard-query.ts](../../minion_hub/src/lib/components/workshop/experiments/leaderboard-query.ts) | workshop | async-function: 12; network: 13 |
| [minion_hub/src/lib/data/tool-manifest.ts](../../minion_hub/src/lib/data/tool-manifest.ts) | shared | No lexical signal |
| [minion_hub/src/lib/export/table-export.ts](../../minion_hub/src/lib/export/table-export.ts) | shared | No lexical signal |
| [minion_hub/src/lib/finance/period.ts](../../minion_hub/src/lib/finance/period.ts) | shared | No lexical signal |
| [minion_hub/src/lib/flows/flow-activation.ts](../../minion_hub/src/lib/flows/flow-activation.ts) | shared | async-function: 25 |
| [minion_hub/src/lib/flows/flow-diff.ts](../../minion_hub/src/lib/flows/flow-diff.ts) | shared | No lexical signal |
| [minion_hub/src/lib/flows/flow-ops.ts](../../minion_hub/src/lib/flows/flow-ops.ts) | shared | No lexical signal |
| [minion_hub/src/lib/flows/flow-variables.ts](../../minion_hub/src/lib/flows/flow-variables.ts) | shared | No lexical signal |
| [minion_hub/src/lib/flows/groups.ts](../../minion_hub/src/lib/flows/groups.ts) | shared | No lexical signal |
| [minion_hub/src/lib/flows/master-flows.ts](../../minion_hub/src/lib/flows/master-flows.ts) | shared | optimistic: 470, 498, 509; poll-or-debounce: 134, 147, 148, 154, 227, 228, 229, 230 |
| [minion_hub/src/lib/flows/plugin-source.ts](../../minion_hub/src/lib/flows/plugin-source.ts) | shared | No lexical signal |
| [minion_hub/src/lib/flows/reconcile-plan.ts](../../minion_hub/src/lib/flows/reconcile-plan.ts) | shared | No lexical signal |
| [minion_hub/src/lib/hotkeys/index.ts](../../minion_hub/src/lib/hotkeys/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/i18n.ts](../../minion_hub/src/lib/i18n.ts) | shared | No lexical signal |
| [minion_hub/src/lib/modules/availability.ts](../../minion_hub/src/lib/modules/availability.ts) | shared | No lexical signal |
| [minion_hub/src/lib/modules/route-guard.ts](../../minion_hub/src/lib/modules/route-guard.ts) | shared | No lexical signal |
| [minion_hub/src/lib/nav/back-nav.svelte.ts](../../minion_hub/src/lib/nav/back-nav.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/nav/modules.ts](../../minion_hub/src/lib/nav/modules.ts) | shared | No lexical signal |
| [minion_hub/src/lib/nav/prefill.ts](../../minion_hub/src/lib/nav/prefill.ts) | shared | No lexical signal |
| [minion_hub/src/lib/nav/routes.ts](../../minion_hub/src/lib/nav/routes.ts) | shared | No lexical signal |
| [minion_hub/src/lib/navigation.ts](../../minion_hub/src/lib/navigation.ts) | shared | No lexical signal |
| [minion_hub/src/lib/org-kind.ts](../../minion_hub/src/lib/org-kind.ts) | shared | No lexical signal |
| [minion_hub/src/lib/pacer/index.svelte.ts](../../minion_hub/src/lib/pacer/index.svelte.ts) | shared | poll-or-debounce: 2, 8, 14, 15, 20, 21, 24, 25, 43, 44, 57, 59, 61, 78, 79, 81, 83, 84, 87 |
| [minion_hub/src/lib/permissions.ts](../../minion_hub/src/lib/permissions.ts) | shared | No lexical signal |
| [minion_hub/src/lib/pii.ts](../../minion_hub/src/lib/pii.ts) | shared | No lexical signal |
| [minion_hub/src/lib/plugins/PluginControlCenter.svelte](../../minion_hub/src/lib/plugins/PluginControlCenter.svelte) | shared | No lexical signal |
| [minion_hub/src/lib/plugins/PluginIframe.svelte](../../minion_hub/src/lib/plugins/PluginIframe.svelte) | shared | async-function: 23; network: 29, 30, 340; save-gesture: 298, 406, 410, 423; pending-feedback: 127, 190, 300 |
| [minion_hub/src/lib/plugins/PluginSlotHost.svelte](../../minion_hub/src/lib/plugins/PluginSlotHost.svelte) | shared | No lexical signal |
| [minion_hub/src/lib/plugins/bridge-host.ts](../../minion_hub/src/lib/plugins/bridge-host.ts) | shared | save-gesture: 20, 45 |
| [minion_hub/src/lib/plugins/bridge-protocol.ts](../../minion_hub/src/lib/plugins/bridge-protocol.ts) | shared | save-gesture: 310, 319 |
| [minion_hub/src/lib/plugins/compat.ts](../../minion_hub/src/lib/plugins/compat.ts) | shared | No lexical signal |
| [minion_hub/src/lib/plugins/icon-map.ts](../../minion_hub/src/lib/plugins/icon-map.ts) | shared | No lexical signal |
| [minion_hub/src/lib/plugins/plugin-types.ts](../../minion_hub/src/lib/plugins/plugin-types.ts) | shared | No lexical signal |
| [minion_hub/src/lib/plugins/slots.ts](../../minion_hub/src/lib/plugins/slots.ts) | shared | No lexical signal |
| [minion_hub/src/lib/pos/workflow.ts](../../minion_hub/src/lib/pos/workflow.ts) | shared | No lexical signal |
| [minion_hub/src/lib/query/client.ts](../../minion_hub/src/lib/query/client.ts) | shared | No lexical signal |
| [minion_hub/src/lib/realtime/org-events.ts](../../minion_hub/src/lib/realtime/org-events.ts) | shared | No lexical signal |
| [minion_hub/src/lib/routes/business-route-shells.ts](../../minion_hub/src/lib/routes/business-route-shells.ts) | shared | No lexical signal |
| [minion_hub/src/lib/routes/capture-route-resolver.ts](../../minion_hub/src/lib/routes/capture-route-resolver.ts) | shared | async-function: 54, 68, 105, 118 |
| [minion_hub/src/lib/routes/component-design-registry.ts](../../minion_hub/src/lib/routes/component-design-registry.ts) | shared | No lexical signal |
| [minion_hub/src/lib/routes/route-access-policies.ts](../../minion_hub/src/lib/routes/route-access-policies.ts) | shared | No lexical signal |
| [minion_hub/src/lib/routes/route-access-registry.ts](../../minion_hub/src/lib/routes/route-access-registry.ts) | shared | No lexical signal |
| [minion_hub/src/lib/routes/route-design-manifest.ts](../../minion_hub/src/lib/routes/route-design-manifest.ts) | shared | No lexical signal |
| [minion_hub/src/lib/routes/route-design-validation.ts](../../minion_hub/src/lib/routes/route-design-validation.ts) | shared | No lexical signal |
| [minion_hub/src/lib/schemas/structured-response.ts](../../minion_hub/src/lib/schemas/structured-response.ts) | shared | No lexical signal |
| [minion_hub/src/lib/services/gateway/chat-rpc.ts](../../minion_hub/src/lib/services/gateway/chat-rpc.ts) | shared | async-function: 40; pending-feedback: 17, 31 |
| [minion_hub/src/lib/services/gateway/connection-lifecycle.ts](../../minion_hub/src/lib/services/gateway/connection-lifecycle.ts) | shared | refresh: 19 |
| [minion_hub/src/lib/services/gateway/debug-rpc.ts](../../minion_hub/src/lib/services/gateway/debug-rpc.ts) | shared | async-function: 9, 17, 21, 27, 35, 39 |
| [minion_hub/src/lib/services/gateway/eager-reconnect.ts](../../minion_hub/src/lib/services/gateway/eager-reconnect.ts) | shared | No lexical signal |
| [minion_hub/src/lib/services/gateway/prose.ts](../../minion_hub/src/lib/services/gateway/prose.ts) | shared | async-function: 33, 59, 94; optimistic: 26 |
| [minion_hub/src/lib/services/gateway/whatsapp.ts](../../minion_hub/src/lib/services/gateway/whatsapp.ts) | shared | async-function: 23 |
| [minion_hub/src/lib/services/gateway-errors.ts](../../minion_hub/src/lib/services/gateway-errors.ts) | shared | No lexical signal |
| [minion_hub/src/lib/services/gateway-rpc.ts](../../minion_hub/src/lib/services/gateway-rpc.ts) | shared | async-function: 39, 51 |
| [minion_hub/src/lib/services/gateway.svelte.ts](../../minion_hub/src/lib/services/gateway.svelte.ts) | shared | async-function: 215, 249, 562, 719, 875, 899, 1481; network: 217, 877, 902, 1483, 1562; refresh: 752, 798, 941; pending-feedback: 951, 1011, 1492, 1525; poll-or-debounce: 328, 1661, 1663, 1693, 1717 |
| [minion_hub/src/lib/services/my-agent-rpc.ts](../../minion_hub/src/lib/services/my-agent-rpc.ts) | shared | async-function: 116, 152, 174, 189 |
| [minion_hub/src/lib/services/prompt-sections-rpc.ts](../../minion_hub/src/lib/services/prompt-sections-rpc.ts) | shared | async-function: 83, 96, 111, 129, 143, 165, 179, 190, 215 |
| [minion_hub/src/lib/services/shells-rpc.ts](../../minion_hub/src/lib/services/shells-rpc.ts) | shared | async-function: 117, 122, 126, 130, 139, 146, 155, 167, 177 |
| [minion_hub/src/lib/state/agents/agent-skills.svelte.ts](../../minion_hub/src/lib/state/agents/agent-skills.svelte.ts) | shared | async-function: 11, 25, 42; optimistic: 47; pending-feedback: 12, 21 |
| [minion_hub/src/lib/state/agents/agent-tools.svelte.ts](../../minion_hub/src/lib/state/agents/agent-tools.svelte.ts) | shared | async-function: 12, 27; optimistic: 32; pending-feedback: 13, 23 |
| [minion_hub/src/lib/state/agents/index.ts](../../minion_hub/src/lib/state/agents/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/agents/tool-catalog.svelte.ts](../../minion_hub/src/lib/state/agents/tool-catalog.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/async.svelte.ts](../../minion_hub/src/lib/state/async.svelte.ts) | shared | async-function: 69; pending-feedback: 7, 43, 66, 70, 77, 84 |
| [minion_hub/src/lib/state/builder/builder.svelte.ts](../../minion_hub/src/lib/state/builder/builder.svelte.ts) | shared | async-function: 41, 56, 67, 78, 99; network: 45, 58, 69, 84, 106; mutation-method: 85, 107; pending-feedback: 42, 52 |
| [minion_hub/src/lib/state/builder/index.ts](../../minion_hub/src/lib/state/builder/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/builder/registry.svelte.ts](../../minion_hub/src/lib/state/builder/registry.svelte.ts) | shared | async-function: 53, 67, 94, 122, 143; network: 126, 145; pending-feedback: 96, 106, 118 |
| [minion_hub/src/lib/state/builder/skill-editor.core.svelte.ts](../../minion_hub/src/lib/state/builder/skill-editor.core.svelte.ts) | shared | async-function: 166, 176, 194, 221, 243, 296, 379, 432, 512, 534, 583, 620, 654, 673, 694, 721, 739, 750; network: 180, 196, 224, 263, 302, 382, 438, 453, 464, 481, 537, 591, 624, 656, 679, 696, 723, 764, 781; mutation-method: 225, 264, 303, 383, 439, 454, 465, 482, 538, 592, 625, 657, 680, 697, 724, 765, 782; pending-feedback: 178, 212, 222, 239, 761, 809, 824; poll-or-debounce: 3, 71, 73, 218, 378, 410, 423, 429, 822, 838 |
| [minion_hub/src/lib/state/builder/skill-editor.dry-run.svelte.ts](../../minion_hub/src/lib/state/builder/skill-editor.dry-run.svelte.ts) | shared | async-function: 43, 80, 172; network: 52, 123, 188; mutation-method: 53, 124, 189; pending-feedback: 50, 76 |
| [minion_hub/src/lib/state/builder/skill-editor.proposals.svelte.ts](../../minion_hub/src/lib/state/builder/skill-editor.proposals.svelte.ts) | shared | async-function: 11, 85, 114, 127; network: 13, 29, 47; mutation-method: 14, 30, 48 |
| [minion_hub/src/lib/state/builder/skill-editor.svelte.ts](../../minion_hub/src/lib/state/builder/skill-editor.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/builder/skill-editor.types.ts](../../minion_hub/src/lib/state/builder/skill-editor.types.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/channels/channels.svelte.ts](../../minion_hub/src/lib/state/channels/channels.svelte.ts) | shared | async-function: 20, 35, 56, 75, 82, 92, 106; network: 24, 45, 66, 76, 86, 98, 107; mutation-method: 46, 67, 76, 99, 110; pending-feedback: 21, 31 |
| [minion_hub/src/lib/state/channels/index.ts](../../minion_hub/src/lib/state/channels/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/chat/chat.svelte.ts](../../minion_hub/src/lib/state/chat/chat.svelte.ts) | shared | async-function: 131; network: 145; mutation-method: 146; pending-feedback: 259; poll-or-debounce: 51, 102, 120 |
| [minion_hub/src/lib/state/chat/index.ts](../../minion_hub/src/lib/state/chat/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/config/config-restart.ts](../../minion_hub/src/lib/state/config/config-restart.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/config/config.svelte.ts](../../minion_hub/src/lib/state/config/config.svelte.ts) | shared | async-function: 168, 183, 271; save-gesture: 293, 311, 314; pending-feedback: 184, 251, 275, 318 |
| [minion_hub/src/lib/state/config/index.ts](../../minion_hub/src/lib/state/config/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/config/restart.svelte.ts](../../minion_hub/src/lib/state/config/restart.svelte.ts) | shared | save-gesture: 91 |
| [minion_hub/src/lib/state/debug/debug.svelte.ts](../../minion_hub/src/lib/state/debug/debug.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/debug/index.ts](../../minion_hub/src/lib/state/debug/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/agent-groups.svelte.ts](../../minion_hub/src/lib/state/features/agent-groups.svelte.ts) | shared | async-function: 105, 115, 128, 154, 171, 185; network: 106, 138, 161, 175, 210, 218; mutation-method: 139, 162, 175, 211, 219; refresh: 118; optimistic: 134, 135, 226 |
| [minion_hub/src/lib/state/features/agent-notes.svelte.ts](../../minion_hub/src/lib/state/features/agent-notes.svelte.ts) | shared | async-function: 204, 237, 270, 287, 314, 708, 719; network: 210, 241, 275, 296, 712, 720; mutation-method: 211, 242, 275, 712, 721; pending-feedback: 289, 309; poll-or-debounce: 7, 8, 186, 223 |
| [minion_hub/src/lib/state/features/aliases.svelte.ts](../../minion_hub/src/lib/state/features/aliases.svelte.ts) | shared | async-function: 11, 14; network: 16 |
| [minion_hub/src/lib/state/features/assistant-context.ts](../../minion_hub/src/lib/state/features/assistant-context.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/assistant.svelte.ts](../../minion_hub/src/lib/state/features/assistant.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/channel-sources.svelte.ts](../../minion_hub/src/lib/state/features/channel-sources.svelte.ts) | shared | async-function: 57, 85, 125; network: 128 |
| [minion_hub/src/lib/state/features/cloud.svelte.ts](../../minion_hub/src/lib/state/features/cloud.svelte.ts) | shared | pending-feedback: 55, 94 |
| [minion_hub/src/lib/state/features/dream-data.svelte.ts](../../minion_hub/src/lib/state/features/dream-data.svelte.ts) | shared | async-function: 32; pending-feedback: 34, 43, 50 |
| [minion_hub/src/lib/state/features/finance-sync.svelte.ts](../../minion_hub/src/lib/state/features/finance-sync.svelte.ts) | shared | async-function: 17, 37; network: 19, 67, 84; mutation-method: 68, 85 |
| [minion_hub/src/lib/state/features/flow-editor.svelte.ts](../../minion_hub/src/lib/state/features/flow-editor.svelte.ts) | shared | async-function: 560, 588, 790, 819; network: 567, 593, 794, 817, 869; mutation-method: 594, 795, 870; poll-or-debounce: 6, 516, 519 |
| [minion_hub/src/lib/state/features/flow-run.ts](../../minion_hub/src/lib/state/features/flow-run.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/hosts.svelte.ts](../../minion_hub/src/lib/state/features/hosts.svelte.ts) | shared | async-function: 84, 220, 345, 361, 392, 397, 434, 435; network: 87, 224, 362, 398, 436; mutation-method: 88, 225, 363, 399, 436; optimistic: 405 |
| [minion_hub/src/lib/state/features/index.ts](../../minion_hub/src/lib/state/features/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/marketplace.svelte.ts](../../minion_hub/src/lib/state/features/marketplace.svelte.ts) | shared | async-function: 47, 56, 67, 89; network: 51, 58, 71, 98; mutation-method: 71, 99; refresh: 79 |
| [minion_hub/src/lib/state/features/missions.svelte.ts](../../minion_hub/src/lib/state/features/missions.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/note-polish.svelte.ts](../../minion_hub/src/lib/state/features/note-polish.svelte.ts) | shared | async-function: 69 |
| [minion_hub/src/lib/state/features/notes-autocomplete.ts](../../minion_hub/src/lib/state/features/notes-autocomplete.ts) | shared | async-function: 19, 37, 78; network: 23, 42, 82; mutation-method: 24, 43, 83 |
| [minion_hub/src/lib/state/features/notifications.svelte.ts](../../minion_hub/src/lib/state/features/notifications.svelte.ts) | shared | async-function: 20; network: 22; poll-or-debounce: 50 |
| [minion_hub/src/lib/state/features/permissions.svelte.ts](../../minion_hub/src/lib/state/features/permissions.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/personal-agent-names.svelte.ts](../../minion_hub/src/lib/state/features/personal-agent-names.svelte.ts) | shared | async-function: 16; network: 21 |
| [minion_hub/src/lib/state/features/personal-agent.svelte.ts](../../minion_hub/src/lib/state/features/personal-agent.svelte.ts) | shared | async-function: 56, 80; network: 57, 81, 93, 105, 128; mutation-method: 94, 106, 129; refresh: 101, 117; pending-feedback: 46, 51, 66, 125, 147 |
| [minion_hub/src/lib/state/features/pi-agent-state.svelte.ts](../../minion_hub/src/lib/state/features/pi-agent-state.svelte.ts) | shared | async-function: 86, 195, 207, 217; pending-feedback: 88, 172, 184 |
| [minion_hub/src/lib/state/features/prompt-sections.svelte.ts](../../minion_hub/src/lib/state/features/prompt-sections.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/provision.svelte.ts](../../minion_hub/src/lib/state/features/provision.svelte.ts) | shared | async-function: 111, 153, 186, 210; network: 113, 175, 190, 230; mutation-method: 176, 231 |
| [minion_hub/src/lib/state/features/pulse.svelte.ts](../../minion_hub/src/lib/state/features/pulse.svelte.ts) | shared | async-function: 5, 14, 26, 30; network: 7, 16, 31; mutation-method: 32 |
| [minion_hub/src/lib/state/features/session-tasks.svelte.ts](../../minion_hub/src/lib/state/features/session-tasks.svelte.ts) | shared | async-function: 24; network: 27; pending-feedback: 25, 36 |
| [minion_hub/src/lib/state/features/subagent-data.svelte.ts](../../minion_hub/src/lib/state/features/subagent-data.svelte.ts) | shared | async-function: 110; pending-feedback: 112, 127, 153 |
| [minion_hub/src/lib/state/features/transcription-prefs.svelte.ts](../../minion_hub/src/lib/state/features/transcription-prefs.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/features/user.svelte.ts](../../minion_hub/src/lib/state/features/user.svelte.ts) | shared | async-function: 65, 69, 73, 77, 81, 85, 89; refresh: 20, 66, 70, 74, 78, 82, 86 |
| [minion_hub/src/lib/state/features/voice-call.svelte.ts](../../minion_hub/src/lib/state/features/voice-call.svelte.ts) | shared | async-function: 284; network: 293; mutation-method: 294; imperative-motion: 313, 322 |
| [minion_hub/src/lib/state/gateway/agent-org.ts](../../minion_hub/src/lib/state/gateway/agent-org.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/gateway/connection.svelte.ts](../../minion_hub/src/lib/state/gateway/connection.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/gateway/gateway-data.svelte.ts](../../minion_hub/src/lib/state/gateway/gateway-data.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/gateway/history-sync.ts](../../minion_hub/src/lib/state/gateway/history-sync.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/gateway/index.ts](../../minion_hub/src/lib/state/gateway/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/gateway/update-state.svelte.ts](../../minion_hub/src/lib/state/gateway/update-state.svelte.ts) | shared | network: 4; pending-feedback: 145 |
| [minion_hub/src/lib/state/index.ts](../../minion_hub/src/lib/state/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/plugin-nav.svelte.ts](../../minion_hub/src/lib/state/plugin-nav.svelte.ts) | shared | async-function: 4, 34; network: 5, 37 |
| [minion_hub/src/lib/state/reliability/credential-health.svelte.ts](../../minion_hub/src/lib/state/reliability/credential-health.svelte.ts) | shared | async-function: 31; network: 32 |
| [minion_hub/src/lib/state/reliability/index.ts](../../minion_hub/src/lib/state/reliability/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/reliability/insights.svelte.ts](../../minion_hub/src/lib/state/reliability/insights.svelte.ts) | shared | async-function: 17; network: 19 |
| [minion_hub/src/lib/state/reliability/plugin-health.svelte.ts](../../minion_hub/src/lib/state/reliability/plugin-health.svelte.ts) | shared | async-function: 115 |
| [minion_hub/src/lib/state/reliability/reliability.svelte.ts](../../minion_hub/src/lib/state/reliability/reliability.svelte.ts) | shared | async-function: 169, 199, 218, 236, 299, 338, 363, 386; pending-feedback: 305, 328, 400, 423 |
| [minion_hub/src/lib/state/reliability/skill-stats.svelte.ts](../../minion_hub/src/lib/state/reliability/skill-stats.svelte.ts) | shared | async-function: 33; network: 34 |
| [minion_hub/src/lib/state/ui/agent-windows.svelte.ts](../../minion_hub/src/lib/state/ui/agent-windows.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/bg-pattern.svelte.ts](../../minion_hub/src/lib/state/ui/bg-pattern.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/bug-reporter.svelte.ts](../../minion_hub/src/lib/state/ui/bug-reporter.svelte.ts) | shared | async-function: 58, 174, 193; network: 189; mutation-method: 190; save-gesture: 201, 205; imperative-motion: 89 |
| [minion_hub/src/lib/state/ui/command-palette.svelte.ts](../../minion_hub/src/lib/state/ui/command-palette.svelte.ts) | shared | async-function: 85; poll-or-debounce: 80 |
| [minion_hub/src/lib/state/ui/crt-config.svelte.ts](../../minion_hub/src/lib/state/ui/crt-config.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/index.ts](../../minion_hub/src/lib/state/ui/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/locale.svelte.ts](../../minion_hub/src/lib/state/ui/locale.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/logo.svelte.ts](../../minion_hub/src/lib/state/ui/logo.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/nav-mode.svelte.ts](../../minion_hub/src/lib/state/ui/nav-mode.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/preference-sync.svelte.ts](../../minion_hub/src/lib/state/ui/preference-sync.svelte.ts) | shared | async-function: 12, 64; network: 14, 125; mutation-method: 15, 126; poll-or-debounce: 2, 8, 25, 38, 43, 49, 123 |
| [minion_hub/src/lib/state/ui/sparkline-style.svelte.ts](../../minion_hub/src/lib/state/ui/sparkline-style.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/theme.svelte.ts](../../minion_hub/src/lib/state/ui/theme.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/ui/toast.svelte.ts](../../minion_hub/src/lib/state/ui/toast.svelte.ts) | shared | async-function: 35 |
| [minion_hub/src/lib/state/ui/ui.svelte.ts](../../minion_hub/src/lib/state/ui/ui.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/workshop/banter-budget.svelte.ts](../../minion_hub/src/lib/state/workshop/banter-budget.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/workshop/experiments.svelte.ts](../../minion_hub/src/lib/state/workshop/experiments.svelte.ts) | shared | async-function: 45, 51, 60, 68, 98, 116, 159, 187, 204, 211, 215, 220; network: 105, 121, 195, 205, 212, 216; mutation-method: 106, 122, 196, 212, 216 |
| [minion_hub/src/lib/state/workshop/index.ts](../../minion_hub/src/lib/state/workshop/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/workshop/pixel-office.svelte.ts](../../minion_hub/src/lib/state/workshop/pixel-office.svelte.ts) | shared | poll-or-debounce: 8, 45, 63 |
| [minion_hub/src/lib/state/workshop/workshop-conversations.svelte.ts](../../minion_hub/src/lib/state/workshop/workshop-conversations.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/workshop/workshop.memory.svelte.ts](../../minion_hub/src/lib/state/workshop/workshop.memory.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/state/workshop/workshop.svelte.ts](../../minion_hub/src/lib/state/workshop/workshop.svelte.ts) | shared | async-function: 409, 441, 460, 494, 511; network: 415, 442, 463, 505, 512; mutation-method: 416, 464, 512; poll-or-debounce: 2, 121, 149, 289, 408, 434, 438 |
| [minion_hub/src/lib/state/workshop/workshop.types.ts](../../minion_hub/src/lib/state/workshop/workshop.types.ts) | shared | No lexical signal |
| [minion_hub/src/lib/supabase/client.ts](../../minion_hub/src/lib/supabase/client.ts) | shared | No lexical signal |
| [minion_hub/src/lib/themes/contrast.ts](../../minion_hub/src/lib/themes/contrast.ts) | shared | No lexical signal |
| [minion_hub/src/lib/themes/presets.ts](../../minion_hub/src/lib/themes/presets.ts) | shared | No lexical signal |
| [minion_hub/src/lib/themes/runtime.ts](../../minion_hub/src/lib/themes/runtime.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/brains.ts](../../minion_hub/src/lib/types/brains.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/channel-link.ts](../../minion_hub/src/lib/types/channel-link.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/channels.ts](../../minion_hub/src/lib/types/channels.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/chat.ts](../../minion_hub/src/lib/types/chat.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/config.ts](../../minion_hub/src/lib/types/config.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/entities.ts](../../minion_hub/src/lib/types/entities.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/host.ts](../../minion_hub/src/lib/types/host.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/index.ts](../../minion_hub/src/lib/types/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/notes.ts](../../minion_hub/src/lib/types/notes.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/performance-monitor.ts](../../minion_hub/src/lib/types/performance-monitor.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/secrets.ts](../../minion_hub/src/lib/types/secrets.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/skills.ts](../../minion_hub/src/lib/types/skills.ts) | shared | No lexical signal |
| [minion_hub/src/lib/types/tools.ts](../../minion_hub/src/lib/types/tools.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/agent-display.ts](../../minion_hub/src/lib/utils/agent-display.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/agent-settings-schema.ts](../../minion_hub/src/lib/utils/agent-settings-schema.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/alias.ts](../../minion_hub/src/lib/utils/alias.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/avatar.ts](../../minion_hub/src/lib/utils/avatar.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/channel-display-state.ts](../../minion_hub/src/lib/utils/channel-display-state.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/chart-colors.ts](../../minion_hub/src/lib/utils/chart-colors.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/config-schema.ts](../../minion_hub/src/lib/utils/config-schema.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/console-interceptor.ts](../../minion_hub/src/lib/utils/console-interceptor.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/detect-lang.ts](../../minion_hub/src/lib/utils/detect-lang.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/drag-context.ts](../../minion_hub/src/lib/utils/drag-context.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/email-body.ts](../../minion_hub/src/lib/utils/email-body.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/event-origin.ts](../../minion_hub/src/lib/utils/event-origin.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/format.ts](../../minion_hub/src/lib/utils/format.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/index.ts](../../minion_hub/src/lib/utils/index.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/internal-nav.ts](../../minion_hub/src/lib/utils/internal-nav.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/layer-colors.ts](../../minion_hub/src/lib/utils/layer-colors.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/live-polling.ts](../../minion_hub/src/lib/utils/live-polling.ts) | shared | refresh: 4, 20, 23; poll-or-debounce: 8, 17, 18 |
| [minion_hub/src/lib/utils/lucide-svg.ts](../../minion_hub/src/lib/utils/lucide-svg.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/mention.ts](../../minion_hub/src/lib/utils/mention.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/model-pricing.ts](../../minion_hub/src/lib/utils/model-pricing.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/mutate.ts](../../minion_hub/src/lib/utils/mutate.ts) | shared | async-function: 28 |
| [minion_hub/src/lib/utils/optimistic.ts](../../minion_hub/src/lib/utils/optimistic.ts) | shared | refresh: 5, 12; optimistic: 15; pending-feedback: 16 |
| [minion_hub/src/lib/utils/skill-validation.ts](../../minion_hub/src/lib/utils/skill-validation.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/text.ts](../../minion_hub/src/lib/utils/text.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/tool-calls.ts](../../minion_hub/src/lib/utils/tool-calls.ts) | shared | pending-feedback: 46 |
| [minion_hub/src/lib/utils/tool-permission-chip.ts](../../minion_hub/src/lib/utils/tool-permission-chip.ts) | shared | No lexical signal |
| [minion_hub/src/lib/utils/word-diff.ts](../../minion_hub/src/lib/utils/word-diff.ts) | shared | No lexical signal |
| [minion_hub/src/lib/virtual/virtualizer.svelte.ts](../../minion_hub/src/lib/virtual/virtualizer.svelte.ts) | shared | No lexical signal |
| [minion_hub/src/lib/voice/visemeMap.ts](../../minion_hub/src/lib/voice/visemeMap.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workforce/factory-intake.ts](../../minion_hub/src/lib/workforce/factory-intake.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workforce/pipeline-gate.ts](../../minion_hub/src/lib/workforce/pipeline-gate.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workforce/pipeline-inbox.ts](../../minion_hub/src/lib/workforce/pipeline-inbox.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workforce/pipeline-trace.ts](../../minion_hub/src/lib/workforce/pipeline-trace.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workforce/project-groups.ts](../../minion_hub/src/lib/workforce/project-groups.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workforce/work-queue.ts](../../minion_hub/src/lib/workforce/work-queue.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/agent-fsm.ts](../../minion_hub/src/lib/workshop/agent-fsm.ts) | shared | poll-or-debounce: 133, 134, 147, 148, 161, 162, 191, 217 |
| [minion_hub/src/lib/workshop/agent-queue.ts](../../minion_hub/src/lib/workshop/agent-queue.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/agent-sprite.ts](../../minion_hub/src/lib/workshop/agent-sprite.ts) | shared | async-function: 50 |
| [minion_hub/src/lib/workshop/camera.ts](../../minion_hub/src/lib/workshop/camera.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/conversation-manager.ts](../../minion_hub/src/lib/workshop/conversation-manager.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/element-sprite.ts](../../minion_hub/src/lib/workshop/element-sprite.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/element-watcher.ts](../../minion_hub/src/lib/workshop/element-watcher.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/gateway-bridge.ts](../../minion_hub/src/lib/workshop/gateway-bridge.ts) | shared | async-function: 236, 310, 363, 497, 533, 656, 802, 861, 1454, 1490 |
| [minion_hub/src/lib/workshop/habbo-element-sprite.ts](../../minion_hub/src/lib/workshop/habbo-element-sprite.ts) | shared | imperative-motion: 71, 95, 96; reduced-motion: 13, 80 |
| [minion_hub/src/lib/workshop/habbo-renderer.ts](../../minion_hub/src/lib/workshop/habbo-renderer.ts) | shared | async-function: 87 |
| [minion_hub/src/lib/workshop/inbox-bridge.ts](../../minion_hub/src/lib/workshop/inbox-bridge.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/motion-preference.ts](../../minion_hub/src/lib/workshop/motion-preference.ts) | shared | imperative-motion: 27, 44, 62, 76, 80; reduced-motion: 4, 5, 17, 45, 75 |
| [minion_hub/src/lib/workshop/physics.ts](../../minion_hub/src/lib/workshop/physics.ts) | shared | async-function: 14 |
| [minion_hub/src/lib/workshop/pixel/asset-loader.ts](../../minion_hub/src/lib/workshop/pixel/asset-loader.ts) | shared | async-function: 23, 120, 170, 244; network: 249 |
| [minion_hub/src/lib/workshop/pixel/characters.ts](../../minion_hub/src/lib/workshop/pixel/characters.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/colorize.ts](../../minion_hub/src/lib/workshop/pixel/colorize.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/constants.ts](../../minion_hub/src/lib/workshop/pixel/constants.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/floor-tiles.ts](../../minion_hub/src/lib/workshop/pixel/floor-tiles.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/furniture-catalog.ts](../../minion_hub/src/lib/workshop/pixel/furniture-catalog.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/game-loop.ts](../../minion_hub/src/lib/workshop/pixel/game-loop.ts) | shared | imperative-motion: 56, 59; reduced-motion: 19, 35 |
| [minion_hub/src/lib/workshop/pixel/gateway-pixel-bridge.ts](../../minion_hub/src/lib/workshop/pixel/gateway-pixel-bridge.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/layout-serializer.ts](../../minion_hub/src/lib/workshop/pixel/layout-serializer.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/matrix-effect.ts](../../minion_hub/src/lib/workshop/pixel/matrix-effect.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/office-state.ts](../../minion_hub/src/lib/workshop/pixel/office-state.ts) | shared | reduced-motion: 697, 700, 709 |
| [minion_hub/src/lib/workshop/pixel/renderer.ts](../../minion_hub/src/lib/workshop/pixel/renderer.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/sprite-cache.ts](../../minion_hub/src/lib/workshop/pixel/sprite-cache.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/sprite-data.ts](../../minion_hub/src/lib/workshop/pixel/sprite-data.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/tile-map.ts](../../minion_hub/src/lib/workshop/pixel/tile-map.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/types.ts](../../minion_hub/src/lib/workshop/pixel/types.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/pixel/wall-tiles.ts](../../minion_hub/src/lib/workshop/pixel/wall-tiles.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/proximity.ts](../../minion_hub/src/lib/workshop/proximity.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/renderer-adapter.ts](../../minion_hub/src/lib/workshop/renderer-adapter.ts) | shared | async-function: 120 |
| [minion_hub/src/lib/workshop/rope-renderer.ts](../../minion_hub/src/lib/workshop/rope-renderer.ts) | shared | No lexical signal |
| [minion_hub/src/lib/workshop/simulation.ts](../../minion_hub/src/lib/workshop/simulation.ts) | shared | svelte-motion: 626, 684; css-motion: 626, 684; imperative-motion: 210, 737 |
| [minion_hub/src/lib/workshop/texture-cache.ts](../../minion_hub/src/lib/workshop/texture-cache.ts) | shared | async-function: 50; network: 61 |
| [minion_hub/src/routes/(app)/+layout.svelte](../../minion_hub/src/routes/(app)/+layout.svelte) | shared | svelte-motion: 89 |
| [minion_hub/src/routes/(app)/account/+layout.svelte](../../minion_hub/src/routes/(app)/account/+layout.svelte) | account | No lexical signal |
| [minion_hub/src/routes/(app)/account/+page.svelte](../../minion_hub/src/routes/(app)/account/+page.svelte) | account | No lexical signal |
| [minion_hub/src/routes/(app)/account/connections/+page.svelte](../../minion_hub/src/routes/(app)/account/connections/+page.svelte) | account | No lexical signal |
| [minion_hub/src/routes/(app)/account/security/+page.svelte](../../minion_hub/src/routes/(app)/account/security/+page.svelte) | account | No lexical signal |
| [minion_hub/src/routes/(app)/agents/+layout.svelte](../../minion_hub/src/routes/(app)/agents/+layout.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/+page.svelte](../../minion_hub/src/routes/(app)/agents/+page.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/autonomous/+layout.svelte](../../minion_hub/src/routes/(app)/agents/autonomous/+layout.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/autonomous/+page.svelte](../../minion_hub/src/routes/(app)/agents/autonomous/+page.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/autonomous/[id]/+page.svelte](../../minion_hub/src/routes/(app)/agents/autonomous/[id]/+page.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/builder/+page.svelte](../../minion_hub/src/routes/(app)/agents/builder/+page.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/builder/[id]/+layout.svelte](../../minion_hub/src/routes/(app)/agents/builder/[id]/+layout.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/builder/[id]/+page.svelte](../../minion_hub/src/routes/(app)/agents/builder/[id]/+page.svelte) | agents | async-function: 81, 122, 137, 168, 188, 209, 243; network: 124, 141, 173, 195, 214, 259; mutation-method: 142, 174, 196, 215, 260; pending-feedback: 27, 28, 82, 117, 138, 163, 193, 205, 212, 224; poll-or-debounce: 4, 33, 131 |
| [minion_hub/src/routes/(app)/agents/builder/[id]/_components/BehaviorSection.svelte](../../minion_hub/src/routes/(app)/agents/builder/[id]/_components/BehaviorSection.svelte) | agents | svelte-motion: 127; css-motion: 127 |
| [minion_hub/src/routes/(app)/agents/builder/[id]/_components/BuilderToolbar.svelte](../../minion_hub/src/routes/(app)/agents/builder/[id]/_components/BuilderToolbar.svelte) | agents | save-gesture: 40, 42, 43, 45, 47, 78, 85; svelte-motion: 131, 176; css-motion: 131, 176, 224, 236; poll-or-debounce: 34 |
| [minion_hub/src/routes/(app)/agents/builder/[id]/_components/IdentitySection.svelte](../../minion_hub/src/routes/(app)/agents/builder/[id]/_components/IdentitySection.svelte) | agents | svelte-motion: 79, 102; css-motion: 79, 102 |
| [minion_hub/src/routes/(app)/agents/builder/[id]/_components/ModelPromptSection.svelte](../../minion_hub/src/routes/(app)/agents/builder/[id]/_components/ModelPromptSection.svelte) | agents | svelte-motion: 101, 124; css-motion: 101, 124 |
| [minion_hub/src/routes/(app)/agents/builder/[id]/_components/SkillsSection.svelte](../../minion_hub/src/routes/(app)/agents/builder/[id]/_components/SkillsSection.svelte) | agents | svelte-motion: 203, 286, 319, 377; css-motion: 203, 286, 319, 377 |
| [minion_hub/src/routes/(app)/agents/workshop/+layout.svelte](../../minion_hub/src/routes/(app)/agents/workshop/+layout.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/workshop/+page.svelte](../../minion_hub/src/routes/(app)/agents/workshop/+page.svelte) | agents | async-function: 29, 43, 49, 55; save-gesture: 67; pending-feedback: 26, 30, 37 |
| [minion_hub/src/routes/(app)/agents/workshop/+page.ts](../../minion_hub/src/routes/(app)/agents/workshop/+page.ts) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/workshop/[id]/+page.svelte](../../minion_hub/src/routes/(app)/agents/workshop/[id]/+page.svelte) | agents | async-function: 19 |
| [minion_hub/src/routes/(app)/agents/workshop/[id]/+page.ts](../../minion_hub/src/routes/(app)/agents/workshop/[id]/+page.ts) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/workshop/compare/+page.svelte](../../minion_hub/src/routes/(app)/agents/workshop/compare/+page.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/workshop/compare/+page.ts](../../minion_hub/src/routes/(app)/agents/workshop/compare/+page.ts) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/workshop/groupchat/+page.svelte](../../minion_hub/src/routes/(app)/agents/workshop/groupchat/+page.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/workshop/groupchat/+page.ts](../../minion_hub/src/routes/(app)/agents/workshop/groupchat/+page.ts) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/workshop/leaderboard/+page.svelte](../../minion_hub/src/routes/(app)/agents/workshop/leaderboard/+page.svelte) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/agents/workshop/leaderboard/+page.ts](../../minion_hub/src/routes/(app)/agents/workshop/leaderboard/+page.ts) | agents | No lexical signal |
| [minion_hub/src/routes/(app)/brains/+layout.svelte](../../minion_hub/src/routes/(app)/brains/+layout.svelte) | brains | No lexical signal |
| [minion_hub/src/routes/(app)/brains/+page.svelte](../../minion_hub/src/routes/(app)/brains/+page.svelte) | brains | No lexical signal |
| [minion_hub/src/routes/(app)/brains/[id]/+page.svelte](../../minion_hub/src/routes/(app)/brains/[id]/+page.svelte) | brains | async-function: 49, 66; network: 54, 67; mutation-method: 56, 70; refresh: 74; pending-feedback: 98 |
| [minion_hub/src/routes/(app)/brains/agents/+page.svelte](../../minion_hub/src/routes/(app)/brains/agents/+page.svelte) | brains | async-function: 22; network: 27; refresh: 31; pending-feedback: 137, 149 |
| [minion_hub/src/routes/(app)/brains/settings/+page.svelte](../../minion_hub/src/routes/(app)/brains/settings/+page.svelte) | brains | async-function: 152; network: 158; mutation-method: 159; refresh: 178; save-gesture: 174, 180, 318, 323; pending-feedback: 51, 154, 182, 322 |
| [minion_hub/src/routes/(app)/brains/template/+page.svelte](../../minion_hub/src/routes/(app)/brains/template/+page.svelte) | brains | async-function: 30; network: 36; mutation-method: 37; refresh: 53; save-gesture: 48, 55, 135; pending-feedback: 24, 32, 57, 134 |
| [minion_hub/src/routes/(app)/builder/+page.svelte](../../minion_hub/src/routes/(app)/builder/+page.svelte) | builder | No lexical signal |
| [minion_hub/src/routes/(app)/builder/+page.ts](../../minion_hub/src/routes/(app)/builder/+page.ts) | builder | No lexical signal |
| [minion_hub/src/routes/(app)/capabilities/+page.svelte](../../minion_hub/src/routes/(app)/capabilities/+page.svelte) | capabilities | No lexical signal |
| [minion_hub/src/routes/(app)/channels/+layout.svelte](../../minion_hub/src/routes/(app)/channels/+layout.svelte) | channels | No lexical signal |
| [minion_hub/src/routes/(app)/channels/+page.svelte](../../minion_hub/src/routes/(app)/channels/+page.svelte) | channels | svelte-motion: 109; css-motion: 109 |
| [minion_hub/src/routes/(app)/channels/[id]/+page.svelte](../../minion_hub/src/routes/(app)/channels/[id]/+page.svelte) | channels | No lexical signal |
| [minion_hub/src/routes/(app)/channels/gmail/+page.svelte](../../minion_hub/src/routes/(app)/channels/gmail/+page.svelte) | channels | async-function: 26, 66, 89, 103; network: 29, 71, 72, 106; mutation-method: 30, 71, 73, 106; refresh: 79, 108; save-gesture: 36, 216; pending-feedback: 20, 68, 83, 174 |
| [minion_hub/src/routes/(app)/cloud/+layout.svelte](../../minion_hub/src/routes/(app)/cloud/+layout.svelte) | cloud | async-function: 40; poll-or-debounce: 34 |
| [minion_hub/src/routes/(app)/cloud/+page.svelte](../../minion_hub/src/routes/(app)/cloud/+page.svelte) | cloud | svelte-motion: 389; css-motion: 255, 389, 505 |
| [minion_hub/src/routes/(app)/cloud/gui/+page.svelte](../../minion_hub/src/routes/(app)/cloud/gui/+page.svelte) | cloud | No lexical signal |
| [minion_hub/src/routes/(app)/cloud/settings/+page.svelte](../../minion_hub/src/routes/(app)/cloud/settings/+page.svelte) | cloud | async-function: 43, 58; pending-feedback: 174, 188, 205 |
| [minion_hub/src/routes/(app)/cloud/terminal/+page.svelte](../../minion_hub/src/routes/(app)/cloud/terminal/+page.svelte) | cloud | No lexical signal |
| [minion_hub/src/routes/(app)/config/+page.svelte](../../minion_hub/src/routes/(app)/config/+page.svelte) | config | imperative-motion: 77; pending-feedback: 27 |
| [minion_hub/src/routes/(app)/crm/+layout.svelte](../../minion_hub/src/routes/(app)/crm/+layout.svelte) | crm | No lexical signal |
| [minion_hub/src/routes/(app)/crm/+page.svelte](../../minion_hub/src/routes/(app)/crm/+page.svelte) | crm | svelte-motion: 528, 558, 620, 687; css-motion: 528, 558, 620, 687; pending-feedback: 491, 493, 495 |
| [minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte](../../minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte) | crm | async-function: 177, 225, 283, 298, 302, 311, 315, 333, 349; network: 229, 286, 304, 312, 320, 335, 353; mutation-method: 230, 287, 305, 312, 321, 335, 353; refresh: 292, 309, 313, 327, 354, 396, 429; save-gesture: 645; svelte-motion: 1188; css-motion: 1188; pending-feedback: 273, 284, 294, 318, 330; poll-or-debounce: 434 |
| [minion_hub/src/routes/(app)/crm/customers/+page.svelte](../../minion_hub/src/routes/(app)/crm/customers/+page.svelte) | crm | async-function: 78, 319, 356, 582, 601, 610, 717, 732, 996; network: 79, 362, 586, 604, 613, 736; mutation-method: 587, 604, 614, 737; refresh: 64, 199, 591, 605, 725, 745, 818, 832, 846, 861, 998; svelte-motion: 1045, 1098; css-motion: 1045, 1098; pending-feedback: 71, 322, 341, 987 |
| [minion_hub/src/routes/(app)/crm/insights/+page.svelte](../../minion_hub/src/routes/(app)/crm/insights/+page.svelte) | crm | async-function: 56, 71; network: 60, 75; mutation-method: 60, 75; refresh: 63, 76 |
| [minion_hub/src/routes/(app)/crm/settings/+page.svelte](../../minion_hub/src/routes/(app)/crm/settings/+page.svelte) | crm | async-function: 78, 108, 126, 189, 204, 218, 234, 239; network: 90, 109, 129, 192, 207, 223; mutation-method: 91, 109, 129, 193, 208, 223; refresh: 98, 110, 136, 197, 212, 224; save-gesture: 484; css-motion: 589, 734, 736; pending-feedback: 70, 84, 104, 399 |
| [minion_hub/src/routes/(app)/finances/+layout.svelte](../../minion_hub/src/routes/(app)/finances/+layout.svelte) | finances | No lexical signal |
| [minion_hub/src/routes/(app)/finances/+page.svelte](../../minion_hub/src/routes/(app)/finances/+page.svelte) | finances | svelte-motion: 513; css-motion: 513; pending-feedback: 459, 461, 462, 463, 464 |
| [minion_hub/src/routes/(app)/finances/invoices/+page.svelte](../../minion_hub/src/routes/(app)/finances/invoices/+page.svelte) | finances | svelte-motion: 214; css-motion: 214 |
| [minion_hub/src/routes/(app)/finances/invoices/[id]/+page.svelte](../../minion_hub/src/routes/(app)/finances/invoices/[id]/+page.svelte) | finances | async-function: 232, 242, 271; network: 247, 275; mutation-method: 248, 276; refresh: 291; save-gesture: 525, 726, 732 |
| [minion_hub/src/routes/(app)/finances/purchases/+page.svelte](../../minion_hub/src/routes/(app)/finances/purchases/+page.svelte) | finances | async-function: 45, 73; network: 50, 75; mutation-method: 50, 75; refresh: 51, 76; pending-feedback: 90 |
| [minion_hub/src/routes/(app)/finances/settings/+page.svelte](../../minion_hub/src/routes/(app)/finances/settings/+page.svelte) | finances | async-function: 42, 117, 158, 199, 217, 229, 249, 284, 309; network: 46, 121, 162, 201, 232, 251, 289; mutation-method: 47, 122, 165, 233, 252, 290, 315; save-gesture: 58, 147, 300, 446, 596, 740; pending-feedback: 609, 642 |
| [minion_hub/src/routes/(app)/flow-editor/+page.svelte](../../minion_hub/src/routes/(app)/flow-editor/+page.svelte) | flow-editor | async-function: 42, 62, 79, 138, 153, 163, 179, 195; network: 67, 68, 142, 156, 168, 184, 198; mutation-method: 114, 143, 156, 169, 185, 198; refresh: 48; pending-feedback: 38, 63, 75 |
| [minion_hub/src/routes/(app)/flow-editor/+page.ts](../../minion_hub/src/routes/(app)/flow-editor/+page.ts) | flow-editor | No lexical signal |
| [minion_hub/src/routes/(app)/flow-editor/[id]/+page.svelte](../../minion_hub/src/routes/(app)/flow-editor/[id]/+page.svelte) | flow-editor | async-function: 49, 64, 96, 116, 165; network: 97, 168; mutation-method: 100, 171; save-gesture: 219; pending-feedback: 227 |
| [minion_hub/src/routes/(app)/flow-editor/[id]/+page.ts](../../minion_hub/src/routes/(app)/flow-editor/[id]/+page.ts) | flow-editor | No lexical signal |
| [minion_hub/src/routes/(app)/flow-editor/master/[id]/+page.svelte](../../minion_hub/src/routes/(app)/flow-editor/master/[id]/+page.svelte) | flow-editor | No lexical signal |
| [minion_hub/src/routes/(app)/flow-editor/skills/[id]/+page.svelte](../../minion_hub/src/routes/(app)/flow-editor/skills/[id]/+page.svelte) | flow-editor | save-gesture: 80 |
| [minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/ConditionModal.svelte](../../minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/ConditionModal.svelte) | flow-editor | svelte-motion: 73, 90, 111; css-motion: 73, 90, 111 |
| [minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/DagCanvas.svelte](../../minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/DagCanvas.svelte) | flow-editor | svelte-motion: 117, 144; css-motion: 117, 144 |
| [minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/DeleteChapterModal.svelte](../../minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/DeleteChapterModal.svelte) | flow-editor | svelte-motion: 45; css-motion: 45 |
| [minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/EditorSidebar.svelte](../../minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/EditorSidebar.svelte) | flow-editor | svelte-motion: 163, 178, 195, 212, 230, 307; css-motion: 163, 178, 195, 212, 230, 307 |
| [minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/EditorToolbar.svelte](../../minion_hub/src/routes/(app)/flow-editor/skills/[id]/_components/EditorToolbar.svelte) | flow-editor | save-gesture: 37, 43, 46; svelte-motion: 130, 169; css-motion: 130, 169, 196, 197 |
| [minion_hub/src/routes/(app)/home/+page.svelte](../../minion_hub/src/routes/(app)/home/+page.svelte) | home | async-function: 378, 556, 562, 664; network: 196; mutation-method: 197; save-gesture: 1049, 1146; optimistic: 468, 670; svelte-motion: 1728, 1930, 1941, 1961; css-motion: 1728, 1863, 1871, 1930, 1941, 1961; pending-feedback: 86, 379, 403; poll-or-debounce: 94 |
| [minion_hub/src/routes/(app)/home/settings/+page.svelte](../../minion_hub/src/routes/(app)/home/settings/+page.svelte) | home | async-function: 238; save-gesture: 259, 263, 302, 306, 524, 527 |
| [minion_hub/src/routes/(app)/killswitches/+page.svelte](../../minion_hub/src/routes/(app)/killswitches/+page.svelte) | killswitches | async-function: 69, 81; svelte-motion: 294; css-motion: 294; pending-feedback: 37, 39, 70, 77, 82, 88, 140, 175 |
| [minion_hub/src/routes/(app)/killswitches/PowerSwitch.svelte](../../minion_hub/src/routes/(app)/killswitches/PowerSwitch.svelte) | killswitches | svelte-motion: 121; css-motion: 121, 215, 217, 224; pending-feedback: 25, 82; reduced-motion: 222 |
| [minion_hub/src/routes/(app)/marketplace/+layout.svelte](../../minion_hub/src/routes/(app)/marketplace/+layout.svelte) | marketplace | No lexical signal |
| [minion_hub/src/routes/(app)/marketplace/+page.svelte](../../minion_hub/src/routes/(app)/marketplace/+page.svelte) | marketplace | No lexical signal |
| [minion_hub/src/routes/(app)/marketplace/agents/+page.svelte](../../minion_hub/src/routes/(app)/marketplace/agents/+page.svelte) | marketplace | refresh: 119; svelte-motion: 341, 640, 645, 696, 721; css-motion: 341, 640, 645, 696, 721; poll-or-debounce: 4, 17, 19, 20, 21, 46, 47, 53, 62, 63 |
| [minion_hub/src/routes/(app)/marketplace/agents/[slug]/+page.svelte](../../minion_hub/src/routes/(app)/marketplace/agents/[slug]/+page.svelte) | marketplace | svelte-motion: 193, 233; css-motion: 193, 233; pending-feedback: 34 |
| [minion_hub/src/routes/(app)/marketplace/agents/[slug]/_components/DocumentsTab.svelte](../../minion_hub/src/routes/(app)/marketplace/agents/[slug]/_components/DocumentsTab.svelte) | marketplace | svelte-motion: 118; css-motion: 118 |
| [minion_hub/src/routes/(app)/marketplace/agents/[slug]/_components/HiringPanel.svelte](../../minion_hub/src/routes/(app)/marketplace/agents/[slug]/_components/HiringPanel.svelte) | marketplace | async-function: 33; svelte-motion: 277; css-motion: 277, 297, 300 |
| [minion_hub/src/routes/(app)/marketplace/agents/[slug]/_components/IdBadgeCard.svelte](../../minion_hub/src/routes/(app)/marketplace/agents/[slug]/_components/IdBadgeCard.svelte) | marketplace | svelte-motion: 421; css-motion: 240, 243, 421; imperative-motion: 44, 47 |
| [minion_hub/src/routes/(app)/marketplace/agents/[slug]/_components/OverviewTab.svelte](../../minion_hub/src/routes/(app)/marketplace/agents/[slug]/_components/OverviewTab.svelte) | marketplace | No lexical signal |
| [minion_hub/src/routes/(app)/marketplace/hooks/+page.svelte](../../minion_hub/src/routes/(app)/marketplace/hooks/+page.svelte) | marketplace | No lexical signal |
| [minion_hub/src/routes/(app)/marketplace/mcp-servers/+page.svelte](../../minion_hub/src/routes/(app)/marketplace/mcp-servers/+page.svelte) | marketplace | No lexical signal |
| [minion_hub/src/routes/(app)/marketplace/plugins/+page.svelte](../../minion_hub/src/routes/(app)/marketplace/plugins/+page.svelte) | marketplace | svelte-motion: 587, 721, 749; css-motion: 587, 721, 749 |
| [minion_hub/src/routes/(app)/marketplace/tools/+page.svelte](../../minion_hub/src/routes/(app)/marketplace/tools/+page.svelte) | marketplace | No lexical signal |
| [minion_hub/src/routes/(app)/memberships/+page.svelte](../../minion_hub/src/routes/(app)/memberships/+page.svelte) | memberships | async-function: 31, 43, 55, 79, 97, 110; network: 36, 58, 84, 113; mutation-method: 39, 61, 87, 116; refresh: 45, 65, 100, 120; pending-feedback: 28, 33, 51, 81, 106 |
| [minion_hub/src/routes/(app)/notifications/+page.svelte](../../minion_hub/src/routes/(app)/notifications/+page.svelte) | notifications | async-function: 17, 27, 42; network: 35, 40; mutation-method: 36, 40; refresh: 21, 44; svelte-motion: 181; css-motion: 181; pending-feedback: 114, 152 |
| [minion_hub/src/routes/(app)/orgs/+page.svelte](../../minion_hub/src/routes/(app)/orgs/+page.svelte) | orgs | No lexical signal |
| [minion_hub/src/routes/(app)/overview/+page.svelte](../../minion_hub/src/routes/(app)/overview/+page.svelte) | overview | async-function: 61, 81, 85, 95, 99, 106; network: 65; refresh: 71; save-gesture: 122, 173; pending-feedback: 46, 62, 77, 173, 254 |
| [minion_hub/src/routes/(app)/plugins/[id]/+page.svelte](../../minion_hub/src/routes/(app)/plugins/[id]/+page.svelte) | plugins | No lexical signal |
| [minion_hub/src/routes/(app)/pos/+layout.svelte](../../minion_hub/src/routes/(app)/pos/+layout.svelte) | pos | No lexical signal |
| [minion_hub/src/routes/(app)/pos/accounts/+page.svelte](../../minion_hub/src/routes/(app)/pos/accounts/+page.svelte) | pos | refresh: 235 |
| [minion_hub/src/routes/(app)/pos/appointments/+page.svelte](../../minion_hub/src/routes/(app)/pos/appointments/+page.svelte) | pos | async-function: 36, 115, 149, 162, 198, 223; network: 122, 150, 163, 204, 229; mutation-method: 123, 151, 164, 230; refresh: 38, 39, 40 |
| [minion_hub/src/routes/(app)/pos/appointments/new/+page.svelte](../../minion_hub/src/routes/(app)/pos/appointments/new/+page.svelte) | pos | network: 69, 102 |
| [minion_hub/src/routes/(app)/pos/catalog/+page.svelte](../../minion_hub/src/routes/(app)/pos/catalog/+page.svelte) | pos | async-function: 97, 113, 114; network: 98, 115; mutation-method: 99, 116; refresh: 106, 120, 471, 479; save-gesture: 123, 379; optimistic: 24, 112; pending-feedback: 449 |
| [minion_hub/src/routes/(app)/pos/catalog/[productId]/edit/+page.svelte](../../minion_hub/src/routes/(app)/pos/catalog/[productId]/edit/+page.svelte) | pos | No lexical signal |
| [minion_hub/src/routes/(app)/pos/catalog/new/+page.svelte](../../minion_hub/src/routes/(app)/pos/catalog/new/+page.svelte) | pos | No lexical signal |
| [minion_hub/src/routes/(app)/pos/sell/+page.svelte](../../minion_hub/src/routes/(app)/pos/sell/+page.svelte) | pos | async-function: 319, 357, 599, 673, 679, 801, 806, 834; network: 321, 358, 379, 612, 680, 807, 836; mutation-method: 379, 681, 807, 836; refresh: 782, 783, 827, 838, 839 |
| [minion_hub/src/routes/(app)/pos/settings/+page.svelte](../../minion_hub/src/routes/(app)/pos/settings/+page.svelte) | pos | async-function: 95; network: 109; mutation-method: 110; refresh: 126; save-gesture: 244, 276, 306; pending-feedback: 49, 96, 134, 239, 271, 305 |
| [minion_hub/src/routes/(app)/prompt/+layout.svelte](../../minion_hub/src/routes/(app)/prompt/+layout.svelte) | prompt | No lexical signal |
| [minion_hub/src/routes/(app)/prompt/+page.svelte](../../minion_hub/src/routes/(app)/prompt/+page.svelte) | prompt | No lexical signal |
| [minion_hub/src/routes/(app)/pulse/+page.svelte](../../minion_hub/src/routes/(app)/pulse/+page.svelte) | pulse | async-function: 20, 42; network: 53; mutation-method: 54; refresh: 25, 59; pending-feedback: 118, 137, 145 |
| [minion_hub/src/routes/(app)/reliability/+page.svelte](../../minion_hub/src/routes/(app)/reliability/+page.svelte) | reliability | async-function: 1082, 1113; pending-feedback: 213 |
| [minion_hub/src/routes/(app)/sales/+page.svelte](../../minion_hub/src/routes/(app)/sales/+page.svelte) | sales | async-function: 25; network: 28; mutation-method: 29; refresh: 34; pending-feedback: 15, 26, 36 |
| [minion_hub/src/routes/(app)/sales/[id]/+page.svelte](../../minion_hub/src/routes/(app)/sales/[id]/+page.svelte) | sales | async-function: 28, 37, 52; network: 29, 40, 55; mutation-method: 30, 41, 56; refresh: 34, 46, 60; pending-feedback: 18, 38, 48, 53, 62 |
| [minion_hub/src/routes/(app)/scheduling/+layout.svelte](../../minion_hub/src/routes/(app)/scheduling/+layout.svelte) | scheduling | No lexical signal |
| [minion_hub/src/routes/(app)/scheduling/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/+page.svelte) | scheduling | No lexical signal |
| [minion_hub/src/routes/(app)/scheduling/bookings/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/bookings/+page.svelte) | scheduling | No lexical signal |
| [minion_hub/src/routes/(app)/scheduling/bookings/[id]/edit/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/bookings/[id]/edit/+page.svelte) | scheduling | No lexical signal |
| [minion_hub/src/routes/(app)/scheduling/bookings/new/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/bookings/new/+page.svelte) | scheduling | No lexical signal |
| [minion_hub/src/routes/(app)/scheduling/calendar/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/calendar/+page.svelte) | scheduling | async-function: 29; network: 33; mutation-method: 34; optimistic: 31 |
| [minion_hub/src/routes/(app)/scheduling/event-types/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/event-types/+page.svelte) | scheduling | async-function: 65, 69; network: 70; mutation-method: 70; refresh: 67, 71; save-gesture: 161 |
| [minion_hub/src/routes/(app)/scheduling/links/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/links/+page.svelte) | scheduling | async-function: 30, 42, 61; network: 46, 62; mutation-method: 47, 62; refresh: 55, 63; save-gesture: 131; pending-feedback: 24, 44, 58 |
| [minion_hub/src/routes/(app)/scheduling/reminders/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/reminders/+page.svelte) | scheduling | async-function: 114, 138; network: 117, 141; mutation-method: 118, 142; refresh: 153; save-gesture: 183; css-motion: 417, 419; pending-feedback: 62, 139, 155 |
| [minion_hub/src/routes/(app)/scheduling/settings/+page.svelte](../../minion_hub/src/routes/(app)/scheduling/settings/+page.svelte) | scheduling | async-function: 20, 39, 48; network: 23, 42, 53; mutation-method: 24, 42, 54; refresh: 28, 43, 60 |
| [minion_hub/src/routes/(app)/sessions/+page.svelte](../../minion_hub/src/routes/(app)/sessions/+page.svelte) | sessions | async-function: 24; network: 28 |
| [minion_hub/src/routes/(app)/sessions/[sessionKey]/debug/+page.svelte](../../minion_hub/src/routes/(app)/sessions/[sessionKey]/debug/+page.svelte) | sessions | async-function: 45, 59, 69; pending-feedback: 30, 47, 55 |
| [minion_hub/src/routes/(app)/settings/+layout.svelte](../../minion_hub/src/routes/(app)/settings/+layout.svelte) | settings | No lexical signal |
| [minion_hub/src/routes/(app)/settings/+page.svelte](../../minion_hub/src/routes/(app)/settings/+page.svelte) | settings | async-function: 52; save-gesture: 102, 183; pending-feedback: 128 |
| [minion_hub/src/routes/(app)/settings/appearance/+page.svelte](../../minion_hub/src/routes/(app)/settings/appearance/+page.svelte) | settings | No lexical signal |
| [minion_hub/src/routes/(app)/settings/backups/+page.svelte](../../minion_hub/src/routes/(app)/settings/backups/+page.svelte) | settings | No lexical signal |
| [minion_hub/src/routes/(app)/settings/gateways/+page.svelte](../../minion_hub/src/routes/(app)/settings/gateways/+page.svelte) | settings | async-function: 27, 32, 64, 67, 85, 105; network: 33, 42, 67; mutation-method: 34, 43, 67; refresh: 58, 79, 90, 109; save-gesture: 172; pending-feedback: 148 |
| [minion_hub/src/routes/(app)/settings/modules/+page.svelte](../../minion_hub/src/routes/(app)/settings/modules/+page.svelte) | settings | async-function: 35; network: 39; mutation-method: 40; refresh: 46; pending-feedback: 93, 107, 121, 135, 149 |
| [minion_hub/src/routes/(app)/settings/notifications/+page.svelte](../../minion_hub/src/routes/(app)/settings/notifications/+page.svelte) | settings | async-function: 54, 82, 94, 100; network: 75, 97; mutation-method: 99; refresh: 84, 102; pending-feedback: 36, 73, 90 |
| [minion_hub/src/routes/(app)/settings/organizations/+page.svelte](../../minion_hub/src/routes/(app)/settings/organizations/+page.svelte) | settings | async-function: 41; network: 48; mutation-method: 49; save-gesture: 84, 108; pending-feedback: 110 |
| [minion_hub/src/routes/(app)/settings/plugins/+page.svelte](../../minion_hub/src/routes/(app)/settings/plugins/+page.svelte) | settings | async-function: 113, 157, 160, 221; network: 161; mutation-method: 162; refresh: 116, 135; save-gesture: 458, 465, 477; optimistic: 5, 139; pending-feedback: 314, 434, 474, 483, 528 |
| [minion_hub/src/routes/(app)/settings/provision/+page.svelte](../../minion_hub/src/routes/(app)/settings/provision/+page.svelte) | settings | async-function: 33 |
| [minion_hub/src/routes/(app)/settings/pulse/+page.svelte](../../minion_hub/src/routes/(app)/settings/pulse/+page.svelte) | settings | async-function: 39, 56; network: 43; mutation-method: 46; refresh: 57; save-gesture: 106; pending-feedback: 37, 41, 63 |
| [minion_hub/src/routes/(app)/settings/roles/+page.svelte](../../minion_hub/src/routes/(app)/settings/roles/+page.svelte) | settings | No lexical signal |
| [minion_hub/src/routes/(app)/settings/team/+page.svelte](../../minion_hub/src/routes/(app)/settings/team/+page.svelte) | settings | No lexical signal |
| [minion_hub/src/routes/(app)/settings/workflows/+page.svelte](../../minion_hub/src/routes/(app)/settings/workflows/+page.svelte) | settings | async-function: 40, 69; network: 53, 72; mutation-method: 56, 74; refresh: 60, 75; save-gesture: 102; pending-feedback: 29, 51, 65 |
| [minion_hub/src/routes/(app)/shells/+page.svelte](../../minion_hub/src/routes/(app)/shells/+page.svelte) | shells | async-function: 30; pending-feedback: 26, 35, 38; poll-or-debounce: 44 |
| [minion_hub/src/routes/(app)/shells/[shellId]/+page.svelte](../../minion_hub/src/routes/(app)/shells/[shellId]/+page.svelte) | shells | async-function: 33, 49, 74; pending-feedback: 26, 36, 39; poll-or-debounce: 45 |
| [minion_hub/src/routes/(app)/socials/+layout.svelte](../../minion_hub/src/routes/(app)/socials/+layout.svelte) | socials | No lexical signal |
| [minion_hub/src/routes/(app)/socials/+page.svelte](../../minion_hub/src/routes/(app)/socials/+page.svelte) | socials | No lexical signal |
| [minion_hub/src/routes/(app)/socials/campaigns/+page.svelte](../../minion_hub/src/routes/(app)/socials/campaigns/+page.svelte) | socials | svelte-motion: 174; css-motion: 174; pending-feedback: 142 |
| [minion_hub/src/routes/(app)/socials/campaigns/[campaignId]/+page.svelte](../../minion_hub/src/routes/(app)/socials/campaigns/[campaignId]/+page.svelte) | socials | pending-feedback: 261 |
| [minion_hub/src/routes/(app)/socials/posts/+page.svelte](../../minion_hub/src/routes/(app)/socials/posts/+page.svelte) | socials | pending-feedback: 89 |
| [minion_hub/src/routes/(app)/socials/posts/[postId]/+page.svelte](../../minion_hub/src/routes/(app)/socials/posts/[postId]/+page.svelte) | socials | async-function: 62; network: 64, 74 |
| [minion_hub/src/routes/(app)/socials/settings/+page.svelte](../../minion_hub/src/routes/(app)/socials/settings/+page.svelte) | socials | async-function: 65, 81, 102; network: 69, 84, 105; mutation-method: 69, 85, 105; refresh: 72, 90, 93, 108; pending-feedback: 317 |
| [minion_hub/src/routes/(app)/stock/+layout.svelte](../../minion_hub/src/routes/(app)/stock/+layout.svelte) | stock | No lexical signal |
| [minion_hub/src/routes/(app)/stock/+page.svelte](../../minion_hub/src/routes/(app)/stock/+page.svelte) | stock | svelte-motion: 246; css-motion: 246 |
| [minion_hub/src/routes/(app)/stock/commitments/+page.svelte](../../minion_hub/src/routes/(app)/stock/commitments/+page.svelte) | stock | No lexical signal |
| [minion_hub/src/routes/(app)/stock/entries/+page.svelte](../../minion_hub/src/routes/(app)/stock/entries/+page.svelte) | stock | network: 30; save-gesture: 48 |
| [minion_hub/src/routes/(app)/stock/entries/[id]/+page.svelte](../../minion_hub/src/routes/(app)/stock/entries/[id]/+page.svelte) | stock | async-function: 37, 46, 58; network: 50, 62; mutation-method: 50, 62; refresh: 51, 64; save-gesture: 19, 40, 42, 87; pending-feedback: 32, 47, 54, 59, 67 |
| [minion_hub/src/routes/(app)/stock/entries/new/+page.svelte](../../minion_hub/src/routes/(app)/stock/entries/new/+page.svelte) | stock | async-function: 174, 198, 207, 218, 258; network: 175, 187, 224, 272; mutation-method: 176, 224; save-gesture: 561, 570; css-motion: 689, 691; pending-feedback: 160, 208, 214, 219, 234 |
| [minion_hub/src/routes/(app)/stock/entries/new/entry-lines.ts](../../minion_hub/src/routes/(app)/stock/entries/new/entry-lines.ts) | stock | No lexical signal |
| [minion_hub/src/routes/(app)/stock/items/+page.svelte](../../minion_hub/src/routes/(app)/stock/items/+page.svelte) | stock | async-function: 19, 122; network: 20; mutation-method: 21; refresh: 31, 124; save-gesture: 170 |
| [minion_hub/src/routes/(app)/stock/items/[id]/+page.svelte](../../minion_hub/src/routes/(app)/stock/items/[id]/+page.svelte) | stock | async-function: 172; network: 176; mutation-method: 177; refresh: 202; save-gesture: 204, 451; pending-feedback: 45, 173, 207 |
| [minion_hub/src/routes/(app)/stock/warehouses/+page.svelte](../../minion_hub/src/routes/(app)/stock/warehouses/+page.svelte) | stock | async-function: 62, 78, 113, 151, 170; network: 66, 82, 118, 153, 174; mutation-method: 67, 83, 119, 154, 175; refresh: 71, 89, 125, 159, 179; save-gesture: 72, 92, 128, 180, 330; pending-feedback: 37, 79, 95 |
| [minion_hub/src/routes/(app)/support/+page.svelte](../../minion_hub/src/routes/(app)/support/+page.svelte) | support | async-function: 27; network: 31; mutation-method: 32; refresh: 40; pending-feedback: 25, 29, 43 |
| [minion_hub/src/routes/(app)/support/[id]/+page.svelte](../../minion_hub/src/routes/(app)/support/[id]/+page.svelte) | support | async-function: 27, 36, 51; network: 28, 39, 54; mutation-method: 29, 40, 55; refresh: 33, 45, 59; pending-feedback: 25, 37, 47, 52, 61 |
| [minion_hub/src/routes/(app)/team/+layout.svelte](../../minion_hub/src/routes/(app)/team/+layout.svelte) | team | No lexical signal |
| [minion_hub/src/routes/(app)/team/+page.svelte](../../minion_hub/src/routes/(app)/team/+page.svelte) | team | No lexical signal |
| [minion_hub/src/routes/(app)/terminal/+page.svelte](../../minion_hub/src/routes/(app)/terminal/+page.svelte) | terminal | async-function: 29 |
| [minion_hub/src/routes/(app)/tools/+page.svelte](../../minion_hub/src/routes/(app)/tools/+page.svelte) | tools | No lexical signal |
| [minion_hub/src/routes/(app)/tools/+page.ts](../../minion_hub/src/routes/(app)/tools/+page.ts) | tools | No lexical signal |
| [minion_hub/src/routes/(app)/tools/[id]/+layout.svelte](../../minion_hub/src/routes/(app)/tools/[id]/+layout.svelte) | tools | No lexical signal |
| [minion_hub/src/routes/(app)/tools/[id]/+page.svelte](../../minion_hub/src/routes/(app)/tools/[id]/+page.svelte) | tools | async-function: 127, 162, 186, 204, 286, 311; network: 141, 168, 313, 375, 381; mutation-method: 142, 169; imperative-motion: 250; pending-feedback: 40, 41, 128, 158, 282, 301, 347; poll-or-debounce: 6, 45 |
| [minion_hub/src/routes/(app)/tools/[id]/_components/CodeEditorPane.svelte](../../minion_hub/src/routes/(app)/tools/[id]/_components/CodeEditorPane.svelte) | tools | svelte-motion: 342, 373, 494, 513, 538, 610; css-motion: 342, 373, 494, 513, 538, 610 |
| [minion_hub/src/routes/(app)/tools/[id]/_components/CodeMirrorEditor.svelte](../../minion_hub/src/routes/(app)/tools/[id]/_components/CodeMirrorEditor.svelte) | tools | No lexical signal |
| [minion_hub/src/routes/(app)/tools/[id]/_components/ConsolePane.svelte](../../minion_hub/src/routes/(app)/tools/[id]/_components/ConsolePane.svelte) | tools | svelte-motion: 93; css-motion: 93, 131, 134 |
| [minion_hub/src/routes/(app)/tools/[id]/_components/EditorToolbar.svelte](../../minion_hub/src/routes/(app)/tools/[id]/_components/EditorToolbar.svelte) | tools | save-gesture: 223, 224, 231, 234; svelte-motion: 313, 349, 417, 443; css-motion: 313, 349, 417, 443, 495, 507 |
| [minion_hub/src/routes/(app)/tools/[id]/_components/GatewayToolView.svelte](../../minion_hub/src/routes/(app)/tools/[id]/_components/GatewayToolView.svelte) | tools | async-function: 52; svelte-motion: 456; css-motion: 456 |
| [minion_hub/src/routes/(app)/tools/[id]/_components/tool-editor-completions.ts](../../minion_hub/src/routes/(app)/tools/[id]/_components/tool-editor-completions.ts) | tools | No lexical signal |
| [minion_hub/src/routes/(app)/tools/[id]/_components/tool-editor-snippets.ts](../../minion_hub/src/routes/(app)/tools/[id]/_components/tool-editor-snippets.ts) | tools | network: 42 |
| [minion_hub/src/routes/(app)/users/+page.svelte](../../minion_hub/src/routes/(app)/users/+page.svelte) | users | No lexical signal |
| [minion_hub/src/routes/(app)/users/join-requests/+page.svelte](../../minion_hub/src/routes/(app)/users/join-requests/+page.svelte) | users | async-function: 20, 41, 63, 86; network: 24, 45, 68, 90; mutation-method: 25, 45, 69, 90; refresh: 33, 50, 78, 95; save-gesture: 193, 216; pending-feedback: 8, 22, 37, 43, 54, 151, 161, 172, 219 |
| [minion_hub/src/routes/(app)/work/+page.svelte](../../minion_hub/src/routes/(app)/work/+page.svelte) | work | async-function: 33, 65, 82, 95, 112; network: 36, 70, 98, 115; mutation-method: 39, 73, 101, 117; refresh: 43, 85, 105, 118; pending-feedback: 55, 67, 91; poll-or-debounce: 23 |
| [minion_hub/src/routes/(app)/workforce/+error.svelte](../../minion_hub/src/routes/(app)/workforce/+error.svelte) | workforce | No lexical signal |
| [minion_hub/src/routes/(app)/workforce/+layout.svelte](../../minion_hub/src/routes/(app)/workforce/+layout.svelte) | workforce | No lexical signal |
| [minion_hub/src/routes/(app)/workforce/+page.svelte](../../minion_hub/src/routes/(app)/workforce/+page.svelte) | workforce | poll-or-debounce: 118 |
| [minion_hub/src/routes/(app)/workforce/activity/+page.svelte](../../minion_hub/src/routes/(app)/workforce/activity/+page.svelte) | workforce | poll-or-debounce: 15 |
| [minion_hub/src/routes/(app)/workforce/agents/[id]/+page.svelte](../../minion_hub/src/routes/(app)/workforce/agents/[id]/+page.svelte) | workforce | poll-or-debounce: 75 |
| [minion_hub/src/routes/(app)/workforce/approvals/+page.svelte](../../minion_hub/src/routes/(app)/workforce/approvals/+page.svelte) | workforce | No lexical signal |
| [minion_hub/src/routes/(app)/workforce/costs/+page.svelte](../../minion_hub/src/routes/(app)/workforce/costs/+page.svelte) | workforce | poll-or-debounce: 50 |
| [minion_hub/src/routes/(app)/workforce/goals/+page.svelte](../../minion_hub/src/routes/(app)/workforce/goals/+page.svelte) | workforce | poll-or-debounce: 89 |
| [minion_hub/src/routes/(app)/workforce/inbox/+page.svelte](../../minion_hub/src/routes/(app)/workforce/inbox/+page.svelte) | workforce | poll-or-debounce: 89 |
| [minion_hub/src/routes/(app)/workforce/issues/+page.svelte](../../minion_hub/src/routes/(app)/workforce/issues/+page.svelte) | workforce | poll-or-debounce: 15 |
| [minion_hub/src/routes/(app)/workforce/issues/[id]/+page.svelte](../../minion_hub/src/routes/(app)/workforce/issues/[id]/+page.svelte) | workforce | No lexical signal |
| [minion_hub/src/routes/(app)/workforce/org/+page.svelte](../../minion_hub/src/routes/(app)/workforce/org/+page.svelte) | workforce | svelte-motion: 223; css-motion: 223; poll-or-debounce: 124 |
| [minion_hub/src/routes/(app)/workforce/portfolios/+page.svelte](../../minion_hub/src/routes/(app)/workforce/portfolios/+page.svelte) | workforce | async-function: 19; network: 24; mutation-method: 25; refresh: 32; pending-feedback: 12, 21, 35 |
| [minion_hub/src/routes/(app)/workforce/portfolios/[id]/+page.svelte](../../minion_hub/src/routes/(app)/workforce/portfolios/[id]/+page.svelte) | workforce | No lexical signal |
| [minion_hub/src/routes/(app)/workforce/projects/+page.svelte](../../minion_hub/src/routes/(app)/workforce/projects/+page.svelte) | workforce | async-function: 35, 61, 80; network: 39, 65, 84; mutation-method: 40, 66, 85; refresh: 54; pending-feedback: 16, 37, 57, 63, 75, 82, 100 |
| [minion_hub/src/routes/(app)/workforce/projects/[id]/+page.svelte](../../minion_hub/src/routes/(app)/workforce/projects/[id]/+page.svelte) | workforce | async-function: 15, 80, 90, 101, 111; network: 16, 83, 94, 104, 115; mutation-method: 17, 84, 95, 105, 116; refresh: 21, 87, 98, 108, 119; pending-feedback: 23, 81, 88, 92, 99, 102, 109, 113, 120 |
| [minion_hub/src/routes/(app)/workforce/projects/[id]/pipelines/+page.svelte](../../minion_hub/src/routes/(app)/workforce/projects/[id]/pipelines/+page.svelte) | workforce | async-function: 81, 110; network: 88, 93, 113; mutation-method: 89, 94, 114; refresh: 104, 118; save-gesture: 348; pending-feedback: 28, 83, 106, 111, 120 |
| [minion_hub/src/routes/(app)/workforce/reliability/+page.svelte](../../minion_hub/src/routes/(app)/workforce/reliability/+page.svelte) | workforce | poll-or-debounce: 99 |
| [minion_hub/src/routes/(app)/workforce/settings/+page.svelte](../../minion_hub/src/routes/(app)/workforce/settings/+page.svelte) | workforce | No lexical signal |
| [minion_hub/src/routes/(app)/workforce/settings/agents/+page.svelte](../../minion_hub/src/routes/(app)/workforce/settings/agents/+page.svelte) | workforce | No lexical signal |
| [minion_hub/src/routes/(app)/workforce/welcome/+page.svelte](../../minion_hub/src/routes/(app)/workforce/welcome/+page.svelte) | workforce | No lexical signal |
| [minion_hub/src/routes/(app)/workshop/[...path]/+page.svelte](../../minion_hub/src/routes/(app)/workshop/[...path]/+page.svelte) | workshop | No lexical signal |
| [minion_hub/src/routes/(app)/workshop/[...path]/+page.ts](../../minion_hub/src/routes/(app)/workshop/[...path]/+page.ts) | workshop | No lexical signal |
| [minion_hub/src/routes/+error.svelte](../../minion_hub/src/routes/+error.svelte) | shared | No lexical signal |
| [minion_hub/src/routes/+layout.svelte](../../minion_hub/src/routes/+layout.svelte) | shared | async-function: 81; refresh: 41; css-motion: 171 |
| [minion_hub/src/routes/+layout.ts](../../minion_hub/src/routes/+layout.ts) | shared | async-function: 7 |
| [minion_hub/src/routes/auth/reset/+page.svelte](../../minion_hub/src/routes/auth/reset/+page.svelte) | shared | async-function: 17; network: 33; mutation-method: 34; save-gesture: 43, 50, 94, 128, 129; pending-feedback: 13, 31, 52, 128 |
| [minion_hub/src/routes/book/[slug]/+page.svelte](../../minion_hub/src/routes/book/[slug]/+page.svelte) | shared | async-function: 97, 123, 151; network: 105, 134, 159; mutation-method: 160; save-gesture: 431, 478; pending-feedback: 22, 99, 119, 129, 147, 156, 183, 319, 366 |
| [minion_hub/src/routes/invite/accept/+layout.svelte](../../minion_hub/src/routes/invite/accept/+layout.svelte) | shared | No lexical signal |
| [minion_hub/src/routes/invite/accept/+layout.ts](../../minion_hub/src/routes/invite/accept/+layout.ts) | shared | No lexical signal |
| [minion_hub/src/routes/invite/accept/+page.svelte](../../minion_hub/src/routes/invite/accept/+page.svelte) | shared | No lexical signal |
| [minion_hub/src/routes/join/+page.svelte](../../minion_hub/src/routes/join/+page.svelte) | shared | async-function: 20; save-gesture: 71, 109, 110; pending-feedback: 71, 109 |
| [minion_hub/src/routes/join/sent/+page.svelte](../../minion_hub/src/routes/join/sent/+page.svelte) | shared | No lexical signal |
| [minion_hub/src/routes/link/[code]/+page.svelte](../../minion_hub/src/routes/link/[code]/+page.svelte) | shared | async-function: 15; save-gesture: 70; pending-feedback: 70 |
| [minion_hub/src/routes/login/+layout.svelte](../../minion_hub/src/routes/login/+layout.svelte) | shared | No lexical signal |
| [minion_hub/src/routes/login/+layout.ts](../../minion_hub/src/routes/login/+layout.ts) | shared | No lexical signal |
| [minion_hub/src/routes/login/+page.svelte](../../minion_hub/src/routes/login/+page.svelte) | shared | async-function: 55, 78, 91; network: 134; mutation-method: 135; save-gesture: 175, 247, 248; pending-feedback: 18, 94, 147, 262 |
| [minion_hub/src/routes/login/forgot/+page.svelte](../../minion_hub/src/routes/login/forgot/+page.svelte) | shared | async-function: 11; network: 18; mutation-method: 19; save-gesture: 57, 69, 70; pending-feedback: 8, 14, 25 |
| [minion_hub/src/routes/onboarding/+layout.svelte](../../minion_hub/src/routes/onboarding/+layout.svelte) | shared | No lexical signal |
| [minion_hub/src/routes/onboarding/+page.svelte](../../minion_hub/src/routes/onboarding/+page.svelte) | shared | async-function: 74, 92; network: 98; mutation-method: 99; refresh: 107; pending-feedback: 156 |
| [minion_hub/src/routes/onboarding/complete/+page.svelte](../../minion_hub/src/routes/onboarding/complete/+page.svelte) | shared | reduced-motion: 19, 23; poll-or-debounce: 29 |
| [packages/ui/src/lib/Badge.svelte](../../packages/ui/src/lib/Badge.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/Button.svelte](../../packages/ui/src/lib/Button.svelte) | shared | pending-feedback: 53, 102, 112 |
| [packages/ui/src/lib/Card.svelte](../../packages/ui/src/lib/Card.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/Checkbox.svelte](../../packages/ui/src/lib/Checkbox.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/FormField.svelte](../../packages/ui/src/lib/FormField.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/IconButton.svelte](../../packages/ui/src/lib/IconButton.svelte) | shared | pending-feedback: 27 |
| [packages/ui/src/lib/Input.svelte](../../packages/ui/src/lib/Input.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/Radio.svelte](../../packages/ui/src/lib/Radio.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/Select.svelte](../../packages/ui/src/lib/Select.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/Skeleton.svelte](../../packages/ui/src/lib/Skeleton.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/Spinner.svelte](../../packages/ui/src/lib/Spinner.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/Textarea.svelte](../../packages/ui/src/lib/Textarea.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/Toggle.svelte](../../packages/ui/src/lib/Toggle.svelte) | shared | No lexical signal |
| [packages/ui/src/lib/index.ts](../../packages/ui/src/lib/index.ts) | shared | No lexical signal |
