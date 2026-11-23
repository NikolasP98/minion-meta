# Branding coverage inventory

Evidence from pinned clean Hub origin/master source 3d39cbb6 on 2026-11-21. File hashes and HEAD comparisons are in [source-evidence.json](source-evidence.json). Reconcile against the isolated implementation base before editing. This is source inspection, not runtime proof.

All Hub identity rows require conversion. Technical names, service identities and content belonging to users/authors retain their original meaning. A remaining manual-classification row blocks implementation completion. CSS selector/component names can remain if rendered text changes.

| File:line | Classification | Candidate | Disposition |
|---|---|---|---|
| `src/app.html:12` | technical/distinct-service | <meta name="apple-mobile-web-app-title" content="Minion" /> | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/agents/AgentDashboard.svelte:19` | technical/comment | import type { Agent } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/agents/AgentDetail.svelte:20` | technical/comment | import type { Agent } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/agents/AgentPromptSimulator.svelte:13` | technical/comment | import type { PromptMode, PreviewResponse } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/agents/AgentPromptSimulator.svelte:232` | technical/distinct-service | readPref('minion.promptTab.group', 'layer', ['layer', 'none', 'pipeline']), | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/agents/AgentPromptSimulator.svelte:236` | technical/distinct-service | readPref('minion.promptTab.sort', 'order', ['order', 'cached', 'alpha', 'size']), | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/agents/AgentPromptSimulator.svelte:240` | technical/distinct-service | localStorage.setItem('minion.promptTab.group', groupMode); | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/agents/AgentPromptSimulator.svelte:244` | technical/distinct-service | localStorage.setItem('minion.promptTab.sort', sortMode); | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/agents/AgentRow.svelte:14` | technical/comment | import type { Agent } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/agents/AgentSidebar.svelte:37` | technical/comment | import type { Agent } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/agents/PiAgentOrchestrations.svelte:7` | technical/comment | import type { SemanticValue } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/brains/BrainDocumentsTable.svelte:5` | technical/comment | import type { SemanticValue } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/brains/BrainKnowledgeCard.svelte:4` | technical/comment | import type { SemanticValue } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/brains/BrainKnowledgeSources.svelte:4` | technical/comment | import type { SemanticValue } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/brains/BrainOverviewPanel.svelte:12` | technical/comment | import type { SemanticValue } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/charts/Chart.svelte:305` | technical/distinct-service | echarts.registerTheme('minion-dark', buildTheme()); | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/charts/Chart.svelte:306` | technical/distinct-service | chart = echarts.init(container, 'minion-dark'); | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/charts/Chart.svelte:326` | technical/distinct-service | echartsLib.registerTheme('minion-dark', buildTheme()); | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/charts/Chart.svelte:332` | technical/distinct-service | chart = echartsLib.init(container, 'minion-dark'); | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/chat/AIDisclosureBadge.svelte:7` | technical/distinct-service | const SESSION_KEY = 'minion-ai-disclosure-collapsed'; | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/chat/MarkdownMessage.svelte:40` | technical/comment | // UI tool calls (\`\`\`minion-ui fences) are executed by the assistant runner, | Source import, comment or documentation; preserve. |
| `src/lib/components/cloud/ProvisionWorkspaceDialog.svelte:26` | technical/distinct-service | { id: 'minion-drone', name: 'Minion Drone', description: m.cloud_runtime_drone() }, | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/cloud/ProvisionWorkspaceDialog.svelte:71` | technical/distinct-service | blueprint: 'minion-workstation-v1', | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/cloud/ProvisionWorkspaceDialog.svelte:72` | technical/distinct-service | image: 'minion-workstation-v1', | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/cloud/ProvisionWorkspaceDialog.svelte:116` | technical/distinct-service | <strong id="cloud-blueprint-title">minion-workstation-v1</strong> | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/crm/Connections.svelte:3` | technical/comment | // Cross-module Connections panel — Minion's port of ERPNext's declarative | Source import, comment or documentation; preserve. |
| `src/lib/components/data-table/DataTable.svelte:1935` | technical/comment | // + happy-dom crashes mounting ANY @minion-stack/ui Button.svelte instance | Source import, comment or documentation; preserve. |
| `src/lib/components/data-view/CollectionState.svelte:18` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/data-view/__fixtures__/collection-state-harness.svelte:3` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/desktop-updater/Updater.svelte:3` | technical/comment | import { Button, Spinner } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/desktop-updater/Updater.svelte:88` | native installer identity | <h1 class="t-heading">Minion Hub</h1> | Standalone updater identity; preserve. Hosted DesktopTitlebar remains in scope. |
| `src/lib/components/doors/faq/Editor.svelte:3` | technical/comment | import { Textarea } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/flow-editor/FlowCopilotPanel.svelte:9` | technical/comment | import { Button, Textarea } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/AuthorityRetirement.svelte:3` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/DesktopTitlebar.svelte:9` | technical/distinct-service | native = !!(window as Window & { __MINION_DESKTOP__?: boolean }).__MINION_DESKTOP__; | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/layout/DesktopTitlebar.svelte:23` | Hub identity | <span class="t-label" data-tauri-drag-region>Minion Hub</span> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/layout/DetailHeader.svelte:6` | technical/comment | import type { Agent } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/DevUserSwitcher.svelte:2` | technical/comment | // Spec 2026-09-16-hub-minion-run-dev-switcher §2.3. Opened from | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/EnvBadge.svelte:2` | technical/comment | // DEV/PRD backend-mode badge (spec 2026-09-16-hub-minion-run-dev-switcher | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/FloatingAssistant.svelte:218` | technical/comment | // opens with a \`\`\`minion-ui fence streams as an EMPTY bubble until the fence | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/GlobalActivity.svelte:4` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/MinionLogo.svelte:264` | technical/comment | <!-- Default Minion - stylized goggles --> | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/MinionLogo.svelte:284` | technical/distinct-service | fill="url(#minion-gradient)" | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/layout/MinionLogo.svelte:289` | technical/comment | <!-- The "M" mark - stylized as minion goggles/face --> | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/MinionLogo.svelte:331` | technical/comment | <!-- Minion smile --> | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/MinionLogo.svelte:344` | technical/distinct-service | id="minion-gradient" | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/layout/MinionLogo.svelte:366` | technical/distinct-service | style="color: {currentPreset.id === 'minion' | Preset or runtime product identity; preserve. |
| `src/lib/components/layout/MinionLogo.svelte:368` | Hub identity | : currentPreset.secondaryColor}">MINION</span | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/layout/Sidebar.svelte:572` | Hub identity | <a use:moduleNavigation.link href="/" class="brand-row" aria-label="Minion Hub"> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/layout/Sidebar.svelte:575` | Hub identity | <span class="brand-minion">MINION</span> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/layout/Sidebar.svelte:736` | technical/distinct-service | .brand-minion { | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/layout/Topbar.svelte:25` | technical/comment | import MinionLogo from './MinionLogo.svelte'; | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/Topbar.svelte:213` | Hub identity | aria-label="Minion Hub" | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/layout/Topbar.svelte:215` | component/preset | <MinionLogo size="sm" /> | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/components/layout/Topbar.svelte:217` | Hub identity | <span class="font-black text-sm tracking-wide uppercase text-brand-pink">MINION</span> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/layout/WelcomePanel.svelte:5` | technical/comment | import MinionLogo from './MinionLogo.svelte'; | Source import, comment or documentation; preserve. |
| `src/lib/components/layout/WelcomePanel.svelte:24` | component/preset | <MinionLogo size="lg" /> | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/components/marketplace/AgentCard.svelte:212` | technical/comment | /* "MINION" repeated watermark — behind card content, above card background */ | Source import, comment or documentation; preserve. |
| `src/lib/components/marketplace/AgentCard.svelte:214` | Hub identity | content: 'MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION   | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/marketplace/AgentCreatorWizard.svelte:476` | technical/distinct-service | <p>cd ~/nikolasp98/minions</p> | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/marketplace/_agent-card/IdFooter.svelte:13` | Hub identity | <div class="company-brand">MINION</div> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/my-agent/NoteEditor.svelte:121` | technical/distinct-service | const bufferKey = \`minion-note-transcript-buf-${note.id}-${block?.id ?? 'body'}\`; | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/my-agent/ZenSettingsMenu.svelte:3` | technical/comment | import type { ButtonProps } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/navigation/PersonalHome.svelte:107` | Hub identity | <svelte:head><title>{m.nav_personalHome()} · MINION hub</title></svelte:head> | Use resolved identity or neutral assistant copy where a personal agent is meant. |
| `src/lib/components/navigation/SectionAccessButton.svelte:3` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/navigation/SectionAccessDialog.svelte:4` | technical/comment | import { Button, Input, Select } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/prompt/BreakdownTree.svelte:5` | technical/comment | import type { SectionMeta } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/prompt/PromptTopbarChip.svelte:5` | technical/comment | import type { PromptMode } from "@minion-stack/shared"; | Source import, comment or documentation; preserve. |
| `src/lib/components/prompt/SelectionDetail.svelte:4` | technical/comment | import type { SectionFull, SectionMeta } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/prompt/ValidationErrors.svelte:2` | technical/comment | import type { SectionViolation } from "@minion-stack/shared"; | Source import, comment or documentation; preserve. |
| `src/lib/components/provision/ProvisionConfigForm.svelte:90` | technical/distinct-service | placeholder="minion" | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/pulse/PulseFeedback.svelte:4` | technical/comment | import { Select, Textarea } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/reliability/ProposedActionsFeed.svelte:16` | technical/distinct-service | const STORAGE_KEY = 'minion-hub-reliability-dismissed-actions'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/sandbox/ElementFrame.svelte:55` | technical/distinct-service | { minion: 1, elementId: element.id, requestId: null, type, payload }, | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/scheduling/BookingCalendar.svelte:66` | technical/distinct-service | export const CALENDAR_DROP_MIME = 'application/x-minion-calendar-drop'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/scheduling/__fixtures__/AnchorProbe.svelte:7` | technical/distinct-service | export const CALENDAR_DROP_MIME = 'application/x-minion-calendar-drop'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/sessions/SessionDropdown.svelte:5` | technical/comment | import type { Session } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/components/settings/BackupsTab.svelte:9` | technical/comment | import type { SemanticValue } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/settings/CRTConfigModal.svelte:245` | Hub identity | >[MINION]</span | Use resolved identity or neutral assistant copy where a personal agent is meant. |
| `src/lib/components/settings/SecretEditModal.svelte:4` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/settings/SecretsSection.svelte:82` | technical/distinct-service | if (/unavailable\|MINION_SECRETS_KEY\|vault/i.test(msg)) { | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/settings/SecretsSection.svelte:281` | technical/distinct-service | Configure <code class="font-mono bg-canvas/30 px-1 py-0.5 rounded">MINION_SECRETS_KEY</code> | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/stock/CorrectionFlow.svelte:283` | technical/distinct-service | if (e.key === null \|\| e.key.startsWith('minion:stock-correction:pending:v1:')) untrack(load); | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/team/TeamSettingsView.svelte:9` | technical/comment | import { Checkbox } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/PageHeader.fixture.svelte:2` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/Picker.svelte:16` | technical/comment | import { Button, Checkbox, Input } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/PickerCombobox.svelte:10` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/Select.svelte:17` | technical/comment | * should import Select and its string-valued contract from \`@minion-stack/ui\`. | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/Select.svelte:47` | technical/distinct-service | } from '@minion-stack/ui'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/components/ui/Skeleton.svelte:12` | technical/comment | import { Skeleton as SharedSkeleton } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/Spinner.svelte:2` | technical/comment | export type { SpinnerProps, SpinnerSize } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/Spinner.svelte:6` | technical/comment | import { Spinner as SharedSpinner, type SpinnerProps } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/Toggle.svelte:29` | technical/comment | import { Toggle as SharedToggle, Spinner } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/foundations/AsyncBoundary.svelte:14` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/foundations/ConfirmDialog.svelte:8` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/foundations/Dialog.svelte:13` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/foundations/Dialog.svelte:190` | technical/comment | // \`@minion-stack/ui\` Button hardcodes its own \`data-part="button"\` | Source import, comment or documentation; preserve. |
| `src/lib/components/ui/foundations/PublicTaskShell.svelte:50` | Hub identity | <span class="wordmark-minion">Minion</span> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/ui/foundations/PublicTaskShell.svelte:172` | Hub identity | .wordmark-minion { | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/components/ui/foundations/foundation-test-harness.svelte:2` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/users/RbacRolesSection.svelte:32` | technical/comment | import { Button, Input } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/users/RoleSimulationDialog.svelte:18` | technical/comment | import { Button, Input, Radio } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/workforce/ApprovalPayload.svelte:2` | technical/distinct-service | Svelte port of paperclip-minion/ui/src/components/ApprovalPayload.tsx. | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/components/workshop/_workshop-canvas/TaskPromptDialog.svelte:4` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/components/workshop/_workshop-canvas/WorkshopAgentControls.svelte:2` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/shell/OptimisticOwner.fixture.svelte:2` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/AI/AiOrbFace.stories.svelte:32` | technical/distinct-service | <Story name="Labelled accessible" args={{ 'aria-label': 'Minion assistant, idle' }} /> | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/stories/Agents/BreakdownTree.stories.svelte:5` | technical/comment | import type { SectionBreakdown, SectionLayer, SectionMeta } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Agents/PromptTopbarChip.stories.svelte:3` | technical/comment | import type { PromptMode } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Agents/ValidationErrors.stories.svelte:3` | technical/comment | import type { SectionViolation } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Avatar.stories.svelte:22` | technical/distinct-service | <Story name="Image" args={{ name: 'Minion', src: '/mascot.png' }}> | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/stories/Badge.stories.svelte:3` | technical/comment | import { Badge } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Button.stories.svelte:2` | technical/comment | // Shared primitive from @minion-stack/ui — the variants the hub actually ships. | Source import, comment or documentation; preserve. |
| `src/lib/stories/Button.stories.svelte:4` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Card.stories.svelte:3` | technical/comment | import { Card } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Cards/OrgChartNode.stories.svelte:78` | technical/distinct-service | avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=minion', | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/stories/Chat/ChatMessage.stories.svelte:57` | technical/distinct-service | args={{ message: assistant('Run this:\n\n\`\`\`bash\nminion doctor --json \| jq .infisical\n\`\`\`') }} | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/stories/Chat/MarkdownMessage.stories.svelte:13` | technical/distinct-service | 'Run:\n\n\`\`\`bash\nminion doctor --json \| jq .infisical\n\`\`\`\n\n\`\`\`ts\nexport function fmt(n: number) {\n  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);\n}\n\`\`\`'; | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/stories/Chat/MarkdownMessage.stories.svelte:22` | technical/distinct-service | 'Which way?\n\n\`\`\`minion-ui\n{"tool":"ui.choice","input":{"question":"Learn or do?","options":[{"label":"Show me how"},{"label":"Just do it"}]}}\n\`\`\`'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/stories/Chat/MarkdownMessage.stories.svelte:24` | technical/distinct-service | '\`\`\`minion-ui\n{"tool":"fill_booking_form","input":{"contact":"Ana"}}\n\`\`\`\n\n\`\`\`minion-ui\n{"tool":"ui.guide","input":{"steps":[]}}\n\`\`\`'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/lib/stories/Checkbox.stories.svelte:3` | technical/comment | import { Checkbox } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Data/CollectionState.stories.svelte:5` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/EmptyState.stories.svelte:4` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Forms/FormField.stories.svelte:3` | technical/comment | import { FormField, Input, Textarea, Select, Checkbox, Toggle } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/IconButton.stories.svelte:4` | technical/comment | import { IconButton } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Input.stories.svelte:3` | technical/comment | import { Input } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Navigation/ConnectionStatusIndicator.stories.svelte:3` | technical/comment | import type { HelloOk } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:4` | technical/comment | import MinionLogo from '$lib/components/layout/MinionLogo.svelte'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:7` | component/preset | const sizes: NonNullable<ComponentProps<typeof MinionLogo>['size']>[] = ['sm', 'md', 'lg']; | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:10` | component/preset | title: 'Components/Navigation/MinionLogo', | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:11` | component/preset | component: MinionLogo, | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:24` | component/preset | {#snippet template(args)}<MinionLogo {...args} />{/snippet} | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:28` | component/preset | {#snippet template(args)}<MinionLogo {...args} />{/snippet} | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:32` | component/preset | {#snippet template(args)}<MinionLogo {...args} />{/snippet} | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:39` | component/preset | <MinionLogo size={s} showText /> | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/stories/Navigation/MinionLogo.stories.svelte:50` | component/preset | <MinionLogo preset={p.id} size="lg" /> | Component/preset identity stays; inspect its rendered text separately. |
| `src/lib/stories/PageHeader.stories.svelte:5` | technical/comment | import { Button, IconButton } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Radio.stories.svelte:3` | technical/comment | import { Radio } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Select.stories.svelte:3` | technical/comment | import { Select } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Sessions/LiveRunWidget.stories.svelte:3` | technical/comment | import type { Agent } from '@minion-stack/shared'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Shared/Markdown.stories.svelte:6` | Hub identity | const KITCHEN_SINK = \`# Minion hub | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/lib/stories/Shared/Markdown.stories.svelte:47` | technical/distinct-service | document.documentElement.setAttribute('data-minion-theme', p.id); | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/lib/stories/Textarea.stories.svelte:3` | technical/comment | import { Textarea } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/lib/stories/Toggle.stories.svelte:3` | technical/comment | import { Toggle } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/agents/builder/+page.svelte:11` | Hub identity | <title>Agent Builder · Minion</title> | Use resolved identity or neutral assistant copy where a personal agent is meant. |
| `src/routes/(app)/brains/template/+page.svelte:6` | technical/comment | import { Textarea } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/capabilities/+page.svelte:41` | Hub identity | <title>Capabilities · Minion</title> | Use resolved identity or neutral assistant copy where a personal agent is meant. |
| `src/routes/(app)/cloud/+page.svelte:52` | Hub identity | <svelte:head><title>{m.cloud_overview_title()} · Minion hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/cloud/+page.svelte:130` | technical/distinct-service | <small>minion-workstation-v1</small> | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/cloud/gui/+page.svelte:35` | Hub identity | <svelte:head><title>{m.cloud_gui_title()} · Minion hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/cloud/settings/+page.svelte:76` | Hub identity | <svelte:head><title>{m.cloud_settings_title()} · Minion hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/cloud/settings/+page.svelte:113` | technical/distinct-service | <dd>{selected.blueprint ?? 'minion-workstation-v1'}</dd> | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/cloud/terminal/+page.svelte:35` | Hub identity | <svelte:head><title>{m.cloud_terminal_title()} · Minion hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/home/+page.svelte:141` | technical/distinct-service | const DOCK_SECTIONS_KEY = 'minion-home-dock-sections'; | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/routes/(app)/home/+page.svelte:175` | technical/distinct-service | const LAST_SEEN_KEY = 'minion:my-agent:emails-last-seen'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/home/+page.svelte:208` | technical/distinct-service | const OPENED_KEY = 'minion:my-agent:emails-opened'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/home/+page.svelte:381` | technical/distinct-service | const COLLAPSE_KEY = 'minion:my-agent:feed-collapsed'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/home/+page.svelte:398` | technical/distinct-service | const FEED_CACHE_KEY = 'minion:my-agent:feed-snapshot'; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/home/+page.svelte:582` | technical/distinct-service | \`minion:chat-branches:v1:${id}:${sessionKey}\`; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/home/+page.svelte:932` | Hub identity | <title>My Agent · Minion</title> | Use resolved identity or neutral assistant copy where a personal agent is meant. |
| `src/routes/(app)/home/settings/+page.svelte:17` | technical/comment | import { Skeleton as SharedSkeleton } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/killswitches/+page.svelte:104` | Hub identity | <svelte:head><title>Kill Switches · Minion hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/marketplace/agents/+page.svelte:281` | Hub identity | <span class="list-brand">MINION</span> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/marketplace/agents/+page.svelte:700` | technical/comment | /* "MINION" watermark — behind card content, above card background */ | Source import, comment or documentation; preserve. |
| `src/routes/(app)/marketplace/agents/+page.svelte:702` | Hub identity | content: 'MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION  MINION   | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/marketplace/agents/[slug]/_components/IdBadgeCard.svelte:135` | Hub identity | <span class="company-brand">MINION</span> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/notifications/daily/+page.svelte:36` | technical/comment | import { Button } from '@minion-stack/ui'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/pos/sell/PageBody.svelte:840` | technical/comment | // TODO(handoff): HS-011 in minion-meta/proposals/2026-10-02-hub-gateway-production-readiness-recon.md | Source import, comment or documentation; preserve. |
| `src/routes/(app)/prompt/+page.svelte:10` | Hub identity | <title>Prompt Engineering · Minion Hub</title> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/sessions/[sessionKey]/debug/+page.svelte:87` | Hub identity | <title>Debug · {sessionKey} · Minion Hub</title> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/(app)/settings/appearance/+page.svelte:12` | technical/comment | import MinionLogo from '$lib/components/layout/MinionLogo.svelte'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/settings/appearance/+page.svelte:82` | component/preset | <MinionLogo size="md" preset={logoPreset.id} /> | Component/preset identity stays; inspect its rendered text separately. |
| `src/routes/(app)/settings/plugins/+page.svelte:88` | technical/comment | // ~/.minion/gateway.json under the dotted path | Source import, comment or documentation; preserve. |
| `src/routes/(app)/settings/plugins/+page.svelte:242` | technical/distinct-service | <code class="rounded bg-muted px-1.5 py-0.5 text-xs">~/.minion/gateway.json</code | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/team/PageBody.svelte:45` | Hub identity | <title>{TITLES[tab]()} · {m.team_title()} · Minion</title> | Use resolved identity or neutral assistant copy where a personal agent is meant. |
| `src/routes/(app)/tools/+page.svelte:6` | Hub identity | <title>Tools · Minion</title> | Use resolved identity or neutral assistant copy where a personal agent is meant. |
| `src/routes/(app)/tools/[id]/+page.svelte:92` | technical/distinct-service | javascript: \`// MINION custom tool. Input arrives as MINION_TOOL_INPUT (JSON or text). | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:93` | technical/comment | // Available env vars: MINION_AGENT_ID, MINION_ORG_ID, MINION_USER_ID, | Source import, comment or documentation; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:94` | technical/comment | // MINION_GATEWAY_URL, MINION_HUB_URL, MINION_TOOL_ID, MINION_TOOL_NAME | Source import, comment or documentation; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:97` | technical/distinct-service | const input = process.env.MINION_TOOL_INPUT ?? ''; | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:102` | technical/distinct-service | python: \`# MINION custom tool. Input arrives as MINION_TOOL_INPUT (JSON or text). | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:103` | technical/distinct-service | # Available env vars: MINION_AGENT_ID, MINION_ORG_ID, MINION_USER_ID, | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:104` | technical/distinct-service | # MINION_GATEWAY_URL, MINION_HUB_URL, MINION_TOOL_ID, MINION_TOOL_NAME | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:108` | technical/distinct-service | tool_input = os.environ.get('MINION_TOOL_INPUT', '') | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:114` | technical/distinct-service | # MINION custom tool. Input arrives as $MINION_TOOL_INPUT (JSON or text). | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:115` | technical/distinct-service | # Available env vars: MINION_AGENT_ID, MINION_ORG_ID, MINION_USER_ID, | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:116` | technical/distinct-service | # MINION_GATEWAY_URL, MINION_HUB_URL, MINION_TOOL_ID, MINION_TOOL_NAME | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `src/routes/(app)/tools/[id]/+page.svelte:119` | technical/distinct-service | echo "{\\"ok\\": true, \\"input\\": \\"\${MINION_TOOL_INPUT}\\"}" | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/(app)/workforce/approvals/+page.svelte:3` | technical/comment | import type { ApprovalStatus } from '@minion-stack/workforce-client'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/workforce/goals/+page.svelte:4` | technical/comment | import type { Goal, GoalStatus, GoalLevel } from '@minion-stack/workforce-client'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/workforce/issues/+page.svelte:4` | technical/comment | import type { IssueStatus } from '@minion-stack/workforce-client'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/workforce/issues/[id]/+page.svelte:3` | technical/comment | import type { IssueStatus } from '@minion-stack/workforce-client'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/workforce/projects/[id]/+page.svelte:16` | technical/comment | import type { Issue } from '@minion-stack/workforce-client'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/workforce/projects/[id]/pipelines/+page.svelte:4` | technical/comment | import type { Pipeline } from '@minion-stack/workforce-client'; | Source import, comment or documentation; preserve. |
| `src/routes/(app)/workforce/settings/+page.svelte:140` | technical/distinct-service | Sharing anonymized feedback traces with Minion Workforce. | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/+error.svelte:34` | Hub identity | <svelte:head><title>{title} — Minion Hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/+error.svelte:53` | technical/distinct-service | href="mailto:admin@minion-ai.org?subject=Workspace%20access%20request" | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/auth/reset/+page.svelte:57` | Hub identity | <svelte:head><title>{m.reset_title()} — Minion Hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/invite/accept/+page.svelte:14` | Hub identity | <svelte:head><title>Invitation — Minion Hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/invite/accept/+page.svelte:21` | Hub identity | description="Invitation links now continue through Minion’s organization access flow." | Use resolved identity or neutral assistant copy where a personal agent is meant. |
| `src/routes/join/+page.svelte:31` | Hub identity | <title>Request Access — Minion Hub</title> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/join/sent/+page.svelte:11` | Hub identity | <svelte:head><title>{m.join_pendingEyebrow()} — Minion Hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/link/[code]/+page.svelte:26` | Hub identity | <title>Link Your Channel — Minion Hub</title> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/link/[code]/+page.svelte:37` | Hub identity | ? \`${data.channelLabel} can now recognize your Minion Hub account.\` | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/login/+page.svelte:51` | technical/comment | // including this one (spec 2026-09-16-hub-minion-run-dev-switcher §2.3) — | Source import, comment or documentation; preserve. |
| `src/routes/login/+page.svelte:248` | Hub identity | <title>{mode === 'signup' ? 'Create account' : 'Sign in'} — Minion Hub</title> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/login/+page.svelte:258` | Hub identity | ? 'Set up the identity you will use across Minion Hub.' | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/login/+page.svelte:345` | technical/distinct-service | placeholder="admin@minion.hub" | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/login/+page.svelte:356` | technical/distinct-service | placeholder="admin@minion.hub" | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/login/forgot/+page.svelte:30` | Hub identity | <svelte:head><title>{m.login_forgot_title()} — Minion Hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/login/forgot/+page.svelte:64` | technical/distinct-service | placeholder="admin@minion.hub" | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `src/routes/oauth/authorize/+page.svelte:34` | Hub identity | <svelte:head><title>{m.oauth_authorize_eyebrow()} — Minion Hub</title></svelte:head> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `src/routes/onboarding/+page.svelte:58` | Hub identity | <title>{eyebrow} — Minion Hub</title> | Convert through resolved org branding; presentation CSS selector names may remain. |
| `messages/en.json:379` | technical/distinct-service | "backup_confirmRestoreBody": "This will overwrite the current .minion directory on the server with the snapshot from {date} and restart the server service.", | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `messages/en.json:1200` | technical/distinct-service | "cloud_provision_description": "Start from the versioned Minion workstation blueprint, then choose the runtimes this machine should carry.", | Preset or runtime product identity; preserve. |
| `messages/en.json:1213` | technical/distinct-service | "cloud_runtime_drone": "Minion's remote execution bridge", | Preset or runtime product identity; preserve. |
| `messages/en.json:2606` | technical/distinct-service | "flowcfg_dbPathPlaceholder": "~/.minion/message-ledger.db", | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `messages/en.json:3061` | Hub identity | "marketplace_pluginsSubtitle": "Find and install plugins that extend Minion Hub", | Convert through resolved org branding; presentation CSS selector names may remain. |
| `messages/en.json:3108` | technical/distinct-service | "marketplace_wizardStep5Subtitle": "Download the agent files, add them to the minions repo, then sync.", | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `messages/en.json:3109` | Hub identity | "marketplace_wizardStep5SyncHeading": "Then sync in Minion Hub:", | Convert through resolved org branding; presentation CSS selector names may remain. |
| `messages/en.json:4023` | technical/distinct-service | "provision_phaseConfigDesc": "Generate minion.json configuration", | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `messages/en.json:4027` | technical/distinct-service | "provision_phaseInstallDesc": "Install minion package", | Preset or runtime product identity; preserve. |
| `messages/en.json:4033` | technical/distinct-service | "provision_phaseUserCreationDesc": "Create minion user and directory structure", | Preset or runtime product identity; preserve. |
| `messages/en.json:5255` | technical/distinct-service | "tools_editor_queriesNote": "Token is the gateway-injected MINION_HUB_TOKEN (admin-trust model).", | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `messages/en.json:5448` | Hub identity | "welcome_heading": "Welcome to Minion Hub", | Convert through resolved org branding; presentation CSS selector names may remain. |
| `messages/en.json:6983` | Hub identity | "onboarding_userTitle": "Welcome to Minion", | Visible onboarding welcome: use hubName prefix only. |
| `messages/en.json:7226` | native installer identity | "desktop_update_available": "Minion Hub {version} is available.", | Standalone updater identity; preserve. Hosted DesktopTitlebar remains in scope. |
| `messages/en.json:7228` | native installer identity | "desktop_update_installing": "Installing the update. Minion Hub will restart.", | Standalone updater identity; preserve. Hosted DesktopTitlebar remains in scope. |
| `messages/en.json:7229` | native installer identity | "desktop_update_failed": "The update could not be completed. Try again, or continue using Minion Hub.", | Standalone updater identity; preserve. Hosted DesktopTitlebar remains in scope. |
| `messages/en.json:7691` | Hub identity | "oauth_authorize_title": "{app} wants to connect to Minion Hub", | Convert through resolved org branding; presentation CSS selector names may remain. |
| `messages/es.json:379` | technical/distinct-service | "backup_confirmRestoreBody": "Esto sobreescribirá el directorio .minion actual en el servidor con la instantánea del {date} y reiniciará el servicio de servidor.", | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `messages/es.json:1200` | technical/distinct-service | "cloud_provision_description": "Parte del blueprint versionado de Minion y elige los runtimes que tendrá esta máquina.", | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `messages/es.json:1213` | technical/distinct-service | "cloud_runtime_drone": "Puente de ejecución remota de Minion", | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `messages/es.json:2606` | technical/distinct-service | "flowcfg_dbPathPlaceholder": "~/.minion/message-ledger.db", | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `messages/es.json:3061` | Hub identity | "marketplace_pluginsSubtitle": "Encuentra e instala plugins que amplían Minion Hub", | Convert through resolved org branding; presentation CSS selector names may remain. |
| `messages/es.json:3108` | technical/distinct-service | "marketplace_wizardStep5Subtitle": "Descarga los archivos del agente, agrégalos al repositorio de minions y sincroniza.", | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `messages/es.json:3109` | Hub identity | "marketplace_wizardStep5SyncHeading": "Luego sincroniza en Minion Hub:", | Convert through resolved org branding; presentation CSS selector names may remain. |
| `messages/es.json:4023` | technical/distinct-service | "provision_phaseConfigDesc": "Generar configuración minion.json", | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `messages/es.json:4027` | technical/distinct-service | "provision_phaseInstallDesc": "Instalar paquete minion", | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `messages/es.json:4033` | technical/distinct-service | "provision_phaseUserCreationDesc": "Crear usuario minion y estructura de directorios", | Technical key, repo/path, workstation/runtime label, or code sample; preserve. |
| `messages/es.json:5255` | technical/distinct-service | "tools_editor_queriesNote": "El token es MINION_HUB_TOKEN inyectado por el gateway (modelo de confianza de administrador).", | Literal integration identifier, path, distinct service, or persistence key; preserve. |
| `messages/es.json:5448` | Hub identity | "welcome_heading": "Bienvenido a Minion Hub", | Convert through resolved org branding; presentation CSS selector names may remain. |
| `messages/es.json:6983` | Hub identity | "onboarding_userTitle": "Bienvenido a Minion", | Visible onboarding welcome: use hubName prefix only. |
| `messages/es.json:7226` | native installer identity | "desktop_update_available": "Minion Hub {version} está disponible.", | Standalone updater identity; preserve. Hosted DesktopTitlebar remains in scope. |
| `messages/es.json:7228` | native installer identity | "desktop_update_installing": "Instalando la actualización. Minion Hub se reiniciará.", | Standalone updater identity; preserve. Hosted DesktopTitlebar remains in scope. |
| `messages/es.json:7229` | native installer identity | "desktop_update_failed": "No se pudo completar la actualización. Inténtalo de nuevo o continúa usando Minion Hub.", | Standalone updater identity; preserve. Hosted DesktopTitlebar remains in scope. |
| `messages/es.json:7691` | Hub identity | "oauth_authorize_title": "{app} quiere conectarse a Minion Hub", | Convert through resolved org branding; presentation CSS selector names may remain. |

## Inventory closure at implementation

Repeat the scan over all source strings, localized messages, CSS generated content, page titles, SVG accessible text, and shared component consumers. Include files present on the isolated base but absent in this dirty checkout. Record each identity row with the new binding and actual test/screenshot. Do not turn this raw scan into a blanket literal allowlist. Historical release entries, external links/support addresses, user-authored content, runtime service names, code samples, and installed-app packaging identifiers remain literal. A query that returns no MINION text cannot alone prove complete or correct white labelling.

## Localized message consumers

Changing EN/ES Hub references to `{hubFullName}` also changes generated function signatures. Modify every caller; grep literals alone does not find these consumers.

| Source | Message key | Required binding |
|---|---|---|
| `src/lib/components/layout/WelcomePanel.svelte:28` | `welcome_heading` | `m.welcome_heading({hubFullName: branding.fullName})` |
| `src/lib/components/marketplace/AgentCreatorWizard.svelte:486` | `marketplace_wizardStep5SyncHeading` | `m.marketplace_wizardStep5SyncHeading({hubFullName: branding.fullName})` |
| `src/routes/(app)/marketplace/plugins/+page.svelte:296` | `marketplace_pluginsSubtitle` | `m.marketplace_pluginsSubtitle({hubFullName: branding.fullName})` |
| `src/routes/onboarding/+page.svelte:71` | `onboarding_userTitle` | `m.onboarding_userTitle({hubName: branding.name})`; preserve the existing absence of Hub. |
| `src/routes/oauth/authorize/+page.svelte:48` | `oauth_authorize_title` | `m.oauth_authorize_title({app: data.appName, hubFullName: branding.fullName})`; preserve app interpolation. |

## Technical producers and external provenance

The architecture view depicts global deployed software and its real endpoints; its canonical Minion Hub service node is a technical reference, not tenant chrome. These values remain literal under FR-010, as do provider request headers, gateway audit notes, external messages, issue reports and release-product attribution. The source scan includes these TypeScript producers so this exclusion is explicit.

| Source | Classification | Literal / disposition |
|---|---|---|
| `src/lib/state/config/config.svelte.ts:320` | technical/external-provenance | note: 'Edited via Minion Hub config page', — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/lib/state/config/config.svelte.ts:345` | technical/external-provenance | note: 'Edited via Minion Hub config page', — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/builder/ai/analyze-run/+server.ts:103` | technical/external-provenance | headers: { 'HTTP-Referer': hubBaseUrl(), 'X-Title': 'Minion Hub Builder - Run Analysis' }, — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/builder/ai/dry-run/+server.ts:78` | technical/external-provenance | headers: { 'HTTP-Referer': hubBaseUrl(), 'X-Title': 'Minion Hub Builder - Dry Run' }, — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/builder/ai/suggest-chapter/+server.ts:85` | technical/external-provenance | headers: { 'HTTP-Referer': hubBaseUrl(), 'X-Title': 'Minion Hub Builder' }, — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/builder/ai/suggest-prompts/+server.ts:77` | technical/external-provenance | 'X-Title': 'Minion Hub Builder - Prompt Suggestions', — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/builder/ai/suggest-skill/+server.ts:140` | technical/external-provenance | headers: { 'HTTP-Referer': hubBaseUrl(), 'X-Title': 'Minion Hub Builder' }, — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/gateway/query/releases/+server.ts:7` | technical/external-provenance | * On-demand global Minion Hub notes share /changelog's signed-in visibility; — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/notes/autocomplete/+server.ts:37` | technical/external-provenance | const headers = { 'HTTP-Referer': hubBaseUrl(), 'X-Title': 'Minion Hub - Notes Autofill' }; — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/notes/polish/+server.ts:50` | technical/external-provenance | headers: { 'HTTP-Referer': hubBaseUrl(), 'X-Title': 'Minion Hub - Notes Polish' }, — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/notes/refine/+server.ts:90` | technical/external-provenance | headers: { 'HTTP-Referer': hubBaseUrl(), 'X-Title': 'Minion Hub - Notes Refine' }, — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/notes/spelling/+server.ts:52` | technical/external-provenance | headers: { 'HTTP-Referer': hubBaseUrl(), 'X-Title': 'Minion Hub - Notes Spelling' }, — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/routes/api/structured-stream/+server.ts:48` | technical/external-provenance | 'X-Title': 'Minion Hub - Structured Stream', — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/architecture-c4.model.ts:136` | technical/deployed-service | name: 'Minion Hub', — Global deployment topology names identify the physical software service at hub.minion-ai.org, not tenant chrome. Preserve canonical labels, node IDs and endpoints. |
| `src/server/services/architecture.service.ts:177` | technical/deployed-service | name: 'Minion Hub', — Global deployment topology names identify the physical software service at hub.minion-ai.org, not tenant chrome. Preserve canonical labels, node IDs and endpoints. |
| `src/server/services/assistant-releases.service.ts:69` | historical/release-provenance | product: 'Minion Hub', — Global software release product attribution; preserve with historical release content. |
| `src/server/services/email.service.ts:32` | technical/external-provenance | const from = env.RESEND_FROM ?? 'Minion Hub <noreply@minion-ai.org>'; — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:45` | technical/external-provenance | <span style="background:#e91e8c;color:#000;font-weight:900;font-size:13px;letter-spacing:0.5px;padding:3px 8px;border-radius:4px 0 0 4px;text-transform:uppercase">MINION</span> — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:62` | technical/external-provenance | <p style="color:#3f3f46;font-size:11px;margin:0">Sent by Minion Hub</p> — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:74` | technical/external-provenance | subject: ${inviterName} invited you to join ${organizationName} on Minion Hub, — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:97` | technical/external-provenance | const from = env.RESEND_FROM ?? 'Minion Hub <noreply@minion-ai.org>'; — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:108` | technical/external-provenance | <span style="background:#e91e8c;color:#000;font-weight:900;font-size:13px;letter-spacing:0.5px;padding:3px 8px;border-radius:4px 0 0 4px;text-transform:uppercase">MINION</span> — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:127` | technical/external-provenance | <p style="color:#3f3f46;font-size:11px;margin:0">Sent by Minion Hub</p> — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:139` | technical/external-provenance | subject: 'Reset your Minion Hub password', — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:165` | technical/external-provenance | const from = env.RESEND_FROM ?? 'Minion Hub <noreply@minion-ai.org>'; — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:174` | technical/external-provenance | A new access request is ready for review in Minion Hub. — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/email.service.ts:182` | technical/external-provenance | subject: 'New access request on Minion Hub', — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |
| `src/server/services/github-issues.service.ts:166` | technical/external-provenance | sections.push(---\n*Reported from Minion Hub at ${new Date().toISOString()}*); — Provider request attribution, gateway audit note, email or issue provenance; outside Hub text identity scope. |

## Final source inventory reconciliation

This source-only reconciliation uses the approved 275-row scan in `source-evidence.json` and clean pushed candidate `45aead23be155c9e7a551932893e5434d069837f`, inspected in `/tmp/minion-white-label-145-final-ci`. The CRT correction and mounted regression are now included. Per-file hashes, refreshed binding anchors and every excluded row are recorded under `final_source_inventory` in [implementation/consumer-reconciliation.json](implementation/consumer-reconciliation.json). PR709 is open; this source closure does not claim that hosted CI, final browser qualification or deployment has completed.

All 51 approved Hub-identity rows have source dispositions: 41 Svelte occurrences across 34 paths, plus 10 message values across EN and ES. All five named localized callers pass the required current prefix/full-name interpolation in source. No identity row remains unclosed by source inspection.

The earlier consumer checkpoint covered 32 owned paths, 33 identity rows and five localized callers. That was a slice count. The full inventory adds eight identity rows from five shared shell paths and ten EN/ES message rows. Three of the 32 consumer paths contain localized callers but no raw identity occurrence in the approved scan; the complete Svelte consumer set therefore contains 37 existing paths, while the raw inventory still spans 34.

| Approved category | Rows | Final source disposition |
|---|---:|---|
| `technical/distinct-service` | 81 | Excluded from tenant-text substitution; exact row dispositions are in the JSON reconciliation. |
| `technical/comment` | 97 | Excluded from tenant-text substitution; exact row dispositions are in the JSON reconciliation. |
| `native installer identity` | 7 | Excluded from tenant-text substitution; exact row dispositions are in the JSON reconciliation. |
| `component/preset` | 11 | Excluded from tenant-text substitution; exact row dispositions are in the JSON reconciliation. |
| `technical/external-provenance` | 25 | Excluded from tenant-text substitution; exact row dispositions are in the JSON reconciliation. |
| `technical/deployed-service` | 2 | Excluded from tenant-text substitution; exact row dispositions are in the JSON reconciliation. |
| `historical/release-provenance` | 1 | Excluded from tenant-text substitution; exact row dispositions are in the JSON reconciliation. |

Of the 224 excluded rows, 220 literal snippets remain exact. Four benign source changes retain the approved meaning: MinionLogo keeps its `minion` preset id and secondary-color styling through a style directive; Sidebar replaces its private `.brand-minion` presentation selector with `.brand-name`; two watermark comments now describe organization identity. Native updater text, deployed service identities, provider/email attribution, author samples, persistence keys and runtime identifiers remain outside tenant renaming. New literal `MINION` references in the validator and owner editor represent the required default/reset choice and its validation.

### Identity row closure

| Approved source | Final source binding or disposition |
|---|---|
| `src/lib/components/layout/DesktopTitlebar.svelte:23` | Current line(s) 24: `<span class="t-label" data-tauri-drag-region>{getBranding().fullName}</span>` |
| `src/lib/components/layout/MinionLogo.svelte:368` | Current line(s) 294: `<HubWordmark inheritStyles />` |
| `src/lib/components/layout/Sidebar.svelte:572` | Current line(s) 581: `aria-label={getBranding().fullName}` |
| `src/lib/components/layout/Sidebar.svelte:575` | Current line(s) 584: `<span class="brand-name t-body"><HubWordmark /></span>` |
| `src/lib/components/layout/Topbar.svelte:213` | Current line(s) 196, 229: `aria-label={getBranding().fullName} / aria-label={getBranding().fullName}` |
| `src/lib/components/layout/Topbar.svelte:217` | Current line(s) 199: `<span class="mobile-brand-wordmark t-label"><HubWordmark /></span>` |
| `src/lib/components/marketplace/AgentCard.svelte:214` | Current line(s) 72, 215: ``<div class="id-card" data-brand-watermark={`${getBranding().name}  `.repeat(100)}> / content: attr(data-brand-watermark);`` |
| `src/lib/components/marketplace/_agent-card/IdFooter.svelte:13` | Current line(s) 14: `<div class="company-brand">{getBranding().name}</div>` |
| `src/lib/components/navigation/PersonalHome.svelte:107` | Current line(s) 108: `<svelte:head><title>{m.nav_personalHome()} · {getBranding().name} hub</title></svelte:head>` |
| `src/lib/components/settings/CRTConfigModal.svelte:245` | Current line(s) 250: `>[{getBranding().name}]</span` |
| `src/lib/components/ui/foundations/PublicTaskShell.svelte:50` | Current line(s) 51, 52: `<span class="wordmark-minion">{getBranding().name}</span> / <span class="wordmark-hub">Hub</span>` |
| `src/lib/components/ui/foundations/PublicTaskShell.svelte:172` | Current line(s) 51, 52: `<span class="wordmark-minion">{getBranding().name}</span> / <span class="wordmark-hub">Hub</span>`; presentation selector retained. |
| `src/lib/stories/Shared/Markdown.stories.svelte:6` | Current line(s) 114, 122: `<h1 class="t-heading">{getBranding().name} hub</h1> / <h1 class="t-heading">{getBranding().name} hub</h1>` |
| `src/routes/(app)/agents/builder/+page.svelte:11` | Current line(s) 12: `<title>Agent Builder · {getBranding().name}</title>` |
| `src/routes/(app)/capabilities/+page.svelte:41` | Current line(s) 42: `<title>Capabilities · {getBranding().name}</title>` |
| `src/routes/(app)/cloud/+page.svelte:52` | Current line(s) 53: `<svelte:head><title>{m.cloud_overview_title()} · {getBranding().name} hub</title></svelte:head>` |
| `src/routes/(app)/cloud/gui/+page.svelte:35` | Current line(s) 36: `<svelte:head><title>{m.cloud_gui_title()} · {getBranding().name} hub</title></svelte:head>` |
| `src/routes/(app)/cloud/settings/+page.svelte:76` | Current line(s) 77: `<svelte:head><title>{m.cloud_settings_title()} · {getBranding().name} hub</title></svelte:head>` |
| `src/routes/(app)/cloud/terminal/+page.svelte:35` | Current line(s) 36: `<svelte:head><title>{m.cloud_terminal_title()} · {getBranding().name} hub</title></svelte:head>` |
| `src/routes/(app)/home/+page.svelte:932` | Current line(s) 933: `<title>My Agent · {getBranding().name}</title>` |
| `src/routes/(app)/killswitches/+page.svelte:104` | Current line(s) 105: `<svelte:head><title>Kill Switches · {getBranding().name} hub</title></svelte:head>` |
| `src/routes/(app)/marketplace/agents/+page.svelte:281` | Current line(s) 282: `<span class="list-brand">{getBranding().name}</span>` |
| `src/routes/(app)/marketplace/agents/+page.svelte:702` | Current line(s) 268, 707: ``<div class="list-card" data-brand-watermark={`${getBranding().name}  `.repeat(100)}> / content: attr(data-brand-watermark);`` |
| `src/routes/(app)/marketplace/agents/[slug]/_components/IdBadgeCard.svelte:135` | Current line(s) 136: `<span class="company-brand">{getBranding().name}</span>` |
| `src/routes/(app)/prompt/+page.svelte:10` | Current line(s) 11: `<title>Prompt Engineering · {getBranding().fullName}</title>` |
| `src/routes/(app)/sessions/[sessionKey]/debug/+page.svelte:87` | Current line(s) 88: `<title>Debug · {sessionKey} · {getBranding().fullName}</title>` |
| `src/routes/(app)/team/PageBody.svelte:45` | Current line(s) 46: `<title>{TITLES[tab]()} · {m.team_title()} · {getBranding().name}</title>` |
| `src/routes/(app)/tools/+page.svelte:6` | Current line(s) 7: `<title>Tools · {getBranding().name}</title>` |
| `src/routes/+error.svelte:34` | Current line(s) 35: `<svelte:head><title>{title} — {getBranding().fullName}</title></svelte:head>` |
| `src/routes/auth/reset/+page.svelte:57` | Current line(s) 58: `<svelte:head><title>{m.reset_title()} — {getBranding().fullName}</title></svelte:head>` |
| `src/routes/invite/accept/+page.svelte:14` | Current line(s) 16: `<svelte:head><title>Invitation — {getBranding().fullName}</title></svelte:head>` |
| `src/routes/invite/accept/+page.svelte:21` | Current line(s) 23: `description={m.invite_accessFlowDescription({ hubName: getBranding().name })}` |
| `src/routes/join/+page.svelte:31` | Current line(s) 32: `<title>Request Access — {getBranding().fullName}</title>` |
| `src/routes/join/sent/+page.svelte:11` | Current line(s) 12: `<svelte:head><title>{m.join_pendingEyebrow()} — {getBranding().fullName}</title></svelte:head>` |
| `src/routes/link/[code]/+page.svelte:26` | Current line(s) 28: `<title>Link Your Channel — {getBranding().fullName}</title>` |
| `src/routes/link/[code]/+page.svelte:37` | Current line(s) 39, 40, 41, 42: `? m.link_accountRecognizedDescription({ / channel: data.channelLabel, / hubFullName: getBranding().fullName, / })` |
| `src/routes/login/+page.svelte:248` | Current line(s) 249: `<title>{mode === 'signup' ? 'Create account' : 'Sign in'} — {getBranding().fullName}</title>` |
| `src/routes/login/+page.svelte:258` | Current line(s) 259: `? m.login_signupIdentityDescription({ hubFullName: getBranding().fullName })` |
| `src/routes/login/forgot/+page.svelte:30` | Current line(s) 31: `<svelte:head><title>{m.login_forgot_title()} — {getBranding().fullName}</title></svelte:head>` |
| `src/routes/oauth/authorize/+page.svelte:34` | Current line(s) 35: `<svelte:head><title>{m.oauth_authorize_eyebrow()} — {getBranding().fullName}</title></svelte:head>` |
| `src/routes/onboarding/+page.svelte:58` | Current line(s) 59: `<title>{eyebrow} — {getBranding().fullName}</title>` |
| `messages/en.json:3061` | Current line 3061: `marketplace_pluginsSubtitle` → `Find and install plugins that extend {hubFullName}` |
| `messages/en.json:3109` | Current line 3109: `marketplace_wizardStep5SyncHeading` → `Then sync in {hubFullName}:` |
| `messages/en.json:5448` | Current line 5448: `welcome_heading` → `Welcome to {hubFullName}` |
| `messages/en.json:6983` | Current line 6983: `onboarding_userTitle` → `Welcome to {hubName}` |
| `messages/en.json:7691` | Current line 7691: `oauth_authorize_title` → `{app} wants to connect to {hubFullName}` |
| `messages/es.json:3061` | Current line 3061: `marketplace_pluginsSubtitle` → `Encuentra e instala plugins que amplían {hubFullName}` |
| `messages/es.json:3109` | Current line 3109: `marketplace_wizardStep5SyncHeading` → `Luego sincroniza en {hubFullName}:` |
| `messages/es.json:5448` | Current line 5448: `welcome_heading` → `Bienvenido a {hubFullName}` |
| `messages/es.json:6983` | Current line 6983: `onboarding_userTitle` → `Bienvenido a {hubName}` |
| `messages/es.json:7691` | Current line 7691: `oauth_authorize_title` → `{app} quiere conectarse a {hubFullName}` |

### New and unchanged files

All 16 planned Create actions are present. Their source hashes are recorded in the JSON reconciliation.

| Planned new file | Source state |
|---|---|
| `src/lib/branding.svelte.ts` | Present |
| `src/lib/branding.test.ts` | Present |
| `src/lib/branding.ts` | Present |
| `src/lib/components/layout/HubWordmark.mounted.test.ts` | Present |
| `src/lib/components/layout/HubWordmark.svelte` | Present |
| `src/lib/components/settings/OrganizationBranding.mounted.test.ts` | Present |
| `src/lib/components/settings/OrganizationBranding.svelte` | Present |
| `src/routes/(app)/settings/appearance/+page.server.ts` | Present |
| `src/routes/api/organizations/branding/+server.ts` | Present |
| `src/routes/api/organizations/branding/server.test.ts` | Present |
| `src/routes/api/tenants/me/server.test.ts` | Present |
| `src/routes/layout.server.test.ts` | Present |
| `src/server/services/organization-branding.service.test.ts` | Present |
| `src/server/services/organization-branding.service.ts` | Present |
| `src/server/services/organization-branding.sql.integration.test.ts` | Present |
| `supabase/migrations/20261122000000_organization_hub_name.sql` | Present |

Ten additional supporting files are present, including the CRT lifecycle regression. These are supporting source artifacts; their presence is not a passing-test claim.

| Additional supporting file | Source state |
|---|---|
| `scripts/qa/seed/tenancy-branding.test.ts` | Present |
| `src/lib/branding-fixtures.json` | Present |
| `src/lib/components/layout/MinionLogo.branding.mounted.test.ts` | Present |
| `src/lib/components/marketplace/branding-consumers.mounted.test.ts` | Present |
| `src/lib/components/ui/foundations/PublicTaskShell.mounted.test.ts` | Present |
| `src/routes/(app)/settings/appearance/page.server.test.ts` | Present |
| `src/routes/(app)/settings/organizations/page.mounted.test.ts` | Present |
| `src/server/test-utils/env-stubs/app-forms.ts` | Present |
| `tests/fixtures/branding/consumer-page.svelte.ts` | Present |
| `src/lib/components/settings/CRTConfigModal.mounted.test.ts` | Present |

The clean pushed candidate contains all 26 scoped new Hub files: 16 planned additions and 10 supporting additions. The CRT test is present and hashed; no pending source artifact remains in this inventory. The following explicit no-change files match implementation base `5347ff0148a3600fd3963d94db57e95c8e5a2779` byte-for-byte:

| Explicit no-change file | Comparison |
|---|---|
| `src/lib/routes/route-design-manifest.ts` | Unchanged |
| `src/lib/routes/route-access-registry.ts` | Unchanged |
| `vitest.qa-native-postgres.config.ts` | Unchanged |
| `src/lib/components/desktop-updater/Updater.svelte` | Unchanged |
| `desktop/main.ts` | Unchanged |
| `desktop/vite.config.ts` | Unchanged |

PublicTaskShell retains its existing public chip wrapper and contrast styles while binding the prefix through `getBranding().name` beside the unchanged `Hub` suffix. Sidebar, Topbar and MinionLogo compose the shared HubWordmark. CSS watermarks consume a bound text attribute through `attr()`; authored Markdown sample content remains separate from the resolved preview heading. These observations close identity text rows only.

Separate [T014 provisioning evidence](implementation/provision-native/README.md) records three completed local native cases against the actual creation/provision services and both creation models, with only outbound transports mocked. All three exercised application sources match this pushed head byte-for-byte. Those cases prove creation/partial-retry persistence and admission within their stated boundary; they do not claim external Workforce/workstation success, browser authentication, final hosted CI or deployment. Other runtime and release states remain in the separate implementation evidence package.
