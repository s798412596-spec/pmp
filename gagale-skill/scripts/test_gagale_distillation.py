#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import tempfile
import unittest
from pathlib import Path

from gagale_corpus import load_chat_messages
from gagale_distillation import (
    OFFICIAL_OUTPUTS,
    build_distillation_package_from_messages,
    confirm_distillation_package,
    sha256_text,
)


def message(message_id: int, speaker: str, text: str, timestamp: str) -> dict[str, object]:
    date, time = timestamp.split("T")
    return {
        "id": message_id,
        "date": date,
        "time": time,
        "speaker": speaker,
        "text": text,
        "type": "text",
        "datetime": timestamp,
        "is_system": speaker == "system",
    }


def sample_messages() -> list[dict[str, object]]:
    return [
        message(1, "system", "new messages", "2025-01-01T08:00:00"),
        message(2, "Alex", "Are you free later?", "2025-01-01T08:01:00"),
        message(3, "River", "After six, yes.", "2025-01-01T08:02:00"),
        message(4, "Alex", "Dinner?", "2025-01-01T08:03:00"),
        message(5, "River", "Sure", "2025-01-01T08:04:00"),
        message(6, "River", "Sure!", "2025-01-01T08:05:00"),
        message(7, "Alex", "I may be late", "2025-06-01T20:00:00"),
        message(8, "River", "Tell me when you leave.", "2025-06-01T20:01:00"),
    ]


class SourceAdapterTests(unittest.TestCase):
    def test_json_txt_jsonl_and_csv_normalize_to_one_schema(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            records = [
                {"sender": "A", "content": "hello", "timestamp": "2025-01-01T10:00:00"},
                {"sender": "B", "content": "hi", "timestamp": "2025-01-01T10:01:00"},
            ]
            json_path = root / "chat.json"
            json_path.write_text(json.dumps({"messages": records}), encoding="utf-8")
            jsonl_path = root / "chat.jsonl"
            jsonl_path.write_text("\n".join(json.dumps(row) for row in records), encoding="utf-8")
            txt_path = root / "chat.txt"
            txt_path.write_text("2025-01-01 10:00 A: hello\n2025-01-01 10:01 B: hi\n", encoding="utf-8")
            csv_path = root / "chat.csv"
            with csv_path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=["sender", "content", "timestamp"])
                writer.writeheader()
                writer.writerows(records)

            for path in (json_path, jsonl_path, txt_path, csv_path):
                messages = load_chat_messages(path)
                self.assertEqual([row["speaker"] for row in messages], ["A", "B"], path)
                self.assertEqual([row["text"] for row in messages], ["hello", "hi"], path)


class DistillationTests(unittest.TestCase):
    def test_phase_three_preserves_exact_evidence_and_locks_official_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            package = Path(tmp) / "package"
            result = build_distillation_package_from_messages(
                sample_messages(),
                package,
                "synthetic.json",
                target_speaker="River",
                user_speaker="Alex",
            )
            self.assertTrue(result["ok"])
            self.assertEqual(result["phase"], 3)
            for filename in OFFICIAL_OUTPUTS:
                self.assertFalse((package / filename).exists())

            annotations = [
                json.loads(line)
                for line in (package / "corpus" / "annotated_segments.jsonl").read_text(encoding="utf-8").splitlines()
            ]
            exact = next(row for row in annotations if row["source_message_id"] == 3)
            self.assertEqual(exact["raw_text"], "After six, yes.")
            self.assertEqual(exact["raw_text_sha256"], sha256_text("After six, yes."))
            self.assertNotIn("Alex:", exact["raw_text"])

    def test_confirmation_requires_every_decision(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            package = Path(tmp) / "package"
            build_distillation_package_from_messages(
                sample_messages(), package, "synthetic.json", target_speaker="River", user_speaker="Alex"
            )
            template = json.loads((package / "candidates" / "review_template.json").read_text(encoding="utf-8"))
            incomplete = package / "incomplete.json"
            incomplete.write_text(json.dumps({"decisions": template["decisions"][:1]}), encoding="utf-8")
            blocked = confirm_distillation_package(package, incomplete)
            self.assertFalse(blocked["ok"])
            for filename in OFFICIAL_OUTPUTS:
                self.assertFalse((package / filename).exists())

            for row in template["decisions"]:
                row["decision"] = "reject"
            decisions = package / "decisions.json"
            decisions.write_text(json.dumps(template), encoding="utf-8")
            confirmed = confirm_distillation_package(package, decisions)
            self.assertTrue(confirmed["ok"])
            for filename in OFFICIAL_OUTPUTS:
                self.assertTrue((package / filename).exists(), filename)


if __name__ == "__main__":
    unittest.main()
