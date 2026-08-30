# @minion-stack/design-tokens

## 0.2.0

### Minor Changes

- dd29da5: Publish the generated semantic token contract and accessible Svelte 5 primitive foundation. Existing token names remain available as compatibility aliases while consumers migrate to canonical semantic roles.
- 1303c83: Add the icon-size scale (`--icon-size-xs/sm/md/lg` — 12/14/16/20px) as a new
  `iconSizes` foundation family, plus utility recipes in `utilities.css`:
  `.chip` (inline metadata pill), `.skeleton` (loading placeholder),
  `.transition-fast` / `.transition-colors-fast`, and `.clamp-2` / `.clamp-3`.
  README now documents semantic spacing rows, the non-contiguous spacing
  vocabulary, orphan-token guidance (`--ease-spring`, `--shadow-focus`,
  `--shadow-status-glow`), and the frozen-`aliases` / extensible-`domainAliases`
  split. Additive only — no alias or theme recipe changes.
