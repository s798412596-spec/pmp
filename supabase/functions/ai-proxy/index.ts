import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COMMANDER_TIMEOUT_MS = 12000;
const ARCHITECT_TIMEOUT_MS = 30000;

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { system, messages, provider, model, agentMode, commanderSystem } = await req.json();
    if (!system || !messages) return respond({ error: "Missing system or messages" }, 400);

    const activeProvider = (provider || "gemini").toLowerCase();
    const userLastMsg = messages[messages.length - 1]?.content || "";
    console.log(`AI call: provider=${activeProvider}, model=${model || "(default)"}, agentMode=${!!agentMode}, msgLen=${userLastMsg.length}`);

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

        const architectResults = await Promise.all(
          buckets.map(async (bucket: any, idx: number) => {
            const taskLines = (bucket.tasks || []).map((t: any, i: number) =>
              `${i + 1}. ${t.action}${t.person ? ` | 负责人:${t.person}` : ""}${t.platform ? ` | 平台:${t.platform}` : ""}${t.deadline ? ` | 截止:${t.deadline}` : ""}${t.freq ? ` | 频率:${t.freq}` : ""}${t.note ? ` | 备注:${t.note}` : ""}`
            ).join("\n");

            const bucketCore = bucket.condensed || condensed.condensed;
            const ctx = `【总指挥整理的需求摘要】\n核心：${bucketCore}\n任务清单：\n${taskLines}${bucket.projectName ? `\n相关项目：${bucket.projectName}` : ""}`;

            try {
              const raw = await withTimeout(
                callLLM(activeProvider, model, system, [{ role: "user", content: ctx }], 4096),
                ARCHITECT_TIMEOUT_MS,
                `Architect-${idx + 1}`,
              );
              console.log(`Architect-${idx + 1} done (${raw.length} chars)`);
              return tryParseJson(raw);
            } catch (e: any) {
              console.warn(`Architect-${idx + 1} failed:`, e.message);
              return null;
            }
          })
        );

        // Merge all bucket results into one response
        const merged: any = { operations: [], milestones: [], risks: [], needsMoreInfo: false, questions: [] };
        const messages: string[] = [];

        for (const result of architectResults) {
          if (!result) continue;
          merged.operations.push(...(result.operations || []));
          merged.milestones.push(...(result.milestones || []));
          merged.risks.push(...(result.risks || []));
          if (result.needsMoreInfo) merged.needsMoreInfo = true;
          if (result.questions?.length) merged.questions.push(...result.questions);
          if (result.message) messages.push(result.message);
        }

        if (buckets.length > 1) {
          merged.message = `已处理 ${buckets.length} 个项目板块：${messages.join("；")}`;
        } else {
          merged.message = messages[0] || "已解析完成";
        }

        responseText = JSON.stringify(merged);

      } else {
        // Commander failed — fall through to direct single Architect call
        console.log("Falling back to direct Architect call");
        responseText = await withTimeout(
          callLLM(activeProvider, model, system, messages, 4096),
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
    console.log(`Response: ${responseText.length} chars`);
    return respond({ text: responseText });

  } catch (error: any) {
    console.error("AI Proxy error:", error.message);
    return respond({ error: error.message }, 500);
  }
});
