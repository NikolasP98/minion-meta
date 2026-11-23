# Exact Hub-name normalization and validation

This is the proposed shared validator contract, not application implementation. Examples are in name-fixtures.json. All rejection happens before provisioning or SQL writes.

1. Require string input for custom names. Reject raw Cc (Unicode control) or Zl/Zp (line/paragraph separators), including CR/LF/tab/NEL. Normalize Unicode NFC. Map every Zs (space separator) to ASCII U+0020, collapse runs, remove leading/trailing ASCII spaces.
2. Segment with `new Intl.Segmenter(undefined,{granularity:'grapheme'})`. Runtime must also support regex Unicode properties Extended_Pictographic and Emoji_Modifier. No code-unit or code-point fallback. Unsupported validator returns mutation 503 and disabled editor; reader uses MINION without writing it.
3. Reject empty, more than 15 graphemes, or UTF-8 encoding longer than 256 bytes. All bounds apply to normalized text.
4. For each grapheme containing U+200D or U+FE0E/U+FE0F, require one of these complete matches (Unicode regex flag u):
   - `^(?:\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*$`
   - `^[0-9#*]\uFE0F?\u20E3$` (keycap sequence).
5. Reject every Cf (format) code point other than U+200D accepted by step 4. Reject other variation selectors U+FE00–FE0D and U+E0100–E01EF. Thus standalone selectors, non-emoji joiners, bidi overrides and tag-format emoji sequences are not allowed. Ordinary NFC letters/marks, digits, punctuation, regional-indicator flags and recognized emoji graphemes remain allowed within the limits.
6. For a custom value, reject `/(?:^| )hub$/iu`. This is an ASCII-space-token rule after normalization, not a generic word-boundary rule. Hub and Faces Hub are rejected; Faces-Hub and FacesHub are accepted brand names and receive the fixed Hub suffix. Explain this with field help; do not strip custom text.
7. For an automatic organization suggestion only, remove that terminal Hub token once, then trim. Validate the result by steps 1–5 and the same suffix rule; empty/invalid/overlong suggestion means no automatic suggestion. Creation then requires a short custom value; existing org resolution falls back to MINION. No shortening, recursive suffix stripping or changes to the full organization name.
8. Rendering is always text. A valid HTML-looking prefix is escaped by Svelte; never insert it as markup/CSS. Tests cover the same vectors on server and browser to catch Unicode-runtime discrepancies.

A present custom value has precedence only if it validates; otherwise try the automatic suggestion and then MINION. Null is the absence of override, distinct from the explicit string MINION. Retain normalized capitalization. Literal suffix display casing remains a presentation choice already fixed in the spec (hub shell, Hub titles).
