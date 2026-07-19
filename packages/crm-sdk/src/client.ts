import postgres from 'postgres';
import {
  ageFromDob,
  canonicalSex,
  dniNameMatches,
  formatRegistryName,
  isDni8,
  lookupDni,
  parseDob,
  type PerudevsPerson,
} from './dni.js';

export interface CrmClientOptions {
  /** Postgres URL for the shared Supabase DB (pooled URL fine — prepare is disabled). */
  databaseUrl: string;
  /** Tenancy: the organization every operation is scoped to. */
  orgId: string;
  /** PERUDEVS API token; required only for DNI validation calls. */
  perudevsKey?: string;
  max?: number;
}

export interface LeadInput {
  name: string;
  email: string;
  company?: string;
  message?: string;
  source?: string;
}

export type DniValidationStatus = 'verified' | 'mismatch' | 'not_found' | 'error' | 'skipped';

export interface DniValidationOutcome {
  partyId: string;
  status: DniValidationStatus;
  detail?: string;
}

export interface CrmParty {
  id: string;
  name: string | null;
  email: string | null;
  doc_number: string | null;
  dob: string | null;
  dni_verified: boolean;
  age: number | null;
}

/**
 * Server-side CRM client over the Minion party spine.
 * Every statement runs inside a transaction as the non-bypass `app_ledger` role
 * with the `app.current_org_id` GUC set, mirroring the hub's withOrgCore so the
 * parties RLS policy scopes rows even though the raw connection could bypass it.
 */
