# Dialog and custom-control dirty inventory

Source inventory: all Hub Svelte files containing `<Dialog`, `<Modal` or `<Sheet` (54 files at inventory time), then nested custom controls and form children. Explicit dirty state is the contract; no generic event system was added. Native input/change tracking remains the fallback. Search and initialization remain clean; successful acknowledgment updates the baseline or closes the owner.

| Host/control | Disposition |
|---|---|
| `BrainCreateDialog` / visibility Select | Explicit snapshot of name/description/icon/visibility |
| `ResourcesTab` / resource-kind Select | Explicit create snapshot |
| `TeamSettingsView` / leave-type Toggles and allocation Selects | Separate open-edge snapshots for each modal |
| `TimeOffView` / request Selects and half-day Toggle | Explicit request snapshot; detail sheet has action/read content only |
| `PeopleView` / edit Selects and nested JoinLinkForm | Edit dirty follows unresolved autosave; JoinLinkForm exposes bound dirty and rebaselines on creation; staff/leave forms retain native tracking |
| `SellableWizard` / type/category/UOM/item custom choices | Explicit create snapshot; editing mode uses acknowledged autosave |
| `CustomPropertyManager` / types, rules, defaults, formula, presentation | Explicit edit snapshot across all meaningful fields |
| `finances/invoices/[id]` / warehouse and StockItemPicker | Explicit issue-draft snapshot including selected/add quantity and line contents |
| `pos/tickets/[id]` / correction-method Select | Explicit method/reason snapshot |
| `stock/items` / StockItemCreateForm | Nested form exposes bound dirty; parent Modal consumes it |
| `crm/customers` / PartyCreateForm | Nested form exposes bound dirty; parent wired by integration owner |
| `BookingDetailDrawer` / notes editor | Sheet dirty follows unresolved notes autosave; other commands remain immediate actions |
| `BookingCreateDrawer`, `ClientAccountDrawer` | Existing explicit dirty contracts retained |
| `SkillCreateWizard` / EmojiPicker | Explicit initial name/description/emoji baseline |
| `AvatarEditorModal` / preset selection, drop/crop controls | Existing hasPending drives explicit dirty; commit resets pending |
| `AddSourceDialog` / MarkdownEditor and upload content | Explicit nonempty draft/content/file baseline; reset clears on commit |
| Shared Picker quick-add | Layout owner supplies explicit createDirty/setDirty contract; successful creation clears before selection/close |
| `CRTConfigModal` | Controls immediately apply persisted local appearance; no uncommitted save draft |
| `BookingCalendar` | Calendar custom controls are outside decision-only conflict dialog |
| `RbacRolesSection` | Select is outside duplicate modal; duplicate input uses native tracking |
| Modal/Sheet wrappers | Pass explicit dirty to canonical Dialog; native fallback retained |
| ConfirmDialog and other read/decision overlays | No custom editable draft; cancel/confirmation behavior owned by destructive-action work |
| Test-only primitive fixtures | No production draft policy; dedicated Dialog harness uses actual Toggle |

Remaining inventory files contain native controls, read-only content or action/decision overlays: overview, stock warehouses/entry detail, POS history, flow condition/delete dialogs, RecordPeek, artifact create/history/regenerate, ChannelsTab, ProvisionWorkspaceDialog, ExportDialog, PurchaseFormDialog, HostsOverlay, DevUserSwitcher, Topbar, EmailModal, EventModal, ImageLightbox, ShiftBanner, BookingsView, ConsumptionConfirmDialog, SecretEditModal, AvatarMenu, ChannelLinking, TaskPromptDialog, builder delete/registry overlays.

Evidence: `dialog-dirty-guard.mounted.test.ts` covers native edits/search/initialization/discard plus a real Toggle, keep-editing and acknowledged-baseline clean state. ErrorSummary focus and FormField persistent helper/error tests are separate. Existing host contracts are not claimed as browser-verified merely from this source inventory; final visual/browser validation is tracked by the integration owner.
