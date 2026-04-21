# @minion-stack/auth

## 0.2.0

### Minor Changes

- Initial release: `createAuth()` factory for Better Auth, shared between `minion_hub` and `minion_site`.
  Always composes the `jwt` plugin (EdDSA, audience=`openclaw-gateway`, issuer=baseURL) with identical
  defaults between consumers; callers supply app-specific `plugins` (organization + optional oidcProvider)
  and `hooks` (hub's onSignUp personal-agent provisioning). Factory does NOT call `organization()`
  internally — avoids duplicate plugin registration. peerDeps: `better-auth@1.4.19` (exact pin).
