---
name: gagale-skill
description: Generic, profile-isolated chat persona product that imports DOCX, TXT, Markdown, JSON, JSONL, or CSV conversation records; preserves exact source evidence; runs auditable cleaning, annotation, statistics, candidate review, and confirmation; and provides context-aware retrieval, simulation, validation, memory, and bounded growth for any user-selected target speaker. Use when the user wants to import chat history, build or switch a persona profile, audit a corpus package, or continue a confirmed profile conversation.
---

# Chat Persona Engine

Use this skill as a reusable engine. Never treat bundled code or references as
a character. Identity, voice, relationship facts, memories, and preferences
must come from one private profile package.

## Read First

Read only the framework files needed for the task:

- `references/framework/architecture.md` for layer boundaries.
- `references/framework/profile-package.md` for private paths and profile schema.
- `references/framework/runtime.md` for commands.
- `references/framework/context.md` for conversation orchestration.
- `references/framework/validation.md` for output checks.
- `references/workflows/corpus-distillation.md` for corpus building or review.

Use `scripts/gagale_runtime.py` as the stable command entrypoint. The filename is
kept for compatibility; the implementation is profile-neutral.

## Reset Before Replacing A Persona

When the user wants the old persona removed rather than retained as another
profile, erase the complete private runtime first:

```powershell
python scripts/gagale_runtime.py --json profile-reset \
  --confirm DELETE-ALL-PROFILES
```

This deletes `.runtime/` in the selected skill root, including every imported
source, corpus, candidate, confirmed package, persona foundation, memory,
correction, context, growth snapshot, state file, and active-profile pointer.
The exact confirmation phrase is mandatory. The generic engine, schemas,
scripts, and workflow documentation remain intact.

## Import A New Record

1. Inspect the source before importing:

   ```powershell
   python scripts/gagale_runtime.py --json profile-inspect --source "<chat-export>"
   ```

2. Show the detected speakers. Do not guess the simulated person when the user
   has not identified them.
3. Import into a new profile id:

   ```powershell
   python scripts/gagale_runtime.py --json profile-import \
     --source "<chat-export>" \
     --profile-id "<profile-id>" \
     --display-name "<display-name>" \
     --target-speaker "<target-speaker>" \
     --user-speaker "<counterpart-speaker>"
   ```

Import copies the original record into `.runtime/profiles/<id>/source/`, stores
its SHA-256, builds the retrieval corpus, runs distillation phases zero through
three, and stops. The profile `knowledge/` directory remains empty at this
point. Import does not activate the profile or inherit any personality,
memory, capability, correction, or context from a previous profile.

## Confirm And Activate

Review every row in the generated `package/candidates/review_template.json`.
Every candidate needs `adopt`, `modify`, or `reject`; modifications need a
replacement.

```powershell
python scripts/gagale_runtime.py --profile "<profile-id>" --json corpus-confirm \
  --decisions "<review-template.json>" --activate
```

Do not bypass phase-four confirmation. An unconfirmed profile may be inspected
for review but must not produce normal persona replies.

Successful confirmation rebuilds the runtime knowledge layer only from the
confirmed package. It creates `persona.md`, `memory.md`, `voice.md`,
`scenarios.md`, `user-profile.md`, `corrections.md`, `context-notes.md`,
`provenance.md`, and `manifest.json`; it also removes pre-existing runtime
state and growth snapshots. Activation verifies both the immutable source hash
and every assembled knowledge-file hash.

## Run A Confirmed Profile

List or switch profiles with `profile-list`, `profile-info`, and
`profile-activate`. For each conversational turn, prefer:

```powershell
python scripts/gagale_runtime.py --json orchestrate --user-message "<latest-message>"
```

Follow the returned `prompt_package`, especially:

1. confirmed profile files;
2. `appraisal.required_move`;
3. the current profile-only context window;
4. retrieved source evidence;
5. capability switches in `profile.json`.

Generate one target-speaker message, not an explanation. Validate important or
proactive candidates:

```powershell
python scripts/gagale_runtime.py --json validate \
  --user-message "<latest-message>" --reply "<candidate>"
```

Warnings require judgment. Passing validation is not proof of likeness.

## Context And Growth

- Keep state, memory, evidence, and growth isolated by profile id.
- Use source records as evidence, not scripts to copy verbatim.
- Keep simulated events short-term until the user confirms them.
- Use `ledger-propose` before recording a new development and
  `ledger-confirm` only after explicit confirmation.
- Use growth snapshots for reversible changes; never change constitutional
  items through ordinary conversation.
- Never write generated dialogue back into `source/` or `corpus/`.

## Privacy And Safety

The whole `.runtime/` tree is private and ignored by Git. Never commit chat
exports, profile manifests, confirmed user-specific packages, runtime state, or
private knowledge files.

For a zero-retention replacement, run `profile-reset` before importing the new
record and verify `profile-list` returns an empty list.

This is a simulation from records and confirmed facts. Never claim to be the
real person or make real-world commitments on their behalf. Step out of role
for self-harm, harassment, real contact, or irreversible external decisions.
