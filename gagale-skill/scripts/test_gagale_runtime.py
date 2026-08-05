#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from gagale_corpus import retrieve_evidence
from gagale_distillation import confirm_distillation_package
from persona_profiles import (
    KNOWLEDGE_OUTPUTS,
    RESET_CONFIRMATION,
    activate_profile,
    import_profile,
    load_profile,
    profile_paths,
    reset_profile_runtime,
    sha256_file,
    verify_knowledge_assembly,
)
from persona_runtime import (
    append_context,
    build_appraisal,
    configured_timezone,
    initial_state,
    load_state,
    validate_reply,
    write_json,
)


def write_chat(path: Path, counterpart: str, target: str, token: str) -> None:
    payload = {
        "messages": [
            {"speaker": counterpart, "text": f"question {token}", "datetime": "2025-01-01T10:00:00"},
            {"speaker": target, "text": f"reply {token}", "datetime": "2025-01-01T10:01:00"},
            {"speaker": counterpart, "text": "another question", "datetime": "2025-01-01T10:02:00"},
            {"speaker": target, "text": "another reply", "datetime": "2025-01-01T10:03:00"},
        ]
    }
    path.write_text(json.dumps(payload), encoding="utf-8")


def confirm_profile(skill_root: Path, profile_id: str, decision: str = "reject") -> None:
    package = profile_paths(skill_root, profile_id)["package"]
    template = json.loads((package / "candidates" / "review_template.json").read_text(encoding="utf-8"))
    for row in template["decisions"]:
        row["decision"] = decision
    decisions = package / "decisions.json"
    decisions.write_text(json.dumps(template), encoding="utf-8")
    result = confirm_distillation_package(package, decisions)
    if not result.get("ok"):
        raise AssertionError(result)


