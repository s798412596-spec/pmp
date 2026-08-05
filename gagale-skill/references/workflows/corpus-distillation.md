# Corpus Distillation Workflow

This is the execution contract for turning an original chat export into a
versioned persona corpus package. It is separate from the dialogue runtime.

## Three Invariants

1. Extraction, statistics, suggestions, and confirmation are separate stages
   and must run in that order.
2. Every `raw_text` value is copied byte-for-byte from the parsed source text.
   It must never be paraphrased, summarized, polished, or repaired by a model.
3. Character boundaries and long-term persona values are suggestions until the
   user confirms every candidate individually.

If an invariant is violated, stop and rebuild from the source.

## Commands

Inspect and import a source into an isolated profile:

```powershell
python scripts/gagale_runtime.py --json profile-inspect --source "<chat-export>"
python scripts/gagale_runtime.py --json profile-import \
  --source "<chat-export>" \
  --profile-id "<profile-id>" \
  --target-speaker "<target-speaker>"
```

To rebuild phases zero through three for an existing profile:

```powershell
python scripts/gagale_runtime.py --profile "<profile-id>" --json corpus-distill
```

The default output is `.runtime/profiles/<profile-id>/package/`. Full chat
evidence and generated packages are private runtime data and must not be
committed.

After the user edits every row in `candidates/review_template.json`, apply
phase four:

```powershell
python scripts/gagale_runtime.py --profile "<profile-id>" --json corpus-confirm \
  --decisions "<package-dir>/candidates/review_template.json" \
  --activate
```

Valid decisions are `adopt`, `modify`, and `reject`. `modify` requires a
`replacement`. Chinese values `采纳`、`修改`、`否决` are also accepted.

## Phase Zero: Deterministic Cleaning

Only deterministic non-person expressions may be removed:

- system-speaker messages;
- empty export artifacts;
- read/unread receipts;
- red-packet or transfer system notices;
- recall notices and exact system prompts;
- uncaptioned bare links.

Every participant-authored expression remains in
`corpus/cleaned_messages.jsonl`, including particles, laughter, repeated
greetings, stickers, images, and other media markers.

Near duplicates are not deleted from the evidence stream. They are indexed in
`corpus/duplicate_groups.jsonl` as:

- one representative original expression;
- exact variants;
- real occurrence count;
- all source message ids.

`cleaning_log.md` records every removal reason and every duplicate group.

## Phase One: Evidence Annotation

`corpus/annotated_segments.jsonl` contains one target-person expression per
record. Required fields include:

- `raw_text` and `raw_text_sha256`;
- `traits`;
- `topic`;
- `frequency_tier` and `frequency_count`;
- `context_sensitivity`;
- `period`;
- `emotion_tone`;
- `is_exception`;
- exact preceding context and source message ids.

`raw_text` is the expression itself, not a generated `user:` / `target:`
summary. Context is stored separately.

Heuristic labels are retrieval aids, not facts. If a label conflicts with the
source, the source wins.

## Phase Two: Reproducible Statistics

`stats.json` is calculated only from `corpus/` and includes:

- topic, trait, period, frequency, emotion, and context distributions;
- target-language length statistics;
- punctuation counts;
- common short expressions and character n-grams;
- duplicate and exception counts;
- source and raw-text integrity hashes;
- the exact corpus fields used to reproduce each number.

No model judgment may be inserted into a numeric result.

## Phase Three: Candidates Only

Phase three writes `candidates/` and then stops. Every item has
`status=pending_user_confirmation` and evidence ids or a stats calculation.

Candidate sections are:

- memory anchors;
- voice retrieval indices;
- C4 eight-dimension initial ratios;
- constitutional character boundaries;
- high-frequency scenario mappings;
- user-profile observations.

All `is_exception=true` records are copied to
`candidates/exceptions.jsonl` for special review. Exceptions must never be
promoted into default personality automatically.

At this point, the official files do not exist. Their absence is intentional.
The AI must show the review queue to the user and wait.

## Phase Four: User Confirmation

The user must decide every candidate separately. A pending or missing decision
blocks all official outputs. Constitution candidates carry
`requires_individual_confirmation=true`; there is no bulk-approval command.

Once every decision is complete, `corpus-confirm` writes:

```text
语料包/
  corpus/
  stats.json
  constitution.json
  growth_seed.json
  scenario_map.json
  voice_index.md
  user_profile.md
  cleaning_log.md
```

`voice_index.md` contains retrieval directions only. Concrete language remains
in `corpus/`.

For profile-local packages, the same confirmation also discards any existing
runtime knowledge, state, and snapshots, then assembles a fresh `knowledge/`
layer from confirmed outputs only. No imported profile can be activated until
the source hash and all assembled knowledge hashes pass verification.

The package also keeps `package_manifest.json`, `review_log.json`, and the
`candidates/` audit trail. Confirmed files must never be silently overwritten;
re-distillation must use a new output directory.

## Verification

- Recount sampled topic and frequency values from `corpus/`.
- Compare sampled `raw_text` values and hashes with the source export.
- Review every exception and constitutional candidate.
- Confirm that phase three produced no official persona files.
- Confirm that incomplete decisions make `corpus-confirm` fail.
- Confirm that import leaves `knowledge/` empty and phase four creates every
  required knowledge layer.
- Modify one assembled knowledge file and confirm activation is blocked.
- Run `profile-reset --confirm DELETE-ALL-PROFILES` in a test skill root and
  confirm that `.runtime/` is gone while engine files remain.
- Blind-test typical scenes using the final package and retrieve the supporting
  corpus records for every style claim.

## Engine Boundary

The dialogue engine consumes the final package interface; it does not own the
meaning of a particular character. Replacing the character means rerunning this
workflow against a different source and user-confirmed review, not rewriting
the engine.
