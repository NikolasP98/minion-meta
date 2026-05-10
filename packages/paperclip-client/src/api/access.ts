// VENDORED FROM paperclip-minion/ui/src/api/access.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClientBase } from '../client.js';
import type {
  AgentAdapterType,
  JoinRequest,
} from '../types/access.js';

export type InviteJoinType = 'human' | 'agent' | 'both';

export interface InviteSummary {
  id: string;
  companyId: string | null;
  companyName?: string | null;
  inviteType: 'company_join' | 'bootstrap_ceo';
  allowedJoinTypes: InviteJoinType;
  expiresAt: string;
  onboardingPath?: string;
  onboardingUrl?: string;
  onboardingTextPath?: string;
  onboardingTextUrl?: string;
  skillIndexPath?: string;
  skillIndexUrl?: string;
  inviteMessage?: string | null;
}

export type AcceptInviteInput =
  | { requestType: 'human' }
  | {
      requestType: 'agent';
      agentName: string;
      adapterType?: AgentAdapterType;
      capabilities?: string | null;
      agentDefaultsPayload?: Record<string, unknown> | null;
    };

export interface AgentJoinRequestAccepted extends JoinRequest {
  claimSecret: string;
  claimApiKeyPath: string;
  onboarding?: Record<string, unknown>;
  diagnostics?: Array<{
    code: string;
    level: 'info' | 'warn';
    message: string;
    hint?: string;
  }>;
}

export interface InviteOnboardingManifest {
  invite: InviteSummary;
  onboarding: {
    inviteMessage?: string | null;
    connectivity?: {
      guidance?: string;
      connectionCandidates?: string[];
      testResolutionEndpoint?: { method?: string; path?: string; url?: string };
    };
    textInstructions?: { url?: string };
  };
}

export interface BoardClaimStatus {
  status: 'available' | 'claimed' | 'expired';
  requiresSignIn: boolean;
  expiresAt: string | null;
  claimedByUserId: string | null;
}

export interface CliAuthChallengeStatus {
  id: string;
  status: 'pending' | 'approved' | 'cancelled' | 'expired';
  command: string;
  clientName: string | null;
  requestedAccess: 'board' | 'instance_admin_required';
  requestedCompanyId: string | null;
  requestedCompanyName: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string;
  approvedByUser: { id: string; name: string; email: string } | null;
  requiresSignIn: boolean;
  canApprove: boolean;
  currentUserId: string | null;
}

export interface CompanyInviteCreated {
  id: string;
  token: string;
  inviteUrl: string;
  expiresAt: string;
  allowedJoinTypes: InviteJoinType;
  companyName?: string | null;
  onboardingTextPath?: string;
  onboardingTextUrl?: string;
  inviteMessage?: string | null;
}

export function accessApi(client: PaperclipClientBase) {
  return {
    createCompanyInvite(
      companyId: string,
      input: {
        allowedJoinTypes?: InviteJoinType;
        defaultsPayload?: Record<string, unknown> | null;
        agentMessage?: string | null;
      } = {},
    ): Promise<CompanyInviteCreated> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/invites`, body: input });
    },

    createOpenClawInvitePrompt(
      companyId: string,
      input: { agentMessage?: string | null } = {},
    ): Promise<CompanyInviteCreated> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/openclaw/invite-prompt`, body: input });
    },

    getInvite(token: string): Promise<InviteSummary> {
      return client.request({ method: 'GET', path: `/api/invites/${token}` });
    },

    getInviteOnboarding(token: string): Promise<InviteOnboardingManifest> {
      return client.request({ method: 'GET', path: `/api/invites/${token}/onboarding` });
    },

    acceptInvite(
      token: string,
      input: AcceptInviteInput,
    ): Promise<AgentJoinRequestAccepted | JoinRequest | { bootstrapAccepted: true; userId: string }> {
      return client.request({ method: 'POST', path: `/api/invites/${token}/accept`, body: input });
    },

    listJoinRequests(
      companyId: string,
      status: 'pending_approval' | 'approved' | 'rejected' = 'pending_approval',
    ): Promise<JoinRequest[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/join-requests`, query: { status } });
    },

    approveJoinRequest(companyId: string, requestId: string): Promise<JoinRequest> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/join-requests/${requestId}/approve`, body: {} });
    },

    rejectJoinRequest(companyId: string, requestId: string): Promise<JoinRequest> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/join-requests/${requestId}/reject`, body: {} });
    },

    claimJoinRequestApiKey(
      requestId: string,
      claimSecret: string,
    ): Promise<{ keyId: string; token: string; agentId: string; createdAt: string }> {
      return client.request({ method: 'POST', path: `/api/join-requests/${requestId}/claim-api-key`, body: { claimSecret } });
    },

    getBoardClaimStatus(token: string, code: string): Promise<BoardClaimStatus> {
      return client.request({ method: 'GET', path: `/api/board-claim/${token}`, query: { code } });
    },

    claimBoard(token: string, code: string): Promise<{ claimed: true; userId: string }> {
      return client.request({ method: 'POST', path: `/api/board-claim/${token}/claim`, body: { code } });
    },

    getCliAuthChallenge(id: string, token: string): Promise<CliAuthChallengeStatus> {
      return client.request({ method: 'GET', path: `/api/cli-auth/challenges/${id}`, query: { token } });
    },

    approveCliAuthChallenge(
      id: string,
      token: string,
    ): Promise<{ approved: boolean; status: string; userId: string; keyId: string | null; expiresAt: string }> {
      return client.request({ method: 'POST', path: `/api/cli-auth/challenges/${id}/approve`, body: { token } });
    },

    cancelCliAuthChallenge(
      id: string,
      token: string,
    ): Promise<{ cancelled: boolean; status: string }> {
      return client.request({ method: 'POST', path: `/api/cli-auth/challenges/${id}/cancel`, body: { token } });
    },
  };
}
