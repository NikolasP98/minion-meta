# Existing admission interfaces

This feature adds validation to existing interfaces; no new endpoint is added.

## Automatic proposal sweep

Index entries discover candidates. Fetch canonical proposal bytes and validate
their identity and metadata before a NEW approval or spec-run insert. An index
hint cannot authorize a conflicting canonical source. Re-evaluate automatic
trust/risk using the same prospective bytes that the approval PUT commits and
an expected draft status. Invalid siblings get bounded reasons and do not
prevent later valid siblings from being considered. Both automatic and explicit
starts resolve the proposal file's commit strictly, fetch content at that commit,
and compare the current file revision before insertion. Observed drift refuses
admission. Index hints do not need to project new fields before consumers can
read them from canonical source.

## Proposal approval transition

The existing authenticated operator route may approve a valid human/external
or unclassified WorkItem. Automatic approval is a stricter controller-selected operation; the
actor/by label cannot select authority. Invalid metadata is refused before PUT.
Legacy terminal transitions remain available.

## POST /pipeline/spec

Input remains the existing proposal id and stage options. Require complete
canonical WorkItem, identity binding and approved status before insertion.
Invalid metadata returns 422; unavailable source/policy returns a retryable
service failure. Existing duplicate/status/authentication and manifest gates
remain in force. Valid approved human/external/unclassified controls must still
reach the existing manifest requirements; unclassified is not automatic approval.

## New automatic retry

Validate current canonical metadata and compare normalized topics, derived risk
and policy hash with inherited authority before insertion. Incompatible changes
require renewed review/fresh lineage; existing parent/child rows stay untouched.
An unchanged compatible retry inherits the stored manifest exactly.

## Existing spec-based POST /runs

This remains governed by the reviewed spec, pinned spec identity and execution
manifest. This slice does not introduce a mutable proposal gate into an already
approved spec's execution path.

## Evidence boundary

The decision binds admission-time canonical bytes, not proposal contents read
later by an execution checkout. WorkItem metadata remains trusted only to the
extent repository authoring/review authority is trusted.
