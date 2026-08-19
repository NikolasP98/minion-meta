# Debugging

Build a tight loop before building a theory.

1. Reproduce the user's exact symptom with one agent-runnable command.
2. Make the signal fast, deterministic, and capable of failing specifically for this bug.
3. Minimize the scenario one element at a time; keep only load-bearing inputs, state, and callers.
4. Rank three to five falsifiable hypotheses. For each, state the observation that would distinguish it.
5. Probe one variable at a time at the boundary that separates hypotheses. Tag temporary instrumentation for complete removal.
6. Convert the minimal reproduction into a regression test only when a stable public seam exists.
7. Apply the smallest root-cause fix. Re-run both the minimal check and the original scenario.
8. Remove instrumentation and throwaway artifacts.

For a flake, increase and measure the reproduction rate by looping, seeding, stressing, or narrowing timing. For performance, establish a numeric baseline and use profiling or query plans instead of broad logging.

If no runnable loop is possible, state what is missing and which claim remains unproven. Do not substitute confident speculation.
