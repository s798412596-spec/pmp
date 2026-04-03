import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COMMANDER_TIMEOUT_MS = 10000;
const ARCHITECT_TIMEOUT_MS = 45000;
const ANALYST_TIMEOUT_MS = 20000;
const TAG_ANALYZER_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} 超时（${ms / 1000}秒），请稍后重试或换一个模型`)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function callLLM(
  provider: string,
  model: string,
  system: string,
  messages: any[],
  maxTokens = 4096,
): Promise<string> {
  if (provider === "glm") {
    const apiKey = Deno.env.get("GLM_API_KEY");
    if (!apiKey) throw new Error("GLM_API_KEY 未配置，请在 Supabase Secrets 中添加");
    const resp = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "GLM-4-Plus", max_tokens: maxTokens, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("GLM 调用失败 " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (provider === "anthropic") {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY 未配置，请在 Supabase Secrets 中添加");
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: model || "claude-sonnet-4-6-20260217", max_tokens: maxTokens, system, messages }),
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("Anthropic 调用失败 " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.content?.map((c: any) => c.text || "").join("") || "";

  } else if (provider === "openai") {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY 未配置，请在 Supabase Secrets 中添加");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "gpt-5.4", max_tokens: maxTokens, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("OpenAI 调用失败 " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (provider === "gemini") {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY 未配置，请在 Supabase Secrets 中添加");
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "gemini-3.1-pro-preview", max_tokens: maxTokens, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("Gemini 调用失败 " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (provider === "qwen") {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY 未配置，请在 Supabase Secrets 中添加");
    const resp = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "qwen-plus", max_tokens: maxTokens, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("Qwen 调用失败 " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (provider === "deepseek") {
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY 未配置，请在 Supabase Secrets 中添加");
    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "deepseek-v3.2", max_tokens: maxTokens, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("DeepSeek 调用失败 " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (provider === "custom") {
    const apiKey = Deno.env.get("CUSTOM_LLM_API_KEY");
    const baseUrl = Deno.env.get("CUSTOM_LLM_BASE_URL");
    if (!apiKey || !baseUrl) throw new Error("CUSTOM_LLM_API_KEY 或 CUSTOM_LLM_BASE_URL 未配置");
    const resp = await fetch(baseUrl + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "default", max_tokens: maxTokens, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("自定义模型调用失败 " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else {
    throw new Error("未知服务商: " + provider);
  }
}

function tryParseJson(text: string): any | null {
  try {
    let c = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    c = c.replace(/,\s*([}\]])/g, "$1").replace(/\/\/[^\n]*/g, "");
    const m = c.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : c);
  } catch { return null; }
}

// ── Hours Analyst helpers ────────────────────────────────────────────────────
// Collect all action names from operations (add_action / add_project / add_resource / add_category / update_action).
function collectActionNames(operations: any[]): string[] {
  const names: string[] = [];
  const addFromActions = (actions: any[]) => {
    for (const a of actions || []) { if (a.name) names.push(a.name); }
  };
  for (const op of operations || []) {
    // update_action: the actionName field identifies the action being modified
    if (op.type === "update_action" && op.actionName) { names.push(op.actionName); continue; }
    if (op.action) addFromActions([op.action]);
    if (op.actions) addFromActions(op.actions);
    for (const cat of op.categories || []) {
      for (const res of cat.resources || []) { addFromActions(res.actions || []); }
    }
    for (const res of op.resources || []) { addFromActions(res.actions || []); }
  }
  return names;
}

// Apply hourUpdates (by actionName match) back into operations in-place.
function applyHoursToOps(operations: any[], hourUpdates: Array<{ actionName: string; hours: number }>): void {
  const hoursMap = new Map(hourUpdates.filter(u => u.hours > 0).map(u => [u.actionName, u.hours]));
  if (hoursMap.size === 0) return;
  const applyToActions = (actions: any[]) => {
    for (const a of actions || []) {
      if (a.name && hoursMap.has(a.name)) a.hours = hoursMap.get(a.name);
    }
  };
  for (const op of operations || []) {
    // update_action: merge hours into the updates object so the client applies it
    if (op.type === "update_action" && op.actionName && hoursMap.has(op.actionName)) {
      op.updates = { ...(op.updates || {}), hours: hoursMap.get(op.actionName) };
      continue;
    }
    if (op.action) applyToActions([op.action]);
    if (op.actions) applyToActions(op.actions);
    for (const cat of op.categories || []) {
      for (const res of cat.resources || []) { applyToActions(res.actions || []); }
    }
    for (const res of op.resources || []) { applyToActions(res.actions || []); }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Tag Analyzer helpers ──────────────────────────────────────────────────────
// Collect all new category names from an operations array (add_category + nested in add_project).
function collectNewCategoryNames(operations: any[]): string[] {
  const names: string[] = [];
  for (const op of operations || []) {
    if (op.type === "add_category" && op.category?.name) names.push(op.category.name);
    if (op.type === "add_project" && Array.isArray(op.categories)) {
      for (const c of op.categories) { if (c.name) names.push(c.name); }
    }
  }
  return [...new Set(names)];
}

// Build the Tag Analyzer system prompt (used inline — no frontend round-trip needed).
function buildTagAnalyzerSystem(): string {
  return `你是「会议解析者」，负责为本次新增的业务类别自动匹配或创建标签。