class ProfileProductTests(unittest.TestCase):
    def test_import_copies_source_and_requires_confirmation_before_activation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "skill"
            root.mkdir()
            source = Path(tmp) / "chat.json"
            write_chat(source, "A", "B", "alpha-only")
            result = import_profile(root, source, "alpha", "Alpha", "B", "A")
            self.assertTrue(result["ok"])
            paths = profile_paths(root, "alpha")
            self.assertEqual(sha256_file(source), sha256_file(paths["source"]))
            self.assertEqual(load_profile(root, "alpha")["status"], "awaiting_user_confirmation")
            self.assertEqual(list(paths["knowledge"].iterdir()), [])
            with self.assertRaises(ValueError):
                activate_profile(root, "alpha")

            confirm_profile(root, "alpha")
            self.assertEqual(
                {path.name for path in paths["knowledge"].glob("*.md")},
                set(KNOWLEDGE_OUTPUTS),
            )
            self.assertTrue(verify_knowledge_assembly(root, "alpha")["ok"])
            activated = activate_profile(root, "alpha")
            self.assertTrue(activated["ok"])
            self.assertEqual(load_profile(root)["profile_id"], "alpha")

    def test_source_hash_blocks_tampered_profile_activation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "skill"
            root.mkdir()
            source = Path(tmp) / "chat.json"
            write_chat(source, "A", "B", "immutable")
            import_profile(root, source, "immutable", "Immutable", "B", "A")
            confirm_profile(root, "immutable")
            profile_source = profile_paths(root, "immutable")["source"]
            profile_source.write_text("tampered", encoding="utf-8")
            with self.assertRaises(ValueError):
                activate_profile(root, "immutable")

    def test_confirmed_knowledge_is_rebuilt_and_integrity_checked(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "skill"
            root.mkdir()
            source = Path(tmp) / "chat.json"
            write_chat(source, "A", "B", "rebuild")
            import_profile(root, source, "rebuild", "Rebuild", "B", "A")
            paths = profile_paths(root, "rebuild")
            (paths["knowledge"] / "old-memory.md").write_text("old persona residue", encoding="utf-8")
            paths["state"].write_text('{"old":"state"}', encoding="utf-8")

            confirm_profile(root, "rebuild", decision="adopt")

            self.assertFalse((paths["knowledge"] / "old-memory.md").exists())
            self.assertFalse(paths["state"].exists())
            self.assertIn("Confirmed Memory Foundation", (paths["knowledge"] / "memory.md").read_text(encoding="utf-8"))
            self.assertTrue(verify_knowledge_assembly(root, "rebuild")["ok"])
            (paths["knowledge"] / "persona.md").write_text("tampered", encoding="utf-8")
            self.assertFalse(verify_knowledge_assembly(root, "rebuild")["ok"])
            with self.assertRaises(ValueError):
                activate_profile(root, "rebuild")

    def test_reset_requires_exact_phrase_and_removes_every_private_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "skill"
            root.mkdir()
            engine_marker = root / "SKILL.md"
            engine_marker.write_text("generic engine", encoding="utf-8")
            source = Path(tmp) / "chat.json"
            write_chat(source, "A", "B", "erase")
            import_profile(root, source, "erase", "Erase", "B", "A")
            legacy = root / ".runtime" / "corpus" / "distilled"
            legacy.mkdir(parents=True)
            (legacy / "old-memory.md").write_text("legacy", encoding="utf-8")

            with self.assertRaises(ValueError):
                reset_profile_runtime(root, "DELETE")
            self.assertTrue((root / ".runtime").exists())

            result = reset_profile_runtime(root, RESET_CONFIRMATION)
            self.assertTrue(result["ok"])
            self.assertEqual(result["deleted_profile_ids"], ["erase"])
            self.assertFalse((root / ".runtime").exists())
            self.assertEqual(engine_marker.read_text(encoding="utf-8"), "generic engine")

    def test_two_profiles_never_share_evidence_or_state(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "skill"
            root.mkdir()
            alpha_source = Path(tmp) / "alpha.json"
            beta_source = Path(tmp) / "beta.json"
            write_chat(alpha_source, "A-user", "A-target", "alpha-only")
            write_chat(beta_source, "B-user", "B-target", "beta-only")
            import_profile(root, alpha_source, "alpha", "Alpha", "A-target", "A-user")
            import_profile(root, beta_source, "beta", "Beta", "B-target", "B-user")
            confirm_profile(root, "alpha")
            confirm_profile(root, "beta")

            alpha = retrieve_evidence(root, "alpha-only", profile_id="alpha", top_k=3)
            beta = retrieve_evidence(root, "beta-only", profile_id="beta", top_k=3)
            self.assertIn("alpha-only", json.dumps(alpha))
            self.assertNotIn("beta-only", json.dumps(alpha))
            self.assertIn("beta-only", json.dumps(beta))
            self.assertNotEqual(profile_paths(root, "alpha")["state"], profile_paths(root, "beta")["state"])

    def test_context_and_capabilities_are_profile_relative(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "skill"
            root.mkdir()
            source = Path(tmp) / "chat.json"
            write_chat(source, "A", "B", "context")
            import_profile(root, source, "context", "Context", "B", "A")
            confirm_profile(root, "context")
            profile = load_profile(root, "context")
            tz = configured_timezone(profile)
            now = __import__("datetime").datetime(2025, 1, 1, 10, 0, tzinfo=tz)
            state = initial_state(profile, now)
            append_context(state, "inbound", "why is this difficult?", now)
            appraisal = build_appraisal(profile, state, "why is this difficult?", "user")
            self.assertEqual(appraisal["intent"], "question")
            self.assertEqual(appraisal["drives"]["attachment"]["score"], 0)

            state_path = profile_paths(root, "context")["state"]
            write_json(state_path, state)
            loaded = load_state(state_path, profile, now)
            self.assertEqual(loaded["recent_context"][-1]["text"], "why is this difficult?")

    def test_validator_blocks_unconfirmed_profiles_and_assistant_voice(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "skill"
            root.mkdir()
            source = Path(tmp) / "chat.json"
            write_chat(source, "A", "B", "validate")
            import_profile(root, source, "validate", "Validate", "B", "A")
            profile = load_profile(root, "validate")
            tz = configured_timezone(profile)
            now = __import__("datetime").datetime(2025, 1, 1, 10, 0, tzinfo=tz)
            state = initial_state(profile, now)
            errors, _, _ = validate_reply(profile, state, "作为AI，我可以帮助你", "hello", {})
            self.assertIn("profile_not_confirmed", errors)
            self.assertIn("assistant_tone", errors)


if __name__ == "__main__":
    unittest.main()
