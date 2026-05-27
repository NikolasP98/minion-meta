import { describe, it, expect } from "vitest";
import {
  sealSecret,
  openSecret,
  encrypt,
  decrypt,
  encryptToken,
  decryptToken,
} from "./crypto.js";

describe("canonical crypto", () => {
  it("seal/open roundtrips", () => {
    const { ciphertext, iv } = sealSecret("hunter2");
    expect(ciphertext).not.toContain("hunter2");
    expect(openSecret(ciphertext, iv)).toBe("hunter2");
  });

  it("encrypt/decrypt are aliases of seal/open", () => {
    const { ciphertext, iv } = encrypt("s3cret");
    expect(decrypt(ciphertext, iv)).toBe("s3cret");
  });

  it("encryptToken returns { encrypted, iv } and decryptToken roundtrips", () => {
    const { encrypted, iv } = encryptToken("tok-abc");
    expect(decryptToken(encrypted, iv)).toBe("tok-abc");
  });

  it("openSecret throws on a tampered ciphertext (GCM auth)", () => {
    const { ciphertext, iv } = sealSecret("x");
    const tampered = (ciphertext[0] === "a" ? "b" : "a") + ciphertext.slice(1);
    expect(() => openSecret(tampered, iv)).toThrow();
  });
});
