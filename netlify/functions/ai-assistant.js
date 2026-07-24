// Netlify Function: يتصل بـ OpenRouter (https://openrouter.ai) نيابة عن الواجهة الأمامية
// حتى لا يظهر مفتاح API داخل المتصفح أبدًا.
//
// اضبط المتغيرات التالية من لوحة Netlify:
// Site configuration -> Environment variables -> Add variable
//   OPENROUTER_API_KEY  (إجباري)  -> مفتاحك من https://openrouter.ai/keys
//   OPENROUTER_MODEL    (اختياري) -> افتراضيًا "openai/gpt-4o-mini"
//     أمثلة أخرى: "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.1-70b-instruct",
//     "google/gemini-2.0-flash-001" ... راجع https://openrouter.ai/models للأسعار والقدرات.

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "لم يتم ضبط OPENROUTER_API_KEY في إعدادات Netlify بعد." }),
    };
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  try {
    const { system, messages } = JSON.parse(event.body || "{}");

    // OpenRouter يستخدم صيغة OpenAI: رسالة النظام تُضاف كأول رسالة بدور "system"
    const chatMessages = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...(messages || []),
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        // اختياري لكن مفضّل من OpenRouter لتصنيف الاستخدام:
        "HTTP-Referer": "https://saad-ai-trading.netlify.app",
        "X-Title": "SAAD AI Trading",
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        max_tokens: 1200,
        temperature: 0.4,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: data.error?.message || "خطأ من OpenRouter" }),
      };
    }

    const text = data.choices?.[0]?.message?.content || "";
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: [{ type: "text", text }] }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "خطأ غير متوقع" }),
    };
  }
}
