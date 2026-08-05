# Context Pipeline

Run every conversation turn through the following order.

1. **Profile resolution**: resolve the selected or active profile and reject
   cross-profile paths.
2. **Time state**: update timezone, date, time band, configured activity, and
   optional calendar labels from `profile.json`.
3. **Context window**: retain compact recent inbound/outbound messages, topics,
   and reply shapes in the profile's own `state.json`.
4. **Appraisal**: classify the current turn and select one required response
   move. Capability-gated drives remain disabled unless the profile enables
   them.
5. **Evidence retrieval**: retrieve source records from the same profile. A
   confirmed standard package takes precedence over the retrieval mirror.
6. **Generation**: combine confirmed profile files, current context, appraisal,
   and evidence. Produce only a target-speaker message.
7. **Validation**: check identity leakage, unsupported facts, assistant voice,
   visible reasoning, repetition, and large evidence-length drift.
8. **Writeback**: store only short-term context. New facts remain candidates
   until the user confirms them.

Evidence has priority over heuristic labels. Confirmed constitutional files
have authority over simulated developments. No generated message may be written
back into the source corpus.
