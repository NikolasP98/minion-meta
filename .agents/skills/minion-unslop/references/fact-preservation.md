# Fact preservation

Before proposing a rewrite, extract and protect:

- numbers, quantities, dates, times, versions, measurements, ranges, and limits;
- people, organizations, products, places, and other proper nouns;
- URLs, email addresses, citations, identifiers, endpoints, paths, flags, symbols, code, and config values;
- quotations and their attribution;
- causal claims, comparisons, negations, conditions, uncertainty, scope, and party relationships;
- `must`, `never`, `only`, `all`, `required`, and equivalent force-bearing language.

Absolute spans must remain exact. Semantic claims may be rephrased only when strength, direction, scope, and conditions remain identical. Preserve approximations as approximations and both ends of every range. Preserve every list item unless deletion is the explicit task.

Resolve these scripts relative to this skill's loaded directory, never relative to the working directory:

```bash
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  skill="$CLAUDE_PLUGIN_ROOT/skills/minion-unslop"
else
  root=$PWD
  until [ -d "$root/.agents/skills/minion-unslop" ] || [ "$root" = / ]; do root=$(dirname "$root"); done
  skill="$root/.agents/skills/minion-unslop"
fi
[ -d "$skill/scripts" ] || { echo "minion-unslop scripts not found" >&2; exit 2; }
python3 "$skill/scripts/extract_constraints.py" original.md > constraints.json
python3 "$skill/scripts/validate_preservation.py" original.md proposed.md constraints.json
python3 "$skill/scripts/diff_check.py" original.md proposed.md
```

For legal, medical, scientific, safety, or security text, run `validate_preservation.py --strict` if supported by the vendored command interface and manually re-read every negation, limit, condition, attribution, and relationship. Tool success is necessary evidence, not semantic proof.
