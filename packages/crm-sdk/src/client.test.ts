import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryHandler = (sql: string, values: unknown[]) => Promise<unknown[]>;

const mockState = vi.hoisted(() => ({
  handler: (async () => []) as QueryHandler,
}));

vi.mock('postgres', () => ({
  default: vi.fn(() => ({
    begin: async (run: (tx: unknown) => Promise<unknown>) => {
      const tx = Object.assign(
        (strings: TemplateStringsArray, ...values: unknown[]) =>
          mockState.handler(strings.join('?').replace(/\s+/g, ' ').trim(), values),
        { json: (value: unknown) => value },
      );
      return run(tx);
    },
    end: vi.fn(),
  })),
}));

const { createCrmClient } = await import('./client.js');

beforeEach(() => {
  mockState.handler = async () => [];
});

describe('lead identity and delivery idempotency', () => {
  it('does not merge separate submissions merely because they share an email', async () => {
    let inserts = 0;
    mockState.handler = async (sql) => {
      if (sql.startsWith('insert into parties')) return [{ id: `party-${++inserts}` }];
      return [];
    };
    const client = createCrmClient({ databaseUrl: 'postgres://test', orgId: 'org-1' });
    const first = await client.upsertLead({
      name: 'Ana', email: 'shared@example.com', idempotencyKey: 'lead-ana',
    });
    const second = await client.upsertLead({
      name: 'Bea', email: 'shared@example.com', idempotencyKey: 'lead-bea',
    });
    expect(first).toEqual({ partyId: 'party-1', created: true });
    expect(second).toEqual({ partyId: 'party-2', created: true });
    expect(inserts).toBe(2);
  });

  it('deduplicates an explicit submission key under the advisory-lock path', async () => {
    let storedId: string | null = null;
    let locks = 0;
    mockState.handler = async (sql) => {
      if (sql.startsWith('select pg_advisory_xact_lock')) {
        locks += 1;
        return [];
      }
      if (sql.startsWith('select id from parties')) return storedId ? [{ id: storedId }] : [];
      if (sql.startsWith('insert into parties')) {
        storedId = 'party-stable';
        return [{ id: storedId }];
      }
      return [];
    };
    const client = createCrmClient({ databaseUrl: 'postgres://test', orgId: 'org-1' });
    const input = { name: 'Ana', email: 'ana@example.com', idempotencyKey: 'form-42' };
    expect(await client.upsertLead(input)).toEqual({ partyId: 'party-stable', created: true });
    expect(await client.upsertLead(input)).toEqual({ partyId: 'party-stable', created: false });
    expect(locks).toBe(2);
  });

  it('rejects a blank submission key before opening a transaction', async () => {
    let queries = 0;
    mockState.handler = async () => {
      queries += 1;
      return [];
    };
    const client = createCrmClient({ databaseUrl: 'postgres://test', orgId: 'org-1' });
    await expect(
      client.upsertLead({
        name: 'Ana',
        email: 'ana@example.com',
        idempotencyKey: '   ',
      }),
    ).rejects.toThrow('idempotencyKey must not be blank');
    expect(queries).toBe(0);
  });
});

describe('DNI enrichment claim authority', () => {
  it('does not update linked contacts when the claimed party identity changed', async () => {
    let contactUpdates = 0;
    mockState.handler = async (sql) => {
      if (sql.startsWith('update parties set name')) return [];
      if (sql.startsWith('update crm_contacts')) contactUpdates += 1;
      return [];
    };
    const client = createCrmClient({ databaseUrl: 'postgres://test', orgId: 'org-1' });
    await expect(client.enrichParty('party-1', 'claim-current', {
      id: '60525600',
      nombres: 'NIKOLAS',
      apellido_paterno: 'PINON',
      apellido_materno: 'SARRIA',
      nombre_completo: 'NIKOLAS PINON SARRIA',
      genero: 'M',
      fecha_nacimiento: '12/11/1998',
      codigo_verificacion: '2',
    })).rejects.toThrow('party identity or enrichment claim changed');
    expect(contactUpdates).toBe(0);
  });

  it('requires the exact current claim token before writing enrichment', async () => {
    let contactUpdates = 0;
    mockState.handler = async (sql, values) => {
      if (sql.startsWith('update parties set name')) {
        return values.includes('claim-current') ? [{ id: 'party-1' }] : [];
      }
      if (sql.startsWith('update crm_contacts')) contactUpdates += 1;
      return [];
    };
    const client = createCrmClient({ databaseUrl: 'postgres://test', orgId: 'org-1' });
    const registryPerson = {
      id: '60525600',
      nombres: 'NIKOLAS',
      apellido_paterno: 'PINON',
      apellido_materno: 'SARRIA',
      nombre_completo: 'NIKOLAS PINON SARRIA',
      genero: 'M',
      fecha_nacimiento: '12/11/1998',
      codigo_verificacion: '2',
    };
    await expect(client.enrichParty('party-1', 'claim-stale', registryPerson)).rejects.toThrow(
      'party identity or enrichment claim changed',
    );
    await expect(client.enrichParty('party-1', 'claim-current', registryPerson)).resolves.toBeUndefined();
    expect(contactUpdates).toBe(1);
  });
});
