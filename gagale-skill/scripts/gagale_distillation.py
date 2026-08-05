#!/usr/bin/env python3
"""Auditable five-stage distillation for any supported chat corpus.

Stages zero through two are deterministic. Stage three emits review candidates
only. Official persona files are written only after a complete, item-by-item
user decision file is supplied to stage four.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import statistics
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from gagale_corpus import (
    EXCEPTION_TERMS,
    SYSTEM_SPEAKER,
    context_sensitivity,
    date_bounds,
    emotion_tone,
    frequency_tier,
    label_scenes,
    label_traits,
    load_chat_messages,
    period_for_date,
    primary_topic,
    resolve_speakers,
    write_jsonl,
)
from persona_profiles import mark_profile_confirmed, profile_paths


OFFICIAL_OUTPUTS = (
    "constitution.json",
    "growth_seed.json",
    "scenario_map.json",
    "voice_index.md",
    "user_profile.md",
)
PUNCTUATION = "，。！？!?、,.…~～：:；;"
SYSTEM_TEXT_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("read_receipt", re.compile(r"^(?:对方)?(?:已读|未读)$")),
    ("recall_notice", re.compile(r"^(?:你|对方|.+?)?撤回了一条消息$")),
    (
        "red_packet_notice",
        re.compile(r"^(?:你|对方|.+?)?(?:领取了你的红包|红包已被领完|红包已退回)$"),
    ),
    (
        "transfer_notice",
        re.compile(r"^(?:你|对方|.+?)?(?:已收款|确认收款|转账已收款|转账已退还|已退还转账)$"),
    ),
    (
        "system_prompt",
        re.compile(r"^(?:以下为新消息|你们已经是好友了，现在开始聊天吧|消息已发出，但被对方拒收了)$"),
    ),
)
DECISION_MAP = {
    "adopt": "adopt",
    "accept": "adopt",
    "采纳": "adopt",
    "通过": "adopt",
    "modify": "modify",
    "修改": "modify",
    "reject": "reject",
    "否决": "reject",
    "拒绝": "reject",
}


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def source_fingerprint(messages: list[dict[str, Any]]) -> str:
    evidence = [
        {
            "id": message.get("id"),
            "date": message.get("date", ""),
            "time": message.get("time", ""),
            "speaker": message.get("speaker", ""),
            "text": message.get("text", ""),
            "type": message.get("type", ""),
        }
        for message in messages
    ]
    return sha256_text(json.dumps(evidence, ensure_ascii=False, separators=(",", ":")))


def detect_roles_with_hint(
    messages: list[dict[str, Any]],
    target_speaker: str = "",
    user_speaker: str = "",
) -> tuple[str, str]:
    return resolve_speakers(messages, target_speaker, user_speaker, require_target=not bool(target_speaker))


def system_noise_reason(message: dict[str, Any]) -> str:
    text = str(message.get("text", "")).strip()
    if message.get("is_system") or message.get("speaker") == SYSTEM_SPEAKER:
        return "system_speaker"
    if not text:
        return "empty_system_artifact"
    if message.get("type") == "link" and re.fullmatch(r"https?://\S+", text):
        return "bare_forward_link"
    if text.startswith("[链接|") and text.endswith("]"):
        return "bare_forward_link"
    for reason, pattern in SYSTEM_TEXT_PATTERNS:
        if pattern.fullmatch(text):
            return reason
    return ""


def normalize_duplicate_key(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text).strip().lower()
    normalized = re.sub(r"\s+", "", normalized)
    normalized = re.sub(rf"[{re.escape(PUNCTUATION)}\-—_`'\"“”‘’（）()\[\]{{}}<>《》]+", "", normalized)
    normalized = re.sub(r"(.)\1{2,}", r"\1\1", normalized)
    return normalized


def expression_category(text: str) -> str:
    compact = normalize_duplicate_key(text)
    if any(term in compact for term in ["早安", "早上好", "起了", "醒了"]):
        return "早安类问候"
    if any(term in compact for term in ["晚安", "吻安", "睡了", "睡觉"]):
        return "睡前类问候"
    if any(term in compact for term in ["到了", "到家", "到公司", "下班"]):
        return "到达/报备"
    if any(term in compact for term in ["饿了", "吃饭", "吃啥"]):
        return "饮食寒暄"
    if re.fullmatch(r"哈+", compact):
        return "笑声语气词"
    if compact in {"嗯", "嗯嗯", "哦", "好", "行", "对", "确实", "彳亍"}:
        return "确认语气词"
    return "重复表达"


def build_duplicate_groups(
    messages: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[int, tuple[str, int]]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for message in messages:
        if message.get("type") != "text":
            continue
        text = str(message.get("text", ""))
        key = normalize_duplicate_key(text)
        if not key or len(key) > 24:
            continue
        grouped[(str(message.get("speaker", "")), key)].append(message)

    duplicate_groups: list[dict[str, Any]] = []
    lookup: dict[int, tuple[str, int]] = {}
    ordered = sorted(
        (items for items in grouped.values() if len(items) > 1),
        key=lambda items: int(items[0].get("id", 0)),
    )
    for index, items in enumerate(ordered, start=1):
        group_id = f"duplicate_{index:05d}"
        variants = Counter(str(item.get("text", "")) for item in items)
        group = {
            "id": group_id,
            "speaker": items[0].get("speaker", ""),
            "representative_text": items[0].get("text", ""),
            "category": expression_category(str(items[0].get("text", ""))),
            "occurrence_count": len(items),
            "variants": [
                {"raw_text": text, "count": count}
                for text, count in variants.most_common()
            ],
            "source_message_ids": [item.get("id") for item in items],
        }
        duplicate_groups.append(group)
        for item in items:
            lookup[int(item.get("id", 0))] = (group_id, len(items))
    return duplicate_groups, lookup


def clean_messages(
    messages: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    cleaned: list[dict[str, Any]] = []
    removed: list[dict[str, Any]] = []
    for message in messages:
        reason = system_noise_reason(message)
        if reason:
            removed.append(
                {
                    "source_message_id": message.get("id"),
                    "date": message.get("date", ""),
                    "time": message.get("time", ""),
                    "speaker": message.get("speaker", ""),
                    "reason": reason,
                }
            )
            continue
        cleaned.append(dict(message))

    duplicate_groups, duplicate_lookup = build_duplicate_groups(cleaned)
    for sequence, message in enumerate(cleaned, start=1):
        group_id, occurrence_count = duplicate_lookup.get(int(message.get("id", 0)), ("", 1))
        message["clean_sequence"] = sequence
        message["raw_text"] = message.get("text", "")
        message["raw_text_sha256"] = sha256_text(str(message.get("text", "")))
        message["duplicate_group_id"] = group_id
        message["occurrence_count"] = occurrence_count
    return cleaned, removed, duplicate_groups


def build_annotations(
    messages: list[dict[str, Any]],
    target: str,
) -> list[dict[str, Any]]:
    bounds = date_bounds(messages)
    drafts: list[dict[str, Any]] = []
    context_window: list[dict[str, Any]] = []
    for message in messages:
        if message.get("speaker") != target:
            context_window.append(message)
            context_window = context_window[-8:]
            continue
        raw_text = str(message.get("text", ""))
        if not raw_text:
            continue
        context = [
            {
                "source_message_id": item.get("id"),
                "speaker": item.get("speaker", ""),
                "date": item.get("date", ""),
                "time": item.get("time", ""),
                "raw_text": item.get("text", ""),
                "type": item.get("type", ""),
            }
            for item in context_window[-6:]
        ]
        probe = "\n".join([*(str(item.get("text", "")) for item in context_window[-4:]), raw_text])
        scenes = label_scenes(probe)
        is_text = message.get("type") == "text"
        drafts.append(
            {
                "id": f"corpus_{len(drafts) + 1:06d}",
                "source_message_id": message.get("id"),
                "raw_text": raw_text,
                "raw_text_sha256": sha256_text(raw_text),
                "speaker": target,
                "date": message.get("date", ""),
                "time": message.get("time", ""),
                "content_type": message.get("type", ""),
                "traits": label_traits(raw_text) if is_text else ["非文本表达"],
                "topic": primary_topic(scenes),
                "scenes": scenes,
                "frequency_tier": "",
                "frequency_count": 0,
                "expression_count": int(message.get("occurrence_count", 1)),
                "duplicate_group_id": message.get("duplicate_group_id", ""),
                "context_sensitivity": context_sensitivity(scenes, probe),
                "period": period_for_date(str(message.get("date", "")), bounds),
                "emotion_tone": emotion_tone(raw_text) if is_text else "中性",
                "is_exception": any(term in raw_text for term in EXCEPTION_TERMS),
                "context": context,
            }
        )
        context_window.append(message)
        context_window = context_window[-8:]

    topic_counts = Counter(item["topic"] for item in drafts)
    total = len(drafts)
    for item in drafts:
        count = topic_counts[item["topic"]]
        item["frequency_count"] = count
        item["frequency_tier"] = frequency_tier(count, total)
    return drafts


def ratio_rows(counter: Counter[str], total: int) -> list[dict[str, Any]]:
    return [
        {
            "label": label,
            "count": count,
            "ratio": round(count / max(1, total), 6),
            "frequency_tier": frequency_tier(count, total),
        }
        for label, count in counter.most_common()
        if label
    ]


def common_ngrams(texts: list[str], limit: int = 40) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    for text in texts:
        compact = re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]+", "", text.lower())
        for size in (2, 3):
            counts.update(compact[index : index + size] for index in range(max(0, len(compact) - size + 1)))
    return [{"text": text, "count": count} for text, count in counts.most_common(limit) if count > 1]


def build_stats(
    messages: list[dict[str, Any]],
    annotations: list[dict[str, Any]],
    duplicate_groups: list[dict[str, Any]],
    user: str,
    target: str,
    source_label: str,
    source_sha256: str,
) -> dict[str, Any]:
    target_texts = [
        str(message.get("raw_text", ""))
        for message in messages
        if message.get("speaker") == target and message.get("type") == "text"
    ]
    lengths = [len(text) for text in target_texts]
    topic_counts = Counter(item["topic"] for item in annotations)
    trait_counts = Counter(trait for item in annotations for trait in item.get("traits", []))
    period_counts = Counter(item["period"] for item in annotations)
    frequency_counts = Counter(item["frequency_tier"] for item in annotations)
    emotion_counts = Counter(item["emotion_tone"] for item in annotations)
    context_counts = Counter(item["context_sensitivity"] for item in annotations)
    punctuation_counts = {mark: sum(text.count(mark) for text in target_texts) for mark in PUNCTUATION}
    short_counter = Counter(text for text in target_texts if len(text) <= 12)
    dates = sorted(message.get("date", "") for message in messages if message.get("date"))
    return {
        "schema_version": 1,
        "rules_version": "chat-persona-distillation-v2",
        "source": {
            "label": source_label,
            "sha256": source_sha256,
            "date_start": dates[0] if dates else "",
            "date_end": dates[-1] if dates else "",
            "user_speaker": user,
            "target_speaker": target,
        },
        "counts": {
            "cleaned_message_count": len(messages),
            "annotated_segment_count": len(annotations),
            "target_text_count": len(target_texts),
            "duplicate_group_count": len(duplicate_groups),
            "exception_count": sum(1 for item in annotations if item.get("is_exception")),
        },
        "topic_distribution": ratio_rows(topic_counts, len(annotations)),
        "trait_distribution": ratio_rows(trait_counts, len(annotations)),
        "period_distribution": ratio_rows(period_counts, len(annotations)),
        "frequency_tier_distribution": ratio_rows(frequency_counts, len(annotations)),
        "emotion_distribution": ratio_rows(emotion_counts, len(annotations)),
        "context_distribution": ratio_rows(context_counts, len(annotations)),
        "language_features": {
            "average_length": round(sum(lengths) / max(1, len(lengths)), 4),
            "median_length": statistics.median(lengths) if lengths else 0,
            "short_le_4_count": sum(length <= 4 for length in lengths),
            "short_le_10_count": sum(length <= 10 for length in lengths),
            "long_ge_40_count": sum(length >= 40 for length in lengths),
            "punctuation_counts": punctuation_counts,
            "common_short_expressions": [
                {"raw_text": text, "count": count} for text, count in short_counter.most_common(40)
            ],
            "common_char_ngrams": common_ngrams(target_texts),
        },
        "reproducibility": {
            "topic_counts_source": "corpus/annotated_segments.jsonl.topic",
            "period_counts_source": "corpus/annotated_segments.jsonl.period",
            "language_counts_source": "corpus/cleaned_messages.jsonl target text records",
            "raw_text_integrity": "SHA-256 of every raw_text is stored beside the record",
        },
    }


def evidence_ids(
    annotations: list[dict[str, Any]],
    field: str,
    value: str,
    limit: int = 8,
) -> list[str]:
    matched: list[str] = []
    for item in annotations:
        field_value = item.get(field)
        if field_value == value or (isinstance(field_value, list) and value in field_value):
            matched.append(str(item["id"]))
            if len(matched) >= limit:
                break
    return matched


def make_candidate(
    section: str,
    index: int,
    proposal: str,
    basis: str,
    evidence: list[str],
    **extra: Any,
) -> dict[str, Any]:
    return {
        "id": f"{section}_{index:03d}",
        "section": section,
        "status": "pending_user_confirmation",
        "proposal": proposal,
        "basis": basis,
        "evidence_ids": evidence,
        **extra,
    }


def distribution_count(stats: dict[str, Any], section: str, label: str) -> int:
    for item in stats.get(section, []):
        if item.get("label") == label:
            return int(item.get("count", 0))
    return 0


def build_review_queue(
    messages: list[dict[str, Any]],
    annotations: list[dict[str, Any]],
    duplicate_groups: list[dict[str, Any]],
    stats: dict[str, Any],
    user: str,
    target: str,
) -> dict[str, Any]:
    sections: dict[str, list[dict[str, Any]]] = {
        "memory_anchor": [],
        "voice_index": [],
        "growth_seed": [],
        "constitution": [],
        "scenario_map": [],
        "user_profile": [],
    }

    for row in stats["topic_distribution"][:5]:
        sections["memory_anchor"].append(
            make_candidate(
                "memory_anchor",
                len(sections["memory_anchor"]) + 1,
                f"将“{row['label']}”作为高频对话场景记忆锚点候选。",
                f"标注语料中出现 {row['count']} 次，占比 {row['ratio']:.2%}。",
                evidence_ids(annotations, "topic", row["label"]),
                anchor_type="topic",
                topic=row["label"],
            )
        )
    target_groups = [group for group in duplicate_groups if group.get("speaker") == target]
    target_groups.sort(key=lambda group: int(group.get("occurrence_count", 0)), reverse=True)
    for group in target_groups[:5]:
        group_evidence = [
            item["id"]
            for item in annotations
            if item.get("duplicate_group_id") == group.get("id")
        ][:8]
        sections["memory_anchor"].append(
            make_candidate(
                "memory_anchor",
                len(sections["memory_anchor"]) + 1,
                f"将重复表达组 {group['id']} 作为语言记忆锚点候选。",
                f"真实出现 {group['occurrence_count']} 次，类别为“{group['category']}”。",
                group_evidence,
                anchor_type="expression_group",
                duplicate_group_id=group["id"],
            )
        )

    voice_specs = [
        (
            "短句密度索引",
            "按 content_type=text 与 raw_text 长度过滤 corpus/annotated_segments.jsonl。",
            "language_features.short_le_4_count / short_le_10_count",
        ),
        (
            "标点习惯索引",
            "按 stats.json.language_features.punctuation_counts 定位，再回查 corpus 原文。",
            "language_features.punctuation_counts",
        ),
        (
            "高频表达索引",
            "按 duplicate_group_id 连接 corpus/duplicate_groups.jsonl 与 annotated_segments.jsonl。",
            "corpus/duplicate_groups.jsonl.occurrence_count",
        ),
        (
            "语境与时期索引",
            "组合 topic、period、context_sensitivity、is_exception 过滤 corpus 原文。",
            "annotation fields",
        ),
    ]
    for label, index_rule, basis in voice_specs:
        sections["voice_index"].append(
            make_candidate(
                "voice_index",
                len(sections["voice_index"]) + 1,
                label,
                basis,
                [],
                index_rule=index_rule,
            )
        )

    annotation_total = max(1, len(annotations))
    text_total = max(1, stats["counts"]["target_text_count"])
    language = stats["language_features"]
    dimensions = [
        ("短促表达密度", language["short_le_10_count"] / text_total, "10 字以内文本 / 目标文本"),
        ("主动追问密度", distribution_count(stats, "trait_distribution", "主动追问") / annotation_total, "主动追问标签 / 标注片段"),
        ("情绪表达密度", distribution_count(stats, "trait_distribution", "情绪表达") / annotation_total, "情绪表达标签 / 标注片段"),
        ("边界表达密度", distribution_count(stats, "trait_distribution", "明确边界") / annotation_total, "明确边界标签 / 标注片段"),
        ("支持回应密度", distribution_count(stats, "trait_distribution", "支持回应") / annotation_total, "支持回应标签 / 标注片段"),
        ("解释说明密度", distribution_count(stats, "trait_distribution", "解释说明") / annotation_total, "解释说明标签 / 标注片段"),
        ("显性情绪密度", (annotation_total - distribution_count(stats, "emotion_distribution", "中性")) / annotation_total, "非中性情绪 / 标注片段"),
        ("关系专属语境密度", distribution_count(stats, "context_distribution", "仅特定关系") / annotation_total, "仅特定关系 / 标注片段"),
    ]
    for dimension, value, calculation in dimensions:
        sections["growth_seed"].append(
            make_candidate(
                "growth_seed",
                len(sections["growth_seed"]) + 1,
                f"C4 八维初始值候选：{dimension} = {value:.2%}。",
                calculation,
                [],
                dimension=dimension,
                initial_value=round(value, 6),
                unit="ratio",
            )
        )

    periods = {item["period"] for item in annotations if item.get("period") not in {"", "未知"}}
    trait_periods: dict[str, set[str]] = defaultdict(set)
    trait_counts: Counter[str] = Counter()
    for item in annotations:
        for trait in item.get("traits", []):
            trait_counts[trait] += 1
            if item.get("period") not in {"", "未知"}:
                trait_periods[trait].add(item["period"])
    for trait, count in trait_counts.most_common():
        if trait in {"未分类表达", "非文本表达"}:
            continue
        if periods and trait_periods[trait] == periods and count >= max(3, len(annotations) // 100):
            sections["constitution"].append(
                make_candidate(
                    "constitution",
                    len(sections["constitution"]) + 1,
                    f"将“{trait}”列为跨时期稳定人格底线候选。",
                    f"在 {len(periods)} 个时期均出现，共 {count} 条证据。",
                    evidence_ids(annotations, "traits", trait, limit=12),
                    trait=trait,
                    requires_individual_confirmation=True,
                )
            )
        if len(sections["constitution"]) >= 6:
            break

    for row in stats["topic_distribution"][:8]:
        sections["scenario_map"].append(
            make_candidate(
                "scenario_map",
                len(sections["scenario_map"]) + 1,
                f"高频场景候选：{row['label']}。",
                f"出现 {row['count']} 次，占比 {row['ratio']:.2%}。",
                evidence_ids(annotations, "topic", row["label"]),
                topic=row["label"],
                retrieval_rule={
                    "topic": row["label"],
                    "prefer_period": "稳定期",
                    "exclude_exception_by_default": True,
                },
            )
        )

    user_topic_counts: Counter[str] = Counter()
    for message in messages:
        if message.get("speaker") == user and message.get("type") == "text":
            user_topic_counts[primary_topic(label_scenes(str(message.get("raw_text", ""))))] += 1
    user_total = sum(user_topic_counts.values())
    for topic, count in user_topic_counts.most_common(5):
        sections["user_profile"].append(
            make_candidate(
                "user_profile",
                len(sections["user_profile"]) + 1,
                f"对方画像候选：对话中“{topic}”相关表达占比较高。",
                f"对方文本中按规则识别 {count} 次，占比 {count / max(1, user_total):.2%}；只能作为候选，不代表稳定人格。",
                [],
                topic=topic,
            )
        )

    all_candidates = [candidate for items in sections.values() for candidate in items]
    return {
        "schema_version": 1,
        "status": "pending_user_confirmation",
        "disclaimer": "以下内容均为建议，需要你逐条确认。不可更改底线必须逐条采纳、修改或否决。",
        "candidate_count": len(all_candidates),
        "sections": sections,
        "exception_review": {
            "count": stats["counts"]["exception_count"],
            "corpus_ids": [item["id"] for item in annotations if item.get("is_exception")],
            "instruction": "逐条回到 corpus/annotated_segments.jsonl 核对，不得把例外自动升级为默认人格。",
        },
    }


def write_cleaning_log(
    path: Path,
    source_label: str,
    input_count: int,
    cleaned: list[dict[str, Any]],
    removed: list[dict[str, Any]],
    duplicate_groups: list[dict[str, Any]],
) -> None:
    removed_counts = Counter(item["reason"] for item in removed)
    lines = [
        "# Cleaning Log",
        "",
        f"- Source: `{source_label}`",
        f"- Input messages: {input_count}",
        f"- Preserved effective messages: {len(cleaned)}",
        f"- Removed system-noise records: {len(removed)}",
        f"- Duplicate expression groups: {len(duplicate_groups)}",
        f"- Occurrences represented by duplicate groups: {sum(group['occurrence_count'] for group in duplicate_groups)}",
        "",
        "## Rules",
        "",
        "- Only deterministic system artifacts and uncaptioned bare links are removed.",
        "- Every participant-authored expression is preserved in `corpus/cleaned_messages.jsonl`.",
        "- Near duplicates are indexed as representative text plus real occurrence count; original records remain available for audit.",
        "- No AI paraphrasing is allowed in `raw_text`.",
        "",
        "## Removed By Reason",
        "",
    ]
    if removed_counts:
        lines.extend(f"- `{reason}`: {count}" for reason, count in removed_counts.most_common())
    else:
        lines.append("- None")
    lines.extend(["", "## Removed Record Index", ""])
    if removed:
        lines.extend(
            f"- source_message_id={item['source_message_id']} date={item['date']} time={item['time']} reason={item['reason']}"
            for item in removed
        )
    else:
        lines.append("- None")
    lines.extend(["", "## Duplicate Group Index", ""])
    if duplicate_groups:
        lines.extend(
            f"- `{group['id']}` speaker=`{group['speaker']}` category=`{group['category']}` count={group['occurrence_count']}"
            for group in duplicate_groups
        )
    else:
        lines.append("- None")
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_candidate_files(
    candidate_dir: Path,
    queue: dict[str, Any],
    annotations: list[dict[str, Any]],
) -> None:
    candidate_dir.mkdir(parents=True, exist_ok=True)
    write_json(candidate_dir / "review_queue.json", queue)
    decisions = [
        {
            "candidate_id": candidate["id"],
            "decision": "pending",
            "replacement": None,
            "note": "",
        }
        for items in queue["sections"].values()
        for candidate in items
    ]
    write_json(
        candidate_dir / "review_template.json",
        {
            "reviewer": "user",
            "instructions": "把每一项 decision 改为 adopt/modify/reject；modify 时填写 replacement。",
            "decisions": decisions,
        },
    )
    exception_rows = [item for item in annotations if item.get("is_exception")]
    write_jsonl(candidate_dir / "exceptions.jsonl", exception_rows)
    lines = [
        "# Candidate Review",
        "",
        "> 以下内容均为建议，需要你逐条确认。不可更改底线不能批量通过。",
        "",
        f"- Candidate count: {queue['candidate_count']}",
        f"- Exception records requiring special review: {queue['exception_review']['count']}",
        "- Edit `review_template.json`, then run `corpus-confirm`.",
        "",
    ]
    for section, items in queue["sections"].items():
        lines.extend([f"## {section}", ""])
        if not items:
            lines.append("- No candidates generated.")
        for item in items:
            lines.append(f"- `{item['id']}` {item['proposal']} Evidence: {', '.join(item['evidence_ids']) or 'stats-only'}")
        lines.append("")
    (candidate_dir / "README.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def build_distillation_package_from_messages(
    messages: list[dict[str, Any]],
    package_dir: Path,
    source_label: str,
    target_speaker: str = "",
    user_speaker: str = "",
) -> dict[str, Any]:
    package_dir = package_dir.resolve()
    existing_official = [name for name in OFFICIAL_OUTPUTS if (package_dir / name).exists()]
    if existing_official:
        raise ValueError(
            "Refusing to overwrite a confirmed package. Choose a new output directory: "
            + ", ".join(existing_official)
        )
    corpus_path = package_dir / "corpus"
    candidates_path = package_dir / "candidates"
    corpus_path.mkdir(parents=True, exist_ok=True)
    candidates_path.mkdir(parents=True, exist_ok=True)

    user, target = resolve_speakers(
        messages,
        target_speaker,
        user_speaker,
        require_target=not bool(target_speaker),
    )
    cleaned, removed, duplicate_groups = clean_messages(messages)
    annotations = build_annotations(cleaned, target)
    fingerprint = source_fingerprint(messages)
    stats = build_stats(cleaned, annotations, duplicate_groups, user, target, source_label, fingerprint)
    queue = build_review_queue(cleaned, annotations, duplicate_groups, stats, user, target)

    write_jsonl(corpus_path / "cleaned_messages.jsonl", cleaned)
    write_jsonl(corpus_path / "duplicate_groups.jsonl", duplicate_groups)
    write_jsonl(corpus_path / "annotated_segments.jsonl", annotations)
    write_json(package_dir / "stats.json", stats)
    write_cleaning_log(
        package_dir / "cleaning_log.md",
        source_label,
        len(messages),
        cleaned,
        removed,
        duplicate_groups,
    )
    write_candidate_files(candidates_path, queue, annotations)
    queue_hash = sha256_text((candidates_path / "review_queue.json").read_text(encoding="utf-8"))
    manifest = {
        "schema_version": 1,
        "phase": 3,
        "status": "awaiting_user_confirmation",
        "source_label": source_label,
        "source_sha256": fingerprint,
        "review_queue_sha256": queue_hash,
        "official_outputs_locked": list(OFFICIAL_OUTPUTS),
        "next_command": "corpus-confirm --package-dir <path> --decisions <review_template.json>",
    }
    write_json(package_dir / "package_manifest.json", manifest)
    return {
        "ok": True,
        "phase": 3,
        "status": "awaiting_user_confirmation",
        "package_dir": str(package_dir),
        "user_speaker": user,
        "target_speaker": target,
        "stats": stats["counts"],
        "candidate_count": queue["candidate_count"],
        "official_outputs_written": [],
        "review_template": str(candidates_path / "review_template.json"),
    }


def build_distillation_package(
    skill_root: Path,
    source_path: Path,
    package_dir: Path | None = None,
    target_speaker: str = "",
    user_speaker: str = "",
    profile_id: str = "",
) -> dict[str, Any]:
    source = source_path.resolve()
    if not source.exists():
        raise FileNotFoundError(f"Source chat record not found: {source}")
    output = package_dir.resolve() if package_dir else profile_paths(skill_root, profile_id)["package"]
    return build_distillation_package_from_messages(
        load_chat_messages(source),
        output,
        str(source),
        target_speaker,
        user_speaker,
    )


def normalized_decision(value: Any) -> str:
    return DECISION_MAP.get(str(value).strip().lower(), "")


def finalized_candidate(candidate: dict[str, Any], decision: dict[str, Any]) -> dict[str, Any] | None:
    action = normalized_decision(decision.get("decision"))
    if action == "reject":
        return None
    replacement = decision.get("replacement")
    if action == "modify" and (replacement is None or replacement == ""):
        raise ValueError(f"Candidate {candidate['id']} is modify but has no replacement.")
    final = dict(candidate)
    final["decision"] = action
    final["status"] = "confirmed"
    if action == "modify":
        final["confirmed_value"] = replacement
    else:
        final["confirmed_value"] = candidate.get("proposal")
    final["review_note"] = decision.get("note", "")
    return final


def write_final_voice_index(path: Path, items: list[dict[str, Any]]) -> None:
    lines = [
        "# Voice Index",
        "",
        "Status: confirmed by user.",
        "",
        "This file contains retrieval directions only. All language evidence remains in `corpus/`.",
        "",
    ]
    for item in items:
        label = item.get("confirmed_value") or item.get("proposal")
        lines.append(f"- {label}: {item.get('index_rule', 'Return to corpus evidence ids before use.')}")
    if not items:
        lines.append("- No voice indices were adopted.")
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_final_user_profile(path: Path, items: list[dict[str, Any]]) -> None:
    lines = ["# User Profile", "", "Status: confirmed by user.", ""]
    for item in items:
        value = item.get("confirmed_value") or item.get("proposal")
        evidence = ", ".join(item.get("evidence_ids", [])) or "stats-only"
        lines.append(f"- {value} Evidence: {evidence}")
    if not items:
        lines.append("- No user-profile candidates were adopted.")
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def confirm_distillation_package(package_dir: Path, decisions_path: Path) -> dict[str, Any]:
    package_dir = package_dir.resolve()
    queue_path = package_dir / "candidates" / "review_queue.json"
    manifest_path = package_dir / "package_manifest.json"
    if not queue_path.exists() or not manifest_path.exists():
        return {"ok": False, "phase": 4, "errors": ["phase_three_package_not_found"]}
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    current_queue_hash = sha256_text(queue_path.read_text(encoding="utf-8"))
    if current_queue_hash != manifest.get("review_queue_sha256"):
        return {"ok": False, "phase": 4, "errors": ["review_queue_changed_after_generation"]}
    if not decisions_path.exists():
        return {"ok": False, "phase": 4, "errors": [f"decisions_file_not_found:{decisions_path}"]}
    decision_payload = json.loads(decisions_path.read_text(encoding="utf-8"))
    decision_rows = decision_payload.get("decisions", [])
    by_id = {str(row.get("candidate_id", "")): row for row in decision_rows}
    candidates = [candidate for items in queue["sections"].values() for candidate in items]
    candidate_ids = {candidate["id"] for candidate in candidates}
    errors: list[str] = []
    unknown = sorted(candidate_id for candidate_id in by_id if candidate_id and candidate_id not in candidate_ids)
    if unknown:
        errors.append("unknown_candidate_ids:" + ",".join(unknown))
    for candidate in candidates:
        row = by_id.get(candidate["id"])
        if row is None:
            errors.append(f"missing_decision:{candidate['id']}")
            continue
        action = normalized_decision(row.get("decision"))
        if not action:
            errors.append(f"invalid_or_pending_decision:{candidate['id']}")
        elif action == "modify" and (row.get("replacement") is None or row.get("replacement") == ""):
            errors.append(f"missing_replacement:{candidate['id']}")
    if errors:
        return {
            "ok": False,
            "phase": 4,
            "status": "awaiting_complete_user_confirmation",
            "errors": errors,
        }

    confirmed: dict[str, list[dict[str, Any]]] = {section: [] for section in queue["sections"]}
    review_log: list[dict[str, Any]] = []
    for section, items in queue["sections"].items():
        for candidate in items:
            decision = by_id[candidate["id"]]
            final = finalized_candidate(candidate, decision)
            review_log.append(
                {
                    "candidate_id": candidate["id"],
                    "section": section,
                    "decision": normalized_decision(decision.get("decision")),
                    "replacement": decision.get("replacement"),
                    "note": decision.get("note", ""),
                }
            )
            if final:
                confirmed[section].append(final)

    reviewer = decision_payload.get("reviewer") or "user"
    confirmed_at = datetime.now(timezone.utc).isoformat()
    write_json(
        package_dir / "constitution.json",
        {
            "schema_version": 1,
            "status": "confirmed",
            "reviewer": reviewer,
            "confirmed_at": confirmed_at,
            "items": confirmed["constitution"],
        },
    )
    write_json(
        package_dir / "growth_seed.json",
        {
            "schema_version": 1,
            "status": "confirmed",
            "reviewer": reviewer,
            "confirmed_at": confirmed_at,
            "memory_anchors": confirmed["memory_anchor"],
            "c4_eight_dimensions": confirmed["growth_seed"],
        },
    )
    write_json(
        package_dir / "scenario_map.json",
        {
            "schema_version": 1,
            "status": "confirmed",
            "reviewer": reviewer,
            "confirmed_at": confirmed_at,
            "scenarios": confirmed["scenario_map"],
        },
    )
    write_final_voice_index(package_dir / "voice_index.md", confirmed["voice_index"])
    write_final_user_profile(package_dir / "user_profile.md", confirmed["user_profile"])
    write_json(
        package_dir / "review_log.json",
        {
            "schema_version": 1,
            "reviewer": reviewer,
            "confirmed_at": confirmed_at,
            "decisions": review_log,
        },
    )
    manifest.update(
        {
            "phase": 4,
            "status": "confirmed",
            "reviewer": reviewer,
            "confirmed_at": confirmed_at,
            "official_outputs_locked": [],
            "official_outputs": list(OFFICIAL_OUTPUTS),
        }
    )
    write_json(manifest_path, manifest)
    profile_update = mark_profile_confirmed(package_dir)
    return {
        "ok": True,
        "phase": 4,
        "status": "confirmed",
        "package_dir": str(package_dir),
        "official_outputs": list(OFFICIAL_OUTPUTS),
        "decision_count": len(review_log),
        "profile": profile_update,
    }


def emit(payload: dict[str, Any], as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(payload)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the auditable chat-persona corpus distillation workflow")
    parser.add_argument("--skill-root", default="", help="Path to the skill root")
    parser.add_argument("--profile", default="", help="Profile id; defaults to the active profile")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    sub = parser.add_subparsers(dest="command", required=True)
    distill = sub.add_parser("distill", help="Run phases zero through three and stop for user review")
    distill.add_argument("--source", required=True, help="DOCX, TXT, MD, JSON, JSONL, or CSV chat export")
    distill.add_argument("--output", default="", help="Output package directory")
    distill.add_argument("--target-speaker", required=True, help="Exact name or unique substring for the simulated speaker")
    distill.add_argument("--user-speaker", default="", help="Exact name or unique substring for the counterpart")
    confirm = sub.add_parser("confirm", help="Apply complete item-by-item user decisions and write phase four")
    confirm.add_argument("--package-dir", required=True, help="Phase-three package directory")
    confirm.add_argument("--decisions", required=True, help="Completed review decisions JSON")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = Path(args.skill_root).resolve() if args.skill_root else Path(__file__).resolve().parents[1]
    if args.command == "distill":
        output = Path(args.output).resolve() if args.output else None
        payload = build_distillation_package(
            root,
            Path(args.source),
            output,
            args.target_speaker,
            args.user_speaker,
            args.profile,
        )
        emit(payload, args.json)
        return 0
    if args.command == "confirm":
        payload = confirm_distillation_package(Path(args.package_dir), Path(args.decisions))
        emit(payload, args.json)
        return 0 if payload.get("ok") else 2
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
