import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const JSON_FORMAT = { type: "json_object" };

async function callWithRetry(fetcher: () => Promise<string>, maxAttempts = 3, label = "API"): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const text = await fetcher();
    if (text) return text;
    console.warn(`${label} returned empty (attempt ${attempt}/${maxAttempts})`);
    if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
  }
  throw new Error(`${label} 连续返回空响应（已重试${maxAttempts}次），请稍后再试或切换其他模型。`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { system, messages, provider, model } = await req.json();
    if (!system || !messages) return new Response(JSON.stringify({ error: "Missing system or messages" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const activeProvider = (provider || "gemini").toLowerCase();
    console.log(`AI call: provider=${activeProvider}, model=${model || "(default)"}`);
    let responseText = "";

    if (activeProvider === "glm") {
      const apiKey = Deno.env.get("GLM_API_KEY");
      if (!apiKey) throw new Error("GLM_API_KEY not set");
      responseText = await callWithRetry(async () => {
        const resp = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
          body: JSON.stringify({ model: model || "GLM-5.1", max_tokens: 8192, messages: [{ role: "system", content: system }, ...messages] })
        });
        if (!resp.ok) { const e = await resp.text(); throw new Error("GLM error " + resp.status + ": " + e); }
        const r = await resp.json();
        console.log("GLM response keys:", Object.keys(r));
        return r.choices?.[0]?.message?.content || "";
      }, 3, "GLM");

    } else if (activeProvider === "anthropic") {
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
      const resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: model || "claude-sonnet-4-6-20260217", max_tokens: 8192, system, messages }) });
      if (!resp.ok) { const e = await resp.text(); throw new Error("Anthropic error " + resp.status + ": " + e); }
      const r = await resp.json();
      responseText = r.content?.map((c: any) => c.text || "").join("") || "";

    } else if (activeProvider === "openai") {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) throw new Error("OPENAI_API_KEY not set");
      const resp = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey }, body: JSON.stringify({ model: model || "gpt-5.4", max_tokens: 8192, response_format: JSON_FORMAT, messages: [{ role: "system", content: system }, ...messages] }) });
      if (!resp.ok) { const e = await resp.text(); throw new Error("OpenAI error " + resp.status + ": " + e); }
      const r = await resp.json();
      responseText = r.choices?.[0]?.message?.content || "";

    } else if (activeProvider === "gemini") {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");
      responseText = await callWithRetry(async () => {
        const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
          body: JSON.stringify({ model: model || "gemini-3.1-pro-preview", max_tokens: 8192, messages: [{ role: "system", content: system }, ...messages] })
        });
        if (!resp.ok) { const e = await resp.text(); throw new Error("Gemini error " + resp.status + ": " + e); }
        const r = await resp.json();
        return r.choices?.[0]?.message?.content || "";
      }, 3, "Gemini");

    } else if (activeProvider === "deepseek") {
      const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
      if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
      const resp = await fetch("https://api.deepseek.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey }, body: JSON.stringify({ model: model || "deepseek-v3.2", max_tokens: 8192, response_format: JSON_FORMAT, messages: [{ role: "system", content: system }, ...messages] }) });
      if (!resp.ok) { const e = await resp.text(); throw new Error("DeepSeek error " + resp.status + ": " + e); }
      const r = await resp.json();
      responseText = r.choices?.[0]?.message?.content || "";

    } else if (activeProvider === "custom") {
      const apiKey = Deno.env.get("CUSTOM_LLM_API_KEY");
      const baseUrl = Deno.env.get("CUSTOM_LLM_BASE_URL");
      if (!apiKey || !baseUrl) throw new Error("CUSTOM_LLM_API_KEY or CUSTOM_LLM_BASE_URL not set");
      const resp = await fetch(baseUrl + "/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey }, body: JSON.stringify({ model: model || "default", max_tokens: 8192, response_format: JSON_FORMAT, messages: [{ role: "system", content: system }, ...messages] }) });
      if (!resp.ok) { const e = await resp.text(); throw new Error("Custom LLM error " + resp.status + ": " + e); }
      const r = await resp.json();
      responseText = r.choices?.[0]?.message?.content || "";

    } else {
      throw new Error("Unknown provider: " + activeProvider);
    }

    console.log(`Response length: ${responseText.length} chars`);
    return new Response(JSON.stringify({ text: responseText }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("AI Proxy error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
