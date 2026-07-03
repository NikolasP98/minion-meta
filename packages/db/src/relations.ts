import { relations } from 'drizzle-orm';
import {
  user,
  session,
  account,
  member,
  organization,
  invitation,
  servers,
  agents,
  sessions,
  chatMessages,
  bugs,
  connectionEvents,
  userServers,
  userAgents,
  channelIdentities,
  personalAgents,
  userPreferences,
} from './schema/index.js';

// ── Better Auth: User ─────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(member),
  invitations: many(invitation),
  userServers: many(userServers),
  userAgents: many(userAgents),
  channelIdentities: many(channelIdentities),
  personalAgent: one(personalAgents, { fields: [user.id], references: [personalAgents.userId] }),
  preferences: many(userPreferences),
}));

// ── Better Auth: Session ──────────────────────────────────────────────────────

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

// ── Better Auth: Account ──────────────────────────────────────────────────────

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

// ── Better Auth: Organization ─────────────────────────────────────────────────

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  servers: many(servers),
}));

// ── Better Auth: Member ───────────────────────────────────────────────────────

export const memberRelations = relations(member, ({ one }) => ({
  user: one(user, { fields: [member.userId], references: [user.id] }),
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
}));

// ── Better Auth: Invitation ───────────────────────────────────────────────────

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, { fields: [invitation.inviterId], references: [user.id] }),
}));

// ── Servers ──────────────────────────────────────────────────────────────────

export const serversRelations = relations(servers, ({ one, many }) => ({
  organization: one(organization, { fields: [servers.tenantId], references: [organization.id] }),
  agents: many(agents),
  sessions: many(sessions),
  chatMessages: many(chatMessages),
  bugs: many(bugs),
  connectionEvents: many(connectionEvents),
  userServers: many(userServers),
  userAgents: many(userAgents),
}));

// ── Agents ───────────────────────────────────────────────────────────────────

export const agentsRelations = relations(agents, ({ one }) => ({
  server: one(servers, { fields: [agents.serverId], references: [servers.id] }),
  organization: one(organization, { fields: [agents.tenantId], references: [organization.id] }),
}));

// ── Sessions (gateway sessions, not auth sessions) ────────────────────────────

export const sessionsRelations = relations(sessions, ({ one }) => ({
  server: one(servers, { fields: [sessions.serverId], references: [servers.id] }),
  organization: one(organization, { fields: [sessions.tenantId], references: [organization.id] }),
}));

// ── Chat Messages ────────────────────────────────────────────────────────────

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  server: one(servers, { fields: [chatMessages.serverId], references: [servers.id] }),
  organization: one(organization, {
    fields: [chatMessages.tenantId],
    references: [organization.id],
  }),
}));

// ── Bugs ─────────────────────────────────────────────────────────────────────

export const bugsRelations = relations(bugs, ({ one }) => ({
  server: one(servers, { fields: [bugs.serverId], references: [servers.id] }),
  organization: one(organization, { fields: [bugs.tenantId], references: [organization.id] }),
}));

// ── Connection Events ────────────────────────────────────────────────────────

export const connectionEventsRelations = relations(connectionEvents, ({ one }) => ({
  server: one(servers, { fields: [connectionEvents.serverId], references: [servers.id] }),
  organization: one(organization, {
    fields: [connectionEvents.tenantId],
    references: [organization.id],
  }),
}));

// ── User Servers ─────────────────────────────────────────────────────────

export const userServersRelations = relations(userServers, ({ one }) => ({
  user: one(user, { fields: [userServers.userId], references: [user.id] }),
  server: one(servers, { fields: [userServers.serverId], references: [servers.id] }),
}));

// ── User Agents ──────────────────────────────────────────────────────────

export const userAgentsRelations = relations(userAgents, ({ one }) => ({
  user: one(user, { fields: [userAgents.userId], references: [user.id] }),
  server: one(servers, { fields: [userAgents.serverId], references: [servers.id] }),
}));

// ── Channel Identities ──────────────────────────────────────────────────

export const channelIdentitiesRelations = relations(channelIdentities, ({ one }) => ({
  user: one(user, { fields: [channelIdentities.userId], references: [user.id] }),
}));

// ── Personal Agents ──────────────────────────────────────────────────────

export const personalAgentsRelations = relations(personalAgents, ({ one }) => ({
  user: one(user, { fields: [personalAgents.userId], references: [user.id] }),
  server: one(servers, { fields: [personalAgents.serverId], references: [servers.id] }),
}));

// ── User Preferences ────────────────────────────────────────────────────

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, { fields: [userPreferences.userId], references: [user.id] }),
}));
