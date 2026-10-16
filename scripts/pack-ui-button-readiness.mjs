#!/usr/bin/env node
// Historical readiness versions are immutable; rebuilding current source would reuse their identity.
throw new Error(
  'Retired readiness packer. Use node scripts/pack-design-system.mjs <fresh-output-directory> for new content-derived versions. Existing readiness archives and receipts remain valid.',
);
