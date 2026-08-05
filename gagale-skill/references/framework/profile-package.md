# Profile Package Contract

```text
.runtime/
  active_profile.json
  profiles/
    <profile-id>/
      profile.json
      source/
        original.<supported-format>
      corpus/
      package/
      knowledge/
        manifest.json
        persona.md
        memory.md
        voice.md
        scenarios.md
        user-profile.md
        corrections.md
        context-notes.md
        provenance.md
      state.json
      snapshots/
```

Supported source formats are DOCX, TXT, Markdown, JSON, JSONL, and CSV.

`profile.json` owns identity and runtime configuration:

- profile id and display name;
- immutable source path, format, and SHA-256;
- exact target and counterpart speaker mapping;
- timezone and optional schedule/calendar configuration;
- capability switches for proactivity, care, curiosity, attachment,
  possessiveness, and external agency;
- relative paths for corpus, package, knowledge, and state.

The committed v2 validation contract is `references/runtime/profile.schema.json`.

All capability switches default conservatively. Chat evidence may support a
candidate, but only user confirmation may enable a lasting relationship or
behavioral assumption.

Import creates an empty `knowledge/` directory. Phase four replaces its entire
contents from the confirmed package, writes a hash manifest, and clears prior
state and snapshots. Activation is blocked when any required knowledge file is
missing or its hash has changed.

`profile-reset --confirm DELETE-ALL-PROFILES` deletes the complete `.runtime/`
tree for a zero-retention replacement. It never deletes committed engine files.

The complete `.runtime/` tree is private and ignored by Git. Do not put source
records or confirmed user-specific profiles under committed references.
