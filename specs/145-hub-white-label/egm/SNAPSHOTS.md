# Exact review snapshots

[review-snapshots.zip](review-snapshots.zip) preserves the original bytes of historical target files and the complete frozen stage9 round3 context. Archive entry names retain their former feature-relative paths; older reports naming those paths refer to these entries. [review-snapshots.json](review-snapshots.json) records the SHA-256 of each uncompressed entry. The archive avoids rewriting reviewed bytes merely to remove Markdown hard-break spaces.

The live specification/plan can receive formatting and findings repairs; their current bytes do not retroactively replace a historical review target. Final whole-package review snapshots are added separately with their complete context manifests.
