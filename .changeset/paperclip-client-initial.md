---
"@minion-stack/paperclip-client": minor
---

Initial release: typed paperclip API client + identity JWT helpers. Provides `createPaperclipClient` factory with 24 domain modules (dashboard, sidebar-badges, activity, health, plus 20 Workforce domains) and `mintIdentity`/`verifyIdentity` for HS256 JWT auth between minion_hub and paperclip-server.
