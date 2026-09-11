# Independent 12-06 admission

Root admits plan SHA-256 `807d8f2b8297e7006d0fab4ea1eaa21814ca5dfb5637b61a61df3a5ea840b33c`. GSD structure check passes three tasks with no warnings/errors. The preceding 12-05 diagnostic independently passed eight actual-nft tests; its graph and packaging limitations remain open.

The implementation uses existing non-setuid Bubblewrap and private namespaces. Exact runtime files and immutable credential-free artifacts are mounted; no host-tree exception, broad bind, networking, package install or asset suppression is admitted. Same-launch isolation must pass before loading the application entry. Missing controls fail qualification. Tasks 1/2 must provide actual filesystem, network, identity, read-only and lifecycle proofs plus real nft asset preservation. Root reviews those results before Task 3. Four sequential 60-second/2-GiB traces are the maximum admitted application work after that gate; no full build or product repair is included.

Root retains global planning/proposals, source admission and resource windows. The separate pgvector build currently owns heavy resources. A new diagnostic is not a release or dependency-candidate acceptance.
