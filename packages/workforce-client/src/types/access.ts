// VENDORED FROM paperclip-minion/packages/shared/src/types/access.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

export type AgentAdapterType =
  | 'process'
  | 'http'
  | 'claude_local'
  | 'codex_local'
  | 'gemini_local'
  | 'opencode_local'
  | 'pi_local'
  | 'cursor'
  | 'openclaw_gateway'
  | (string & {});

export type PrincipalType = 'user' | 'agent';
export type MembershipStatus = 'active' | 'suspended' | 'removed';
export type PermissionKey = string;
export type InviteType = 'company_join' | 'bootstrap_ceo';
export type InviteJoinType = 'human' | 'agent' | 'both';
export type JoinRequestStatus = 'pending_approval' | 'approved' | 'rejected';
export type JoinRequestType = 'human' | 'agent';
export type InstanceUserRole = 'instance_admin' | 'instance_viewer';

export interface CompanyMembership {
  id: string;
  companyId: string;
  principalType: PrincipalType;
  principalId: string;
  status: MembershipStatus;
  membershipRole: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrincipalPermissionGrant {
  id: string;
  companyId: string;
  principalType: PrincipalType;
  principalId: string;
  permissionKey: PermissionKey;
  scope: Record<string, unknown> | null;
  grantedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invite {
  id: string;
  companyId: string | null;
  inviteType: InviteType;
  tokenHash: string;
  allowedJoinTypes: InviteJoinType;
  defaultsPayload: Record<string, unknown> | null;
  expiresAt: Date;
  invitedByUserId: string | null;
  revokedAt: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinRequest {
  id: string;
  inviteId: string;
  companyId: string;
  requestType: JoinRequestType;
  status: JoinRequestStatus;
  requestIp: string;
  requestingUserId: string | null;
  requestEmailSnapshot: string | null;
  agentName: string | null;
  adapterType: AgentAdapterType | null;
  capabilities: string | null;
  agentDefaultsPayload: Record<string, unknown> | null;
  claimSecretExpiresAt: Date | null;
  claimSecretConsumedAt: Date | null;
  createdAgentId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  rejectedByUserId: string | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstanceUserRoleGrant {
  id: string;
  userId: string;
  role: InstanceUserRole;
  createdAt: Date;
  updatedAt: Date;
}
