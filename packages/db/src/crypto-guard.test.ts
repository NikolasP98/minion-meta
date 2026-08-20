// Anti-recurrence guard for the fail-closed key resolver (spec
// 2026-08-17-pkg-dev-crypto-failopen-spec S2). This is a SOURCE-TEXT test: it
// proves the dev key has exactly one definition site and that no second file
// derives a key behind cryptoKeyMode()'s back. It deliberately does NOT claim
// anything about control-flow reachability — crypto-key.test.ts is the
// executable proof that the literal is gated by both the opt-in and the
// production refusal.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = fileURLToPath(new URL(".", import.meta.url));
// Assembled rather than written out so this guard does not itself become a
// second copy of the literal it is guarding.
const DEV_KEY_LITERAL = ["minion", "hub", "dev", "key"].join("-");
const KDF_CALL = "scryptSync";
const POINTER =
  "Key derivation belongs in cryptoKeyMode()/key() in src/crypto.ts — " +
  "see spec 2026-08-17-pkg-dev-crypto-failopen-spec S2.";

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    // Tests reference both strings as search terms; the guard is about shipped source.
    if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("crypto anti-recurrence guard", () => {
  it("the dev key literal appears exactly once, and only in src/crypto.ts", () => {
    const cryptoSource = readFileSync(join(SRC_DIR, "crypto.ts"), "utf8");
    expect(
      countOccurrences(cryptoSource, DEV_KEY_LITERAL),
      `src/crypto.ts must contain the dev key literal exactly once. ${POINTER}`,
    ).toBe(1);

    const elsewhere = sourceFiles(SRC_DIR)
      .filter((f) => f !== join(SRC_DIR, "crypto.ts"))
      .filter((f) => readFileSync(f, "utf8").includes(DEV_KEY_LITERAL));
    expect(
      elsewhere,
      `No other file may embed the dev key literal. ${POINTER}`,
    ).toEqual([]);
  });

  it("no file other than src/crypto.ts derives a key", () => {
    const derivers = sourceFiles(SRC_DIR)
      .filter((f) => readFileSync(f, "utf8").includes(KDF_CALL))
      .map((f) => f.slice(SRC_DIR.length));
    expect(
      derivers,
      `Exactly one key-derivation site is allowed. ${POINTER}`,
    ).toEqual(["crypto.ts"]);
  });
});
