import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const JSON_FORMAT = { type: "json_object" };
const CALL_TIMEOUT_MS = 25000; // 25 second per LLM call

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function callWithRetry(fetcher: () => Promise<string>, maxAttempts = 3, label = "API"): Promise<string> {
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const text = await withTimeout(fetcher(), CALL_TIMEOUT_MS, label);
      if (text) return text;
      console.warn(`${label} returned empty (attempt ${attempt}/${maxAttempts})`);
    } catch (e: any) {
      lastErr = e;
      console.warn(`${label} error attempt ${attempt}: ${e.message}`);
    }
    if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 800));
  }
  throw lastErr || new Error(`${label} 连续返回空响应（已重试${maxAttempts}次），请切换其他模型。`);
}

async function callLLM(activeProvider: string, model: string, system: string, messages: any[]): Promise<string> {
  if (activeProvider === "glm") {
    const apiKey = Deno.env.get("GLM_API_KEY");
    if (!apiKey) throw new Error("GLM_API_KEY not set");
    const resp = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "GLM-5.1", max_tokens: 8192, messages: [{ role: "system", content: system }, ...messages] })
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("GLM error " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (activeProvider === "anthropic") {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: model || "claude-sonnet-4-6-20260217", max_tokens: 8192, system, messages })
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("Anthropic error " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.content?.map((c: any) => c.text || "").join("") || "";

  } else if (activeProvider === "openai") {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "gpt-5.4", max_tokens: 8192, response_format: JSON_FORMAT, messages: [{ role: "system", content: system }, ...messages] })
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("OpenAI error " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (activeProvider === "gemini") {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "gemini-3.1-pro-preview", max_tokens: 8192, messages: [{ role: "system", content: system }, ...messages] })
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("Gemini error " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (activeProvider === "deepseek") {
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "deepseek-v3.2", max_tokens: 8192, response_format: JSON_FORMAT, messages: [{ role: "system", content: system }, ...messages] })
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("DeepSeek error " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else if (activeProvider === "custom") {
    const apiKey = Deno.env.get("CUSTOM_LLM_API_KEY");
    const baseUrl = Deno.env.get("CUSTOM_LLM_BASE_URL");
    if (!apiKey || !baseUrl) throw new Error("CUSTOM_LLM_API_KEY or CUSTOM_LLM_BASE_URL not set");
    const resp = await fetch(baseUrl + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model: model || "default", max_tokens: 8192, response_format: JSON_FORMAT, messages: [{ role: "system", content: system }, ...messages] })
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error("Custom LLM error " + resp.status + ": " + e); }
    const r = await resp.json();
    return r.choices?.[0]?.message?.content || "";

  } else {
    throw new Error("Unknown provider: " + activeProvider);
  }
}

async function callProvider(activeProvider: string, model: string, system: string, messages: any[], maxAttempts = 3): Promise<string> {
  return callWithRetry(() => callLLM(activeProvider, model, system, messages), maxAttempts, activeProvider.toUpperCase());
}

function tryParseJson(text: string): any | null {
  try {
    let c = text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
    c = c.replace(/,\s*([}\]])/g,"$1").replace(/\/\/[^\n]*/g,"");
    const m = c.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : c);
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { system, messages, provider, model, agentMode, commanderSystem } = await req.json();
    if (!system || !messages) return new Response(JSON.stringify({ error: "Missing system or messages" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const activeProvider = (provider || "gemini").toLowerCase();
    console.log(`AI call: provider=${activeProvider}, model=${model||"(default)"}, agentMode=${!!agentMode}`);

    let responseText = "";

    const userLastMsg = messages[messages.length - 1]?.content || "";

    // Only invoke Commander for long inputs (>200 chars) in agent mode
    const shouldUseCommander = agentMode && commanderSystem && userLastMsg.length > 200;

    if (shouldUseCommander) {
      // ── Commander: ONE attempt, 25s timeout. Failure = graceful fallback ──
      let condensed: any = null;
      try {
        console.log(`Commander stage: condensing ${userLastMsg.length} chars...`);
        const cmdRaw = await callProvider(activeProvider, model, commanderSystem, [{ role: "user", content: userLastMsg }], 1);
        condensed = tryParseJson(cmdRaw);
        if (!condensed?.condensed) { condensed = null; console.warn("Commander parse failed, falling back"); }
        else console.log("Commander OK:", condensed.condensed.slice(0, 60));
      } catch (e: any) {
        console.warn("Commander failed:", e.message, "— using direct mode");
        condensed = null;
      }

      // ── Architect: use condensed context or original messages ──
      let architectMsgs: any[];
      if (condensed?.condensed) {
        const taskLines = (condensed.tasks || []).map((t: any, i: number) =>
          `${i+1}. ${t.action}${t.person?` | 负责人:${t.person}`:""}${t.platform?` | 平台:${t.platform}`:""}${t.deadline?` | 截止:${t.deadline}`:""}${t.freq?` | 频率:${t.freq}`:""}${t.note?` | 备注:${t.note}`:""}`
        ).join("\n");
        const ctx = `【总指挥整理的需求摘要】\n核心：${condensed.condensed}\n任务清单：\n${taskLines}${condensed.projectHint?`\n相关项目：${condensed.projectHint}`:""}`;
        architectMsgs = [{ role: "user", content: ctx }];
        console.log(`Architect receives condensed (${ctx.length} chars)`);
      } else {
        architectMsgs = messages;
        console.log(`Architect receives original messages`);
      }

      console.log("Architect stage...");
      responseText = await callProvider(activeProvider, model, system, architectMsgs, 3);

    } else {
      // Direct mode: single Architect call
      console.log(`Direct mode (msgLen=${userLastMsg.length})`);
      responseText = await callProvider(activeProvider, model, system, messages, 3);
    }

    if (!responseText) throw new Error(`${activeProvider.toUpperCase()} 连续返回空响应，请稍后重试或切换其他模型。`);
    console.log(`Response length: ${responseText.length} chars`);
    return new Response(JSON.stringify({ text: responseText }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("AI Proxy error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
