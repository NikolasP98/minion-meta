# Fact preservation

Before proposing a rewrite, extract and protect:

- numbers, quantities, dates, times, versions, measurements, ranges, and limits;
- people, organizations, products, places, and other proper nouns;
- URLs, email addresses, citations, identifiers, endpoints, paths, flags, symbols, code, and config values;
- quotations and their attribution;
- causal claims, comparisons, negations, conditions, uncertainty, scope, and party relationships;
- `must`, `never`, `only`, `all`, `required`, and equivalent force-bearing language.

Absolute spans must remain exact. Semantic claims may be rephrased only when strength, direction, scope, and conditions remain identical. Preserve approximations as approximations and both ends of every range. Preserve every list item unless deletion is the explicit task.

Use, with `$unslop` resolved by the snippet in [SKILL.md](../SKILL.md) rather than relative to the working directory:

```bash
python3 "$unslop/extract_constraints.py" original.md > constraints.json
python3 "$unslop/validate_preservation.py" original.md proposed.md constraints.json
python3 "$unslop/diff_check.py" original.md proposed.md
```

For legal, medical, scientific, safety, or security text, validate in strict mode, which also fails on warnings rather than on missing constraints alone. The vendored parser reads `--strict` only as the first argument and silently ignores it anywhere else, so keep it ahead of the file arguments:

```bash
python3 "$unslop/validate_preservation.py" --strict original.md proposed.md constraints.json
```

Then manually re-read every negation, limit, condition, attribution, and relationship. Tool success is necessary evidence, not semantic proof.
