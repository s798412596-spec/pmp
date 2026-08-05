# Runtime Contract

Use `scripts/gagale_runtime.py` as the compatibility entrypoint.

## Profile Operations

- `profile-inspect`: parse a source and list speakers before import.
- `profile-import`: create an isolated profile and run phases zero through three.
- `profile-list`: list available private profiles.
- `profile-reset`: delete the complete private `.runtime/` tree after receiving
  the exact `DELETE-ALL-PROFILES` confirmation phrase.
- `profile-info`: show the selected profile and resolved paths.
- `profile-activate`: select a confirmed, fully assembled, integrity-checked profile.

## Corpus Operations

- `corpus-build`: rebuild the profile-local retrieval corpus.
- `corpus-distill`: rerun phases zero through three in a fresh package.
- `corpus-confirm`: apply complete decisions, unlock official files, rebuild
  all runtime knowledge layers, and clear old state and snapshots.
- `evidence-retrieve`: retrieve only from the selected profile.

## Conversation Operations

- `orchestrate`: preferred entrypoint; returns state, context, appraisal,
  evidence, generation contract, and optional validation.
- `preflight`: return constraints without building the full prompt package.
- `validate`: reject assistant voice, visible reasoning, profile leakage, and
  exact repetition; report evidence-alignment warnings.
- `tick`: advance profile time state and optional proactive gating.

## Maintenance

- `memory-sync`: write a compact runtime context block into profile knowledge.
- `ledger-propose` and `ledger-confirm`: keep simulated developments pending
  until explicit confirmation.
- `growth-snapshot`, `growth-diff`, and `growth-rollback`: manage bounded,
  reversible development inside one profile.
