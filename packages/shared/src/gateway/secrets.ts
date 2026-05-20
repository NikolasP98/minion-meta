// RPC method name constants (use these on both client and server)
export const SECRETS_METHODS = {
  list: "secrets.list",
  set: "secrets.set",
  clear: "secrets.clear",
  probe: "secrets.probe",
  setScoped: "secrets.set_scoped",
  clearScoped: "secrets.clear_scoped",
  probeScoped: "secrets.probe_scoped",
} as const;

export type SecretsProbeStatus = "ok" | "invalid" | "unknown" | "missing";
export type SecretsKind = "static" | "dynamic";

/** One entry in the secrets.list response payload. NEVER contains plaintext. */
export interface SecretsSummary {
  rowKey: string;
  groupKey: string;
  instanceId: string | null;
  kind: SecretsKind;
  ownerPlugin: string;
  label: string;
  description?: string;
  probe: string;
  configured: boolean;
  probeStatus: SecretsProbeStatus;
  probeMessage: string | null;
  lastProbeAt: number | null;
  updatedAt: number;
}

// secrets.list
export interface SecretsListParams {
  /* empty */
}
export interface SecretsListResult {
  secrets: SecretsSummary[];
}

// secrets.set — static
export interface SecretsSetParams {
  key: string;
  value: string;
}
export interface SecretsSetResult {
  key: string;
  probeStatus: SecretsProbeStatus;
  probeMessage: string;
}

// secrets.clear — static
export interface SecretsClearParams {
  key: string;
}
export interface SecretsClearResult {
  key: string;
}

// secrets.probe — static
export interface SecretsProbeParams {
  key: string;
}
export interface SecretsProbeResult {
  key: string;
  probeStatus: SecretsProbeStatus;
  probeMessage: string;
}

// secrets.set_scoped — dynamic
export interface SecretsSetScopedParams {
  groupKey: string;
  instanceId: string;
  value: string;
}
export interface SecretsSetScopedResult {
  groupKey: string;
  instanceId: string;
  probeStatus: SecretsProbeStatus;
  probeMessage: string;
}

// secrets.clear_scoped — dynamic
export interface SecretsClearScopedParams {
  groupKey: string;
  instanceId: string;
}
export interface SecretsClearScopedResult {
  groupKey: string;
  instanceId: string;
}

// secrets.probe_scoped — dynamic
export interface SecretsProbeScopedParams {
  groupKey: string;
  instanceId: string;
}
export interface SecretsProbeScopedResult {
  groupKey: string;
  instanceId: string;
  probeStatus: SecretsProbeStatus;
  probeMessage: string;
}
