# Stage 7 — Feature critics

All reviewers were native fresh-context agents (fork_turns=none), read-only. Findings below retain their reported severity. Review target: approaches-initial.md content, FeatureRange1..107. No tests or writes were performed by reviewers. This file consolidates their reports without changing severities.

## Design critic — /root/egm_design_critic — completed, changes required

### DC-1 — Major — C04 advertises unavailable continuation

Anchors: approaches.md:62–70, especially66; hub-candidate.md21–27. Design promises continuation/page metadata/stable ordering across pages, but selected response has bookings,total,returned,truncated,limit,mode and no continuation. Narrow filters cannot enumerate501 identical-timestamp bookings. Choose and document bounded list+count or implement continuation. Align title, alternatives, risks, acceptance and evidence.

### DC-2 — Major — Reset safety is not lifecycle-integrated; state retention is unbounded

Anchors: approaches.md36–40; memory-candidate.md75. At inspection clearSessionCursor existed only in definition/tests. Real reset/delete/expiry do not invoke it, so helper tests do not prove actual lifecycle safety. Enlarged map can retain buffered text/context indefinitely. Identify/wire lifecycle entry points and test in-flight work. Bound inactive retention and invalidate evicted generations. Until integrated, only claim manual-clear behavior.

### DC-3 — Major — Audio crosses egress before text guard

Anchors: approaches.md26–27,86,96; reply-dispatcher.ts138–146; dispatch-from-config TTS calls. Supported secrets/protocol may reach TTS provider/audio while text is cleaned later. Specify filtering before synthesis/derived artifacts, including override text, retain final guard, test synthetic provider input and delivered payload construction.

### DC-4 — Major — Ordinary tool-only replies disappear

Anchors: approaches.md26,86–88; output-candidate.md15–17; reply-dispatcher.ts149–152. Fallback is DSML-only; ordinary tool syntax can become empty and be dropped. Define one terminal outcome across families, distinguish terminal from intermediate blocks, emit one explicit failure at terminal while avoiding repeated block failures. Test dispatcher outcome.

### DC-5 — Major — Surrounding prose can preserve a false receipt

Anchors: approaches.md86–88; outbound-sanitizer.ts193–195. Removing an unexecuted DSML envelope can retain 'Booking created successfully', making invalid output look like an execution receipt. Deterministically fail contaminated terminal responses, or visibly mark invalid output and prohibit claims without structured evidence. Add mixed success-claim/protocol fixtures. This is additional to the four known issues, not a deployed-state claim.

## Structural critic — /root/egm_structural — completed

### ST-1 — Major — C04 structure selects contradictory capabilities

Anchors: approaches.md62–70; candidate C04. High-level section requires continuation/page metadata/later requests but selected candidate has no cursor/page. This changes observable capability. Align with bounded list+exact count and explicitly state inability to enumerate every match, or qualify continuation. Bounded design can satisfy desired behavior4 with explicit enumeration limit.

No other structural findings. Sections are sequential, Markdown valid, all eight findings have AS-IS/TO-BE/alternatives/risks. Motivation, authority, measurable transitions, evidence and adoption gates are sufficiently stated for high-level scope. Pseudocode appropriately deferred. Active reset/TTS/fallback corrections were not re-tested by this reviewer.

## Style critic

Completed; findings appended below.

### Style critic — /root/egm_feature_style — completed

FS-1 — Nit — C01/C08 line34: 'The threshold therefore never opens at its default' describes a gate rather than a threshold. Prefer 'The default four-message threshold is therefore never met.'

FS-2 — Nit — C03 line56: 'effect-defining IDs' is coined and undefined. Prefer 'the identifiers that determine the booking'. No Blocker or Major style findings in FeatureRange9–106.
