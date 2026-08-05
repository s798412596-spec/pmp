#!/usr/bin/env python3
"""Private, replaceable persona profile packages for the chat simulation engine."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROFILE_SCHEMA_VERSION = 2
PROFILE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")
SUPPORTED_SOURCE_SUFFIXES = {".docx", ".txt", ".md", ".json", ".jsonl", ".csv"}
RESET_CONFIRMATION = "DELETE-ALL-PROFILES"
KNOWLEDGE_OUTPUTS = (
    "persona.md",
    "memory.md",
    "voice.md",
    "scenarios.md",
    "user-profile.md",
    "corrections.md",
    "context-notes.md",
    "provenance.md",
)


def runtime_root(skill_root: Path) -> Path:
    return skill_root.resolve() / ".runtime"


def profiles_root(skill_root: Path) -> Path:
    return runtime_root(skill_root) / "profiles"


def active_profile_path(skill_root: Path) -> Path:
    return runtime_root(skill_root) / "active_profile.json"


def normalize_profile_id(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    if not normalized:
        normalized = datetime.now(timezone.utc).strftime("profile-%Y%m%d-%H%M%S")
    if not PROFILE_ID_RE.fullmatch(normalized):
        raise ValueError("profile_id must contain only lowercase letters, digits, and hyphens")
    return normalized


def profile_root(skill_root: Path, profile_id: str) -> Path:
    safe_id = normalize_profile_id(profile_id)
    base = profiles_root(skill_root)
    candidate = (base / safe_id).resolve()
    if candidate.parent != base.resolve():
        raise ValueError("profile path escaped the private profiles directory")
    return candidate


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def active_profile_id(skill_root: Path) -> str:
    marker = active_profile_path(skill_root)
    if not marker.exists():
        return ""
    try:
        payload = json.loads(marker.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ""
    return str(payload.get("profile_id", "")).strip()


def resolve_profile_id(skill_root: Path, requested: str = "") -> str:
    profile_id = requested.strip() or active_profile_id(skill_root)
    if not profile_id:
        raise ValueError("No active profile. Import or activate a profile first.")
    return normalize_profile_id(profile_id)


def load_profile(skill_root: Path, profile_id: str = "") -> dict[str, Any]:
    resolved_id = resolve_profile_id(skill_root, profile_id)
    path = profile_root(skill_root, resolved_id) / "profile.json"
    if not path.exists():
        raise FileNotFoundError(f"Profile manifest not found: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("profile_id") != resolved_id:
        raise ValueError(f"Profile id mismatch in {path}")
    payload["_root"] = str(path.parent)
    return payload


def profile_paths(skill_root: Path, profile_id: str = "") -> dict[str, Path]:
    profile = load_profile(skill_root, profile_id)
    root = Path(profile["_root"])
    configured = profile.get("paths", {})
    return {
        "root": root,
        "manifest": root / "profile.json",
        "source": root / str(profile.get("source", {}).get("path", "source/original.txt")),
        "knowledge": root / str(configured.get("knowledge", "knowledge")),
        "corpus": root / str(configured.get("corpus", "corpus")),
        "package": root / str(configured.get("package", "package")),
        "state": root / str(configured.get("state", "state.json")),
    }


def verify_profile_source(skill_root: Path, profile_id: str = "") -> dict[str, Any]:
    profile = load_profile(skill_root, profile_id)
    paths = profile_paths(skill_root, profile["profile_id"])
    source = paths["source"]
    expected = str(profile.get("source", {}).get("sha256", "")).lower()
    actual = sha256_file(source) if source.exists() else ""
    return {
        "ok": bool(expected and actual and expected == actual.lower()),
        "source": str(source),
        "expected_sha256": expected,
        "actual_sha256": actual,
    }


def list_profiles(skill_root: Path) -> list[dict[str, Any]]:
    base = profiles_root(skill_root)
    active = active_profile_id(skill_root)
    rows: list[dict[str, Any]] = []
    if not base.exists():
        return rows
    for manifest in sorted(base.glob("*/profile.json")):
        try:
            payload = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        profile_id = str(payload.get("profile_id", manifest.parent.name))
        rows.append(
            {
                "profile_id": profile_id,
                "display_name": payload.get("display_name", profile_id),
                "status": payload.get("status", "unknown"),
                "active": profile_id == active,
                "target_speaker": payload.get("speakers", {}).get("target", ""),
                "source_format": payload.get("source", {}).get("format", ""),
            }
        )
    return rows


def activate_profile(skill_root: Path, profile_id: str) -> dict[str, Any]:
    profile = load_profile(skill_root, profile_id)
    status = str(profile.get("status", ""))
    if status != "confirmed":
        raise ValueError("Profile is not confirmed. Finish item-by-item review before activation.")
    integrity = verify_profile_source(skill_root, profile["profile_id"])
    if not integrity["ok"]:
        raise ValueError("Profile source integrity check failed; do not activate this profile.")
    knowledge_integrity = verify_knowledge_assembly(skill_root, profile["profile_id"])
    if not knowledge_integrity["ok"]:
        raise ValueError("Confirmed profile knowledge is incomplete or changed; rebuild it before activation.")
    write_json(
        active_profile_path(skill_root),
        {"schema_version": PROFILE_SCHEMA_VERSION, "profile_id": profile["profile_id"]},
    )
    return {
        "ok": True,
        "profile_id": profile["profile_id"],
        "display_name": profile.get("display_name", profile["profile_id"]),
        "status": status,
        "source_integrity": integrity,
        "knowledge_integrity": knowledge_integrity,
    }


def reset_profile_runtime(skill_root: Path, confirmation: str) -> dict[str, Any]:
    """Delete every private profile and active runtime artifact under one skill root."""
    if confirmation != RESET_CONFIRMATION:
        raise ValueError(f"Reset blocked. Pass the exact confirmation phrase: {RESET_CONFIRMATION}")
    root = skill_root.resolve()
    private_root = (root / ".runtime").resolve()
    if private_root.parent != root or private_root.name != ".runtime":
        raise ValueError("Private runtime path failed its containment check.")
    deleted_profiles = [row["profile_id"] for row in list_profiles(root)]
    existed = private_root.exists()
    if existed:
        shutil.rmtree(private_root)
    return {
        "ok": True,
        "status": "empty",
        "runtime_root": str(private_root),
        "runtime_existed": existed,
        "deleted_profile_count": len(deleted_profiles),
        "deleted_profile_ids": deleted_profiles,
        "active_profile": "",
    }


def speaker_inventory(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts = Counter(
        str(message.get("speaker", "")).strip()
        for message in messages
        if str(message.get("speaker", "")).strip() and not message.get("is_system")
    )
    return [{"speaker": speaker, "message_count": count} for speaker, count in counts.most_common()]


def inspect_source(source_path: Path) -> dict[str, Any]:
    from gagale_corpus import load_chat_messages

    source = source_path.resolve()
    messages = load_chat_messages(source)
    return {
        "ok": True,
        "source": str(source),
        "source_format": source.suffix.lower().lstrip("."),
        "source_sha256": sha256_file(source),
        "message_count": len(messages),
        "speakers": speaker_inventory(messages),
        "target_speaker_required": True,
    }


def import_profile(
    skill_root: Path,
    source_path: Path,
    profile_id: str,
    display_name: str,
    target_speaker: str,
    user_speaker: str = "",
    timezone_name: str = "Asia/Shanghai",
) -> dict[str, Any]:
    from gagale_corpus import build_corpus, load_chat_messages, resolve_speakers
    from gagale_distillation import build_distillation_package_from_messages

    source = source_path.resolve()
    if not source.exists():
        raise FileNotFoundError(f"Source chat record not found: {source}")
    suffix = source.suffix.lower()
    if suffix not in SUPPORTED_SOURCE_SUFFIXES:
        raise ValueError(f"Unsupported source format: {suffix or '<none>'}")
    messages = load_chat_messages(source)
    user, target = resolve_speakers(messages, target_speaker, user_speaker, require_target=True)

    safe_id = normalize_profile_id(profile_id)
    root = profile_root(skill_root, safe_id)
    if root.exists():
        raise ValueError(f"Profile already exists: {safe_id}")
    source_dir = root / "source"
    source_dir.mkdir(parents=True, exist_ok=False)
    for name in ("knowledge", "corpus", "package"):
        (root / name).mkdir()
    private_source = source_dir / f"original{suffix}"
    shutil.copy2(source, private_source)
    source_hash = sha256_file(private_source)
    created_at = datetime.now(timezone.utc).isoformat()
    profile = {
        "schema_version": PROFILE_SCHEMA_VERSION,
        "profile_id": safe_id,
        "display_name": display_name.strip() or safe_id,
        "status": "awaiting_user_confirmation",
        "created_at": created_at,
        "source": {
            "path": str(private_source.relative_to(root)).replace("\\", "/"),
            "format": suffix.lstrip("."),
            "sha256": source_hash,
            "immutable": True,
        },
        "speakers": {"target": target, "user": user},
        "runtime": {
            "timezone": timezone_name,
            "locale": "zh-CN",
            "schedule_mode": "observed_context",
            "capabilities": {
                "proactivity": False,
                "care": False,
                "curiosity": False,
                "attachment": False,
                "possessiveness": False,
                "agency": False,
            },
        },
        "paths": {
            "knowledge": "knowledge",
            "corpus": "corpus",
            "package": "package",
            "state": "state.json",
        },
        "knowledge_assembly": {
            "status": "empty_until_user_confirmation",
            "files": [],
        },
    }
    write_json(root / "profile.json", profile)
    corpus_result = build_corpus(skill_root, private_source, safe_id, target, user)
    distillation_result = build_distillation_package_from_messages(
        messages,
        root / "package",
        str(private_source),
        target_speaker=target,
        user_speaker=user,
    )
    return {
        "ok": True,
        "profile_id": safe_id,
        "profile_dir": str(root),
        "source_sha256": source_hash,
        "speakers": {"target": target, "user": user},
        "corpus": corpus_result,
        "distillation": distillation_result,
        "active_for_review": False,
        "runtime_ready": False,
    }


def _candidate_value(item: dict[str, Any]) -> str:
    return str(item.get("confirmed_value") or item.get("proposal") or "").strip()


def _evidence_text(item: dict[str, Any]) -> str:
    evidence = [str(value) for value in item.get("evidence_ids", []) if str(value)]
    return ", ".join(evidence) if evidence else "confirmed statistical basis"


def _render_items(title: str, intro: str, items: list[dict[str, Any]]) -> str:
    lines = [f"# {title}", "", "Status: assembled from the user-confirmed package.", "", intro, ""]
    for item in items:
        value = _candidate_value(item)
        if value:
            lines.append(f"- {value} Evidence: {_evidence_text(item)}")
    if not items:
        lines.append("- No items were confirmed for this layer.")
    return "\n".join(lines).rstrip() + "\n"


def assemble_profile_knowledge(package_dir: Path) -> dict[str, Any]:
    """Rebuild all runtime-facing knowledge from one confirmed package only."""
    package = package_dir.resolve()
    profile_dir = package.parent.resolve()
    manifest_path = profile_dir / "profile.json"
    if package.name != "package" or not manifest_path.exists():
        raise ValueError("Knowledge assembly requires a profile-local package directory.")
    package_manifest_path = package / "package_manifest.json"
    if not package_manifest_path.exists():
        raise ValueError("Confirmed package manifest is missing.")
    package_manifest = json.loads(package_manifest_path.read_text(encoding="utf-8"))
    if package_manifest.get("status") != "confirmed" or int(package_manifest.get("phase", 0)) != 4:
        raise ValueError("Knowledge assembly is blocked until phase four is confirmed.")

    official_names = ("constitution.json", "growth_seed.json", "scenario_map.json", "voice_index.md", "user_profile.md")
    missing = [name for name in official_names if not (package / name).is_file()]
    if missing:
        raise ValueError("Confirmed package is incomplete: " + ", ".join(missing))
    constitution = json.loads((package / "constitution.json").read_text(encoding="utf-8"))
    growth = json.loads((package / "growth_seed.json").read_text(encoding="utf-8"))
    scenarios = json.loads((package / "scenario_map.json").read_text(encoding="utf-8"))
    if any(payload.get("status") != "confirmed" for payload in (constitution, growth, scenarios)):
        raise ValueError("Knowledge assembly accepts confirmed official outputs only.")

    profile = json.loads(manifest_path.read_text(encoding="utf-8"))
    configured_knowledge = str(profile.get("paths", {}).get("knowledge", "knowledge"))
    knowledge = (profile_dir / configured_knowledge).resolve()
    if knowledge.parent != profile_dir:
        raise ValueError("Knowledge path escaped the private profile directory.")
    if knowledge.exists():
        shutil.rmtree(knowledge)
    knowledge.mkdir(parents=True)

    files: dict[str, str] = {
        "persona.md": _render_items(
            "Confirmed Persona Foundation",
            "Only user-confirmed, cross-period persona constraints belong here.",
            list(constitution.get("items", [])),
        ),
        "memory.md": _render_items(
            "Confirmed Memory Foundation",
            "These anchors and dimensions were confirmed after evidence review; raw evidence remains in the corpus.",
            list(growth.get("memory_anchors", [])) + list(growth.get("c4_eight_dimensions", [])),
        ),
        "voice.md": (package / "voice_index.md").read_text(encoding="utf-8"),
        "scenarios.md": _render_items(
            "Confirmed Scenario Map",
            "Each item is a confirmed retrieval direction, not a fixed reply template.",
            list(scenarios.get("scenarios", [])),
        ),
        "user-profile.md": (package / "user_profile.md").read_text(encoding="utf-8"),
        "corrections.md": "# Confirmed Corrections\n\nNo post-import corrections have been confirmed.\n",
        "context-notes.md": "# Runtime Context Notes\n\nNo runtime context has been recorded for this rebuilt profile.\n",
    }
    official_hashes = {name: sha256_file(package / name) for name in official_names}
    source_hash = str(profile.get("source", {}).get("sha256", ""))
    provenance_lines = [
        "# Provenance",
        "",
        "Status: assembled from a phase-four user-confirmed package.",
        "",
        f"- Profile: {profile.get('profile_id', '')}",
        f"- Source SHA-256: {source_hash}",
        f"- Confirmed at: {package_manifest.get('confirmed_at', '')}",
        "- Raw chat evidence remains private in this profile's source and corpus directories.",
        "",
        "## Official Output Hashes",
        "",
    ]
    provenance_lines.extend(f"- {name}: {digest}" for name, digest in official_hashes.items())
    files["provenance.md"] = "\n".join(provenance_lines).rstrip() + "\n"

    for name in KNOWLEDGE_OUTPUTS:
        (knowledge / name).write_text(files[name], encoding="utf-8")
    file_hashes = {name: sha256_file(knowledge / name) for name in KNOWLEDGE_OUTPUTS}
    assembled_at = datetime.now(timezone.utc).isoformat()
    write_json(
        knowledge / "manifest.json",
        {
            "schema_version": 1,
            "status": "assembled_from_confirmed_package",
            "profile_id": profile.get("profile_id", ""),
            "assembled_at": assembled_at,
            "source_sha256": source_hash,
            "official_output_sha256": official_hashes,
            "knowledge_file_sha256": file_hashes,
        },
    )
    state_path = (profile_dir / str(profile.get("paths", {}).get("state", "state.json"))).resolve()
    if state_path.parent != profile_dir:
        raise ValueError("State path escaped the private profile directory.")
    if state_path.exists():
        state_path.unlink()
    snapshots = (profile_dir / "snapshots").resolve()
    if snapshots.parent == profile_dir and snapshots.exists():
        shutil.rmtree(snapshots)

    profile["knowledge_assembly"] = {
        "status": "assembled_from_confirmed_package",
        "assembled_at": assembled_at,
        "manifest": "knowledge/manifest.json",
        "files": list(KNOWLEDGE_OUTPUTS),
    }
    write_json(manifest_path, profile)
    return {
        "ok": True,
        "status": "assembled_from_confirmed_package",
        "knowledge_dir": str(knowledge),
        "files": list(KNOWLEDGE_OUTPUTS),
        "manifest": str(knowledge / "manifest.json"),
    }


def verify_knowledge_assembly(skill_root: Path, profile_id: str = "") -> dict[str, Any]:
    profile = load_profile(skill_root, profile_id)
    paths = profile_paths(skill_root, profile["profile_id"])
    manifest_path = paths["knowledge"] / "manifest.json"
    errors: list[str] = []
    if profile.get("knowledge_assembly", {}).get("status") != "assembled_from_confirmed_package":
        errors.append("profile_not_assembled")
    if not manifest_path.exists():
        errors.append("knowledge_manifest_missing")
        return {"ok": False, "manifest": str(manifest_path), "errors": errors}
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected = manifest.get("knowledge_file_sha256", {})
    for name in KNOWLEDGE_OUTPUTS:
        path = paths["knowledge"] / name
        if not path.is_file():
            errors.append(f"knowledge_file_missing:{name}")
        elif sha256_file(path) != expected.get(name):
            errors.append(f"knowledge_file_changed:{name}")
    return {"ok": not errors, "manifest": str(manifest_path), "errors": errors}


def mark_profile_confirmed(package_dir: Path) -> dict[str, Any] | None:
    package = package_dir.resolve()
    manifest = package.parent / "profile.json"
    if package.name != "package" or not manifest.exists():
        return None
    profile = json.loads(manifest.read_text(encoding="utf-8"))
    profile["status"] = "confirmed"
    profile["confirmed_at"] = datetime.now(timezone.utc).isoformat()
    write_json(manifest, profile)
    assembly = assemble_profile_knowledge(package)
    return {
        "profile_id": profile.get("profile_id", ""),
        "profile_manifest": str(manifest),
        "knowledge_assembly": assembly,
    }
