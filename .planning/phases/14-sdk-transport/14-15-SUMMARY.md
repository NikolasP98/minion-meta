---
phase: 14-sdk-transport
plan: "15"
status: verified_private_utility
requirements-completed: []
---

# Pending versus incompatible plugin facts

The existing compatibility utility now returns a structured kind for both denied states. Unknown constrained facts remain denied; malformed or known incompatible facts take precedence. Missing method advertisement is distinct from a known empty array. The existing grammar and unconstrained legacy success remain.

53 tests and focused types pass independently; native format passes. See14-15-VERIFICATION.md and the private qc-compat-checks receipt for source, package and red/green identities. Two malformed bridge-coercion failures also reproduced and were corrected without coercing raw values into error text.

Only two files in the private paired Hub changed.14-06 must consume kind and qualify actual waiting/incompatible rendered behavior; full Hub/browser, manifest and installed adoption remain separate gates. No requirement or phase closes here.
