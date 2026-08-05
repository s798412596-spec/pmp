# 通用聊天角色语料处理工作流手册

> 这份手册是写给执行任务的 AI 看的操作指令，不是角色运行时提示词。
> 可执行命令、文件锁定和校验细节以同目录 `corpus-distillation.md` 为准。

## 一、角色和任务边界

输入是一份真实关系里的原始聊天记录。任务是把原始聊天记录加工成一份保留原文、带检索标签、经过用户确认的标准语料包，供后续角色模拟引擎调用。

语料蒸馏不负责构建角色运行引擎。引擎和语料必须解耦：更换角色时重新蒸馏语料，不修改引擎。

## 二、三条铁律

1. 抽取、统计、建议、确认必须分开，严格按顺序执行，不能合并成一步。
2. 任何 `raw_text` 禁止转述、改写、概括或润色，必须一字不改地保留。
3. 涉及角色核心边界的判断只能作为候选，必须等待用户逐条确认，不能批量通过。

任何一步违反铁律，都应停止并从原始记录重新生成。

## 三、五阶段流程

### 阶段零：规则清洗

只允许删除系统生成、非本人表达的内容：

- 纯时间戳；
- 已读/未读回执；
- 红包或转账系统通知；
- 无配文的纯转发链接；
- 系统提示；
- 撤回提示。

一切参与者本人表达都必须保留，包括语气词、口头禅、重复寒暄、表情和媒体标记。

近似重复表达不能删除或概括。处理方式是保留全部源消息，同时建立“代表性原文 + 真实出现次数 + 原始消息 id + 所有变体”的重复组索引。

本阶段产出：

- `corpus/cleaned_messages.jsonl`；
- `corpus/duplicate_groups.jsonl`；
- `cleaning_log.md`。

### 阶段一：逐条抽取和标注

每个目标人物有效片段至少包含：

| 字段 | 含义 |
|---|---|
| `raw_text` | 原文，一字不改 |
| `raw_text_sha256` | 原文完整性哈希 |
| `traits` | 性格侧面检索标签 |
| `topic` | 话题类别 |
| `frequency_tier` | 高频 / 中频 / 低频 |
| `frequency_count` | 真实计数 |
| `context_sensitivity` | 仅对用户 / 特定场景 / 通用 |
| `period` | 早期 / 稳定期 / 后期 |
| `emotion_tone` | 正面 / 中性 / 负面 / 复杂 |
| `is_exception` | 是否与整体倾向存在张力 |

上下文单独存储，不得把“用户：…… / 角色：……”这种 AI 拼接文本冒充 `raw_text`。

本阶段产出：`corpus/annotated_segments.jsonl`。

### 阶段二：纯计算统计

所有数字必须能从 `corpus/` 重新计算，不能掺杂临场判断：

- 话题分布和占比；
- 标签频率分级；
- 早期、稳定期、后期占比；
- 平均句长和中位句长；
- 短句密度；
- 标点习惯；
- 高频短表达；
- 字符 n-gram；
- 重复组和例外记录数量。

本阶段产出：`stats.json`。

### 阶段三：候选生成

候选清单开头必须写明：以下内容均为建议，需要你逐条确认。

候选类型包括：

- 底层记忆锚点；
- 语言风格检索索引；
- C4 八维度人格状态初始值；
- 不可更改底线；
- 高频场景类型和检索建议；
- 对方画像。

所有候选必须包含证据 id 或明确的统计计算方式，并保持 `status=pending_user_confirmation`。

所有 `is_exception=true` 记录必须单独进入例外审阅文件。例外不能自动升级为默认人格。

完成阶段三后必须停止。正式的 `constitution.json`、`growth_seed.json`、`scenario_map.json`、`voice_index.md`、`user_profile.md` 此时不应存在。

### 阶段四：人工确认和锁定

用户必须对每条候选分别给出：

- `adopt` / 采纳；
- `modify` / 修改，并提供替换内容；
- `reject` / 否决。

任何缺失或仍为 pending 的决定都会阻止全部正式文件生成。不可更改底线没有批量通过入口。

确认日志必须保留候选 id、最终决定、修改内容和备注，供以后审计。

## 四、最终语料包接口

```text
语料包/
  corpus/
    cleaned_messages.jsonl
    duplicate_groups.jsonl
    annotated_segments.jsonl
  stats.json
  constitution.json
  growth_seed.json
  scenario_map.json
  voice_index.md
  user_profile.md
  cleaning_log.md
```

审计辅助文件包括：

- `package_manifest.json`；
- `review_log.json`；
- `candidates/review_queue.json`；
- `candidates/review_template.json`；
- `candidates/exceptions.jsonl`。

`voice_index.md` 只保存检索指引，具体语言内容永远回到 `corpus/` 原文。

## 五、质量自检

- 阶段零是否只删除系统生成内容；所有本人表达是否仍可在语料中找到？
- 随机抽查 `raw_text` 和 `raw_text_sha256`，是否与原记录一致？
- 随机抽查统计计数，是否能从标注语料得到同样结果？
- 所有候选是否明确处于待确认状态？
- 阶段三是否确实没有正式人格文件？
- 不可更改底线是否逐条确认？
- 例外记录是否逐条回查，没有被误当成人格默认值？
- 用最终语料包跑典型场景时，是否能回溯到支持该回复风格的原文证据？

## 六、引擎边界

运行引擎只消费已确认的标准语料包。每个角色的默认位置为 `.runtime/profiles/<profile-id>/package/`。

只有当 `package_manifest.json` 为阶段四、状态为 `confirmed`，且五个正式人格文件全部存在时，运行引擎才允许优先读取标准语料包。阶段三候选包不得进入角色运行链路。

每个角色还拥有独立的 `.runtime/profiles/<profile-id>/corpus/` 检索镜像。检索、状态和记忆均不得跨角色读取；未确认的新角色不得进入正常生成链路。