规则：
1. 优先复用现有标签：类别名/内容与已有标签语义相近时直接assign，不新建重复标签
2. 仅当业务类型确实全新（与所有现有标签均不相近）时，才新建标签（add_tag）
3. 每个新增类别必须被分配到恰好一个标签（assign_tag），不得遗漏
4. 新标签颜色从以下10色中选最合适的：#007AFF(蓝), #34C759(绿), #FF9500(橙), #FF3B30(红), #AF52DE(紫), #5AC8FA(浅蓝), #FF2D55(粉), #FFCC00(黄), #30B0C7(青绿), #A2845E(棕)
5. add_tag 必须在对应 assign_tag 之前出现
6. 输出严格JSON，禁用markdown代码块：{"tagOps":[{"type":"add_tag","tag":{"name":"xxx","color":"#xxx"}},{"type":"assign_tag","categoryName":"xxx","tagName":"xxx"}]}`;
}
// ─────────────────────────────────────────────────────────────────────────────

// Build the project-detail supplement for one bucket's Architect call.
// Returns a string block showing full L1→L2→L3→L4 for the target project.
function buildProjectDetailBlock(project: any): string {
  if (!project) return "";
  const cats = (project.categories || []).map((c: any) => {
    const ress = (c.resources || []).map((r: any) => {
      const acts = (r.actions || []).map((a: any) => `          动作: "${a.name}" (id:${a.id})`).join("\n");
      return `        资源: "${r.name}" (id:${r.id})${acts ? `\n${acts}` : ""}`;
    }).join("\n");
    return `      类别: "${c.name}" (id:${c.id})${ress ? `\n${ress}` : ""}`;
  }).join("\n");
  return `    项目: "${project.name}" (id:${project.id})${cats ? `\n${cats}` : ""}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // ── Request contract ──────────────────────────────────────────────────────
    // Bulk hours mode (bulkHoursMode=true):
    //   bulkHoursMode     — true: skip Commander/Architect, run Analyst only
    //   actionsList       — [{actionName,actionId,projectId,categoryId,resourceId}]
    //   hoursAnalystSystem — analyst system prompt
    //   provider, model   — AI provider/model for analyst call
    //
    // Agent mode (long input >400 chars):
    //   system          — lean L1+L2 system prompt (buildSystemPrompt(true) on client)
    //   messages        — trimmed chat history (last 8), assistant entries are plain text only
    //   commanderSystem — Commander's system prompt (outputs projectBuckets[])
    //   projectsData    — CANONICAL FIELD: full project array from client; server uses
    //                     buildProjectDetailBlock() to inject per-bucket L3/L4 detail
    //
    // Non-agent mode / short input / follow-up:
    //   system          — full L1+L2+L3+L4 prompt (buildSystemPrompt(false) on client)
    //   messages, provider, model only; no commanderSystem or projectsData sent
    // ─────────────────────────────────────────────────────────────────────────
    const { system, messages, provider, model, agentMode, commanderSystem, projectsData, hoursAnalystSystem, bulkHoursMode, actionsList, tagAnalyzerEnabled } = await req.json();

    // ── Bulk hours mode: skip Commander/Architect, run Analyst directly ───────
    if (bulkHoursMode && Array.isArray(actionsList) && actionsList.length > 0 && hoursAnalystSystem) {
      const bulkProvider = (provider || "gemini").toLowerCase();
      const bulkModel = model || "";
      const actionNames: string[] = actionsList.map((a: any) => a.actionName).filter(Boolean);
      console.log(`BulkHours: analyzing ${actionNames.length} zero-hours actions...`);
      const analystMsg = `请分析以下新媒体运营任务的难易度和工时（小时）：\n${actionNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n")}`;
      try {
        const analystRaw = await withTimeout(
          callLLM(bulkProvider, bulkModel, hoursAnalystSystem, [{ role: "user", content: analystMsg }], 2048),
          ANALYST_TIMEOUT_MS * 2, // allow more time for large batch
          "BulkAnalyst",
        );
        const analystParsed = tryParseJson(analystRaw);
        if (!analystParsed?.hourUpdates?.length) {
          return respond({ text: JSON.stringify({ operations: [], message: "工时分析未返回有效结果，请重试" }) });
        }
        const hoursMap = new Map<string, number>(
          analystParsed.hourUpdates.filter((u: any) => u.hours > 0).map((u: any) => [u.actionName, u.hours as number])
        );
        const operations = actionsList
          .filter((a: any) => hoursMap.has(a.actionName))
          .map((a: any) => ({
            type: "update_action",
            projectId: a.projectId,
            categoryId: a.categoryId,
            resourceId: a.resourceId,
            actionId: a.actionId,
            actionName: a.actionName,
            updates: { hours: hoursMap.get(a.actionName) },
          }));
        const message = `已分析 ${actionNames.length} 条任务，成功估算 ${operations.length} 条工时`;
        console.log(`BulkHours OK: ${operations.length}/${actionNames.length} hours estimated`);
        return respond({ text: JSON.stringify({ operations, message }) });
      } catch (e: any) {
        console.warn("BulkHours failed:", e.message);
        return respond({ error: `批量工时分析失败：${e.message}` }, 500);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (!system || !messages) return respond({ error: "Missing system or messages" }, 400);

    const activeProvider = (provider || "gemini").toLowerCase();
    const userLastMsg = messages[messages.length - 1]?.content || "";
    const projects: any[] = Array.isArray(projectsData) ? projectsData : [];
    console.log(`AI call: provider=${activeProvider}, model=${model || "(default)"}, agentMode=${!!agentMode}, msgLen=${userLastMsg.length}, projects=${projects.length}`);

    // Only invoke Commander for genuinely long inputs (>400 chars) in agent mode
    const shouldUseCommander = agentMode && commanderSystem && userLastMsg.length > 400;

    let responseText = "";

    if (shouldUseCommander) {
      // ── Stage 1: Commander ──
      // Lightweight call: condenses input + splits into project buckets
      let condensed: any = null;
      try {
        console.log(`Commander: condensing ${userLastMsg.length} chars...`);
        const cmdRaw = await withTimeout(
          callLLM(activeProvider, model, commanderSystem, [{ role: "user", content: userLastMsg }], 1024),
          COMMANDER_TIMEOUT_MS,
          "Commander",
        );
        condensed = tryParseJson(cmdRaw);
        if (!condensed?.condensed) {
          console.warn("Commander parse failed, falling back to direct");
          condensed = null;
        } else {
          console.log(`Commander OK: "${condensed.condensed.slice(0, 60)}", buckets=${(condensed.projectBuckets || []).length}`);
        }
      } catch (e: any) {
        console.warn("Commander failed:", e.message, "— using direct mode");
        condensed = null;
      }

      if (condensed) {
        // ── Stage 2: Parallel Architect calls (one per project bucket) ──
        const buckets: any[] = (condensed.projectBuckets || []).length > 0
          ? condensed.projectBuckets
          : [{ projectName: condensed.projectHint || "", condensed: condensed.condensed, tasks: condensed.tasks || [] }];

        console.log(`Architect: launching ${buckets.length} parallel calls...`);

        // Run all Architects in parallel; capture result or error per bucket
        const bucketOutcomes = await Promise.all(
          buckets.map(async (bucket: any, idx: number) => {
            const label = `Architect-${idx + 1}`;
            try {
              const taskLines = (bucket.tasks || []).map((t: any, i: number) =>
                `${i + 1}. ${t.action}${t.person ? ` | 负责人:${t.person}` : ""}${t.platform ? ` | 平台:${t.platform}` : ""}${t.deadline ? ` | 截止:${t.deadline}` : ""}${t.freq ? ` | 频率:${t.freq}` : ""}${t.note ? ` | 备注:${t.note}` : ""}`
              ).join("\n");

              const bucketCore = bucket.condensed || condensed.condensed;

              // Two-layer context: bucket summary + full project detail for this bucket's project
              const matchedProject = projects.find(
                (p: any) => (bucket.projectId && p.id === bucket.projectId) || (bucket.projectName && p.name === bucket.projectName)
              );
              const projectDetailStr = matchedProject
                ? `\n【当前项目完整结构（含动作层，供修改/删除操作参考）】\n${buildProjectDetailBlock(matchedProject)}`
                : "";

              const ctx = `【总指挥整理的需求摘要】\n核心：${bucketCore}\n任务清单：\n${taskLines}${bucket.projectName ? `\n相关项目：${bucket.projectName}` : ""}${projectDetailStr}`;

              const raw = await withTimeout(
                callLLM(activeProvider, model, system, [{ role: "user", content: ctx }], 4096),
                ARCHITECT_TIMEOUT_MS,
                label,
              );
              const parsed = tryParseJson(raw);
              if (!parsed) throw new Error(`${label} 返回内容无法解析为 JSON`);
              console.log(`${label} OK (${raw.length} chars)`);
              return { ok: true, result: parsed };
            } catch (e: any) {
              console.warn(`${label} failed:`, e.message);
              return { ok: false, error: e.message, bucketName: bucket.projectName || `项目${idx + 1}` };
            }
          })
        );

        // Check for failures
        const failed = bucketOutcomes.filter(o => !o.ok);
        const succeeded = bucketOutcomes.filter(o => o.ok);

        if (succeeded.length === 0) {
          // All buckets failed — surface the first error explicitly
          const firstErr = failed[0]?.error || "所有项目板块处理失败，请稍后重试";
          throw new Error(firstErr);
        }

        // Merge successful results; report partial failures in message
        const merged: any = { operations: [], milestones: [], risks: [], needsMoreInfo: false, questions: [] };
        const msgParts: string[] = [];

        for (const outcome of bucketOutcomes) {
          if (!outcome.ok) {
            msgParts.push(`「${outcome.bucketName}」处理失败：${outcome.error}`);
            continue;
          }
          const r = outcome.result;
          merged.operations.push(...(r.operations || []));
          merged.milestones.push(...(r.milestones || []));
          merged.risks.push(...(r.risks || []));
          if (r.needsMoreInfo) merged.needsMoreInfo = true;
          if (r.questions?.length) merged.questions.push(...r.questions);
          if (r.message) msgParts.push(r.message);
        }

        if (failed.length > 0) {
          merged.failedBuckets = failed.map(f => ({ name: f.bucketName, error: f.error }));
          merged.message = `已处理 ${succeeded.length}/${buckets.length} 个项目，${failed.length} 个失败：${failed.map(f => f.bucketName).join("、")}`;
        } else if (buckets.length > 1) {
          merged.message = `已处理 ${buckets.length} 个项目：${msgParts.join("；")}`;
        } else {
          merged.message = msgParts[0] || "已解析完成";
        }

        responseText = JSON.stringify(merged);

      } else {
        // Commander failed — fall through to direct single Architect call.
        // Inject full project detail for all projects into the last user message because
        // the system prompt may be lean (L1+L2 only) and L3/L4 IDs are needed for updates/deletes.
        console.log("Falling back to direct Architect call with full project detail injection");
        let fallbackMessages = messages;
        if (projects.length > 0) {
          const allDetail = projects.map(buildProjectDetailBlock).filter(Boolean).join("\n\n---\n\n");
          if (allDetail) {
            const lastMsg = fallbackMessages[fallbackMessages.length - 1];
            fallbackMessages = [
              ...fallbackMessages.slice(0, -1),
              { ...lastMsg, content: `【所有项目完整结构（L1→L4，Commander回退时使用）】\n${allDetail}\n\n---\n\n${lastMsg.content}` },
            ];
          }
        }
        responseText = await withTimeout(
          callLLM(activeProvider, model, system, fallbackMessages, 4096),
          ARCHITECT_TIMEOUT_MS,
          "Architect",
        );
      }

    } else {
      // Direct mode: single Architect call (follow-up, short inputs)
      console.log(`Direct mode`);
      responseText = await withTimeout(
        callLLM(activeProvider, model, system, messages, 4096),
        ARCHITECT_TIMEOUT_MS,
        "Architect",
      );
    }

    if (!responseText?.trim()) throw new Error(`${activeProvider.toUpperCase()} 返回了空响应，请稍后重试或切换其他模型`);

    // ── Stage 3: Hours Analyst (optional, non-fatal) ─────────────────────────
    // Runs only when client sends hoursAnalystSystem and there are action-creating operations.
    if (hoursAnalystSystem) {
      try {
        const parsedResponse = tryParseJson(responseText);
        if (parsedResponse?.operations?.length > 0) {
          const actionNames = collectActionNames(parsedResponse.operations);
          if (actionNames.length > 0) {
            console.log(`Analyst: analyzing ${actionNames.length} actions...`);
            const analystMsg = `请分析以下新媒体运营任务的难易度和工时（小时）：\n${actionNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}`;
            const analystRaw = await withTimeout(
              callLLM(activeProvider, model, hoursAnalystSystem, [{ role: "user", content: analystMsg }], 1024),
              ANALYST_TIMEOUT_MS,
              "Analyst",
            );
            const analystParsed = tryParseJson(analystRaw);
            if (analystParsed?.hourUpdates?.length > 0) {
              applyHoursToOps(parsedResponse.operations, analystParsed.hourUpdates);
              responseText = JSON.stringify(parsedResponse);
              console.log(`Analyst OK: applied hours to ${analystParsed.hourUpdates.filter((u: any) => u.hours > 0).length} actions`);
            }
          }
        }
      } catch (e: any) {
        console.warn("Analyst failed (non-fatal):", e.message);
      }
    }
    // ── Stage 4: Tag Analyzer (non-fatal, auto-enabled when tagAnalyzerEnabled provided) ──
    // Triggers when client sends tagAnalyzerEnabled (customTags array) and there are
    // new categories being created (add_category / add_project with categories) in this batch.
    if (Array.isArray(tagAnalyzerEnabled)) {
      try {
        const tagParsed = tryParseJson(responseText);
        if (tagParsed?.operations?.length > 0) {
          const newCatNames = collectNewCategoryNames(tagParsed.operations);
          if (newCatNames.length > 0) {
            console.log(`TagAnalyzer: classifying ${newCatNames.length} new categories...`);
            const existingTags: any[] = tagAnalyzerEnabled;
            const tagSystem = buildTagAnalyzerSystem();
            const tagMsg = `现有标签：${existingTags.length > 0 ? existingTags.map((t: any) => t.name).join("、") : "（无）"}\n本次新增类别：\n${newCatNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}`;
            const tagRaw = await withTimeout(
              callLLM(activeProvider, model, tagSystem, [{ role: "user", content: tagMsg }], 1024),
              TAG_ANALYZER_TIMEOUT_MS,
              "TagAnalyzer",
            );
            const tagResult = tryParseJson(tagRaw);
            if (Array.isArray(tagResult?.tagOps) && tagResult.tagOps.length > 0) {
              tagParsed.operations.push(...tagResult.tagOps);
              responseText = JSON.stringify(tagParsed);
              console.log(`TagAnalyzer OK: ${tagResult.tagOps.length} tag ops added`);
            }
          }
        }
      } catch (e: any) {
        console.warn("TagAnalyzer failed (non-fatal):", e.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`Response: ${responseText.length} chars`);
    return respond({ text: responseText });

  } catch (error: any) {
    console.error("AI Proxy error:", error.message);
    // Surface upstream provider auth failures (401/403) as HTTP 401 for deterministic client-side handling
    const isAuthError = / 40[13]:/.test(error.message) ||
      /[Uu]nauthorized|[Ff]orbidden|[Ii]nvalid.{0,10}(key|token|auth)/i.test(error.message);
    return respond({ error: error.message }, isAuthError ? 401 : 500);
  }
});
