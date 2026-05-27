// Re-export of the canonical crypto module (../crypto.ts). Kept as a stable
// subpath for existing importers of the PG identity path; the implementation
// lives in one place now (R7 of specs/2026-05-26-auth-token-simplification.md).
export { sealSecret, openSecret } from "../crypto.js";
