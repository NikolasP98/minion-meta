import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { validateMarkedLoopbackPostgres } from '$qc/loopback-postgres';

const outbound = vi.hoisted(() => ({ workforce: vi.fn(), gateway: vi.fn(), credentials: vi.fn() }));
vi.mock('$lib/server/workforce-fetch', () => ({
  workforceClientForOrg: async () => ({
    companies: {
      get: outbound.workforce,
      update: () => { throw Error('Unexpected Workforce update'); },
      remove: () => { throw Error('Unexpected Workforce remove'); },
    },
    request: () => { throw Error('Unexpected Workforce request'); },
  }),
}));
vi.mock('$lib/server/gateway-rpc', () => ({
  gatewayCallAsUser: outbound.gateway,
  resolveCredentialsForUser: outbound.credentials,
}));

import { POST } from '$routes/api/organizations/provision/+server';
import { supabaseAdmin } from '$server/supabase';
import { resetAllPgPools } from '$server/db/pg-pool';

const dbUrl = process.env.HUB_TEST_DB_URL;
validateMarkedLoopbackPostgres(dbUrl, process.env.REQUIRE_QA_NATIVE_POSTGRES, 'REQUIRE_QA_NATIVE_POSTGRES');
if (process.env.SUPABASE_DB_URL !== dbUrl || new URL(process.env.PUBLIC_SUPABASE_URL!).origin !== 'http://127.0.0.1:54421') throw Error('Explicit dedicated local QA target required');
const sql = postgres(dbUrl!, { max: 2, prepare: false, connection: { application_name: 'white145-t014' } });
const token = randomUUID().replaceAll('-', '').slice(0, 12);
const authIds: string[] = [];
const slugs: string[] = [];
const orgIds: string[] = [];
const networkDestinations = new Set<string>();
const transcript: Record<string, unknown>[] = [];
let adminId = '', staffId = '';
const nativeFetch = globalThis.fetch.bind(globalThis);
const evidencePath = '/tmp/white145-provision-native-receipts.json';

function event(name: string, hubName: unknown, staff = false) {
  const id = staff ? staffId : adminId;
  return {
    locals: { user: { id, supabaseId: id, role: staff ? 'user' : 'admin', displayName: 'T014 local fixture' } },
    request: new Request('http://127.0.0.1:5199/api/organizations/provision', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, hubName }),
    }),
  } as Parameters<typeof POST>[0];
}
async function state(id: string) {
  const [organization] = await sql`select id,name,slug,hub_name,role_model from organizations where id=${id}::uuid`;
  const membership = await sql`select profile_id,role from organization_members where organization_id=${id}::uuid order by profile_id`;
  const roles = await sql`select profile_id,role_key from member_roles where org_id=${id}::uuid order by profile_id,role_key`;
  const catalog = await sql`select key,name,rank from org_roles where org_id=${id} order by key`;
  const permissions = await sql`select role_key,module,can_view,can_create,can_edit,can_delete,can_export,can_manage,if_owner,field_level from permission_rules where org_id=${id}::uuid order by role_key,module`;
  return { organization, membership, roles, catalog, permissions };
}

beforeAll(async () => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const address = new URL(input instanceof Request ? input.url : String(input));
    if (address.origin !== 'http://127.0.0.1:54421') throw Error('Outbound network denied by T014 fixture');
    networkDestinations.add(address.origin + address.pathname);
    return nativeFetch(input, init);
  });
  outbound.workforce.mockRejectedValue(Error('T014 injected outbound Workforce outage; no request sent'));
  outbound.gateway.mockImplementation(() => { throw Error('Unexpected outbound Gateway call'); });
  outbound.credentials.mockImplementation(() => { throw Error('Unexpected outbound Gateway resolution'); });
  const admin = supabaseAdmin();
  for (const role of ['admin', 'user']) {
    const email = `t014-${token}-${role}@qa.minion.test`;
    const result = await admin.auth.admin.createUser({ email, password: randomUUID() + 'aA1!', email_confirm: true });
    if (result.error || !result.data.user) throw Error('Local GoTrue fixture creation failed');
    const id = result.data.user.id; authIds.push(id);
    await sql`insert into profiles(id,email,display_name,role) values(${id}::uuid,${email},'T014 local fixture',${role}) on conflict(id) do update set role=excluded.role`;
    if (role === 'admin') adminId = id; else staffId = id;
  }
});
afterAll(async () => {
  try {
    if (slugs.length) {
      const rows = await sql`select id from organizations where slug=any(${slugs}::text[])`;
      for (const row of rows) {
        const id = row.id as string;
        if (!orgIds.includes(id)) orgIds.push(id);
        await sql`delete from permission_rules where org_id=${id}::uuid`;
        await sql`delete from member_roles where org_id=${id}::uuid`;
        await sql`delete from org_roles where org_id=${id}`;
        await sql`delete from doc_audit_log where org_id=${id}`;
        await sql`delete from organizations where id=${id}::uuid`;
      }
      expect(await sql`select id from organizations where slug=any(${slugs}::text[])`).toHaveLength(0);
    }
    if (authIds.length) {
      await sql`delete from auth.users where id=any(${authIds}::uuid[])`;
      expect(await sql`select id from profiles where id=any(${authIds}::uuid[])`).toHaveLength(0);
    }
    writeFileSync(evidencePath, JSON.stringify({
      scope: 'Actual POST/requireAdmin/provision/legacy Supabase writes and PostgreSQL bootstrap with only outbound transports mocked; fixture identity supplied directly, no browser/cookie authentication claim.',
      sourceCommit: 'cafed572f2ff9084a1bf1752a0acfe2ba8212105',
      target: { http: 'http://127.0.0.1:54421', postgres: '127.0.0.1:54422/postgres' },
      cases: transcript,
      actualHttpDestinations: [...networkDestinations].sort(),
      outboundWorkforceCalls: outbound.workforce.mock.calls.length,
      outboundGatewayCalls: outbound.gateway.mock.calls.length,
      outboundGatewayCredentialResolutions: outbound.credentials.mock.calls.length,
      outcomeBoundary: 'Both attempts intentionally remain partial at the injected Workforce outage. No gateway/workstation/readiness success is claimed.',
      cleanup: { createdOrganizationIds: orgIds, createdAuthProfileIds: authIds, remainingCreatedOrganizations: 0, remainingCreatedProfiles: 0 },
    }, null, 2) + '\n');
  } finally {
    vi.unstubAllGlobals(); delete process.env.ORG_ROLE_TEMPLATES_ENABLED;
    await sql.end(); await resetAllPgPools();
  }
});