export function createCrmClient(opts: CrmClientOptions) {
  const sql = postgres(opts.databaseUrl, { prepare: false, max: opts.max ?? 1 });
  const orgId = opts.orgId;

  const withOrg = <T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> =>
    sql.begin(async (tx) => {
      await tx`set local role app_ledger`;
      await tx`select set_config('app.current_org_id', ${orgId}, true)`;
      return fn(tx);
    }) as Promise<T>;

  return {
    /**
     * Register-or-update a person party from a public form submission.
     * Keyed on email (case-insensitive); merges form data into metadata.lead.
     */
    async upsertLead(input: LeadInput): Promise<{ partyId: string; created: boolean }> {
      const email = input.email.trim().toLowerCase();
      const name = input.name.trim();
      const lead = {
        company: input.company?.trim() || null,
        message: input.message?.trim() || null,
        source: input.source ?? 'minion_site',
        submitted_at: new Date().toISOString(),
      };
      return withOrg(async (tx) => {
        const [existing] = await tx<{ id: string }[]>`
          select id from parties
          where org_id = ${orgId} and type = 'person' and lower(email) = ${email}
          order by created_at asc limit 1`;
        if (existing) {
          await tx`
            update parties set
              name = coalesce(nullif(name, ''), ${name}),
              metadata = metadata || jsonb_build_object('lead', ${tx.json(lead)}::jsonb),
              updated_at = now()
            where id = ${existing.id}`;
          return { partyId: existing.id, created: false };
        }
        const rows = await tx<{ id: string }[]>`
          insert into parties (org_id, type, name, email, metadata)
          values (${orgId}, 'person', ${name}, ${email},
                  jsonb_build_object('lead', ${tx.json(lead)}::jsonb))
          returning id`;
        return { partyId: rows[0]!.id, created: true };
      });
    },

    /**
     * Validate a party's identity against the PERUDEVS DNI registry.
     * verified → dni_verified=true + dob set; mismatch/not_found/error recorded
     * in metadata.dni_validation. Parties without an exactly-8-digit DNI are skipped.
     */
    async validatePartyDni(partyId: string): Promise<DniValidationOutcome> {
      if (!opts.perudevsKey) return { partyId, status: 'error', detail: 'perudevsKey not configured' };
      const party = await withOrg(async (tx) => {
        const [p] = await tx<{ id: string; name: string | null; doc_number: string | null }[]>`
          select id, name, doc_number from parties where id = ${partyId}`;
        return p ?? null;
      });
      if (!party) return { partyId, status: 'error', detail: 'party not found' };
      if (!isDni8(party.doc_number)) return { partyId, status: 'skipped', detail: 'doc_number is not an 8-digit DNI' };

      const result = await lookupDni(party.doc_number, opts.perudevsKey);
      let status: DniValidationStatus;
      let dob: string | null = null;
      let detail: string | undefined;
      if (result.status === 'error') {
        status = 'error';
        detail = result.message;
      } else if (result.status === 'not_found') {
        status = 'not_found';
      } else if (dniNameMatches(party.name ?? '', result.person)) {
        status = 'verified';
        dob = parseDob(result.person.fecha_nacimiento);
      } else {
        status = 'mismatch';
      }

      await withOrg(async (tx) => {
        const validation = { status, checked_at: new Date().toISOString(), api: 'perudevs' };
        await tx`
          update parties set
            dni_verified = ${status === 'verified'},
            dob = coalesce(${dob}::date, dob),
            metadata = metadata || jsonb_build_object('dni_validation', ${tx.json(validation)}::jsonb),
            updated_at = now()
          where id = ${partyId}`;
      });
      return { partyId, status, detail };
    },

    /**
     * Atomically claim up to `limit` person parties that have an 8-digit DNI and
     * no validation attempt yet (marks them processing so parallel workers shard).
     * Also reclaims rows stranded in 'processing' by a worker that died mid-batch
     * >5min ago, so a crash never permanently parks a row.
     */
    claimUnvalidated(limit: number): Promise<{ id: string; doc_number: string; name: string | null }[]> {
      return withOrg(
        (tx) => tx<{ id: string; doc_number: string; name: string | null }[]>`
          update parties set
            metadata = metadata || '{"dni_validation":{"status":"processing"}}'::jsonb,
            updated_at = now()
          where id in (
            select id from parties
            where org_id = ${orgId} and type = 'person'
              and doc_number ~ '^[0-9]{8}$'
              and dni_verified = false
              and (metadata->'dni_validation' is null
                   or (metadata->'dni_validation'->>'status' = 'processing'
                       and updated_at < now() - interval '5 minutes'))
            limit ${limit}
            for update skip locked)
          returning id, doc_number, name` as unknown as Promise<
          { id: string; doc_number: string; name: string | null }[]
        >,
      );
    },

    getParty(partyId: string): Promise<CrmParty | null> {
      return withOrg(async (tx) => {
        const [p] = await tx<Omit<CrmParty, 'age'>[]>`
          select id, name, email, doc_number, dob::text, dni_verified
          from parties where id = ${partyId}`;
        return p ? { ...p, age: ageFromDob(p.dob) } : null;
      });
    },

    /**
     * Claim already-verified parties that predate identity enrichment (no
     * metadata.dni_registry yet) so a re-query backfill can fill name/sex.
     */
    claimUnenriched(limit: number): Promise<{ id: string; doc_number: string }[]> {
      return withOrg(
        (tx) => tx<{ id: string; doc_number: string }[]>`
          update parties set
            metadata = metadata || '{"dni_registry":{"status":"enriching"}}'::jsonb,
            updated_at = now()
          where id in (
            select id from parties
            where org_id = ${orgId} and type = 'person'
              and dni_verified = true and doc_number ~ '^[0-9]{8}$'
              and (metadata->'dni_registry' is null
                   or (metadata->'dni_registry'->>'status' = 'enriching'
                       and updated_at < now() - interval '5 minutes'))
            limit ${limit}
            for update skip locked)
          returning id, doc_number` as unknown as Promise<{ id: string; doc_number: string }[]>,
      );
    },

    /**
     * Overwrite a party's canonical name from the registry parts (FIRST SECOND
     * LAST LAST2), store the raw payload (sex M/F canonical + verification code)
     * in metadata.dni_registry, and propagate the name to the linked CRM
     * contact(s). Sex stays canonical M/F in the DB; the UI localizes it.
     */
    async enrichParty(partyId: string, person: PerudevsPerson): Promise<void> {
      const name = formatRegistryName(person);
      const registry = {
        nombres: person.nombres,
        apellido_paterno: person.apellido_paterno,
        apellido_materno: person.apellido_materno,
        nombre_completo: person.nombre_completo,
        sex: canonicalSex(person.genero),
        codigo_verificacion: person.codigo_verificacion,
        captured_at: new Date().toISOString(),
      };
      await withOrg(async (tx) => {
        await tx`
          update parties set
            name = coalesce(${name}, name),
            metadata = metadata || jsonb_build_object('dni_registry', ${tx.json(registry)}::jsonb),
            updated_at = now()
          where id = ${partyId}`;
        await tx`
          update crm_contacts set display_name = coalesce(${name}, display_name), updated_at = now()
          where party_id = ${partyId} and org_id = ${orgId} and deleted_at is null`;
      });
    },

    /** Manual override for the CRM table checkmark toggle. */
    async setDniVerified(partyId: string, verified: boolean): Promise<void> {
      await withOrg(
        (tx) => tx`
          update parties set
            dni_verified = ${verified},
            metadata = metadata || jsonb_build_object('dni_validation',
              coalesce(metadata->'dni_validation', '{}'::jsonb) ||
              jsonb_build_object('status', ${verified ? 'verified' : 'mismatch'}::text, 'manual', true)),
            updated_at = now()
          where id = ${partyId}`,
      );
    },

    close: () => sql.end({ timeout: 5 }),
  };
}

export type CrmClient = ReturnType<typeof createCrmClient>;
