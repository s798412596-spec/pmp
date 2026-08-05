#!/usr/bin/env python3
"""Profile-isolated runtime, context, appraisal, validation, and maintenance CLI."""

from __future__ import annotations

import argparse
import json
import re
from copy import deepcopy
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from gagale_corpus import build_corpus, label_scenes, retrieve_evidence
from gagale_distillation import build_distillation_package, confirm_distillation_package
from persona_profiles import (
    RESET_CONFIRMATION,
    activate_profile,
    import_profile,
    inspect_source,
    list_profiles,
    load_profile,
    profile_paths,
    reset_profile_runtime,
    sha256_file,
    verify_knowledge_assembly,
    verify_profile_source,
)


SCHEMA_VERSION = 2
ASSISTANT_PHRASES = [
    "作为一个ai",
    "作为ai",
    "我可以帮助你",
    "如果你愿意，我可以",
    "以下是",
    "总结一下",
]
VISIBLE_REASONING_PHRASES = ["根据语料", "根据设定", "系统提示", "我的分析", "推理过程", "证据包"]
MAJOR_DEVELOPMENT_PATTERNS = ["死亡", "怀孕", "结婚", "离婚", "辞职", "搬家", "贷款", "手术", "犯罪", "失踪"]
NEGATIVE_TERMS = ["难受", "崩溃", "生气", "烦", "失望", "害怕", "焦虑", "不舒服", "哭"]
POSITIVE_TERMS = ["开心", "喜欢", "爱", "哈哈", "谢谢", "期待", "太好了"]
QUESTION_TERMS = ["吗", "呢", "怎么", "为什么", "为啥", "多少", "哪", "谁", "?", "？"]
CORRECTION_TERMS = ["不像", "不对", "不是这样", "说错了", "改一下", "纠正"]


def skill_root() -> Path:
    return Path(__file__).resolve().parents[1]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def emit(payload: dict[str, Any], as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(payload, ensure_ascii=False))


def configured_timezone(profile: dict[str, Any]) -> timezone | ZoneInfo:
    name = str(profile.get("runtime", {}).get("timezone", "Asia/Shanghai"))
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        if name == "Asia/Shanghai":
            return timezone(timedelta(hours=8), name=name)
        return timezone.utc


def now_from_arg(value: str | None, tz: timezone | ZoneInfo) -> datetime:
    if not value:
        return datetime.now(tz)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=tz)
    return parsed.astimezone(tz)


def parse_dt(value: str | None, tz: timezone | ZoneInfo) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=tz)
    return parsed.astimezone(tz)


def iso(value: datetime | None) -> str | None:
    return value.isoformat(timespec="minutes") if value else None


def time_band(dt: datetime) -> str:
    hour = dt.hour
    if hour < 6:
        return "late_night"
    if hour < 12:
        return "morning"
    if hour < 18:
        return "daytime"
    if hour < 23:
        return "evening"
    return "night"


def parse_clock(value: str) -> time:
    parts = [int(part) for part in value.split(":")]
    return time(parts[0], parts[1], parts[2] if len(parts) > 2 else 0)


def activity_for(profile: dict[str, Any], dt: datetime) -> tuple[str, str]:
    schedule = profile.get("runtime", {}).get("schedule", [])
    current = dt.time().replace(tzinfo=None)
    for item in schedule if isinstance(schedule, list) else []:
        try:
            start = parse_clock(str(item["start"]))
            end = parse_clock(str(item["end"]))
        except (KeyError, TypeError, ValueError):
            continue
        inside = start <= current < end if start <= end else current >= start or current < end
        if inside:
            return str(item.get("activity", time_band(dt))), str(item.get("next_activity", "unspecified"))
    band = time_band(dt)
    defaults = {
        "late_night": ("late night", "morning"),
        "morning": ("morning", "daytime"),
        "daytime": ("daytime", "evening"),
        "evening": ("evening", "night"),
        "night": ("night", "late night"),
    }
    return defaults[band]


def calendar_label(profile: dict[str, Any], dt: datetime) -> str:
    date_text = dt.date().isoformat()
    month_day = dt.strftime("%m-%d")
    calendar = profile.get("runtime", {}).get("calendar", {})
    if not isinstance(calendar, dict):
        return ""
    return str(calendar.get(date_text) or calendar.get(month_day) or "")


