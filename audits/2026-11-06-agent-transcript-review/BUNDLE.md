# Retained audit bundle boundary

The historical `SHA256SUMS` is unchanged. Its audit files are included here; its `.lavish/agent-transcript-review-2026-11-06.html` entry refers to the owner's local interactive artifact, which remains outside this source bundle. That external artifact was separately verified against its original digest. It is not a portable artifact or remote runtime proof.

`PUBLIC-BUNDLE-SHA256SUMS` verifies every file included in this directory from the meta-repo root. Nested historical manifests retain their original path conventions: `code-review/SHA256SUMS` runs from the meta-repo root; `egm/SHA256SUMS` runs from its own directory.

TODO(handoff): if a portable historical interactive report is needed, review and export a sanitized copy before adding it to the source bundle; do not publish the private local original merely to satisfy its historical path. Boundary ledger: `proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md`.
