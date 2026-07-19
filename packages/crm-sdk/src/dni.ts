/**
 * PERUDEVS "Consulta DNI Completo" client + identity-match logic.
 * GET https://api.perudevs.com/api/v1/dni/complete?document=<8 digits>&key=<token>
 */

export interface PerudevsPerson {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  genero: string;
  fecha_nacimiento: string; // dd/mm/yyyy
  codigo_verificacion: string;
}

export type DniLookupResult =
  | { status: 'found'; person: PerudevsPerson }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

const PERUDEVS_URL = 'https://api.perudevs.com/api/v1/dni/complete';

export const isDni8 = (doc: string | null | undefined): doc is string =>
  typeof doc === 'string' && /^[0-9]{8}$/.test(doc);

export async function lookupDni(document: string, key: string): Promise<DniLookupResult> {
  if (!isDni8(document)) return { status: 'error', message: 'document must be exactly 8 digits' };
  // PERUDEVS supports query-string auth only (no header scheme), so the key must
  // ride in the URL. Every error message that could echo the URL or the provider
  // response is scrubbed so the key can never reach caller logs.
  const scrub = (msg: string) =>
    key ? msg.split(encodeURIComponent(key)).join('[key]').split(key).join('[key]') : msg;
  let res: Response;
  try {
    res = await fetch(`${PERUDEVS_URL}?document=${document}&key=${encodeURIComponent(key)}`);
  } catch (err) {
    return { status: 'error', message: scrub(err instanceof Error ? err.message : String(err)) };
  }
  if (res.status === 429) return { status: 'error', message: 'rate limited (429)' };
  let body: { estado?: boolean; mensaje?: string; resultado?: PerudevsPerson };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    return { status: 'error', message: `non-JSON response (http ${res.status})` };
  }
  if (body.estado && body.resultado) return { status: 'found', person: body.resultado };
  if (res.ok || res.status === 404 || res.status === 422)
    return { status: 'not_found' };
  return { status: 'error', message: scrub(body.mensaje ?? `http ${res.status}`) };
}

export interface DniPreview {
  dni: string;
  /** "FIRST SECOND LAST LAST2", built from structured parts. */
  name: string | null;
  /** Canonical 'M' | 'F' | null (UI localizes). */
  sex: 'M' | 'F' | null;
  /** ISO "yyyy-mm-dd" | null. */
  dob: string | null;
  /** Whole-year age derived from dob | null. */
  age: number | null;
}

export type DniPreviewResult =
  | { status: 'found'; preview: DniPreview }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

/**
 * UI-facing DNI lookup: fetch the registry and return the fields the CRM would
 * offer to fill (name/sex/dob/age), WITHOUT writing anything. Backs the
 * "check ID and offer to fill" affordance in the contact create/edit forms.
 */
export async function dniPreview(document: string, key: string): Promise<DniPreviewResult> {
  const res = await lookupDni(document, key);
  if (res.status !== 'found') return res;
  const dob = parseDob(res.person.fecha_nacimiento);
  return {
    status: 'found',
    preview: {
      dni: res.person.id || document,
      name: formatRegistryName(res.person),
      sex: canonicalSex(res.person.genero),
      dob,
      age: ageFromDob(dob),
    },
  };
}

/** Uppercase, strip diacritics, collapse whitespace, tokenize. */
export function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-ZÑ ]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Does the CRM party name match the registry person?
 * Party names come from SUSII as "PATERNO MATERNO NOMBRES" while the registry
 * returns "NOMBRES PATERNO MATERNO" — so compare order-insensitively. Match when
 * nothing contradicts: every party-name token appears in the registry full name
 * (handles short names like "Carla"), or the registry's surnames + first given
 * name all appear in the party name (handles extra aliases in CRM).
 */
export function dniNameMatches(partyName: string, person: PerudevsPerson): boolean {
  const party = nameTokens(partyName);
  const registry = nameTokens(person.nombre_completo);
  if (party.length === 0 || registry.length === 0) return false;
  if (party.every((t) => registry.includes(t))) return true;
  const required = [
    ...nameTokens(person.apellido_paterno),
    ...nameTokens(person.apellido_materno),
    ...nameTokens(person.nombres).slice(0, 1),
  ];
  return required.length > 0 && required.every((t) => party.includes(t));
}

/**
 * Canonical display name built from the registry's STRUCTURED parts (never
 * nombre_completo, whose word order we don't control): "FIRST SECOND LAST LAST2"
 * = nombres + apellido_paterno + apellido_materno, trimmed and space-collapsed.
 */
export function formatRegistryName(person: {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
}): string | null {
  return (
    [person.nombres, person.apellido_paterno, person.apellido_materno]
      .map((p) => (p ?? '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || null
  );
}

/** Registry genero → canonical 'M' | 'F' | null (DB stores canonical; UI localizes). */
export function canonicalSex(genero: string | null | undefined): 'M' | 'F' | null {
  const s = (genero ?? '').trim().toUpperCase();
  return s === 'M' || s === 'F' ? s : null;
}

/** "18/06/1967" → "1967-06-18" (null if unparseable). */
export function parseDob(fechaNacimiento: string | null | undefined): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fechaNacimiento ?? '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Age in whole years as of `now` (UTC). */
export function ageFromDob(dob: string | Date | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const d = typeof dob === 'string' ? new Date(`${dob}T00:00:00Z`) : dob;
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < d.getUTCMonth() ||
    (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
