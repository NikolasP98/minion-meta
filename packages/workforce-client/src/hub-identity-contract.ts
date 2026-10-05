import { jwtVerify } from "jose";

/** Verified federation input. Database provisioning remains the consumer's responsibility. */
export type VerifiedHubIdentity = {
  userId: string;
  companyId: string;
  email: string | null;
  name: string | null;
  roleKeys: string[];
};

export type HubIdentityAdmission =
  | { kind: "existing-actor" }
  | { kind: "identity"; identity: VerifiedHubIdentity }
  | {
      kind: "rejected";
      status: 401 | 403;
      error:
        | "missing_hub_identity"
        | "invalid_hub_identity"
        | "company_scope_mismatch";
    };

// Preserve Paperclip's UUID v1-v5 admission contract. Widening this is a protocol change.
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/;

function roleKeys(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20)
    throw new Error("invalid roleKeys");
  const result = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") throw new Error("invalid roleKey");
    const role = item.trim();
    if (!role || role.length > 80 || !ROLE_KEY.test(role))
      throw new Error("invalid roleKey");
    result.add(role);
  }
  return [...result];
}

function nullableClaim(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > maxLength)
    throw new Error("invalid claim");
  return value.trim() || null;
}

/**
 * The runtime federation boundary shared by Paperclip and Hub compatibility tests.
 * An existing actor is trusted only when there is no federation header. A supplied
 * invalid token never falls back to that actor. Path checks run before persistence.
 * `path` is the Express path relative to the /api mount, e.g. /companies/<uuid>/inbox.
 */
export async function admitHubIdentity(input: {
  secret: string;
  header: string | string[] | undefined;
  existingActorType?: string;
  path: string;
}): Promise<HubIdentityAdmission> {
  const token = Array.isArray(input.header) ? input.header[0] : input.header;
  if (!token) {
    if (
      input.existingActorType === "board" ||
      input.existingActorType === "agent"
    ) {
      return { kind: "existing-actor" };
    }
    return { kind: "rejected", status: 401, error: "missing_hub_identity" };
  }

  let identity: VerifiedHubIdentity;
  try {
    const key = new Uint8Array(Buffer.from(input.secret, "base64"));
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const userId =
      typeof payload.userId === "string" ? payload.userId.trim() : "";
    const companyId =
      typeof payload.companyId === "string" ? payload.companyId.trim() : "";
    if (!userId || userId.length > 200 || !UUID.test(companyId))
      throw new Error("invalid subject");
    identity = {
      userId,
      companyId,
      email: nullableClaim(payload.email, 320),
      name: nullableClaim(payload.name, 200),
      roleKeys: roleKeys(payload.roleKeys),
    };
  } catch {
    return { kind: "rejected", status: 401, error: "invalid_hub_identity" };
  }
  const companyPath = input.path.match(/^\/companies\/([^/]+)/);
  if (companyPath && identity.companyId !== companyPath[1]) {
    return { kind: "rejected", status: 403, error: "company_scope_mismatch" };
  }
  return { kind: "identity", identity };
}
