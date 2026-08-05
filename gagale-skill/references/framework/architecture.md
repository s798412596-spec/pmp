# Product Architecture

The product is a persona-package production system plus a profile-relative
runtime. It has three layers and must keep them separate.

## 1. Generic Engine

The committed skill contains parsers, distillation, retrieval, context state,
appraisal, validation, memory, and growth mechanics. It contains no source
chat, target identity, relationship facts, interests, anniversaries, private
paths, or character-specific examples.

## 2. Private Profile Package

Each imported character lives under `.runtime/profiles/<profile-id>/` with its
own immutable source copy, corpus, review package, knowledge, and state. One
profile must never read another profile's files.

## 3. Active Profile Pointer

`.runtime/active_profile.json` contains only the selected profile id. Runtime
commands resolve every path through that id. A profile cannot be activated for
normal generation until phase-four confirmation is complete and the assembled
knowledge manifest passes integrity verification. There is no legacy or
unconfirmed activation exception.

## Lifecycle

1. Optionally reset all private runtime data when replacement requires zero retention.
2. Inspect a source export and review detected speakers.
3. Import it into a new private profile with an empty knowledge layer.
4. Run deterministic cleaning, annotation, and statistics.
5. Generate candidates and stop for review.
6. Confirm every candidate individually.
7. Assemble persona, memory, voice, scenarios, user profile, provenance, and fresh runtime files.
8. Verify source and knowledge hashes, then activate the confirmed profile.
9. Run context, retrieval, generation, validation, memory, and bounded growth.

Replacing the character means selecting another profile. It never means
editing the engine.

## Trust Boundaries

The pipeline has three authorities. They must never be collapsed:

1. **Source evidence**: parsed participant expressions, source ids, timestamps,
   and immutable hashes. Generated text cannot enter this layer.
2. **Deterministic derivation**: cleaning decisions, duplicate counts, and
   statistics calculated only from the evidence corpus.
3. **Human-governed interpretation**: model suggestions remain candidates
   until every item is adopted, modified, or rejected by the user.

The confirmed package is the only persona authority accepted by normal
generation. Runtime memory may propose developments, but it cannot silently
rewrite source evidence or constitutional boundaries.

## End-to-End Components

| Component | Responsibility | Main failure prevented |
|---|---|---|
| Source inspection | Detect format and speakers before import | Wrong identity mapping |
| Profile import | Copy source, hash it, and create private paths | Cross-profile leakage |
| Full reset | Remove every private profile and runtime artifact behind an exact confirmation phrase | Legacy persona residue |
| Distillation 0-2 | Clean, annotate, and calculate statistics | Evidence loss and fabricated counts |
| Candidate generation | Suggest persona files with evidence links | Untraceable one-shot summaries |
| Confirmation gate | Require a decision for every candidate | AI-defined identity |
| Knowledge assembly | Rebuild every runtime persona layer from confirmed outputs and hash it | Old memory or rules surviving replacement |
| Retrieval and context | Select profile-local evidence for the current turn | Generic or stale replies |
| Validation | Reject leakage, assistant voice, unsupported facts, and repetition | Runtime drift |
| Bounded growth | Propose, confirm, snapshot, diff, and roll back changes | Silent personality mutation |

## Replaceability Contract

The engine depends on the final package schema, never on a person's name or
private facts. A new persona is therefore a new profile and package, not a fork
of the runtime. The same profile can also be moved to a newer runtime as long as
the package contract remains compatible.
