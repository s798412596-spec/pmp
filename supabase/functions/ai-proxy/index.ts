import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const JSON_FORMAT = { type: "json_object" };

async function callGemini(apiKey: string, model: string, system: string, messages: any[]): Promise<string> {
  const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({ model: model || "gemini-3.1-pro-preview", max_tokens: 8192, messages: [{ role: "system", content: system }, ...messages] })
  });
  if (!resp.ok) { const e = await resp.text(); throw new Error("Gemini error " + resp.status + ": " + e); }
  const r = await resp.json();
  return r.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { system, messages, provider, model } = await req.json();
    if (!system || !messages) return new Response(JSON.stringify({ error: "Missing system or messages" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const activeProvider = (provider || "gemini").toLowerCase();
    let responseText = "";
    if (activeProvider === "anthropic") {
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
      // Retry up to 3 attempts for Gemini (prone to empty responses under load)
      for (let attempt = 1; attempt <= 3; attempt++) {
        responseText = await callGemini(apiKey, model, system, messages);
        if (responseText) break;
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
      }
      if (!responseText) throw new Error("Gemini 连续返回空响应（已重试3次），请稍后再试或切换其他模型。");
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
    return new Response(JSON.stringify({ text: responseText }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("AI Proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