def initial_state(profile: dict[str, Any], dt: datetime) -> dict[str, Any]:
    activity, next_activity = activity_for(profile, dt)
    return {
        "schema_version": SCHEMA_VERSION,
        "profile_id": profile["profile_id"],
        "timezone": profile.get("runtime", {}).get("timezone", "Asia/Shanghai"),
        "date": dt.date().isoformat(),
        "weekday": dt.strftime("%A"),
        "time_band": time_band(dt),
        "calendar_label": calendar_label(profile, dt),
        "current_activity": activity,
        "next_activity": next_activity,
        "daily_visible_message_count": 0,
        "fired_visible_slots": [],
        "last_visible_message_at": None,
        "last_tick_at": iso(dt),
        "last_user_message_at": None,
        "last_user_message_text": "",
        "last_outbound_message_at": None,
        "last_outbound_message_text": "",
        "recent_topics": [],
        "recent_reply_shapes": [],
        "recent_context": [],
        "recent_validation_errors": [],
        "daily_script": None,
        "appraisal": {},
        "drives": {},
        "development_ledger": {"next_id": 1, "candidates": [], "confirmed": []},
        "persona_growth": {"version": 1, "bounded": {}, "history": []},
        "last_memory_sync_at": None,
    }


def migrate_state(state: dict[str, Any], profile: dict[str, Any], dt: datetime) -> dict[str, Any]:
    base = initial_state(profile, dt)
    merged = deepcopy(base)
    merged.update(state)
    merged["schema_version"] = SCHEMA_VERSION
    merged["profile_id"] = profile["profile_id"]
    for key in ("recent_topics", "recent_reply_shapes", "recent_context", "recent_validation_errors", "fired_visible_slots"):
        if not isinstance(merged.get(key), list):
            merged[key] = []
    if not isinstance(merged.get("development_ledger"), dict):
        merged["development_ledger"] = deepcopy(base["development_ledger"])
    if not isinstance(merged.get("persona_growth"), dict):
        merged["persona_growth"] = deepcopy(base["persona_growth"])
    return merged


def load_state(path: Path, profile: dict[str, Any], dt: datetime) -> dict[str, Any]:
    if not path.exists():
        return initial_state(profile, dt)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        payload = initial_state(profile, dt)
        payload["recent_validation_errors"] = ["state_json_decode_failed"]
    return migrate_state(payload, profile, dt)


def reset_day(state: dict[str, Any], profile: dict[str, Any], dt: datetime) -> None:
    if state.get("date") != dt.date().isoformat():
        state["date"] = dt.date().isoformat()
        state["daily_visible_message_count"] = 0
        state["fired_visible_slots"] = []
        state["daily_script"] = None
    activity, next_activity = activity_for(profile, dt)
    state.update(
        {
            "weekday": dt.strftime("%A"),
            "time_band": time_band(dt),
            "calendar_label": calendar_label(profile, dt),
            "current_activity": activity,
            "next_activity": next_activity,
            "last_tick_at": iso(dt),
        }
    )


def runtime_context(args: argparse.Namespace) -> tuple[Path, dict[str, Any], dict[str, Path], timezone | ZoneInfo, datetime]:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    profile = load_profile(root, getattr(args, "profile", "") or "")
    if profile.get("status") != "confirmed":
        raise ValueError("Profile is not confirmed. Finish item-by-item review before runtime use.")
    knowledge_integrity = verify_knowledge_assembly(root, profile["profile_id"])
    if not knowledge_integrity["ok"]:
        raise ValueError("Profile knowledge integrity check failed; runtime use is blocked.")
    paths = profile_paths(root, profile["profile_id"])
    tz = configured_timezone(profile)
    dt = now_from_arg(getattr(args, "now", None), tz)
    return root, profile, paths, tz, dt


def capabilities(profile: dict[str, Any]) -> dict[str, bool]:
    configured = profile.get("runtime", {}).get("capabilities", {})
    keys = ("proactivity", "care", "curiosity", "attachment", "possessiveness", "agency")
    return {key: bool(configured.get(key, False)) for key in keys}


def detect_intent(message: str, trigger: str) -> str:
    if trigger in {"tick", "proactive"} and not message:
        return "proactive"
    if any(term in message for term in CORRECTION_TERMS):
        return "correction"
    if any(term in message for term in NEGATIVE_TERMS):
        return "negative_emotion"
    if any(term in message for term in QUESTION_TERMS):
        return "question"
    if any(term in message for term in POSITIVE_TERMS):
        return "positive_emotion"
    return "continuation"


def drive(score: int, enabled: bool, reasons: list[str]) -> dict[str, Any]:
    bounded = max(0, min(3, score if enabled else 0))
    return {"enabled": enabled, "score": bounded, "reasons": reasons if bounded else []}


