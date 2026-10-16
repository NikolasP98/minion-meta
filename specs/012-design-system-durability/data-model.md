# Data model

## Preference envelope

Version 1; known catalog IDs in unique order; unique hidden IDs; map of finite clamped integer spans. Pure decoders accept unknown input. Legacy server-scoped version0 is normalized; unsupported future versions fall back without destroying the original storage record. Catalog append policy preserves custom order, explicit rename aliases are applied before deduplication. Unknown IDs drop. Defaults fill omissions.

Local identity = actor ID + organization ID + surface ID, encoded unambiguously. Missing identity disables persistent private state instead of sharing a global fallback. Identity change clears transient editor/save state, reloads scoped data and invalidates old request completion. Personal hidden/order overrides never alter capabilities or org field restrictions.

## Mutation outcome

Runtime outcomes are succeeded, failed, conflict, unknown, committed-refreshing and partial. Presentation additionally owns idle/saving/saved and retired scope. Save UI maps each without losing retry capability distinctions. Operation captures owner/scope, revision, draft snapshot and expected server version. Read retry cannot call mutation closure. Unknown outcome requires reconciliation. Version conflicts retain draft for explicit user decision.

## Qualification identity

Source git SHA and dirty member hashes; package name/version; archive SHA256 and member digests; design contract digest and generated CSS digest; consumer git SHA and installed artifact identity; test receipt and deployed ID/alias/source SHA. Source, installed, rendered and deployed are separate evidence fields.

Unknown stays unknown after read repair without exact-operation server receipt; matching values are not proof. Version admission and native PostgreSQL proof follow spec review amendments.
