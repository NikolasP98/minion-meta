---
spec: 2026-08-17-factory-compose-tailnet-hardcode-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 correctness review

- Set the reviewed spec frontmatter to pass 2 and `approved` because all correctness issues were resolvable from the stated policy and repository evidence.
- Required S1 and S2 to merge together, because S1 alone contradicts both the any-host goal and the claim that the exposure policy remains unchanged.
- Added existing `.env` to the setup resolution precedence, because reruns otherwise probe and report a different address from the one Compose actually resolves.
- Required empty and duplicate `.env` assignments to fail explicitly, because Compose/default precedence would otherwise make setup's selected and effective binds ambiguous.
- Removed `FACTORY_ALLOW_PUBLIC_BIND`, because an escape hatch directly contradicted the unchanged ancestor requirement that the runner is never publicly bound.
- Removed the port pre-flight requirement, because its advisory behavior could not satisfy its promised diagnostic outcome and it was unrelated to the defined hardcode fix.
- Scoped the fresh-host `docker compose ps` assertion to port 3210, because Caddy is expected to bind `0.0.0.0` on ports 80 and 443.
- Clarified that the Tailscale detection proof uses a separate fresh clone, because an existing loopback assignment is intentionally preserved on rerun.
- Changed the `.env` override proof from appending a duplicate assignment to replacing the existing one, keeping the test consistent with the duplicate-rejection requirement.
- Added explicit empty-value and duplicate-assignment checks to the S2 definition of done so the new precedence rules are verifiable.

## Human flags

None. The remaining human security approval and Docker-host verification are already explicit ship gates, not unresolved specification decisions.
