// VENDORED FROM paperclip-minion/packages/shared/src/types/plugin.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

export type PluginStatus = 'installing' | 'ready' | 'error' | 'upgrade_pending' | 'uninstalled';
export type PluginCategory = string;
export type PluginCapability = string;
export type PluginUiSlotType =
  | 'page'
  | 'detailTab'
  | 'taskDetailView'
  | 'toolbarButton'
  | 'contextMenuItem'
  | string;
export type PluginUiSlotEntityType = 'issue' | 'agent' | 'project' | 'company' | string;
export type PluginStateScopeKind = 'instance' | 'company' | 'agent' | 'issue' | 'project';
export type PluginLauncherPlacementZone =
  | 'toolbarButton'
  | 'sidebarNav'
  | 'commandPalette'
  | string;
export type PluginLauncherAction = 'openPage' | 'openModal' | 'openDrawer' | 'openPopover' | 'runAction' | string;
export type PluginLauncherBounds = { width?: number; height?: number; minWidth?: number; minHeight?: number };
export type PluginLauncherRenderEnvironment = 'modal' | 'drawer' | 'popover' | 'page' | string;

export type JsonSchema = Record<string, unknown>;

export interface PluginJobDeclaration {
  jobKey: string;
  displayName: string;
  description?: string;
  schedule?: string;
}

export interface PluginWebhookDeclaration {
  endpointKey: string;
  displayName: string;
  description?: string;
}

export interface PluginToolDeclaration {
  name: string;
  displayName: string;
  description: string;
  parametersSchema: JsonSchema;
}

export interface PluginUiSlotDeclaration {
  type: PluginUiSlotType;
  id: string;
  displayName: string;
  exportName: string;
  entityTypes?: PluginUiSlotEntityType[];
  routePath?: string;
  order?: number;
}

export interface PluginLauncherActionDeclaration {
  type: PluginLauncherAction;
  target: string;
  params?: Record<string, unknown>;
}

export interface PluginLauncherRenderDeclaration {
  environment: PluginLauncherRenderEnvironment;
  bounds?: PluginLauncherBounds;
}

export interface PluginLauncherRenderContextSnapshot {
  environment: PluginLauncherRenderEnvironment | null;
  launcherId: string | null;
  bounds: PluginLauncherBounds | null;
}

export interface PluginLauncherDeclaration {
  id: string;
  displayName: string;
  description?: string;
  placementZone: PluginLauncherPlacementZone;
  exportName?: string;
  entityTypes?: PluginUiSlotEntityType[];
  order?: number;
  action: PluginLauncherActionDeclaration;
  render?: PluginLauncherRenderDeclaration;
}

export interface PluginUiDeclaration {
  slots?: PluginUiSlotDeclaration[];
  launchers?: PluginLauncherDeclaration[];
}

export interface WorkforcePluginManifestV1 {
  id: string;
  apiVersion: 1;
  version: string;
  displayName: string;
  description: string;
  author: string;
  categories: PluginCategory[];
  minimumHostVersion?: string;
  minimumWorkforceVersion?: string;
  capabilities: PluginCapability[];
  entrypoints: { worker: string; ui?: string };
  instanceConfigSchema?: JsonSchema;
  jobs?: PluginJobDeclaration[];
  webhooks?: PluginWebhookDeclaration[];
  tools?: PluginToolDeclaration[];
  launchers?: PluginLauncherDeclaration[];
  ui?: PluginUiDeclaration;
}

export interface PluginRecord {
  id: string;
  pluginKey: string;
  packageName: string;
  version: string;
  apiVersion: number;
  categories: PluginCategory[];
  manifestJson: WorkforcePluginManifestV1;
  status: PluginStatus;
  installOrder: number | null;
  packagePath: string | null;
  lastError: string | null;
  installedAt: Date;
  updatedAt: Date;
}

export interface PluginConfig {
  id: string;
  pluginId: string;
  configJson: Record<string, unknown>;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