describe('T014 real QA creation and partial provisioning retry', () => {
  it.each(['legacy', 'organization'] as const)('%s preserves committed legal name, prefix and grants on partial retry', async (model) => {
    process.env.ORG_ROLE_TEMPLATES_ENABLED = model === 'organization' ? 'true' : 'false';
    const name = `T014 Legal Organization ${token} ${model}`;
    const slug = name.toLowerCase().replaceAll(' ', '-'); slugs.push(slug);
    const workforceBefore = outbound.workforce.mock.calls.length;
    const firstResponse = await POST(event(name, 'Clínica Faces'));
    expect(firstResponse.status).toBe(502);
    const first = await firstResponse.json();
    expect(first).toMatchObject({ ok: false, organization: { name, slug, hub_name: 'Clínica Faces' } });
    const id = first.organization.id as string; orgIds.push(id);
    expect(first.steps.map((s: { id: string; status: string }) => [s.id, s.status])).toEqual([
      ['organization','complete'],['membership','complete'],['rbac','complete'],['workforce','failed'],['gateway','skipped'],['workstation','skipped'],['readiness','skipped'],
    ]);
    const committed = await state(id);
    expect(committed.organization).toMatchObject({ name, slug, hub_name: 'Clínica Faces', role_model: model });
    expect(committed.membership).toEqual([{ profile_id: adminId, role: 'owner' }]);
    expect(committed.roles).toEqual([{ profile_id: adminId, role_key: model === 'organization' ? 'custom-administrator' : 'owner' }]);
    // The alternative casing keeps the exact slug while requesting different
    // source/override text. Retry must adopt stored identity rather than reset it.
    const retryResponse = await POST(event(name.toUpperCase(), 'Replacement'));
    expect(retryResponse.status).toBe(502);
    const retry = await retryResponse.json();
    expect(retry).toMatchObject({ ok: false, organization: { id, name, slug, hub_name: 'Clínica Faces' } });
    const afterRetry = await state(id);
    expect(afterRetry).toEqual(committed);
    expect(await sql`select id from organizations where slug=${slug}`).toHaveLength(1);
    expect(outbound.workforce).toHaveBeenCalledTimes(workforceBefore + 2);
    expect(outbound.gateway).not.toHaveBeenCalled(); expect(outbound.credentials).not.toHaveBeenCalled();
    transcript.push({ model, firstStatus: firstResponse.status, retryStatus: retryResponse.status, firstSteps: first.steps, retrySteps: retry.steps,
      committedIdentity: committed.organization, unchangedAfterRetry: true, ownerMembership: committed.membership,
      assignedRoles: committed.roles, permissionRuleCount: committed.permissions.length,
      requestedRetry: { name: name.toUpperCase(), hubName: 'Replacement' },
    });
  });
  it('preserves platform-admin admission and rejects invalid prefix before database creation or outbound effects', async () => {
    const name = `T014 Denied ${token}`;
    const slug = name.toLowerCase().replaceAll(' ', '-'); slugs.push(slug);
    const workforceBefore = outbound.workforce.mock.calls.length;
    await expect(POST(event(name, 'Allowed', true))).rejects.toMatchObject({ status: 403 });
    await expect(POST(event(name, 'Invalid Hub'))).rejects.toMatchObject({ status: 400 });
    expect(await sql`select id from organizations where slug=${slug}`).toHaveLength(0);
    expect(outbound.workforce).toHaveBeenCalledTimes(workforceBefore);
    expect(outbound.gateway).not.toHaveBeenCalled();
    transcript.push({ gate: 'Actual requireAdmin rejects real local nonadmin profile', status: 403, invalidPrefixStatus: 400, organizationCreated: false, newOutboundCalls: 0 });
  });
});
