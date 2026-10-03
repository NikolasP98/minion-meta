import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { admitHubIdentity } from "./hub-identity-contract.js";
import { mintIdentity } from "./identity-jwt.js";

const secret = Buffer.alloc(32, 7).toString("base64");
const companyId = "10000000-0000-4000-8000-000000000001";
const otherCompany = "10000000-0000-4000-8000-000000000002";
const claims = {
  userId: "hub-user",
  companyId,
  name: "Name",
  email: null,
  roleKeys: ["staff"],
};
const request = {
  secret,
  path: `/companies/${companyId}/inbox`,
  header: undefined,
};
async function token(
  overrides: Record<string, unknown> = {},
  ttl = 60,
  signingSecret = secret,
) {
  return new SignJWT({ ...claims, ...overrides })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .sign(new Uint8Array(Buffer.from(signingSecret, "base64")));
}

describe("Hub federation runtime admission", () => {
  it.each(["board", "agent"])(
    "preserves an authenticated %s with no header",
    async (existingActorType) => {
      expect(await admitHubIdentity({ ...request, existingActorType })).toEqual(
        { kind: "existing-actor" },
      );
    },
  );
  it.each([undefined, "none", "anonymous", "admin"])(
    "rejects unsupported existing actor %s",
    async (existingActorType) => {
      expect(await admitHubIdentity({ ...request, existingActorType })).toEqual(
        { kind: "rejected", status: 401, error: "missing_hub_identity" },
      );
    },
  );
  it("accepts a real Hub-minted identity at its own company path", async () => {
    const header = await mintIdentity({ secret, claims, ttlSeconds: 60 });
    expect(await admitHubIdentity({ ...request, header })).toEqual({
      kind: "identity",
      identity: claims,
    });
  });
  it("does not fall back to a bearer actor for a supplied invalid identity", async () => {
    expect(
      await admitHubIdentity({
        ...request,
        header: "garbage",
        existingActorType: "board",
      }),
    ).toEqual({ kind: "rejected", status: 401, error: "invalid_hub_identity" });
  });
  it("rejects expired and incorrectly signed credentials", async () => {
    for (const header of [
      await token({}, -1),
      await token({}, 60, Buffer.alloc(32, 9).toString("base64")),
    ]) {
      expect(await admitHubIdentity({ ...request, header })).toMatchObject({
        kind: "rejected",
        status: 401,
      });
    }
  });
  it.each([null, "company-x", 12, "10000000-0000-7000-8000-000000000001"])(
    "rejects invalid company %s",
    async (companyId) => {
      expect(
        await admitHubIdentity({
          ...request,
          header: await token({ companyId }),
        }),
      ).toMatchObject({ kind: "rejected", status: 401 });
    },
  );
  it("rejects another company before the consumer can provision anything", async () => {
    expect(
      await admitHubIdentity({
        ...request,
        path: `/companies/${otherCompany}/inbox`,
        header: await token(),
      }),
    ).toEqual({
      kind: "rejected",
      status: 403,
      error: "company_scope_mismatch",
    });
  });
  it("preserves legacy trimming, role ordering and absent nullable claims", async () => {
    expect(
      await admitHubIdentity({
        ...request,
        header: await token({
          userId: " user ",
          companyId: ` ${companyId} `,
          name: undefined,
          email: " ",
          roleKeys: [" owner ", "staff", "owner"],
        }),
      }),
    ).toEqual({
      kind: "identity",
      identity: {
        userId: "user",
        companyId,
        name: null,
        email: null,
        roleKeys: ["owner", "staff"],
      },
    });
  });
  it.each([
    { userId: "" },
    { userId: 4 },
    { userId: "u".repeat(201) },
    { email: 2 },
    { email: "e".repeat(321) },
    { name: "n".repeat(201) },
    { roleKeys: null },
    { roleKeys: ["bad role"] },
    { roleKeys: [4] },
    { roleKeys: Array(21).fill("owner") },
  ])("rejects malformed claims %j", async (overrides) => {
    expect(
      await admitHubIdentity({ ...request, header: await token(overrides) }),
    ).toMatchObject({ kind: "rejected", status: 401 });
  });
  it("supports the existing first-header and non-company-route contract", async () => {
    expect(
      await admitHubIdentity({
        ...request,
        path: "/health",
        header: [await token({ roleKeys: undefined }), "ignored"],
      }),
    ).toEqual({ kind: "identity", identity: { ...claims, roleKeys: [] } });
  });
});
