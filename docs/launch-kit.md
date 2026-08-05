# Chat Persona Engine 推广口径

## 一句话介绍

把任意聊天记录变成可审计、可确认、可替换的人格语料包，而不是再写一段无法追溯的人设提示词。

## GitHub 简介

Profile-isolated chat persona engine with auditable five-stage corpus distillation, immutable source evidence, human confirmation, context-aware retrieval, validation, and bounded growth.

The current release adds zero-retention persona replacement: one guarded reset
removes every private source, persona rule, memory, context, and runtime state;
the next imported chat starts empty and can activate only after item-by-item
confirmation, automatic knowledge assembly, and source plus knowledge hash
verification.

## 中文项目介绍

Chat Persona Engine 是一个面向真实聊天记录的人格蒸馏与运行框架。它支持 DOCX、TXT、Markdown、JSON、JSONL 和 CSV，把原始聊天依次转化为清洗语料、逐条证据、可复现统计、待确认人格候选和标准人格包。

它不让 AI 在一次总结里同时扮演清洗者、统计员和最终裁判。原话保持不变，统计由程序计算，AI 只负责提出候选，用户逐条确认后才允许人格生效。每个人物都有完全独立的源文件、语料、知识、状态和成长快照，切换角色只需切换档案，不需要修改引擎。

与提示词人设、通用 RAG 或通用记忆层相比，它专门解决“历史聊天如何可靠变成人格产品”这个更窄但更难的问题：结论能回到原话，异常不会冒充常态，新记忆不会静默篡改人格，多个人物不会串档。

## 首发文案

我把 gagale-skill 从一个单角色原型，升级成了可导入任意聊天记录的 Chat Persona Engine。

这次升级不是简单删掉名字、换几个变量，而是重新划清了三条边界：

1. 原始聊天是证据，不能被 AI 改写。
2. 统计是程序计算，不能混入模型判断。
3. 人格是用户确认后的结果，不能由 AI 自行拍板。

现在它支持六种聊天格式、五阶段蒸馏、逐条确认、源文件哈希、多人物档案隔离、证据检索、上下文状态、回复校验，以及可确认、可快照、可回滚的有限成长。

它的目标不是让模型“更会演”，而是让一个人格从哪里来、为什么这样说、何时允许变化，都能够被核查和控制。

## 对外比较口径

推荐表述：

> Mem0、LangMem、Graphiti、Letta 解决的是通用记忆、状态或上下文基础设施问题。Chat Persona Engine 聚焦它们之前的一步：如何把历史聊天先蒸馏成证据完整、统计可复现、经过人工确权的人格包。它可以独立运行，也可以作为这些记忆框架的上游人格生产线。

避免使用：

- “比所有记忆框架都强”；
- “百分之百还原真人”；
- “行业首创”或“行业第一”；
- “完全不会幻觉”；
- 未经公开基准支持的相似度或性能数字。

## 推荐关键词

`chat-persona`、`persona-distillation`、`agent-memory`、`auditable-ai`、`human-in-the-loop`、`conversation-corpus`、`codex-skill`、`profile-isolation`、`character-ai`、`digital-persona`

## 公开依据

- [Mem0 官方仓库](https://github.com/mem0ai/mem0)
- [LangMem 官方文档](https://langchain-ai.github.io/langmem/)
- [Graphiti 官方仓库](https://github.com/getzep/graphiti)
- [Letta Memory Blocks 官方文档](https://docs.letta.com/guides/core-concepts/memory/memory-blocks)