def build_appraisal(profile: dict[str, Any], state: dict[str, Any], message: str, trigger: str) -> dict[str, Any]:
    intent = detect_intent(message, trigger)
    caps = capabilities(profile)
    negative = any(term in message for term in NEGATIVE_TERMS)
    question = any(term in message for term in QUESTION_TERMS)
    elapsed = None
    tz = configured_timezone(profile)
    last = parse_dt(state.get("last_user_message_at"), tz)
    now = parse_dt(state.get("last_tick_at"), tz)
    if last and now:
        elapsed = max(0, int((now - last).total_seconds() // 60))
    drives = {
        "care": drive(2 if negative else 0, caps["care"], ["negative_emotion"] if negative else []),
        "curiosity": drive(1 if question or intent == "continuation" else 0, caps["curiosity"], ["question_or_open_context"]),
        "attachment": drive(1 if intent in {"positive_emotion", "negative_emotion"} else 0, caps["attachment"], ["relationship_context"]),
        "possessiveness": drive(1 if elapsed and elapsed >= 180 else 0, caps["possessiveness"], ["long_reply_gap"]),
        "agency": drive(1 if trigger == "proactive" else 0, caps["agency"], ["proactive_turn"]),
    }
    required_move = {
        "correction": "acknowledge_and_apply_user_correction",
        "negative_emotion": "respond_to_the_specific_emotion_without_generic_therapy",
        "question": "answer_or_react_in_the_target_speaker_style",
        "positive_emotion": "respond_in_the_observed_relationship_register",
        "proactive": "use_an_evidence_grounded_self_initiated_fragment",
        "continuation": "continue_the_current_context_naturally",
    }[intent]
    return {
        "intent": intent,
        "required_move": required_move,
        "time_band": state.get("time_band"),
        "activity": state.get("current_activity"),
        "calendar_label": state.get("calendar_label", ""),
        "drives": drives,
    }


def append_context(state: dict[str, Any], direction: str, text: str, dt: datetime) -> None:
    if not text:
        return
    topics = label_scenes(text)
    state.setdefault("recent_topics", []).extend(topics)
    state["recent_topics"] = state["recent_topics"][-20:]
    state.setdefault("recent_context", []).append(
        {"at": iso(dt), "direction": direction, "text": text, "topics": topics}
    )
    state["recent_context"] = state["recent_context"][-20:]


def constraints_for(
    root: Path,
    profile: dict[str, Any],
    state: dict[str, Any],
    message: str,
    trigger: str,
) -> dict[str, Any]:
    appraisal = build_appraisal(profile, state, message, trigger)
    evidence = retrieve_evidence(
        root,
        query=message,
        mode=trigger,
        category=appraisal["intent"],
        top_k=6,
        profile_id=profile["profile_id"],
    )
    state["appraisal"] = appraisal
    state["drives"] = appraisal["drives"]
    return {
        "profile_id": profile["profile_id"],
        "profile_status": profile.get("status", "unknown"),
        "target_speaker": profile.get("speakers", {}).get("target", ""),
        "user_speaker": profile.get("speakers", {}).get("user", ""),
        "appraisal": appraisal,
        "evidence_pack": evidence,
        "context_window": state.get("recent_context", [])[-8:],
        "must_not_invent_persona_facts": True,
        "must_not_promote_simulation_without_confirmation": True,
    }


def profile_files(paths: dict[str, Path]) -> list[str]:
    package_files = [
        paths["package"] / "constitution.json",
        paths["package"] / "growth_seed.json",
        paths["package"] / "scenario_map.json",
        paths["package"] / "voice_index.md",
        paths["package"] / "user_profile.md",
    ]
    knowledge_files = sorted(paths["knowledge"].glob("*.md")) if paths["knowledge"].exists() else []
    return [str(path) for path in package_files + knowledge_files if path.exists()]


def prompt_package(
    root: Path,
    profile: dict[str, Any],
    paths: dict[str, Path],
    state: dict[str, Any],
    constraints: dict[str, Any],
    trigger: str,
    message: str,
) -> dict[str, Any]:
    return {
        "static_layer": {
            "engine": "profile-isolated chat persona runtime",
            "profile_id": profile["profile_id"],
            "display_name": profile.get("display_name", profile["profile_id"]),
            "speakers": profile.get("speakers", {}),
            "core_files": profile_files(paths),
            "framework_files": [
                str(root / "references" / "framework" / "runtime.md"),
                str(root / "references" / "framework" / "context.md"),
                str(root / "references" / "framework" / "validation.md"),
            ],
        },
        "dynamic_layer": {
            "trigger": trigger,
            "user_message": message,
            "state": public_state(state),
            "reply_constraints": constraints,
            "evidence_pack": constraints.get("evidence_pack", {}),
        },
        "generation_contract": {
            "output": "one natural target-speaker message only",
            "must_follow": [
                "confirmed profile package",
                "appraisal.required_move",
                "current context window",
                "retrieved source evidence",
            ],
            "must_not": [
                "assistant explanation",
                "visible reasoning chain",
                "facts unsupported by source or user confirmation",
                "copying one evidence example as a fixed template",
            ],
        },
    }


def reply_shape(reply: str) -> str:
    text = reply.strip()
    if not text:
        return "empty"
    sentences = len([part for part in re.split(r"[。！？!?\n]+", text) if part.strip()])
    if len(text) <= 6:
        length = "micro"
    elif len(text) <= 20:
        length = "short"
    elif len(text) <= 60:
        length = "medium"
    else:
        length = "long"
    return f"{length}:{sentences}:{'question' if any(mark in text for mark in '?？') else 'statement'}"


def validate_reply(
    profile: dict[str, Any],
    state: dict[str, Any],
    reply: str,
    user_message: str,
    evidence: dict[str, Any],
) -> tuple[list[str], list[str], str]:
    errors: list[str] = []
    warnings: list[str] = []
    text = reply.strip()
    if profile.get("status") != "confirmed":
        errors.append("profile_not_confirmed")
    if not text:
        errors.append("empty_reply")
    lowered = text.lower()
    if any(phrase in lowered for phrase in ASSISTANT_PHRASES):
        errors.append("assistant_tone")
    if any(phrase in text for phrase in VISIBLE_REASONING_PHRASES):
        errors.append("visible_internal_reasoning")
    previous = str(state.get("last_outbound_message_text", "")).strip()
    if previous and text == previous:
        errors.append("exact_reply_repetition")
    if any(pattern in text for pattern in MAJOR_DEVELOPMENT_PATTERNS):
        warnings.append("major_development_requires_user_confirmation")
    matches = evidence.get("matches", []) if isinstance(evidence, dict) else []
    source_replies = [str(item.get("target_reply", "")) for item in matches if item.get("target_reply")]
    if text and text in source_replies:
        warnings.append("verbatim_evidence_copy_review")
    observed_lengths = [len(item) for item in source_replies]
    if observed_lengths and len(text) > max(60, max(observed_lengths) * 3):
        warnings.append("length_far_above_retrieved_evidence")
    shape = reply_shape(text)
    if state.get("recent_reply_shapes", [])[-3:].count(shape) >= 2:
        warnings.append("reply_shape_repetition")
    if user_message and len(text) > 20 and user_message.strip() and user_message.strip() in text:
        warnings.append("user_message_restatement")
    return errors, warnings, shape


def public_state(state: dict[str, Any]) -> dict[str, Any]:
    keys = [
        "profile_id",
        "timezone",
        "date",
        "weekday",
        "time_band",
        "calendar_label",
        "current_activity",
        "next_activity",
        "daily_visible_message_count",
        "last_visible_message_at",
        "recent_topics",
        "recent_reply_shapes",
        "recent_context",
        "daily_script",
        "appraisal",
        "drives",
        "development_ledger",
        "persona_growth",
    ]
    return {key: deepcopy(state.get(key)) for key in keys}


def visible_due(profile: dict[str, Any], state: dict[str, Any], dt: datetime) -> tuple[bool, str, str]:
    if not capabilities(profile)["proactivity"]:
        return False, "profile_proactivity_disabled", ""
    configured = profile.get("runtime", {}).get("visible_slots", ["09:00", "12:30", "18:00", "21:00"])
    maximum = int(profile.get("runtime", {}).get("visible_message_max", 4))
    if int(state.get("daily_visible_message_count", 0)) >= maximum:
        return False, "daily_limit_reached", ""
    fired = set(state.get("fired_visible_slots", []))
    due = [slot for slot in configured if slot not in fired and parse_clock(slot) <= dt.time().replace(tzinfo=None)]
    if not due:
        return False, "no_due_slot", ""
    return True, "scheduled_profile_slot", due[0]


def command_tick(args: argparse.Namespace) -> int:
    root, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    reset_day(state, profile, dt)
    visible, reason, slot = visible_due(profile, state, dt)
    if visible:
        state["fired_visible_slots"].append(slot)
        state["daily_visible_message_count"] += 1
        state["last_visible_message_at"] = iso(dt)
    constraints = constraints_for(root, profile, state, "", "tick")
    write_json(state_path, state)
    emit(
        {
            "ok": True,
            "command": "tick",
            "profile_id": profile["profile_id"],
            "visible": visible,
            "reason": reason,
            "state_path": str(state_path),
            "state": public_state(state),
            "reply_constraints": constraints,
        },
        args.json,
    )
    return 0


def command_preflight(args: argparse.Namespace) -> int:
    root, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    reset_day(state, profile, dt)
    message = args.user_message or ""
    append_context(state, "inbound", message, dt)
    if message:
        state["last_user_message_at"] = iso(dt)
        state["last_user_message_text"] = message
    constraints = constraints_for(root, profile, state, message, args.trigger)
    write_json(state_path, state)
    emit(
        {
            "ok": True,
            "command": "preflight",
            "profile_id": profile["profile_id"],
            "state": public_state(state),
            "reply_constraints": constraints,
        },
        args.json,
    )
    return 0


def command_validate(args: argparse.Namespace) -> int:
    root, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    evidence = retrieve_evidence(
        root,
        query=args.user_message or args.reply,
        mode=args.mode,
        top_k=6,
        profile_id=profile["profile_id"],
    )
    errors, warnings, shape = validate_reply(profile, state, args.reply, args.user_message, evidence)
    state["recent_validation_errors"] = errors[-8:]
    state.setdefault("recent_reply_shapes", []).append(shape)
    state["recent_reply_shapes"] = state["recent_reply_shapes"][-12:]
    if args.reply:
        state["last_outbound_message_at"] = iso(dt)
        state["last_outbound_message_text"] = args.reply
        append_context(state, "outbound", args.reply, dt)
    write_json(state_path, state)
    emit(
        {
            "ok": not errors,
            "command": "validate",
            "profile_id": profile["profile_id"],
            "errors": errors,
            "warnings": warnings,
            "reply_shape": shape,
            "evidence_pack": evidence,
            "state": public_state(state),
        },
        args.json,
    )
    return 0 if not errors else 2


def command_orchestrate(args: argparse.Namespace) -> int:
    root, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    reset_day(state, profile, dt)
    message = args.user_message or ""
    trigger = args.trigger or ("user" if message else "tick")
    append_context(state, "inbound", message, dt)
    if message:
        state["last_user_message_at"] = iso(dt)
        state["last_user_message_text"] = message
    constraints = constraints_for(root, profile, state, message, trigger)
    package = prompt_package(root, profile, paths, state, constraints, trigger, message)
    validation = None
    if args.candidate_reply:
        errors, warnings, shape = validate_reply(
            profile,
            state,
            args.candidate_reply,
            message,
            constraints.get("evidence_pack", {}),
        )
        validation = {"ok": not errors, "errors": errors, "warnings": warnings, "reply_shape": shape}
    write_json(state_path, state)
    emit(
        {
            "ok": not validation or validation["ok"],
            "command": "orchestrate",
            "profile_id": profile["profile_id"],
            "prompt_package": package,
            "validation": validation,
            "state_path": str(state_path),
        },
        args.json,
    )
    return 0 if not validation or validation["ok"] else 2


def command_script_import(args: argparse.Namespace) -> int:
    _, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    raw = Path(args.script_file).read_text(encoding="utf-8-sig") if args.script_file else args.script_json
    try:
        script = json.loads(raw)
    except json.JSONDecodeError as exc:
        emit({"ok": False, "command": "script-import", "errors": [f"invalid_json:{exc.msg}"]}, args.json)
        return 2
    if not isinstance(script, dict) or not isinstance(script.get("items", []), list):
        emit({"ok": False, "command": "script-import", "errors": ["script_must_be_an_object_with_items"]}, args.json)
        return 2
    state["daily_script"] = script
    write_json(state_path, state)
    emit({"ok": True, "command": "script-import", "daily_script": script, "state_path": str(state_path)}, args.json)
    return 0


def command_profile_inspect(args: argparse.Namespace) -> int:
    emit({"command": "profile-inspect", **inspect_source(Path(args.source))}, args.json)
    return 0


def command_profile_import(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    result = import_profile(
        root,
        Path(args.source),
        args.profile_id,
        args.display_name,
        args.target_speaker,
        args.user_speaker,
        args.timezone,
    )
    emit({"command": "profile-import", **result}, args.json)
    return 0


def command_profile_list(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    emit({"ok": True, "command": "profile-list", "profiles": list_profiles(root)}, args.json)
    return 0


def command_profile_reset(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    result = reset_profile_runtime(root, args.confirm)
    emit({"command": "profile-reset", **result}, args.json)
    return 0


def command_profile_activate(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    result = activate_profile(root, args.profile_id)
    emit({"command": "profile-activate", **result}, args.json)
    return 0


def command_profile_info(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    profile = load_profile(root, args.profile or "")
    paths = profile_paths(root, profile["profile_id"])
    profile.pop("_root", None)
    emit(
        {
            "ok": True,
            "command": "profile-info",
            "profile": profile,
            "paths": {key: str(value) for key, value in paths.items()},
            "source_integrity": verify_profile_source(root, profile["profile_id"]),
        },
        args.json,
    )
    return 0


def command_corpus_build(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    profile = load_profile(root, args.profile or "")
    paths = profile_paths(root, profile["profile_id"])
    integrity = verify_profile_source(root, profile["profile_id"])
    if not integrity["ok"]:
        raise ValueError("Profile source integrity check failed; corpus rebuild stopped.")
    source = Path(args.source).resolve() if args.source else paths["source"]
    if sha256_file(source).lower() != str(profile.get("source", {}).get("sha256", "")).lower():
        raise ValueError("The supplied source does not match this profile's immutable source hash.")
    speakers = profile.get("speakers", {})
    result = build_corpus(
        root,
        source,
        profile["profile_id"],
        args.target_speaker or str(speakers.get("target", "")),
        args.user_speaker or str(speakers.get("user", "")),
    )
    emit({"command": "corpus-build", **result}, args.json)
    return 0


def command_corpus_distill(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    profile = load_profile(root, args.profile or "")
    paths = profile_paths(root, profile["profile_id"])
    integrity = verify_profile_source(root, profile["profile_id"])
    if not integrity["ok"]:
        raise ValueError("Profile source integrity check failed; distillation stopped.")
    source = Path(args.source).resolve() if args.source else paths["source"]
    if sha256_file(source).lower() != str(profile.get("source", {}).get("sha256", "")).lower():
        raise ValueError("The supplied source does not match this profile's immutable source hash.")
    output = Path(args.output).resolve() if args.output else paths["package"]
    speakers = profile.get("speakers", {})
    result = build_distillation_package(
        root,
        source,
        output,
        args.target_speaker or str(speakers.get("target", "")),
        args.user_speaker or str(speakers.get("user", "")),
        profile["profile_id"],
    )
    emit({"command": "corpus-distill", **result}, args.json)
    return 0


def command_corpus_confirm(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    paths = profile_paths(root, args.profile or "")
    package = Path(args.package_dir).resolve() if args.package_dir else paths["package"]
    result = confirm_distillation_package(package, Path(args.decisions).resolve())
    if result.get("ok") and args.activate:
        profile_id = str((result.get("profile") or {}).get("profile_id", ""))
        if profile_id:
            result["activation"] = activate_profile(root, profile_id)
    emit({"command": "corpus-confirm", **result}, args.json)
    return 0 if result.get("ok") else 2


def command_evidence_retrieve(args: argparse.Namespace) -> int:
    root = Path(args.skill_root).resolve() if args.skill_root else skill_root()
    profile = load_profile(root, args.profile or "")
    result = retrieve_evidence(
        root,
        query=args.query or args.user_message,
        mode=args.mode,
        category=args.category,
        top_k=args.top_k,
        profile_id=profile["profile_id"],
    )
    emit({"ok": True, "command": "evidence-retrieve", "profile_id": profile["profile_id"], **result}, args.json)
    return 0


def command_memory_sync(args: argparse.Namespace) -> int:
    _, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    state["last_memory_sync_at"] = iso(dt)
    memory_path = Path(args.memory).resolve() if args.memory else paths["knowledge"] / "runtime-context.md"
    memory_path.parent.mkdir(parents=True, exist_ok=True)
    marker_start = "<!-- runtime-state:start -->"
    marker_end = "<!-- runtime-state:end -->"
    block = (
        f"{marker_start}\n## Runtime State\n\n"
        f"- Profile: {profile['profile_id']}\n"
        f"- Updated: {state['last_memory_sync_at']}\n"
        f"- Activity: {state.get('current_activity')}\n"
        f"- Recent topics: {json.dumps(state.get('recent_topics', [])[-8:], ensure_ascii=False)}\n"
        f"- Context: {json.dumps(state.get('recent_context', [])[-6:], ensure_ascii=False)}\n"
        f"{marker_end}"
    )
    original = memory_path.read_text(encoding="utf-8") if memory_path.exists() else "# Memory\n"
    if marker_start in original and marker_end in original:
        updated = re.sub(re.escape(marker_start) + r".*?" + re.escape(marker_end), block, original, flags=re.S)
    else:
        updated = original.rstrip() + "\n\n" + block
    memory_path.write_text(updated.rstrip() + "\n", encoding="utf-8")
    write_json(state_path, state)
    emit({"ok": True, "command": "memory-sync", "memory_path": str(memory_path)}, args.json)
    return 0


def command_ledger_propose(args: argparse.Namespace) -> int:
    _, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    ledger = state["development_ledger"]
    entry_id = f"candidate-{int(ledger.get('next_id', 1)):04d}"
    ledger["next_id"] = int(ledger.get("next_id", 1)) + 1
    entry = {
        "id": entry_id,
        "type": args.type,
        "description": args.description,
        "relation_tag": args.relation_tag,
        "status": "pending_user_confirmation",
        "created_at": iso(dt),
        "major_development": any(term in args.description for term in MAJOR_DEVELOPMENT_PATTERNS),
    }
    ledger.setdefault("candidates", []).append(entry)
    write_json(state_path, state)
    emit({"ok": True, "command": "ledger-propose", "entry": entry}, args.json)
    return 0


def command_ledger_confirm(args: argparse.Namespace) -> int:
    _, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    ledger = state["development_ledger"]
    entry = next((item for item in ledger.get("candidates", []) if item.get("id") == args.entry_id), None)
    if not entry:
        emit({"ok": False, "command": "ledger-confirm", "errors": ["candidate_not_found"]}, args.json)
        return 2
    entry["status"] = "confirmed"
    entry["confirmed_at"] = iso(dt)
    ledger["candidates"] = [item for item in ledger.get("candidates", []) if item.get("id") != args.entry_id]
    ledger.setdefault("confirmed", []).append(entry)
    write_json(state_path, state)
    emit({"ok": True, "command": "ledger-confirm", "entry": entry}, args.json)
    return 0


def command_growth_snapshot(args: argparse.Namespace) -> int:
    _, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    output = Path(args.output).resolve() if args.output else paths["root"] / "snapshots" / f"growth-{dt.strftime('%Y%m%d-%H%M%S')}.json"
    write_json(output, {"profile_id": profile["profile_id"], "created_at": iso(dt), "persona_growth": state["persona_growth"]})
    emit({"ok": True, "command": "growth-snapshot", "output": str(output)}, args.json)
    return 0


def command_growth_diff(args: argparse.Namespace) -> int:
    left = json.loads(Path(args.from_file).read_text(encoding="utf-8"))
    right = json.loads(Path(args.to_file).read_text(encoding="utf-8"))
    emit(
        {
            "ok": True,
            "command": "growth-diff",
            "changed": left.get("persona_growth") != right.get("persona_growth"),
            "from": left.get("persona_growth"),
            "to": right.get("persona_growth"),
        },
        args.json,
    )
    return 0


def command_growth_rollback(args: argparse.Namespace) -> int:
    _, profile, paths, _, dt = runtime_context(args)
    state_path = Path(args.state).resolve() if args.state else paths["state"]
    state = load_state(state_path, profile, dt)
    snapshot = json.loads(Path(args.snapshot_file).read_text(encoding="utf-8"))
    if snapshot.get("profile_id") != profile["profile_id"]:
        emit({"ok": False, "command": "growth-rollback", "errors": ["profile_mismatch"]}, args.json)
        return 2
    state["persona_growth"] = snapshot.get("persona_growth", {})
    write_json(state_path, state)
    emit({"ok": True, "command": "growth-rollback", "state_path": str(state_path)}, args.json)
    return 0


def add_common_flags(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument("--json", action="store_true", default=argparse.SUPPRESS, help=argparse.SUPPRESS)
    return parser


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Profile-isolated chat persona runtime")
    parser.add_argument("--skill-root", default="", help="Path to the skill root")
    parser.add_argument("--profile", default="", help="Profile id; defaults to the active profile")
    parser.add_argument("--state", default="", help="Optional state.json override")
    parser.add_argument("--now", default="", help="Optional ISO datetime override")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    sub = parser.add_subparsers(dest="command", required=True)

    inspect_cmd = add_common_flags(sub.add_parser("profile-inspect", help="Inspect speakers before importing a source"))
    inspect_cmd.add_argument("--source", required=True)
    import_cmd = add_common_flags(sub.add_parser("profile-import", help="Create an isolated profile and run phases zero through three"))
    import_cmd.add_argument("--source", required=True)
    import_cmd.add_argument("--profile-id", required=True)
    import_cmd.add_argument("--display-name", default="")
    import_cmd.add_argument("--target-speaker", required=True)
    import_cmd.add_argument("--user-speaker", default="")
    import_cmd.add_argument("--timezone", default="Asia/Shanghai")
    add_common_flags(sub.add_parser("profile-list", help="List private profiles"))
    reset_cmd = add_common_flags(sub.add_parser("profile-reset", help="Delete every private profile and runtime artifact"))
    reset_cmd.add_argument("--confirm", required=True, help=f"Exact phrase required: {RESET_CONFIRMATION}")
    activate_cmd = add_common_flags(sub.add_parser("profile-activate", help="Activate a confirmed profile"))
    activate_cmd.add_argument("--profile-id", required=True)
    add_common_flags(sub.add_parser("profile-info", help="Show the active or selected profile"))

    add_common_flags(sub.add_parser("tick", help="Advance generic time/context and proactive gating"))
    preflight = add_common_flags(sub.add_parser("preflight", help="Build reply constraints for a turn"))
    preflight.add_argument("--user-message", default="")
    preflight.add_argument("--trigger", default="user", choices=["user", "tick", "proactive"])
    validate = add_common_flags(sub.add_parser("validate", help="Validate a target-speaker reply"))
    validate.add_argument("--reply", required=True)
    validate.add_argument("--user-message", default="")
    validate.add_argument("--mode", default="user", choices=["user", "tick", "proactive"])
    orchestrate = add_common_flags(sub.add_parser("orchestrate", help="Build context, evidence, prompt, and optional validation"))
    orchestrate.add_argument("--trigger", default="user", choices=["user", "tick", "proactive"])
    orchestrate.add_argument("--user-message", default="")
    orchestrate.add_argument("--candidate-reply", default="")
    script_import = add_common_flags(sub.add_parser("script-import", help="Import a profile-specific daily script"))
    script_import.add_argument("--script-json", default="")
    script_import.add_argument("--script-file", default="")

    corpus_build = add_common_flags(sub.add_parser("corpus-build", help="Build the active profile retrieval corpus"))
    corpus_build.add_argument("--source", default="")
    corpus_build.add_argument("--target-speaker", default="")
    corpus_build.add_argument("--user-speaker", default="")
    corpus_distill = add_common_flags(sub.add_parser("corpus-distill", help="Run phases zero through three for a profile"))
    corpus_distill.add_argument("--source", default="")
    corpus_distill.add_argument("--output", default="")
    corpus_distill.add_argument("--target-speaker", default="")
    corpus_distill.add_argument("--user-speaker", default="")
    corpus_confirm = add_common_flags(sub.add_parser("corpus-confirm", help="Confirm every candidate and unlock a profile"))
    corpus_confirm.add_argument("--package-dir", default="")
    corpus_confirm.add_argument("--decisions", required=True)
    corpus_confirm.add_argument("--activate", action="store_true")
    evidence = add_common_flags(sub.add_parser("evidence-retrieve", help="Retrieve source evidence from one profile"))
    evidence.add_argument("--query", default="")
    evidence.add_argument("--user-message", default="")
    evidence.add_argument("--mode", default="user", choices=["user", "tick", "proactive"])
    evidence.add_argument("--category", default="")
    evidence.add_argument("--top-k", type=int, default=6)

    ledger_propose = add_common_flags(sub.add_parser("ledger-propose", help="Propose a profile development"))
    ledger_propose.add_argument("--type", default="short_term")
    ledger_propose.add_argument("--description", required=True)
    ledger_propose.add_argument("--relation-tag", default="")
    ledger_confirm = add_common_flags(sub.add_parser("ledger-confirm", help="Confirm a proposed development"))
    ledger_confirm.add_argument("--entry-id", required=True)
    growth_snapshot = add_common_flags(sub.add_parser("growth-snapshot", help="Snapshot bounded profile growth"))
    growth_snapshot.add_argument("--output", default="")
    growth_diff = add_common_flags(sub.add_parser("growth-diff", help="Compare two profile growth snapshots"))
    growth_diff.add_argument("--from-file", required=True)
    growth_diff.add_argument("--to-file", required=True)
    growth_rollback = add_common_flags(sub.add_parser("growth-rollback", help="Restore a profile growth snapshot"))
    growth_rollback.add_argument("--snapshot-file", required=True)
    memory_sync = add_common_flags(sub.add_parser("memory-sync", help="Mirror runtime context into profile memory"))
    memory_sync.add_argument("--memory", default="")
    return parser


COMMANDS = {
    "profile-inspect": command_profile_inspect,
    "profile-import": command_profile_import,
    "profile-list": command_profile_list,
    "profile-reset": command_profile_reset,
    "profile-activate": command_profile_activate,
    "profile-info": command_profile_info,
    "tick": command_tick,
    "preflight": command_preflight,
    "validate": command_validate,
    "orchestrate": command_orchestrate,
    "script-import": command_script_import,
    "corpus-build": command_corpus_build,
    "corpus-distill": command_corpus_distill,
    "corpus-confirm": command_corpus_confirm,
    "evidence-retrieve": command_evidence_retrieve,
    "ledger-propose": command_ledger_propose,
    "ledger-confirm": command_ledger_confirm,
    "growth-snapshot": command_growth_snapshot,
    "growth-diff": command_growth_diff,
    "growth-rollback": command_growth_rollback,
    "memory-sync": command_memory_sync,
}


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return COMMANDS[args.command](args)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        emit({"ok": False, "command": args.command, "errors": [str(exc)]}, getattr(args, "json", False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
