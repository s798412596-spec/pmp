#!/usr/bin/env python3
"""Format-neutral corpus parsing, indexing, and retrieval utilities."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime
from html import escape
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

from persona_profiles import profile_paths

SYSTEM_SPEAKER = "系统消息"
SYSTEM_SPEAKERS = {"系统消息", "system", "系统", "notice", "notification"}
DATE_RE = re.compile(r"^20\d{2}-\d{2}-\d{2}$")
MESSAGE_RE = re.compile(
    r"^\[(?P<speaker>.+?)\]\s+(?P<time>\d{2}:\d{2}:\d{2})(?:\n|\s+)(?P<body>.*)$",
    re.S,
)
INLINE_MESSAGE_RES = (
    re.compile(
        r"^\[?(?P<date>20\d{2}[-/]\d{1,2}[-/]\d{1,2})[ T](?P<time>\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:\[(?P<bracket_speaker>[^\]]+)\]|(?P<speaker>[^:：]+))[:：]\s*(?P<body>.*)$"
    ),
    re.compile(r"^\[(?P<speaker>[^\]]+)\]\s*(?P<time>\d{1,2}:\d{2}(?::\d{2})?)\s*(?P<body>.*)$"),
    re.compile(r"^(?P<speaker>[^:：\n]{1,80})[:：]\s*(?P<body>.+)$"),
)

MEDIA_PREFIXES = (
    "![图片]",
    "![动画表情]",
    "![视频]",
    "[文件|",
    "[小程序|",
    "[链接|",
    "[语音|",
)

SCENE_TERMS: dict[str, list[str]] = {
    "greeting": ["你好", "早", "晚安", "在吗", "hello", "hi"],
    "question": ["吗", "呢", "怎么", "为什么", "为啥", "多少", "哪", "谁", "?", "？"],
    "planning": ["计划", "安排", "准备", "明天", "下周", "到时候", "一起"],
    "work_study": ["工作", "上班", "下班", "公司", "学校", "学习", "作业", "考试", "开会"],
    "food": ["吃", "饭", "饿", "外卖", "喝", "餐厅"],
    "health": ["难受", "不舒服", "头疼", "发烧", "感冒", "医院", "药"],
    "relationship": ["想你", "爱你", "抱", "陪我", "在一起", "分手", "结婚"],
    "media": ["图片", "视频", "截图", "链接", "评论", "刷到"],
    "location": ["出门", "到家", "在哪", "路上", "地铁", "车"],
    "conflict": ["生气", "烦", "别说", "不想聊", "拉黑", "吵架"],
}

TRAIT_TERMS: dict[str, list[str]] = {
    "简短回应": ["嗯", "哦", "好", "行", "知道了", "收到"],
    "主动追问": ["怎么了", "为什么", "为啥", "然后呢", "你呢", "咋回事"],
    "情绪表达": ["哈哈", "笑死", "无语", "烦", "开心", "难受", "生气"],
    "明确边界": ["不要", "别", "不行", "不想", "算了", "到此为止"],
    "支持回应": ["没事", "可以", "加油", "慢慢来", "我听着", "辛苦了"],
    "解释说明": ["因为", "所以", "其实", "我的意思", "我觉得", "情况是"],
}

TOPIC_FROM_SCENE: dict[str, str] = {
    "greeting": "寒暄",
    "question": "问答",
    "planning": "计划安排",
    "work_study": "工作学习",
    "food": "吃饭",
    "health": "健康",
    "relationship": "关系表达",
    "media": "媒体内容",
    "location": "位置行程",
    "conflict": "分歧冲突",
    "general": "日常琐事",
}

EMOTION_POSITIVE = ["哈哈", "爱", "喜欢", "好耶", "开心", "可爱", "笑死", "谢谢"]
EMOTION_NEGATIVE = ["烦", "难受", "哭", "不舒服", "生气", "讨厌", "崩溃", "失望"]
EXCEPTION_TERMS = ["分手", "离婚", "死亡", "绝症", "再也", "永远不", "拉黑", "辞职", "决裂"]


def json_dump_line(item: dict[str, Any]) -> str:
    return json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n"


def read_docx_paragraphs(docx_path: Path) -> list[str]:
    with zipfile.ZipFile(docx_path) as zf:
        xml = zf.read("word/document.xml")
    root = ET.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for p in root.findall(".//w:p", ns):
        parts: list[str] = []
        for node in p.iter():
            tag = node.tag.rsplit("}", 1)[-1]
            if tag == "t" and node.text:
                parts.append(node.text)
            elif tag in {"br", "cr"}:
                parts.append("\n")
            elif tag == "tab":
                parts.append("\t")
        text = "".join(parts).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def classify_message(text: str) -> str:
    if text.startswith(MEDIA_PREFIXES):
        if text.startswith("![动画表情]"):
            return "sticker"
        if text.startswith("![图片]"):
            return "image"
        if text.startswith("[文件|"):
            return "file"
        if text.startswith("[小程序|"):
            return "mini_program"
        return "media"
    if text.startswith("http://") or text.startswith("https://"):
        return "link"
    return "text"


def parse_docx_messages(docx_path: Path) -> list[dict[str, Any]]:
    paragraphs = read_docx_paragraphs(docx_path)
    current_date = ""
    messages: list[dict[str, Any]] = []
    for para in paragraphs:
        if DATE_RE.match(para):
            current_date = para
            continue
        match = MESSAGE_RE.match(para)
        if not match:
            continue
        speaker = match.group("speaker")
        text = match.group("body").strip()
        msg_type = classify_message(text)
        messages.append(
            {
                "id": len(messages) + 1,
                "date": current_date,
                "time": match.group("time"),
                "speaker": speaker,
                "text": text,
                "type": msg_type,
                "datetime": f"{current_date}T{match.group('time')}" if current_date else "",
                "is_system": speaker.strip().lower() in SYSTEM_SPEAKERS,
            }
        )
    return messages


def normalized_datetime(value: Any) -> tuple[str, str, str]:
    if value in (None, ""):
        return "", "", ""
    if isinstance(value, (int, float)):
        dt = datetime.fromtimestamp(float(value))
        return dt.date().isoformat(), dt.strftime("%H:%M:%S"), dt.isoformat(timespec="seconds")
    raw = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        match = re.search(r"(?P<date>20\d{2}[-/]\d{1,2}[-/]\d{1,2})?(?:\s+|T)?(?P<time>\d{1,2}:\d{2}(?::\d{2})?)?", raw)
        if not match:
            return "", "", ""
        date_text = (match.group("date") or "").replace("/", "-")
        time_text = match.group("time") or ""
        if time_text and time_text.count(":") == 1:
            time_text += ":00"
        return date_text, time_text, f"{date_text}T{time_text}" if date_text and time_text else ""
    return dt.date().isoformat(), dt.strftime("%H:%M:%S"), dt.isoformat(timespec="seconds")


def normalize_message_record(row: dict[str, Any], message_id: int) -> dict[str, Any] | None:
    speaker = next(
        (str(row[key]).strip() for key in ("speaker", "sender", "name", "from", "role", "author") if row.get(key) not in (None, "")),
        "",
    )
    text = next(
        (str(row[key]) for key in ("text", "content", "message", "body", "raw_text") if row.get(key) not in (None, "")),
        "",
    )
    if not speaker or text == "":
        return None
    datetime_value = next(
        (row[key] for key in ("datetime", "timestamp", "created_at", "date_time") if row.get(key) not in (None, "")),
        "",
    )
    date_text, time_text, datetime_text = normalized_datetime(datetime_value)
    if not date_text and row.get("date"):
        date_text = str(row["date"]).strip().replace("/", "-")
    if not time_text and row.get("time"):
        time_text = str(row["time"]).strip()
        if time_text.count(":") == 1:
            time_text += ":00"
    if not datetime_text and date_text and time_text:
        datetime_text = f"{date_text}T{time_text}"
    message_type = str(row.get("type") or classify_message(text)).strip().lower()
    is_system = bool(row.get("is_system")) or speaker.lower() in SYSTEM_SPEAKERS or message_type == "system"
    return {
        "id": row.get("id", message_id),
        "date": date_text,
        "time": time_text,
        "speaker": speaker,
        "text": text,
        "type": message_type,
        "datetime": datetime_text,
        "is_system": is_system,
    }


def parse_json_messages(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    if isinstance(payload, dict):
        rows = next((payload[key] for key in ("messages", "data", "chat", "records") if isinstance(payload.get(key), list)), [])
    elif isinstance(payload, list):
        rows = payload
    else:
        rows = []
    messages = [normalize_message_record(row, index) for index, row in enumerate(rows, 1) if isinstance(row, dict)]
    return [message for message in messages if message]


def parse_jsonl_messages(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if line.strip():
            item = json.loads(line)
            if isinstance(item, dict):
                rows.append(item)
    messages = [normalize_message_record(row, index) for index, row in enumerate(rows, 1)]
    return [message for message in messages if message]


def parse_csv_messages(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    messages = [normalize_message_record(row, index) for index, row in enumerate(rows, 1)]
    return [message for message in messages if message]


def parse_text_messages(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8-sig")
    blocks = re.split(r"\n\s*\n", text.replace("\r\n", "\n"))
    messages: list[dict[str, Any]] = []
    current_date = ""
    for block in blocks:
        stripped = block.strip("\n")
        if not stripped:
            continue
        if DATE_RE.fullmatch(stripped.strip()):
            current_date = stripped.strip()
            continue
        match = MESSAGE_RE.match(stripped)
        if match:
            row = {
                "speaker": match.group("speaker"),
                "text": match.group("body"),
                "date": current_date,
                "time": match.group("time"),
            }
            message = normalize_message_record(row, len(messages) + 1)
            if message:
                messages.append(message)
            continue
        for line in stripped.splitlines():
            matched = next((pattern.match(line) for pattern in INLINE_MESSAGE_RES if pattern.match(line)), None)
            if matched:
                values = matched.groupdict()
                speaker = values.get("bracket_speaker") or values.get("speaker") or ""
                row = {
                    "speaker": speaker,
                    "text": values.get("body", ""),
                    "date": (values.get("date") or current_date).replace("/", "-"),
                    "time": values.get("time", ""),
                }
                message = normalize_message_record(row, len(messages) + 1)
                if message:
                    messages.append(message)
            elif messages:
                messages[-1]["text"] += "\n" + line
                messages[-1]["type"] = classify_message(messages[-1]["text"])
    return messages


def load_chat_messages(source_path: Path) -> list[dict[str, Any]]:
    source = source_path.resolve()
    if not source.exists():
        raise FileNotFoundError(f"Source chat record not found: {source}")
    suffix = source.suffix.lower()
    if suffix == ".docx":
        messages = parse_docx_messages(source)
    elif suffix == ".json":
        messages = parse_json_messages(source)
    elif suffix == ".jsonl":
        messages = parse_jsonl_messages(source)
    elif suffix == ".csv":
        messages = parse_csv_messages(source)
    elif suffix in {".txt", ".md"}:
        messages = parse_text_messages(source)
    else:
        raise ValueError(f"Unsupported source format: {suffix or '<none>'}")
    if not messages:
        raise ValueError(f"No chat messages could be parsed from {source}")
    for index, message in enumerate(messages, 1):
        message["id"] = index
        message.setdefault("is_system", str(message.get("speaker", "")).strip().lower() in SYSTEM_SPEAKERS)
    return messages


def parse_messages(source_path: Path) -> list[dict[str, Any]]:
    """Backward-compatible alias for format-neutral source loading."""
    return load_chat_messages(source_path)


def match_speaker(speakers: list[str], requested: str) -> str:
    if not requested:
        return ""
    exact = next((speaker for speaker in speakers if speaker == requested), "")
    if exact:
        return exact
    partial = [speaker for speaker in speakers if requested in speaker]
    if len(partial) == 1:
        return partial[0]
    raise ValueError(f"Speaker {requested!r} was not found uniquely. Available: {speakers}")


def resolve_speakers(
    messages: list[dict[str, Any]],
    target_speaker: str = "",
    user_speaker: str = "",
    require_target: bool = False,
) -> tuple[str, str]:
    counts = Counter(
        str(message.get("speaker", "")).strip()
        for message in messages
        if str(message.get("speaker", "")).strip() and not message.get("is_system")
    )
    speakers = [speaker for speaker, _ in counts.most_common()]
    if len(speakers) < 2:
        raise ValueError("The source corpus must contain at least two non-system speakers.")
    if require_target and not target_speaker:
        raise ValueError(f"target_speaker is required. Available speakers: {speakers}")
    target = match_speaker(speakers, target_speaker) if target_speaker else speakers[1]
    user = match_speaker(speakers, user_speaker) if user_speaker else next(
        (speaker for speaker in speakers if speaker != target), ""
    )
    if not user or user == target:
        raise ValueError(f"A distinct user speaker is required. Available speakers: {speakers}")
    return user, target


def detect_roles(messages: list[dict[str, Any]]) -> tuple[str, str]:
    return resolve_speakers(messages)


def is_text_message(message: dict[str, Any]) -> bool:
    return message.get("type") == "text" and bool(message.get("text", "").strip())


def label_scenes(text: str) -> list[str]:
    labels = [scene for scene, terms in SCENE_TERMS.items() if any(term in text for term in terms)]
    return labels or ["general"]


def label_traits(text: str) -> list[str]:
    traits = [trait for trait, terms in TRAIT_TERMS.items() if any(term in text for term in terms)]
    return traits or ["未分类表达"]


def primary_topic(scenes: list[str]) -> str:
    return TOPIC_FROM_SCENE.get(scenes[0] if scenes else "general", "日常琐事")


def emotion_tone(text: str) -> str:
    has_positive = any(term in text for term in EMOTION_POSITIVE)
    has_negative = any(term in text for term in EMOTION_NEGATIVE)
    if has_positive and has_negative:
        return "复杂"
    if has_positive:
        return "正面"
    if has_negative:
        return "负面"
    return "中性"


def context_sensitivity(scenes: list[str], text: str) -> str:
    if any(scene in scenes for scene in ["relationship", "conflict"]):
        return "仅特定关系"
    if any(scene in scenes for scene in ["health", "work_study", "planning", "location"]):
        return "仅特定场景"
    return "通用"


def frequency_tier(count: int, total: int) -> str:
    if total <= 0:
        return "低频"
    ratio = count / total
    if count >= 500 or ratio >= 0.12:
        return "高频"
    if count >= 80 or ratio >= 0.03:
        return "中频"
    return "低频"


def period_for_date(date_text: str, bounds: tuple[int, int] | None) -> str:
    if not bounds or not date_text:
        return "未知"
    try:
        ordinal = datetime.fromisoformat(date_text).toordinal()
    except ValueError:
        return "未知"
    start, end = bounds
    if end <= start:
        return "稳定期"
    first_cut = start + (end - start) // 3
    second_cut = start + (end - start) * 2 // 3
    if ordinal <= first_cut:
        return "早期"
    if ordinal <= second_cut:
        return "稳定期"
    return "后期"


def compact_media_text(message: dict[str, Any]) -> str:
    if message["type"] == "text":
        return message["text"]
    return f"<{message['type']}>"


def write_clean_chat(messages: list[dict[str, Any]], out_path: Path) -> None:
    lines: list[str] = ["# Clean Chat Corpus", ""]
    current_date = ""
    for message in messages:
        if message["date"] != current_date:
            current_date = message["date"]
            lines.extend(["", f"## {current_date}", ""])
        text = compact_media_text(message).replace("\n", " / ")
        lines.append(f"- {message['time']} [{message['speaker']}] {text}")
    out_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as fh:
        for row in rows:
            fh.write(json_dump_line(row))


def build_turn_pairs(messages: list[dict[str, Any]], user: str, target: str) -> list[dict[str, Any]]:
    pairs: list[dict[str, Any]] = []
    pending_user: list[dict[str, Any]] = []
    context_window: list[dict[str, Any]] = []
    for message in messages:
        if message["speaker"] == user:
            pending_user.append(message)
        elif message["speaker"] == target and pending_user and is_text_message(message):
            user_text = "\n".join(compact_media_text(m) for m in pending_user[-4:])
            context = [
                {
                    "speaker": m["speaker"],
                    "time": m["time"],
                    "text": compact_media_text(m),
                    "type": m["type"],
                }
                for m in context_window[-8:]
            ]
            combined = user_text + "\n" + message["text"]
            pairs.append(
                {
                    "id": len(pairs) + 1,
                    "date": message["date"],
                    "time": message["time"],
                    "user_text": user_text,
                    "target_reply": message["text"],
                    "reply_length": len(message["text"]),
                    "scenes": label_scenes(combined),
                    "context": context,
                    "source_message_id": message["id"],
                }
            )
            pending_user = []
        elif message["speaker"] == target and is_text_message(message):
            pending_user = []
        context_window.append(message)
        context_window = context_window[-12:]
    return pairs


def date_bounds(messages: list[dict[str, Any]]) -> tuple[int, int] | None:
    ordinals: list[int] = []
    for message in messages:
        date_text = message.get("date", "")
        try:
            ordinals.append(datetime.fromisoformat(date_text).toordinal())
        except ValueError:
            continue
    if not ordinals:
        return None
    return min(ordinals), max(ordinals)


def build_annotated_segments(pairs: list[dict[str, Any]], messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    scene_counts = Counter(scene for pair in pairs for scene in pair.get("scenes", []))
    total = max(1, len(pairs))
    bounds = date_bounds(messages)
    segments: list[dict[str, Any]] = []
    for pair in pairs:
        scenes = pair.get("scenes", []) or ["general"]
        topic = primary_topic(scenes)
        raw_text = str(pair.get("target_reply") or "")
        segment = {
            "id": f"segment_{int(pair.get('id', 0)):05d}",
            "source_pair_id": pair.get("id"),
            "source_message_id": pair.get("source_message_id"),
            "date": pair.get("date", ""),
            "time": pair.get("time", ""),
            "raw_text": raw_text,
            "user_text": pair.get("user_text", ""),
            "target_reply": raw_text,
            "reply_length": pair.get("reply_length", 0),
            "scenes": scenes,
            "traits": label_traits(raw_text),
            "topic": topic,
            "frequency_tier": frequency_tier(max(scene_counts.get(scene, 0) for scene in scenes), total),
            "frequency_count": max(scene_counts.get(scene, 0) for scene in scenes),
            "context_sensitivity": context_sensitivity(scenes, raw_text),
            "period": period_for_date(pair.get("date", ""), bounds),
            "emotion_tone": emotion_tone(raw_text),
            "is_exception": any(term in raw_text for term in EXCEPTION_TERMS),
        }
        segments.append(segment)
    return segments


def parse_dt(message: dict[str, Any]) -> datetime | None:
    if not message.get("datetime"):
        return None
    try:
        return datetime.fromisoformat(message["datetime"])
    except ValueError:
        return None


def build_dialogue_threads(messages: list[dict[str, Any]], max_gap_minutes: int = 30) -> list[dict[str, Any]]:
    threads: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []
    previous_dt: datetime | None = None
    for message in messages:
        dt = parse_dt(message)
        gap_break = previous_dt and dt and (dt - previous_dt).total_seconds() > max_gap_minutes * 60
        date_break = current and message["date"] != current[-1]["date"]
        if current and (gap_break or date_break):
            threads.append(thread_record(current))
            current = []
        current.append(message)
        if dt:
            previous_dt = dt
    if current:
        threads.append(thread_record(current))
    return threads


def thread_record(messages: list[dict[str, Any]]) -> dict[str, Any]:
    text = "\n".join(f"{m['speaker']}: {compact_media_text(m)}" for m in messages if m["type"] == "text")
    return {
        "id": len(messages) and messages[0]["id"],
        "date": messages[0]["date"],
        "start_time": messages[0]["time"],
        "end_time": messages[-1]["time"],
        "message_count": len(messages),
        "scenes": label_scenes(text),
        "messages": [
            {
                "speaker": m["speaker"],
                "time": m["time"],
                "text": compact_media_text(m),
                "type": m["type"],
            }
            for m in messages[:80]
        ],
    }


def char_ngrams(text: str, min_n: int = 2, max_n: int = 3) -> set[str]:
    compact = re.sub(r"\s+", "", text)
    if not compact:
        return set()
    grams: set[str] = set()
    for n in range(min_n, max_n + 1):
        for idx in range(0, max(0, len(compact) - n + 1)):
            grams.add(compact[idx : idx + n])
    for term_list in SCENE_TERMS.values():
        for term in term_list:
            if term in compact:
                grams.add(term)
    return grams


def load_jsonl(path: Path, limit: int | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not path.exists():
        return rows
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                rows.append(json.loads(line))
                if limit and len(rows) >= limit:
                    break
    return rows


def score_pair(pair: dict[str, Any], query: str, scenes: list[str]) -> float:
    query_grams = char_ngrams(query)
    context_text = "\n".join(
        str(item.get("raw_text") or item.get("text") or "")
        for item in pair.get("context", [])
        if isinstance(item, dict)
    )
    haystack = "\n".join(
        part
        for part in [
            str(pair.get("user_text", "")),
            context_text,
            str(pair.get("target_reply") or pair.get("raw_text") or ""),
        ]
        if part
    )
    pair_grams = char_ngrams(haystack)
    if not query_grams:
        overlap = 0.0
    else:
        overlap = len(query_grams & pair_grams) / math.sqrt(max(1, len(query_grams)) * max(1, len(pair_grams)))
    scene_bonus = 0.25 * len(set(scenes) & set(pair.get("scenes", [])))
    length_bonus = 0.05 if 1 <= int(pair.get("reply_length", 0)) <= 18 else 0.0
    annotation_bonus = 0.0
    traits = pair.get("traits", [])
    if any(trait and trait in query for trait in traits):
        annotation_bonus += 0.12
    topic = pair.get("topic", "")
    if topic and topic in query:
        annotation_bonus += 0.1
    if pair.get("frequency_tier") == "高频":
        annotation_bonus += 0.04
    elif pair.get("frequency_tier") == "低频":
        annotation_bonus -= 0.02
    if pair.get("is_exception"):
        annotation_bonus -= 0.08
    return overlap + scene_bonus + length_bonus + annotation_bonus


def corpus_dir(skill_root: Path, profile_id: str = "") -> Path:
    return profile_paths(skill_root, profile_id)["corpus"]


def confirmed_package_dir(skill_root: Path, profile_id: str = "") -> Path | None:
    package = profile_paths(skill_root, profile_id)["package"]
    manifest_path = package / "package_manifest.json"
    if not manifest_path.exists():
        return None
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    required = [
        package / "corpus" / "annotated_segments.jsonl",
        package / "stats.json",
        package / "constitution.json",
        package / "growth_seed.json",
        package / "scenario_map.json",
        package / "voice_index.md",
        package / "user_profile.md",
    ]
    if manifest.get("phase") != 4 or manifest.get("status") != "confirmed":
        return None
    return package if all(path.exists() for path in required) else None


def evidence_source(skill_root: Path, profile_id: str = "") -> tuple[Path, Path, str]:
    package = confirmed_package_dir(skill_root, profile_id)
    if package:
        return package / "corpus", package / "stats.json", "confirmed_standard_package"
    corpus = corpus_dir(skill_root, profile_id)
    return corpus, corpus / "index_stats.json", "profile_runtime_corpus"


def corpus_ready(skill_root: Path, profile_id: str = "") -> bool:
    root, stats_path, source_kind = evidence_source(skill_root, profile_id)
    if source_kind == "confirmed_standard_package":
        return (root / "annotated_segments.jsonl").exists() and stats_path.exists()
    return (root / "clean_chat.jsonl").exists() and (root / "turn_pairs.jsonl").exists()


def retrieve_evidence(
    skill_root: Path,
    query: str = "",
    mode: str = "user",
    category: str = "",
    top_k: int = 6,
    profile_id: str = "",
) -> dict[str, Any]:
    root, stats_path, source_kind = evidence_source(skill_root, profile_id)
    if not corpus_ready(skill_root, profile_id):
        return {
            "available": False,
            "reason": "corpus_not_built",
            "query": query,
            "mode": mode,
            "category": category,
            "matches": [],
            "style_hints": [],
        }
    query_text = " ".join(part for part in [query, category] if part)
    scenes = label_scenes(query_text)
    annotated_path = root / "annotated_segments.jsonl"
    pairs = load_jsonl(annotated_path) if annotated_path.exists() else load_jsonl(root / "turn_pairs.jsonl")
    scored = [(score_pair(pair, query_text, scenes), pair) for pair in pairs]
    scored.sort(key=lambda item: item[0], reverse=True)
    matches = []
    for score, pair in scored[:top_k]:
        if score <= 0 and query_text:
            continue
        context_items = pair.get("context", [])
        context_text = "\n".join(
            str(item.get("raw_text") or item.get("text") or "")
            for item in context_items[-4:]
            if isinstance(item, dict)
        )
        reply_text = str(pair.get("target_reply") or pair.get("raw_text") or "")
        matches.append(
            {
                "score": round(score, 4),
                "date": pair.get("date", ""),
                "time": pair.get("time", ""),
                "scenes": pair.get("scenes", []),
                "traits": pair.get("traits", []),
                "topic": pair.get("topic", ""),
                "frequency_tier": pair.get("frequency_tier", ""),
                "frequency_count": pair.get("frequency_count", 0),
                "context_sensitivity": pair.get("context_sensitivity", ""),
                "period": pair.get("period", ""),
                "emotion_tone": pair.get("emotion_tone", ""),
                "is_exception": bool(pair.get("is_exception", False)),
                "user_text": str(pair.get("user_text") or context_text)[:120],
                "target_reply": reply_text[:160],
                "reply_length": int(pair.get("reply_length") or len(reply_text)),
                "source_corpus_id": pair.get("id", ""),
            }
        )
    stats = json.loads(stats_path.read_text(encoding="utf-8"))
    standard_counts = stats.get("counts", {})
    source_info = stats.get("source", {})
    return {
        "available": True,
        "query": query,
        "mode": mode,
        "category": category,
        "scenes": scenes,
        "matches": matches,
        "style_hints": stats.get("style_hints", []),
        "corpus": {
            "source_kind": source_kind,
            "message_count": stats.get("message_count", standard_counts.get("cleaned_message_count", 0)),
            "target_text_count": stats.get("target_text_count", standard_counts.get("target_text_count", 0)),
            "turn_pair_count": stats.get("turn_pair_count", 0),
            "annotated_segment_count": stats.get(
                "annotated_segment_count", standard_counts.get("annotated_segment_count", 0)
            ),
            "source": stats.get("source", source_info.get("label", "")),
        },
        "annotation_schema": {
            "traits": "性格侧面",
            "topic": "话题类别",
            "frequency_tier": "真实频率分档",
            "context_sensitivity": "语境敏感度",
            "period": "时间位置",
            "emotion_tone": "情绪基调",
            "is_exception": "是否例外",
        },
    }


def corpus_stats(messages: list[dict[str, Any]], pairs: list[dict[str, Any]], target: str, source_path: Path, annotated_segments: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    target_texts = [m["text"] for m in messages if m["speaker"] == target and is_text_message(m)]
    lengths = [len(text) for text in target_texts] or [0]
    short_counter = Counter(text for text in target_texts if len(text) <= 8)
    scene_counts = Counter(scene for pair in pairs for scene in pair.get("scenes", []))
    annotated_segments = annotated_segments or []
    topic_counts = Counter(segment.get("topic", "") for segment in annotated_segments)
    trait_counts = Counter(trait for segment in annotated_segments for trait in segment.get("traits", []))
    return {
        "source": str(source_path),
        "source_format": source_path.suffix.lower().lstrip("."),
        "message_count": len(messages),
        "target_speaker": target,
        "target_text_count": len(target_texts),
        "turn_pair_count": len(pairs),
        "annotated_segment_count": len(annotated_segments),
        "length": {
            "avg": round(sum(lengths) / max(1, len(lengths)), 2),
            "median": sorted(lengths)[len(lengths) // 2],
            "short_le_4": sum(1 for n in lengths if n <= 4),
            "short_le_10": sum(1 for n in lengths if n <= 10),
            "long_ge_40": sum(1 for n in lengths if n >= 40),
        },
        "top_short_replies": short_counter.most_common(40),
        "scene_counts": scene_counts.most_common(),
        "topic_counts": topic_counts.most_common(),
        "trait_counts": trait_counts.most_common(),
        "style_hints": [
            "Treat source records as evidence; do not turn one example into a fixed template.",
            f"Observed median target-message length: {sorted(lengths)[len(lengths) // 2]} characters.",
            f"Observed messages of 10 characters or fewer: {sum(1 for n in lengths if n <= 10)}.",
            "Use confirmed profile files for behavioral claims; heuristic labels are retrieval aids only.",
        ],
    }


def sample_pairs_by_scene(pairs: list[dict[str, Any]], max_per_scene: int = 8) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for pair in pairs:
        for scene in pair.get("scenes", ["general"]):
            if len(grouped[scene]) < max_per_scene and pair.get("target_reply"):
                grouped[scene].append(pair)
    return dict(grouped)


def write_distilled_markdown(out_dir: Path, stats: dict[str, Any], pairs: list[dict[str, Any]]) -> None:
    distilled = out_dir / "distilled"
    distilled.mkdir(parents=True, exist_ok=True)
    grouped = sample_pairs_by_scene(pairs)
    lines = [
        "# Exemplars: 原始聊天记录检索示例",
        "",
        "来源：当前私有角色包的 `corpus/clean_chat.jsonl`。",
        "用途：提供场景证据和语言基线；不是固定模板，不能逐句照抄。",
        "",
        "## 统计基线",
        "",
        f"- 消息总数：{stats['message_count']}",
        f"- 目标人物文本消息：{stats['target_text_count']}",
        f"- 对话回复对：{stats['turn_pair_count']}",
        f"- 标注片段：{stats.get('annotated_segment_count', 0)}",
        f"- 回复长度均值/中位数：{stats['length']['avg']} / {stats['length']['median']}",
        f"- 4 字以内短句：{stats['length']['short_le_4']}",
        f"- 10 字以内短句：{stats['length']['short_le_10']}",
        "",
        "## 高频短句",
        "",
    ]
    for text, count in stats["top_short_replies"][:30]:
        lines.append(f"- `{text}`：{count}")
    if stats.get("topic_counts"):
        lines.extend(["", "## 标注话题分布", ""])
        for topic, count in stats["topic_counts"][:20]:
            if topic:
                lines.append(f"- `{topic}`：{count}")
    if stats.get("trait_counts"):
        lines.extend(["", "## 人格侧面分布", ""])
        for trait, count in stats["trait_counts"][:20]:
            if trait:
                lines.append(f"- `{trait}`：{count}")
    for scene, scene_pairs in grouped.items():
        lines.extend(["", f"## 场景：{scene}", ""])
        for pair in scene_pairs[:8]:
            user = pair["user_text"].replace("\n", " / ")
            reply = str(pair.get("target_reply") or "").replace("\n", " / ")
            lines.append(f"- 用户：{user}")
            lines.append(f"  目标人物：{reply}")
    (distilled / "exemplars.generated.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")

    voice_lines = [
        "# Voice Evidence: 原始记录语言统计",
        "",
        "这份文件由当前角色包自动生成，只作为检索证据层。",
        "",
        "## 关键结论",
        "",
        "- 长短、节奏和用词必须回到当前角色的真实记录，不采用产品内置人设。",
        "- 高频表达是检索线索，不是每轮必须复用的模板。",
        "",
        "## 高频短句证据",
        "",
    ]
    for text, count in stats["top_short_replies"][:40]:
        voice_lines.append(f"- `{text}`：{count}")
    (distilled / "voice.generated.md").write_text("\n".join(voice_lines).rstrip() + "\n", encoding="utf-8")

    source_lines = [
        "# Corpus Index",
        "",
        "- 完整清洗语料位于本地私有 `.runtime/profiles/<id>/corpus/`，不应提交到 GitHub。",
        "- 每轮回复应优先调用 `gagale_runtime.py evidence-retrieve` 或读取 `reply_constraints.evidence_pack`。",
        "- 模拟生成内容不能反向写入这个语料库。",
    ]
    (distilled / "README.md").write_text("\n".join(source_lines).rstrip() + "\n", encoding="utf-8")


def build_corpus(
    skill_root: Path,
    source_path: Path,
    profile_id: str = "",
    target_speaker: str = "",
    user_speaker: str = "",
) -> dict[str, Any]:
    out_dir = corpus_dir(skill_root, profile_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    messages = load_chat_messages(source_path)
    user, target = resolve_speakers(messages, target_speaker, user_speaker)
    text_messages = [
        {**m, "scenes": label_scenes(m["text"])}
        for m in messages
        if m["speaker"] == target and is_text_message(m)
    ]
    pairs = build_turn_pairs(messages, user, target)
    threads = build_dialogue_threads(messages)
    annotated_segments = build_annotated_segments(pairs, messages)
    stats = corpus_stats(messages, pairs, target, source_path, annotated_segments)

    write_clean_chat(messages, out_dir / "clean_chat.md")
    write_jsonl(out_dir / "clean_chat.jsonl", messages)
    write_jsonl(out_dir / "target_messages.jsonl", text_messages)
    write_jsonl(out_dir / "turn_pairs.jsonl", pairs)
    write_jsonl(out_dir / "dialogue_threads.jsonl", threads)
    write_jsonl(out_dir / "annotated_segments.jsonl", annotated_segments)
    (out_dir / "index_stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_distilled_markdown(out_dir, stats, pairs)

    return {
        "ok": True,
        "corpus_dir": str(out_dir),
        "user_speaker": user,
        "target_speaker": target,
        "stats": stats,
        "outputs": [
            "clean_chat.md",
            "clean_chat.jsonl",
            "target_messages.jsonl",
            "turn_pairs.jsonl",
            "dialogue_threads.jsonl",
            "annotated_segments.jsonl",
            "index_stats.json",
            "distilled/exemplars.generated.md",
            "distilled/voice.generated.md",
        ],
    }


def emit(payload: dict[str, Any], as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(payload)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build and query a profile-isolated chat corpus")
    parser.add_argument("--skill-root", default="", help="Path to the skill root")
    parser.add_argument("--profile", default="", help="Profile id; defaults to the active profile")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    sub = parser.add_subparsers(dest="command", required=True)

    build = sub.add_parser("build", help="Clean a supported chat export and build a local corpus")
    build.add_argument("--source", required=True, help="DOCX, TXT, MD, JSON, JSONL, or CSV chat export")
    build.add_argument("--target-speaker", default="", help="Exact name or unique substring for the simulated speaker")
    build.add_argument("--user-speaker", default="", help="Exact name or unique substring for the counterpart")

    retrieve = sub.add_parser("retrieve", help="Retrieve evidence from local corpus")
    retrieve.add_argument("--query", default="", help="Latest user message or proactive query")
    retrieve.add_argument("--mode", default="user", choices=["user", "tick", "proactive"], help="Turn mode")
    retrieve.add_argument("--category", default="", help="Runtime selected category")
    retrieve.add_argument("--top-k", type=int, default=6)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    skill_root = Path(args.skill_root).resolve() if args.skill_root else Path(__file__).resolve().parents[1]
    if args.command == "build":
        payload = build_corpus(
            skill_root,
            Path(args.source).resolve(),
            args.profile,
            args.target_speaker,
            args.user_speaker,
        )
        emit(payload, args.json)
        return 0
    if args.command == "retrieve":
        payload = retrieve_evidence(skill_root, args.query, args.mode, args.category, args.top_k, args.profile)
        emit(payload, args.json)
        return 0
    parser.error(f"unknown command {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
