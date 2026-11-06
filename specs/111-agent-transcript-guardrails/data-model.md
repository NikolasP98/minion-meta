# State and validation model

No database schema changes. Existing entities remain authoritative.

- Connection admission: token verification, requested role, device pairing/shared authentication, and assignment checks. Device-free JWT may admit only the approved operator role; existing operator assignment checks still apply.
- Assistant output: raw response, protocol-validity state, normalized visible text, optional spoken override, channel controls/media and terminal/nonterminal state. Once invalid, an output cannot regain success semantics through extraction or speech selection.
- Protected tool result: original complete content, supported redaction, bounded content, plugin transformations and final guard. Every destructive cap must follow the applicable redaction guard.
- Appointment preview/commit: scoped validated references and current availability, including HR closure precedence; preview has no effects, commit revalidates.
- Finance series: accepted business period, business timezone, revenue/cost bucket labels and timezone-separated cache identity. Legacy callers retain their existing default.
